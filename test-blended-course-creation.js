import axios from "axios";
import colors from "colors";

const BASE_URL = "http://localhost:8080/api/v1";
let authToken = "";

// Same transformation logic from migration script
const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
};

const normalizeStatus = (status) => {
  if (!status) return 'Draft';
  
  const normalized = status.toLowerCase();
  if (normalized === 'published' || normalized === 'active') return 'Published';
  if (normalized === 'upcoming') return 'Upcoming';
  if (normalized === 'draft') return 'Draft';
  return 'Draft';
};

const normalizeCategoryType = (categoryType) => {
  if (!categoryType) return 'Paid';
  
  const normalized = categoryType.toLowerCase();
  if (normalized === 'live') return 'Live';
  if (normalized === 'free') return 'Free';
  // Map 'pre-recorded', 'paid', 'hybrid', and others to 'Paid'
  return 'Paid';
};

const transformCurriculum = (curriculum) => {
  if (!curriculum || !Array.isArray(curriculum)) {
    return [{
      id: 'section1',
      title: 'Introduction',
      description: 'Course introduction and overview',
      order: 1,
      lessons: [{
        title: 'Getting Started',
        description: 'Course introduction',
        duration: 30,
        content_type: 'video',
        content_url: 'https://example.com/intro.mp4',
        is_preview: true,
        order: 1
      }],
      resources: [],
      assignments: []
    }];
  }
  
  return curriculum.map((section, index) => ({
    id: `section${index + 1}`,
    title: section.weekTitle || section.title || `Section ${index + 1}`,
    description: section.weekDescription || section.description || '',
    order: index + 1,
    lessons: (section.lessons || []).map((lesson, lessonIndex) => ({
      title: lesson.title || `Lesson ${lessonIndex + 1}`,
      description: lesson.description || '',
      duration: lesson.duration || 30,
      content_type: lesson.content_type || 'video',
      content_url: lesson.url || lesson.content_url || 'https://example.com/lesson.mp4',
      is_preview: lesson.is_preview || false,
      order: lessonIndex + 1
    })),
    resources: section.resources || [],
    assignments: section.assignments || []
  }));
};

const authenticate = async () => {
  console.log("🔐 Authenticating...".yellow);
  
  const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: "superadmin@medh.co",
    password: "Admin@123",
  });
  
  if (loginResponse.data.success) {
    authToken = loginResponse.data.data.access_token;
    console.log("  ✓ Authentication successful".green);
  } else {
    throw new Error("Authentication failed");
  }
};

const fetchBlendedCourseSample = async () => {
  console.log("📊 Fetching a sample blended course...".yellow);
  
  const headers = { Authorization: `Bearer ${authToken}` };
  const response = await axios.get(`${BASE_URL}/courses/get`, { headers });
  
  if (!response.data.success) {
    throw new Error("Failed to fetch courses");
  }
  
  const allCourses = response.data.data;
  const legacyCourses = allCourses.filter(course => 
    !course._source || course._source === 'legacy_model'
  );
  
  // Find a course that should be classified as blended
  const blendedCourse = legacyCourses.find(course => {
    const categoryType = course.category_type?.toLowerCase();
    const classType = course.class_type?.toLowerCase();
    
    return (categoryType === 'paid' || categoryType === 'pre-recorded' || 
            categoryType === 'hybrid' || classType?.includes('blended')) &&
           categoryType !== 'live' && !classType?.includes('live');
  });
  
  if (!blendedCourse) {
    throw new Error("No blended course found");
  }
  
  console.log(`Found blended course: "${blendedCourse.course_title}"`.green);
  console.log(`  category_type: ${blendedCourse.category_type}`);
  console.log(`  class_type: ${blendedCourse.class_type}`);
  
  return blendedCourse;
};

const transformBlendedCourse = (legacyCourse) => {
  console.log("\n🔄 Transforming course to blended format...".yellow);
  
  const baseTransformation = {
    course_type: 'blended',
    course_category: legacyCourse.course_category,
    course_subcategory: legacyCourse.course_subcategory || '',
    course_title: legacyCourse.course_title,
    course_subtitle: legacyCourse.course_subtitle || '',
    course_tag: legacyCourse.course_tag || '',
    slug: generateSlug(legacyCourse.course_title),
    course_description: {
      program_overview: legacyCourse.course_description?.program_overview || legacyCourse.course_description || 'Course description',
      benefits: legacyCourse.course_description?.benefits || 'Learn new skills and advance your career',
      learning_objectives: legacyCourse.course_description?.learning_objectives || [],
      course_requirements: legacyCourse.course_description?.course_requirements || [],
      target_audience: legacyCourse.course_description?.target_audience || []
    },
    course_level: legacyCourse.course_level || 'Beginner',
    language: legacyCourse.language || 'English',
    course_image: legacyCourse.course_image || 'https://via.placeholder.com/400x300',
    course_grade: legacyCourse.course_grade || '',
    brochures: legacyCourse.brochures || [],
    status: normalizeStatus(legacyCourse.status),
    tools_technologies: legacyCourse.tools_technologies || [],
    faqs: legacyCourse.faqs || [],
    
    // Filter out unsupported currencies (based on previous issue)
    prices: (legacyCourse.prices || []).filter(price => {
      const supportedCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];
      return supportedCurrencies.includes(price.currency);
    }),
    
    subtitle_languages: legacyCourse.subtitle_languages || [],
    no_of_Sessions: legacyCourse.no_of_Sessions || 0,
    course_duration: legacyCourse.course_duration || '',
    session_duration: typeof legacyCourse.session_duration === 'number' 
      ? `${legacyCourse.session_duration} minutes` 
      : (legacyCourse.session_duration || '120 minutes'),
    category_type: normalizeCategoryType(legacyCourse.category_type),
    class_type: legacyCourse.class_type,
    isFree: legacyCourse.isFree || false,
    assigned_instructor: legacyCourse.assigned_instructor,
    specifications: legacyCourse.specifications,
    unique_key: legacyCourse.unique_key,
    resource_pdfs: legacyCourse.resource_pdfs || [],
    bonus_modules: legacyCourse.bonus_modules || [],
    final_evaluation: legacyCourse.final_evaluation || {},
    efforts_per_Week: legacyCourse.efforts_per_Week || '',
    is_Certification: legacyCourse.is_Certification || 'No',
    is_Assignments: legacyCourse.is_Assignments || 'No',
    is_Projects: legacyCourse.is_Projects || 'No',
    is_Quizes: legacyCourse.is_Quizes || 'No',
    related_courses: legacyCourse.related_courses || [],
    min_hours_per_week: legacyCourse.min_hours_per_week,
    max_hours_per_week: legacyCourse.max_hours_per_week,
    _source: 'legacy_model'
  };

  // Blended-specific fields
  const blendedCourse = {
    ...baseTransformation,
    curriculum: transformCurriculum(legacyCourse.curriculum),
    doubt_session_schedule: {
      frequency: 'weekly',
      preferred_days: ['Monday', 'Wednesday', 'Friday'],
      preferred_time_slots: [{
        start_time: '18:00',
        end_time: '19:00',
        timezone: 'Asia/Kolkata'
      }]
    },
    certification: {
      is_certified: legacyCourse.is_Certification === 'Yes',
      certification_criteria: {
        min_assignments_score: 70,
        min_quizzes_score: 70,
        min_attendance: 80
      }
    }
  };
  
  console.log("✓ Course transformed".green);
  console.log(`  Course type: ${blendedCourse.course_type}`);
  console.log(`  Title: ${blendedCourse.course_title}`);
  console.log(`  Prices count: ${blendedCourse.prices.length}`);
  console.log(`  Curriculum sections: ${blendedCourse.curriculum.length}`);
  
  return blendedCourse;
};

const testBlendedCourseCreation = async (transformedCourse) => {
  console.log("\n🚀 Testing blended course creation...".yellow);
  
  const headers = { 
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log("📤 Sending POST request to /api/v1/tcourse...".gray);
    console.log("📋 Course data preview:".gray);
    console.log(`  - course_type: ${transformedCourse.course_type}`);
    console.log(`  - title: ${transformedCourse.course_title}`);
    console.log(`  - category: ${transformedCourse.course_category}`);
    console.log(`  - level: ${transformedCourse.course_level}`);
    
    const response = await axios.post(`${BASE_URL}/tcourse`, transformedCourse, { 
      headers,
      timeout: 45000
    });
    
    if (response.data.success) {
      console.log("✅ Blended course created successfully!".green);
      console.log(`  Course ID: ${response.data.data._id}`);
      console.log(`  Course Type: ${response.data.data.course_type}`);
      return response.data.data;
    } else {
      console.log("❌ Course creation failed".red);
      console.log("Response:", JSON.stringify(response.data, null, 2));
      throw new Error(`API returned success: false - ${response.data.message}`);
    }
  } catch (error) {
    console.log("❌ Request failed".red);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log("Response data:", JSON.stringify(error.response.data, null, 2));
      
      // Check if it's validation errors
      if (error.response.data && error.response.data.errors) {
        console.log("\n🔍 Validation errors detected:".yellow);
        error.response.data.errors.forEach((err, index) => {
          console.log(`  ${index + 1}. ${err.field}: ${err.message}`);
        });
      }
    } else {
      console.log("Error message:", error.message);
    }
    
    throw error;
  }
};

const main = async () => {
  try {
    await authenticate();
    const sampleCourse = await fetchBlendedCourseSample();
    const transformedCourse = transformBlendedCourse(sampleCourse);
    
    // Save the transformed data for debugging
    console.log("\n💾 Saving transformed course data to debug file...".gray);
    const fs = await import('fs');
    fs.writeFileSync('debug-blended-course.json', JSON.stringify(transformedCourse, null, 2));
    
    await testBlendedCourseCreation(transformedCourse);
    
  } catch (error) {
    console.error("\n❌ Test failed:".red, error.message);
  }
};

main(); 