import { ENV_VARS } from "./config/envVars.js";
import emailService from "./services/emailService.js";

async function testForgotPassword() {
  try {
    console.log("Testing forgot password functionality...");
    console.log("Email configuration:");
    console.log("- Host:", ENV_VARS.EMAIL_HOST);
    console.log("- User:", ENV_VARS.EMAIL_USER ? "Set" : "Not set");
    console.log("- Pass:", ENV_VARS.EMAIL_PASS ? "Set" : "Not set");
    console.log("- From:", ENV_VARS.EMAIL_FROM);
    
    // Test email service health
    console.log("\nTesting email service health...");
    const health = await emailService.healthCheck();
    console.log("Email service health:", health);
    
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
    
    console.log("\n✅ Forgot password functionality test completed!");
    
  } catch (error) {
    console.error("❌ Error testing forgot password:", error);
  }
}

testForgotPassword();

