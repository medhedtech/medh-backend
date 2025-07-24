#!/usr/bin/env node

/**
 * Test script for demo confirmation emails
 * Usage: node scripts/test-demo-email.js
 */

import emailService from "../services/emailService.js";
import logger from "../utils/logger.js";

const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";

async function testParentDemoConfirmationEmail() {
  console.log("🧪 Testing Parent Demo Confirmation Email...");

  const testData = {
    parent_name: "John Doe",
    student_name: "Jane Doe",
    demo_date: "Friday, July 25, 2025",
    demo_time: "morning 9-12",
    course: "AI & Data Science",
    grade_level: "grade_1-2",
    parent_email: TEST_EMAIL,
    temporary_password: "temp123456",
    form_id: "TEST-001",
    application_id: "APP-TEST-001",
    submitted_at: new Date(),
  };

  try {
    const result = await emailService.sendParentDemoConfirmationEmail(
      TEST_EMAIL,
      testData,
    );

    console.log("✅ Parent Demo Confirmation Email sent successfully!");
    console.log("Result:", result);
    return true;
  } catch (error) {
    console.error("❌ Failed to send Parent Demo Confirmation Email:");
    console.error(error.message);
    return false;
  }
}

async function testStudentDemoConfirmationEmail() {
  console.log("🧪 Testing Student Demo Confirmation Email...");

  const testData = {
    name: "Alex Smith",
    student_name: "Alex Smith",
    demo_date: "Friday, July 25, 2025",
    demo_time: "afternoon 2-5",
    course: "Web Development Fundamentals",
    email: TEST_EMAIL,
    temporary_password: "temp789012",
    form_id: "TEST-002",
    application_id: "APP-TEST-002",
    submitted_at: new Date(),
  };

  try {
    const result = await emailService.sendStudentDemoConfirmationEmail(
      TEST_EMAIL,
      testData,
    );

    console.log("✅ Student Demo Confirmation Email sent successfully!");
    console.log("Result:", result);
    return true;
  } catch (error) {
    console.error("❌ Failed to send Student Demo Confirmation Email:");
    console.error(error.message);
    return false;
  }
}

async function testEmailService() {
  console.log("🚀 Starting Demo Email Tests...");
  console.log(`📧 Test email will be sent to: ${TEST_EMAIL}`);
  console.log("=".repeat(50));

  const results = [];

  // Test parent demo confirmation email
  results.push(await testParentDemoConfirmationEmail());
  console.log();

  // Test student demo confirmation email
  results.push(await testStudentDemoConfirmationEmail());
  console.log();

  // Summary
  console.log("=".repeat(50));
  console.log("📊 Test Results Summary:");
  console.log(`✅ Successful: ${results.filter((r) => r).length}`);
  console.log(`❌ Failed: ${results.filter((r) => !r).length}`);
  console.log(
    `📈 Success Rate: ${((results.filter((r) => r).length / results.length) * 100).toFixed(1)}%`,
  );

  if (results.every((r) => r)) {
    console.log("🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Check the logs above.");
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes("--parent-only")) {
  testParentDemoConfirmationEmail().then((success) => {
    process.exit(success ? 0 : 1);
  });
} else if (process.argv.includes("--student-only")) {
  testStudentDemoConfirmationEmail().then((success) => {
    process.exit(success ? 0 : 1);
  });
} else {
  // Run all tests
  testEmailService().catch((error) => {
    console.error("💥 Test runner crashed:");
    console.error(error);
    process.exit(1);
  });
}
