import mongoose from 'mongoose';

// Connect to MedhDB database
const MONGODB_URL = 'mongodb://localhost:27017/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MedhDB database');

console.log('\n🔍 Checking MedhDB Students Collection');
console.log('=======================================');

// Check the students collection
console.log('\n🔍 Checking students collection in MedhDB...');
const studentsCollection = mongoose.connection.db.collection('students');
const studentCount = await studentsCollection.countDocuments();
console.log(`📊 Total students in 'students' collection: ${studentCount}`);

// Get all students to see their structure
const allStudents = await studentsCollection.find({}).toArray();
console.log(`\n📋 All students in 'students' collection:`);
allStudents.forEach((student, index) => {
  console.log(`   ${index + 1}. Email: ${student.email || 'No email'}, ID: ${student._id}`);
  if (student.quick_login_keys) {
    console.log(`      Quick login keys: ${student.quick_login_keys.length}`);
  }
});

// Search for student@medh.co specifically
console.log('\n🔍 Searching for student@medh.co in students collection...');
const studentUser = await studentsCollection.findOne({ email: 'student@medh.co' });
if (studentUser) {
  console.log(`✅ Found student@medh.co in MedhDB students collection!`);
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
  console.log('❌ student@medh.co not found in MedhDB students collection');
}

// Check if there are any students with 'medh.co' domain
console.log('\n🔍 Searching for students with medh.co domain...');
const medhStudents = await studentsCollection.find({ email: { $regex: /medh\.co/i } }).toArray();
if (medhStudents.length > 0) {
  console.log(`📋 Found ${medhStudents.length} students with 'medh.co' domain:`);
  medhStudents.forEach((student, index) => {
    console.log(`   ${index + 1}. ${student.email} (ID: ${student._id})`);
  });
} else {
  console.log('   No students with medh.co domain found');
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MedhDB');

