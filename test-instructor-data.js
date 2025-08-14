import mongoose from 'mongoose';
import Instructor from './models/instructor-model.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medh';

async function testInstructorData() {
  try {
    console.log('🔍 Testing Instructor Data Access...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all instructors
    const instructors = await Instructor.find()
      .select('_id full_name email domain status')
      .sort({ full_name: 1 });

    console.log(`📊 Found ${instructors.length} instructors in database:\n`);
    
    instructors.forEach((instructor, index) => {
      console.log(`${index + 1}. ${instructor.full_name}`);
      console.log(`   Email: ${instructor.email}`);
      console.log(`   Domain: ${instructor.domain}`);
      console.log(`   Status: ${instructor.status}`);
      console.log(`   ID: ${instructor._id}`);
      console.log('');
    });

    if (instructors.length === 0) {
      console.log('❌ No instructors found in database');
    } else {
      console.log('✅ Instructor data is available and accessible');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testInstructorData();

