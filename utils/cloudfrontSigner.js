import fs from "fs";
import path from "path";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

import ENV_VARS from "../config/env.js";

// Load private key once during module initialization
let privateKey = "";
try {
  const keyPath = ENV_VARS.CLOUDFRONT_PRIVATE_KEY_PATH || path.join(process.cwd(), "private_key.pem");
  privateKey = fs.readFileSync(keyPath, "utf8");
} catch (error) {
  console.error("[cloudfrontSigner] Unable to read CloudFront private key:", error.message);
  // Leave privateKey empty – calling code should handle signing errors
}

/**
 * Generate a signed CloudFront URL.
 *
 * @param {string} url - The full CloudFront URL to sign (e.g., https://cdn.medh.co/path/to/video.mp4).
 * @param {number} [expiresInSeconds=ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN] - Expiry time in seconds.
 * @returns {string} signed URL
 * @throws {Error} if signing fails or required env vars are missing.
 */
export const generateSignedUrl = (url, expiresInSeconds = ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN) => {
  if (!url) {
    throw new Error("URL is required to generate signed CloudFront URL");
  }
  if (!ENV_VARS.CLOUDFRONT_KEY_PAIR_ID) {
    throw new Error("CLOUDFRONT_KEY_PAIR_ID environment variable is not set");
  }
  if (!privateKey) {
    throw new Error("CloudFront private key not loaded. Check CLOUDFRONT_PRIVATE_KEY_PATH");
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return getSignedUrl({
    url,
    keyPairId: ENV_VARS.CLOUDFRONT_KEY_PAIR_ID,
    privateKey,
    dateLessThan: expiresAt,
  });
}; 