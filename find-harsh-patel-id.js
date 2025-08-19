import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/student-model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MedhDB';

async function findHarshPatelId() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Harsh Patel in the Student collection
    console.log('🔍 Searching for Harsh Patel in Student collection...');
    const harshPatel = await Student.findOne({ 
      full_name: { $regex: /harsh patel/i } 
    }).select('_id full_name email student_id');
    
         if (harshPatel) {
       console.log('✅ Found Harsh Patel in Student collection:');
       console.log(`   - ID: ${harshPatel._id}`);
       console.log(`   - Name: ${harshPatel.full_name}`);
       console.log(`   - Email: ${harshPatel.email}`);
       console.log(`   - Student ID: ${harshPatel.student_id || 'N/A'}`);
     } else {
       console.log('❌ Harsh Patel not found in Student collection');
     }

         // Also show all students with "harsh" in their name
     console.log('\n🔍 Searching for all students with "harsh" in name...');
     const allHarshStudents = await Student.find({ 
       full_name: { $regex: /harsh/i } 
     }).select('_id full_name email student_id');
    
    if (allHarshStudents.length > 0) {
      console.log(`📋 Found ${allHarshStudents.length} students with "harsh" in name:`);
      allHarshStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.full_name} (${student._id})`);
      });
    } else {
      console.log('❌ No students found with "harsh" in name');
    }

         // Show all students for reference
     console.log('\n📋 All students in Student collection:');
     const allStudents = await Student.find({}).select('_id full_name email').limit(10);
    
    if (allStudents.length > 0) {
      console.log(`📚 Showing first ${allStudents.length} students:`);
      allStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.full_name} (${student._id})`);
      });
    } else {
      console.log('❌ No students found in database');
    }

  } catch (error) {
    console.error('❌ Error finding Harsh Patel:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

findHarshPatelId();
