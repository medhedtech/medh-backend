import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

// Import User model
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  quick_login_keys: [{
    key_id: String,
    hashed_key: String,
    created_at: Date,
    last_used: Date,
    expires_at: Date,
    is_active: { type: Boolean, default: true }
  }]
}));

async function testCompleteFlow() {
  try {
    console.log('\n🧪 Testing Complete Quick Login Flow');
    console.log('=====================================');
    
    // Step 1: Check if student user exists
    console.log('\n📋 Step 1: Checking if student@medh.co exists...');
    let user = await User.findOne({ email: 'student@medh.co' });
    if (!user) {
      console.log('❌ User student@medh.co not found - this explains why quick login works!');
      console.log('   When you quick login, the user gets created with a new key that has no expiration.');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 Quick login keys: ${user.quick_login_keys.length}`);
    
    if (user.quick_login_keys.length > 0) {
      const now = new Date();
      user.quick_login_keys.forEach((key, index) => {
        const isExpired = key.expires_at && now > key.expires_at;
        const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
        
        console.log(`\n🔑 Key ${index + 1}:`);
        console.log(`   ID: ${key.key_id}`);
        console.log(`   Active: ${key.is_active}`);
        console.log(`   Expires at: ${key.expires_at || 'No expiration'}`);
        console.log(`   Is expired: ${isExpired}`);
        console.log(`   Time until expiry: ${timeUntilExpiry} seconds`);
        console.log(`   Created: ${key.created_at}`);
        console.log(`   Last used: ${key.last_used}`);
      });
    }
    
    // Step 2: Check if there are any active, non-expired keys
    const now = new Date();
    const activeKeys = user.quick_login_keys.filter(key => 
      key.is_active && (!key.expires_at || now <= key.expires_at)
    );
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total keys: ${user.quick_login_keys.length}`);
    console.log(`   Active keys: ${activeKeys.length}`);
    console.log(`   Keys without expiration: ${user.quick_login_keys.filter(k => !k.expires_at).length}`);
    
    if (activeKeys.length > 0) {
      console.log(`\n✅ User has ${activeKeys.length} active quick login keys - this is why quick login works!`);
      
      // Step 3: Simulate logout by setting expiration
      console.log('\n🔄 Step 3: Simulating logout (setting 1-minute expiration)...');
      const expirationTime = new Date(Date.now() + 60000); // 1 minute from now
      
      for (let key of user.quick_login_keys) {
        if (key.is_active) {
          key.expires_at = expirationTime;
          console.log(`   Setting key ${key.key_id} to expire at: ${expirationTime}`);
        }
      }
      
      await user.save();
      console.log('✅ Updated user with expiration times');
      
      // Step 4: Check again after setting expiration
      console.log('\n📋 Step 4: Checking after setting expiration...');
      user = await User.findOne({ email: 'student@medh.co' });
      
      const activeKeysAfter = user.quick_login_keys.filter(key => 
        key.is_active && (!key.expires_at || now <= key.expires_at)
      );
      
      console.log(`   Active keys after setting expiration: ${activeKeysAfter.length}`);
      
      if (activeKeysAfter.length === 0) {
        console.log('✅ All keys are now expired - quick login should fail!');
      } else {
        console.log('❌ Some keys are still active - this might be the issue');
      }
      
    } else {
      console.log(`\n❌ User has no active quick login keys`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testCompleteFlow();
