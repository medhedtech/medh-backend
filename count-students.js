import mongoose from 'mongoose';

// Connect to your cloud MongoDB Atlas database
const MONGODB_URL = 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
await mongoose.connect(MONGODB_URL);
console.log('✅ Connected to MongoDB Atlas (MedhDB)');

console.log('\n🔍 Counting Students in MedhDB Users Collection');
console.log('===============================================');

// Get the users collection
const usersCollection = mongoose.connection.db.collection('users');

// Count total users
const totalUsers = await usersCollection.countDocuments();
console.log(`📊 Total users in 'users' collection: ${totalUsers}`);

// Count students (users with role = "student")
const studentCount = await usersCollection.countDocuments({ role: "student" });
console.log(`👨‍🎓 Students (role: "student"): ${studentCount}`);

// Count by different roles
const roleCounts = await usersCollection.aggregate([
  {
    $group: {
      _id: "$role",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
]).toArray();

console.log('\n📋 Users by Role:');
roleCounts.forEach((role, index) => {
  console.log(`   ${index + 1}. ${role._id || 'No role'}: ${role.count}`);
});

// Get sample students
const sampleStudents = await usersCollection.find({ role: "student" }).limit(10).toArray();
console.log('\n👨‍🎓 Sample Students:');
sampleStudents.forEach((student, index) => {
  console.log(`   ${index + 1}. ${student.email} (${student.full_name || 'No name'})`);
});

// Count users with medh.co domain
const medhUsers = await usersCollection.countDocuments({ 
  email: { $regex: /medh\.co/i } 
});
console.log(`\n📧 Users with medh.co domain: ${medhUsers}`);

// Count active vs inactive users
const activeUsers = await usersCollection.countDocuments({ is_active: true });
const inactiveUsers = await usersCollection.countDocuments({ is_active: false });
console.log(`\n🟢 Active users: ${activeUsers}`);
console.log(`🔴 Inactive users: ${inactiveUsers}`);

await mongoose.disconnect();
console.log('\n🔌 Disconnected from MongoDB Atlas');
