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

async function debugQuickLoginFlow() {
  try {
    console.log('\n🔍 Quick Login Flow Debug');
    console.log('=========================');
    
    // Step 1: Check all users and their quick login keys
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users in database`);
    
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}: ${user.email}`);
      console.log(`   Quick login keys: ${user.quick_login_keys.length}`);
      
      if (user.quick_login_keys.length > 0) {
        user.quick_login_keys.forEach((key, keyIndex) => {
          const now = new Date();
          const isExpired = key.expires_at && now > key.expires_at;
          const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
          
          console.log(`   Key ${keyIndex + 1}:`);
          console.log(`     ID: ${key.key_id}`);
          console.log(`     Active: ${key.is_active}`);
          console.log(`     Expires at: ${key.expires_at || 'No expiration'}`);
          console.log(`     Is expired: ${isExpired}`);
          console.log(`     Time until expiry: ${timeUntilExpiry} seconds`);
          console.log(`     Created: ${key.created_at}`);
          console.log(`     Last used: ${key.last_used}`);
        });
      }
    });
    
    // Step 2: Find users with active, non-expired keys
    console.log('\n🔍 Users with active, non-expired quick login keys:');
    const now = new Date();
    let foundActiveKeys = false;
    
    users.forEach(user => {
      const activeKeys = user.quick_login_keys.filter(key => 
        key.is_active && (!key.expires_at || now <= key.expires_at)
      );
      
      if (activeKeys.length > 0) {
        foundActiveKeys = true;
        console.log(`\n✅ ${user.email} has ${activeKeys.length} active, non-expired keys:`);
        activeKeys.forEach((key, index) => {
          const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
          console.log(`   Key ${index + 1}: ${key.key_id} (expires in ${timeUntilExpiry} seconds)`);
        });
      }
    });
    
    if (!foundActiveKeys) {
      console.log('❌ No users found with active, non-expired quick login keys');
    }
    
    // Step 3: Check for keys without expiration (potential issue)
    console.log('\n⚠️  Checking for keys without expiration (potential security issue):');
    let foundKeysWithoutExpiration = false;
    
    users.forEach(user => {
      const keysWithoutExpiration = user.quick_login_keys.filter(key => 
        !key.expires_at && key.is_active
      );
      
      if (keysWithoutExpiration.length > 0) {
        foundKeysWithoutExpiration = true;
        console.log(`\n🚨 ${user.email} has ${keysWithoutExpiration.length} active keys WITHOUT expiration:`);
        keysWithoutExpiration.forEach((key, index) => {
          console.log(`   Key ${index + 1}: ${key.key_id} (created: ${key.created_at})`);
        });
      }
    });
    
    if (!foundKeysWithoutExpiration) {
      console.log('✅ All active keys have expiration set');
    }
    
    // Step 4: Recommendations
    console.log('\n💡 Recommendations:');
    if (foundKeysWithoutExpiration) {
      console.log('1. 🚨 IMMEDIATE ACTION NEEDED: Set expiration for keys without expiration');
      console.log('2. Check if logout API is being called properly');
      console.log('3. Verify frontend logout flow');
    } else {
      console.log('1. ✅ All keys have expiration set');
      console.log('2. Check if the user you\'re testing with has the correct email');
      console.log('3. Verify the logout API is being called when you log out');
    }
    
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugQuickLoginFlow();
