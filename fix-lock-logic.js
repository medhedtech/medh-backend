import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from './models/user-modal.js';
import { ENV_VARS } from './config/envVars.js';

// Connect to database
mongoose.connect(ENV_VARS.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixLockLogic() {
  try {
    const email = 'abhijha903@gmail.com';
    
    console.log(`🔍 Fixing lock logic for: ${email}`);
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.full_name}`);
    
    // Step 1: Completely unlock and reset the account
    console.log(`\n🔓 Step 1: Unlocking and resetting account...`);
    user.account_locked_until = undefined;
    user.failed_login_attempts = 0;
    user.password_change_attempts = 0;
    user.lockout_reason = undefined;
    
    // Step 2: Generate a fresh temporary password
    console.log(`\n🔄 Step 2: Generating fresh temporary password...`);
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    
    // Set token expiry time (1 hour)
    const resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    // Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString("hex");
    console.log(`🔑 New temporary password: ${tempPassword}`);
    
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);
    
    // Update user with all the data
    user.password_reset_token = resetPasswordToken;
    user.password_reset_expires = resetPasswordExpires;
    user.password = hashedPassword;
    
    // Save without activity log to avoid validation errors
    await user.save({ validateBeforeSave: false });
    
    console.log(`✅ Account reset successfully!`);
    console.log(`   - Account unlocked: ✅`);
    console.log(`   - Failed attempts reset: ✅`);
    console.log(`   - New temp password: ${tempPassword}`);
    console.log(`   - Reset token valid until: ${new Date(resetPasswordExpires)}`);
    
    // Step 3: Test the password verification immediately
    console.log(`\n🧪 Step 3: Testing password verification...`);
    
    // Reload user to ensure fresh data
    user = await User.findOne({ email: email.toLowerCase() });
    
    // Test the comparison
    const isMatch = await bcrypt.compare(tempPassword, user.password);
    console.log(`   - Password verification: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (isMatch) {
      console.log(`\n🎉 COMPLETE SUCCESS!`);
      console.log(`\n📋 Test with this command:`);
      console.log(`curl -X POST http://localhost:8080/api/v1/auth/verify-temp-password \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"email":"${email}","tempPassword":"${tempPassword}"}'`);
    } else {
      console.log(`\n🚨 Still failing - there may be a deeper issue`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

fixLockLogic(); 