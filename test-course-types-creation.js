import axios from "axios";
import colors from "colors";

const BASE_URL = "http://localhost:8080/api/v1";
let authToken = "";

// Test configuration
const config = {
  auth: {
    email: "superadmin@medh.co",
    password: "Admin@123", // Use admin credentials for course creation
  },
};

// Sample course data for each type
const sampleCourses = {
  blended: {
    course_type: "blended",
    course_category: "Technology",
    course_subcategory: "Web Development",
    course_title: "Full Stack Web Development Blended Course",
    course_subtitle: "Master MERN Stack with Live Doubt Sessions",
    course_tag: "web-development-blended",
    slug: "full-stack-web-development-blended-course-" + Date.now(),
    course_description: {
      program_overview: "A comprehensive blended learning program combining self-paced content with live doubt resolution sessions.",
      benefits: "Learn at your own pace while getting expert guidance through live sessions.",
      learning_objectives: [
        "Master React.js and Node.js",
        "Build full-stack applications",
        "Understand database design"
      ],
      course_requirements: [
        "Basic HTML/CSS knowledge",
        "JavaScript fundamentals"
      ],
      target_audience: [
        "Aspiring web developers",
        "Career switchers"
      ]
    },
    course_level: "Intermediate",
    language: "English",
    course_image: "https://example.com/course-image.jpg",
    brochures: ["https://example.com/brochure.pdf"],
    status: "Published",
    tools_technologies: [
      {
        name: "React",
        category: "framework",
        description: "Frontend JavaScript framework"
      },
      {
        name: "Node.js",
        category: "platform",
        description: "Backend JavaScript runtime"
      }
    ],
    faqs: [
      {
        question: "What is included in the course?",
        answer: "Self-paced videos, assignments, and live doubt sessions."
      }
    ],
    // Blended-specific fields
    curriculum: [
      {
        id: "section1",
        title: "Introduction to Web Development",
        description: "Basic concepts and setup",
        order: 1,
        lessons: [
          {
            title: "Getting Started",
            description: "Environment setup",
            duration: 45,
            content_type: "video",
            content_url: "https://example.com/lesson1.mp4",
            is_preview: true,
            order: 1
          }
        ],
        resources: [
          {
            title: "Setup Guide",
            description: "Step by step setup instructions",
            fileUrl: "https://example.com/setup-guide.pdf",
            type: "pdf"
          }
        ],
        assignments: [
          {
            title: "Environment Setup",
            description: "Set up your development environment",
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            total_points: 10,
            instructions: "Follow the setup guide and submit screenshots"
          }
        ]
      }
    ],
    doubt_session_schedule: {
      days: ["Monday", "Wednesday", "Friday"],
      time: "18:00",
      duration: 60,
      timezone: "Asia/Kolkata",
      frequency: "weekly"
    },
    instructors: [], // Will be populated if instructor exists
    // Legacy-compatible pricing structure
    prices: [
      {
        currency: "INR",
        individual: 15000,
        batch: 12000,
        min_batch_size: 3,
        max_batch_size: 10,
        early_bird_discount: 10,
        group_discount: 15,
        is_active: true
      },
      {
        currency: "USD",
        individual: 200,
        batch: 160,
        min_batch_size: 3,
        max_batch_size: 10,
        early_bird_discount: 10,
        group_discount: 15,
        is_active: true
      }
    ],
    course_duration: "12 weeks",
    session_duration: "2 hours",
    prerequisites: ["Basic programming knowledge"],
    
    // Legacy compatibility fields
    no_of_Sessions: 24,
    category_type: "Paid",
    class_type: "Blended Courses",
    is_Certification: "Yes",
    is_Assignments: "Yes",
    is_Projects: "Yes",
    is_Quizes: "Yes",
    efforts_per_Week: "8-10 hours",
    min_hours_per_week: 8,
    max_hours_per_week: 10,
    isFree: false
  },

  live: {
    course_type: "live",
    course_category: "Technology",
    course_subcategory: "Data Science",
    course_title: "Live Data Science Bootcamp",
    course_subtitle: "Interactive Live Sessions with Industry Experts",
    course_tag: "data-science-live",
    slug: "live-data-science-bootcamp-" + Date.now(),
    course_description: {
      program_overview: "An intensive live bootcamp covering data science fundamentals to advanced machine learning.",
      benefits: "Real-time interaction with instructors and peers, immediate feedback, and hands-on projects.",
      learning_objectives: [
        "Master Python for data science",
        "Understand machine learning algorithms",
        "Build data visualization skills"
      ],
      course_requirements: [
        "Basic mathematics knowledge",
        "Computer literacy"
      ],
      target_audience: [
        "Data enthusiasts",
        "Professionals seeking career change"
      ]
    },
    course_level: "Beginner",
    language: "English",
    course_image: "https://example.com/data-science-course.jpg",
    brochures: ["https://example.com/data-science-brochure.pdf"],
    status: "Published",
    tools_technologies: [
      {
        name: "Python",
        category: "programming_language",
        description: "Primary programming language for data science"
      },
      {
        name: "Pandas",
        category: "library",
        description: "Data manipulation library"
      }
    ],
    faqs: [
      {
        question: "Are the sessions recorded?",
        answer: "Yes, all live sessions are recorded for later review."
      }
    ],
    // Live-specific fields
    course_schedule: {
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      end_date: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000), // 11 weeks from now
      session_days: ["Monday", "Wednesday", "Friday"],
      session_time: "19:00",
      timezone: "Asia/Kolkata"
    },
    total_sessions: 30,
    session_duration: 120, // 2 hours
    modules: [
      {
        title: "Python Fundamentals",
        description: "Introduction to Python programming",
        order: 1,
        sessions: [], // Empty sessions for testing
        resources: [
          {
            title: "Python Cheat Sheet",
            description: "Quick reference for Python syntax",
            file_url: "https://example.com/python-cheat-sheet.pdf",
            type: "pdf"
          }
        ]
      }
    ],
    instructors: [], // Will be populated if instructor exists
    max_students: 50,
    // Legacy-compatible pricing structure
    prices: [
      {
        currency: "INR",
        individual: 25000,
        batch: 20000,
        min_batch_size: 5,
        max_batch_size: 15,
        early_bird_discount: 20,
        group_discount: 15,
        is_active: true
      },
      {
        currency: "USD",
        individual: 330,
        batch: 265,
        min_batch_size: 5,
        max_batch_size: 15,
        early_bird_discount: 20,
        group_discount: 15,
        is_active: true
      }
    ],
    prerequisites: ["Basic computer skills"],
    certification: {
      is_certified: true,
      attendance_required: 80 // 80% attendance required
    },
    
    // Legacy compatibility fields
    no_of_Sessions: 30,
    category_type: "Live",
    class_type: "Live Courses",
    is_Certification: "Yes",
    is_Assignments: "Yes",
    is_Projects: "Yes",
    is_Quizes: "No",
    efforts_per_Week: "6-8 hours",
    min_hours_per_week: 6,
    max_hours_per_week: 8,
    isFree: false
  },

  free: {
    course_type: "free",
    course_category: "Technology",
    course_subcategory: "Programming",
    course_title: "Introduction to Programming - Free Course",
    course_subtitle: "Learn Programming Basics at Your Own Pace",
    course_tag: "intro-programming-free",
    slug: "introduction-to-programming-free-course-" + Date.now(),
    course_description: {
      program_overview: "A beginner-friendly introduction to programming concepts using multiple languages.",
      benefits: "Free access to quality programming education with lifetime access.",
      learning_objectives: [
        "Understand programming fundamentals",
        "Learn basic syntax",
        "Build simple programs"
      ],
      course_requirements: [
        "No prior experience required"
      ],
      target_audience: [
        "Complete beginners",
        "Students exploring programming"
      ]
    },
    course_level: "Beginner",
    language: "English",
    course_image: "https://example.com/programming-basics.jpg",
    brochures: ["https://example.com/programming-basics-brochure.pdf"],
    status: "Published",
    tools_technologies: [
      {
        name: "Python",
        category: "programming_language",
        description: "Beginner-friendly programming language"
      }
    ],
    faqs: [
      {
        question: "Is this course really free?",
        answer: "Yes, this course is completely free with no hidden charges."
      }
    ],
    // Free-specific fields
    estimated_duration: "4 weeks",
    lessons: [
      {
        title: "What is Programming?",
        description: "Introduction to programming concepts",
        content_type: "video",
        content: "https://example.com/intro-video.mp4",
        duration: 15,
        order: 1,
        is_preview: true
      },
      {
        title: "Setting Up Your Environment",
        description: "Installing necessary tools",
        content_type: "text",
        content: "Step-by-step guide to install Python and code editor...",
        order: 2,
        is_preview: false
      }
    ],
    resources: [
      {
        title: "Programming Glossary",
        description: "Common programming terms explained",
        url: "https://example.com/programming-glossary.pdf",
        type: "pdf"
      }
    ],
    access_type: "unlimited",
    prerequisites: [],
    target_skills: [
      "Basic programming logic",
      "Problem-solving skills"
    ],
    completion_certificate: {
      is_available: true,
      requirements: {
        min_lessons_completed: 100 // 100% completion required
      }
    },
    
    // Legacy compatibility fields
    no_of_Sessions: 0, // Free courses don't have live sessions
    category_type: "Free",
    class_type: "Self-Paced",
    is_Certification: "Yes",
    is_Assignments: "No",
    is_Projects: "No",
    is_Quizes: "No",
    efforts_per_Week: "2-3 hours",
    min_hours_per_week: 2,
    max_hours_per_week: 3,
    isFree: true,
    
    // No pricing for free courses
    prices: []
  }
};

const testCourseTypesCreation = async () => {
  console.log("\n🚀 Starting Course Types Creation Tests...\n".cyan);

  try {
    // First authenticate
    console.log("🔐 Authenticating...".yellow);
    await authenticate();

    // Test creating each course type
    console.log("\n📚 Testing Course Creation for All Types...".yellow);
    
    for (const [courseType, courseData] of Object.entries(sampleCourses)) {
      console.log(`\n📖 Creating ${courseType.toUpperCase()} course...`.blue);
      await createCourse(courseType, courseData);
    }

    console.log("\n✅ All course creation tests completed successfully!\n".green);
    
    // Test getting courses by type
    console.log("\n🔍 Testing Course Retrieval by Type...".yellow);
    for (const courseType of Object.keys(sampleCourses)) {
      await getCoursesByType(courseType);
    }

  } catch (error) {
    console.error("\n❌ Test failed:".red, error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      console.error("Status code:", error.response.status);
    }
  }
};

const authenticate = async () => {
  try {
    // Try to login with admin credentials
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: config.auth.email,
      password: config.auth.password,
    });
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("  ✓ Authentication successful".green);
      console.log(`    User: ${loginResponse.data.data.full_name} (${loginResponse.data.data.role})`.gray);
    } else {
      throw new Error("Authentication failed");
    }
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 401) {
      console.log("  ⚠️  Admin user not found, attempting to register...".yellow);
      
      // Try to register admin user
      try {
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
          email: config.auth.email,
          password: config.auth.password,
          full_name: "Admin User",
          role: "admin"
        });
        
        if (registerResponse.data.success) {
          authToken = registerResponse.data.data.access_token;
          console.log("  ✓ Admin user registered and authenticated".green);
        }
      } catch (registerError) {
        console.log("Registration error details:", JSON.stringify(registerError.response?.data, null, 2));
        throw new Error(`Failed to register admin user: ${registerError.message}`);
      }
    } else {
      throw error;
    }
  }
};

const createCourse = async (courseType, courseData) => {
  try {
    const headers = { 
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(`${BASE_URL}/tcourse`, courseData, { headers });
    
    if (response.data.success) {
      console.log(`  ✓ ${courseType.toUpperCase()} course created successfully`.green);
      console.log(`    Course ID: ${response.data.data._id}`.gray);
      console.log(`    Title: ${response.data.data.course_title}`.gray);
      
      // Store the created course ID for potential cleanup or further testing
      sampleCourses[courseType].createdId = response.data.data._id;
    } else {
      throw new Error(`Failed to create ${courseType} course`);
    }
  } catch (error) {
    console.log(`  ❌ Failed to create ${courseType.toUpperCase()} course`.red);
    
    if (error.response?.data) {
      console.log(`    Error: ${JSON.stringify(error.response.data, null, 2)}`.red);
    }
    throw error;
  }
};

const getCoursesByType = async (courseType) => {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    const response = await axios.get(`${BASE_URL}/tcourse/${courseType}`, { headers });
    
    if (response.data.success) {
      console.log(`  ✓ Retrieved ${courseType.toUpperCase()} courses`.green);
      console.log(`    Found ${response.data.count} courses`.gray);
      
      if (response.data.sources) {
        console.log(`    New model: ${response.data.sources.new_model}, Legacy: ${response.data.sources.legacy_model}`.gray);
      }
    }
  } catch (error) {
    console.log(`  ❌ Failed to retrieve ${courseType.toUpperCase()} courses`.red);
    if (error.response?.data) {
      console.log(`    Error: ${JSON.stringify(error.response.data, null, 2)}`.red);
    }
  }
};

const logSuccess = (endpoint, response) => {
  console.log(`  ✓ ${endpoint}`.green);
  if (process.env.DEBUG === 'true') {
    console.log("    Response:", JSON.stringify(response.data, null, 2));
  }
};

// Additional helper function to test course by ID
const testGetCourseById = async (courseType, courseId) => {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    const response = await axios.get(`${BASE_URL}/tcourse/${courseType}/${courseId}`, { headers });
    
    if (response.data.success) {
      console.log(`  ✓ Retrieved specific ${courseType.toUpperCase()} course by ID`.green);
      return response.data.data;
    }
  } catch (error) {
    console.log(`  ❌ Failed to retrieve ${courseType.toUpperCase()} course by ID`.red);
    throw error;
  }
};

// Cleanup function (optional)
const cleanupCreatedCourses = async () => {
  console.log("\n🧹 Cleaning up created test courses...".yellow);
  
  for (const [courseType, courseData] of Object.entries(sampleCourses)) {
    if (courseData.createdId) {
      try {
        const headers = { Authorization: `Bearer ${authToken}` };
        await axios.delete(`${BASE_URL}/tcourse/${courseType}/${courseData.createdId}`, { headers });
        console.log(`  ✓ Deleted ${courseType.toUpperCase()} course`.green);
      } catch (error) {
        console.log(`  ⚠️  Could not delete ${courseType.toUpperCase()} course: ${error.message}`.yellow);
      }
    }
  }
};

// Export for potential use in other tests
export { 
  testCourseTypesCreation, 
  sampleCourses, 
  authenticate, 
  createCourse, 
  getCoursesByType,
  testGetCourseById,
  cleanupCreatedCourses 
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCourseTypesCreation();
} 