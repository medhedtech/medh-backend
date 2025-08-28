import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

console.log('\n🔍 Checking All Databases');
console.log('=========================');

// List all databases
const adminDb = mongoose.connection.db.admin();
const databases = await adminDb.listDatabases();
console.log(`📊 Available databases:`);
databases.databases.forEach((db, index) => {
  console.log(`   ${index + 1}. ${db.name} (${db.sizeOnDisk} bytes)`);
});

// Check the current database
console.log(`\n📊 Current database: ${mongoose.connection.db.databaseName}`);

// Check if student@medh.co exists in any collection in current database
console.log('\n🔍 Searching for student@medh.co in current database...');
const collections = await mongoose.connection.db.listCollections().toArray();

for (const collection of collections) {
  try {
    const coll = mongoose.connection.db.collection(collection.name);
    const user = await coll.findOne({ email: 'student@medh.co' });
    if (user) {
      console.log(`✅ Found student@medh.co in '${collection.name}' collection!`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Full Name: ${user.full_name || 'N/A'}`);
      if (user.quick_login_keys) {
        console.log(`   Quick login keys: ${user.quick_login_keys.length}`);
      }
    }
  } catch (error) {
    // Skip collections that don't have email field
  }
}

// Check if there are any users with similar emails
console.log('\n🔍 Searching for similar emails...');
for (const collection of collections) {
  try {
    const coll = mongoose.connection.db.collection(collection.name);
    const users = await coll.find({ email: { $regex: /student/i } }).limit(5).toArray();
    if (users.length > 0) {
      console.log(`📋 Found ${users.length} users with 'student' in email in '${collection.name}' collection:`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user._id})`);
      });
    }
  } catch (error) {
    // Skip collections that don't have email field
  }
}

// Check if there are any users with 'medh.co' domain
console.log('\n🔍 Searching for users with medh.co domain...');
for (const collection of collections) {
  try {
    const coll = mongoose.connection.db.collection(collection.name);
    const users = await coll.find({ email: { $regex: /medh\.co/i } }).limit(5).toArray();
    if (users.length > 0) {
      console.log(`📋 Found ${users.length} users with 'medh.co' domain in '${collection.name}' collection:`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user._id})`);
      });
    }
  } catch (error) {
    // Skip collections that don't have email field
  }
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB');

