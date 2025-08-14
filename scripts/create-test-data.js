import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import models
import Instructor from '../models/instructor-model.js';
import Student from '../models/student-model.js';
import LiveSession from '../models/liveSession.model.js';

// Test data
const testInstructors = [
  {
    full_name: "Dr. Sarah Johnson",
    email: "sarah.johnson@test.com",
    password: "password123",
    phone_number: "+1234567890",
    experience: {
      years: 8,
      description: "Expert in AI and Machine Learning with 8 years of teaching experience"
    },
    qualifications: {
      education: [{
        degree: "Ph.D. in Computer Science",
        institution: "Stanford University",
        year: 2020,
        grade: "A+"
      }],
      certifications: [{
        name: "AWS Certified Solutions Architect",
        issuing_organization: "Amazon Web Services",
        issue_date: new Date("2022-01-15"),
        credential_id: "AWS-CSA-001"
      }, {
        name: "Google Cloud Professional",
        issuing_organization: "Google",
        issue_date: new Date("2022-06-20"),
        credential_id: "GCP-PRO-001"
      }],
      skills: ["Machine Learning", "Python", "TensorFlow", "AWS", "Google Cloud"]
    },
    is_active: true,
    email_verified: true
  },
  {
    full_name: "Prof. Michael Chen",
    email: "michael.chen@test.com",
    password: "password123",
    phone_number: "+1234567891",
    experience: {
      years: 12,
      description: "Senior Data Scientist with extensive experience in big data analytics"
    },
    qualifications: {
      education: [{
        degree: "M.S. in Data Science",
        institution: "MIT",
        year: 2019,
        grade: "A"
      }],
      certifications: [{
        name: "Microsoft Azure Data Scientist",
        issuing_organization: "Microsoft",
        issue_date: new Date("2021-03-10"),
        credential_id: "AZURE-DS-001"
      }, {
        name: "Tableau Certified Professional",
        issuing_organization: "Tableau",
        issue_date: new Date("2021-08-15"),
        credential_id: "TABLEAU-CP-001"
      }],
      skills: ["Data Science", "Python", "R", "Azure", "Tableau", "SQL"]
    },
    is_active: true,
    email_verified: true
  },
  {
    full_name: "Dr. Emily Rodriguez",
    email: "emily.rodriguez@test.com",
    password: "password123",
    phone_number: "+1234567892",
    experience: {
      years: 6,
      description: "Specialist in Natural Language Processing and Deep Learning"
    },
    qualifications: {
      education: [{
        degree: "Ph.D. in Artificial Intelligence",
        institution: "UC Berkeley",
        year: 2021,
        grade: "A+"
      }],
      certifications: [{
        name: "TensorFlow Developer Certificate",
        issuing_organization: "Google",
        issue_date: new Date("2022-09-05"),
        credential_id: "TF-DEV-001"
      }, {
        name: "PyTorch Certified",
        issuing_organization: "Facebook",
        issue_date: new Date("2022-11-12"),
        credential_id: "PT-CERT-001"
      }],
      skills: ["Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Python"]
    },
    is_active: true,
    email_verified: true
  }
];

const testStudents = [
  {
    full_name: "Alex Thompson",
    email: "alex.thompson@test.com",
    password: "password123",
    phone_numbers: ["+1234567893"],
    is_active: true,
    email_verified: true
  },
  {
    full_name: "Maria Garcia",
    email: "maria.garcia@test.com",
    password: "password123",
    phone_numbers: ["+1234567894"],
    is_active: true,
    email_verified: true
  },
  {
    full_name: "David Kim",
    email: "david.kim@test.com",
    password: "password123",
    phone_numbers: ["+1234567895"],
    is_active: true,
    email_verified: true
  },
  {
    full_name: "Lisa Wang",
    email: "lisa.wang@test.com",
    password: "password123",
    phone_numbers: ["+1234567896"],
    is_active: true,
    email_verified: true
  },
  {
    full_name: "James Wilson",
    email: "james.wilson@test.com",
    password: "password123",
    phone_numbers: ["+1234567897"],
    is_active: true,
    email_verified: true
  }
];

const testSessions = [
  {
    sessionTitle: "Introduction to Machine Learning",
    sessionNo: "ML-001",
    originalSessionNo: "ML-001",
    courseCategory: "AI and Data Science",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration: 90,
    status: "scheduled",
    dashboard: "AI-Dashboard-001",
    summary: {
      title: "ML Basics",
      description: "Learn the fundamentals of machine learning algorithms"
    }
  },
  {
    sessionTitle: "Deep Learning with Neural Networks",
    sessionNo: "DL-002",
    originalSessionNo: "DL-002",
    courseCategory: "AI and Data Science",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
    duration: 120,
    status: "scheduled",
    dashboard: "AI-Dashboard-002",
    summary: {
      title: "Neural Networks",
      description: "Advanced concepts in deep learning and neural networks"
    }
  },
  {
    sessionTitle: "Data Visualization Techniques",
    sessionNo: "DV-003",
    originalSessionNo: "DV-003",
    courseCategory: "AI and Data Science",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    duration: 75,
    status: "completed",
    dashboard: "AI-Dashboard-003",
    summary: {
      title: "Data Viz",
      description: "Creating compelling data visualizations"
    }
  },
  {
    sessionTitle: "Natural Language Processing",
    sessionNo: "NLP-004",
    originalSessionNo: "NLP-004",
    courseCategory: "AI and Data Science",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    duration: 105,
    status: "scheduled",
    dashboard: "AI-Dashboard-004",
    summary: {
      title: "NLP Fundamentals",
      description: "Understanding and processing human language with AI"
    }
  }
];

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus');
    console.log('✅ Connected to MongoDB');

    // Clear existing test data
    console.log('🗑️ Clearing existing test data...');
    await Instructor.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Student.deleteMany({ email: { $regex: /@test\.com$/ } });
    await LiveSession.deleteMany({ sessionNo: { $regex: /^(ML|DL|DV|NLP)-/ } });

    // Create instructors
    console.log('👨‍🏫 Creating test instructors...');
    const createdInstructors = [];
    for (const instructorData of testInstructors) {
      const hashedPassword = await bcrypt.hash(instructorData.password, 12);
      const instructor = new Instructor({
        ...instructorData,
        password: hashedPassword
      });
      const savedInstructor = await instructor.save();
      createdInstructors.push(savedInstructor);
      console.log(`✅ Created instructor: ${savedInstructor.full_name}`);
    }

    // Create students
    console.log('👨‍🎓 Creating test students...');
    const createdStudents = [];
    for (const studentData of testStudents) {
      const hashedPassword = await bcrypt.hash(studentData.password, 12);
      const student = new Student({
        ...studentData,
        password: hashedPassword
      });
      const savedStudent = await student.save();
      createdStudents.push(savedStudent);
      console.log(`✅ Created student: ${savedStudent.full_name}`);
    }

    // Create live sessions
    console.log('📹 Creating test live sessions...');
    for (let i = 0; i < testSessions.length; i++) {
      const sessionData = testSessions[i];
      const instructor = createdInstructors[i % createdInstructors.length];
      const students = createdStudents.slice(0, 3); // Assign first 3 students to each session

      const session = new LiveSession({
        ...sessionData,
        instructorId: instructor._id,
        students: students.map(s => s._id),
        grades: ["A", "B+", "A-"] // Add some sample grades
      });

      const savedSession = await session.save();
      console.log(`✅ Created session: ${savedSession.sessionTitle} with instructor ${instructor.full_name}`);
    }

    console.log('\n🎉 Test data creation completed successfully!');
    console.log(`📊 Created ${createdInstructors.length} instructors, ${createdStudents.length} students, and ${testSessions.length} live sessions`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestData();
