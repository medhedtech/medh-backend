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

async function testLogoutAPI() {
  try {
    console.log('\n🔍 Testing Logout API');
    console.log('====================');
    
    // Step 1: Check current state
    const user = await User.findOne({ email: 'superadmin@medh.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 Current quick login keys: ${user.quick_login_keys.length}`);
    
    // Show current state
    user.quick_login_keys.forEach((key, index) => {
      const now = new Date();
      const isExpired = key.expires_at && now > key.expires_at;
      console.log(`  Key ${index + 1}: ID=${key.key_id}, Active=${key.is_active}, Expires=${key.expires_at || 'No expiration'}, Expired=${isExpired}`);
    });
    
    // Step 2: Simulate logout by calling the logout logic directly
    console.log('\n🚪 Simulating logout...');
    
    const expirationTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
    console.log(`Setting expiration to: ${expirationTime}`);
    
    let keysUpdated = 0;
    user.quick_login_keys.forEach(key => {
      if (key.is_active) {
        key.expires_at = expirationTime;
        keysUpdated++;
        console.log(`  Updated key ${key.key_id}: expires_at=${key.expires_at}`);
      }
    });
    
    await user.save();
    console.log(`✅ Set expiration for ${keysUpdated} active keys`);
    
    // Step 3: Verify the changes
    console.log('\n🔍 Verifying changes...');
    const updatedUser = await User.findOne({ email: 'superadmin@medh.com' });
    
    updatedUser.quick_login_keys.forEach((key, index) => {
      const now = new Date();
      const isExpired = key.expires_at && now > key.expires_at;
      console.log(`  Key ${index + 1}: ID=${key.key_id}, Active=${key.is_active}, Expires=${key.expires_at}, Expired=${isExpired}`);
    });
    
    console.log('\n✅ Logout test completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testLogoutAPI();
