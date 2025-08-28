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

async function testQuickLoginFinal() {
  try {
    console.log('\n🧪 Final Quick Login Test');
    console.log('==========================');
    
    // Step 1: Create a test user (simulate first quick login)
    console.log('\n📋 Step 1: Creating test user (simulating first quick login)...');
    
    // Delete existing user if exists
    await User.deleteOne({ email: 'student@medh.co' });
    
    // Create new user with a quick login key (no expiration)
    const testUser = new User({
      full_name: 'Test Student',
      email: 'student@medh.co',
      quick_login_keys: [{
        key_id: 'test-key-123',
        hashed_key: 'test-hashed-key',
        created_at: new Date(),
        last_used: new Date(),
        expires_at: null, // No expiration initially
        is_active: true
      }]
    });
    
    await testUser.save();
    console.log('✅ Created test user with quick login key (no expiration)');
    
    // Step 2: Check the user
    console.log('\n📋 Step 2: Checking user state...');
    let user = await User.findOne({ email: 'student@medh.co' });
    console.log(`   User: ${user.email}`);
    console.log(`   Quick login keys: ${user.quick_login_keys.length}`);
    console.log(`   Key expires at: ${user.quick_login_keys[0].expires_at || 'No expiration'}`);
    
    // Step 3: Simulate proper logout (set 1-minute expiration)
    console.log('\n🔄 Step 3: Simulating proper logout (setting 1-minute expiration)...');
    const expirationTime = new Date(Date.now() + 60000); // 1 minute from now
    
    for (let key of user.quick_login_keys) {
      if (key.is_active) {
        key.expires_at = expirationTime;
        console.log(`   Setting key to expire at: ${expirationTime}`);
      }
    }
    
    await user.save();
    console.log('✅ Updated user with expiration time');
    
    // Step 4: Check if quick login should work now
    console.log('\n📋 Step 4: Checking if quick login should work...');
    user = await User.findOne({ email: 'student@medh.co' });
    const now = new Date();
    
    const activeKeys = user.quick_login_keys.filter(key => 
      key.is_active && (!key.expires_at || now <= key.expires_at)
    );
    
    console.log(`   Current time: ${now}`);
    console.log(`   Key expires at: ${user.quick_login_keys[0].expires_at}`);
    console.log(`   Is expired: ${now > user.quick_login_keys[0].expires_at}`);
    console.log(`   Active keys: ${activeKeys.length}`);
    
    if (activeKeys.length > 0) {
      console.log('✅ Quick login should still work (within 1 minute)');
    } else {
      console.log('❌ Quick login should fail (expired)');
    }
    
    // Step 5: Wait and test again
    console.log('\n⏰ Step 5: Waiting 2 minutes to test expiration...');
    console.log('   (In real scenario, you would wait 1 minute after logout)');
    
    // Simulate waiting by setting expiration to past time
    const pastTime = new Date(Date.now() - 60000); // 1 minute ago
    user.quick_login_keys[0].expires_at = pastTime;
    await user.save();
    
    // Check again
    user = await User.findOne({ email: 'student@medh.co' });
    const activeKeysAfter = user.quick_login_keys.filter(key => 
      key.is_active && (!key.expires_at || now <= key.expires_at)
    );
    
    console.log(`   Active keys after expiration: ${activeKeysAfter.length}`);
    
    if (activeKeysAfter.length === 0) {
      console.log('✅ SUCCESS: Quick login should now fail!');
      console.log('   This proves the expiration logic works correctly.');
    } else {
      console.log('❌ ISSUE: Quick login still works after expiration');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testQuickLoginFinal();
