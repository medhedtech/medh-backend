import { ENV_VARS } from "../config/envVars.js";
import { s3Client, testAWSConnection } from "../config/aws-config.js";
import { ListBucketsCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

console.log("=== AWS Credentials Diagnosis ===");
console.log();

// Step 1: Validate environment variables
function validateEnvironmentVariables() {
  console.log("🔍 Step 1: Validating Environment Variables");
  
  const issues = [];
  
  if (!ENV_VARS.AWS_ACCESS_KEY) {
    issues.push("❌ IM_AWS_ACCESS_KEY is missing");
  } else if (ENV_VARS.AWS_ACCESS_KEY === 'your_aws_access_key_here') {
    issues.push("❌ IM_AWS_ACCESS_KEY has placeholder value");
  } else {
    console.log("✅ AWS_ACCESS_KEY is set");
  }
  
  if (!ENV_VARS.AWS_SECRET_KEY) {
    issues.push("❌ IM_AWS_SECRET_KEY is missing");
  } else if (ENV_VARS.AWS_SECRET_KEY === 'your_aws_secret_key_here') {
    issues.push("❌ IM_AWS_SECRET_KEY has placeholder value");
  } else {
    console.log("✅ AWS_SECRET_KEY is set");
  }
  
  if (!ENV_VARS.AWS_REGION) {
    issues.push("❌ AWS_REGION is missing");
  } else {
    console.log(`✅ AWS_REGION is set to: ${ENV_VARS.AWS_REGION}`);
  }
  
  if (!ENV_VARS.AWS_S3_BUCKET_NAME) {
    issues.push("❌ AWS_S3_BUCKET_NAME is missing");
  } else {
    console.log(`✅ AWS_S3_BUCKET_NAME is set to: ${ENV_VARS.AWS_S3_BUCKET_NAME}`);
  }
  
  if (issues.length > 0) {
    console.log("\n🚨 Environment Variable Issues:");
    issues.forEach(issue => console.log(issue));
    return false;
  }
  
  console.log("✅ All environment variables are properly set");
  return true;
}

// Step 2: Test AWS connection
async function testConnection() {
  console.log("\n🌐 Step 2: Testing AWS Connection");
  
  try {
    const result = await testAWSConnection();
    if (result) {
      console.log("✅ AWS connection successful");
      return true;
    } else {
      console.log("❌ AWS connection failed");
      return false;
    }
  } catch (error) {
    console.log("❌ AWS connection error:", error.message);
    return false;
  }
}

// Step 3: Test S3 bucket access
async function testBucketAccess() {
  console.log("\n🪣 Step 3: Testing S3 Bucket Access");
  
  try {
    const bucketName = ENV_VARS.AWS_S3_BUCKET_NAME;
    
    // Test if bucket exists and is accessible
    const headBucketCommand = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(headBucketCommand);
    
    console.log(`✅ Bucket '${bucketName}' is accessible`);
    
    // Test if we can list objects (read permission)
    const listCommand = new ListBucketsCommand({});
    const listResult = await s3Client.send(listCommand);
    
    const bucketExists = listResult.Buckets.find(b => b.Name === bucketName);
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' exists and is listed`);
    } else {
      console.log(`⚠️  Bucket '${bucketName}' not found in account buckets`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Bucket access error: ${error.message}`);
    
    if (error.name === 'NoSuchBucket') {
      console.log("   The bucket does not exist");
    } else if (error.name === 'Forbidden') {
      console.log("   Access denied - check bucket permissions");
    } else if (error.name === 'UnknownEndpoint') {
      console.log("   Invalid region - bucket might be in different region");
    }
    
    return false;
  }
}

// Step 4: Test upload permission
async function testUploadPermission() {
  console.log("\n📤 Step 4: Testing Upload Permission");
  
  try {
    const testKey = `test-uploads/diagnostic-test-${Date.now()}.txt`;
    const testContent = "AWS credential diagnostic test file";
    
    const uploadParams = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    };
    
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    console.log(`✅ Upload test successful! File uploaded to: ${testKey}`);
    console.log("   Note: You may want to delete this test file later");
    
    return true;
  } catch (error) {
    console.log(`❌ Upload test failed: ${error.message}`);
    
    if (error.name === 'AccessDenied') {
      console.log("   No write permission to bucket");
    } else if (error.name === 'InvalidAccessKeyId') {
      console.log("   Invalid AWS Access Key ID");
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log("   Invalid AWS Secret Access Key");
    }
    
    return false;
  }
}

// Run diagnostic
async function runDiagnostic() {
  const envVarOk = validateEnvironmentVariables();
  const connectionOk = envVarOk ? await testConnection() : false;
  const bucketOk = connectionOk ? await testBucketAccess() : false;
  const uploadOk = bucketOk ? await testUploadPermission() : false;
  
  console.log("\n=== Diagnostic Summary ===");
  console.log(`Environment Variables: ${envVarOk ? '✅' : '❌'}`);
  console.log(`AWS Connection: ${connectionOk ? '✅' : '❌'}`);
  console.log(`Bucket Access: ${bucketOk ? '✅' : '❌'}`);
  console.log(`Upload Permission: ${uploadOk ? '✅' : '❌'}`);
  
  if (envVarOk && connectionOk && bucketOk && uploadOk) {
    console.log("\n🎉 All tests passed! AWS configuration is working correctly.");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Check the errors above for details.");
    process.exit(1);
  }
}

runDiagnostic().catch(console.error); 