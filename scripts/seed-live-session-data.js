import mongoose from 'mongoose';
import Student from '../models/student-model.js';
import Instructor from '../models/instructor-model.js';
import Grade from '../models/grade-model.js';
import Dashboard from '../models/dashboard.model.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medh';

async function seedLiveSessionData() {
  try {
    console.log('🌱 Seeding Live Session Data...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

         // Step 1: Create sample grades
     console.log('1. Creating sample grades...');
           const grades = [
        {
          name: 'Preschool',
          description: 'Early childhood education level',
          academicInfo: { gradeLevel: 'preschool' },
          metadata: { difficultyLevel: 'beginner' }
        },
        {
          name: 'Grade 1-2',
          description: 'Elementary level for grades 1-2',
          academicInfo: { gradeLevel: 'primary' },
          metadata: { difficultyLevel: 'elementary' }
        },
        {
          name: 'Grade 3-4',
          description: 'Elementary level for grades 3-4',
          academicInfo: { gradeLevel: 'primary' },
          metadata: { difficultyLevel: 'elementary' }
        },
        {
          name: 'Grade 5-6',
          description: 'Middle level for grades 5-6',
          academicInfo: { gradeLevel: 'middle' },
          metadata: { difficultyLevel: 'intermediate' }
        },
        {
          name: 'Grade 7-8',
          description: 'Middle level for grades 7-8',
          academicInfo: { gradeLevel: 'middle' },
          metadata: { difficultyLevel: 'intermediate' }
        },
        {
          name: 'Grade 9-10',
          description: 'High school level for grades 9-10',
          academicInfo: { gradeLevel: 'high' },
          metadata: { difficultyLevel: 'advanced' }
        },
        {
          name: 'Grade 11-12',
          description: 'High school level for grades 11-12',
          academicInfo: { gradeLevel: 'high' },
          metadata: { difficultyLevel: 'advanced' }
        },
        {
          name: 'Foundation Certificate',
          description: 'Foundation level certification',
          academicInfo: { gradeLevel: 'certificate' },
          metadata: { difficultyLevel: 'foundation' }
        },
        {
          name: 'Advance Certificate',
          description: 'Advanced level certification',
          academicInfo: { gradeLevel: 'certificate' },
          metadata: { difficultyLevel: 'advanced' }
        },
        {
          name: 'Executive Diploma',
          description: 'Executive level diploma program',
          academicInfo: { gradeLevel: 'diploma' },
          metadata: { difficultyLevel: 'executive' }
        },
        {
          name: 'UG - Graduate - Professionals',
          description: 'University and professional level',
          academicInfo: { gradeLevel: 'university' },
          metadata: { difficultyLevel: 'expert' }
        }
      ];

    for (const gradeData of grades) {
      const existingGrade = await Grade.findOne({ name: gradeData.name });
      if (!existingGrade) {
        await Grade.create(gradeData);
        console.log(`   ✅ Created grade: ${gradeData.name}`);
      } else {
        console.log(`   ⏭️  Grade already exists: ${gradeData.name}`);
      }
    }

    // Step 2: Create sample students
    console.log('\n2. Creating sample students...');
    const students = [
      {
        full_name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        age: 15,
        course_name: 'AI and Data Science',
        status: 'Active'
      },
      {
        full_name: 'Bob Smith',
        email: 'bob.smith@example.com',
        age: 16,
        course_name: 'Web Development',
        status: 'Active'
      },
      {
        full_name: 'Carol Davis',
        email: 'carol.davis@example.com',
        age: 17,
        course_name: 'Business Analytics',
        status: 'Active'
      },
      {
        full_name: 'David Wilson',
        email: 'david.wilson@example.com',
        age: 18,
        course_name: 'AI and Data Science',
        status: 'Active'
      },
      {
        full_name: 'Eva Brown',
        email: 'eva.brown@example.com',
        age: 19,
        course_name: 'Web Development',
        status: 'Active'
      }
    ];

    for (const studentData of students) {
      const existingStudent = await Student.findOne({ email: studentData.email });
      if (!existingStudent) {
        await Student.create(studentData);
        console.log(`   ✅ Created student: ${studentData.full_name}`);
      } else {
        console.log(`   ⏭️  Student already exists: ${studentData.full_name}`);
      }
    }

    // Step 3: Create sample instructors
    console.log('\n3. Creating sample instructors...');
    const instructors = [
      {
        full_name: 'Dr. Sarah Chen',
        email: 'sarah.chen@medh.co',
        phone_number: '+1234567890',
        domain: 'AI and Machine Learning',
        status: 'Active'
      },
      {
        full_name: 'Prof. Michael Rodriguez',
        email: 'michael.rodriguez@medh.co',
        phone_number: '+1234567891',
        domain: 'Web Development',
        status: 'Active'
      },
      {
        full_name: 'Dr. Emily Thompson',
        email: 'emily.thompson@medh.co',
        phone_number: '+1234567892',
        domain: 'Business Analytics',
        status: 'Active'
      },
      {
        full_name: 'Prof. James Lee',
        email: 'james.lee@medh.co',
        phone_number: '+1234567893',
        domain: 'Data Science',
        status: 'Active'
      }
    ];

    for (const instructorData of instructors) {
      const existingInstructor = await Instructor.findOne({ email: instructorData.email });
      if (!existingInstructor) {
        await Instructor.create(instructorData);
        console.log(`   ✅ Created instructor: ${instructorData.full_name}`);
      } else {
        console.log(`   ⏭️  Instructor already exists: ${instructorData.full_name}`);
      }
    }

    // Step 4: Create sample dashboards
    console.log('\n4. Creating sample dashboards...');
    const dashboards = [
      {
        name: 'Instructor',
        type: 'instructor',
        description: 'Dashboard for instructors to manage courses and students',
        features: ['course-management', 'student-progress', 'assignments', 'analytics'],
        permissions: ['read', 'write']
      },
      {
        name: 'Student',
        type: 'student',
        description: 'Main dashboard for students to view courses and progress',
        features: ['course-progress', 'assignments', 'grades', 'calendar'],
        permissions: ['read']
      },
      {
        name: 'Admin',
        type: 'admin',
        description: 'Administrative dashboard for system management',
        features: ['user-management', 'course-management', 'analytics', 'reports'],
        permissions: ['read', 'write', 'delete', 'admin']
      }
    ];

    for (const dashboardData of dashboards) {
      const existingDashboard = await Dashboard.findOne({ name: dashboardData.name });
      if (!existingDashboard) {
        await Dashboard.create(dashboardData);
        console.log(`   ✅ Created dashboard: ${dashboardData.name}`);
      } else {
        console.log(`   ⏭️  Dashboard already exists: ${dashboardData.name}`);
      }
    }

    console.log('\n🎉 Live Session Data Seeding Completed!');
    console.log('\n📊 Summary:');
    console.log('   - Grades: Created/verified 7 grade levels');
    console.log('   - Students: Created/verified 5 sample students');
    console.log('   - Instructors: Created/verified 4 sample instructors');
    console.log('   - Dashboards: Created/verified 4 dashboard types');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seeding
seedLiveSessionData();
