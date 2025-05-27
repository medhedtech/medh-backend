import axios from "axios";
import colors from "colors";
import fs from "fs";
import { backupDatabase } from "./backup-database.js";

const BASE_URL = "http://localhost:8080/api/v1";
let authToken = "";

// Migration configuration
const config = {
  auth: {
    email: "superadmin@medh.co",
    password: "Admin@123",
  },
  migration: {
    batchSize: 10, // Process courses in batches
    dryRun: false, // Set to true for testing without actual migration
    preserveOriginal: true, // Keep legacy courses during migration
  }
};

// Course type classification rules
const classificationRules = {
  courseType: (course) => {
    const categoryType = course.category_type?.toLowerCase();
    const classType = course.class_type?.toLowerCase();
    
    // Free courses
    if (categoryType === 'free' || course.isFree === true) {
      return 'free';
    }
    
    // Live courses
    if (categoryType === 'live' || classType?.includes('live')) {
      return 'live';
    }
    
    // Blended courses (Paid, Pre-Recorded, Hybrid, etc.)
    if (categoryType === 'paid' || categoryType === 'pre-recorded' || 
        categoryType === 'hybrid' || classType?.includes('blended')) {
      return 'blended';
    }
    
    // Default to blended for unknown types
    console.warn(`⚠️  Unknown course type for "${course.course_title}": category_type=${categoryType}, class_type=${classType}. Defaulting to blended.`.yellow);
    return 'blended';
  }
};

const migrateLegacyToNew = async () => {
  console.log("\n🚀 Starting Legacy to New Course Types Migration...\n".cyan);

  try {
    // Step 1: Create backup
    if (!config.migration.dryRun) {
      console.log("📦 Creating database backup...".yellow);
      await backupDatabase();
      console.log("✅ Backup completed\n".green);
    } else {
      console.log("🧪 DRY RUN MODE - No backup needed\n".yellow);
    }

    // Step 2: Authenticate
    console.log("🔐 Authenticating...".yellow);
    await authenticate();

    // Step 3: Fetch legacy courses
    console.log("\n📊 Fetching legacy courses...".yellow);
    const legacyCourses = await fetchAllLegacyCourses();

    // Step 4: Analyze course distribution
    console.log("\n🔬 Analyzing course distribution...".yellow);
    const analysis = analyzeCourseDistribution(legacyCourses);
    displayAnalysis(analysis);

    // Step 5: Process migration
    console.log("\n⚡ Starting migration process...".yellow);
    const migrationResults = await processMigration(legacyCourses, analysis);

    // Step 6: Generate migration report
    console.log("\n📝 Generating migration report...".yellow);
    await generateMigrationReport(migrationResults, analysis);

    console.log("\n✅ Migration completed successfully!".green);
    console.log("📄 Check 'migration-results.json' for detailed results".blue);

  } catch (error) {
    console.error("\n❌ Migration failed:".red, error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

const authenticate = async () => {
  const maxRetries = 3;
  const timeout = 30000; // 30 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  🔄 Authentication attempt ${attempt}/${maxRetries}...`.gray);
      
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: config.auth.email,
        password: config.auth.password,
      }, {
        timeout: timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (loginResponse.data.success) {
        authToken = loginResponse.data.data.access_token;
        console.log("  ✓ Authentication successful".green);
        return;
      } else {
        throw new Error("Authentication failed - invalid credentials");
      }
    } catch (error) {
      console.log(`  ⚠️  Attempt ${attempt} failed: ${error.message}`.yellow);
      
      if (attempt === maxRetries) {
        throw new Error(`Authentication failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`  ⏳ Waiting ${delay/1000}s before retry...`.gray);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const fetchAllLegacyCourses = async () => {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  🔄 Fetching courses attempt ${attempt}/${maxRetries}...`.gray);
      
      const headers = { Authorization: `Bearer ${authToken}` };
      
      // Fetch all legacy courses (no limit)
      const response = await axios.get(`${BASE_URL}/courses/get`, { 
        headers,
        timeout: 120000 // 2 minutes for large dataset
      });
      
      if (response.data.success) {
        const allCourses = response.data.data;
        // Filter only actual legacy courses (not already migrated)
        const legacyCourses = allCourses.filter(course => 
          !course._source || course._source === 'legacy_model'
        );
        
        console.log(`  ✓ Fetched ${allCourses.length} total courses`.green);
        console.log(`  ✓ Found ${legacyCourses.length} legacy courses to migrate`.green);
        
        return legacyCourses;
      } else {
        throw new Error("Failed to fetch legacy courses");
      }
    } catch (error) {
      console.log(`  ⚠️  Fetch attempt ${attempt} failed: ${error.message}`.yellow);
      
      if (attempt === maxRetries) {
        console.error("  ❌ Failed to fetch legacy courses after all retries".red);
        throw error;
      }
      
      // Wait before retry
      const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
      console.log(`  ⏳ Waiting ${delay/1000}s before retry...`.gray);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const analyzeCourseDistribution = (courses) => {
  const analysis = {
    total: courses.length,
    byType: { blended: 0, live: 0, free: 0 },
    byCategoryType: {},
    byClassType: {},
    withoutCategoryType: 0,
    withPricing: 0,
    withCurriculum: 0,
    samples: { blended: null, live: null, free: null }
  };

  courses.forEach(course => {
    // Count by determined type
    const courseType = classificationRules.courseType(course);
    analysis.byType[courseType]++;
    
    // Store samples
    if (!analysis.samples[courseType]) {
      analysis.samples[courseType] = course;
    }
    
    // Count by category_type
    const categoryType = course.category_type || 'undefined';
    analysis.byCategoryType[categoryType] = (analysis.byCategoryType[categoryType] || 0) + 1;
    
    // Count by class_type
    const classType = course.class_type || 'undefined';
    analysis.byClassType[classType] = (analysis.byClassType[classType] || 0) + 1;
    
    // Count courses without category_type
    if (!course.category_type) {
      analysis.withoutCategoryType++;
    }
    
    // Count courses with pricing
    if (course.prices && course.prices.length > 0) {
      analysis.withPricing++;
    }
    
    // Count courses with curriculum
    if (course.curriculum && course.curriculum.length > 0) {
      analysis.withCurriculum++;
    }
  });

  return analysis;
};

const displayAnalysis = (analysis) => {
  console.log("\n📊 COURSE DISTRIBUTION ANALYSIS".cyan.bold);
  console.log("═".repeat(50).gray);
  
  console.log(`\n📈 Overview:`.yellow);
  console.log(`  • Total Legacy Courses: ${analysis.total}`.white);
  console.log(`  • Courses without category_type: ${analysis.withoutCategoryType}`.white);
  console.log(`  • Courses with pricing: ${analysis.withPricing}`.white);
  console.log(`  • Courses with curriculum: ${analysis.withCurriculum}`.white);
  
  console.log(`\n🎯 Migration Distribution:`.yellow);
  console.log(`  • Will become Blended: ${analysis.byType.blended}`.blue);
  console.log(`  • Will become Live: ${analysis.byType.live}`.green);
  console.log(`  • Will become Free: ${analysis.byType.free}`.cyan);
  
  console.log(`\n📋 By Category Type:`.yellow);
  Object.entries(analysis.byCategoryType).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count}`.white);
  });
  
  console.log(`\n🏫 By Class Type:`.yellow);
  Object.entries(analysis.byClassType).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count}`.white);
  });
};

const processMigration = async (courses, analysis) => {
  const results = {
    total: courses.length,
    processed: 0,
    successful: 0,
    failed: 0,
    byType: { blended: 0, live: 0, free: 0 },
    errors: [],
    migrated: []
  };

  console.log(`\n🔄 Processing ${courses.length} courses in batches of ${config.migration.batchSize}...`);

  // Process courses in batches
  for (let i = 0; i < courses.length; i += config.migration.batchSize) {
    const batch = courses.slice(i, i + config.migration.batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / config.migration.batchSize) + 1}/${Math.ceil(courses.length / config.migration.batchSize)} (${batch.length} courses)...`.blue);
    
    for (const course of batch) {
      try {
        results.processed++;
        const migratedCourse = await migrateSingleCourse(course);
        
        if (migratedCourse) {
          results.successful++;
          results.byType[migratedCourse.courseType]++;
          results.migrated.push({
            originalId: course._id,
            newId: migratedCourse.id,
            courseType: migratedCourse.courseType,
            title: course.course_title
          });
          
          console.log(`  ✓ ${course.course_title} → ${migratedCourse.courseType}`.green);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          courseId: course._id,
          title: course.course_title,
          error: error.message
        });
        
        console.log(`  ❌ Failed: ${course.course_title} - ${error.message}`.red);
      }
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
};

const migrateSingleCourse = async (legacyCourse) => {
  // Determine course type
  const courseType = classificationRules.courseType(legacyCourse);
  
  // Transform legacy course to new format
  const transformedCourse = transformCourseData(legacyCourse, courseType);
  
  if (config.migration.dryRun) {
    console.log(`  🧪 DRY RUN: Would create ${courseType} course: ${legacyCourse.course_title}`.yellow);
    return {
      id: 'dry-run-id',
      courseType,
      title: legacyCourse.course_title
    };
  }
  
  // Create new course
  const headers = { 
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const response = await axios.post(`${BASE_URL}/tcourse`, transformedCourse, { 
    headers,
    timeout: 45000 // 45 seconds for course creation
  });
  
  if (response.data.success) {
    return {
      id: response.data.data._id,
      courseType,
      title: legacyCourse.course_title
    };
  } else {
    throw new Error(`Failed to create course: ${response.data.message}`);
  }
};

const transformCourseData = (legacyCourse, courseType) => {
  // Enhanced course description handling
  const courseDescription = typeof legacyCourse.course_description === 'string' 
    ? legacyCourse.course_description 
    : legacyCourse.course_description?.program_overview || 'Course description';

  // Base transformation - preserve ALL existing fields properly
  const baseTransformation = {
    course_type: courseType,
    course_category: legacyCourse.course_category,
    course_subcategory: legacyCourse.course_subcategory || '',
    course_title: legacyCourse.course_title,
    course_subtitle: legacyCourse.course_subtitle || '',
    course_tag: legacyCourse.course_tag || '',
    slug: generateSlug(legacyCourse.course_title),
    course_description: {
      program_overview: courseDescription,
      benefits: legacyCourse.course_description?.benefits || 'Learn new skills and advance your career',
      learning_objectives: legacyCourse.course_description?.learning_objectives || [],
      course_requirements: legacyCourse.course_description?.course_requirements || [],
      target_audience: legacyCourse.course_description?.target_audience || []
    },
    course_level: legacyCourse.course_level || 'Beginner',
    language: legacyCourse.language || 'English',
    course_image: legacyCourse.course_image || 'https://via.placeholder.com/400x300',
    course_grade: legacyCourse.course_grade || '', // PRESERVE course_grade properly
    brochures: legacyCourse.brochures || [], // PRESERVE brochures
    status: normalizeStatus(legacyCourse.status),
    tools_technologies: legacyCourse.tools_technologies || [],
    faqs: legacyCourse.faqs || [],
    
    // Legacy compatibility fields (filter out unsupported currencies)
    prices: (legacyCourse.prices || []).filter(price => {
      const supportedCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];
      return price && price.currency && supportedCurrencies.includes(price.currency);
    }),
    subtitle_languages: legacyCourse.subtitle_languages || [],
    no_of_Sessions: legacyCourse.no_of_Sessions || 0, // PRESERVE session count
    course_duration: legacyCourse.course_duration || '',
    // PRESERVE original session_duration format
    session_duration: legacyCourse.session_duration || '120 minutes',
    category_type: normalizeCategoryType(legacyCourse.category_type),
    class_type: legacyCourse.class_type, // PRESERVE class_type exactly
    isFree: legacyCourse.isFree || false,
    assigned_instructor: legacyCourse.assigned_instructor, // PRESERVE instructor assignment
    specifications: legacyCourse.specifications,
    unique_key: legacyCourse.unique_key,
    resource_pdfs: legacyCourse.resource_pdfs || [],
    bonus_modules: legacyCourse.bonus_modules || [],
    final_evaluation: legacyCourse.final_evaluation || {
      has_final_exam: false,
      has_final_project: false,
      final_project: {
        evaluation_criteria: []
      }
    },
    efforts_per_Week: legacyCourse.efforts_per_Week || '', // PRESERVE efforts_per_Week
    // PRESERVE certification and assessment settings
    is_Certification: legacyCourse.is_Certification || 'No',
    is_Assignments: legacyCourse.is_Assignments || 'No',
    is_Projects: legacyCourse.is_Projects || 'No',
    is_Quizes: legacyCourse.is_Quizes || 'No',
    related_courses: legacyCourse.related_courses || [],
    // PRESERVE hours per week properly
    min_hours_per_week: legacyCourse.min_hours_per_week,
    max_hours_per_week: legacyCourse.max_hours_per_week,
    
    // Migration tracking
    _source: 'legacy_model'
  };

  // Type-specific transformations
  if (courseType === 'blended') {
    return {
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
  }
  
  if (courseType === 'live') {
    return {
      ...baseTransformation,
      course_schedule: {
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        end_date: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000), // 11 weeks from now
        session_days: ['Monday', 'Wednesday', 'Friday'],
        session_time: '18:00',
        timezone: 'Asia/Kolkata'
      },
      total_sessions: legacyCourse.no_of_Sessions || 12,
      // Preserve original session_duration (can be string or number)
      session_duration: legacyCourse.session_duration || 120,
      modules: transformToModules(legacyCourse.curriculum),
      // PRESERVE original curriculum structure for legacy compatibility
      curriculum: legacyCourse.curriculum || [],
      max_students: 50,
      instructors: legacyCourse.assigned_instructor ? [legacyCourse.assigned_instructor] : [],
      prerequisites: [],
      certification: {
        is_certified: legacyCourse.is_Certification === 'Yes',
        attendance_required: 80
      }
    };
  }
  
  if (courseType === 'free') {
    return {
      ...baseTransformation,
      estimated_duration: legacyCourse.course_duration || '4 weeks',
      lessons: transformToLessons(legacyCourse.curriculum),
      resources: [],
      access_type: 'unlimited',
      prerequisites: [],
      target_skills: [],
      completion_certificate: {
        is_available: legacyCourse.is_Certification === 'Yes',
        requirements: {
          min_lessons_completed: 100
        }
      }
    };
  }
  
  return baseTransformation;
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
    lessons: (section.lessons || []).length > 0 
      ? section.lessons.map((lesson, lessonIndex) => ({
          title: lesson.title || `Lesson ${lessonIndex + 1}`,
          description: lesson.description || '',
          duration: lesson.duration || 30,
          content_type: lesson.content_type || 'video',
          content_url: lesson.url || lesson.content_url || 'https://example.com/lesson.mp4',
          is_preview: lesson.is_preview || false,
          order: lessonIndex + 1
        }))
      : [{ // Create basic lesson structure from legacy topics
          title: section.weekTitle || `Lesson ${index + 1}`,
          description: section.weekDescription || `Content for ${section.weekTitle || 'this section'}`,
          duration: 30,
          content_type: 'video',
          content_url: 'https://example.com/lesson.mp4',
          is_preview: index === 0, // First section as preview
          order: 1
        }],
    resources: section.resources || [],
    assignments: section.assignments || [],
    // Preserve original legacy structure for reference
    _legacyData: {
      topics: section.topics || [],
      weekTitle: section.weekTitle,
      weekDescription: section.weekDescription,
      originalId: section._id
    }
  }));
};

const transformToModules = (curriculum) => {
  if (!curriculum || !Array.isArray(curriculum)) {
    return [{
      title: 'Module 1',
      description: 'Course module',
      order: 1,
      sessions: [],
      resources: []
    }];
  }
  
  return curriculum.map((section, index) => ({
    title: section.weekTitle || section.title || `Module ${index + 1}`,
    description: section.weekDescription || section.description || '',
    order: index + 1,
    sessions: [], // Live sessions will be scheduled separately
    resources: section.resources || [],
    // Preserve original section data for reference
    _originalData: {
      topics: section.topics || [],
      weekTitle: section.weekTitle,
      weekDescription: section.weekDescription
    }
  }));
};

const transformToLessons = (curriculum) => {
  if (!curriculum || !Array.isArray(curriculum)) {
    return [{
      title: 'Introduction',
      description: 'Course introduction',
      content_type: 'video',
      content: 'https://example.com/intro.mp4',
      duration: 15,
      order: 1,
      is_preview: true
    }];
  }
  
  const lessons = [];
  let order = 1;
  
  curriculum.forEach(section => {
    if (section.lessons && Array.isArray(section.lessons)) {
      section.lessons.forEach(lesson => {
        lessons.push({
          title: lesson.title || `Lesson ${order}`,
          description: lesson.description || '',
          content_type: lesson.content_type || 'video',
          content: lesson.url || lesson.content_url || 'https://example.com/lesson.mp4',
          duration: lesson.duration || 15,
          order: order++,
          is_preview: lesson.is_preview || false
        });
      });
    }
  });
  
  return lessons.length > 0 ? lessons : [{
    title: 'Introduction',
    description: 'Course introduction',
    content_type: 'video',
    content: 'https://example.com/intro.mp4',
    duration: 15,
    order: 1,
    is_preview: true
  }];
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) + '-' + Date.now();
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

const parseSessionDuration = (duration) => {
  if (!duration) return null;
  
  // Try to extract number from string like "2 hours", "120 minutes"
  const match = duration.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    if (duration.includes('hour')) {
      return num * 60; // Convert hours to minutes
    }
    return num; // Assume minutes
  }
  
  return null;
};

const generateMigrationReport = async (results, analysis) => {
  const report = {
    migrationReport: {
      timestamp: new Date().toISOString(),
      configuration: {
        dryRun: config.migration.dryRun,
        batchSize: config.migration.batchSize,
        preserveOriginal: config.migration.preserveOriginal
      },
      summary: {
        totalLegacyCourses: results.total,
        processedCourses: results.processed,
        successfulMigrations: results.successful,
        failedMigrations: results.failed,
        successRate: `${((results.successful / results.total) * 100).toFixed(1)}%`
      },
      distribution: {
        original: analysis.byType,
        migrated: results.byType
      },
      migrated: results.migrated,
      errors: results.errors,
      analysis: analysis
    }
  };

  // Save report to file
  fs.writeFileSync('migration-results.json', JSON.stringify(report, null, 2));
  
  // Display summary
  console.log("\n📊 MIGRATION SUMMARY".cyan.bold);
  console.log("═".repeat(50).gray);
  
  console.log(`\n📈 Results:`.yellow);
  console.log(`  • Total Courses: ${results.total}`.white);
  console.log(`  • Successfully Migrated: ${results.successful}`.green);
  console.log(`  • Failed: ${results.failed}`.red);
  console.log(`  • Success Rate: ${((results.successful / results.total) * 100).toFixed(1)}%`.blue);
  
  console.log(`\n🎯 By Course Type:`.yellow);
  console.log(`  • Blended: ${results.byType.blended}`.blue);
  console.log(`  • Live: ${results.byType.live}`.green);
  console.log(`  • Free: ${results.byType.free}`.cyan);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`.red);
    results.errors.slice(0, 5).forEach(error => {
      console.log(`  • ${error.title}: ${error.error}`.red);
    });
    if (results.errors.length > 5) {
      console.log(`  • ... and ${results.errors.length - 5} more errors`.red);
    }
  }
  
  return report;
};

// Export for potential use in other scripts
export { 
  migrateLegacyToNew,
  classificationRules,
  transformCourseData
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("\n⚠️  MIGRATION SCRIPT".yellow.bold);
  console.log("This will migrate ALL legacy courses to new course types.".yellow);
  console.log(`DRY RUN MODE: ${config.migration.dryRun ? 'ENABLED' : 'DISABLED'}`.yellow);
  
  if (!config.migration.dryRun) {
    console.log("\n🚨 WARNING: This will create new course records!".red.bold);
    console.log("Make sure you have a backup before proceeding.".red);
  }
  
  migrateLegacyToNew().catch(error => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
} 