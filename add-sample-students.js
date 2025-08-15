// Script to add sample students to the Student collection
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define Student Schema
const studentSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone_number: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    min: 5,
    max: 100
  },
  course_name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending', 'Completed'],
    default: 'Active'
  },
  grade: {
    type: String,
    trim: true
  },
  meta: {
    address: String,
    city: String,
    state: String,
    country: String,
    education_level: String,
    interests: [String],
    notes: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Create Student model
const Student = mongoose.model('Student', studentSchema);

// Sample student data
const sampleStudents = [
  {
    full_name: "Hamza Khan",
    email: "thekhanuae@gmail.com",
    phone_number: "+971501234567",
    age: 22,
    course_name: "Digital Marketing with Data Analytics",
    status: "Active",
    grade: "12th",
    meta: {
      address: "Dubai, UAE",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      education_level: "High School",
      interests: ["Digital Marketing", "Data Analytics", "Social Media"],
      notes: "Enthusiastic student interested in digital marketing"
    }
  },
  {
    full_name: "Hamdan Khan",
    email: "hamdankhanuae@gmail.com",
    phone_number: "+971502345678",
    age: 20,
    course_name: "Web Development",
    status: "Active",
    grade: "11th",
    meta: {
      address: "Abu Dhabi, UAE",
      city: "Abu Dhabi",
      state: "Abu Dhabi",
      country: "UAE",
      education_level: "High School",
      interests: ["Programming", "Web Design", "JavaScript"],
      notes: "Passionate about web development and coding"
    }
  },
  {
    full_name: "Aanya Singh",
    email: "ranveerpsing@gmail.com",
    phone_number: "+919876543210",
    age: 19,
    course_name: "Graphic Design",
    status: "Active",
    grade: "12th",
    meta: {
      address: "Mumbai, India",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      education_level: "High School",
      interests: ["Design", "Art", "Creativity"],
      notes: "Creative student with strong design skills"
    }
  },
  {
    full_name: "Priya Patel",
    email: "priya.patel@example.com",
    phone_number: "+919876543211",
    age: 21,
    course_name: "Data Science",
    status: "Active",
    grade: "Graduate",
    meta: {
      address: "Bangalore, India",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      education_level: "Graduate",
      interests: ["Data Analysis", "Machine Learning", "Statistics"],
      notes: "Graduate student interested in data science"
    }
  },
  {
    full_name: "Ahmed Hassan",
    email: "ahmed.hassan@example.com",
    phone_number: "+971503456789",
    age: 23,
    course_name: "Mobile App Development",
    status: "Active",
    grade: "Graduate",
    meta: {
      address: "Sharjah, UAE",
      city: "Sharjah",
      state: "Sharjah",
      country: "UAE",
      education_level: "Graduate",
      interests: ["Mobile Development", "iOS", "Android"],
      notes: "Graduate student focused on mobile app development"
    }
  },
  {
    full_name: "Fatima Al-Zahra",
    email: "fatima.alzahra@example.com",
    phone_number: "+971504567890",
    age: 18,
    course_name: "UI/UX Design",
    status: "Active",
    grade: "12th",
    meta: {
      address: "Riyadh, Saudi Arabia",
      city: "Riyadh",
      state: "Riyadh",
      country: "Saudi Arabia",
      education_level: "High School",
      interests: ["Design", "User Experience", "Prototyping"],
      notes: "High school student passionate about UI/UX design"
    }
  },
  {
    full_name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone_number: "+919876543212",
    age: 24,
    course_name: "Cybersecurity",
    status: "Active",
    grade: "Graduate",
    meta: {
      address: "Delhi, India",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      education_level: "Graduate",
      interests: ["Security", "Networking", "Ethical Hacking"],
      notes: "Graduate student specializing in cybersecurity"
    }
  },
  {
    full_name: "Sara Johnson",
    email: "sara.johnson@example.com",
    phone_number: "+1234567890",
    age: 20,
    course_name: "Content Writing",
    status: "Active",
    grade: "11th",
    meta: {
      address: "New York, USA",
      city: "New York",
      state: "New York",
      country: "USA",
      education_level: "High School",
      interests: ["Writing", "Content Creation", "SEO"],
      notes: "High school student with strong writing skills"
    }
  },
  {
    full_name: "Mohammed Ali",
    email: "mohammed.ali@example.com",
    phone_number: "+971505678901",
    age: 22,
    course_name: "Video Editing",
    status: "Active",
    grade: "12th",
    meta: {
      address: "Doha, Qatar",
      city: "Doha",
      state: "Doha",
      country: "Qatar",
      education_level: "High School",
      interests: ["Video Editing", "Film Making", "Animation"],
      notes: "High school student interested in video production"
    }
  },
  {
    full_name: "Zara Ahmed",
    email: "zara.ahmed@example.com",
    phone_number: "+919876543213",
    age: 19,
    course_name: "Digital Marketing",
    status: "Active",
    grade: "12th",
    meta: {
      address: "Hyderabad, India",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      education_level: "High School",
      interests: ["Marketing", "Social Media", "Branding"],
      notes: "High school student passionate about digital marketing"
    }
  }
];

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URL:', mongoUrl);
    
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

// Add sample students to database
async function addSampleStudents() {
  try {
    console.log('\n📝 Adding sample students to Student collection...');
    
    // Check if students already exist
    const existingCount = await Student.countDocuments();
    console.log(`📊 Found ${existingCount} existing students in database`);
    
    if (existingCount > 0) {
      console.log('⚠️  Students already exist in database. Skipping...');
      return { success: true, message: 'Students already exist', count: existingCount };
    }
    
    // Insert sample students
    const result = await Student.insertMany(sampleStudents);
    console.log(`✅ Successfully added ${result.length} students to database`);
    
    // Display added students
    console.log('\n📋 Added Students:');
    result.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.full_name} (${student.email})`);
      console.log(`      - Course: ${student.course_name}`);
      console.log(`      - Status: ${student.status}`);
      console.log(`      - Age: ${student.age}`);
    });
    
    return { success: true, count: result.length, students: result };
  } catch (error) {
    console.error('❌ Error adding sample students:', error.message);
    return { success: false, error: error.message };
  }
}

// Test Student collection API
async function testStudentAPI() {
  try {
    console.log('\n🧪 Testing Student Collection API...');
    
    // Get all students
    const students = await Student.find({}).select('_id full_name email course_name status');
    console.log(`📊 Found ${students.length} students in Student collection`);
    
    if (students.length > 0) {
      console.log('\n📋 Sample Students:');
      students.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.full_name}`);
        console.log(`      - Email: ${student.email}`);
        console.log(`      - Course: ${student.course_name}`);
        console.log(`      - Status: ${student.status}`);
      });
    }
    
    return { success: true, count: students.length };
  } catch (error) {
    console.error('❌ Error testing Student API:', error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Sample Student Data Addition...');
  console.log('===========================================');
  
  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Add sample students
  const addResult = await addSampleStudents();
  
  // Test Student API
  const testResult = await testStudentAPI();
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('===========');
  console.log(`✅ Database Connection: ${connected ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Sample Students Addition: ${addResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✅ Student API Test: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (addResult.success && testResult.success) {
    console.log('\n🎉 Sample students successfully added to Student collection!');
    console.log('📝 The "Enroll Students" modal should now show students from Student collection.');
    console.log('\n🔍 Next Steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Start the frontend server: npm run dev');
    console.log('   3. Open "Enroll Students" modal');
    console.log('   4. Verify students are displayed from Student collection');
    console.log('   5. Test search functionality');
  } else {
    console.log('\n❌ Some operations failed. Please check the errors above.');
  }
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
}

// Run the script
main().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});


