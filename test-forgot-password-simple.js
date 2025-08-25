import { ENV_VARS } from "./config/envVars.js";
import emailService from "./services/emailService.js";

async function testForgotPasswordSimple() {
  try {
    console.log("Testing forgot password functionality (simple)...");
    
    // Wait a bit for email service to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test sending a password reset email
    console.log("\nTesting password reset email...");
    const testEmail = "test@example.com";
    const testName = "Test User";
    const tempPassword = "test123";
    
    const result = await emailService.sendPasswordResetEmail(
      testEmail,
      testName,
      tempPassword
    );
    
    console.log("Password reset email result:", result);
    
    if (result && result.success) {
      console.log("✅ Forgot password functionality is working!");
    } else {
      console.log("❌ Forgot password functionality failed");
    }
    
  } catch (error) {
    console.error("❌ Error testing forgot password:", error.message);
  }
}

testForgotPasswordSimple();

