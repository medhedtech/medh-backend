// Script to add sample instructor data to the instructor collection
import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

console.log('📚 Adding Sample Instructors to Database...');
console.log('==========================================');

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
    console.log('🔗 Connecting to MongoDB:', mongoUrl);
    
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

// Instructor Schema (matching the backend model)
const instructorSchema = new mongoose.Schema({
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
  domain: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    years: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      trim: true
    }
  },
  qualifications: {
    education: [{
      degree: String,
      institution: String,
      year: Number
    }],
    certifications: [{
      name: String,
      issuer: String,
      year: Number
    }],
    skills: [String]
  },
  bio: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  is_active: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Instructor = mongoose.model('Instructor', instructorSchema);

// Sample instructor data
const sampleInstructors = [
  {
    full_name: "Dr. Sarah Johnson",
    email: "sarah.johnson@medh.edu",
    phone_number: "+1-555-0101",
    domain: "Computer Science",
    experience: {
      years: 8,
      description: "Expert in Python, JavaScript, and React development"
    },
    qualifications: {
      education: [
        {
          degree: "Ph.D. in Computer Science",
          institution: "Stanford University",
          year: 2018
        },
        {
          degree: "M.S. in Software Engineering",
          institution: "MIT",
          year: 2015
        }
      ],
      certifications: [
        {
          name: "AWS Certified Solutions Architect",
          issuer: "Amazon Web Services",
          year: 2022
        },
        {
          name: "Google Cloud Professional Developer",
          issuer: "Google",
          year: 2021
        }
      ],
      skills: ["Python", "JavaScript", "React", "Node.js", "AWS", "MongoDB"]
    },
    bio: "Experienced software engineer and educator with expertise in full-stack development and cloud computing.",
    is_active: true,
    status: "active"
  },
  {
    full_name: "Prof. Michael Chen",
    email: "michael.chen@medh.edu",
    phone_number: "+1-555-0102",
    domain: "Data Science",
    experience: {
      years: 12,
      description: "Specialist in machine learning, data analysis, and statistical modeling"
    },
    qualifications: {
      education: [
        {
          degree: "Ph.D. in Statistics",
          institution: "Harvard University",
          year: 2016
        },
        {
          degree: "M.S. in Applied Mathematics",
          institution: "UC Berkeley",
          year: 2013
        }
      ],
      certifications: [
        {
          name: "TensorFlow Developer Certificate",
          issuer: "Google",
          year: 2023
        },
        {
          name: "Microsoft Certified: Azure Data Scientist Associate",
          issuer: "Microsoft",
          year: 2022
        }
      ],
      skills: ["Python", "R", "TensorFlow", "PyTorch", "SQL", "Tableau"]
    },
    bio: "Data science expert with extensive experience in machine learning and statistical analysis for business applications.",
    is_active: true,
    status: "active"
  },
  {
    full_name: "Ms. Emily Rodriguez",
    email: "emily.rodriguez@medh.edu",
    phone_number: "+1-555-0103",
    domain: "Web Development",
    experience: {
      years: 6,
      description: "Full-stack web developer specializing in modern JavaScript frameworks"
    },
    qualifications: {
      education: [
        {
          degree: "B.S. in Computer Science",
          institution: "University of California",
          year: 2019
        }
      ],
      certifications: [
        {
          name: "React Developer Certification",
          issuer: "Meta",
          year: 2023
        },
        {
          name: "Vue.js Developer Certification",
          issuer: "Vue.js",
          year: 2022
        }
      ],
      skills: ["JavaScript", "React", "Vue.js", "Node.js", "Express", "MongoDB"]
    },
    bio: "Passionate web developer with expertise in creating responsive and user-friendly web applications.",
    is_active: true,
    status: "active"
  },
  {
    full_name: "Dr. James Wilson",
    email: "james.wilson@medh.edu",
    phone_number: "+1-555-0104",
    domain: "Cybersecurity",
    experience: {
      years: 10,
      description: "Cybersecurity expert with focus on network security and ethical hacking"
    },
    qualifications: {
      education: [
        {
          degree: "Ph.D. in Cybersecurity",
          institution: "Carnegie Mellon University",
          year: 2017
        },
        {
          degree: "M.S. in Information Security",
          institution: "Georgia Tech",
          year: 2014
        }
      ],
      certifications: [
        {
          name: "Certified Information Systems Security Professional (CISSP)",
          issuer: "ISC²",
          year: 2021
        },
        {
          name: "Certified Ethical Hacker (CEH)",
          issuer: "EC-Council",
          year: 2020
        }
      ],
      skills: ["Network Security", "Penetration Testing", "Cryptography", "Linux", "Python"]
    },
    bio: "Cybersecurity professional with extensive experience in protecting digital assets and training future security experts.",
    is_active: true,
    status: "active"
  },
  {
    full_name: "Ms. Lisa Thompson",
    email: "lisa.thompson@medh.edu",
    phone_number: "+1-555-0105",
    domain: "Mobile Development",
    experience: {
      years: 7,
      description: "Mobile app developer specializing in iOS and Android development"
    },
    qualifications: {
      education: [
        {
          degree: "B.S. in Software Engineering",
          institution: "University of Michigan",
          year: 2018
        }
      ],
      certifications: [
        {
          name: "Apple Developer Certification",
          issuer: "Apple",
          year: 2023
        },
        {
          name: "Google Developer Certification",
          issuer: "Google",
          year: 2022
        }
      ],
      skills: ["Swift", "Kotlin", "React Native", "Flutter", "Firebase", "Xcode"]
    },
    bio: "Mobile development specialist with expertise in creating cross-platform applications and native mobile solutions.",
    is_active: true,
    status: "active"
  }
];

// Function to add sample instructors
async function addSampleInstructors() {
  try {
    console.log('\n📝 Adding sample instructors to database...');
    
    // Check if instructors already exist
    const existingCount = await Instructor.countDocuments();
    console.log(`📊 Existing instructors in database: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('⚠️  Instructors already exist in database. Skipping...');
      return;
    }
    
    // Insert sample instructors
    const result = await Instructor.insertMany(sampleInstructors);
    
    console.log(`✅ Successfully added ${result.length} instructors to database:`);
    
    result.forEach((instructor, index) => {
      console.log(`   ${index + 1}. ${instructor.full_name} (${instructor.email})`);
      console.log(`      - Domain: ${instructor.domain}`);
      console.log(`      - Experience: ${instructor.experience.years} years`);
      console.log(`      - Skills: ${instructor.qualifications.skills.join(', ')}`);
    });
    
    console.log('\n🎉 Sample instructors added successfully!');
    console.log('📝 You can now test the instructor dropdown in the frontend form.');
    
  } catch (error) {
    console.error('❌ Error adding sample instructors:', error.message);
    
    if (error.code === 11000) {
      console.log('⚠️  Some instructors already exist (duplicate email). Skipping duplicates...');
    }
  }
}

// Function to list all instructors
async function listInstructors() {
  try {
    console.log('\n📋 Listing all instructors in database...');
    
    const instructors = await Instructor.find({}).select('full_name email domain experience.years is_active status');
    
    if (instructors.length === 0) {
      console.log('📭 No instructors found in database');
    } else {
      console.log(`📊 Found ${instructors.length} instructors:`);
      
      instructors.forEach((instructor, index) => {
        console.log(`   ${index + 1}. ${instructor.full_name} (${instructor.email})`);
        console.log(`      - Domain: ${instructor.domain}`);
        console.log(`      - Experience: ${instructor.experience.years} years`);
        console.log(`      - Status: ${instructor.status} (Active: ${instructor.is_active})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing instructors:', error.message);
  }
}

// Main function
async function main() {
  const connected = await connectDB();
  
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  try {
    // Add sample instructors
    await addSampleInstructors();
    
    // List all instructors
    await listInstructors();
    
    console.log('\n✅ Script completed successfully!');
    console.log('\n🔍 Next Steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Test the API: node test-instructor-api.js');
    console.log('   3. Check the frontend form - instructor dropdown should now show data');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  addSampleInstructors,
  listInstructors,
  sampleInstructors
};
