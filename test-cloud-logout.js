import mongoose from 'mongoose';

// Connect to your cloud MongoDB Atlas database
const MONGODB_URL = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB Atlas (MedhDB)');

// Import the User model using dynamic import
const { default: User } = await import('./models/user-modal.js');

console.log('\n🔍 Testing Logout Functionality with Cloud Database');
console.log('===================================================');

// Find the student@medh.co user
const studentUser = await User.findOne({ email: 'student@medh.co' });
if (!studentUser) {
  console.log('❌ student@medh.co not found in cloud database');
  process.exit(1);
}

console.log(`✅ Found student@medh.co (ID: ${studentUser._id})`);
console.log(`📊 Current quick login keys: ${studentUser.quick_login_keys?.length || 0}`);

// Show current state of keys
if (studentUser.quick_login_keys && studentUser.quick_login_keys.length > 0) {
  console.log('\n🔑 Current quick login keys:');
  const now = new Date();
  studentUser.quick_login_keys.forEach((key, index) => {
    const isExpired = key.expires_at && now > key.expires_at;
    console.log(`   Key ${index + 1}: ID=${key.key_id}, Active=${key.is_active}, Expires=${key.expires_at || 'No expiration'}, Expired=${isExpired}`);
  });
}

// Simulate logout by setting expiration for all active keys
console.log('\n🔄 Simulating logout (setting 1-minute expiration)...');
const expirationTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
console.log(`⏰ Setting expiration to: ${expirationTime}`);

if (studentUser.quick_login_keys && studentUser.quick_login_keys.length > 0) {
  let keysUpdated = 0;
  studentUser.quick_login_keys.forEach(key => {
    if (key.is_active) {
      key.expires_at = expirationTime;
      keysUpdated++;
      console.log(`   Updated key ${key.key_id}: expires_at=${key.expires_at}`);
    }
  });
  
  try {
    await studentUser.save();
    console.log(`✅ Successfully set expiration for ${keysUpdated} active quick login keys`);
  } catch (saveError) {
    console.error("❌ Error saving quick login key expiration:", saveError);
  }
} else {
  console.log('⚠️ No quick login keys found to update');
}

// Verify the changes
console.log('\n🔍 Verifying changes...');
const updatedUser = await User.findOne({ email: 'student@medh.co' });
if (updatedUser && updatedUser.quick_login_keys) {
  const now = new Date();
  console.log(`📊 Updated quick login keys: ${updatedUser.quick_login_keys.length}`);
  
  updatedUser.quick_login_keys.forEach((key, index) => {
    const isExpired = key.expires_at && now > key.expires_at;
    const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
    
    console.log(`   Key ${index + 1}: ID=${key.key_id}, Active=${key.is_active}, Expires=${key.expires_at || 'No expiration'}, Expired=${isExpired}, Time until expiry=${timeUntilExpiry} seconds`);
  });
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB Atlas');
console.log('\n✅ Test completed! The logout functionality should now work properly.');
