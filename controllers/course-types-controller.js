import { BlendedCourse, LiveCourse, FreeCourse } from "../models/course-types/index.js";
import Course from "../models/course-model.js"; // Import legacy Course model
import EnrolledCourse from "../models/enrolled-courses-model.js"; // Import enrolled course model
import { validateObjectId } from "../utils/validation-helpers.js";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

/* ------------------------------ */
/* Helper Functions               */
/* ------------------------------ */

// Helper to assign IDs to curriculum structure recursively
const assignCurriculumIds = (curriculum) => {
  curriculum.forEach((week, weekIndex) => {
    week.id = `week_${weekIndex + 1}`;

    // Assign IDs to direct lessons under weeks
    if (week.lessons && week.lessons.length) {
      week.lessons.forEach((lesson, lessonIndex) => {
        lesson.id = `lesson_w${weekIndex + 1}_${lessonIndex + 1}`;
        
        // Ensure lesson has lessonType (default to 'text' if not specified)
        if (!lesson.lessonType) {
          lesson.lessonType = lesson.video_url ? 'video' : 'text';
        }
        
        // Validate video lesson fields
        if (lesson.lessonType === 'video' && !lesson.video_url) {
          lesson.video_url = '';
        }
        
        if (lesson.resources && lesson.resources.length) {
          lesson.resources.forEach((resource, resourceIndex) => {
            resource.id = `resource_${lesson.id}_${resourceIndex + 1}`;
          });
        }
      });
    }

    // Assign IDs to live classes
    if (week.liveClasses && week.liveClasses.length) {
      week.liveClasses.forEach((liveClass, classIndex) => {
        if (!liveClass.id) {
          liveClass.id = `live_w${weekIndex + 1}_${classIndex + 1}`;
        }
      });
    }

    // Original section and lesson IDs assignment
    if (week.sections && week.sections.length) {
      week.sections.forEach((section, sectionIndex) => {
        section.id = `section_${weekIndex + 1}_${sectionIndex + 1}`;
        if (section.lessons && section.lessons.length) {
          section.lessons.forEach((lesson, lessonIndex) => {
            lesson.id = `lesson_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}`;
            
            // Ensure lesson has lessonType (default to 'text' if not specified)
            if (!lesson.lessonType) {
              lesson.lessonType = lesson.video_url ? 'video' : 'text';
            }
            
            // Validate video lesson fields
            if (lesson.lessonType === 'video' && !lesson.video_url) {
              lesson.video_url = '';
            }
            
            if (lesson.resources && lesson.resources.length) {
              lesson.resources.forEach((resource, resourceIndex) => {
                resource.id = `resource_${lesson.id}_${resourceIndex + 1}`;
              });
            }
          });
        }
      });
    }
  });
};

// Recursively decode URL-encoded strings
const fullyDecodeURIComponent = (str) => {
  try {
    if (!str) return str;
    
    // Handle string or other types
    const inputStr = String(str);
    let decoded = inputStr;

    // First decode HTML entities
    decoded = decoded
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Special handling for %25 (which is the encoded form of %)
    // This handles double-encoding scenarios
    if (decoded.includes('%25')) {
      decoded = decoded.replace(/%25/g, '%');
    }

    // Then recursively decode URL encoding
    let prevDecoded = '';
    while (decoded !== prevDecoded) {
      prevDecoded = decoded;
      try {
        decoded = decodeURIComponent(decoded);
      } catch (e) {
        // If we hit a decoding error, stop and return what we have
        console.warn("Decoding stopped due to error:", e);
        break;
      }
    }
    
    console.log(`Decoded "${inputStr}" to "${decoded}"`);
    return decoded;
  } catch (e) {
    console.warn("Decoding error:", e);
    return str || '';
  }
};

// Format course duration to remove "0 months" if present
const formatCourseDuration = (duration) => {
  if (!duration) return duration;
  
  // Check for "0 months" pattern
  const zeroMonthsPattern = /^0 months\s+(.+)$/;
  const match = duration.match(zeroMonthsPattern);
  
  if (match) {
    return match[1]; // Return just the part after "0 months "
  }
  
  return duration;
};

// Process course or courses array to apply consistent formatting
const processCoursesResponse = (coursesData) => {
  if (!coursesData) return coursesData;
  
  // Function to categorize and format a single course
  const processSingleCourse = (course) => {
    // Create a new object to avoid mutating the original
    const processedCourse = { ...course };
    
    // Format course duration if exists
    if (course.course_duration) {
      processedCourse.course_duration = formatCourseDuration(course.course_duration);
    }
    
    // Properly categorize the course type based on class_type
    if (course.class_type) {
      // Normalize class type for consistent processing
      const classType = course.class_type.toLowerCase();
      
      // Add delivery_format field for frontend consistency
      if (classType.includes('live')) {
        processedCourse.delivery_format = 'Live';
      } else if (classType.includes('blend')) {
        processedCourse.delivery_format = 'Blended';
      } else if (classType.includes('self') || classType.includes('recorded')) {
        processedCourse.delivery_format = 'Self-Paced';
      } else {
        processedCourse.delivery_format = course.class_type; // Keep original if no match
      }
      
      // Add delivery_type for additional categorization if needed
      processedCourse.delivery_type = processedCourse.delivery_format;
    }
    
    return processedCourse;
  };
  
  // Handle array of courses
  if (Array.isArray(coursesData)) {
    return coursesData.map(processSingleCourse);
  }
  
  // Handle single course object
  return processSingleCourse(coursesData);
};

// Escape regex special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Create a safe regex pattern - security-approved way
const createSafeRegex = (pattern, flags = "i") => {
  const escapedPattern = escapeRegExp(pattern);
  return new RegExp(escapedPattern, flags);
};

/**
 * Helper function to get the appropriate course model based on type
 */
const getCourseModel = (course_type) => {
  switch (course_type) {
    case "blended":
      return BlendedCourse;
    case "live":
      return LiveCourse;
    case "free":
      return FreeCourse;
    default:
      throw new Error("Invalid course type");
  }
};

/**
 * Helper function to map legacy course data to new structure
 */
const mapLegacyCourseToType = (course, requestedType) => {
  if (!course) return null;
  
  // Handle both Mongoose documents and plain objects
  const courseObj = course.toObject ? course.toObject() : course;
  
  // Create a base course object with consistent field mapping
  const mappedCourse = {
    ...courseObj,
    course_type: requestedType,
    // Ensure consistent field structure
    assigned_instructor: courseObj.assigned_instructor || null,
    prices: courseObj.prices || [],
    meta: courseObj.meta || {},
    // Mark as legacy for identification
    _legacy: true,
    // Map legacy fields to new structure as needed
  };

  // Add type-specific mappings based on class_type or other indicators
  if (requestedType === "blended") {
    mappedCourse.doubt_session_schedule = courseObj.doubt_session_schedule || {};
  } else if (requestedType === "live") {
    mappedCourse.course_schedule = courseObj.course_schedule || {};
  } else if (requestedType === "free") {
    mappedCourse.access_type = courseObj.access_type || "unlimited";
    mappedCourse.access_duration = courseObj.access_duration || null;
  }

  return mappedCourse;
};

/**
 * Helper function to determine course type from legacy course data
 */
const determineCourseType = (course) => {
  if (!course.class_type) return "free"; // Default fallback
  
  const classType = course.class_type.toLowerCase();
  if (classType.includes("live")) return "live";
  if (classType.includes("blend")) return "blended";
  return "free"; // Default for self-paced or other types
};

/**
 * @desc    Create a new course (blended, live, or free)
 * @route   POST /api/v1/courses
 * @access  Private/Admin
 */
export const createCourse = asyncHandler(async (req, res) => {
  try {
    const { course_type } = req.body;
    const CourseModel = getCourseModel(course_type);

    const courseData = { ...req.body };

    // Handle curriculum data if provided as JSON string
    if (courseData.curriculum && typeof courseData.curriculum === "string") {
      try {
        courseData.curriculum = JSON.parse(courseData.curriculum);
      } catch (parseError) {
        res.status(400);
        throw new Error("Invalid curriculum data format. Expected valid JSON.");
      }
    }

    // Assign IDs to curriculum structure if provided
    if (courseData.curriculum && Array.isArray(courseData.curriculum)) {
      assignCurriculumIds(courseData.curriculum);
    }

    const course = await CourseModel.create(courseData);
    
    res.status(201).json({
      success: true,
      message: `${course_type} course created successfully`,
      data: course,
    });
  } catch (error) {
    throw new Error(`Failed to create course: ${error.message}`);
  }
});

/**
 * @desc    Get all courses of a specific type (includes legacy courses)
 * @route   GET /api/v1/courses/:type
 * @access  Public
 */
export const getCoursesByType = asyncHandler(async (req, res) => {
  try {
    const { type } = req.params;
    const { 
      include_legacy = "true",
      page = 1,
      limit = 10,
      search,
      currency,
      status = "Published",
      course_grade
    } = req.query;
    
    let courses = [];
    
    // First, get courses from the new type-specific model
    try {
      const CourseModel = getCourseModel(type);
      const newCourses = await CourseModel.find()
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort({ createdAt: -1 })
        .lean();
      courses = [...newCourses];
    } catch (error) {
      console.log(`No specific model for type ${type}, will search legacy courses only`);
    }

    // Always include legacy courses to show all available courses
    let legacyFilter = { status: { $regex: status, $options: "i" } };
    
    // Create filter based on type to find relevant legacy courses
    if (type === "live") {
      legacyFilter.$or = [
        { class_type: { $regex: /live/i } },
        { category_type: { $regex: /live/i } }
      ];
    } else if (type === "blended") {
      legacyFilter.$or = [
        { class_type: { $regex: /blend/i } },
        { category_type: { $regex: /blend/i } }
      ];
    } else if (type === "free") {
      legacyFilter.$or = [
        { isFree: true },
        { class_type: { $regex: /self|record/i } },
        { category_type: { $regex: /self|record/i } }
      ];
    }

    // Add search filter if provided
    if (search) {
      const searchTerm = fullyDecodeURIComponent(search);
      legacyFilter.$and = [
        ...(legacyFilter.$and || []),
        {
          $or: [
            { course_title: { $regex: createSafeRegex(searchTerm) } },
            { course_category: { $regex: createSafeRegex(searchTerm) } },
            { course_tag: { $regex: createSafeRegex(searchTerm) } },
            { course_grade: { $regex: createSafeRegex(searchTerm) } }
          ]
        }
      ];
    }

    // Add course grade filter if provided
    if (course_grade) {
      legacyFilter.course_grade = fullyDecodeURIComponent(course_grade);
    }

    const legacyCourses = await Course.find(legacyFilter)
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Map legacy courses to the requested type structure
    const mappedLegacyCourses = legacyCourses.map(course => 
      mapLegacyCourseToType(course, type)
    );
    
    courses = [...courses, ...mappedLegacyCourses];

    // Apply currency filter if specified
    if (currency) {
      const upperCaseCurrency = currency.toUpperCase();
      courses = courses.map(course => ({
        ...course,
        prices: (course.prices || []).filter(price => price.currency === upperCaseCurrency)
      }));
    }

    // Apply formatting
    const processedCourses = processCoursesResponse(courses);

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const paginatedCourses = processedCourses.slice(skip, skip + limitNum);

    res.json({
      success: true,
      count: processedCourses.length,
      data: paginatedCourses,
      pagination: {
        total: processedCourses.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(processedCourses.length / limitNum),
      },
      sources: {
        new_model: courses.filter(c => c.course_type === type && !c._legacy).length,
        legacy_model: courses.filter(c => c._legacy || !c.course_type).length
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }
});

/**
 * @desc    Get all live courses without pagination (includes legacy courses)
 * @route   GET /api/v1/courses/live
 * @access  Public
 */
export const getAllLiveCourses = asyncHandler(async (req, res) => {
  try {
    const { 
      include_legacy = "true",
      search,
      currency,
      status = "Published",
      course_grade
    } = req.query;
    
    let courses = [];
    
    // First, get courses from the new LiveCourse model
    try {
      const newCourses = await LiveCourse.find()
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort({ createdAt: -1 })
        .lean();
      courses = [...newCourses.map(c => ({ ...c, course_type: "live", _source: "new_model" }))];
    } catch (error) {
      console.log("LiveCourse model not available, will search legacy courses only");
    }

    // Always include legacy courses to show all available live courses
    let legacyFilter = { status: { $regex: status, $options: "i" } };
    
    // Filter for live courses in legacy model - match "Live Courses" exactly
    legacyFilter.$or = [
      { class_type: "Live Courses" },
      { class_type: { $regex: /^live courses$/i } },
      { category_type: { $regex: /^live$/i } }
    ];

    // Add search filter if provided
    if (search) {
      const searchTerm = fullyDecodeURIComponent(search);
      legacyFilter.$and = [
        ...(legacyFilter.$and || []),
        {
          $or: [
            { course_title: { $regex: createSafeRegex(searchTerm) } },
            { course_category: { $regex: createSafeRegex(searchTerm) } },
            { course_tag: { $regex: createSafeRegex(searchTerm) } },
            { course_grade: { $regex: createSafeRegex(searchTerm) } }
          ]
        }
      ];
    }

    // Add course grade filter if provided
    if (course_grade) {
      legacyFilter.course_grade = fullyDecodeURIComponent(course_grade);
    }

    const legacyCourses = await Course.find(legacyFilter)
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Map legacy courses to live type structure
    const mappedLegacyCourses = legacyCourses.map(course => ({
      ...mapLegacyCourseToType(course, "live"),
      _source: "legacy_model"
    }));
    
    courses = [...courses, ...mappedLegacyCourses];

    // Apply currency filter if specified
    if (currency) {
      const upperCaseCurrency = currency.toUpperCase();
      courses = courses.map(course => ({
        ...course,
        prices: (course.prices || []).filter(price => price.currency === upperCaseCurrency)
      }));
    }

    // Apply formatting
    const processedCourses = processCoursesResponse(courses);

    res.json({
      success: true,
      count: processedCourses.length,
      data: processedCourses,
      sources: {
        new_model: courses.filter(c => c._source === "new_model").length,
        legacy_model: courses.filter(c => c._source === "legacy_model").length
      },
      filters_applied: {
        search: search || null,
        currency: currency || null,
        status,
        course_grade: course_grade || null,
        include_legacy
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch live courses: ${error.message}`);
  }
});

/**
 * @desc    Get a single course by ID (searches both new and legacy models)
 * @route   GET /api/v1/courses/:type/:id
 * @access  Public
 */
export const getCourseById = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    const { include_legacy = "true", currency } = req.query;
    
    if (!mongoose.isValidObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // First, try to find in the new type-specific model
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain phone_numbers',
          match: { role: { $in: ['instructor'] } }
        })
        .lean();
    } catch (error) {
      console.log(`No specific model for type ${type}`);
    }

    // Always search in legacy Course model to show all available courses
    if (!course) {
      const legacyCourse = await Course.findById(id)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain phone_numbers',
          match: { role: { $in: ['instructor'] } }
        })
        .lean();
      
      if (legacyCourse) {
        // Verify the legacy course matches the requested type or auto-detect type
        const detectedType = determineCourseType(legacyCourse);
        if (detectedType === type || type === "auto") {
          course = mapLegacyCourseToType(legacyCourse, detectedType);
        }
      }
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Handle currency filtering if specified
    let processedCourse = course;
    if (currency && course.prices && course.prices.length > 0) {
      const upperCaseCurrency = currency.toUpperCase();
      processedCourse = { 
        ...course,
        prices: course.prices.filter(price => price.currency === upperCaseCurrency)
      };
    }

    // Apply formatting to course
    processedCourse = processCoursesResponse(processedCourse);

    res.json({
      success: true,
      data: processedCourse,
      source: course._legacy ? "legacy_model" : "new_model"
    });
  } catch (error) {
    throw new Error(`Failed to fetch course: ${error.message}`);
  }
});

/**
 * @desc    Get all courses (unified endpoint for both new and legacy)
 * @route   GET /api/v1/courses/all
 * @access  Public
 */
export const getAllCoursesUnified = asyncHandler(async (req, res) => {
  try {
    const { 
      include_legacy = "true", 
      group_by_type = "false",
      page = 1,
      limit = 10,
      search,
      currency,
      status = "Published",
      course_category,
      class_type,
      course_grade
    } = req.query;
    
    let allCourses = [];

    // Get courses from all new type-specific models
    const [blendedCourses, liveCourses, freeCourses] = await Promise.all([
      BlendedCourse.find()
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort({ createdAt: -1 })
        .lean(),
      LiveCourse.find()
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort({ createdAt: -1 })
        .lean(),
      FreeCourse.find()
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Add type indicators to new courses
    const typedCourses = [
      ...blendedCourses.map(c => ({ ...c, course_type: "blended" })),
      ...liveCourses.map(c => ({ ...c, course_type: "live" })),
      ...freeCourses.map(c => ({ ...c, course_type: "free" }))
    ];

    allCourses = [...typedCourses];

    // Always include legacy courses to show all available courses
    let legacyFilter = { status: { $regex: status, $options: "i" } };
    
    // Add search filter if provided
    if (search) {
      const searchTerm = fullyDecodeURIComponent(search);
      legacyFilter.$or = [
        { course_title: { $regex: createSafeRegex(searchTerm) } },
        { course_category: { $regex: createSafeRegex(searchTerm) } },
        { course_tag: { $regex: createSafeRegex(searchTerm) } },
        { course_grade: { $regex: createSafeRegex(searchTerm) } }
      ];
    }

    // Add category filter if provided
    if (course_category) {
      legacyFilter.course_category = fullyDecodeURIComponent(course_category);
    }

    // Add class type filter if provided
    if (class_type) {
      const decodedClassType = fullyDecodeURIComponent(class_type);
      legacyFilter.class_type = { $regex: createSafeRegex(decodedClassType) };
    }

    // Add course grade filter if provided
    if (course_grade) {
      legacyFilter.course_grade = fullyDecodeURIComponent(course_grade);
    }

    const legacyCourses = await Course.find(legacyFilter)
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    const mappedLegacyCourses = legacyCourses.map(course => {
      const detectedType = determineCourseType(course);
      return {
        ...mapLegacyCourseToType(course, detectedType),
      };
    });

    allCourses = [...allCourses, ...mappedLegacyCourses];

    // Apply currency filter if specified
    if (currency) {
      const upperCaseCurrency = currency.toUpperCase();
      allCourses = allCourses.map(course => ({
        ...course,
        prices: (course.prices || []).filter(price => price.currency === upperCaseCurrency)
      }));
    }

    // Apply formatting
    const processedCourses = processCoursesResponse(allCourses);

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const paginatedCourses = processedCourses.slice(skip, skip + limitNum);

    // Group by type if requested
    if (group_by_type === "true") {
      const groupedCourses = {
        blended: processedCourses.filter(c => c.course_type === "blended"),
        live: processedCourses.filter(c => c.course_type === "live"),
        free: processedCourses.filter(c => c.course_type === "free")
      };

      res.json({
        success: true,
        count: processedCourses.length,
        data: groupedCourses,
        pagination: {
          total: processedCourses.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(processedCourses.length / limitNum),
        },
        sources: {
          new_model: allCourses.filter(c => !c._legacy).length,
          legacy_model: allCourses.filter(c => c._legacy).length
        }
      });
    } else {
      res.json({
        success: true,
        count: processedCourses.length,
        data: paginatedCourses,
        pagination: {
          total: processedCourses.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(processedCourses.length / limitNum),
        },
        sources: {
          new_model: allCourses.filter(c => !c._legacy).length,
          legacy_model: allCourses.filter(c => c._legacy).length
        }
      });
    }
  } catch (error) {
    throw new Error(`Failed to fetch all courses: ${error.message}`);
  }
});

/**
 * @desc    Update a course (handles both new and legacy models)
 * @route   PUT /api/v1/courses/:type/:id
 * @access  Private/Admin
 */
export const updateCourse = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    const { force_legacy = "false" } = req.query;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;
    const updateData = { ...req.body };

    // Handle curriculum data if provided as JSON string
    if (updateData.curriculum && typeof updateData.curriculum === "string") {
      try {
        updateData.curriculum = JSON.parse(updateData.curriculum);
      } catch (parseError) {
        res.status(400);
        throw new Error("Invalid curriculum data format. Expected valid JSON.");
      }
    }

    // Assign IDs to curriculum structure if provided
    if (updateData.curriculum && Array.isArray(updateData.curriculum)) {
      assignCurriculumIds(updateData.curriculum);
    }

    // If force_legacy is true, update in legacy model
    if (force_legacy === "true") {
      course = await Course.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
    } else {
      // First try the new type-specific model
      try {
        const CourseModel = getCourseModel(type);
        course = await CourseModel.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });
      } catch (error) {
        console.log(`No specific model for type ${type}, trying legacy model`);
      }

      // If not found in new model, try legacy model
      if (!course) {
        course = await Course.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });
        if (course) {
          course = mapLegacyCourseToType(course, type);
          course._legacy = true;
        }
      }
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    res.json({
      success: true,
      message: "Course updated successfully",
      data: course,
      source: course._legacy ? "legacy_model" : "new_model"
    });
  } catch (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }
});

/**
 * @desc    Delete a course (handles both new and legacy models)
 * @route   DELETE /api/v1/courses/:type/:id
 * @access  Private/Admin
 */
export const deleteCourse = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    const { force_legacy = "false" } = req.query;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;
    let deletedFrom = "new_model";

    // If force_legacy is true, delete from legacy model
    if (force_legacy === "true") {
      course = await Course.findByIdAndDelete(id);
      deletedFrom = "legacy_model";
    } else {
      // First try the new type-specific model
      try {
        const CourseModel = getCourseModel(type);
        course = await CourseModel.findByIdAndDelete(id);
      } catch (error) {
        console.log(`No specific model for type ${type}, trying legacy model`);
      }

      // If not found in new model, try legacy model
      if (!course) {
        course = await Course.findByIdAndDelete(id);
        deletedFrom = "legacy_model";
      }
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    res.json({
      success: true,
      message: "Course deleted successfully",
      deletedFrom
    });
  } catch (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }
});

// Blended Course Specific Controllers

/**
 * @desc    Schedule a doubt session for a blended course
 * @route   POST /api/v1/courses/blended/:id/doubt-session
 * @access  Private/Admin
 */
export const scheduleDoubtSession = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const { sectionId, sessionDetails } = req.body;

    const course = await BlendedCourse.findById(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find the section and add the doubt session
    const section = course.curriculum.id(sectionId);
    if (!section) {
      res.status(404);
      throw new Error("Section not found");
    }

    section.doubt_sessions.push(sessionDetails);
    await course.save();

    res.json({
      success: true,
      message: "Doubt session scheduled successfully",
      data: section.doubt_sessions[section.doubt_sessions.length - 1],
    });
  } catch (error) {
    throw new Error(`Failed to schedule doubt session: ${error.message}`);
  }
});

/**
 * @desc    Update doubt session schedule for a blended course
 * @route   PUT /api/v1/courses/blended/:id/doubt-schedule
 * @access  Private/Admin
 */
export const updateDoubtSchedule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const course = await BlendedCourse.findById(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    course.doubt_session_schedule = req.body;
    await course.save();

    res.json({
      success: true,
      message: "Doubt session schedule updated successfully",
      data: course.doubt_session_schedule,
    });
  } catch (error) {
    throw new Error(`Failed to update doubt session schedule: ${error.message}`);
  }
});

// Live Course Specific Controllers

/**
 * @desc    Update course schedule for a live course
 * @route   PUT /api/v1/courses/live/:id/schedule
 * @access  Private/Admin
 */
export const updateLiveSchedule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const course = await LiveCourse.findById(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    course.course_schedule = req.body;
    await course.save();

    res.json({
      success: true,
      message: "Live course schedule updated successfully",
      data: course.course_schedule,
    });
  } catch (error) {
    throw new Error(`Failed to update live course schedule: ${error.message}`);
  }
});

/**
 * @desc    Add a recorded session to a live course week
 * @route   POST /api/v1/courses/live/:id/week/:weekId/recording
 * @access  Private/Admin
 */
export const addRecordedSession = asyncHandler(async (req, res) => {
  try {
    const { id, weekId } = req.params;
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const course = await LiveCourse.findById(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    const week = course.curriculum.id(weekId);
    if (!week) {
      res.status(404);
      throw new Error("Week not found");
    }

    const session = week.sessions.id(req.body.sessionId);
    if (!session) {
      res.status(404);
      throw new Error("Session not found");
    }

    session.recording_url = req.body.recording_url;
    session.is_recorded = true;
    await course.save();

    res.json({
      success: true,
      message: "Recording added successfully",
      data: session,
    });
  } catch (error) {
    throw new Error(`Failed to add recording: ${error.message}`);
  }
});

// Free Course Specific Controllers

/**
 * @desc    Update access settings for a free course
 * @route   PUT /api/v1/courses/free/:id/access
 * @access  Private/Admin
 */
export const updateAccessSettings = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    const course = await FreeCourse.findById(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    course.access_type = req.body.access_type;
    if (req.body.access_type === "time-limited") {
      course.access_duration = req.body.access_duration;
    }

    await course.save();

    res.json({
      success: true,
      message: "Access settings updated successfully",
      data: {
        access_type: course.access_type,
        access_duration: course.access_duration,
      },
    });
  } catch (error) {
    throw new Error(`Failed to update access settings: ${error.message}`);
  }
});

/**
 * @desc    Advanced search courses across all types with comprehensive filtering
 * @route   GET /api/v1/tcourse/search
 * @access  Public
 * @param   {number} page - Page number for pagination (default: 1)
 * @param   {number} limit - Number of results per page (default: 10)
 * @param   {string} search - Text search term
 * @param   {string} sort_by - Field to sort by (createdAt, price, popularity, ratings, relevance)
 * @param   {string} sort_order - Sort order (asc, desc)
 * @param   {string} course_category - Filter by course category, can be comma-separated for multiple values
 * @param   {string} category_type - Filter by category type
 * @param   {string} course_tag - Filter by course tag, can be comma-separated
 * @param   {string} class_type - Filter by class type with flexible matching
 * @param   {string} status - Filter by course status
 * @param   {string} currency - Filter by currency code (e.g., 'inr', 'usd') with fallback to USD
 * @param   {string} course_duration - Filter by course duration
 * @param   {string} min_hours_per_week - Filter by minimum hours per week
 * @param   {string} max_hours_per_week - Filter by maximum hours per week
 * @param   {string} no_of_Sessions - Filter by number of sessions
 * @param   {string} course_grade - Filter by course grade
 * @param   {string} price_range - Filter by price range (format: "min-max")
 * @param   {string} certification - Filter by certification availability (Yes/No)
 * @param   {string} has_assignments - Filter by assignments availability (Yes/No)
 * @param   {string} has_projects - Filter by projects availability (Yes/No)
 * @param   {string} has_quizzes - Filter by quizzes availability (Yes/No)
 * @param   {string} exclude_ids - Comma-separated course IDs to exclude
 * @param   {string} user_id - User ID to exclude enrolled courses
 * @param   {string} course_type - Filter by new course type (live, blended, free)
 * @param   {string} include_legacy - Include legacy courses (default: true)
 * @param   {string} group_by_type - Group results by course type (default: false)
 */
export const searchAllCourses = asyncHandler(async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      sort_by = "createdAt",
      sort_order = "desc",
      course_category,
      category_type,
      course_tag,
      class_type,
      status,
      course_duration,
      min_hours_per_week,
      max_hours_per_week,
      no_of_Sessions,
      description,
      course_grade,
      price_range,
      certification,
      has_assignments,
      has_projects,
      has_quizzes,
      currency,
      exclude_ids,
      user_id,
      course_type,
      include_legacy = "true",
      group_by_type = "false",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page and limit must be positive numbers.",
      });
    }

    const filter = {};
    const textSearchFields = {};
    let requestedCurrency = null;
    let shouldFallbackToUSD = false;

    // Helper function to handle array or string filters
    const handleArrayOrStringFilter = (field, value) => {
      if (!value) return;
      
      console.log(`Processing ${field} filter with value:`, value);
      
      if (Array.isArray(value)) {
        const decodedValues = value.map((item) => fullyDecodeURIComponent(item));
        console.log(`Decoded ${field} array values:`, decodedValues);
        filter[field] = {
          $in: decodedValues.map((item) => createSafeRegex("^" + item + "$")),
        };
      } else if (typeof value === "string") {
        const decodedValue = fullyDecodeURIComponent(value);
        console.log(`Decoded ${field} string value:`, decodedValue);
        
        // Check for various delimiter patterns
        if (
          decodedValue.includes(",") ||
          decodedValue.includes("|") ||
          decodedValue.includes(";")
        ) {
          const values = decodedValue
            .split(/[,|;]/)
            .map((v) => v.trim())
            .filter(Boolean);
          console.log(`Split ${field} values:`, values);
          
          // Use exact matching for categories
          if (field === "course_category") {
            filter[field] = { $in: values };
      } else {
            filter[field] = {
              $in: values.map((v) => createSafeRegex("^" + v + "$")),
            };
          }
        } else {
          // For single values, use exact match for categories
          if (field === "course_category") {
            filter[field] = decodedValue;
          } else {
            filter[field] = { $regex: createSafeRegex(decodedValue) };
          }
        }
      }
    };

    // Handle currency logic with fallback to USD
    if (currency) {
      requestedCurrency = fullyDecodeURIComponent(currency).toUpperCase();
      
      // First, check if any courses exist with the requested currency across all models
      const [legacyCount, blendedCount, liveCount, freeCount] = await Promise.all([
        include_legacy === "true" ? Course.countDocuments({
          "prices.currency": requestedCurrency,
          status: "Published"
        }) : Promise.resolve(0),
        BlendedCourse.countDocuments({
          "prices.currency": requestedCurrency,
          status: "Published"
        }),
        LiveCourse.countDocuments({
          "prices.currency": requestedCurrency,
          status: "Published"
        }),
        FreeCourse.countDocuments({
          "prices.currency": requestedCurrency,
          status: "Published"
        })
      ]);
      
      const totalCoursesWithCurrency = legacyCount + blendedCount + liveCount + freeCount;
      
      if (totalCoursesWithCurrency === 0) {
        // No courses found with requested currency, fallback to USD
        shouldFallbackToUSD = true;
        filter["prices.currency"] = "USD";
      } else {
        // Courses exist with requested currency, use it
        filter["prices.currency"] = requestedCurrency;
      }
    }

    // Advanced text search with full-text search support
    if (search) {
      const decodedSearch = fullyDecodeURIComponent(search);
      if (decodedSearch.length >= 3) {
        // Use MongoDB text search for better relevance
        filter.$text = { $search: decodedSearch };
        textSearchFields.score = { $meta: "textScore" };
      } else {
        // Fallback to regex search for shorter terms
        filter.$or = [
          { course_title: { $regex: createSafeRegex(decodedSearch) } },
          { course_category: { $regex: createSafeRegex(decodedSearch) } },
          { course_tag: { $regex: createSafeRegex(decodedSearch) } },
          { "course_description.program_overview": { $regex: createSafeRegex(decodedSearch) } },
          { "course_description.benefits": { $regex: createSafeRegex(decodedSearch) } },
          { course_grade: { $regex: createSafeRegex(decodedSearch) } },
        ];
      }
    }

    // Apply basic filters
    if (course_duration) filter.course_duration = fullyDecodeURIComponent(course_duration);
    if (min_hours_per_week) filter.min_hours_per_week = fullyDecodeURIComponent(min_hours_per_week);
    if (max_hours_per_week) filter.max_hours_per_week = fullyDecodeURIComponent(max_hours_per_week);
    if (no_of_Sessions) filter.no_of_Sessions = fullyDecodeURIComponent(no_of_Sessions);
    if (description) filter.course_description = fullyDecodeURIComponent(description);
    if (course_grade) filter.course_grade = fullyDecodeURIComponent(course_grade);

    // Apply array/string filters
    handleArrayOrStringFilter("course_category", course_category);
    handleArrayOrStringFilter("category_type", category_type);
    handleArrayOrStringFilter("course_tag", course_tag);
    
    // Special handling for class_type to better match Live and Blended courses
    if (class_type) {
      console.log(`Processing class_type filter with value:`, class_type);
      
      const decodedClassType = fullyDecodeURIComponent(class_type);
      console.log(`Decoded class_type value:`, decodedClassType);
      
      if (decodedClassType.includes(",") || decodedClassType.includes("|") || decodedClassType.includes(";")) {
        // Handle multiple class types
        const classTypeValues = decodedClassType.split(/[,|;]/).map(v => v.trim()).filter(Boolean);
        console.log(`Split class_type values:`, classTypeValues);
        
        // Create a more flexible match for class types
        const regexPatterns = classTypeValues.map(type => {
          const baseType = type.toLowerCase();
          
          if (baseType.includes('live')) {
            return createSafeRegex('live', 'i');
          } else if (baseType.includes('blend')) {
            return createSafeRegex('blend', 'i');
          } else if (baseType.includes('self') || baseType.includes('record')) {
            return createSafeRegex('self|record', 'i');
          } else {
            return createSafeRegex(type, 'i');
          }
        });
        
        filter.class_type = { $in: regexPatterns };
      } else {
        // Handle single class type with flexible matching
        const baseType = decodedClassType.toLowerCase();
        
        if (baseType.includes('live')) {
          filter.class_type = { $regex: createSafeRegex('live', 'i') };
        } else if (baseType.includes('blend')) {
          filter.class_type = { $regex: createSafeRegex('blend', 'i') };
        } else if (baseType.includes('self') || baseType.includes('record')) {
          filter.class_type = { $regex: createSafeRegex('self|record', 'i') };
        } else {
          filter.class_type = { $regex: createSafeRegex(decodedClassType, 'i') };
        }
      }
    }

    // Status filter with multiple values support
    if (status) {
      const decodedStatus = fullyDecodeURIComponent(status);
      if (decodedStatus.includes(",")) {
        filter.status = {
          $in: decodedStatus.split(",").map(s => s.trim())
        };
      } else {
        filter.status = decodedStatus;
      }
    }

    // Price range filter
    if (price_range) {
      const [min, max] = price_range.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filter["prices.individual"] = { $gte: min, $lte: max };
      }
    }

    // Feature filters
    if (certification === "Yes" || certification === "No") {
      filter.is_Certification = certification;
    }
    if (has_assignments === "Yes" || has_assignments === "No") {
      filter.is_Assignments = has_assignments;
    }
    if (has_projects === "Yes" || has_projects === "No") {
      filter.is_Projects = has_projects;
    }
    if (has_quizzes === "Yes" || has_quizzes === "No") {
      filter.is_Quizes = has_quizzes;
    }

    // Exclude specific course IDs
    if (exclude_ids && exclude_ids.length > 0) {
      const excludeIdsArray = Array.isArray(exclude_ids)
        ? exclude_ids
        : exclude_ids.split(",");
      const validIds = excludeIdsArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (validIds.length > 0) {
        filter._id = { $nin: validIds };
      }
    }

    // Exclude courses user is already enrolled in
    if (user_id) {
      try {
        const enrolledCourses = await EnrolledCourse.find(
          { student_id: user_id },
          "course_id",
        ).lean();
        const enrolledCourseIds = enrolledCourses.map((ec) => ec.course_id);
        if (enrolledCourseIds.length) {
          filter._id = { $nin: enrolledCourseIds };
        }
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      }
    }

    console.log("Final filter object:", JSON.stringify(filter, null, 2));
    if (shouldFallbackToUSD) {
      console.log(`Currency fallback: Requested ${requestedCurrency} not found, showing USD prices instead`);
    }

    // Sort options with advanced sorting
    const sortOptions = {};
    if (search && sort_by === "relevance" && filter.$text) {
      sortOptions.score = { $meta: "textScore" };
    } else if (sort_by === "price") {
      sortOptions["prices.individual"] = sort_order === "asc" ? 1 : -1;
    } else if (sort_by === "popularity") {
      sortOptions["meta.views"] = -1;
      sortOptions["meta.enrollments"] = -1;
    } else if (sort_by === "ratings") {
      sortOptions["meta.ratings.average"] = -1;
    } else {
      sortOptions[sort_by] = sort_order === "asc" ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    // Projection for optimized queries
    const projection = {
      course_title: 1,
      course_category: 1,
      course_tag: 1,
      course_image: 1,
      course_duration: 1,
      isFree: 1,
      status: 1,
      category_type: 1,
      class_type: 1,
      is_Certification: 1,
      is_Assignments: 1,
      is_Projects: 1,
      is_Quizes: 1,
      prices: 1,
      slug: 1,
      meta: 1,
      createdAt: 1,
      no_of_Sessions: 1,
      course_description: 1,
      course_grade: 1,
      brochures: 1,
      final_evaluation: 1,
      assigned_instructor: 1,
      course_type: 1,
    };

    if (filter.$text) {
      projection.score = { $meta: "textScore" };
    }

    // Execute searches across all models with aggregation for better performance
    const createAggregationPipeline = () => [
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "assigned_instructor",
          foreignField: "_id",
          as: "assigned_instructor",
          pipeline: [
            {
              $match: {
                role: { $in: ["instructor"] }
              }
            },
            {
              $project: {
                full_name: 1,
                email: 1,
                role: 1,
                domain: 1,
                phone_numbers: 1
              }
            }
          ]
        }
      },
      {
        $addFields: {
          assigned_instructor: { $arrayElemAt: ["$assigned_instructor", 0] },
          ...textSearchFields,
          pricing_summary: {
            min_price: { $min: "$prices.individual" },
            max_price: { $max: "$prices.batch" },
          },
        },
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limit },
      { $project: projection },
    ];

    // Search in new course-types models
    const courseTypesToSearch = course_type ? [course_type] : ["blended", "live", "free"];
    let allResults = [];
    let totalCounts = { blended: 0, live: 0, free: 0, legacy: 0 };
    
    for (const type of courseTypesToSearch) {
      try {
        const CourseModel = getCourseModel(type);
        const [typeResults, typeCount] = await Promise.all([
          CourseModel.aggregate(createAggregationPipeline()),
          CourseModel.countDocuments(filter)
        ]);

        const resultsWithType = typeResults.map(course => ({
          ...course,
          course_type: type,
          _source: "new_model"
        }));

        allResults = [...allResults, ...resultsWithType];
        totalCounts[type] = typeCount;
      } catch (error) {
        console.log(`No model for type ${type}:`, error.message);
      }
    }

    // Include legacy courses if requested
    let legacyResults = [];
    if (include_legacy === "true") {
      const [legacyData, legacyCount] = await Promise.all([
        Course.aggregate(createAggregationPipeline()),
        Course.countDocuments(filter)
      ]);

      legacyResults = legacyData.map(course => {
        const detectedType = determineCourseType(course);
        return {
          ...mapLegacyCourseToType(course, detectedType),
          _source: "legacy_model"
        };
      });

      allResults = [...allResults, ...legacyResults];
      totalCounts.legacy = legacyCount;
    }

    // Calculate total count
    const totalCount = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);

    // Post-process results to filter prices by currency
    let processedCourses = allResults;
    const effectiveCurrency = shouldFallbackToUSD ? "USD" : (requestedCurrency || null);
    
    if (effectiveCurrency) {
      processedCourses = allResults.map((course) => {
        if (course.prices) {
          const clonedCourse = { ...course };
          clonedCourse.prices = course.prices.filter(
            (price) => price.currency === effectiveCurrency,
          );
          return clonedCourse;
        }
        return course;
      });
    }

    // Format course durations
    processedCourses = processCoursesResponse(processedCourses);

    // Apply post-query sorting for price if needed
    if (sort_by === "price_asc" || sort_by === "price_desc") {
      const currencyFilter = effectiveCurrency || "USD";

      processedCourses = processedCourses.sort((a, b) => {
        const aPrice = a.prices && a.prices.find((p) => p.currency === currencyFilter);
        const bPrice = b.prices && b.prices.find((p) => p.currency === currencyFilter);

        const aPriceValue = aPrice
          ? aPrice.individual
          : sort_by === "price_asc"
            ? Number.MAX_SAFE_INTEGER
            : 0;
        const bPriceValue = bPrice
          ? bPrice.individual
          : sort_by === "price_asc"
            ? Number.MAX_SAFE_INTEGER
            : 0;

        return sort_by === "price_asc"
          ? aPriceValue - bPriceValue
          : bPriceValue - aPriceValue;
      });
    }

    // Generate facets for filtering UI
    const facets = await Promise.all([
      // Categories facet across all models
      Course.aggregate([
        { $match: filter },
        { $group: { _id: "$course_category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Category types facet
      Course.aggregate([
        { $match: filter },
        { $group: { _id: "$category_type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Tags facet
      Course.aggregate([
        { $match: filter },
        { $group: { _id: "$course_tag", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Class types facet
      Course.aggregate([
        { $match: filter },
        { $group: { _id: "$class_type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Delivery formats facet
      Course.aggregate([
        { $match: filter },
        {
          $addFields: {
            computed_delivery_format: {
              $cond: [
                { $eq: [{ $ifNull: ["$class_type", ""] }, ""] },
                "Unknown",
                {
                  $cond: [
                    { $regexMatch: { input: { $toLower: "$class_type" }, regex: "live" } },
                    "Live",
                    {
                      $cond: [
                        { $regexMatch: { input: { $toLower: "$class_type" }, regex: "blend" } },
                        "Blended",
                        {
                          $cond: [
                            { 
                              $or: [
                                { $regexMatch: { input: { $toLower: "$class_type" }, regex: "self" } },
                                { $regexMatch: { input: { $toLower: "$class_type" }, regex: "record" } }
                              ]
                            },
                            "Self-Paced",
                            "$class_type"
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        { $group: { _id: "$computed_delivery_format", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Price ranges facet
      Course.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$prices.individual" },
            maxPrice: { $max: "$prices.batch" },
          },
        },
      ]),
    ]);

    const response = {
      success: true,
      data: processedCourses,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      facets: {
        categories: facets[0],
        categoryTypes: facets[1],
        tags: facets[2],
        classTypes: facets[3],
        deliveryFormats: facets[4],
        priceRanges: facets[5],
      },
      sources: {
        new_model: totalCounts.blended + totalCounts.live + totalCounts.free,
        legacy_model: totalCounts.legacy,
        breakdown: totalCounts
      },
      filters_applied: {
        course_type,
        search: search || null,
        category: course_category || null,
        class_type: class_type || null,
        course_grade: course_grade || null,
        currency: currency || null,
        status: status || null,
        price_range: price_range || null,
        has_features: {
          certification: certification || null,
          assignments: has_assignments || null,
          projects: has_projects || null,
          quizzes: has_quizzes || null
        }
      }
    };

    // Add currency fallback information to response
    if (shouldFallbackToUSD && requestedCurrency) {
      response.currency_fallback = {
        requested: requestedCurrency,
        used: "USD",
        message: `No courses found with ${requestedCurrency} pricing. Showing USD prices instead.`
      };
    }

    // Group by type if requested
    if (group_by_type === "true") {
      const grouped = {
        live: processedCourses.filter(c => 
          c.course_type === "live" || 
          (c.class_type && c.class_type.toLowerCase().includes("live"))
        ),
        blended: processedCourses.filter(c => 
          c.course_type === "blended" || 
          (c.class_type && c.class_type.toLowerCase().includes("blend"))
        ),
        free: processedCourses.filter(c => c.course_type === "free"),
        other: processedCourses.filter(c => 
          !c.course_type && 
          (!c.class_type || 
            (!c.class_type.toLowerCase().includes("live") && 
             !c.class_type.toLowerCase().includes("blend")))
        )
      };

      response.data = grouped;
    }

    res.status(200).json(response);
  } catch (error) {
    throw new Error(`Failed to search courses: ${error.message}`);
  }
});

/* ------------------------------ */
/* Curriculum Management Methods  */
/* ------------------------------ */

/**
 * @desc    Get curriculum for a course
 * @route   GET /api/v1/courses/:type/:id/curriculum
 * @access  Public
 */
export const getCurriculum = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id).select('curriculum course_title');
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id).select('curriculum course_title');
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    res.json({
      success: true,
      data: {
        course_id: course._id,
        course_title: course.course_title,
        curriculum: course.curriculum || [],
        total_weeks: (course.curriculum || []).length,
        source: course._legacy ? "legacy_model" : "new_model"
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch curriculum: ${error.message}`);
  }
});

/**
 * @desc    Add a new week to course curriculum
 * @route   POST /api/v1/courses/:type/:id/curriculum/weeks
 * @access  Private/Admin
 */
export const addWeekToCurriculum = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    const weekData = req.body;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Initialize curriculum if it doesn't exist
    if (!course.curriculum) {
      course.curriculum = [];
    }

    // Add the new week
    course.curriculum.push(weekData);

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    const addedWeek = course.curriculum[course.curriculum.length - 1];

    res.status(201).json({
      success: true,
      message: "Week added to curriculum successfully",
      data: addedWeek
    });
  } catch (error) {
    throw new Error(`Failed to add week to curriculum: ${error.message}`);
  }
});

/**
 * @desc    Update a week in course curriculum
 * @route   PUT /api/v1/courses/:type/:id/curriculum/weeks/:weekId
 * @access  Private/Admin
 */
export const updateWeekInCurriculum = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    const updateData = req.body;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find the week by ID
    const weekIndex = course.curriculum.findIndex(week => week.id === weekId);
    if (weekIndex === -1) {
      res.status(404);
      throw new Error("Week not found in curriculum");
    }

    // Update the week data
    course.curriculum[weekIndex] = { ...course.curriculum[weekIndex].toObject(), ...updateData };

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    res.json({
      success: true,
      message: "Week updated successfully",
      data: course.curriculum[weekIndex]
    });
  } catch (error) {
    throw new Error(`Failed to update week in curriculum: ${error.message}`);
  }
});

/**
 * @desc    Delete a week from course curriculum
 * @route   DELETE /api/v1/courses/:type/:id/curriculum/weeks/:weekId
 * @access  Private/Admin
 */
export const deleteWeekFromCurriculum = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find and remove the week by ID
    const weekIndex = course.curriculum.findIndex(week => week.id === weekId);
    if (weekIndex === -1) {
      res.status(404);
      throw new Error("Week not found in curriculum");
    }

    const deletedWeek = course.curriculum[weekIndex];
    course.curriculum.splice(weekIndex, 1);

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    res.json({
      success: true,
      message: "Week deleted from curriculum successfully",
      deletedWeek: deletedWeek
    });
  } catch (error) {
    throw new Error(`Failed to delete week from curriculum: ${error.message}`);
  }
});

/**
 * @desc    Add a lesson to a week (either directly or to a section)
 * @route   POST /api/v1/courses/:type/:id/curriculum/weeks/:weekId/lessons
 * @access  Private/Admin
 */
export const addLessonToWeek = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    
    // Handle both payload formats:
    // Format 1: { lessonData: {...}, sectionId: "..." }
    // Format 2: { title: "...", description: "...", ... } (direct lesson data)
    let lessonData, sectionId;
    
    if (req.body.lessonData) {
      // Format 1: Structured payload
      lessonData = req.body.lessonData;
      sectionId = req.body.sectionId;
    } else {
      // Format 2: Direct lesson data
      const { sectionId: extractedSectionId, ...directLessonData } = req.body;
      lessonData = directLessonData;
      sectionId = extractedSectionId;
    }
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }
    
    // Validate lesson data
    if (!lessonData || !lessonData.title) {
      res.status(400);
      throw new Error("Lesson data with title is required");
    }
    
    // Transform and standardize lesson data to match schema
    const processedLessonData = {
      title: lessonData.title,
      description: lessonData.description || '',
      order: lessonData.order || 0,
      isPreview: lessonData.isPreview || lessonData.is_preview || false,
      lessonType: lessonData.lessonType || lessonData.content_type || 'video',
      meta: lessonData.meta || {},
      resources: lessonData.resources || [],
    };
    
    // Handle video-specific fields
    if (processedLessonData.lessonType === 'video') {
      // Map content_url to video_url if needed
      processedLessonData.video_url = lessonData.video_url || lessonData.content_url;
      
      // Ensure duration is a string
      if (lessonData.duration) {
        if (typeof lessonData.duration === 'number') {
          processedLessonData.duration = `${lessonData.duration} minutes`;
        } else {
          processedLessonData.duration = lessonData.duration;
        }
      }
      
      // Validate required video fields
      if (!processedLessonData.video_url) {
        res.status(400);
        throw new Error("Video lessons require either video_url or content_url");
      }
    }
    
    // Handle quiz-specific fields
    if (processedLessonData.lessonType === 'quiz') {
      if (lessonData.quiz_id) {
        processedLessonData.quiz_id = lessonData.quiz_id;
      } else {
        res.status(400);
        throw new Error("Quiz lessons require quiz_id");
      }
    }
    
    // Handle assessment-specific fields
    if (processedLessonData.lessonType === 'assessment') {
      if (lessonData.assignment_id) {
        processedLessonData.assignment_id = lessonData.assignment_id;
      } else {
        res.status(400);
        throw new Error("Assessment lessons require assignment_id");
      }
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find the week
    const week = course.curriculum.find(w => w.id === weekId);
    if (!week) {
      res.status(404);
      const availableWeeks = course.curriculum.map(w => w.id).join(', ');
      throw new Error(`Week not found. Available weeks: [${availableWeeks}]. Requested: ${weekId}`);
    }

    let addedLesson;

    if (sectionId) {
      // Add lesson to a specific section
      const section = week.sections.find(s => s.id === sectionId);
      if (!section) {
        res.status(404);
        throw new Error("Section not found");
      }
      
      if (!section.lessons) {
        section.lessons = [];
      }
      
      section.lessons.push(processedLessonData);
      addedLesson = section.lessons[section.lessons.length - 1];
    } else {
      // Add lesson directly to the week
      if (!week.lessons) {
        week.lessons = [];
      }
      
      week.lessons.push(processedLessonData);
      addedLesson = week.lessons[week.lessons.length - 1];
    }

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    res.status(201).json({
      success: true,
      message: `Lesson added to ${sectionId ? 'section' : 'week'} successfully`,
      data: addedLesson
    });
  } catch (error) {
    throw new Error(`Failed to add lesson: ${error.message}`);
  }
});

/**
 * @desc    Add a video lesson to a week (supports both URL and base64 upload)
 * @route   POST /api/v1/courses/:type/:id/curriculum/weeks/:weekId/video-lessons
 * @access  Private/Admin
 */
export const addVideoLessonToWeek = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    const { 
      sectionId, 
      title, 
      description, 
      video_url, 
      video_base64,
      fileType = 'video',
      duration, 
      video_thumbnail, 
      order, 
      isPreview = false 
    } = req.body;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }
    
    // Validate video lesson data
    if (!title) {
      res.status(400);
      throw new Error("Title is required for video lessons");
    }

    // Check if we have either video_url or video_base64
    if (!video_url && !video_base64) {
      res.status(400);
      throw new Error("Either video URL or base64 video data is required");
    }

    let finalVideoUrl = video_url;

    // Handle base64 video upload if provided
    if (video_base64) {
      try {
        // Import the upload utility
        const { uploadBase64FileOptimized } = await import("../utils/uploadFile.js");
        
        // Validate base64 data
        if (video_base64.length < 100) {
          res.status(400);
          throw new Error("Base64 video data is too short or incomplete");
        }

        let mimeType;
        let base64Data;
        
        // Parse base64 data (handle both data URI and raw base64)
        const dataUriMatch = video_base64.match(/^data:(.*?);base64,(.*)$/);
        if (dataUriMatch) {
          mimeType = dataUriMatch[1];
          base64Data = dataUriMatch[2];
        } else {
          // Raw base64 string, assume MP4
          mimeType = "video/mp4";
          base64Data = video_base64;
        }

        // Validate MIME type for video
        if (!mimeType.startsWith("video/")) {
          res.status(400);
          throw new Error("Invalid MIME type for video. Expected video/*");
        }

        // Quick size estimation (base64 is ~33% larger than binary)
        const estimatedSize = (base64Data.length * 3) / 4;
        const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit for videos
        
        if (estimatedSize > MAX_VIDEO_SIZE) {
          res.status(400);
          throw new Error(`Video file size exceeds maximum limit of ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`);
        }

        // Upload the base64 video
        const uploadResult = await uploadBase64FileOptimized(base64Data, mimeType, "videos");
        
        if (!uploadResult || !uploadResult.data || !uploadResult.data.url) {
          res.status(500);
          throw new Error("Failed to upload video file");
        }

        finalVideoUrl = uploadResult.data.url;
        
        console.log(`✅ Video uploaded successfully: ${finalVideoUrl}`);
      } catch (uploadError) {
        console.error("Video upload error:", uploadError);
        res.status(500);
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }
    }
    
    // Create the video lesson object
    const videoLessonData = {
      title,
      description: description || '',
      lessonType: 'video',
      video_url: finalVideoUrl,
      duration: duration || '',
      video_thumbnail: video_thumbnail || '',
      order: order || 0,
      isPreview,
      meta: {
        uploadedViaBase64: !!video_base64,
        uploadTimestamp: video_base64 ? new Date().toISOString() : undefined
      },
      resources: [],
    };

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find the week
    const week = course.curriculum.find(w => w.id === weekId);
    if (!week) {
      res.status(404);
      const availableWeeks = course.curriculum.map(w => w.id).join(', ');
      throw new Error(`Week not found. Available weeks: [${availableWeeks}]. Requested: ${weekId}`);
    }

    let addedLesson;

    if (sectionId) {
      // Add video lesson to a specific section
      const section = week.sections.find(s => s.id === sectionId);
      if (!section) {
        res.status(404);
        throw new Error("Section not found");
      }
      
      if (!section.lessons) {
        section.lessons = [];
      }
      
      section.lessons.push(videoLessonData);
      addedLesson = section.lessons[section.lessons.length - 1];
    } else {
      // Add video lesson directly to the week
      if (!week.lessons) {
        week.lessons = [];
      }
      
      week.lessons.push(videoLessonData);
      addedLesson = week.lessons[week.lessons.length - 1];
    }

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    res.status(201).json({
      success: true,
      message: `Video lesson added to ${sectionId ? 'section' : 'week'} successfully`,
      data: {
        ...addedLesson,
        uploadMethod: video_base64 ? 'base64' : 'url'
      }
    });
  } catch (error) {
    throw new Error(`Failed to add video lesson: ${error.message}`);
  }
});

/**
 * @desc    Add a section to a week
 * @route   POST /api/v1/courses/:type/:id/curriculum/weeks/:weekId/sections
 * @access  Private/Admin
 */
export const addSectionToWeek = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    const sectionData = req.body;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find the week
    const week = course.curriculum.find(w => w.id === weekId);
    if (!week) {
      res.status(404);
      throw new Error("Week not found");
    }

    // Initialize sections if it doesn't exist
    if (!week.sections) {
      week.sections = [];
    }

    // Add the new section
    week.sections.push(sectionData);

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    const addedSection = week.sections[week.sections.length - 1];

    res.status(201).json({
      success: true,
      message: "Section added to week successfully",
      data: addedSection
    });
  } catch (error) {
    throw new Error(`Failed to add section to week: ${error.message}`);
  }
});

/**
 * @desc    Add a live class to a week
 * @route   POST /api/v1/courses/:type/:id/curriculum/weeks/:weekId/live-classes
 * @access  Private/Admin
 */
export const addLiveClassToWeek = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    const liveClassData = req.body;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    // Find the week
    const week = course.curriculum.find(w => w.id === weekId);
    if (!week) {
      res.status(404);
      throw new Error("Week not found");
    }

    // Initialize liveClasses if it doesn't exist
    if (!week.liveClasses) {
      week.liveClasses = [];
    }

    // Add the new live class
    week.liveClasses.push(liveClassData);

    // Reassign all IDs to maintain consistency
    assignCurriculumIds(course.curriculum);

    await course.save();

    const addedLiveClass = week.liveClasses[week.liveClasses.length - 1];

    res.status(201).json({
      success: true,
      message: "Live class added to week successfully",
      data: addedLiveClass
    });
  } catch (error) {
    throw new Error(`Failed to add live class to week: ${error.message}`);
  }
});

/**
 * @desc    Get curriculum statistics for a course
 * @route   GET /api/v1/courses/:type/:id/curriculum/stats
 * @access  Public
 */
export const getCurriculumStats = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id).select('curriculum course_title');
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id).select('curriculum course_title');
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    const curriculum = course.curriculum || [];
    
    // Calculate statistics
    let totalLessons = 0;
    let totalSections = 0;
    let totalLiveClasses = 0;
    let totalResources = 0;
    
    curriculum.forEach(week => {
      // Count direct lessons under weeks
      if (week.lessons) {
        totalLessons += week.lessons.length;
        // Count resources in direct lessons
        week.lessons.forEach(lesson => {
          if (lesson.resources) {
            totalResources += lesson.resources.length;
          }
        });
      }
      
      // Count live classes
      if (week.liveClasses) {
        totalLiveClasses += week.liveClasses.length;
      }
      
      // Count sections and their lessons
      if (week.sections) {
        totalSections += week.sections.length;
        week.sections.forEach(section => {
          if (section.lessons) {
            totalLessons += section.lessons.length;
            // Count resources in section lessons
            section.lessons.forEach(lesson => {
              if (lesson.resources) {
                totalResources += lesson.resources.length;
              }
            });
          }
          // Count section resources
          if (section.resources) {
            totalResources += section.resources.length;
          }
        });
      }
    });

    res.json({
      success: true,
      data: {
        course_id: course._id,
        course_title: course.course_title,
        curriculum_stats: {
          total_weeks: curriculum.length,
          total_lessons: totalLessons,
          total_sections: totalSections,
          total_live_classes: totalLiveClasses,
          total_resources: totalResources
        },
        weekly_breakdown: curriculum.map(week => ({
          week_id: week.id,
          week_title: week.weekTitle,
          lessons_count: (week.lessons || []).length,
          sections_count: (week.sections || []).length,
          live_classes_count: (week.liveClasses || []).length,
          sections_lessons_count: (week.sections || []).reduce((sum, section) => 
            sum + ((section.lessons || []).length), 0)
        }))
      }
    });
  } catch (error) {
    throw new Error(`Failed to get curriculum statistics: ${error.message}`);
  }
});

/**
 * @desc    Reorder weeks in curriculum
 * @route   PUT /api/v1/courses/:type/:id/curriculum/reorder
 * @access  Private/Admin
 */
export const reorderCurriculumWeeks = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    const { weekOrder } = req.body; // Array of week IDs in new order
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    if (!Array.isArray(weekOrder)) {
      res.status(400);
      throw new Error("Week order must be an array of week IDs");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id);
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    const curriculum = course.curriculum || [];
    
    if (weekOrder.length !== curriculum.length) {
      res.status(400);
      throw new Error("Week order array must contain all existing week IDs");
    }

    // Reorder the curriculum based on the provided order
    const reorderedCurriculum = weekOrder.map(weekId => {
      const week = curriculum.find(w => w.id === weekId);
      if (!week) {
        throw new Error(`Week with ID ${weekId} not found`);
      }
      return week;
    });

    course.curriculum = reorderedCurriculum;

    // Reassign all IDs to maintain consistency with new order
    assignCurriculumIds(course.curriculum);

    await course.save();

    res.json({
      success: true,
      message: "Curriculum weeks reordered successfully",
      data: {
        new_order: course.curriculum.map(week => ({
          id: week.id,
          title: week.weekTitle
        }))
      }
    });
  } catch (error) {
    throw new Error(`Failed to reorder curriculum weeks: ${error.message}`);
  }
}); 

/**
 * @desc    Collaborative endpoint to fetch courses from both new and legacy structures
 * @route   GET /api/v1/tcourse/collab
 * @access  Public
 * @param   {string} source - Specify source: 'new', 'legacy', 'both' (default: 'both')
 * @param   {string} merge_strategy - How to merge results: 'separate', 'unified', 'prioritize_new' (default: 'unified')
 * @param   {boolean} include_metadata - Include source metadata and comparison data (default: true)
 * @param   {boolean} deduplicate - Remove duplicate courses based on title similarity (default: false)
 * @param   {number} similarity_threshold - Threshold for deduplication (0-1, default: 0.8)
 * @param   {string} comparison_mode - 'detailed', 'summary', 'none' (default: 'summary')
 */
export const collaborativeCourseFetch = asyncHandler(async (req, res) => {
  try {
    const {
      source = 'both',
      merge_strategy = 'unified',
      include_metadata = 'true',
      deduplicate = 'false',
      similarity_threshold = '0.8',
      comparison_mode = 'summary',
      page = 1,
      limit = 20,
      search,
      currency,
      course_category,
      class_type,
      course_grade,
      status = 'Published',
      sort_by = 'createdAt',
      sort_order = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const threshold = parseFloat(similarity_threshold);

    // Build common filter
    const buildFilter = () => {
      const filter = {};
      
      if (status) {
        filter.status = { $regex: status, $options: "i" };
      }
      
      if (search) {
        const searchTerm = fullyDecodeURIComponent(search);
        filter.$or = [
          { course_title: { $regex: createSafeRegex(searchTerm) } },
          { course_category: { $regex: createSafeRegex(searchTerm) } },
          { course_tag: { $regex: createSafeRegex(searchTerm) } },
          { course_grade: { $regex: createSafeRegex(searchTerm) } }
        ];
      }
      
      if (course_category) {
        filter.course_category = fullyDecodeURIComponent(course_category);
      }
      
      if (class_type) {
        const decodedClassType = fullyDecodeURIComponent(class_type);
        filter.class_type = { $regex: createSafeRegex(decodedClassType) };
      }
      
      if (course_grade) {
        filter.course_grade = fullyDecodeURIComponent(course_grade);
      }
      
      if (currency) {
        filter["prices.currency"] = currency.toUpperCase();
      }
      
      return filter;
    };

    const filter = buildFilter();
    const sortOptions = {};
    sortOptions[sort_by] = sort_order === 'asc' ? 1 : -1;

    let newCourses = [];
    let legacyCourses = [];
    let metadata = {
      fetch_timestamp: new Date().toISOString(),
      source_strategy: source,
      merge_strategy,
      filters_applied: filter,
      performance: {}
    };

    // Fetch from new course-types models
    if (source === 'new' || source === 'both') {
      const newStartTime = Date.now();
      
      try {
        const [blendedResults, liveResults, freeResults] = await Promise.all([
          BlendedCourse.find(filter)
            .populate({
              path: 'assigned_instructor',
              select: 'full_name email role domain',
              match: { role: { $in: ['instructor'] } }
            })
            .sort(sortOptions)
            .lean(),
          LiveCourse.find(filter)
            .populate({
              path: 'assigned_instructor',
              select: 'full_name email role domain',
              match: { role: { $in: ['instructor'] } }
            })
            .sort(sortOptions)
            .lean(),
          FreeCourse.find(filter)
            .populate({
              path: 'assigned_instructor',
              select: 'full_name email role domain',
              match: { role: { $in: ['instructor'] } }
            })
            .sort(sortOptions)
            .lean()
        ]);

        newCourses = [
          ...blendedResults.map(c => ({ 
            ...c, 
            course_type: 'blended', 
            _source: 'new_model',
            _model: 'BlendedCourse',
            _fetch_time: Date.now() - newStartTime
          })),
          ...liveResults.map(c => ({ 
            ...c, 
            course_type: 'live', 
            _source: 'new_model',
            _model: 'LiveCourse',
            _fetch_time: Date.now() - newStartTime
          })),
          ...freeResults.map(c => ({ 
            ...c, 
            course_type: 'free', 
            _source: 'new_model',
            _model: 'FreeCourse',
            _fetch_time: Date.now() - newStartTime
          }))
        ];

        metadata.performance.new_model = {
          fetch_time_ms: Date.now() - newStartTime,
          total_courses: newCourses.length,
          breakdown: {
            blended: blendedResults.length,
            live: liveResults.length,
            free: freeResults.length
          }
        };
      } catch (error) {
        metadata.errors = metadata.errors || {};
        metadata.errors.new_model = error.message;
      }
    }

    // Fetch from legacy Course model
    if (source === 'legacy' || source === 'both') {
      const legacyStartTime = Date.now();
      
      try {
        const legacyResults = await Course.find(filter)
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .sort(sortOptions)
      .lean();

        legacyCourses = legacyResults.map(course => {
      const detectedType = determineCourseType(course);
      return {
        ...mapLegacyCourseToType(course, detectedType),
            _source: 'legacy_model',
            _model: 'Course',
            _detected_type: detectedType,
            _fetch_time: Date.now() - legacyStartTime
      };
    });

        metadata.performance.legacy_model = {
          fetch_time_ms: Date.now() - legacyStartTime,
          total_courses: legacyCourses.length,
          type_distribution: legacyCourses.reduce((acc, course) => {
            acc[course._detected_type] = (acc[course._detected_type] || 0) + 1;
            return acc;
          }, {})
        };
      } catch (error) {
        metadata.errors = metadata.errors || {};
        metadata.errors.legacy_model = error.message;
      }
    }

    // Deduplication logic
    const deduplicateCourses = (courses) => {
      if (deduplicate !== 'true') return courses;
      
      const dedupStartTime = Date.now();
      const unique = [];
      const duplicates = [];
      
      for (const course of courses) {
        const isDuplicate = unique.some(existing => {
          const titleSimilarity = calculateStringSimilarity(
            course.course_title?.toLowerCase() || '',
            existing.course_title?.toLowerCase() || ''
          );
          return titleSimilarity >= threshold;
        });
        
        if (isDuplicate) {
          duplicates.push(course);
        } else {
          unique.push(course);
        }
      }
      
      metadata.deduplication = {
        enabled: true,
        threshold,
        original_count: courses.length,
        unique_count: unique.length,
        duplicates_removed: duplicates.length,
        processing_time_ms: Date.now() - dedupStartTime,
        duplicate_courses: duplicates.map(d => ({
          id: d._id,
          title: d.course_title,
          source: d._source
        }))
      };
      
      return unique;
    };

    // String similarity calculation (simple Levenshtein-based)
    const calculateStringSimilarity = (str1, str2) => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    };

    const levenshteinDistance = (str1, str2) => {
      const matrix = [];
      
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    };

    // Merge strategies
    let finalCourses = [];
    
    switch (merge_strategy) {
      case 'separate':
        finalCourses = {
          new_courses: deduplicateCourses(newCourses),
          legacy_courses: deduplicateCourses(legacyCourses)
        };
        break;
        
      case 'prioritize_new':
        // Add new courses first, then legacy courses that don't have new equivalents
        const newTitles = new Set(newCourses.map(c => c.course_title?.toLowerCase()));
        const uniqueLegacy = legacyCourses.filter(c => 
          !newTitles.has(c.course_title?.toLowerCase())
        );
        finalCourses = deduplicateCourses([...newCourses, ...uniqueLegacy]);
        break;
        
      case 'unified':
      default:
        finalCourses = deduplicateCourses([...newCourses, ...legacyCourses]);
        break;
    }

    // Apply formatting
    if (Array.isArray(finalCourses)) {
      finalCourses = processCoursesResponse(finalCourses);
    } else {
      finalCourses.new_courses = processCoursesResponse(finalCourses.new_courses);
      finalCourses.legacy_courses = processCoursesResponse(finalCourses.legacy_courses);
    }

    // Apply pagination for unified results
    let paginatedCourses = finalCourses;
    let totalCount = 0;
    
    if (Array.isArray(finalCourses)) {
      totalCount = finalCourses.length;
      paginatedCourses = finalCourses.slice(skip, skip + limitNum);
    } else {
      totalCount = finalCourses.new_courses.length + finalCourses.legacy_courses.length;
      // For separate strategy, paginate each separately
      finalCourses.new_courses = finalCourses.new_courses.slice(0, Math.ceil(limitNum / 2));
      finalCourses.legacy_courses = finalCourses.legacy_courses.slice(0, Math.ceil(limitNum / 2));
      paginatedCourses = finalCourses;
    }

    // Generate comparison data
    let comparison = null;
    if (comparison_mode !== 'none' && source === 'both') {
      comparison = generateComparison(newCourses, legacyCourses, comparison_mode);
    }

    // Build response
    const response = {
      success: true,
      data: paginatedCourses,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        strategy: merge_strategy
      },
      collaboration: {
        source_strategy: source,
        merge_strategy,
        total_sources: source === 'both' ? 2 : 1,
        data_freshness: {
          new_model: newCourses.length > 0,
          legacy_model: legacyCourses.length > 0
        }
      }
    };

    // Add metadata if requested
    if (include_metadata === 'true') {
      response.metadata = metadata;
    }

    // Add comparison if generated
    if (comparison) {
      response.comparison = comparison;
    }

    res.status(200).json(response);
  } catch (error) {
    throw new Error(`Collaborative fetch failed: ${error.message}`);
  }
});

// Helper function to generate comparison data
const generateComparison = (newCourses, legacyCourses, mode) => {
  const comparison = {
    summary: {
      new_model_count: newCourses.length,
      legacy_model_count: legacyCourses.length,
      total_unique_courses: newCourses.length + legacyCourses.length
    }
  };

  if (mode === 'detailed') {
    // Field coverage analysis
    const analyzeFieldCoverage = (courses, modelName) => {
      const fields = {};
      courses.forEach(course => {
        Object.keys(course).forEach(field => {
          if (!field.startsWith('_')) {
            fields[field] = (fields[field] || 0) + 1;
          }
        });
      });
      
      return {
        total_courses: courses.length,
        fields_coverage: Object.entries(fields).map(([field, count]) => ({
          field,
          coverage_count: count,
          coverage_percentage: ((count / courses.length) * 100).toFixed(2)
        })).sort((a, b) => b.coverage_count - a.coverage_count)
      };
    };

    comparison.detailed = {
      new_model_analysis: analyzeFieldCoverage(newCourses, 'new'),
      legacy_model_analysis: analyzeFieldCoverage(legacyCourses, 'legacy'),
      schema_differences: {
        new_only_fields: [],
        legacy_only_fields: [],
        common_fields: []
      }
    };

    // Find schema differences
    const newFields = new Set();
    const legacyFields = new Set();
    
    newCourses.forEach(course => {
      Object.keys(course).forEach(field => {
        if (!field.startsWith('_')) newFields.add(field);
      });
    });
    
    legacyCourses.forEach(course => {
      Object.keys(course).forEach(field => {
        if (!field.startsWith('_')) legacyFields.add(field);
      });
    });

    comparison.detailed.schema_differences.new_only_fields = 
      [...newFields].filter(field => !legacyFields.has(field));
    comparison.detailed.schema_differences.legacy_only_fields = 
      [...legacyFields].filter(field => !newFields.has(field));
    comparison.detailed.schema_differences.common_fields = 
      [...newFields].filter(field => legacyFields.has(field));
  }

  return comparison;
};

/**
 * @desc    Get a specific week from course curriculum
 * @route   GET /api/v1/tcourse/:type/:id/curriculum/weeks/:weekId
 * @access  Public
 */
export const getCurriculumWeek = asyncHandler(async (req, res) => {
  try {
    const { type, id, weekId } = req.params;
    
    if (!validateObjectId(id)) {
      res.status(400);
      throw new Error("Invalid course ID format");
    }

    let course = null;

    // Try to find in the new type-specific model first
    try {
      const CourseModel = getCourseModel(type);
      course = await CourseModel.findById(id).select('curriculum course_title');
    } catch (error) {
      console.log(`No specific model for type ${type}, trying legacy model`);
    }

    // If not found in new model, try legacy model
    if (!course) {
      course = await Course.findById(id).select('curriculum course_title');
    }

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    if (!course.curriculum || course.curriculum.length === 0) {
      res.status(404);
      throw new Error("No curriculum found for this course");
    }

    // Find the specific week by ID
    const week = course.curriculum.find(week => week.id === weekId);
    if (!week) {
      res.status(404);
      throw new Error("Week not found in curriculum");
    }

    res.json({
      success: true,
      data: {
        course_id: course._id,
        course_title: course.course_title,
        week: week,
        total_weeks: course.curriculum.length,
        current_week_index: course.curriculum.findIndex(w => w.id === weekId) + 1,
        source: course._legacy ? "legacy_model" : "new_model"
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch curriculum week: ${error.message}`);
  }
});