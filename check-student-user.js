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

async function checkStudentUser() {
  try {
    console.log('\n🔍 Checking student@medh.co user');
    console.log('==============================');
    
    // Find the student user
    const user = await User.findOne({ email: 'student@medh.co' });
    if (!user) {
      console.log('❌ User student@medh.co not found');
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
    
    // Check if there are any active, non-expired keys
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

checkStudentUser();

