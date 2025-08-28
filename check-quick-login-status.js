import mongoose from 'mongoose';

// Connect to your cloud MongoDB Atlas database
const MONGODB_URL = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB Atlas (MedhDB)');

// Import the User model using dynamic import
const { default: User } = await import('./models/user-modal.js');

console.log('\n🔍 Checking Quick Login Status for student@medh.co');
console.log('==================================================');

// Find the student@medh.co user
const studentUser = await User.findOne({ email: 'student@medh.co' });
if (!studentUser) {
  console.log('❌ student@medh.co not found in cloud database');
  process.exit(1);
}

console.log(`✅ Found student@medh.co (ID: ${studentUser._id})`);
console.log(`📊 Quick login keys: ${studentUser.quick_login_keys?.length || 0}`);

// Check current state of keys
if (studentUser.quick_login_keys && studentUser.quick_login_keys.length > 0) {
  const now = new Date();
  console.log(`\n⏰ Current time: ${now}`);
  
  let expiredKeys = 0;
  let activeKeys = 0;
  let noExpirationKeys = 0;
  
  studentUser.quick_login_keys.forEach((key, index) => {
    const isExpired = key.expires_at && now > key.expires_at;
    const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
    
    if (isExpired) {
      expiredKeys++;
      console.log(`   ❌ Key ${index + 1}: EXPIRED (${Math.abs(timeUntilExpiry)} seconds ago)`);
    } else if (key.expires_at) {
      activeKeys++;
      console.log(`   ✅ Key ${index + 1}: Active (${timeUntilExpiry} seconds remaining)`);
    } else {
      noExpirationKeys++;
      console.log(`   ⚠️ Key ${index + 1}: No expiration set`);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Expired keys: ${expiredKeys}`);
  console.log(`   Active keys: ${activeKeys}`);
  console.log(`   No expiration keys: ${noExpirationKeys}`);
  console.log(`   Total keys: ${studentUser.quick_login_keys.length}`);
  
  if (activeKeys > 0) {
    console.log(`\n⚠️ WARNING: ${activeKeys} keys are still active! Quick login will work.`);
  } else if (noExpirationKeys > 0) {
    console.log(`\n⚠️ WARNING: ${noExpirationKeys} keys have no expiration! Quick login will work.`);
  } else {
    console.log(`\n✅ All keys are expired. Quick login should fail.`);
  }
} else {
  console.log('⚠️ No quick login keys found');
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB Atlas');

