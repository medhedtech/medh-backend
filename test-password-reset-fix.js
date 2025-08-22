#!/usr/bin/env node

/**
 * Password Reset API Test Script
 * Tests the fixed password reset validation
 */

import fetch from "node-fetch";

const API_BASE = "http://localhost:8080/api/v1/auth";

// Test configuration
const TEST_CONFIG = {
  email: "Abhijha903@gmail.com",

  // Test cases for password validation
  passwords: {
    valid: {
      newPassword: "Abhijha903@1",
      confirmPassword: "Abhijha903@1",
    },
    tooShort: {
      newPassword: "Abh@1",
      confirmPassword: "Abh@1",
    },
    noUppercase: {
      newPassword: "abhijha903@1",
      confirmPassword: "abhijha903@1",
    },
    noSpecialChar: {
      newPassword: "Abhijha9031",
      confirmPassword: "Abhijha9031",
    },
    mismatch: {
      newPassword: "Abhijha903@1",
      confirmPassword: "Abhijha903@2",
    },
  },
};

/**
 * Test password reset endpoint
 */
async function testPasswordReset(testName, passwordData) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log("─".repeat(50));

  try {
    const response = await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TEST_CONFIG.email,
        ...passwordData,
      }),
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`Message: ${data.message}`);

    if (data.errors) {
      console.log("Validation Errors:");
      data.errors.forEach((error) => {
        console.log(`  - ${error.path}: ${error.msg}`);
      });
    }

    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Test password validation requirements
 */
async function testPasswordValidation() {
  console.log("🔐 Password Reset Validation Tests");
  console.log("=".repeat(60));

  // Test valid password
  await testPasswordReset("Valid Password", TEST_CONFIG.passwords.valid);

  // Test password too short
  await testPasswordReset("Password Too Short", TEST_CONFIG.passwords.tooShort);

  // Test missing uppercase
  await testPasswordReset(
    "Missing Uppercase",
    TEST_CONFIG.passwords.noUppercase,
  );

  // Test missing special character
  await testPasswordReset(
    "Missing Special Character",
    TEST_CONFIG.passwords.noSpecialChar,
  );

  // Test password mismatch
  await testPasswordReset("Password Mismatch", TEST_CONFIG.passwords.mismatch);
}

/**
 * Test API endpoints availability
 */
async function testEndpointsAvailable() {
  console.log("\n🌐 Testing API Endpoints");
  console.log("=".repeat(60));

  const endpoints = [
    "/reset-password",
    "/reset-password-with-token",
    "/forgot-password",
    "/verify-temp-password",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      console.log(
        `${endpoint}: ${response.status === 400 ? "✅ Available" : "❌ Issue"} (${response.status})`,
      );
    } catch (error) {
      console.log(`${endpoint}: ❌ Error - ${error.message}`);
    }
  }
}

/**
 * Show correct usage examples
 */
function showUsageExamples() {
  console.log("\n📚 Correct Usage Examples");
  console.log("=".repeat(60));

  console.log("\n1. Reset Password (Email-based):");
  console.log("POST /api/v1/auth/reset-password");
  console.log(
    JSON.stringify(
      {
        email: "user@example.com",
        newPassword: "NewSecure@123",
        confirmPassword: "NewSecure@123",
      },
      null,
      2,
    ),
  );

  console.log("\n2. Reset Password (Token-based):");
  console.log("POST /api/v1/auth/reset-password-with-token");
  console.log(
    JSON.stringify(
      {
        token: "reset_token_here",
        password: "NewSecure@123",
      },
      null,
      2,
    ),
  );

  console.log("\n3. Password Requirements:");
  console.log("- 8-128 characters");
  console.log("- At least one uppercase letter (A-Z)");
  console.log("- At least one lowercase letter (a-z)");
  console.log("- At least one number (0-9)");
  console.log("- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)");
}

/**
 * Main test execution
 */
async function runTests() {
  console.log("🚀 Password Reset API Test Suite");
  console.log("=".repeat(60));
  console.log(`Testing against: ${API_BASE}`);
  console.log(`Test email: ${TEST_CONFIG.email}`);

  await testEndpointsAvailable();
  await testPasswordValidation();
  showUsageExamples();

  console.log("\n✅ Test suite completed!");
  console.log("\n💡 Your original request should now work with:");
  console.log(
    JSON.stringify(
      {
        email: "Abhijha903@gmail.com",
        newPassword: "Abhijha903@1",
        confirmPassword: "Abhijha903@1",
      },
      null,
      2,
    ),
  );
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testPasswordReset, testPasswordValidation, showUsageExamples };
