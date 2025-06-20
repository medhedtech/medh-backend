import mime from "mime-types";
import mongoose from "mongoose";

import ENV_VARS from "../config/env.js";
import Bookmark from "../models/bookmark-model.js";
import Course from "../models/course-model.js";
import { BlendedCourse, LiveCourse, FreeCourse } from "../models/course-types/index.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Enrollment from "../models/enrollment-model.js";
import Note from "../models/note-model.js";
import Progress from "../models/progress-model.js";
import catchAsync from "../utils/catchAsync.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";
import { responseFormatter } from "../utils/responseFormatter.js";
import {
  getFileStream,
  createPresignedPost,
  getPresignedUrl,
  deleteS3Object,
} from "../utils/s3Service.js";
import {
  uploadBase64FileOptimized,
  uploadFile,
  UploadError,
} from "../utils/uploadFile.js";
import {
  validateCourseData,
  validateVideoLessonData,
  validateQuizLessonData,
} from "../validations/courseValidation.js";
import { generateSignedUrl } from "../utils/cloudfrontSigner.js";

// Mark unused imports with underscore prefix to avoid linting errors
const _AppError = AppError;
const _validateCourseData = validateCourseData;
const _validateVideoLessonData = validateVideoLessonData;
const _validateQuizLessonData = validateQuizLessonData;
const _createPresignedPost = createPresignedPost;
const _getPresignedUrl = getPresignedUrl;
const _deleteS3Object = deleteS3Object;

/* ------------------------------ */
/* Helper Functions               */
/* ------------------------------ */

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

// Group courses by class type (live and blended)
const groupCoursesByClassType = (coursesData) => {
  if (!coursesData || !coursesData.data || !coursesData.data.courses || !Array.isArray(coursesData.data.courses)) {
    return coursesData;
  }
  
  // Create a copy of the response structure
  const result = {
    ...coursesData,
    data: {
      ...coursesData.data,
      live: [],
      blended: []
    }
  };
  
  // Categorize courses by class_type
  coursesData.data.courses.forEach(course => {
    // Check various fields that might indicate live vs blended course type
    const isLiveCourse = 
      course.category_type === 'Live' || 
      (course.class_type && course.class_type.toLowerCase().includes('live')) ||
      (course.delivery_format === 'Live');
    
    if (isLiveCourse) {
      result.data.live.push(course);
    } else {
      result.data.blended.push(course);
    }
  });
  
  // Keep original courses array for backward compatibility
  return result;
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

/* ------------------------------ */
/* COURSE IMAGE UPLOAD FUNCTIONS */
/* ------------------------------ */

/**
 * @desc    Upload course image using base64 and optionally update course
 * @route   POST /api/courses/upload-image OR POST /api/courses/:id/upload-image
 * @access  Private/Admin
 */
const uploadCourseImage = async (req, res) => {
  try {
    const { base64String, fileType = "image" } = req.body;
    const { id: courseId } = req.params; // Get course ID from URL if present

    if (!base64String) {
      return res.status(400).json({
        success: false,
        message: "Base64 string is required",
      });
    }

    // Validate that it's an image
    if (fileType !== "image") {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed for course images",
      });
    }

    // If course ID is provided, validate it exists
    let course = null;
    if (courseId) {
      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID format",
        });
      }

      course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
    }

    // Handle both raw base64 strings and data URIs
    let mimeType;
    let base64Data;
    
    if (base64String.startsWith("data:")) {
      // It's already a data URI, extract MIME type
      const mimeTypeMatch = base64String.match(/^data:(.*?);base64,(.*)$/);
      if (!mimeTypeMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid data URI format",
        });
      }
      mimeType = mimeTypeMatch[1];
      base64Data = mimeTypeMatch[2];
    } else {
      // It's a raw base64 string, assume JPEG
      mimeType = "image/jpeg";
      base64Data = base64String;
    }

    // Validate that it's an image MIME type
    if (!mimeType.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only images are allowed",
      });
    }

    // Upload the image
    const result = await uploadBase64FileOptimized(base64Data, mimeType, "images");

    // If course ID is provided, update the course with the new image
    if (course) {
      course.course_image = result.data.url;
      await course.save();

      return res.status(200).json({
        success: true,
        message: "Course image uploaded and course updated successfully",
        data: {
          courseId: course._id,
          imageUrl: result.data.url,
          key: result.data.key,
          size: result.data.size,
          course: {
            id: course._id,
            title: course.course_title,
            image: course.course_image,
          },
        },
      });
    }

    // If no course ID, just return the upload result
    res.status(200).json({
      success: true,
      message: "Course image uploaded successfully",
      data: {
        imageUrl: result.data.url,
        key: result.data.key,
        size: result.data.size,
      },
    });
  } catch (error) {
    console.error("Course image upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload course image",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload course image using multipart form data and optionally update course
 * @route   POST /api/courses/upload-image-file OR POST /api/courses/:id/upload-image-file
 * @access  Private/Admin
 */
const uploadCourseImageFile = async (req, res) => {
  try {
    const { id: courseId } = req.params; // Get course ID from URL if present

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    // Validate that it's an image
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    // If course ID is provided, validate it exists
    let course = null;
    if (courseId) {
      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID format",
        });
      }

      course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
    }

    // Generate a unique key for the image
    const ext = req.file.mimetype.split("/")[1];
    const key = `images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const uploadParams = {
      key,
      file: req.file.buffer,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
    };

    const result = await uploadFile(uploadParams);

    // If course ID is provided, update the course with the new image
    if (course) {
      course.course_image = result.data.url;
      await course.save();

      return res.status(200).json({
        success: true,
        message: "Course image uploaded and course updated successfully",
        data: {
          courseId: course._id,
          imageUrl: result.data.url,
          key: result.data.key,
          size: result.data.size,
          course: {
            id: course._id,
            title: course.course_title,
            image: course.course_image,
          },
        },
      });
    }

    // If no course ID, just return the upload result
    res.status(200).json({
      success: true,
      message: "Course image uploaded successfully",
      data: {
        imageUrl: result.data.url,
        key: result.data.key,
        size: result.data.size,
      },
    });
  } catch (error) {
    console.error("Course image file upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload course image",
      error: error.message,
    });
  }
};

/* ------------------------------ */
/* COURSE CREATION & GENERAL ENDPOINTS */
/* ------------------------------ */

/**
 * @desc    Create a new course with integrated lessons
 * @route   POST /api/courses/create
 * @access  Private/Admin
 */
const createCourse = async (req, res) => {
  try {
    if (req.fileError) {
      return res.status(400).json({ success: false, message: req.fileError });
    }

    // Handle file upload if present
    if (req.file) {
      req.body.course_image = req.file.location;
    }

    // Handle base64 image upload if present
    if (req.body.course_image_base64 && !req.body.course_image) {
      try {
        const { course_image_base64 } = req.body;
        
        // Handle both raw base64 strings and data URIs
        let mimeType;
        let base64Data;
        
        if (course_image_base64.startsWith("data:")) {
          const mimeTypeMatch = course_image_base64.match(/^data:(.*?);base64,(.*)$/);
          if (!mimeTypeMatch) {
            return res.status(400).json({
              success: false,
              message: "Invalid course image data URI format",
            });
          }
          mimeType = mimeTypeMatch[1];
          base64Data = mimeTypeMatch[2];
        } else {
          mimeType = "image/jpeg";
          base64Data = course_image_base64;
        }

        // Validate that it's an image MIME type
        if (!mimeType.startsWith("image/")) {
          return res.status(400).json({
            success: false,
            message: "Course image must be a valid image file",
          });
        }

        // Upload the image
        const uploadResult = await uploadBase64FileOptimized(base64Data, mimeType, "images");
        req.body.course_image = uploadResult.data.url;
        
        // Remove the base64 data from the request body
        delete req.body.course_image_base64;
      } catch (uploadError) {
        console.error("Error uploading course image:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload course image",
          error: uploadError.message,
        });
      }
    }

    // Extract course data from request body
    const courseData = req.body;

    // If curriculum data is provided as JSON string, parse it
    if (courseData.curriculum && typeof courseData.curriculum === "string") {
      try {
        courseData.curriculum = JSON.parse(courseData.curriculum);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid curriculum data format. Expected valid JSON.",
          error: parseError.message,
        });
      }
    }

    // Process curriculum and assign IDs if needed
    if (courseData.curriculum && Array.isArray(courseData.curriculum)) {
      assignCurriculumIds(courseData.curriculum);
    }

    // Create new course with embedded lessons
    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      success: true,
      message: "Course created successfully with integrated lessons",
      data: course,
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all courses without pagination (includes both legacy and new course types)
 * @route   GET /api/courses/get
 * @access  Public
 */
const getAllCourses = async (req, res) => {
  try {
    // Get courses from legacy Course model
    const legacyCourses = await Course.find(
      {},
      {
        course_title: 1,
        course_category: 1,
        course_tag: 1,
        course_image: 1,
        course_fee: 1,
        isFree: 1,
        status: 1,
        category_type: 1,
        class_type: 1,
        createdAt: 1,
        prices: 1,
        course_duration: 1,
        assigned_instructor: 1,
      },
    )
    .populate({
      path: 'assigned_instructor',
      select: 'full_name email role domain',
      match: { role: { $in: ['instructor'] } }
    })
    .lean();

    // Get courses from new course-types models
    const [blendedCourses, liveCourses, freeCourses] = await Promise.all([
      BlendedCourse.find({}, {
        course_title: 1,
        course_category: 1,
        course_tag: 1,
        course_image: 1,
        course_fee: 1,
        isFree: 1,
        status: 1,
        category_type: 1,
        class_type: 1,
        createdAt: 1,
        prices: 1,
        course_duration: 1,
        assigned_instructor: 1,
      })
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .lean(),
      LiveCourse.find({}, {
        course_title: 1,
        course_category: 1,
        course_tag: 1,
        course_image: 1,
        course_fee: 1,
        isFree: 1,
        status: 1,
        category_type: 1,
        class_type: 1,
        createdAt: 1,
        prices: 1,
        course_duration: 1,
        assigned_instructor: 1,
      })
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .lean(),
      FreeCourse.find({}, {
        course_title: 1,
        course_category: 1,
        course_tag: 1,
        course_image: 1,
        course_fee: 1,
        isFree: 1,
        status: 1,
        category_type: 1,
        class_type: 1,
        createdAt: 1,
        prices: 1,
        course_duration: 1,
        assigned_instructor: 1,
      })
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain',
        match: { role: { $in: ['instructor'] } }
      })
      .lean()
    ]);

    // Combine all courses and mark course types
    const newTypeCourses = [
      ...blendedCourses.map(c => ({ ...c, course_type: "blended", _source: "new_model" })),
      ...liveCourses.map(c => ({ ...c, course_type: "live", _source: "new_model" })),
      ...freeCourses.map(c => ({ ...c, course_type: "free", _source: "new_model" }))
    ];

    const legacyCoursesMarked = legacyCourses.map(c => ({ ...c, _source: "legacy_model" }));
    const allCourses = [...legacyCoursesMarked, ...newTypeCourses];
    
    // Format course durations
    const processedCourses = processCoursesResponse(allCourses);
    
    res
      .status(200)
      .json({ 
        success: true, 
        count: processedCourses.length, 
        data: processedCourses,
        sources: {
          legacy_model: legacyCoursesMarked.length,
          new_model: newTypeCourses.length
        }
      });
  } catch (error) {
    console.error("Error fetching all courses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching courses",
      error: error.message || "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Get all courses with filtering, pagination and search (advanced)
 * @route   GET /api/courses/search
 * @access  Public
 * @param   {number} page - Page number for pagination (default: 1)
 * @param   {number} limit - Number of results per page (default: 10)
 * @param   {string} search - Text search term
 * @param   {string} sort_by - Field to sort by (createdAt, price, popularity, ratings)
 * @param   {string} sort_order - Sort order (asc, desc)
 * @param   {string} course_category - Filter by course category, can be comma-separated for multiple values
 * @param   {string} status - Filter by course status
 * @param   {string} currency - Filter by currency code (e.g., 'inr', 'usd')
 */
const getAllCoursesWithLimits = async (req, res) => {
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
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pagination parameters. Page and limit must be positive numbers.",
      });
    }

    const filter = {};
    const textSearchFields = {};
    let requestedCurrency = null;
    let shouldFallbackToUSD = false;

    // Handle currency logic with fallback to USD
    if (currency) {
      requestedCurrency = fullyDecodeURIComponent(currency).toUpperCase();
      
      // First, check if any courses exist with the requested currency
      const coursesWithRequestedCurrency = await Course.countDocuments({
        "prices.currency": requestedCurrency,
        status: "Published" // Only check published courses
      });
      
      if (coursesWithRequestedCurrency === 0) {
        // No courses found with requested currency, fallback to USD
        shouldFallbackToUSD = true;
        filter["prices.currency"] = "USD";
      } else {
        // Courses exist with requested currency, use it
        filter["prices.currency"] = requestedCurrency;
      }
    }

    if (search) {
      const decodedSearch = fullyDecodeURIComponent(search);
      if (decodedSearch.length >= 3) {
        filter.$text = { $search: decodedSearch };
        textSearchFields.score = { $meta: "textScore" };
      } else {
        filter.$or = [
          { course_title: { $regex: createSafeRegex(decodedSearch) } },
          { course_category: { $regex: createSafeRegex(decodedSearch) } },
          { course_tag: { $regex: createSafeRegex(decodedSearch) } },
          {
            "course_description.program_overview": {
              $regex: createSafeRegex(decodedSearch),
            },
          },
          {
            "course_description.benefits": {
              $regex: createSafeRegex(decodedSearch),
            },
          },
          { course_grade: { $regex: createSafeRegex(decodedSearch) } },
        ];
      }
    }

    if (course_duration)
      filter.course_duration = fullyDecodeURIComponent(course_duration);
    if (min_hours_per_week)
      filter.min_hours_per_week = fullyDecodeURIComponent(min_hours_per_week);
    if (max_hours_per_week)
      filter.max_hours_per_week = fullyDecodeURIComponent(max_hours_per_week);
    if (no_of_Sessions)
      filter.no_of_Sessions = fullyDecodeURIComponent(no_of_Sessions);
    if (description)
      filter.course_description = fullyDecodeURIComponent(description);
    if (course_grade)
      filter.course_grade = fullyDecodeURIComponent(course_grade);

    const handleArrayOrStringFilter = (field, value) => {
      if (!value) return;
      
      console.log(`Processing ${field} filter with value:`, value);
      
      if (Array.isArray(value)) {
        const decodedValues = value.map((item) =>
          fullyDecodeURIComponent(item),
        );
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
          // Create case-insensitive patterns that match anywhere in the string
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
    } else {
      // If no class_type specified, use standard handler
      handleArrayOrStringFilter("class_type", class_type);
    }

    if (status) {
      const decodedStatus = fullyDecodeURIComponent(status);
      if (decodedStatus.includes(",")) {
        // If multiple statuses are provided, use $in with exact string values
        filter.status = {
          $in: decodedStatus.split(",").map(s => s.trim())
        };
      } else {
        // For single status, use exact string match
        filter.status = decodedStatus;
      }
    }

    if (price_range) {
      const [min, max] = price_range.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filter.course_fee = { $gte: min, $lte: max };
      }
    }

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

    // Add detailed logging for course_category
    if (course_category) {
      console.log("Original course_category parameter:", course_category);
      console.log("Processed course_category filter:", JSON.stringify(filter.course_category, null, 2));
    }

    const sortOptions = {};
    if (search && sort_by === "relevance" && filter.$text) {
      sortOptions.score = { $meta: "textScore" };
    } else if (sort_by === "price") {
      sortOptions.course_fee = sort_order === "asc" ? 1 : -1;
    } else if (sort_by === "popularity") {
      sortOptions["meta.views"] = -1;
      sortOptions["meta.enrollments"] = -1;
    } else if (sort_by === "ratings") {
      sortOptions["meta.ratings.average"] = -1;
    } else {
      sortOptions[sort_by] = sort_order === "asc" ? 1 : -1;
    }

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
    };

    if (filter.$text) {
      projection.score = { $meta: "textScore" };
    }

    const aggregationPipeline = [
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
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: projection },
    ];

    const [courses, totalCourses, facets] = await Promise.all([
      Course.aggregate(aggregationPipeline),
      Course.countDocuments(filter),
      Course.aggregate([
        { $match: filter },
        {
          $facet: {
            categories: [
              { $group: { _id: "$course_category", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            categoryTypes: [
              { $group: { _id: "$category_type", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            tags: [
              { $group: { _id: "$course_tag", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            classTypes: [
              { $group: { _id: "$class_type", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            deliveryFormats: [
              // Add computed field for normalized delivery format
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
            ],
            priceRanges: [
              {
                $group: {
                  _id: null,
                  minPrice: { $min: "$prices.individual" },
                  maxPrice: { $max: "$prices.batch" },
                },
              },
            ],
          },
        },
      ]),
    ]);

    // Post-process results to filter prices by currency
    let processedCourses = courses;
    const effectiveCurrency = shouldFallbackToUSD ? "USD" : (requestedCurrency || null);
    
    if (effectiveCurrency) {
      processedCourses = courses.map((course) => {
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

    const response = {
      success: true,
      data: {
        courses: processedCourses,
        pagination: {
          total: totalCourses,
          page,
          limit,
          totalPages: Math.ceil(totalCourses / limit),
        },
        facets: facets[0],
      },
    };

    // Add currency fallback information to response for frontend awareness
    if (shouldFallbackToUSD && requestedCurrency) {
      response.data.currency_fallback = {
        requested: requestedCurrency,
        used: "USD",
        message: `No courses found with ${requestedCurrency} pricing. Showing USD prices instead.`
      };
    }

    // Group courses by class type if requested
    if (req.query.group_by_class_type === 'true') {
      res.status(200).json(groupCoursesByClassType(response));
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    console.error("Error in getAllCoursesWithLimits:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching courses",
      error: error.message || "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Get course by ID with extended curriculum details (searches both legacy and new course types)
 * @route   GET /api/courses/:id
 * @access  Public
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { currency } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format",
      });
    }

    let course = null;
    let source = "legacy_model";

    // First, try to find in legacy Course model
    course = await Course.findById(id)
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain phone_numbers',
        match: { role: { $in: ['instructor'] } }
      })
      .lean();

    // If not found in legacy, search in new course-types models
    if (!course) {
      const [blendedCourse, liveCourse, freeCourse] = await Promise.all([
        BlendedCourse.findById(id)
          .populate({
            path: 'assigned_instructor',
            select: 'full_name email role domain phone_numbers',
            match: { role: { $in: ['instructor'] } }
          })
          .lean(),
        LiveCourse.findById(id)
          .populate({
            path: 'assigned_instructor',
            select: 'full_name email role domain phone_numbers',
            match: { role: { $in: ['instructor'] } }
          })
          .lean(),
        FreeCourse.findById(id)
          .populate({
            path: 'assigned_instructor',
            select: 'full_name email role domain phone_numbers',
            match: { role: { $in: ['instructor'] } }
          })
          .lean()
      ]);

      // Check which model returned the course
      if (blendedCourse) {
        course = { ...blendedCourse, course_type: "blended" };
        source = "new_model";
      } else if (liveCourse) {
        course = { ...liveCourse, course_type: "live" };
        source = "new_model";
      } else if (freeCourse) {
        course = { ...freeCourse, course_type: "free" };
        source = "new_model";
      }
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Handle currency filtering if specified
    let processedCourse = course;
    if (currency && course.prices && course.prices.length > 0) {
      const upperCaseCurrency = currency.toUpperCase();
      processedCourse = { 
        ...course,
        prices: course.prices.filter(
          (price) => price.currency === upperCaseCurrency
        )
      };
    }

    // Apply formatting to course duration
    processedCourse = processCoursesResponse(processedCourse);

    res.status(200).json({
      success: true,
      data: processedCourse,
      source: source,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course details",
      error: error.message || "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Update a course with integrated lessons
 * @route   PUT /api/courses/:id
 * @access  Private/Admin
 */
const updateCourse = async (req, res) => {
  try {
    if (req.fileError) {
      return res.status(400).json({ success: false, message: req.fileError });
    }

    const courseData = { ...req.body };

    // Handle file upload if present
    if (req.file) {
      courseData.course_image = req.file.location;
    }

    // Handle base64 image upload if present
    if (courseData.course_image_base64 && !courseData.course_image) {
      try {
        const { course_image_base64 } = courseData;
        
        // Handle both raw base64 strings and data URIs
        let mimeType;
        let base64Data;
        
        if (course_image_base64.startsWith("data:")) {
          const mimeTypeMatch = course_image_base64.match(/^data:(.*?);base64,(.*)$/);
          if (!mimeTypeMatch) {
            return res.status(400).json({
              success: false,
              message: "Invalid course image data URI format",
            });
          }
          mimeType = mimeTypeMatch[1];
          base64Data = mimeTypeMatch[2];
        } else {
          mimeType = "image/jpeg";
          base64Data = course_image_base64;
        }

        // Validate that it's an image MIME type
        if (!mimeType.startsWith("image/")) {
          return res.status(400).json({
            success: false,
            message: "Course image must be a valid image file",
          });
        }

        // Upload the image
        const uploadResult = await uploadBase64FileOptimized(base64Data, mimeType, "images");
        courseData.course_image = uploadResult.data.url;
        
        // Remove the base64 data from the course data
        delete courseData.course_image_base64;
      } catch (uploadError) {
        console.error("Error uploading course image:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload course image",
          error: uploadError.message,
        });
      }
    }

    // If curriculum data is provided as JSON string, parse it
    if (courseData.curriculum && typeof courseData.curriculum === "string") {
      try {
        courseData.curriculum = JSON.parse(courseData.curriculum);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid curriculum data format. Expected valid JSON.",
          error: parseError.message,
        });
      }
    }

    // Reassign IDs if curriculum structure changed
    if (courseData.curriculum && Array.isArray(courseData.curriculum)) {
      assignCurriculumIds(courseData.curriculum);
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      courseData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete course by ID
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format",
      });
    }

    let deletedCourse = null;
    let source = "legacy_model";

    // First, try to delete from legacy Course model
    deletedCourse = await Course.findByIdAndDelete(id);

    // If not found in legacy, search and delete in new course-types models
    if (!deletedCourse) {
      const [blendedResult, liveResult, freeResult] = await Promise.all([
        BlendedCourse.findByIdAndDelete(id),
        LiveCourse.findByIdAndDelete(id),
        FreeCourse.findByIdAndDelete(id)
      ]);

      // Check which model contained the course
      if (blendedResult) {
        deletedCourse = blendedResult;
        source = "new_model";
      } else if (liveResult) {
        deletedCourse = liveResult;
        source = "new_model";
      } else if (freeResult) {
        deletedCourse = freeResult;
        source = "new_model";
      }
    }

    if (!deletedCourse) {
      return res.status(404).json({ 
        success: false,
        message: "Course not found" 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "Course deleted successfully",
      deletedCourse: {
        id: deletedCourse._id,
        title: deletedCourse.course_title,
        source: source
      }
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting course", 
      error: error.message 
    });
  }
};

/**
 * @desc    Get all course titles
 * @route   GET /api/courses/titles
 * @access  Public
 */
const getCourseTitles = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const courseTitles = await Course.find(filter)
      .select("_id course_title course_category")
      .sort({ course_title: 1 })
      .lean();
    if (!courseTitles.length) {
      return res.status(404).json({
        success: false,
        message: "No courses found",
        data: [],
      });
    }
    res
      .status(200)
      .json({ success: true, count: courseTitles.length, data: courseTitles });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching course titles",
      error: error.message || "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Toggle course status by ID
 * @route   PATCH /api/courses/:id/status
 * @access  Private/Admin
 */
const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    const newStatus = course.status === "Published" ? "Upcoming" : "Published";
    course.status = newStatus;
    await course.save();
    res.status(200).json({
      message: `Course status updated to ${newStatus}`,
      course: {
        id: course._id,
        status: course.status,
        course_title: course.course_title,
      },
    });
  } catch (error) {
    console.error("Error toggling course status:", error);
    res.status(500).json({
      message: "Error toggling course status. Please try again later.",
      error: error.message,
    });
  }
};

// =========================================
// COURSE SECTIONS & LESSONS
// =========================================

/**
 * @desc    Get all sections for a course with progress tracking
 * @route   GET /api/courses/:courseId/sections
 * @access  Private (Enrolled Students)
 */
const getCourseSections = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view sections",
      });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const enhancedCurriculum = course.curriculum.map((week) => {
      // Create a week object with basic info
      const weekObj = {
        ...week,
        sections: [],
      };

      // Handle direct lessons if they exist
      if (week.lessons && week.lessons.length) {
        const directLessons = week.lessons;
        const completedLessons = directLessons.filter((lesson) =>
          enrollment.completed_lessons.includes(lesson.id),
        );

        weekObj.directLessonsProgress = {
          total: directLessons.length,
          completed: completedLessons.length,
          percentage:
            directLessons.length > 0
              ? Math.round(
                  (completedLessons.length / directLessons.length) * 100,
                )
              : 0,
        };

        weekObj.lessons = directLessons.map((lesson) => ({
          ...lesson,
          isCompleted: enrollment.completed_lessons.includes(lesson.id),
        }));
      }

      // Handle live classes if they exist
      if (week.liveClasses && week.liveClasses.length) {
        weekObj.liveClasses = week.liveClasses;
      }

      // Process sections if they exist
      if (week.sections && week.sections.length) {
        weekObj.sections = week.sections.map((section) => {
          const sectionLessons = section.lessons || [];
          const completedLessons = sectionLessons.filter((lesson) =>
            enrollment.completed_lessons.includes(lesson.id),
          );

          return {
            ...section,
            progress: {
              total: sectionLessons.length,
              completed: completedLessons.length,
              percentage:
                sectionLessons.length > 0
                  ? Math.round(
                      (completedLessons.length / sectionLessons.length) * 100,
                    )
                  : 0,
            },
            lessons: sectionLessons.map((lesson) => ({
              ...lesson,
              isCompleted: enrollment.completed_lessons.includes(lesson.id),
            })),
          };
        });
      }

      return weekObj;
    });

    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({
      success: true,
      data: enhancedCurriculum,
      overallProgress: enrollment.progress,
    });
  } catch (error) {
    console.error("Error fetching course sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course sections",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all lessons for a course with enhanced details
 * @route   GET /api/courses/:courseId/lessons
 * @access  Private (Enrolled Students)
 */
const getCourseLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const { includeResources = false } = req.query;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view lessons",
      });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // Collect all lessons from both direct under weeks and from sections
    const enhancedLessons = [];

    course.curriculum.forEach((week) => {
      // Add direct lessons under weeks
      if (week.lessons && week.lessons.length) {
        week.lessons.forEach((lesson) => {
          enhancedLessons.push({
            ...lesson,
            week: { id: week.id, title: week.weekTitle },
            section: null, // No section for direct lessons
            isCompleted: enrollment.completed_lessons.includes(lesson.id),
            hasNotes: enrollment.notes.some(
              (note) => note.lessonId.toString() === lesson.id.toString(),
            ),
            hasBookmarks: enrollment.bookmarks.some(
              (bookmark) =>
                bookmark.lessonId.toString() === lesson.id.toString(),
            ),
          });
        });
      }

      // Add lessons from sections
      if (week.sections && week.sections.length) {
        week.sections.forEach((section) => {
          if (section.lessons && section.lessons.length) {
            section.lessons.forEach((lesson) => {
              enhancedLessons.push({
                ...lesson,
                week: { id: week.id, title: week.weekTitle },
                section: { id: section.id, title: section.title },
                isCompleted: enrollment.completed_lessons.includes(lesson.id),
                hasNotes: enrollment.notes.some(
                  (note) => note.lessonId.toString() === lesson.id.toString(),
                ),
                hasBookmarks: enrollment.bookmarks.some(
                  (bookmark) =>
                    bookmark.lessonId.toString() === lesson.id.toString(),
                ),
              });
            });
          }
        });
      }
    });

    // Also collect live classes if requested
    const liveClasses = [];
    if (req.query.includeLiveClasses === "true") {
      course.curriculum.forEach((week) => {
        if (week.liveClasses && week.liveClasses.length) {
          week.liveClasses.forEach((liveClass) => {
            liveClasses.push({
              ...liveClass,
              week: { id: week.id, title: week.weekTitle },
            });
          });
        }
      });
    }

    enhancedLessons.sort((a, b) => a.order - b.order);
    enrollment.last_accessed = new Date();
    await enrollment.save();

    const response = {
      success: true,
      data: enhancedLessons,
      progress: {
        total: enhancedLessons.length,
        completed: enrollment.completed_lessons.length,
        percentage: enrollment.progress,
      },
    };

    if (req.query.includeLiveClasses === "true") {
      response.liveClasses = liveClasses;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching course lessons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course lessons",
      error: error.message,
    });
  }
};

/**
 * @desc    Get lesson details with enhanced information
 * @route   GET /api/courses/:courseId/lessons/:lessonId
 * @access  Private (Enrolled Students)
 */
const getLessonDetails = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    // Unused but potentially useful in future
    const _includeResources = req.query.resources === "true";

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to access lessons",
      });
    }

    let lesson = null;
    let lessonContext = {};

    // First search in direct lessons under weeks
    for (let week of course.curriculum) {
      // Check direct lessons under week
      if (week.lessons && week.lessons.length) {
        const found = week.lessons.find((l) => l.id === lessonId);
        if (found) {
          lesson = found;
          lessonContext = {
            week: {
              id: week.id,
              title: week.weekTitle,
              description: week.weekDescription,
            },
            section: null, // No section for direct lessons
          };
          break;
        }
      }

      // Check in sections
      if (week.sections && week.sections.length) {
        for (let section of week.sections) {
          const found = section.lessons.find((l) => l.id === lessonId);
          if (found) {
            lesson = found;
            lessonContext = {
              week: {
                id: week.id,
                title: week.weekTitle,
                description: week.weekDescription,
              },
              section: {
                id: section.id,
                title: section.title,
                description: section.description,
              },
            };
            break;
          }
        }
        if (lesson) break;
      }
    }

    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found in this course" });
    }

    const progress = await Progress.findOne({
      course: courseId,
      student: userId,
      lesson: lessonId,
    });
    const notes = await Note.find({
      course: courseId,
      student: userId,
      lesson: lessonId,
    }).sort({
      createdAt: -1,
    });
    const bookmarks = await Bookmark.find({
      course: courseId,
      student: userId,
      lesson: lessonId,
    }).sort({ createdAt: -1 });

    // Find previous and next lessons for navigation
    let allLessons = [];

    course.curriculum.forEach((week) => {
      // Add direct lessons
      if (week.lessons && week.lessons.length) {
        allLessons = allLessons.concat(
          week.lessons.map((l) => ({
            ...l.toObject(),
            weekId: week.id,
            sectionId: null,
          })),
        );
      }

      // Add section lessons
      if (week.sections && week.sections.length) {
        week.sections.forEach((section) => {
          if (section.lessons && section.lessons.length) {
            allLessons = allLessons.concat(
              section.lessons.map((l) => ({
                ...l.toObject(),
                weekId: week.id,
                sectionId: section.id,
              })),
            );
          }
        });
      }
    });

    // Sort lessons by order
    allLessons.sort((a, b) => a.order - b.order);

    // Find current lesson index
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    let previousLesson = null;
    let nextLesson = null;

    if (currentIndex > 0) {
      previousLesson = allLessons[currentIndex - 1];
    }

    if (currentIndex < allLessons.length - 1) {
      nextLesson = allLessons[currentIndex + 1];
    }

    res.status(200).json({
      success: true,
      data: {
        lesson: {
          ...lesson.toObject(),
          progress: progress ? progress.status : "not_started",
          notes: notes.map((note) => ({
            id: note._id,
            content: note.content,
            createdAt: note.createdAt,
          })),
          bookmarks: bookmarks.map((b) => ({
            id: b._id,
            createdAt: b.createdAt,
          })),
        },
        context: lessonContext,
        navigation: {
          previous: previousLesson
            ? {
                id: previousLesson.id,
                title: previousLesson.title,
                weekId: previousLesson.weekId,
                sectionId: previousLesson.sectionId,
              }
            : null,
          next: nextLesson
            ? {
                id: nextLesson.id,
                title: nextLesson.title,
                weekId: nextLesson.weekId,
                sectionId: nextLesson.sectionId,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching lesson details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lesson details",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all resources for a lesson
 * @route   GET /api/courses/:courseId/lessons/:lessonId/resources
 * @access  Private (Enrolled Students)
 */
const getLessonResources = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view resources",
      });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    let lesson = null;

    // Search in direct lessons under weeks
    for (let week of course.curriculum) {
      // Check direct lessons under week
      if (week.lessons && week.lessons.length) {
        const found = week.lessons.find((l) => l.id === lessonId);
        if (found) {
          lesson = found;
          break;
        }
      }

      // Check in sections
      if (!lesson && week.sections && week.sections.length) {
        for (let section of week.sections) {
          const found = section.lessons.find((l) => l.id === lessonId);
          if (found) {
            lesson = found;
            break;
          }
        }
        if (lesson) break;
      }
    }

    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    res.status(200).json({ success: true, data: lesson.resources || [] });
  } catch (error) {
    console.error("Error fetching lesson resources:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lesson resources",
      error: error.message,
    });
  }
};

/**
 * @desc    Get course progress for a student
 * @route   GET /api/courses/:courseId/progress
 * @access  Private (Enrolled Students)
 */
const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view progress",
      });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // Count both direct lessons and section lessons
    let totalLessons = 0;

    course.curriculum.forEach((week) => {
      // Count direct lessons under weeks
      if (week.lessons && week.lessons.length) {
        totalLessons += week.lessons.length;
      }

      // Count lessons in sections
      if (week.sections && week.sections.length) {
        week.sections.forEach((section) => {
          if (section.lessons && section.lessons.length) {
            totalLessons += section.lessons.length;
          }
        });
      }
    });

    // Count live classes if any
    let totalLiveClasses = 0;
    let completedLiveClasses = 0;

    if (
      enrollment.attended_live_classes &&
      enrollment.attended_live_classes.length
    ) {
      course.curriculum.forEach((week) => {
        if (week.liveClasses && week.liveClasses.length) {
          totalLiveClasses += week.liveClasses.length;
          week.liveClasses.forEach((liveClass) => {
            if (enrollment.attended_live_classes.includes(liveClass.id)) {
              completedLiveClasses++;
            }
          });
        }
      });
    }

    const completedLessons = enrollment.completed_lessons?.length || 0;
    const progress =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const liveClassProgress =
      totalLiveClasses > 0
        ? (completedLiveClasses / totalLiveClasses) * 100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLessons,
        completedLessons,
        progress,
        totalLiveClasses,
        completedLiveClasses,
        liveClassProgress,
        lastAccessed: enrollment.last_accessed,
        completedLessonsList: enrollment.completed_lessons || [],
        attendedLiveClassesList: enrollment.attended_live_classes || [],
      },
    });
  } catch (error) {
    console.error("Error fetching course progress:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course progress",
      error: error.message,
    });
  }
};

/**
 * @desc    Get live classes for a course
 * @route   GET /api/courses/:courseId/live-classes
 * @access  Private (Enrolled Students)
 */
const getCourseLiveClasses = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view live classes",
      });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // Extract all live classes
    const liveClasses = [];
    course.curriculum.forEach((week) => {
      if (week.liveClasses && week.liveClasses.length) {
        week.liveClasses.forEach((liveClass) => {
          liveClasses.push({
            ...liveClass,
            weekId: week.id,
            weekTitle: week.weekTitle,
            isAttended:
              enrollment.attended_live_classes?.includes(liveClass.id) || false,
          });
        });
      }
    });

    // Sort by scheduled date
    liveClasses.sort(
      (a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate),
    );

    // Group by upcoming and past
    const now = new Date();
    const upcoming = liveClasses.filter((c) => new Date(c.scheduledDate) > now);
    const past = liveClasses.filter((c) => new Date(c.scheduledDate) <= now);

    res.status(200).json({
      success: true,
      data: {
        all: liveClasses,
        upcoming,
        past,
        total: liveClasses.length,
        attended: enrollment.attended_live_classes?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching course live classes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course live classes",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark live class as attended
 * @route   POST /api/courses/:courseId/live-classes/:liveClassId/attend
 * @access  Private (Enrolled Students)
 */
const markLiveClassAttended = async (req, res) => {
  try {
    const { courseId, liveClassId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to mark live classes",
      });
    }

    // Check if live class exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    let liveClassExists = false;
    for (const week of course.curriculum) {
      if (week.liveClasses && week.liveClasses.length) {
        if (week.liveClasses.some((lc) => lc.id === liveClassId)) {
          liveClassExists = true;
          break;
        }
      }
    }

    if (!liveClassExists) {
      return res
        .status(404)
        .json({ success: false, message: "Live class not found" });
    }

    // Initialize attended_live_classes array if it doesn't exist
    if (!enrollment.attended_live_classes) {
      enrollment.attended_live_classes = [];
    }

    // Check if already attended
    if (enrollment.attended_live_classes.includes(liveClassId)) {
      return res.status(200).json({
        success: true,
        message: "Live class already marked as attended",
      });
    }

    // Mark as attended
    enrollment.attended_live_classes.push(liveClassId);
    enrollment.last_accessed = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Live class marked as attended",
      data: {
        attendedLiveClasses: enrollment.attended_live_classes.length,
      },
    });
  } catch (error) {
    console.error("Error marking live class attended:", error);
    res.status(500).json({
      success: false,
      message: "Error marking live class attended",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark a lesson as complete
 * @route   POST /api/courses/:courseId/lessons/:lessonId/complete
 * @access  Private (Enrolled Students)
 */
const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to mark lessons complete",
      });
    }

    // Check if the lesson exists in the course (either direct under week or in a section)
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // Find the lesson to validate it exists
    let lessonExists = false;

    // Check in all possible locations (direct lessons and section lessons)
    for (const week of course.curriculum) {
      // Check direct lessons
      if (week.lessons && week.lessons.length) {
        if (week.lessons.some((l) => l.id === lessonId)) {
          lessonExists = true;
          break;
        }
      }

      // Check lessons in sections
      if (!lessonExists && week.sections && week.sections.length) {
        for (const section of week.sections) {
          if (
            section.lessons &&
            section.lessons.some((l) => l.id === lessonId)
          ) {
            lessonExists = true;
            break;
          }
        }
        if (lessonExists) break;
      }
    }

    if (!lessonExists) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found in this course" });
    }

    // Check if lesson is already marked as complete
    if (
      enrollment.completed_lessons &&
      enrollment.completed_lessons.includes(lessonId)
    ) {
      return res
        .status(200)
        .json({ success: true, message: "Lesson already marked as complete" });
    }

    // Initialize completed_lessons array if it doesn't exist
    if (!enrollment.completed_lessons) {
      enrollment.completed_lessons = [];
    }

    // Mark lesson as complete
    enrollment.completed_lessons.push(lessonId);
    enrollment.last_accessed = new Date();
    await enrollment.save();

    // Calculate new progress percentage
    let totalLessons = 0;
    course.curriculum.forEach((week) => {
      // Count direct lessons
      if (week.lessons && week.lessons.length) {
        totalLessons += week.lessons.length;
      }

      // Count section lessons
      if (week.sections && week.sections.length) {
        week.sections.forEach((section) => {
          if (section.lessons && section.lessons.length) {
            totalLessons += section.lessons.length;
          }
        });
      }
    });

    const newProgress =
      totalLessons > 0
        ? (enrollment.completed_lessons.length / totalLessons) * 100
        : 0;

    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: {
        progress: newProgress,
        completedLessons: enrollment.completed_lessons.length,
        totalLessons,
      },
    });
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    res.status(500).json({
      success: false,
      message: "Error marking lesson complete",
      error: error.message,
    });
  }
};

// =========================================
// COURSE ASSIGNMENTS & QUIZZES
// =========================================

/**
 * @desc    Get all assignments for a course
 * @route   GET /api/courses/:courseId/assignments
 * @access  Private (Enrolled Students)
 */
const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view assignments",
      });
    }
    const course = await Course.findById(courseId).select("assignments").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course.assignments || [] });
  } catch (error) {
    console.error("Error fetching course assignments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course assignments",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit an assignment
 * @route   POST /api/courses/:courseId/assignments/:assignmentId/submit
 * @access  Private (Enrolled Students)
 */
const submitAssignment = async (req, res) => {
  try {
    const { courseId, assignmentId } = req.params;
    const { studentId } = req.user;
    const { submission } = req.body;
    if (!submission) {
      return res
        .status(400)
        .json({ success: false, message: "Submission content is required" });
    }
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to submit assignments",
      });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const assignment = course.assignments.id(assignmentId);
    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }
    const existingSubmission = enrollment.getAssignmentSubmission(assignmentId);
    if (existingSubmission) {
      existingSubmission.submission = submission;
      existingSubmission.submittedAt = new Date();
    } else {
      enrollment.assignment_submissions.push({
        assignmentId,
        submission,
        submittedAt: new Date(),
      });
    }
    if (!enrollment.isAssignmentCompleted(assignmentId)) {
      enrollment.completed_assignments.push(assignmentId);
    }
    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({
      success: true,
      message: "Assignment submitted successfully",
      data: {
        progress: enrollment.progress,
        completedAssignments: enrollment.completed_assignments.length,
      },
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting assignment",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all quizzes for a course
 * @route   GET /api/courses/:courseId/quizzes
 * @access  Private (Enrolled Students)
 */
const getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view quizzes",
      });
    }
    const course = await Course.findById(courseId).select("quizzes").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course.quizzes || [] });
  } catch (error) {
    console.error("Error fetching course quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course quizzes",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit a quiz
 * @route   POST /api/courses/:courseId/quizzes/:quizId/submit
 * @access  Private (Enrolled Students)
 */
const submitQuiz = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const { studentId } = req.user;
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid answers array is required" });
    }
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to submit quizzes",
      });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const quiz = course.quizzes.id(quizId);
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }
    let score = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score++;
      }
    });
    const percentage = (score / quiz.questions.length) * 100;
    const existingSubmission = enrollment.getQuizSubmission(quizId);
    if (existingSubmission) {
      existingSubmission.answers = answers;
      existingSubmission.score = score;
      existingSubmission.percentage = percentage;
      existingSubmission.submittedAt = new Date();
    } else {
      enrollment.quiz_submissions.push({
        quizId,
        answers,
        score,
        percentage,
        submittedAt: new Date(),
      });
    }
    if (!enrollment.isQuizCompleted(quizId)) {
      enrollment.completed_quizzes.push(quizId);
    }
    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        score,
        percentage,
        totalQuestions: quiz.questions.length,
        progress: enrollment.progress,
        completedQuizzes: enrollment.completed_quizzes.length,
      },
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting quiz",
      error: error.message,
    });
  }
};

/**
 * @desc    Get quiz results
 * @route   GET /api/courses/:courseId/quizzes/:quizId/results
 * @access  Private (Enrolled Students)
 */
const getQuizResults = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view quiz results",
      });
    }
    const course = await Course.findById(courseId).select("quizzes").lean();
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const quiz = course.quizzes.find((q) => q._id.toString() === quizId);
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }
    const submission = enrollment.quiz_submissions.find(
      (s) => s.quizId.toString() === quizId,
    );
    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "No submission found for this quiz" });
    }
    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz results",
      error: error.message,
    });
  }
};

// =========================================
// COURSE RESOURCES, NOTES & BOOKMARKS
// =========================================

/**
 * @desc    Download a resource
 * @route   GET /api/courses/:courseId/lessons/:lessonId/resources/:resourceId/download
 * @access  Private (Enrolled Students)
 */
const downloadResource = async (req, res) => {
  try {
    const { courseId, lessonId, resourceId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to download resources",
      });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }
    const resource = lesson.resources.id(resourceId);
    if (!resource) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }
    res.setHeader(
      "Content-Type",
      resource.mimeType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resource.filename || "download"}"`,
    );
    const fileStream = await getFileStream(resource.url);
    fileStream.pipe(res);
    fileStream.on("error", (error) => {
      console.error("Error streaming resource:", error);
      res.status(500).json({
        success: false,
        message: "Error downloading resource",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Error downloading resource:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading resource",
      error: error.message,
    });
  }
};

/**
 * @desc    Add a note to a lesson
 * @route   POST /api/courses/:courseId/lessons/:lessonId/notes
 * @access  Private (Enrolled Students)
 */
const addLessonNote = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { content, timestamp, tags } = req.body;
    const userId = req.user._id;
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to add notes",
      });
    }
    const note = await Note.create({
      course: courseId,
      student: userId,
      lesson: lessonId,
      content,
      timestamp,
      tags: tags || [],
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({
      success: false,
      message: "Error adding note",
      error: error.message,
    });
  }
};

/**
 * @desc    Add a bookmark to a lesson
 * @route   POST /api/courses/:courseId/lessons/:lessonId/bookmarks
 * @access  Private (Enrolled Students)
 */
const addLessonBookmark = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { timestamp, title, description, tags } = req.body;
    const userId = req.user._id;
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to add bookmarks",
      });
    }
    const bookmark = await Bookmark.create({
      course: courseId,
      student: userId,
      lesson: lessonId,
      timestamp,
      title,
      description: description || "",
      tags: tags || [],
    });
    res.status(201).json({ success: true, data: bookmark });
  } catch (error) {
    console.error("Error adding bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error adding bookmark",
      error: error.message,
    });
  }
};

/**
 * @desc    Get lesson notes
 * @route   GET /api/courses/:courseId/lessons/:lessonId/notes
 * @access  Private (Enrolled Students)
 */
const getLessonNotes = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user._id;
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view notes",
      });
    }
    const notes = await Note.getLessonNotes(courseId, userId, lessonId);
    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get lesson bookmarks
 * @route   GET /api/courses/:courseId/lessons/:lessonId/bookmarks
 * @access  Private (Enrolled Students)
 */
const getLessonBookmarks = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user._id;
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view bookmarks",
      });
    }
    const bookmarks = await Bookmark.getLessonBookmarks(
      courseId,
      userId,
      lessonId,
    );
    res.status(200).json({ success: true, data: bookmarks });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookmarks",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a note
 * @route   PUT /api/courses/:courseId/lessons/:lessonId/notes/:noteId
 * @access  Private (Enrolled Students)
 */
const updateNote = async (req, res) => {
  try {
    const { courseId, lessonId, noteId } = req.params;
    const { content, tags } = req.body;
    const userId = req.user._id;
    const note = await Note.findOne({
      _id: noteId,
      course: courseId,
      student: userId,
      lesson: lessonId,
    });
    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }
    await note.updateContent(content);
    if (tags) {
      note.tags = tags;
      await note.save();
    }
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      success: false,
      message: "Error updating note",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a bookmark
 * @route   PUT /api/courses/:courseId/lessons/:lessonId/bookmarks/:bookmarkId
 * @access  Private (Enrolled Students)
 */
const updateBookmark = async (req, res) => {
  try {
    const { courseId, lessonId, bookmarkId } = req.params;
    const { title, description, tags } = req.body;
    const userId = req.user._id;
    const bookmark = await Bookmark.findOne({
      _id: bookmarkId,
      course: courseId,
      student: userId,
      lesson: lessonId,
    });
    if (!bookmark) {
      return res
        .status(404)
        .json({ success: false, message: "Bookmark not found" });
    }
    await bookmark.updateDetails(title, description, tags);
    res.status(200).json({ success: true, data: bookmark });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bookmark",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a note
 * @route   DELETE /api/courses/:courseId/lessons/:lessonId/notes/:noteId
 * @access  Private (Enrolled Students)
 */
const deleteNote = async (req, res) => {
  try {
    const { courseId, lessonId, noteId } = req.params;
    const userId = req.user._id;
    const note = await Note.findOneAndDelete({
      _id: noteId,
      course: courseId,
      student: userId,
      lesson: lessonId,
    });
    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting note",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a bookmark
 * @route   DELETE /api/courses/:courseId/lessons/:lessonId/bookmarks/:bookmarkId
 * @access  Private (Enrolled Students)
 */
const deleteBookmark = async (req, res) => {
  try {
    const { courseId, lessonId, bookmarkId } = req.params;
    const userId = req.user._id;
    const bookmark = await Bookmark.findOneAndDelete({
      _id: bookmarkId,
      course: courseId,
      student: userId,
      lesson: lessonId,
    });
    if (!bookmark) {
      return res
        .status(404)
        .json({ success: false, message: "Bookmark not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Bookmark deleted successfully" });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting bookmark",
      error: error.message,
    });
  }
};

// =========================================
// FILE UPLOAD HANDLERS
// =========================================

/**
 * @desc    Handle single file upload
 * @route   POST /api/uploads/single
 * @access  Public
 */
const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      },
    });
  } catch (error) {
    console.error("Error in handleUpload:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
};

/**
 * @desc    Handle multiple file upload
 * @route   POST /api/uploads/multiple
 * @access  Public
 */
const handleMultipleUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    }
    const files = req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    }));
    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      data: { count: files.length, files },
    });
  } catch (error) {
    console.error("Error in handleMultipleUpload:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading files",
      error: error.message,
    });
  }
};

// =========================================
// OTHER ENDPOINTS
// =========================================

/**
 * @desc    Get corporate course by ID
 * @route   GET /api/courses/coorporate/:id
 * @access  Public
 */
const getCoorporateCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid course ID format" });
    }
    const course = await Course.findById(id).select("+corporate_details");
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error("Error fetching corporate course:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching corporate course",
      error: error.message,
    });
  }
};

/**
 * @desc    Update recorded videos for a course
 * @route   POST /api/courses/:id/recorded-videos
 * @access  Private/Admin
 */
const updateRecordedVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const { videos } = req.body;
    if (!Array.isArray(videos)) {
      return res
        .status(400)
        .json({ success: false, message: "Videos must be an array" });
    }
    const course = await Course.findByIdAndUpdate(
      id,
      { $set: { recorded_videos: videos } },
      { new: true },
    );
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    res.status(200).json({
      success: true,
      message: "Recorded videos updated successfully",
      data: course.recorded_videos,
    });
  } catch (error) {
    console.error("Error updating recorded videos:", error);
    res.status(500).json({
      success: false,
      message: "Error updating recorded videos",
      error: error.message,
    });
  }
};

/**
 * @desc    Get recorded videos for a user
 * @route   GET /api/courses/recorded-videos/:studentId
 * @access  Private/Admin
 */
const getRecordedVideosForUser = async (req, res) => {
  try {
    const { studentId } = req.params;
    const enrollments = await EnrolledCourse.find({ student_id: studentId })
      .populate("course_id", "recorded_videos course_title")
      .lean();

    // Filter out enrollments with null course_id and map the valid ones
    const videos = enrollments
      .filter((enrollment) => enrollment.course_id != null)
      .map((enrollment) => ({
        course_id: enrollment.course_id._id,
        course_title: enrollment.course_id.course_title,
        videos: enrollment.course_id.recorded_videos || [],
      }));

    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    console.error("Error fetching recorded videos:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recorded videos",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all related courses
 * @route   GET /api/courses/related
 * @access  Public
 */
const getAllRelatedCourses = async (req, res) => {
  try {
    let { courseId, category, limit = 4 } = req.query;
    const query = {};
    if (category) query.course_category = category;
    if (courseId) query._id = { $ne: new mongoose.Types.ObjectId(courseId) };
    const relatedCourses = await Course.find(query)
      .select("course_title course_category course_image course_fee course_duration")
      .limit(parseInt(limit))
      .lean();
    
    // Format course durations
    const processedCourses = processCoursesResponse(relatedCourses);
    
    res.status(200).json({ success: true, data: processedCourses });
  } catch (error) {
    console.error("Error fetching related courses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching related courses",
      error: error.message,
    });
  }
};

/**
 * @desc    Get new courses with limits
 * @route   GET /api/courses/new
 * @access  Public
 */
const getNewCoursesWithLimits = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const newCourses = await Course.find({ status: "Published" })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select(
        "course_title course_category course_image course_fee course_duration",
      )
      .lean();
    
    // Format course durations
    const processedCourses = processCoursesResponse(newCourses);
    
    res.status(200).json({ success: true, data: processedCourses });
  } catch (error) {
    console.error("Error fetching new courses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching new courses",
      error: error.message,
    });
  }
};

/**
 * @desc    Download course brochure
 * @route   POST /api/courses/broucher/download/:courseId
 * @access  Private (Enrolled Students)
 */
const downloadBrochure = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to download the brochure",
      });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    if (!course.brochures || course.brochures.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No brochure available for this course",
      });
    }
    const brochure = course.brochures[0];
    res.setHeader("Content-Type", brochure.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${brochure.filename || "course-brochure.pdf"}"`,
    );
    const fileStream = await getFileStream(brochure.url);
    fileStream.pipe(res);
    fileStream.on("error", (error) => {
      console.error("Error streaming brochure:", error);
      res.status(500).json({
        success: false,
        message: "Error downloading brochure",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Error downloading brochure:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading brochure",
      error: error.message,
    });
  }
};

// Get course prices
const getCoursePrices = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .select("prices course_title")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        courseId: course._id,
        courseTitle: course.course_title,
        prices: course.prices || [],
      },
    });
  } catch (error) {
    console.error("Error fetching course prices:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course prices",
      error: error.message,
    });
  }
};

// Update course prices
const updateCoursePrices = async (req, res) => {
  try {
    const { prices } = req.body;

    if (!Array.isArray(prices)) {
      return res.status(400).json({
        success: false,
        message: "Prices must be provided as an array",
      });
    }

    // Validate and format price entries
    const formattedPrices = prices.map((price) => {
      // Ensure required fields are present
      if (!price.currency || !price.individual) {
        throw new Error(
          "Each price entry must contain currency and individual price",
        );
      }

      // Convert string numbers to actual numbers
      const formattedPrice = {
        currency: price.currency.toUpperCase(),
        individual: Number(price.individual),
        batch: Number(price.batch) || Number(price.individual),
        min_batch_size: Number(price.min_batch_size) || 1,
        max_batch_size: Number(price.max_batch_size) || 10,
        early_bird_discount:
          price.early_bird_discount === "N/A"
            ? 0
            : Number(price.early_bird_discount) || 0,
        group_discount:
          price.group_discount === "N/A"
            ? 0
            : Number(price.group_discount) || 0,
        is_active: true,
      };

      // Validate numeric values
      if (isNaN(formattedPrice.individual) || isNaN(formattedPrice.batch)) {
        throw new Error("Individual and batch prices must be valid numbers");
      }

      if (
        isNaN(formattedPrice.early_bird_discount) ||
        isNaN(formattedPrice.group_discount)
      ) {
        throw new Error("Discount values must be valid numbers");
      }

      if (
        isNaN(formattedPrice.min_batch_size) ||
        isNaN(formattedPrice.max_batch_size)
      ) {
        throw new Error("Batch size values must be valid numbers");
      }

      return formattedPrice;
    });

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { prices: formattedPrices } },
      { new: true, runValidators: true },
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Prices updated successfully",
      data: course.prices,
    });
  } catch (error) {
    console.error("Error updating course prices:", error);
    res.status(500).json({
      success: false,
      message: "Error updating course prices",
      error: error.message,
    });
  }
};

// Bulk update course prices
const bulkUpdateCoursePrices = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Updates must be a non-empty array",
      });
    }

    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.courseId },
        update: {
          $set: {
            prices: update.prices,
            "meta.lastPriceUpdate": new Date(),
          },
        },
        runValidators: true,
      },
    }));

    const result = await Course.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Bulk price update completed",
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk price update:", error);
    res.status(500).json({
      success: false,
      message: "Error performing bulk price update",
      error: error.message,
    });
  }
};

const getAllCoursesWithPrices = async (req, res) => {
  try {
    const {
      category,
      class_type,
      currency,
      min_price,
      max_price,
      active_only,
      has_discount,
      search,
      course_grade,
      pricing_status,
      has_pricing,
      course_id,
    } = req.query;

    // Build filter object
    const filter = {};

    // Category filter
    if (category) {
      filter.course_category = category;
    }

    // Class type filter
    if (class_type) {
      filter.class_type = class_type;
    }

    // Course grade filter
    if (course_grade) {
      filter.course_grade = course_grade;
    }

    // Search by title
    if (search) {
      filter.course_title = { $regex: search, $options: "i" };
    }

    // Course ID filter
    if (course_id) {
      filter._id = course_id;
    }

    // Currency filter
    if (currency) {
      filter["prices.currency"] = currency.toUpperCase();
    }

    // Price range filter
    if (min_price || max_price) {
      filter["prices.individual"] = {};
      if (min_price) filter["prices.individual"].$gte = Number(min_price);
      if (max_price) filter["prices.individual"].$lte = Number(max_price);
    }

    // Active status filter
    if (active_only === "true") {
      filter.status = { $regex: "Published", $options: "i" };
    }

    // Pricing status filter (active/inactive)
    if (pricing_status) {
      if (pricing_status === "active") {
        filter["prices.is_active"] = true;
      } else if (pricing_status === "inactive") {
        filter["prices.is_active"] = false;
      }
    }

    // Has pricing filter
    if (has_pricing) {
      if (has_pricing === "yes") {
        filter.prices = { $exists: true, $ne: [] };
      } else if (has_pricing === "no") {
        filter.$or = [{ prices: { $exists: false } }, { prices: [] }];
      }
    }

    // Discount filter
    if (has_discount === "true") {
      filter.$or = [
        { "prices.early_bird_discount": { $gt: 0 } },
        { "prices.group_discount": { $gt: 0 } },
      ];
    }

    // Add status filter for published courses if not specified
    if (!filter.hasOwnProperty("status")) {
      filter.status = { $regex: "Published", $options: "i" };
    }

    const courses = await Course.find(filter)
      .select(
        "_id course_title course_category course_grade course_duration class_type status prices",
      )
      .lean()
      .sort({ "prices.currency": 1 });

    if (!courses.length) {
      return res.status(404).json({
        success: false,
        message: "No courses found with matching criteria",
      });
    }

    // Get unique values for filters
    const uniqueCategories = [
      ...new Set(courses.map((course) => course.course_category)),
    ].filter(Boolean);
    const uniqueTypes = [
      ...new Set(courses.map((course) => course.class_type)),
    ].filter(Boolean);
    const uniqueCurrencies = [
      ...new Set(
        courses.flatMap((course) =>
          (course.prices || []).map((p) => p.currency),
        ),
      ),
    ];

    // Transform the data for better readability
    const transformed = courses.map((course) => {
      // Format course title with grade, duration, class type and category
      const titleParts = [course.course_title];
      if (course.course_category) {
        titleParts.push(`Category: ${course.course_category}`);
      }
      if (course.course_grade) {
        titleParts.push(`Grade: ${course.course_grade}`);
      }
      if (course.course_duration) {
        titleParts.push(`Duration: ${course.course_duration}`);
      }
      if (course.class_type) {
        titleParts.push(`Type: ${course.class_type}`);
      }
      const formattedTitle = titleParts.join(" | ");

      // Format pricing information
      const pricing = (course.prices || [])
        .map((price) => {
          if (!price) return null;

          const formattedPrice = {
            currency: price.currency || "Not specified",
            prices: {
              individual: price.individual || 0,
              batch: price.batch || price.individual || 0,
            },
            discounts: {
              earlyBird: price.early_bird_discount
                ? `${price.early_bird_discount}%`
                : "N/A",
              group: price.group_discount ? `${price.group_discount}%` : "N/A",
            },
            batchSize: {
              min: price.min_batch_size || "N/A",
              max: price.max_batch_size || "N/A",
            },
            status: price.is_active ? "Active" : "Inactive",
          };

          // Format currency with symbol
          if (price.currency === "USD") {
            formattedPrice.prices.individual = `${formattedPrice.prices.individual}`;
            formattedPrice.prices.batch = `${formattedPrice.prices.batch}`;
          } else if (price.currency === "EUR") {
            formattedPrice.prices.individual = `${formattedPrice.prices.individual}`;
            formattedPrice.prices.batch = `${formattedPrice.prices.batch}`;
          } else if (price.currency === "INR") {
            formattedPrice.prices.individual = `${formattedPrice.prices.individual}`;
            formattedPrice.prices.batch = `${formattedPrice.prices.batch}`;
          }

          return formattedPrice;
        })
        .filter(Boolean); // Remove any null entries

      return {
        courseId: course._id,
        courseTitle: formattedTitle,
        courseCategory: course.course_category || "Not specified",
        courseGrade: course.course_grade || "Not specified",
        classType: course.class_type || "Not specified",
        status: course.status || "Not specified",
        pricing:
          pricing.length > 0
            ? pricing
            : [
                {
                  currency: "Not specified",
                  prices: {
                    individual: "N/A",
                    batch: "N/A",
                  },
                  discounts: {
                    earlyBird: "N/A",
                    group: "N/A",
                  },
                  batchSize: {
                    min: "N/A",
                    max: "N/A",
                  },
                  status: "Not available",
                },
              ],
      };
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      filters: {
        categories: uniqueCategories,
        types: uniqueTypes,
        currencies: uniqueCurrencies,
      },
      data: transformed,
    });
  } catch (error) {
    console.error("Error fetching course prices:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course prices",
      error: error.message,
    });
  }
};

/**
 * @desc    Get courses with specific fields requested by the frontend
 * @route   GET /api/courses/fields
 * @access  Public
 */
const getCoursesWithFields = async (req, res) => {
  try {
    const { fields, filters = {}, sort = {}, page = 1, limit = 10 } = req.query;

    // Parse fields from query parameter
    let requestedFields = {};

    if (fields) {
      // Handle comma-separated list of fields
      const fieldList = fields.split(",").map((field) => field.trim());

      // Map of valid fields and their MongoDB paths
      const validFields = {
        // Basic course info
        id: "_id",
        title: "course_title",
        subtitle: "course_subtitle",
        category: "course_category",
        subcategory: "course_subcategory",
        tag: "course_tag",
        image: "course_image",
        description: "course_description",
        level: "course_level",
        language: "language",
        subtitleLanguages: "subtitle_languages",
        sessions: "no_of_Sessions",
        duration: "course_duration",
        sessionDuration: "session_duration",
        prices: "prices",
        brochures: "brochures",
        status: "status",
        categoryType: "category_type",
        isFree: "isFree",
        grade: "course_grade",
        effortsPerWeek: "efforts_per_Week",
        classType: "class_type",
        minHoursPerWeek: "min_hours_per_week",
        maxHoursPerWeek: "max_hours_per_week",
        relatedCourses: "related_courses",

        // Features
        hasCertification: "is_Certification",
        hasAssignments: "is_Assignments",
        hasProjects: "is_Projects",
        hasQuizzes: "is_Quizes",

        // Metadata
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        slug: "slug",
        views: "meta.views",
        ratings: "meta.ratings",
        enrollments: "meta.enrollments",

        // Curriculum
        curriculum: "curriculum",

        // FAQs
        faqs: "faqs",

        // Tools & Technologies
        toolsTechnologies: "tools_technologies",

        // Bonus Modules
        bonusModules: "bonus_modules",

        // Final Evaluation
        finalEvaluation: "final_evaluation",

        // Resource PDFs
        resourcePdfs: "resource_pdfs",

        // Predefined field sets for common UI components
        card: [
          "id",
          "title",
          "category",
          "tag",
          "image",
          "duration",
          "isFree",
          "status",
          "categoryType",
          "prices",
          "slug",
          "views",
          "ratings",
          "effortsPerWeek",
          "sessions",
          "classType",
        ],
        list: [
          "id",
          "title",
          "category",
          "tag",
          "image",
          "duration",
          "isFree",
          "status",
          "categoryType",
          "prices",
          "slug",
          "classType",
        ],
        detail: [
          "id",
          "title",
          "subtitle",
          "category",
          "subcategory",
          "tag",
          "image",
          "description",
          "level",
          "language",
          "sessions",
          "duration",
          "fee",
          "prices",
          "brochures",
          "status",
          "categoryType",
          "isFree",
          "grade",
          "effortsPerWeek",
          "classType",
          "hasCertification",
          "hasAssignments",
          "hasProjects",
          "hasQuizzes",
          "curriculum",
          "faqs",
          "toolsTechnologies",
          "bonusModules",
          "finalEvaluation",
          "resourcePdfs",
          "createdAt",
          "updatedAt",
          "slug",
          "views",
          "ratings",
          "enrollments",
        ],
        search: [
          "id",
          "title",
          "category",
          "tag",
          "image",
          "duration",
          "isFree",
          "status",
          "categoryType",
          "prices",
          "slug",
          "views",
          "ratings",
        ],
        related: [
          "id",
          "title",
          "category",
          "tag",
          "image",
          "duration",
          "isFree",
          "status",
          "categoryType",
          "prices",
          "slug",
        ],
      };

      // Check if a predefined field set was requested
      if (validFields[fields]) {
        // If it's an array, it's a predefined field set
        if (Array.isArray(validFields[fields])) {
          requestedFields = validFields[fields].reduce((acc, field) => {
            acc[validFields[field]] = 1;
            return acc;
          }, {});
        } else {
          // Single field
          requestedFields[validFields[fields]] = 1;
        }
      } else {
        // Process individual fields
        fieldList.forEach((field) => {
          if (validFields[field]) {
            requestedFields[validFields[field]] = 1;
          }
        });
      }
    }

    // Always include _id field
    requestedFields._id = 1;

    // Parse filters
    const queryFilters = {};

    // Handle text search
    if (filters.search) {
      const searchTerm = fullyDecodeURIComponent(filters.search);
      if (searchTerm.length >= 3) {
        queryFilters.$text = { $search: searchTerm };
      } else {
        queryFilters.$or = [
          {
            course_title: { $regex: new RegExp(escapeRegExp(searchTerm), "i") },
          },
          {
            course_category: {
              $regex: new RegExp(escapeRegExp(searchTerm), "i"),
            },
          },
          { course_tag: { $regex: new RegExp(escapeRegExp(searchTerm), "i") } },
        ];
      }
    }

    // Handle category filter
    if (filters.category) {
      queryFilters.course_category = fullyDecodeURIComponent(filters.category);
    }

    // Handle category type filter
    if (filters.categoryType) {
      queryFilters.category_type = fullyDecodeURIComponent(
        filters.categoryType,
      );
    }

    // Handle status filter
    if (filters.status) {
      queryFilters.status = fullyDecodeURIComponent(filters.status);
    }

    // Also check for status in query params directly
    if (req.query.status) {
      queryFilters.status = fullyDecodeURIComponent(req.query.status);
    }

    // Handle price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        queryFilters.course_fee = { $gte: min, $lte: max };
      }
    }

    // Handle tag filter
    if (filters.tag) {
      queryFilters.course_tag = fullyDecodeURIComponent(filters.tag);
    }

    // Handle class type filter
    if (req.query.filters && req.query.filters.class_type) {
      const decodedClassType = fullyDecodeURIComponent(
        req.query.filters.class_type,
      );
      queryFilters.class_type = decodedClassType;
      console.log("Class type filter:", queryFilters.class_type);
    }

    // Handle feature filters
    if (filters.hasCertification) {
      queryFilters.is_Certification = filters.hasCertification;
    }
    if (filters.hasAssignments) {
      queryFilters.is_Assignments = filters.hasAssignments;
    }
    if (filters.hasProjects) {
      queryFilters.is_Projects = filters.hasProjects;
    }
    if (filters.hasQuizzes) {
      queryFilters.is_Quizes = filters.hasQuizzes;
    }

    // Handle isFree filter
    if (filters.isFree !== undefined) {
      queryFilters.isFree = filters.isFree === "true";
    }

    // Sort options
    let sortOptions = {};

    // Apply sorting
    if (sort) {
      if (sort === "recent") {
        sortOptions = { createdAt: -1 };
      } else if (sort === "popular") {
        sortOptions = { "meta.views": -1 };
      } else if (sort === "price_asc") {
        // For price ascending, we need to sort by the individual price in the prices array
        // Will be handled after fetching the data
        sortOptions = { _id: 1 }; // Default sort to ensure consistent results
      } else if (sort === "price_desc") {
        // Will be handled after fetching the data
        sortOptions = { _id: 1 }; // Default sort to ensure consistent results
      } else {
        sortOptions = { createdAt: -1 }; // Default to recent
      }
    } else {
      sortOptions = { createdAt: -1 }; // Default to recent
    }

    // Parse pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Function to format course duration
    const formatCourseDuration = (duration) => {
      if (!duration) return "";

      // Extract months and weeks
      const monthsMatch = duration.match(/(\d+)\s*months?/i);
      const weeksMatch = duration.match(/(\d+)\s*weeks?/i);

      const months = monthsMatch ? monthsMatch[1] : "";
      const weeks = weeksMatch ? weeksMatch[1] : "";

      // Format as "X months / Y weeks"
      if (months && weeks) {
        return `${months} months / ${weeks} weeks`;
      } else if (months) {
        return `${months} months`;
      } else if (weeks) {
        return `${weeks} weeks`;
      }

      return duration; // Return original if no matches
    };

    // Handle currency filter
    if (filters.currency) {
      const currency = fullyDecodeURIComponent(filters.currency).toUpperCase();
      queryFilters["prices.currency"] = currency;

      // Add a projection to only include prices for the requested currency
      if (!requestedFields.prices) {
        requestedFields.prices = 1;
      }
    }

    // Execute queries for both legacy and new course models
    const [legacyResults, legacyCount] = await Promise.all([
      Course.find(queryFilters, requestedFields)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Course.countDocuments(queryFilters),
    ]);

    // Execute queries for new course-types models (with same filters)
    const [blendedResults, liveResults, freeResults, blendedCount, liveCount, freeCount] = await Promise.all([
      BlendedCourse.find(queryFilters, requestedFields)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .catch(() => []),
      LiveCourse.find(queryFilters, requestedFields)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .catch(() => []),
      FreeCourse.find(queryFilters, requestedFields)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .catch(() => []),
      BlendedCourse.countDocuments(queryFilters).catch(() => 0),
      LiveCourse.countDocuments(queryFilters).catch(() => 0),
      FreeCourse.countDocuments(queryFilters).catch(() => 0)
    ]);

    // Combine results
    const queryResults = [
      ...legacyResults.map(r => ({ ...r, _source: "legacy_model" })),
      ...blendedResults.map(r => ({ ...r, course_type: "blended", _source: "new_model" })),
      ...liveResults.map(r => ({ ...r, course_type: "live", _source: "new_model" })),
      ...freeResults.map(r => ({ ...r, course_type: "free", _source: "new_model" }))
    ];

    // Calculate total count
    const totalCount = legacyCount + blendedCount + liveCount + freeCount;

    // Process courses based on filters
    let processedCourses = queryResults.map((course) => {
      // Filter prices if currency filter is applied
      if (filters.currency) {
        const currency = fullyDecodeURIComponent(
          filters.currency,
        ).toUpperCase();
        if (course.prices) {
          course.prices = course.prices.filter(
            (price) => price.currency === currency,
          );
        }
      }

      // Fix efforts_per_Week field if it's undefined
      if (course.efforts_per_Week === "undefined - undefined hours / week") {
        course.efforts_per_Week = "3-5 hours / week"; // Default value
      }

      // Format course duration
      if (course.course_duration) {
        course.course_duration = formatCourseDuration(course.course_duration);
      }

      return course;
    });

    // Apply post-query sorting for price if needed
    if (sort === "price_asc" || sort === "price_desc") {
      const currencyFilter = filters.currency
        ? fullyDecodeURIComponent(filters.currency).toUpperCase()
        : "USD"; // Default to USD if no currency specified

      // Sort by price after fetching the data
      processedCourses = processedCourses.sort((a, b) => {
        // Get prices for the specified currency
        const aPrice =
          a.prices && a.prices.find((p) => p.currency === currencyFilter);
        const bPrice =
          b.prices && b.prices.find((p) => p.currency === currencyFilter);

        // Get individual prices or use a default value if not found
        const aPriceValue = aPrice
          ? aPrice.individual
          : sort === "price_asc"
            ? Number.MAX_SAFE_INTEGER
            : 0;
        const bPriceValue = bPrice
          ? bPrice.individual
          : sort === "price_asc"
            ? Number.MAX_SAFE_INTEGER
            : 0;

        // Sort ascending or descending based on sort parameter
        return sort === "price_asc"
          ? aPriceValue - bPriceValue
          : bPriceValue - aPriceValue;
      });
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);

    // Return response
    res.status(200).json({
      success: true,
      data: processedCourses,
      pagination: {
        total: totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      sources: {
        legacy_model: legacyCount,
        new_model: blendedCount + liveCount + freeCount
      }
    });
  } catch (error) {
    console.error("Error in getCoursesWithFields:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching courses",
      error: error.message || "An unexpected error occurred",
    });
  }
};

export const getCourseResource = catchAsync(async (req, res) => {
  const { courseId, lessonId, resourceId } = req.params;

  if (
    !mongoose.isValidObjectId(courseId) ||
    !mongoose.isValidObjectId(lessonId) ||
    !mongoose.isValidObjectId(resourceId)
  ) {
    return res.status(400).json(responseFormatter.error("Invalid ID format"));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json(responseFormatter.error("Course not found"));
  }

  const lesson = course.lessons.id(lessonId);
  if (!lesson) {
    return res.status(404).json(responseFormatter.error("Lesson not found"));
  }

  const resource = lesson.resources.id(resourceId);
  if (!resource || !resource.url) {
    return res
      .status(404)
      .json(responseFormatter.error("Resource not found or URL missing"));
  }

  try {
    // Extract the S3 key from the resource URL
    // Assumes URL format like https://bucket-name.s3.region.amazonaws.com/key or https://s3.region.amazonaws.com/bucket-name/key
    let s3Key = "";
    try {
      const urlParts = new URL(resource.url);
      if (urlParts.hostname.includes("s3")) {
        s3Key = urlParts.pathname.startsWith("/")
          ? urlParts.pathname.substring(1)
          : urlParts.pathname;
        // Handle bucket name potentially being in the path
        const bucketNameInPath = s3Key.split("/")[0];
        if (bucketNameInPath === ENV_VARS.AWS_S3_BUCKET_NAME) {
          s3Key = s3Key.substring(bucketNameInPath.length + 1);
        }
      } else {
        // Fallback for potentially different URL structures - adapt as needed
        s3Key = resource.url.split(".com/").pop();
      }
    } catch (urlError) {
      logger.error("Error parsing resource URL:", resource.url, urlError);
      // Fallback parsing if URL object fails
      s3Key = resource.url.includes(".com/")
        ? resource.url.split(".com/").pop()
        : resource.url;
    }

    if (!s3Key) {
      logger.error("Could not extract S3 key from resource URL:", resource.url);
      return res
        .status(404)
        .json(responseFormatter.error("Resource file path invalid."));
    }

    logger.info(`Attempting to stream resource with S3 key: ${s3Key}`);
    const fileStream = await getFileStream(s3Key); // Use the imported function

    // Set appropriate headers
    res.setHeader(
      "Content-Type",
      resource.mimeType || "application/octet-stream",
    );
    // Use encodeURIComponent for filename to handle special characters
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(resource.title)}"`,
    );

    fileStream.pipe(res);

    fileStream.on("error", (streamError) => {
      logger.error("Error streaming resource from S3:", streamError);
      // Avoid sending further headers if already sent
      if (!res.headersSent) {
        res.status(500).json(responseFormatter.error("Error streaming file."));
      }
    });

    fileStream.on("end", () => {
      logger.info(`Successfully streamed resource: ${resource.title}`);
    });
  } catch (error) {
    logger.error("Error retrieving resource stream:", error);
    res
      .status(500)
      .json(
        responseFormatter.error(
          error.message || "Failed to get resource file.",
        ),
      );
  }
});

export const getCourseMaterial = catchAsync(async (req, res) => {
  const { courseId, materialId } = req.params;

  if (
    !mongoose.isValidObjectId(courseId) ||
    !mongoose.isValidObjectId(materialId)
  ) {
    return res.status(400).json(responseFormatter.error("Invalid ID format"));
  }

  const course = await Course.findById(courseId);
  if (
    !course ||
    !course.course_brochure ||
    course.course_brochure.length === 0
  ) {
    return res
      .status(404)
      .json(responseFormatter.error("Course or brochure not found"));
  }

  const brochure = course.course_brochure.id(materialId);
  if (!brochure || !brochure.url) {
    return res
      .status(404)
      .json(
        responseFormatter.error("Brochure material not found or URL missing"),
      );
  }

  try {
    // Extract the S3 key from the brochure URL (similar logic as getCourseResource)
    let s3Key = "";
    try {
      const urlParts = new URL(brochure.url);
      if (urlParts.hostname.includes("s3")) {
        s3Key = urlParts.pathname.startsWith("/")
          ? urlParts.pathname.substring(1)
          : urlParts.pathname;
        const bucketNameInPath = s3Key.split("/")[0];
        if (bucketNameInPath === ENV_VARS.AWS_S3_BUCKET_NAME) {
          s3Key = s3Key.substring(bucketNameInPath.length + 1);
        }
      } else {
        s3Key = brochure.url.split(".com/").pop();
      }
    } catch (urlError) {
      logger.error("Error parsing brochure URL:", brochure.url, urlError);
      s3Key = brochure.url.includes(".com/")
        ? brochure.url.split(".com/").pop()
        : brochure.url;
    }

    if (!s3Key) {
      logger.error("Could not extract S3 key from brochure URL:", brochure.url);
      return res
        .status(404)
        .json(responseFormatter.error("Brochure file path invalid."));
    }

    logger.info(`Attempting to stream brochure with S3 key: ${s3Key}`);
    const fileStream = await getFileStream(s3Key); // Use the imported function

    // Determine Content-Type based on file extension or stored mimeType
    const contentType =
      brochure.mimeType ||
      mime.getType(brochure.title) ||
      "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    // Use encodeURIComponent for filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(brochure.title)}"`,
    );

    fileStream.pipe(res);

    fileStream.on("error", (streamError) => {
      logger.error("Error streaming brochure from S3:", streamError);
      if (!res.headersSent) {
        res.status(500).json(responseFormatter.error("Error streaming file."));
      }
    });

    fileStream.on("end", () => {
      logger.info(`Successfully streamed brochure: ${brochure.title}`);
    });
  } catch (error) {
    logger.error("Error retrieving brochure stream:", error);
    res
      .status(500)
      .json(
        responseFormatter.error(
          error.message || "Failed to get brochure file.",
        ),
      );
  }
});

/**
 * @desc    Add a video lesson to a course curriculum
 * @route   POST /api/courses/:courseId/video-lessons
 * @access  Private/Admin
 */
const addVideoLessonToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { weekId, sectionId, title, description, video_url, duration, video_thumbnail, order, isPreview = false } = req.body;

    if (!weekId || !title || !video_url) {
      return res.status(400).json({
        success: false,
        message: "Week ID, title, and video URL are required",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Find the week
    const week = course.curriculum.find(w => w.id === weekId);
    if (!week) {
      return res.status(404).json({
        success: false,
        message: "Week not found",
      });
    }

    // Create the video lesson object
    const videoLesson = {
      lessonType: 'video',
      title,
      description: description || '',
      video_url,
      duration: duration || '',
      video_thumbnail: video_thumbnail || '',
      order: order || (sectionId ? 1 : (week.lessons?.length || 0) + 1),
      isPreview,
      resources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (sectionId) {
      // Add to specific section
      const section = week.sections?.find(s => s.id === sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }
      
      if (!section.lessons) section.lessons = [];
      section.lessons.push(videoLesson);
    } else {
      // Add directly to week
      if (!week.lessons) week.lessons = [];
      week.lessons.push(videoLesson);
    }

    // Reassign IDs
    assignCurriculumIds(course.curriculum);

    await course.save();

    // Generate a signed URL for the video lesson
    let signedUrl;
    try {
      signedUrl = generateSignedUrl(video_url);
    } catch (signError) {
      console.error("Error signing video URL in addVideoLessonToCourse:", signError);
    }

    res.status(201).json({
      success: true,
      message: "Video lesson added successfully",
      data: {
        ...videoLesson,
        signedUrl,
      },
    });
  } catch (error) {
    console.error("Error adding video lesson:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add video lesson",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a video lesson
 * @route   PUT /api/courses/:courseId/video-lessons/:lessonId
 * @access  Private/Admin
 */
const updateVideoLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, description, video_url, duration, video_thumbnail, order, isPreview } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let lessonFound = false;
    let updatedLesson = null;

    // Search for the lesson in the curriculum structure
    for (const week of course.curriculum) {
      // Check direct lessons
      if (week.lessons) {
        const lesson = week.lessons.find(l => l.id === lessonId);
        if (lesson) {
          if (title !== undefined) lesson.title = title;
          if (description !== undefined) lesson.description = description;
          if (video_url !== undefined) lesson.video_url = video_url;
          if (duration !== undefined) lesson.duration = duration;
          if (video_thumbnail !== undefined) lesson.video_thumbnail = video_thumbnail;
          if (order !== undefined) lesson.order = order;
          if (isPreview !== undefined) lesson.isPreview = isPreview;
          lesson.lessonType = 'video';
          lesson.updatedAt = new Date();
          lessonFound = true;
          updatedLesson = lesson;
          break;
        }
      }

      // Check lessons in sections
      if (!lessonFound && week.sections) {
        for (const section of week.sections) {
          if (section.lessons) {
            const lesson = section.lessons.find(l => l.id === lessonId);
            if (lesson) {
              if (title !== undefined) lesson.title = title;
              if (description !== undefined) lesson.description = description;
              if (video_url !== undefined) lesson.video_url = video_url;
              if (duration !== undefined) lesson.duration = duration;
              if (video_thumbnail !== undefined) lesson.video_thumbnail = video_thumbnail;
              if (order !== undefined) lesson.order = order;
              if (isPreview !== undefined) lesson.isPreview = isPreview;
              lesson.lessonType = 'video';
              lesson.updatedAt = new Date();
              lessonFound = true;
              updatedLesson = lesson;
              break;
            }
          }
        }
        if (lessonFound) break;
      }
    }

    if (!lessonFound) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: "Video lesson updated successfully",
      data: updatedLesson,
    });
  } catch (error) {
    console.error("Error updating video lesson:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update video lesson",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a video lesson
 * @route   DELETE /api/courses/:courseId/video-lessons/:lessonId
 * @access  Private/Admin
 */
const deleteVideoLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let lessonFound = false;

    // Search for the lesson in the curriculum structure and remove it
    for (const week of course.curriculum) {
      // Check direct lessons
      if (week.lessons) {
        const lessonIndex = week.lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex !== -1) {
          week.lessons.splice(lessonIndex, 1);
          lessonFound = true;
          break;
        }
      }

      // Check lessons in sections
      if (!lessonFound && week.sections) {
        for (const section of week.sections) {
          if (section.lessons) {
            const lessonIndex = section.lessons.findIndex(l => l.id === lessonId);
            if (lessonIndex !== -1) {
              section.lessons.splice(lessonIndex, 1);
              lessonFound = true;
              break;
            }
          }
        }
        if (lessonFound) break;
      }
    }

    if (!lessonFound) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    // Reassign IDs after deletion
    assignCurriculumIds(course.curriculum);

    await course.save();

    res.status(200).json({
      success: true,
      message: "Video lesson deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting video lesson:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete video lesson",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all courses grouped by category (returns only basic fields, no pagination)
 * @route   GET /api/courses/category
 * @access  Public
 * @returns {object} Response with courses grouped by course_category
 * @param   {string} category - Course category to filter by (optional query parameter)
 * @param   {string} sort_by - Field to sort by (course_title, course_category)
 * @param   {string} sort_order - Sort order (asc, desc)
 * @param   {string} status - Filter by course status (Published, Draft, Upcoming)
 * @param   {string} class_type - Filter by class type
 * @param   {string} category_type - Filter by category type (Free, Paid, Live, etc.)
 */
const getCoursesByCategory = async (req, res) => {
  try {
    let {
      category,
      sort_by = "course_title",
      sort_order = "asc",
      status,
      class_type,
      category_type,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Add category filter only if category parameter is provided
    if (category && category.trim() !== '') {
      const decodedCategory = fullyDecodeURIComponent(category);
      filter.course_category = { $regex: createSafeRegex(decodedCategory) };
    }

    // Add additional filters if provided
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (class_type && class_type !== 'all') {
      filter.class_type = { $regex: createSafeRegex(class_type) };
    }

    if (category_type && category_type !== 'all') {
      filter.category_type = category_type;
    }

    // Add text search if provided
    if (search && search.trim() !== '') {
      const searchRegex = createSafeRegex(search.trim());
      filter.$or = [
        { course_title: { $regex: searchRegex } },
        { course_tag: { $regex: searchRegex } },
        { "course_description.program_overview": { $regex: searchRegex } },
        { "course_description.benefits": { $regex: searchRegex } }
      ];
    }

    // Build sort object
    const sortOrder = sort_order === "asc" ? 1 : -1;
    const sortObj = {};
    
    // Validate sort field - only allow sorting by returned fields
    const validSortFields = ["course_title", "course_category"];
    if (validSortFields.includes(sort_by)) {
      sortObj[sort_by] = sortOrder;
    } else {
      sortObj.course_title = 1; // Default sort by title
    }

    // Define projection for optimized queries - only return specific fields
    const projection = {
      course_category: 1,
      course_subcategory: 1,
      course_title: 1,
      course_tag: 1
    };

    // Execute queries in parallel for better performance - get ALL courses without pagination
    const [legacyCourses, blendedCourses, liveCourses, freeCourses] = await Promise.all([
      // Legacy Course model
      Course.find(filter, projection).sort(sortObj).lean(),
      
      // New course-types models
      BlendedCourse.find(filter, projection).sort(sortObj).lean(),
      LiveCourse.find(filter, projection).sort(sortObj).lean(),
      FreeCourse.find(filter, projection).sort(sortObj).lean()
    ]);

    // Combine all courses and mark course types
    const newTypeCourses = [
      ...blendedCourses.map(c => ({ ...c, course_type: "blended", _source: "new_model" })),
      ...liveCourses.map(c => ({ ...c, course_type: "live", _source: "new_model" })),
      ...freeCourses.map(c => ({ ...c, course_type: "free", _source: "new_model" }))
    ];

    const legacyCoursesMarked = legacyCourses.map(c => ({ ...c, _source: "legacy_model" }));
    const allCourses = [...legacyCoursesMarked, ...newTypeCourses];
    
    // Group courses by category
    const coursesByCategory = {};
    
    allCourses.forEach(course => {
      const categoryName = course.course_category || 'Uncategorized';
      
      if (!coursesByCategory[categoryName]) {
        coursesByCategory[categoryName] = [];
      }
      
      coursesByCategory[categoryName].push({
        _id: course._id,
        course_category: course.course_category,
        course_subcategory: course.course_subcategory,
        course_title: course.course_title,
        course_tag: course.course_tag
      });
    });

    // Sort courses within each category by title
    Object.keys(coursesByCategory).forEach(categoryName => {
      coursesByCategory[categoryName].sort((a, b) => {
        if (sort_order === 'desc') {
          return b.course_title.localeCompare(a.course_title);
        }
        return a.course_title.localeCompare(b.course_title);
      });
    });

    // Sort categories alphabetically
    const sortedCategories = Object.keys(coursesByCategory).sort();
    const sortedCoursesByCategory = {};
    sortedCategories.forEach(categoryName => {
      sortedCoursesByCategory[categoryName] = coursesByCategory[categoryName];
    });

    const totalCourses = allCourses.length;
    const totalCategories = Object.keys(coursesByCategory).length;

    // Response with courses grouped by category
    const responseMessage = category && category.trim() !== '' 
      ? `Courses retrieved successfully for category: ${category}`
      : 'All courses retrieved successfully, grouped by category';
    
    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        coursesByCategory: sortedCoursesByCategory,
        summary: {
          totalCourses,
          totalCategories,
          categoriesWithCounts: Object.keys(sortedCoursesByCategory).map(categoryName => ({
            category: categoryName,
            courseCount: sortedCoursesByCategory[categoryName].length
          }))
        },
        filters: {
          category: category && category.trim() !== '' ? category : 'all',
          status: status || 'all',
          class_type: class_type || 'all',
          category_type: category_type || 'all',
          search: search || null
        },
        sorting: {
          sort_by,
          sort_order
        },
        sources: {
          legacy_model: legacyCoursesMarked.length,
          new_model: newTypeCourses.length
        }
      }
    });

  } catch (error) {
    console.error("Error fetching courses by category:", error);
    logger.error("Error fetching courses by category:", error);
    
    res.status(500).json({
      success: false,
      message: "Error fetching courses by category",
      error: error.message || "An unexpected error occurred",
    });
  }
};

/**
 * @desc    Get all courses with curriculum by category name
 * @route   GET /api/v1/courses/by-category/:categoryName
 * @access  Public
 * @param   {string} categoryName - Direct category name (e.g., 'Digital Marketing with Data Analytics')
 * @param   {string} include_curriculum - Include full curriculum details (default: true)
 * @param   {string} status - Filter by course status (default: Published)
 * @param   {number} page - Page number for pagination (default: 1)
 * @param   {number} limit - Number of courses per page (default: 10)
 */
const getCoursesByCategoryName = async (req, res) => {
  try {
    const { categoryName } = req.params;
    const {
      include_curriculum = "true",
      status = "Published",
      page = 1,
      limit = 10,
      sort_by = "createdAt",
      sort_order = "desc"
    } = req.query;

    // Decode the category name from URL encoding
    const decodedCategoryName = fullyDecodeURIComponent(categoryName);

    // Build filter object
    const filter = {
      status: { $regex: status, $options: "i" },
      course_category: { $regex: createSafeRegex(decodedCategoryName) }
    };

    // Build sort object
    const sortOrder = sort_order === "asc" ? 1 : -1;
    const sortObj = {};
    sortObj[sort_by] = sortOrder;

    // Define projection based on curriculum inclusion
    const baseProjection = {
      course_title: 1,
      course_category: 1,
      course_subcategory: 1,
      course_tag: 1,
      course_image: 1,
      course_description: 1,
      course_level: 1,
      course_duration: 1,
      course_fee: 1,
      prices: 1,
      isFree: 1,
      status: 1,
      category_type: 1,
      class_type: 1,
      assigned_instructor: 1,
      no_of_Sessions: 1,
      session_duration: 1,
      language: 1,
      is_Certification: 1,
      is_Assignments: 1,
      is_Projects: 1,
      is_Quizes: 1,
      createdAt: 1,
      updatedAt: 1,
      slug: 1,
      meta: 1
    };

    if (include_curriculum === "true") {
      baseProjection.curriculum = 1;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel for all course models
    const [legacyCourses, blendedCourses, liveCourses, freeCourses] = await Promise.all([
      // Legacy Course model
      Course.find(filter, baseProjection)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sortObj)
        .lean(),
      
      // New course-types models
      BlendedCourse.find(filter, baseProjection)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sortObj)
        .lean(),
      
      LiveCourse.find(filter, baseProjection)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sortObj)
        .lean(),
      
      FreeCourse.find(filter, baseProjection)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sortObj)
        .lean()
    ]);

    // Combine all courses and mark course types
    const newTypeCourses = [
      ...blendedCourses.map(c => ({ ...c, course_type: "blended", _source: "new_model" })),
      ...liveCourses.map(c => ({ ...c, course_type: "live", _source: "new_model" })),
      ...freeCourses.map(c => ({ ...c, course_type: "free", _source: "new_model" }))
    ];

    const legacyCoursesMarked = legacyCourses.map(c => ({ ...c, _source: "legacy_model" }));
    let allCourses = [...legacyCoursesMarked, ...newTypeCourses];

    // Process courses response (format durations, etc.)
    allCourses = processCoursesResponse(allCourses);

    // Apply pagination
    const totalCourses = allCourses.length;
    const paginatedCourses = allCourses.slice(skip, skip + limitNum);

    // Calculate curriculum statistics if curriculum is included
    let curriculumStats = null;
    if (include_curriculum === "true" && paginatedCourses.length > 0) {
      curriculumStats = {
        courses_with_curriculum: paginatedCourses.filter(course => course.curriculum && course.curriculum.length > 0).length,
        total_weeks: paginatedCourses.reduce((total, course) => {
          return total + (course.curriculum ? course.curriculum.length : 0);
        }, 0),
        avg_weeks_per_course: 0
      };
      
      if (curriculumStats.courses_with_curriculum > 0) {
        curriculumStats.avg_weeks_per_course = Math.round(
          curriculumStats.total_weeks / curriculumStats.courses_with_curriculum
        );
      }
    }

    // Build response
    const response = {
      success: true,
      message: `Courses retrieved successfully for category: ${decodedCategoryName}`,
      data: {
        courses: paginatedCourses,
        category: {
          name: decodedCategoryName,
          total_courses: totalCourses
        },
        pagination: {
          current_page: pageNum,
          total_pages: Math.ceil(totalCourses / limitNum),
          total_courses: totalCourses,
          per_page: limitNum,
          has_next: pageNum < Math.ceil(totalCourses / limitNum),
          has_prev: pageNum > 1
        },
        filters: {
          status: status,
          include_curriculum: include_curriculum === "true"
        },
        sorting: {
          sort_by,
          sort_order
        },
        sources: {
          legacy_model: legacyCoursesMarked.length,
          new_model: newTypeCourses.length
        }
      }
    };

    // Add curriculum stats if available
    if (curriculumStats) {
      response.data.curriculum_stats = curriculumStats;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching courses by category name:", error);
    logger.error("Error fetching courses by category name:", error);
    
    res.status(500).json({
      success: false,
      message: "Error fetching courses by category name",
      error: error.message || "An unexpected error occurred",
    });
  }
};

export {
  createCourse,
  getAllCourses,
  getCourseById,
  getCoorporateCourseById,
  updateCourse,
  deleteCourse,
  getCourseTitles,
  getAllCoursesWithLimits,
  getCoursesByCategory,
  getCoursesByCategoryName,
  toggleCourseStatus,
  updateRecordedVideos,
  getRecordedVideosForUser,
  getAllRelatedCourses,
  getNewCoursesWithLimits,
  downloadBrochure,
  getCourseSections,
  getCourseLessons,
  getLessonDetails,
  getCourseProgress,
  markLessonComplete,
  getCourseAssignments,
  submitAssignment,
  getCourseQuizzes,
  submitQuiz,
  getQuizResults,
  getLessonResources,
  downloadResource,
  addLessonNote,
  addLessonBookmark,
  handleUpload,
  handleMultipleUpload,
  getLessonNotes,
  updateNote,
  deleteNote,
  getLessonBookmarks,
  updateBookmark,
  deleteBookmark,
  getCoursePrices,
  updateCoursePrices,
  bulkUpdateCoursePrices,
  getAllCoursesWithPrices,
  getCoursesWithFields,
  groupCoursesByClassType,
  getHomeCourses,
  toggleShowInHome,
  schedulePublish,
  getScheduledPublish,
  cancelScheduledPublish,
  getAllScheduledPublishes,
  executeScheduledPublishes,
  uploadCourseImage,
  uploadCourseImageFile,
  addVideoLessonToCourse,
  updateVideoLesson,
  deleteVideoLesson,
  getLessonSignedVideoUrl,
};

// List all courses with show_in_home tag for home page
const getHomeCourses = async (req, res) => {
  try {
    const courses = await Course.find({ show_in_home: true, status: "Published" })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (err) {
    logger.error("Error fetching home courses:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Toggle the show_in_home field for a course
const toggleShowInHome = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    course.show_in_home = !course.show_in_home;
    await course.save();
    return res.status(200).json({
      success: true,
      message: `show_in_home toggled to ${course.show_in_home}`,
      data: { id: course._id, show_in_home: course.show_in_home },
    });
  } catch (err) {
    logger.error("Error toggling show_in_home:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Schedule course publishing
 * @route POST /api/courses/:id/schedule-publish
 * @access Admin
 */
const schedulePublish = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { publishDate, publishTime, timezone = 'UTC' } = req.body;

  // Validate required fields
  if (!publishDate) {
    return res.status(400).json(
      responseFormatter(false, "Publish date is required", null, 400)
    );
  }

  // Validate course exists
  const course = await Course.findById(id);
  if (!course) {
    return res.status(404).json(
      responseFormatter(false, "Course not found", null, 404)
    );
  }

  // Create scheduled publish datetime
  let scheduledDateTime;
  try {
    if (publishTime) {
      // Combine date and time
      const dateTimeString = `${publishDate}T${publishTime}:00.000Z`;
      scheduledDateTime = new Date(dateTimeString);
    } else {
      // Use date only (default to midnight UTC)
      scheduledDateTime = new Date(`${publishDate}T00:00:00.000Z`);
    }

    // Validate the date is in the future
    const now = new Date();
    if (scheduledDateTime <= now) {
      return res.status(400).json(
        responseFormatter(false, "Scheduled publish date must be in the future", null, 400)
      );
    }
  } catch (error) {
    return res.status(400).json(
      responseFormatter(false, "Invalid date or time format", null, 400)
    );
  }

  // Update course with scheduled publish information
  const updatedCourse = await Course.findByIdAndUpdate(
    id,
    {
      $set: {
        scheduledPublishDate: scheduledDateTime,
        scheduledPublishTimezone: timezone,
        status: course.status === 'Published' ? 'Published' : 'Upcoming', // Keep published courses as published
        'meta.lastUpdated': new Date()
      }
    },
    { new: true, runValidators: true }
  );

  logger.info(`Course ${id} scheduled for publishing on ${scheduledDateTime.toISOString()}`);

  res.status(200).json(
    responseFormatter(
      true,
      "Course publishing scheduled successfully",
      {
        course: {
          id: updatedCourse._id,
          title: updatedCourse.course_title,
          status: updatedCourse.status,
          scheduledPublishDate: updatedCourse.scheduledPublishDate,
          scheduledPublishTimezone: updatedCourse.scheduledPublishTimezone,
          currentTime: new Date().toISOString()
        }
      },
      200
    )
  );
});

/**
 * Get scheduled publish information for a course
 * @route GET /api/courses/:id/schedule-publish
 * @access Admin
 */
const getScheduledPublish = catchAsync(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findById(id).select(
    'course_title status scheduledPublishDate scheduledPublishTimezone meta.lastUpdated'
  );

  if (!course) {
    return res.status(404).json(
      responseFormatter(false, "Course not found", null, 404)
    );
  }

  const scheduleInfo = {
    courseId: course._id,
    title: course.course_title,
    status: course.status,
    scheduledPublishDate: course.scheduledPublishDate || null,
    scheduledPublishTimezone: course.scheduledPublishTimezone || null,
    isScheduled: !!course.scheduledPublishDate,
    currentTime: new Date().toISOString()
  };

  // Add time remaining if scheduled
  if (course.scheduledPublishDate) {
    const now = new Date();
    const timeRemaining = course.scheduledPublishDate.getTime() - now.getTime();
    scheduleInfo.timeRemainingMs = Math.max(0, timeRemaining);
    scheduleInfo.isPastDue = timeRemaining <= 0;
  }

  res.status(200).json(
    responseFormatter(
      true,
      "Schedule information retrieved successfully",
      scheduleInfo,
      200
    )
  );
});

/**
 * Cancel scheduled publishing for a course
 * @route DELETE /api/courses/:id/schedule-publish
 * @access Admin
 */
const cancelScheduledPublish = catchAsync(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findById(id);
  if (!course) {
    return res.status(404).json(
      responseFormatter(false, "Course not found", null, 404)
    );
  }

  if (!course.scheduledPublishDate) {
    return res.status(400).json(
      responseFormatter(false, "No scheduled publishing found for this course", null, 400)
    );
  }

  // Remove scheduled publish information
  const updatedCourse = await Course.findByIdAndUpdate(
    id,
    {
      $unset: {
        scheduledPublishDate: 1,
        scheduledPublishTimezone: 1
      },
      $set: {
        'meta.lastUpdated': new Date()
      }
    },
    { new: true, runValidators: true }
  );

  logger.info(`Scheduled publishing cancelled for course ${id}`);

  res.status(200).json(
    responseFormatter(
      true,
      "Scheduled publishing cancelled successfully",
      {
        courseId: updatedCourse._id,
        title: updatedCourse.course_title,
        status: updatedCourse.status
      },
      200
    )
  );
});

/**
 * Get all courses with scheduled publishing
 * @route GET /api/courses/scheduled-publishes
 * @access Admin
 */
const getAllScheduledPublishes = catchAsync(async (req, res) => {
  const { status, upcoming } = req.query;
  
  // Build filter
  const filter = {
    scheduledPublishDate: { $exists: true, $ne: null }
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (upcoming === 'true') {
    filter.scheduledPublishDate = { $gt: new Date() };
  }

  const courses = await Course.find(filter)
    .select('course_title status scheduledPublishDate scheduledPublishTimezone meta.lastUpdated createdAt')
    .sort({ scheduledPublishDate: 1 });

  const now = new Date();
  const scheduledCourses = courses.map(course => ({
    courseId: course._id,
    title: course.course_title,
    status: course.status,
    scheduledPublishDate: course.scheduledPublishDate,
    scheduledPublishTimezone: course.scheduledPublishTimezone,
    timeRemainingMs: Math.max(0, course.scheduledPublishDate.getTime() - now.getTime()),
    isPastDue: course.scheduledPublishDate <= now,
    createdAt: course.createdAt,
    lastUpdated: course.meta.lastUpdated
  }));

  res.status(200).json(
    responseFormatter(
      true,
      "Scheduled publishes retrieved successfully",
      {
        courses: scheduledCourses,
        total: scheduledCourses.length,
        filters: { status: status || 'all', upcoming: upcoming === 'true' }
      },
      200
    )
  );
});

/**
 * Execute scheduled publishing (typically called by cron job)
 * @route POST /api/courses/execute-scheduled-publishes
 * @access Admin/System
 */
const executeScheduledPublishes = catchAsync(async (req, res) => {
  const now = new Date();
  
  // Find courses that are scheduled to be published and past their publish date
  const coursesToPublish = await Course.find({
    scheduledPublishDate: { $lte: now },
    status: { $ne: 'Published' }
  });

  if (coursesToPublish.length === 0) {
    return res.status(200).json(
      responseFormatter(
        true,
        "No courses ready for publishing",
        { publishedCount: 0 },
        200
      )
    );
  }

  const publishResults = [];
  
  for (const course of coursesToPublish) {
    try {
      // Update course status to Published and remove scheduling fields
      const updatedCourse = await Course.findByIdAndUpdate(
        course._id,
        {
          $set: {
            status: 'Published',
            'meta.lastUpdated': new Date()
          },
          $unset: {
            scheduledPublishDate: 1,
            scheduledPublishTimezone: 1
          }
        },
        { new: true, runValidators: true }
      );

      publishResults.push({
        courseId: course._id,
        title: course.course_title,
        previousStatus: course.status,
        newStatus: 'Published',
        scheduledDate: course.scheduledPublishDate,
        publishedAt: new Date(),
        success: true
      });

      logger.info(`Course ${course._id} (${course.course_title}) published successfully via scheduled publishing`);
    } catch (error) {
      publishResults.push({
        courseId: course._id,
        title: course.course_title,
        error: error.message,
        success: false
      });

      logger.error(`Failed to publish course ${course._id}: ${error.message}`);
    }
  }

  const successCount = publishResults.filter(result => result.success).length;
  const failureCount = publishResults.filter(result => !result.success).length;

  res.status(200).json(
    responseFormatter(
      true,
      `Scheduled publishing executed: ${successCount} published, ${failureCount} failed`,
      {
        publishedCount: successCount,
        failedCount: failureCount,
        results: publishResults
      },
      200
    )
  );
});

// ------------------------------
// Generate signed CloudFront URL for a video lesson
// ------------------------------
/**
 * @desc    Generate a time-limited signed CloudFront URL for a video lesson
 * @route   GET /api/courses/:courseId/lessons/:lessonId/video-signed-url
 * @access  Private (Enrolled Students)
 */
const getLessonSignedVideoUrl = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    // Ensure student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active",
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to access this video.",
      });
    }

    // Fetch course and locate the lesson inside curriculum
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Helper to find lesson in nested curriculum structure
    let lesson = null;
    for (const week of course.curriculum || []) {
      // Direct lessons
      if (week.lessons && week.lessons.length) {
        lesson = week.lessons.find((l) => l.id === lessonId);
        if (lesson) break;
      }
      // Section lessons
      if (!lesson && week.sections && week.sections.length) {
        for (const section of week.sections) {
          lesson = section.lessons?.find((l) => l.id === lessonId);
          if (lesson) break;
        }
      }
      if (lesson) break;
    }

    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    // Validate lesson is a video lesson and has a video_url
    if (lesson.lessonType !== "video" || !lesson.video_url) {
      return res.status(400).json({
        success: false,
        message: "Requested lesson does not have an associated video.",
      });
    }

    // Generate signed URL (5-minute default or env variable)
    const signedUrl = generateSignedUrl(lesson.video_url);

    return res.status(200).json({ success: true, data: { signedUrl } });
  } catch (error) {
    console.error("Error generating signed CloudFront URL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate signed URL",
      error: error.message,
    });
  }
};
