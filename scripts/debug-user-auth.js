#!/usr/bin/env node

import { ENV_VARS } from "../config/envVars.js";
import connectDB from "../config/db.js";
import User from "../models/user-modal.js";
import dbUtils from "../utils/dbUtils.js";
import logger from "../utils/logger.js";
import passwordSecurity from "../utils/passwordSecurity.js";

/**
 * Debug authentication for a specific user
 */
async function debugUserAuth() {
  console.log("🔍 Debugging user authentication...\n");

  try {
    // Connect to database
    console.log("1. Connecting to database...");
    await connectDB();
    console.log("✅ Database connected\n");

    const testEmail = "er.kavita.meratwal@gmail.com";
    const testPassword = "Student@123";

    // Test 1: Find user by email
    console.log(`2. Looking up user: ${testEmail}`);
    const user = await dbUtils.findOne(User, {
      email: testEmail.toLowerCase(),
    });

    if (!user) {
      console.log("❌ User not found in database");
      console.log("Checking if email exists in any format...");

      // Check for case variations
      const userCaseInsensitive = await User.findOne({
        email: { $regex: new RegExp(`^${testEmail}$`, "i") },
      });

      if (userCaseInsensitive) {
        console.log(
          "✅ Found user with different case:",
          userCaseInsensitive.email,
        );
      } else {
        console.log("❌ No user found with any case variation");

        // List first 5 users for reference
        const sampleUsers = await User.find({})
          .limit(5)
          .select("email full_name");
        console.log("\nSample users in database:");
        sampleUsers.forEach((u) =>
          console.log(`- ${u.email} (${u.full_name})`),
        );
      }
      return;
    }

    console.log("✅ User found!");
    console.log(`   - Full Name: ${user.full_name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Is Demo: ${user.is_demo}`);
    console.log(`   - Password Set: ${user.password_set}`);
    console.log(`   - Email Verified: ${user.email_verified}`);
    console.log(`   - Is Active: ${user.is_active}`);
    console.log(`   - Is Banned: ${user.is_banned}`);
    console.log(`   - Role: ${JSON.stringify(user.role)}`);
    console.log(`   - Admin Role: ${user.admin_role || "none"}`);
    console.log(`   - Account Type: ${user.account_type}`);
    console.log(`   - Created: ${user.created_at}`);
    console.log("");

    // Test 2: Check account lockout status
    console.log("3. Checking account lockout status...");
    console.log(
      `   - Failed Login Attempts: ${user.failed_login_attempts || 0}`,
    );
    console.log(
      `   - Password Change Attempts: ${user.password_change_attempts || 0}`,
    );
    console.log(
      `   - Account Locked Until: ${user.account_locked_until || "not locked"}`,
    );
    console.log(`   - Lockout Reason: ${user.lockout_reason || "none"}`);
    console.log(
      `   - Last Failed Attempt: ${user.last_failed_attempt || "none"}`,
    );
    console.log("");

    // Test 3: Check if account is currently locked
    const now = new Date();
    const isLocked =
      user.account_locked_until && user.account_locked_until > now;
    console.log(
      `4. Account lock status: ${isLocked ? "🔒 LOCKED" : "✅ UNLOCKED"}`,
    );
    if (isLocked) {
      const remainingTime = Math.ceil(
        (user.account_locked_until - now) / (1000 * 60),
      );
      console.log(`   - Remaining lockout time: ${remainingTime} minutes`);
    }
    console.log("");

    // Test 4: Check password
    console.log("5. Testing password...");
    if (!user.password) {
      console.log("❌ No password hash stored for user");
      return;
    }

    console.log(`   - Password hash exists: ✅`);
    console.log(`   - Hash starts with: ${user.password.substring(0, 10)}...`);

    // Test password comparison
    console.log(`   - Testing password: "${testPassword}"`);

    try {
      const isValidPassword = await user.comparePassword(testPassword);
      console.log(
        `   - Password match: ${isValidPassword ? "✅ VALID" : "❌ INVALID"}`,
      );

      if (!isValidPassword) {
        // Test direct bcrypt comparison
        console.log("   - Testing direct bcrypt comparison...");
        const bcrypt = (await import("bcryptjs")).default;
        const directMatch = await bcrypt.compare(testPassword, user.password);
        console.log(
          `   - Direct bcrypt match: ${directMatch ? "✅ VALID" : "❌ INVALID"}`,
        );

        // Test with pepper
        if (!directMatch) {
          console.log("   - Testing with password pepper...");
          const pepperedPassword =
            passwordSecurity.pepperPassword(testPassword);
          const pepperedMatch = await bcrypt.compare(
            pepperedPassword,
            user.password,
          );
          console.log(
            `   - Peppered password match: ${pepperedMatch ? "✅ VALID" : "❌ INVALID"}`,
          );
        }
      }
    } catch (error) {
      console.log(`   - Password comparison error: ${error.message}`);
    }
    console.log("");

    // Test 5: Check password security settings
    console.log("6. Password security settings...");
    console.log(
      `   - Bcrypt work factor: ${process.env.BCRYPT_WORK_FACTOR || 12}`,
    );
    console.log(
      `   - Password pepper configured: ${process.env.PASSWORD_PEPPER ? "Yes" : "No"}`,
    );
    console.log("");

    // Test 6: Try creating a new password hash for comparison
    console.log("7. Testing password hashing...");
    try {
      const newHash = await passwordSecurity.hashPassword(testPassword);
      console.log(`   - New hash generated: ✅`);
      console.log(`   - New hash: ${newHash.substring(0, 20)}...`);

      const newHashMatch = await passwordSecurity.comparePassword(
        testPassword,
        newHash,
      );
      console.log(
        `   - New hash validates: ${newHashMatch ? "✅ VALID" : "❌ INVALID"}`,
      );
    } catch (error) {
      console.log(`   - Hash generation error: ${error.message}`);
    }
    console.log("");

    // Test 7: Check user's recent activity
    console.log("8. Recent user activity...");
    if (user.activity_log && user.activity_log.length > 0) {
      const recentActivities = user.activity_log.slice(-5);
      console.log("   - Last 5 activities:");
      recentActivities.forEach((activity, index) => {
        console.log(
          `     ${index + 1}. ${activity.action} - ${activity.timestamp}`,
        );
      });
    } else {
      console.log("   - No activity log found");
    }
    console.log("");

    // Test 8: Simulate login process
    console.log("9. Simulating login process...");
    console.log("   - Email lookup: ✅");
    console.log(
      `   - Account locked check: ${isLocked ? "❌ LOCKED" : "✅ PASSED"}`,
    );

    if (!isLocked) {
      const passwordValid = await user.comparePassword(testPassword);
      console.log(
        `   - Password verification: ${passwordValid ? "✅ PASSED" : "❌ FAILED"}`,
      );

      if (passwordValid) {
        console.log("   - 🎉 Login should succeed!");
      } else {
        console.log("   - ❌ Login would fail due to invalid password");
      }
    } else {
      console.log("   - ❌ Login would fail due to account lockout");
    }
  } catch (error) {
    console.error("❌ Debug script failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    if (process.env.NODE_ENV !== "test") {
      process.exit(0);
    }
  }
}

// Run the debug script
debugUserAuth().catch(console.error);
