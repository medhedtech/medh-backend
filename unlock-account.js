import mongoose from 'mongoose';
import User from './models/user-modal.js';

async function unlockAccount() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');
    
    const email = 'akatare098@gmail.com';
    const user = await User.findOne({ email });
    
    if (user) {
      console.log(`📊 Current status for ${email}:`);
      console.log(`   Failed attempts: ${user.failed_login_attempts || 0}`);
      console.log(`   Locked until: ${user.account_locked_until || 'Not locked'}`);
      console.log(`   Lockout reason: ${user.lockout_reason || 'None'}`);
      
      // Reset lockout fields
      user.failed_login_attempts = 0;
      user.account_locked_until = null;
      user.lockout_reason = null;
      user.temp_password_attempts = 0;
      user.temp_password_locked_until = null;
      
      await user.save();
      console.log('✅ Account unlocked successfully!');
    } else {
      console.log('❌ User not found');
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

unlockAccount();
