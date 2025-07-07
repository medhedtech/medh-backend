#!/usr/bin/env node

/**
 * Test script to verify CloudFront signed URL generation
 * Run this AFTER adding your private_key.pem file
 */

import {
  generateSignedUrl,
  resetCloudFrontWarning,
} from "./utils/cloudfrontSigner.js";
import ENV_VARS from "./config/env.js";
import fs from "fs";
import path from "path";

console.log("🔐 Testing CloudFront Signed URL Generation");
console.log("===========================================");

// Check if private key exists
const keyPath =
  ENV_VARS.CLOUDFRONT_PRIVATE_KEY_PATH ||
  path.join(process.cwd(), "private_key.pem");
const keyExists = fs.existsSync(keyPath);

console.log("\n📋 Environment Configuration:");
console.log(
  `CLOUDFRONT_KEY_PAIR_ID: ${ENV_VARS.CLOUDFRONT_KEY_PAIR_ID ? "✅ Set" : "❌ Not set"}`,
);
console.log(`CLOUDFRONT_PRIVATE_KEY_PATH: ${keyPath}`);
console.log(`Private Key File: ${keyExists ? "✅ Found" : "❌ Missing"}`);
console.log(
  `CLOUDFRONT_DEFAULT_EXPIRES_IN: ${ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN} seconds`,
);

if (!keyExists) {
  console.log("\n❌ Private key file not found!");
  console.log("\n📚 To enable signed URLs:");
  console.log("1. Download your CloudFront private key from AWS Console");
  console.log('2. Place it as "private_key.pem" in the project root');
  console.log("3. Set permissions: chmod 600 private_key.pem");
  console.log("4. Run this test again");
  process.exit(1);
}

// Test URLs
const testUrls = [
  "https://cdn.medh.co/test-video.mp4",
  "https://cdn.medh.co/student/123/session/video.mp4",
  "https://cdn.medh.co/courses/advanced-javascript/lesson1.mp4",
];

console.log("\n🧪 Testing URL Signing:");
console.log("========================");

// Reset warning flag for clean testing
resetCloudFrontWarning();

testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. Testing: ${url}`);

  try {
    const signedUrl = generateSignedUrl(url);

    if (signedUrl === url) {
      console.log("   ⚠️  Fallback: Returning unsigned URL");
      console.log("   🔍 Check your CloudFront configuration");
    } else {
      console.log("   ✅ Success: Generated signed URL");
      console.log(`   🔗 Original: ${url}`);
      console.log(`   🔐 Signed:   ${signedUrl.substring(0, 100)}...`);

      // Check if it's actually signed (should contain signature parameters)
      if (
        signedUrl.includes("Signature=") ||
        signedUrl.includes("Key-Pair-Id=")
      ) {
        console.log("   🎯 Verified: URL contains signature parameters");
      } else {
        console.log("   ⚠️  Warning: URL may not be properly signed");
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
});

console.log("\n🎉 Testing Complete!");
console.log("===================");
console.log(
  "If you see signed URLs above, your CloudFront setup is working correctly!",
);
