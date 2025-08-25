import { ENV_VARS } from "./config/envVars.js";
import nodemailer from "nodemailer";

async function testDirectEmail() {
  try {
    console.log("Testing direct email sending...");
    console.log("Email configuration:");
    console.log("- Host:", ENV_VARS.EMAIL_HOST);
    console.log("- User:", ENV_VARS.EMAIL_USER ? "Set" : "Not set");
    console.log("- Pass:", ENV_VARS.EMAIL_PASS ? "Set" : "Not set");
    console.log("- From:", ENV_VARS.EMAIL_FROM);
    
    // Create transporter directly
    const transporter = nodemailer.createTransporter({
      host: ENV_VARS.EMAIL_HOST,
      port: ENV_VARS.EMAIL_PORT,
      secure: ENV_VARS.EMAIL_SECURE,
      auth: {
        user: ENV_VARS.EMAIL_USER,
        pass: ENV_VARS.EMAIL_PASS,
      },
    });
    
    // Verify connection
    console.log("\nVerifying email connection...");
    await transporter.verify();
    console.log("✅ Email connection verified successfully!");
    
    // Test sending email
    console.log("\nTesting email sending...");
    const mailOptions = {
      from: ENV_VARS.EMAIL_FROM,
      to: "test@example.com",
      subject: "Test Email - Forgot Password",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify the forgot password functionality.</p>
        <p>Your temporary password is: <strong>test123</strong></p>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", result.messageId);
    
  } catch (error) {
    console.error("❌ Error testing direct email:", error.message);
  }
}

testDirectEmail();

