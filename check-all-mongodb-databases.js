import mongoose from 'mongoose';

// Connect to MongoDB without specifying a database
const MONGODB_URL = 'mongodb://localhost:27017/';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB');

console.log('\n🔍 Checking All MongoDB Databases');
console.log('==================================');

// List all databases
const adminDb = mongoose.connection.db.admin();
const databases = await adminDb.listDatabases();
console.log(`📊 Available databases:`);
databases.databases.forEach((db, index) => {
  console.log(`   ${index + 1}. ${db.name} (${db.sizeOnDisk} bytes)`);
});

// Check each database for student@medh.co
console.log('\n🔍 Searching for student@medh.co in all databases...');
for (const dbInfo of databases.databases) {
  const dbName = dbInfo.name;
  
  // Skip system databases
  if (dbName === 'admin' || dbName === 'local' || dbName === 'config') {
    continue;
  }
  
  console.log(`\n📊 Checking database: ${dbName}`);
  
  try {
    // Connect to this specific database
    const dbConnection = mongoose.connection.client.db(dbName);
    
    // List collections in this database
    const collections = await dbConnection.listCollections().toArray();
    
    // Check users collection
    if (collections.some(col => col.name === 'users')) {
      const usersCollection = dbConnection.collection('users');
      const user = await usersCollection.findOne({ email: 'student@medh.co' });
      if (user) {
        console.log(`✅ Found student@medh.co in ${dbName}.users collection!`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Full Name: ${user.full_name || 'N/A'}`);
        if (user.quick_login_keys) {
          console.log(`   Quick login keys: ${user.quick_login_keys.length}`);
          
          const now = new Date();
          user.quick_login_keys.forEach((key, index) => {
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
        break; // Found the user, no need to check other databases
      }
    }
    
    // Check students collection
    if (collections.some(col => col.name === 'students')) {
      const studentsCollection = dbConnection.collection('students');
      const student = await studentsCollection.findOne({ email: 'student@medh.co' });
      if (student) {
        console.log(`✅ Found student@medh.co in ${dbName}.students collection!`);
        console.log(`   ID: ${student._id}`);
        console.log(`   Email: ${student.email}`);
        console.log(`   Full Name: ${student.full_name || 'N/A'}`);
        if (student.quick_login_keys) {
          console.log(`   Quick login keys: ${student.quick_login_keys.length}`);
        }
        break; // Found the user, no need to check other databases
      }
    }
    
    // Check all collections for any user with medh.co domain
    for (const collection of collections) {
      try {
        const coll = dbConnection.collection(collection.name);
        const users = await coll.find({ email: { $regex: /medh\.co/i } }).limit(3).toArray();
        if (users.length > 0) {
          console.log(`📋 Found ${users.length} users with 'medh.co' domain in ${dbName}.${collection.name}:`);
          users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (ID: ${user._id})`);
          });
        }
      } catch (error) {
        // Skip collections that don't have email field
      }
    }
    
  } catch (error) {
    console.log(`❌ Error checking database ${dbName}:`, error.message);
  }
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB');

