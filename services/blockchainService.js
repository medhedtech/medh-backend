import { keccak256, getBytes, JsonRpcProvider, Wallet, Contract } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// -----------------------------------------------------------------------------
// Blockchain certificate integrity helper
// -----------------------------------------------------------------------------
// This tiny utility abstracts interaction with the on-chain certificate registry
//  • storeHash(pdfBuffer, certificateId) — writes keccak256 hash to contract
//  • verifyHash(pdfBuffer)              — checks if hash is already recorded
// -----------------------------------------------------------------------------

const {
  RPC_URL,
  CERTIFICATE_CONTRACT_ADDRESS,
  BLOCKCHAIN_PRIVATE_KEY,
} = process.env;

// Flag: enabled only when all required env vars are present
export const blockchainEnabled =
  !!(RPC_URL && CERTIFICATE_CONTRACT_ADDRESS && BLOCKCHAIN_PRIVATE_KEY);

if (!blockchainEnabled) {
  // Don't crash the whole app in development/test when blockchain isn't configured.
  // Instead, operate in "noop" mode and log a clear warning so operators know.
  console.warn(
    "[Blockchain] Environment variables missing – integration disabled. Provide RPC_URL, CERTIFICATE_CONTRACT_ADDRESS and BLOCKCHAIN_PRIVATE_KEY in .env to enable.",
  );
}

// Minimal ABI for the certificate registry contract
const REGISTRY_ABI = [
  "function store(bytes32 _hash, string _certificateId) external",
  "function exists(bytes32 _hash) external view returns (bool)",
];

// Lazy-create provider/contract to avoid cold-start penalties during tests
let provider;
let wallet;
let contract;

function getContract() {
  if (contract) return contract;
  provider = new JsonRpcProvider(RPC_URL);
  wallet = new Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);
  contract = new Contract(CERTIFICATE_CONTRACT_ADDRESS, REGISTRY_ABI, wallet);
  return contract;
}

/**
 * Anchors the PDF hash on-chain.
 * @param {Buffer|Uint8Array} pdfBuffer   Raw PDF file contents
 * @param {string} certificateId          Application-level certificate identifier
 * @returns {Promise<string>}             The hex-encoded keccak256 hash that was stored
 */
export async function storeHash(pdfBuffer, certificateId) {
  if (!blockchainEnabled) {
    // No-op when blockchain is disabled – return undefined instead of throwing
    return undefined;
  }
  const hash = keccak256(getBytes(pdfBuffer));
  const registry = getContract();
  const tx = await registry.store(hash, certificateId);
  await tx.wait();
  return hash;
}

/**
 * Verifies if the provided PDF already has its hash anchored on-chain.
 * @param {Buffer|Uint8Array} pdfBuffer   Raw PDF file contents
 * @returns {Promise<boolean>}            True if hash exists in registry
 */
export async function verifyHash(pdfBuffer) {
  if (!blockchainEnabled) {
    // Without blockchain, treat certificate as unverified (could also return true)
    return false;
  }
  const hash = keccak256(getBytes(pdfBuffer));
  const registry = getContract();
  return registry.exists(hash);
} 