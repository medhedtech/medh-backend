#!/usr/bin/env node

/**
 * Test script to verify CloudFront signing functionality
 * Run with: node test-cloudfront-signing.js
 */

import {
  generateSignedUrl,
  resetCloudFrontWarning,
} from "./utils/cloudfrontSigner.js";
import ENV_VARS from "./config/env.js";

console.log("🔍 Testing CloudFront Signed URL Generation");
console.log("==========================================");

// Check environment variables
console.log("\n📋 Environment Configuration:");
console.log(
  `CLOUDFRONT_KEY_PAIR_ID: ${ENV_VARS.CLOUDFRONT_KEY_PAIR_ID ? "✅ Set" : "❌ Not set"}`,
);
console.log(
  `CLOUDFRONT_PRIVATE_KEY_PATH: ${ENV_VARS.CLOUDFRONT_PRIVATE_KEY_PATH}`,
);
console.log(
  `CLOUDFRONT_DEFAULT_EXPIRES_IN: ${ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN} seconds`,
);

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
      console.log(
        "   ⚠️  Fallback: Returning unsigned URL (private key missing)",
      );
      console.log(
        "   📝 To enable signing, add your CloudFront private key file",
      );
    } else {
      console.log("   ✅ Success: Generated signed URL");
      console.log(`   🔗 Signed URL: ${signedUrl.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
});

console.log("\n📚 Next Steps:");
console.log("==============");
console.log("1. Download your CloudFront private key from AWS Console");
console.log('2. Place it as "private_key.pem" in the project root');
console.log("3. Set proper permissions: chmod 600 private_key.pem");
console.log("4. Restart your application");
console.log("\n📖 See CLOUDFRONT_SETUP_GUIDE.md for detailed instructions");
