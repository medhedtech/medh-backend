import mongoose from 'mongoose';

// Connect to your cloud MongoDB Atlas database
const MONGODB_URL = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB Atlas (MedhDB)');

console.log('\n🔍 Checking Cloud Database (MedhDB)');
console.log('====================================');
console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

// List all collections
const collections = await mongoose.connection.db.listCollections().toArray();
console.log(`\n📋 Collections in MedhDB:`);
collections.forEach((collection, index) => {
  console.log(`   ${index + 1}. ${collection.name}`);
});

// Check the users collection specifically
console.log('\n🔍 Checking users collection in cloud MedhDB...');
const usersCollection = mongoose.connection.db.collection('users');
const userCount = await usersCollection.countDocuments();
console.log(`📊 Total users in 'users' collection: ${userCount}`);

// Get the first few users to see their structure
const sampleUsers = await usersCollection.find({}).limit(5).toArray();
console.log(`\n📋 Sample users from 'users' collection:`);
sampleUsers.forEach((user, index) => {
  console.log(`   ${index + 1}. Email: ${user.email}, ID: ${user._id}`);
  if (user.quick_login_keys) {
    console.log(`      Quick login keys: ${user.quick_login_keys.length}`);
  }
});

// Search for student@medh.co specifically
console.log('\n🔍 Searching for student@medh.co...');
const studentUser = await usersCollection.findOne({ email: 'student@medh.co' });
if (studentUser) {
  console.log(`✅ Found student@medh.co in cloud MedhDB!`);
  console.log(`   ID: ${studentUser._id}`);
  console.log(`   Email: ${studentUser.email}`);
  console.log(`   Full Name: ${studentUser.full_name || 'N/A'}`);
  if (studentUser.quick_login_keys) {
    console.log(`   Quick login keys: ${studentUser.quick_login_keys.length}`);
    
    const now = new Date();
    studentUser.quick_login_keys.forEach((key, index) => {
      const isExpired = key.expires_at && now > key.expires_at;
      const timeUntilExpiry = key.expires_at ? Math.floor((key.expires_at - now) / 1000) : 'No expiration';
      
      console.log(`\n🔑 Key ${index + 1}:`);
      console.log(`   ID: ${key.key_id}`);
      console.log(`   Active: ${key.is_active}`);
      console.log(`   Expires at: ${key.expires_at || 'No expiration'}`);
      console.log(`   Is expired: ${isExpired}`);
      console.log(`   Time until expiry: ${timeUntilExpiry} seconds`);
    });
  }
} else {
  console.log('❌ student@medh.co not found in cloud MedhDB users collection');
}

// Check if there are any users with 'medh.co' domain
console.log('\n🔍 Searching for users with medh.co domain...');
const medhUsers = await usersCollection.find({ email: { $regex: /medh\.co/i } }).toArray();
if (medhUsers.length > 0) {
  console.log(`📋 Found ${medhUsers.length} users with 'medh.co' domain:`);
  medhUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (ID: ${user._id})`);
  });
} else {
  console.log('   No users with medh.co domain found');
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB Atlas');

