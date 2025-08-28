import mongoose from 'mongoose';
import crypto from 'crypto';

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

// Test email
const TEST_EMAIL = 'student@medh.co';

async function testQuickLoginExpiration() {
  console.log('\n🔍 Starting Quick Login Expiration Debug Test');
  console.log('=============================================');
  
  try {
    // Step 1: Find the user
    const user = await User.findOne({ email: TEST_EMAIL });
    if (!user) {
      console.log('❌ User not found:', TEST_EMAIL);
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 User has ${user.quick_login_keys.length} quick login keys`);
    
    // Step 2: Check current state of all keys
    console.log('\n🔑 Current Quick Login Keys State:');
    user.quick_login_keys.forEach((key, index) => {
      const now = new Date();
      const isExpired = key.expires_at && now > key.expires_at;
      const isActive = key.is_active;
      
      console.log(`  Key ${index + 1}:`);
      console.log(`    ID: ${key.key_id}`);
      console.log(`    Active: ${isActive}`);
      console.log(`    Expires at: ${key.expires_at || 'No expiration'}`);
      console.log(`    Is expired: ${isExpired}`);
      console.log(`    Created: ${key.created_at}`);
      console.log(`    Last used: ${key.last_used}`);
    });
    
    // Step 3: Find an active, non-expired key for testing
    const now = new Date();
    const validKey = user.quick_login_keys.find(key => 
      key.is_active && 
      (!key.expires_at || now <= key.expires_at)
    );
    
    if (!validKey) {
      console.log('\n❌ No valid quick login keys found for testing');
      return;
    }
    
    console.log(`\n✅ Found valid key for testing: ${validKey.key_id}`);
    
    // Step 4: Simulate logout (set expiration to 1 minute from now)
    console.log('\n🚪 Simulating logout...');
    const expirationTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
    
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
    
    // Step 5: Verify the expiration was set
    console.log('\n🔍 Verifying expiration was set...');
    const updatedUser = await User.findOne({ email: TEST_EMAIL });
    updatedUser.quick_login_keys.forEach((key, index) => {
      const isExpired = key.expires_at && now > key.expires_at;
      console.log(`  Key ${index + 1} (${key.key_id}): expires_at=${key.expires_at}, is_expired=${isExpired}`);
    });
    
    // Step 6: Test quick login immediately (should work)
    console.log('\n⚡ Testing quick login immediately after logout...');
    const testKey = validKey.key_id; // We need the actual key value, not the ID
    
    // For this test, we'll simulate the bcrypt comparison
    // In reality, we'd need the actual unhashed key from the frontend
    console.log('  Note: Cannot test actual bcrypt comparison without the unhashed key');
    console.log('  But we can verify the expiration logic...');
    
    const immediateTestKey = updatedUser.quick_login_keys.find(key => 
      key.key_id === validKey.key_id
    );
    
    if (immediateTestKey) {
      const isExpired = immediateTestKey.expires_at && now > immediateTestKey.expires_at;
      const isActive = immediateTestKey.is_active;
      
      console.log(`  Key status: Active=${isActive}, Expired=${isExpired}`);
      console.log(`  Should work: ${isActive && !isExpired}`);
    }
    
    // Step 7: Wait 2 minutes and test again
    console.log('\n⏰ Waiting 2 minutes to test expiration...');
    console.log('  (In real test, this would be a setTimeout)');
    
    // Simulate 2 minutes later
    const futureTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    console.log(`  Future time: ${futureTime}`);
    
    const futureTestKey = updatedUser.quick_login_keys.find(key => 
      key.key_id === validKey.key_id
    );
    
    if (futureTestKey) {
      const isExpired = futureTestKey.expires_at && futureTime > futureTestKey.expires_at;
      const isActive = futureTestKey.is_active;
      
      console.log(`  Key status after 2 minutes: Active=${isActive}, Expired=${isExpired}`);
      console.log(`  Should work: ${isActive && !isExpired}`);
    }
    
    // Step 8: Check if there are any keys without expiration
    console.log('\n🔍 Checking for keys without expiration...');
    const keysWithoutExpiration = updatedUser.quick_login_keys.filter(key => 
      !key.expires_at && key.is_active
    );
    
    if (keysWithoutExpiration.length > 0) {
      console.log(`⚠️  Found ${keysWithoutExpiration.length} active keys without expiration:`);
      keysWithoutExpiration.forEach(key => {
        console.log(`    Key ID: ${key.key_id}, Created: ${key.created_at}`);
      });
    } else {
      console.log('✅ All active keys have expiration set');
    }
    
    console.log('\n✅ Debug test completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testQuickLoginExpiration();
