import mongoose from 'mongoose';

// Connect to your cloud MongoDB Atlas database
const MONGODB_URL = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB Atlas (MedhDB)');

// Import the User model using dynamic import
const { default: User } = await import('./models/user-modal.js');

console.log('\n🧹 Cleaning up Quick Login Keys for ALL Users');
console.log('==============================================');

// Get all users with quick login keys
const allUsers = await User.find({ 'quick_login_keys.0': { $exists: true } });
console.log(`📊 Found ${allUsers.length} users with quick login keys`);

let totalUsersProcessed = 0;
let totalKeysRemoved = 0;
let totalKeysWithExpiration = 0;

for (const user of allUsers) {
  console.log(`\n👤 Processing user: ${user.email}`);
  console.log(`   Current keys: ${user.quick_login_keys?.length || 0}`);
  
  // Filter out keys with no expiration
  const keysWithExpiration = user.quick_login_keys.filter(key => 
    key.expires_at !== undefined && key.expires_at !== null
  );
  
  const keysWithoutExpiration = user.quick_login_keys.filter(key => 
    key.expires_at === undefined || key.expires_at === null
  );
  
  console.log(`   Keys with expiration: ${keysWithExpiration.length}`);
  console.log(`   Keys without expiration: ${keysWithoutExpiration.length}`);
  
  if (keysWithoutExpiration.length > 0) {
    console.log(`   🗑️ Removing ${keysWithoutExpiration.length} keys without expiration...`);
    
    // Update user to only keep keys with expiration
    user.quick_login_keys = keysWithExpiration;
    
    try {
      await user.save();
      console.log(`   ✅ Successfully cleaned up ${keysWithoutExpiration.length} keys`);
      totalKeysRemoved += keysWithoutExpiration.length;
    } catch (error) {
      console.error(`   ❌ Error saving user ${user.email}:`, error.message);
    }
  } else {
    console.log(`   ✅ No cleanup needed`);
  }
  
  totalUsersProcessed++;
  totalKeysWithExpiration += keysWithExpiration.length;
}

console.log(`\n📊 Summary:`);
console.log(`   Users processed: ${totalUsersProcessed}`);
console.log(`   Total keys removed: ${totalKeysRemoved}`);
console.log(`   Total keys with expiration: ${totalKeysWithExpiration}`);

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB Atlas');
