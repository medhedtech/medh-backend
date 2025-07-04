#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# setup-private-blockchain.sh
# ----------------------------------------------------------------------------
# One-click helper for launching a **single-node private Ethereum (Clique)**
# network on an Amazon Linux 2023 EC2 instance (t2.micro / t4g.micro).
# The script installs Go-Ethereum, generates a genesis block, creates a signer
# account, sets up systemd for auto-restart, and exposes JSON-RPC on :8545.
# ----------------------------------------------------------------------------
# Usage (run as ec2-user or root *inside* the EC2 instance):
#   curl -sSL https://raw.githubusercontent.com/medh/scripts/main/setup-private-blockchain.sh | bash
#
# After completion:
#   • RPC endpoint → http://<EC2_IP>:8545
#   • Chain ID     → 4321 (change CHAIN_ID below if desired)
#   • The signer's private key + password live in ~/chain-data (back them up!)
# ----------------------------------------------------------------------------
set -euo pipefail

# ===== Config =================================================================
CHAIN_ID=${CHAIN_ID:-4321}
BLOCK_PERIOD=${BLOCK_PERIOD:-5}        # seconds per block (Clique)
ADDRESS=""                              # Will be populated after account new
PASSFILE="$HOME/chain-data/password.txt"
GENESIS="$HOME/genesis.json"
DATADIR="$HOME/chain-data"
GETH_BIN="/usr/local/bin/geth"
SERVICE_FILE="/etc/systemd/system/geth.service"

# ===== Helpers ===============================================================
log() { echo -e "\e[32m[blockchain-setup]\e[0m $1"; }

require_root() {
  if [[ $(id -u) -ne 0 ]]; then
    sudo -E bash "$0" "$@"
    exit 0
  fi
}

install_deps() {
  yum update -y && yum groupinstall -y "Development Tools" && yum install -y git jq wget
}

build_geth() {
  log "Cloning Go-Ethereum & building (this can take ~3-5 min on micro)"
  git clone --depth 1 https://github.com/ethereum/go-ethereum.git /tmp/go-ethereum
  pushd /tmp/go-ethereum >/dev/null
  make geth
  cp build/bin/geth "$GETH_BIN"
  popd >/dev/null
  rm -rf /tmp/go-ethereum
}

create_genesis() {
  cat > "$GENESIS" <<EOF
{
  "config": {
    "chainId": $CHAIN_ID,
    "homesteadBlock": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "clique": { "period": $BLOCK_PERIOD, "epoch": 30000 }
  },
  "difficulty": "1",
  "gasLimit": "0x47b760",
  "alloc": {}
}
EOF
}

init_chain() {
  mkdir -p "$DATADIR"
  "$GETH_BIN" init --datadir "$DATADIR" "$GENESIS"
}

create_signer() {
  log "Creating signer account (store the password securely)"
  echo "$(openssl rand -base64 24)" > "$PASSFILE"
  chmod 600 "$PASSFILE"
  ADDRESS=$("$GETH_BIN" account new --password "$PASSFILE" --datadir "$DATADIR" | grep -oE '0x[0-9a-fA-F]{40}')
  log "Signer address: $ADDRESS"
}

patch_extradata() {
  log "Patching genesis with signer extradata"
  local EXTRA="0x$(printf '%064d' 0)${ADDRESS:2}$(printf '%064d' 0)"
  jq ".extradata=\"$EXTRA\"" "$GENESIS" > "$GENESIS.tmp" && mv "$GENESIS.tmp" "$GENESIS"
  "$GETH_BIN" init --datadir "$DATADIR" "$GENESIS"
}

write_systemd() {
  log "Creating systemd service"
  cat > "$SERVICE_FILE" <<SERVICE
[Unit]
Description=Private Geth Node (Clique)
After=network.target

[Service]
User=$(whoami)
Type=simple
ExecStart=$GETH_BIN \
  --datadir $DATADIR \
  --networkid $CHAIN_ID \
  --http --http.addr 0.0.0.0 --http.port 8545 \
  --http.api eth,net,web3,personal \
  --http.corsdomain "*" \
  --allow-insecure-unlock \
  --unlock 0 \
  --password $PASSFILE \
  --mine --miner.threads 1
Restart=always
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
SERVICE
  systemctl daemon-reload
  systemctl enable --now geth.service
}

main() {
  require_root "$@"
  install_deps
  build_geth
  create_genesis
  init_chain
  create_signer
  patch_extradata
  write_systemd
  log "\n✅ Private chain running! Test with:\n   curl -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8545" 
}

main "$@" 