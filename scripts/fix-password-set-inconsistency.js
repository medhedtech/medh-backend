#!/usr/bin/env node

import { ENV_VARS } from "../config/envVars.js";
import connectDB from "../config/db.js";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";

/**
 * Fix users with inconsistent password_set state
 * This fixes users who have is_demo: false but password_set: false
 * while actually having a valid password hash
 */
async function fixPasswordSetInconsistency() {
  console.log("🔧 Fixing password_set inconsistency...\n");

  try {
    // Connect to database
    console.log("1. Connecting to database...");
    await connectDB();
    console.log("✅ Database connected\n");

    // Find users with inconsistent state
    console.log("2. Finding users with inconsistent password_set state...");
    const inconsistentUsers = await User.find({
      is_demo: false, // Not demo users
      password_set: false, // But password_set is false
      password: { $exists: true, $ne: null, $ne: "" }, // But they have a password hash
    });

    console.log(
      `Found ${inconsistentUsers.length} users with inconsistent password_set state\n`,
    );

    if (inconsistentUsers.length === 0) {
      console.log("✅ No inconsistent users found. All good!");
      return;
    }

    // Show the users we found
    console.log("3. Users with inconsistent state:");
    inconsistentUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.full_name})`);
      console.log(`      - is_demo: ${user.is_demo}`);
      console.log(`      - password_set: ${user.password_set}`);
      console.log(`      - has password hash: ${!!user.password}`);
      console.log(`      - created: ${user.created_at}`);
      console.log("");
    });

    // Fix the inconsistent users
    console.log("4. Fixing inconsistent users...");
    let fixedCount = 0;

    for (const user of inconsistentUsers) {
      try {
        // Update password_set to true since they have a password hash
        user.password_set = true;

        // Also ensure first_login_completed is true for regular users
        if (!user.first_login_completed) {
          user.first_login_completed = true;
        }

        await user.save();

        console.log(`   ✅ Fixed: ${user.email}`);
        fixedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to fix ${user.email}: ${error.message}`);
      }
    }

    console.log(`\n5. Summary:`);
    console.log(`   - Total users found: ${inconsistentUsers.length}`);
    console.log(`   - Successfully fixed: ${fixedCount}`);
    console.log(`   - Failed to fix: ${inconsistentUsers.length - fixedCount}`);

    if (fixedCount > 0) {
      console.log(
        "\n✅ Password set inconsistency fixed! Users should now be able to login.",
      );
    }
  } catch (error) {
    console.error("❌ Fix script failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    if (process.env.NODE_ENV !== "test") {
      process.exit(0);
    }
  }
}

// Run the fix script
fixPasswordSetInconsistency().catch(console.error);
