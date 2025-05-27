import axios from "axios";
import colors from "colors";

const BASE_URL = "http://localhost:8080/api/v1";
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MDA5MjgxOGM0MTNlMDQ0MmJmMTBkZCIsImVtYWlsIjoic3VwZXJhZG1pbkBtZWRoLmNvIiwicm9sZSI6WyJhZG1pbiJdLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ4MzMxMTY5LCJleHAiOjE3NDg0MTc1Njl9.JitaVqfeSs5vsz5Zt_HgDhhqO7UxarIKTEs4aaB8yxc";

// Simulate transformation function
const transformCourseData = (legacyCourse, courseType) => {
  return {
    course_type: courseType,
    course_category: legacyCourse.course_category,
    course_subcategory: legacyCourse.course_subcategory || '',
    course_title: legacyCourse.course_title,
    course_subtitle: legacyCourse.course_subtitle || '',
    course_tag: legacyCourse.course_tag || '',
    slug: legacyCourse.course_title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
    course_description: {
      program_overview: (legacyCourse.course_description && typeof legacyCourse.course_description === 'object') 
        ? (legacyCourse.course_description.program_overview || 'Course description')
        : (legacyCourse.course_description || 'Course description'),
      benefits: (legacyCourse.course_description && typeof legacyCourse.course_description === 'object')
        ? (legacyCourse.course_description.benefits || 'Learn new skills and advance your career')
        : 'Learn new skills and advance your career',
      learning_objectives: (legacyCourse.course_description && typeof legacyCourse.course_description === 'object')
        ? (legacyCourse.course_description.learning_objectives || [])
        : [],
      course_requirements: (legacyCourse.course_description && typeof legacyCourse.course_description === 'object')
        ? (legacyCourse.course_description.course_requirements || [])
        : [],
      target_audience: (legacyCourse.course_description && typeof legacyCourse.course_description === 'object')
        ? (legacyCourse.course_description.target_audience || [])
        : []
    },
    course_level: legacyCourse.course_level || 'Beginner',
    language: legacyCourse.language || 'English',
    course_image: legacyCourse.course_image || 'https://via.placeholder.com/400x300',
    course_grade: legacyCourse.course_grade || '',
    brochures: Array.isArray(legacyCourse.brochures) ? legacyCourse.brochures : [],
    status: 'Published',
    tools_technologies: Array.isArray(legacyCourse.tools_technologies) ? legacyCourse.tools_technologies : [],
    faqs: Array.isArray(legacyCourse.faqs) ? legacyCourse.faqs : [],
    prices: Array.isArray(legacyCourse.prices) ? legacyCourse.prices : [],
    subtitle_languages: Array.isArray(legacyCourse.subtitle_languages) ? legacyCourse.subtitle_languages : [],
    no_of_Sessions: typeof legacyCourse.no_of_Sessions === 'number' ? legacyCourse.no_of_Sessions : 0,
    course_duration: legacyCourse.course_duration || '',
    session_duration: legacyCourse.session_duration || '',
    category_type: legacyCourse.category_type || '',
    class_type: legacyCourse.class_type || '',
    isFree: Boolean(legacyCourse.isFree),
    _source: 'legacy_model',
    course_schedule: {
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000),
      session_days: ["Monday", "Wednesday", "Friday"],
      session_time: "18:00",
      timezone: "Asia/Kolkata"
    },
    total_sessions: 12,
    session_duration: 120,
    modules: [{
      title: 'Module 1',
      description: 'Course module - Introduction and overview',
      order: 1,
      sessions: [{
        title: 'Introduction Session',
        description: 'Course introduction and overview',
        order: 1,
        duration: 120,
        instructor: '680092818c413e0442bf10dd',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }],
      resources: []
    }],
    max_students: 50,
    instructors: [],
    prerequisites: [],
    certification: {
      is_certified: false,
      attendance_required: 80
    }
  };
};

const testCourseCreation = async () => {
  console.log("🧪 Testing Course Creation with NULL values...".yellow);
  
  // Simulate a problematic legacy course with null values
  const problematicLegacyCourse = {
    course_title: "Test Personality Development with Nulls",
    course_category: "Personality Development",
    course_description: null, // This is the problem!
    curriculum: null,
    brochures: null,
    tools_technologies: null,
    faqs: null,
    prices: null,
    subtitle_languages: null,
    category_type: "Live",
    class_type: "Live Courses"
  };

  const transformedCourse = transformCourseData(problematicLegacyCourse, 'live');

  try {
    const headers = { 
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    console.log("📤 Sending request to /api/v1/tcourse...".blue);
    console.log("📋 Transformed course:", JSON.stringify(transformedCourse, null, 2));

    const response = await axios.post(`${BASE_URL}/tcourse`, transformedCourse, { 
      headers,
      timeout: 30000
    });
    
    console.log("✅ Success! Course created with null handling".green);
    console.log("📨 Response:", JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log("❌ Error occurred:".red);
    console.log("Status:", error.response?.status);
    console.log("Status Text:", error.response?.statusText);
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('html')) {
      const match = error.response.data.match(/>([^<]+validation failed[^<]*)</);
      if (match) {
        console.log("Validation Error:", match[1]);
      } else {
        console.log("HTML Response - parsing for errors...");
      }
    } else {
      console.log("Response Data:", JSON.stringify(error.response?.data, null, 2));
    }
    console.log("Full Error:", error.message);
  }
};

testCourseCreation(); 