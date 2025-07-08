import fs from "fs";
import path from "path";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

import ENV_VARS from "../config/env.js";

// Load private key once during module initialization
let privateKey = "";
let hasLoggedWarning = false; // Track if we've already logged the warning
let keyLoadAttempted = false; // Track if we've attempted to load the key

const loadPrivateKey = () => {
  if (keyLoadAttempted) return; // Only attempt to load once

  try {
    // First try: Use environment variable for key content directly
    if (ENV_VARS.CLOUDFRONT_PRIVATE_KEY) {
      privateKey = ENV_VARS.CLOUDFRONT_PRIVATE_KEY;
      console.log(
        "[cloudfrontSigner] CloudFront private key loaded from environment variable",
      );
      return;
    }

    // Second try: Read from file path
    const keyPath =
      ENV_VARS.CLOUDFRONT_PRIVATE_KEY_PATH ||
      path.join(process.cwd(), "private_key.pem");

    if (fs.existsSync(keyPath)) {
      privateKey = fs.readFileSync(keyPath, "utf8");
      console.log(
        `[cloudfrontSigner] CloudFront private key loaded from file: ${keyPath}`,
      );
    } else {
      console.warn(
        `[cloudfrontSigner] CloudFront private key file not found: ${keyPath}`,
      );
    }
  } catch (error) {
    console.error(
      "[cloudfrontSigner] Unable to read CloudFront private key:",
      error.message,
    );
  } finally {
    keyLoadAttempted = true;
  }
};

// Load the key immediately
loadPrivateKey();

/**
 * Generate a signed CloudFront URL.
 *
 * @param {string} url - The full CloudFront URL to sign (e.g., https://cdn.medh.co/path/to/video.mp4).
 * @param {number} [expiresInSeconds=ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN] - Expiry time in seconds.
 * @returns {string} signed URL
 * @throws {Error} if signing fails or required env vars are missing.
 */
export const generateSignedUrl = (
  url,
  expiresInSeconds = ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN,
) => {
  if (!url) {
    throw new Error("URL is required to generate signed CloudFront URL");
  }
  if (!ENV_VARS.CLOUDFRONT_KEY_PAIR_ID) {
    throw new Error("CLOUDFRONT_KEY_PAIR_ID environment variable is not set");
  }
  if (!privateKey) {
    if (!hasLoggedWarning) {
      console.warn(
        "[cloudfrontSigner] CloudFront private key not loaded. Using unsigned URLs as fallback.",
      );
      hasLoggedWarning = true;
    }
    return url; // Return unsigned URL as fallback
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return getSignedUrl({
    url,
    keyPairId: ENV_VARS.CLOUDFRONT_KEY_PAIR_ID,
    privateKey,
    dateLessThan: expiresAt,
  });
};

/**
 * Reset the warning flag (useful for testing)
 */
export const resetCloudFrontWarning = () => {
  hasLoggedWarning = false;
};

/**
 * Reload the private key (useful for testing or when key is updated)
 */
export const reloadPrivateKey = () => {
  keyLoadAttempted = false;
  privateKey = "";
  loadPrivateKey();
};

/**
 * Check if CloudFront signing is available
 */
export const isCloudFrontSigningAvailable = () => {
  return !!(privateKey && ENV_VARS.CLOUDFRONT_KEY_PAIR_ID);
};
