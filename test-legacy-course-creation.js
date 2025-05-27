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

// Sample course data for each type using legacy structure
const legacyCourses = {
  blended: {
    course_category: "Technology",
    course_subcategory: "Web Development",
    course_title: "Full Stack Web Development Blended Course",
    course_subtitle: "Master MERN Stack with Live Doubt Sessions",
    course_tag: "web-development-blended",
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
    
    // Legacy specific fields
    category_type: "Paid",
    class_type: "Blended Courses",
    no_of_Sessions: 24,
    course_duration: "12 weeks",
    session_duration: "2 hours",
    is_Certification: "Yes",
    is_Assignments: "Yes",
    is_Projects: "Yes",
    is_Quizes: "Yes",
    
    prices: [
      {
        currency: "INR",
        individual: 15000,
        batch: 12000,
        min_batch_size: 5,
        max_batch_size: 15,
        early_bird_discount: 10,
        group_discount: 15,
        is_active: true
      }
    ],
    
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
        answer: "Self-paced videos, assignments, live doubt sessions, and projects."
      }
    ],
    
    curriculum: [
      {
        weekTitle: "Week 1: Introduction to Web Development",
        weekDescription: "Basic concepts and environment setup",
        lessons: [
          {
            title: "Getting Started with Web Development",
            description: "Overview of web development concepts",
            duration: 45,
            content_type: "video",
            url: "https://example.com/lesson1.mp4",
            is_preview: true
          }
        ]
      }
    ]
  },

  live: {
    course_category: "Technology", 
    course_subcategory: "Data Science",
    course_title: "Live Data Science Bootcamp",
    course_subtitle: "Interactive Live Sessions with Industry Experts",
    course_tag: "data-science-live",
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
    
    // Legacy specific fields
    category_type: "Live",
    class_type: "Live Courses",
    no_of_Sessions: 30,
    course_duration: "10 weeks",
    session_duration: "2 hours",
    is_Certification: "Yes",
    is_Assignments: "Yes",
    is_Projects: "Yes",
    is_Quizes: "Yes",
    
    prices: [
      {
        currency: "INR",
        individual: 25000,
        batch: 20000,
        min_batch_size: 8,
        max_batch_size: 20,
        early_bird_discount: 15,
        group_discount: 20,
        is_active: true
      }
    ],
    
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
    ]
  },

  free: {
    course_category: "Technology",
    course_subcategory: "Programming",
    course_title: "Introduction to Programming - Free Course",
    course_subtitle: "Learn Programming Basics at Your Own Pace",
    course_tag: "intro-programming-free",
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
    
    // Legacy specific fields
    category_type: "Free",
    class_type: "Self-Paced",
    isFree: true,
    no_of_Sessions: 10,
    course_duration: "4 weeks",
    session_duration: "1 hour",
    is_Certification: "Yes",
    is_Assignments: "No",
    is_Projects: "No", 
    is_Quizes: "Yes",
    
    prices: [], // Empty for free course
    
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
    
    curriculum: [
      {
        weekTitle: "Week 1: What is Programming?",
        weekDescription: "Introduction to programming concepts",
        lessons: [
          {
            title: "Programming Fundamentals",
            description: "Basic programming concepts and terminology",
            duration: 30,
            content_type: "video",
            url: "https://example.com/intro-video.mp4",
            is_preview: true
          }
        ]
      }
    ]
  }
};

const testLegacyCourseCreation = async () => {
  console.log("\n🚀 Starting Legacy Course Creation Tests...\n".cyan);

  try {
    // First authenticate
    console.log("🔐 Authenticating...".yellow);
    await authenticate();

    // Test creating each course type using legacy structure
    console.log("\n📚 Testing Legacy Course Creation for All Types...".yellow);
    
    for (const [courseType, courseData] of Object.entries(legacyCourses)) {
      console.log(`\n📖 Creating ${courseType.toUpperCase()} course using legacy structure...`.blue);
      await createLegacyCourse(courseType, courseData);
    }

    console.log("\n✅ All legacy course creation tests completed successfully!\n".green);
    
    // Test getting courses
    console.log("\n🔍 Testing Course Retrieval...".yellow);
    await getAllCourses();

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
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

const createLegacyCourse = async (courseType, courseData) => {
  try {
    const headers = { 
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Add unique identifier to avoid slug conflicts
    const courseDataWithSlug = {
      ...courseData,
      course_title: `${courseData.course_title} ${Date.now()}`,
      course_tag: `${courseData.course_tag}-${Date.now()}`
    };

    console.log(`    Creating: ${courseDataWithSlug.course_title}`.gray);
    
    const response = await axios.post(`${BASE_URL}/courses/create`, courseDataWithSlug, { headers });
    
    if (response.data.success) {
      console.log(`  ✓ ${courseType.toUpperCase()} course created successfully`.green);
      console.log(`    Course ID: ${response.data.data._id}`.gray);
      console.log(`    Category Type: ${response.data.data.category_type}`.gray);
      console.log(`    Class Type: ${response.data.data.class_type}`.gray);
      
      // Store the created course ID for potential cleanup
      legacyCourses[courseType].createdId = response.data.data._id;
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

const getAllCourses = async () => {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    const response = await axios.get(`${BASE_URL}/courses/get`, { headers });
    
    if (response.data.success) {
      console.log(`  ✓ Retrieved all courses`.green);
      console.log(`    Found ${response.data.data.length} total courses`.gray);
      
      // Group by class_type
      const coursesByType = response.data.data.reduce((acc, course) => {
        const type = course.class_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      console.log("    Courses by type:".gray);
      Object.entries(coursesByType).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`.gray);
      });
    }
  } catch (error) {
    console.log(`  ❌ Failed to retrieve courses`.red);
    if (error.response?.data) {
      console.log(`    Error: ${JSON.stringify(error.response.data, null, 2)}`.red);
    }
  }
};

// Cleanup function (optional)
const cleanupCreatedCourses = async () => {
  console.log("\n🧹 Cleaning up created test courses...".yellow);
  
  for (const [courseType, courseData] of Object.entries(legacyCourses)) {
    if (courseData.createdId) {
      try {
        const headers = { Authorization: `Bearer ${authToken}` };
        await axios.delete(`${BASE_URL}/courses/${courseData.createdId}`, { headers });
        console.log(`  ✓ Deleted ${courseType.toUpperCase()} course`.green);
      } catch (error) {
        console.log(`  ⚠️  Could not delete ${courseType.toUpperCase()} course: ${error.message}`.yellow);
      }
    }
  }
};

// Export for potential use in other tests
export { 
  testLegacyCourseCreation, 
  legacyCourses, 
  authenticate, 
  createLegacyCourse, 
  getAllCourses,
  cleanupCreatedCourses 
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testLegacyCourseCreation();
} 