import {
  keccak256,
  getBytes,
  JsonRpcProvider,
  Wallet,
  Contract,
  isAddress,
} from "ethers";
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

// ---------------------------------------------------------------------------
// Helpers – validate that env values are not placeholders and have correct form
// ---------------------------------------------------------------------------
const PLACEHOLDER_REGEX = /(your_|<.*?>|placeholder|dummy)/i;

function hasRealValue(value) {
  return typeof value === "string" && value.trim() !== "" && !PLACEHOLDER_REGEX.test(value);
}

function isValidPrivateKey(key) {
  return typeof key === "string" && /^0x[0-9a-fA-F]{64}$/.test(key);
}

// Comprehensive flag – only enable when every input is present _and_ valid
export const blockchainEnabled =
  hasRealValue(RPC_URL) &&
  isValidPrivateKey(BLOCKCHAIN_PRIVATE_KEY) &&
  isAddress(CERTIFICATE_CONTRACT_ADDRESS || "");

if (!blockchainEnabled) {
  // Don't crash the whole app in development/test when blockchain isn't configured.
  // Instead, operate in "noop" mode and log a clear warning so operators know.
  console.warn(
    "[Blockchain] Disabled – missing or invalid RPC_URL, CERTIFICATE_CONTRACT_ADDRESS or BLOCKCHAIN_PRIVATE_KEY. Demo certificate generation will skip on-chain anchoring.",
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
  if (!blockchainEnabled) {
    throw new Error("Blockchain integration is disabled");
  }

  if (contract) return contract;

  try {
    provider = new JsonRpcProvider(RPC_URL);
    wallet = new Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);
    contract = new Contract(CERTIFICATE_CONTRACT_ADDRESS, REGISTRY_ABI, wallet);
    return contract;
  } catch (err) {
    // If instantiation fails (e.g., malformed key/address), disable blockchain to avoid runtime crashes.
    console.error("[Blockchain] Failed to initialise contract – proceeding without on-chain anchoring:", err.message);
    return undefined;
  }
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