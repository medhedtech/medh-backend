import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

console.log('\n🔍 Database and Collection Info');
console.log('==============================');
console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
console.log(`🔗 Connection URL: ${MONGODB_URL}`);

// List all collections
const collections = await mongoose.connection.db.listCollections().toArray();
console.log(`\n📋 Collections in database:`);
collections.forEach((collection, index) => {
  console.log(`   ${index + 1}. ${collection.name}`);
});

// Check the users collection specifically
console.log('\n🔍 Checking users collection...');
const usersCollection = mongoose.connection.db.collection('users');
const userCount = await usersCollection.countDocuments();
console.log(`📊 Total users in 'users' collection: ${userCount}`);

// Get the first few users to see their structure
const sampleUsers = await usersCollection.find({}).limit(3).toArray();
console.log(`\n📋 Sample users from 'users' collection:`);
sampleUsers.forEach((user, index) => {
  console.log(`   ${index + 1}. Email: ${user.email}, ID: ${user._id}`);
  if (user.quick_login_keys) {
    console.log(`      Quick login keys: ${user.quick_login_keys.length}`);
  }
});

// Check if there are other collections that might contain users
const possibleUserCollections = ['students', 'instructors', 'admins', 'user'];
for (const collectionName of possibleUserCollections) {
  try {
    const collection = mongoose.connection.db.collection(collectionName);
    const count = await collection.countDocuments();
    if (count > 0) {
      console.log(`\n📊 Found ${count} documents in '${collectionName}' collection`);
      const sample = await collection.find({}).limit(2).toArray();
      sample.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.email || doc.name || 'No email/name'} (ID: ${doc._id})`);
      });
    }
  } catch (error) {
    // Collection doesn't exist
  }
}

// Try to find student@medh.co in all collections
console.log('\n🔍 Searching for student@medh.co in all collections...');
for (const collection of collections) {
  try {
    const coll = mongoose.connection.db.collection(collection.name);
    const user = await coll.findOne({ email: 'student@medh.co' });
    if (user) {
      console.log(`✅ Found student@medh.co in '${collection.name}' collection!`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      if (user.quick_login_keys) {
        console.log(`   Quick login keys: ${user.quick_login_keys.length}`);
      }
    }
  } catch (error) {
    // Skip collections that don't have email field
  }
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB');

