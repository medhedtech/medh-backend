import mongoose from 'mongoose';

// Connect to your cloud MongoDB Atlas database
const MONGODB_URL = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB Atlas (MedhDB)');

// Import the User model using dynamic import
const { default: User } = await import('./models/user-modal.js');

console.log('\n🧹 Cleaning up Quick Login Keys with No Expiration');
console.log('==================================================');

// Find the student@medh.co user
const studentUser = await User.findOne({ email: 'student@medh.co' });
if (!studentUser) {
  console.log('❌ student@medh.co not found in cloud database');
  process.exit(1);
}

console.log(`✅ Found student@medh.co (ID: ${studentUser._id})`);
console.log(`📊 Current quick login keys: ${studentUser.quick_login_keys?.length || 0}`);

// Filter out keys with no expiration
const keysWithExpiration = studentUser.quick_login_keys.filter(key => 
  key.expires_at !== undefined && key.expires_at !== null
);

const keysWithoutExpiration = studentUser.quick_login_keys.filter(key => 
  key.expires_at === undefined || key.expires_at === null
);

console.log(`\n📋 Key Analysis:`);
console.log(`   Keys with expiration: ${keysWithExpiration.length}`);
console.log(`   Keys without expiration: ${keysWithoutExpiration.length}`);

if (keysWithoutExpiration.length > 0) {
  console.log(`\n🗑️ Removing ${keysWithoutExpiration.length} keys without expiration...`);
  
  // Update user to only keep keys with expiration
  studentUser.quick_login_keys = keysWithExpiration;
  
  try {
    await studentUser.save();
    console.log(`✅ Successfully removed ${keysWithoutExpiration.length} keys without expiration`);
    console.log(`📊 Remaining keys: ${studentUser.quick_login_keys.length}`);
  } catch (error) {
    console.error('❌ Error saving user:', error);
  }
} else {
  console.log(`\n✅ No keys without expiration found. All keys are properly configured.`);
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB Atlas');

