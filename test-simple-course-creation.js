import axios from "axios";
import colors from "colors";

const BASE_URL = "http://localhost:8080/api/v1";
let authToken = "";

// Test configuration
const config = {
  auth: {
    email: "superadmin@medh.co",
    password: "Admin@123",
  },
};

// Minimal course data to test what's actually required
const minimalBlendedCourse = {
  course_type: "blended",
  course_category: "Technology",
  course_title: "Test Blended Course",
  course_description: {
    program_overview: "Test overview",
    benefits: "Test benefits"
  },
  course_level: "Beginner",
  course_image: "https://example.com/test.jpg",
  
  // Blended-specific required fields based on error message
  course_duration: "8 weeks",
  session_duration: "2 hours",
  curriculum: [
    {
      id: "section1",
      title: "Test Section",
      description: "Test description",
      order: 1,
      lessons: [
        {
          id: "lesson1",
          title: "Test Lesson",
          description: "Test lesson description",
          duration: 60,
          content_type: "video",
          content_url: "https://example.com/lesson.mp4",
          order: 1
        }
      ]
    }
  ],
  doubt_session_schedule: {
    frequency: "weekly"
  },
  certification: {
    is_certified: true
  },
  prices: {
    individual: 1000,
    group: 800,
    enterprise: 600
  }
};

const authenticate = async () => {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: config.auth.email,
      password: config.auth.password,
    });
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("  ✓ Authentication successful".green);
      return true;
    }
  } catch (error) {
    console.error("Authentication failed:", error.message);
    return false;
  }
};

const testMinimalCourseCreation = async () => {
  console.log("\n🧪 Testing Minimal Course Creation...\n".cyan);

  if (!(await authenticate())) {
    return;
  }

  try {
    console.log("📖 Creating minimal BLENDED course...".blue);
    
    const headers = { 
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    console.log("Request data:", JSON.stringify(minimalBlendedCourse, null, 2));

    const response = await axios.post(`${BASE_URL}/tcourse`, minimalBlendedCourse, { headers });
    
    if (response.data.success) {
      console.log("  ✓ Course created successfully".green);
      console.log(`    Course ID: ${response.data.data._id}`.gray);
    }
  } catch (error) {
    console.log("  ❌ Course creation failed".red);
    
    if (error.response?.data) {
      console.log(`    Status: ${error.response.status}`.red);
      console.log(`    Error: ${JSON.stringify(error.response.data, null, 2)}`.red);
    } else {
      console.log(`    Error: ${error.message}`.red);
    }
  }
};

// Run test
testMinimalCourseCreation(); 