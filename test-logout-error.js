import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

// Import User model
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  full_name: String,
  quick_login_keys: [{
    key_id: String,
    hashed_key: String,
    created_at: Date,
    last_used: Date,
    expires_at: Date,
    is_active: { type: Boolean, default: true }
  }],
  sessions: [{
    session_id: String,
    is_active: { type: Boolean, default: true },
    invalidated_at: Date
  }]
}));

async function testLogoutError() {
  try {
    console.log('\n🧪 Testing Logout Error');
    console.log('========================');
    
    // Check if student user exists
    let user = await User.findOne({ email: 'student@medh.co' });
    if (!user) {
      console.log('❌ User student@medh.co not found');
      console.log('   This might be causing the 500 error - user not found during logout');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 Quick login keys: ${user.quick_login_keys?.length || 0}`);
    console.log(`📊 Sessions: ${user.sessions?.length || 0}`);
    
    // Test the endSession method
    console.log('\n🔧 Testing endSession method...');
    try {
      await user.endSession('test-session-id');
      console.log('✅ endSession method works');
    } catch (error) {
      console.log('❌ endSession method failed:', error.message);
    }
    
    // Test the setOffline method
    console.log('\n🔧 Testing setOffline method...');
    try {
      await user.setOffline();
      console.log('✅ setOffline method works');
    } catch (error) {
      console.log('❌ setOffline method failed:', error.message);
    }
    
    // Test setting quick login key expiration
    console.log('\n🔧 Testing quick login key expiration...');
    if (user.quick_login_keys && user.quick_login_keys.length > 0) {
      const expirationTime = new Date(Date.now() + 60 * 1000);
      user.quick_login_keys.forEach(key => {
        if (key.is_active) {
          key.expires_at = expirationTime;
          console.log(`   Setting key ${key.key_id} to expire at: ${expirationTime}`);
        }
      });
      
      try {
        await user.save();
        console.log('✅ Successfully saved user with expiration times');
      } catch (error) {
        console.log('❌ Error saving user:', error.message);
      }
    } else {
      console.log('   No quick login keys to test');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testLogoutError();
