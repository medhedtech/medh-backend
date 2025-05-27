import axios from "axios";
import colors from "colors";

const BASE_URL = "http://localhost:8080/api/v1";
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MDA5MjgxOGM0MTNlMDQ0MmJmMTBkZCIsImVtYWlsIjoic3VwZXJhZG1pbkBtZWRoLmNvIiwicm9sZSI6WyJhZG1pbiJdLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ4MzMxODQxLCJleHAiOjE3NDg0MTgyNDF9.8775Nw5HG9j8_Pei7GZtAFtynt1h8DJ7ULX-POcWFSM";

const debugFailedCourse = async () => {
  console.log("🔍 Debugging Failed Course...".yellow);
  
  try {
    // First, get the exact failed course data
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/courses/get`, { headers });
    
    const failedCourse = response.data.data.find(course => course._id === "67bd596b8a56e7688dd02274");
    
    if (!failedCourse) {
      console.log("❌ Failed course not found".red);
      return;
    }
    
    console.log("📋 Original course data:".blue);
    console.log(JSON.stringify(failedCourse, null, 2));
    
    // Transform using our migration logic
    const transformedCourse = {
      course_type: "live", // Based on category_type: "Live"
      course_category: failedCourse.course_category,
      course_subcategory: failedCourse.course_subcategory || '',
      course_title: failedCourse.course_title + " - Debug Test",
      course_subtitle: failedCourse.course_subtitle || '',
      course_tag: failedCourse.course_tag || '',
      slug: "debug-test-" + Date.now(),
      course_description: {
        program_overview: (failedCourse.course_description && typeof failedCourse.course_description === 'object') 
          ? (failedCourse.course_description.program_overview || 'Course description')
          : (failedCourse.course_description || 'Course description'),
        benefits: (failedCourse.course_description && typeof failedCourse.course_description === 'object')
          ? (failedCourse.course_description.benefits || 'Learn new skills and advance your career')
          : 'Learn new skills and advance your career',
        learning_objectives: (failedCourse.course_description && typeof failedCourse.course_description === 'object')
          ? (failedCourse.course_description.learning_objectives || [])
          : [],
        course_requirements: (failedCourse.course_description && typeof failedCourse.course_description === 'object')
          ? (failedCourse.course_description.course_requirements || [])
          : [],
        target_audience: (failedCourse.course_description && typeof failedCourse.course_description === 'object')
          ? (failedCourse.course_description.target_audience || [])
          : []
      },
      course_level: failedCourse.course_level || 'Beginner',
      language: failedCourse.language || 'English',
      course_image: failedCourse.course_image || 'https://via.placeholder.com/400x300',
      course_grade: failedCourse.course_grade || '',
      brochures: Array.isArray(failedCourse.brochures) ? failedCourse.brochures : [],
      status: failedCourse.status || 'Published',
      tools_technologies: Array.isArray(failedCourse.tools_technologies) ? failedCourse.tools_technologies : [],
      faqs: Array.isArray(failedCourse.faqs) ? failedCourse.faqs : [],
             prices: Array.isArray(failedCourse.prices) ? 
         failedCourse.prices.filter(price => 
           price.currency && ['USD', 'EUR', 'INR', 'GBP', 'AUD', 'CAD'].includes(price.currency.toUpperCase())
         ) : [],
      subtitle_languages: Array.isArray(failedCourse.subtitle_languages) ? failedCourse.subtitle_languages : [],
      no_of_Sessions: typeof failedCourse.no_of_Sessions === 'number' ? failedCourse.no_of_Sessions : 0,
      course_duration: failedCourse.course_duration || '',
      session_duration: failedCourse.session_duration || '',
      category_type: failedCourse.category_type || '',
      class_type: failedCourse.class_type || '',
      isFree: Boolean(failedCourse.isFree),
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
    
    console.log("\n📤 Transformed course data:".blue);
    console.log(JSON.stringify(transformedCourse, null, 2));
    
    // Try to create the course
    console.log("\n🚀 Attempting to create course...".yellow);
    const createResponse = await axios.post(`${BASE_URL}/tcourse`, transformedCourse, { 
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log("✅ Success! Course created".green);
    console.log("📨 Response:", JSON.stringify(createResponse.data, null, 2));
    
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
        // Try to extract any error from HTML
        const errorMatch = error.response.data.match(/>Error: ([^<]+)</);
        if (errorMatch) {
          console.log("Extracted Error:", errorMatch[1]);
        }
      }
    } else {
      console.log("Response Data:", JSON.stringify(error.response?.data, null, 2));
    }
    console.log("Full Error:", error.message);
  }
};

debugFailedCourse(); 