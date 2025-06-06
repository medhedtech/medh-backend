import { uploadBase64FileOptimized } from "./utils/uploadFile.js";

console.log("=== Upload Test with Real Data ===");

// Use the exact same base64 data from the failing request (truncated for testing)
const testBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAUbAuADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAMEAQIFBgf/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAgEDBAX/2gAMAwEAAhADEAAAAflIAAAAAAAAAAAA";

async function testUpload() {
  try {
    console.log("🧪 Testing base64 upload with JPEG data...");
    
    const mimeType = "image/jpeg";
    const folder = "images";
    
    console.log(`MIME Type: ${mimeType}`);
    console.log(`Folder: ${folder}`);
    console.log(`Base64 length: ${testBase64.length}`);
    
    const result = await uploadBase64FileOptimized(testBase64, mimeType, folder);
    
    console.log("✅ Upload successful!");
    console.log("Result:", JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log("❌ Upload failed:");
    console.log("Error name:", error.name);
    console.log("Error message:", error.message);
    console.log("Error code:", error.code);
    console.log("Full error:", error);
    
    // Check if it's a credential-related error
    if (error.message && error.message.includes("credential")) {
      console.log("\n🔐 This appears to be a credential-related error!");
      console.log("Possible causes:");
      console.log("1. Invalid AWS access key or secret key");
      console.log("2. Expired credentials");
      console.log("3. Insufficient permissions on S3 bucket");
      console.log("4. Region mismatch");
      console.log("5. Bucket doesn't exist or is in wrong region");
    }
  }
}

testUpload(); 