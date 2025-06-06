import dotenv from "dotenv";
import { ENV_VARS } from "./config/envVars.js";
import { testAWSConnection } from "./config/aws-config.js";

// Load environment variables
dotenv.config();

console.log("=== AWS Credentials Diagnostic ===");
console.log();

// Check if environment variables are loaded
console.log("🔍 Environment Variables Check:");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("IM_AWS_ACCESS_KEY:", process.env.IM_AWS_ACCESS_KEY ? 
  `${process.env.IM_AWS_ACCESS_KEY.substring(0, 10)}...` : "❌ NOT SET");
console.log("IM_AWS_SECRET_KEY:", process.env.IM_AWS_SECRET_KEY ? 
  `${process.env.IM_AWS_SECRET_KEY.substring(0, 10)}...` : "❌ NOT SET");
console.log("AWS_S3_BUCKET_NAME:", process.env.AWS_S3_BUCKET_NAME || "not set");
console.log("AWS_REGION:", process.env.AWS_REGION || "not set");
console.log();

// Check ENV_VARS object
console.log("🔧 ENV_VARS Configuration:");
console.log("AWS_ACCESS_KEY:", ENV_VARS.AWS_ACCESS_KEY ? 
  `${ENV_VARS.AWS_ACCESS_KEY.substring(0, 10)}...` : "❌ NOT SET");
console.log("AWS_SECRET_KEY:", ENV_VARS.AWS_SECRET_KEY ? 
  `${ENV_VARS.AWS_SECRET_KEY.substring(0, 10)}...` : "❌ NOT SET");
console.log("AWS_S3_BUCKET_NAME:", ENV_VARS.AWS_S3_BUCKET_NAME);
console.log("AWS_REGION:", ENV_VARS.AWS_REGION);
console.log();

// Check credential validity
console.log("🔐 Credential Validation:");
if (!ENV_VARS.AWS_ACCESS_KEY || !ENV_VARS.AWS_SECRET_KEY) {
  console.log("❌ Missing AWS credentials in environment variables");
  console.log();
  console.log("📝 Expected environment variables:");
  console.log("   IM_AWS_ACCESS_KEY=AKIA...");
  console.log("   IM_AWS_SECRET_KEY=your_secret_key");
  console.log("   AWS_S3_BUCKET_NAME=medh-files");
  console.log("   AWS_REGION=us-east-1");
  console.log();
  console.log("💡 Check your .env file or environment configuration");
} else {
  console.log("✅ AWS credentials are present");
  
  // Test AWS connection
  console.log();
  console.log("🌐 Testing AWS Connection...");
  try {
    const connectionResult = await testAWSConnection();
    if (connectionResult) {
      console.log("✅ AWS connection test successful");
    } else {
      console.log("❌ AWS connection test failed - check credentials validity");
    }
  } catch (error) {
    console.log("❌ AWS connection test error:", error.message);
    console.log("   This could indicate invalid credentials or network issues");
  }
}

console.log();
console.log("=== End Diagnostic ==="); 