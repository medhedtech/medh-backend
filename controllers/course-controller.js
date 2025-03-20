const { default: mongoose } = require("mongoose");
const Course = require("../models/course-model");
const EnrolledCourse = require("../models/enrolled-courses-model");
const { validateObjectId } = require("../utils/validation-helpers");
const Progress = require("../models/progress-model");
const Note = require("../models/note-model");
const Bookmark = require("../models/bookmark-model");
const Enrollment = require("../models/enrollment-model");
const CourseCreationService = require("../services/courseCreationService");
const { handleUploadError } = require("../middleware/upload");

/**
 * @desc    Create a new course
 * @route   POST /api/courses/create
 * @access  Private/Admin
 */
const createCourse = async (req, res) => {
  try {
    // Handle file upload error if any
    if (req.fileError) {
      return res.status(400).json({
        success: false,
        message: req.fileError
      });
    }

    // Add course image URL if file was uploaded
    if (req.file) {
      req.body.course_image = req.file.location;
    }

    // Create course with lessons using the service
    const course = await CourseCreationService.createCourseWithLessons(req.body);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message
    });
  }
};

/**
 * @desc    Get all courses without pagination
 * @route   GET /api/courses/get
 * @access  Public
 */
const getAllCourses = async (req, res) => {
  try {
    // Use lean() for better performance when you don't need Mongoose document methods
    // Use projection to select only needed fields for better performance
    const courses = await Course.find({}, {
      course_title: 1,
      course_category: 1,
      course_tag: 1,
      course_image: 1,
      course_fee: 1,
      isFree: 1,
      status: 1,
      category_type: 1,
      createdAt: 1
    }).lean();
    
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error("Error fetching all courses:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching courses", 
      error: error.message || "An unexpected error occurred"
    });
  }
};

/**
 * @desc    Get all courses with filtering, pagination and search
 * @route   GET /api/courses/search
 * @access  Public
 */
const getAllCoursesWithLimits = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      course_category,
      category_type,
      status,
      price_range,
      course_tag,
      class_type,
      sort_by = "createdAt",
      sort_order = "desc",
      min_duration,
      max_duration,
      certification = "",
      has_assignments = "",
      has_projects = "",
      has_quizzes = "",
      exclude_ids = [],
      no_of_Sessions,
      description,
      course_grade,
      resource_videos,
      resource_pdfs,
      curriculum,
      tools_technologies,
      min_hours_per_week,
      max_hours_per_week,
      user_id,
      course_duration,
    } = req.query;

    // Helper function to recursively decode URL encoded strings
    const fullyDecodeURIComponent = (str) => {
      try {
        let decoded = str;
        while (decoded.includes('%')) {
          const prevDecoded = decoded;
          decoded = decodeURIComponent(decoded);
          if (prevDecoded === decoded) break; // Break if no further decoding possible
        }
        return decoded;
      } catch (e) {
        console.warn("Decoding error:", e);
        return str;
      }
    };

    // Helper function to handle array or string filters with support for multiple types
    const handleArrayOrStringFilter = (field, value) => {
      if (!value) return;
      
      if (Array.isArray(value)) {
        // For arrays, handle each value with full decoding
        const decodedValues = value.map(item => fullyDecodeURIComponent(item));
        filter[field] = { 
          $in: decodedValues.map(item => new RegExp('^' + escapeRegExp(item) + '$', 'i'))
        };
      } else if (typeof value === 'string') {
        const decodedValue = fullyDecodeURIComponent(value);
        
        // Handle multiple values separated by commas or other delimiters
        if (decodedValue.includes(',') || decodedValue.includes('|') || decodedValue.includes(';')) {
          const separators = /[,|;]/;
          const values = decodedValue.split(separators).map(v => v.trim()).filter(Boolean);
          filter[field] = { 
            $in: values.map(v => new RegExp('^' + escapeRegExp(v) + '$', 'i'))
          };
        } else {
          // For single values, support both exact and partial matching
          filter[field] = {
            $regex: new RegExp(escapeRegExp(decodedValue), 'i')
          };
        }
      }
    };

    // Helper function to escape special regex characters
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Parse and validate pagination parameters
    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page and limit must be positive numbers."
      });
    }

    // Initialize filter object
    const filter = {};
    const textSearchFields = {};

    // Handle text search with full decoding
    if (search) {
      const decodedSearch = fullyDecodeURIComponent(search);
      if (decodedSearch.length >= 3) {
        filter.$text = { $search: decodedSearch };
        textSearchFields.score = { $meta: "textScore" };
      } else {
        filter.$or = [
          { course_title: { $regex: new RegExp(escapeRegExp(decodedSearch), 'i') } },
          { course_category: { $regex: new RegExp(escapeRegExp(decodedSearch), 'i') } },
          { course_tag: { $regex: new RegExp(escapeRegExp(decodedSearch), 'i') } },
          { "course_description.program_overview": { $regex: new RegExp(escapeRegExp(decodedSearch), 'i') } },
          { "course_description.benefits": { $regex: new RegExp(escapeRegExp(decodedSearch), 'i') } },
          { course_grade: { $regex: new RegExp(escapeRegExp(decodedSearch), 'i') } }
        ];
      }
    }

    // Apply filters with proper decoding
    if (course_duration) filter.course_duration = fullyDecodeURIComponent(course_duration);
    if (min_hours_per_week) filter.min_hours_per_week = fullyDecodeURIComponent(min_hours_per_week);
    if (max_hours_per_week) filter.max_hours_per_week = fullyDecodeURIComponent(max_hours_per_week);
    if (no_of_Sessions) filter.no_of_Sessions = fullyDecodeURIComponent(no_of_Sessions);
    if (description) filter.course_description = fullyDecodeURIComponent(description);
    if (course_grade) filter.course_grade = fullyDecodeURIComponent(course_grade);
    if (resource_videos) filter.resource_videos = fullyDecodeURIComponent(resource_videos);
    if (resource_pdfs) filter.resource_pdfs = fullyDecodeURIComponent(resource_pdfs);
    if (curriculum) filter.curriculum = fullyDecodeURIComponent(curriculum);
    if (tools_technologies) filter.tools_technologies = fullyDecodeURIComponent(tools_technologies);

    // Apply all the filters with support for multiple values
    handleArrayOrStringFilter('course_category', course_category);
    handleArrayOrStringFilter('category_type', category_type);
    handleArrayOrStringFilter('course_tag', course_tag);
    handleArrayOrStringFilter('class_type', class_type);

    // After all filters are applied, log the constructed filter for debugging
    console.log("Applied filters:", JSON.stringify(filter, null, 2));
    console.log("Decoded course_category:", course_category ? fullyDecodeURIComponent(course_category) : null);

    if (status) {
      // Make status case-insensitive and handle multiple values
      const decodedStatus = fullyDecodeURIComponent(status);
      if (decodedStatus.includes(',')) {
        filter.status = { 
          $in: decodedStatus.split(',').map(s => new RegExp('^' + escapeRegExp(s.trim()) + '$', 'i'))
        };
      } else {
        filter.status = new RegExp('^' + escapeRegExp(decodedStatus) + '$', 'i');
      }
    }

    if (price_range) {
      const [min, max] = price_range.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filter.course_fee = { $gte: min, $lte: max };
      }
    }

    if (min_duration || max_duration) {
      const durationFilterQuery = [];
      if (min_duration) {
        const minDuration = parseInt(min_duration);
        if (!isNaN(minDuration)) {
          durationFilterQuery.push({ 
            course_duration: { $regex: new RegExp(`${minDuration}.*weeks?|${minDuration}.*months?|${minDuration}.*days?`, 'i') } 
          });
          for (let i = minDuration + 1; i <= 52; i++) {
            durationFilterQuery.push({ 
              course_duration: { $regex: new RegExp(`${i}.*weeks?|${i}.*months?|${i}.*days?`, 'i') } 
            });
          }
        }
      }
      if (max_duration) {
        const maxDuration = parseInt(max_duration);
        if (!isNaN(maxDuration)) {
          if (durationFilterQuery.length > 0) {
            for (let i = maxDuration + 1; i <= 52; i++) {
              durationFilterQuery.push({ 
                course_duration: { $not: { $regex: new RegExp(`${i}.*weeks?|${i}.*months?|${i}.*days?`, 'i') } } 
              });
            }
          } else {
            for (let i = 1; i <= maxDuration; i++) {
              durationFilterQuery.push({ 
                course_duration: { $regex: new RegExp(`${i}.*weeks?|${i}.*months?|${i}.*days?`, 'i') } 
              });
            }
          }
        }
      }
      if (durationFilterQuery.length > 0) {
        filter.$and = (filter.$and || []).concat(durationFilterQuery);
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
      const excludeIdsArray = Array.isArray(exclude_ids) ? exclude_ids : exclude_ids.split(',');
      const validIds = excludeIdsArray
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      if (validIds.length > 0) {
        filter._id = { $nin: validIds };
      }
    }

    // If user_id is provided, exclude courses the user is already enrolled in
    if (user_id) {
      try {
        const enrolledCourses = await EnrolledCourse.find({
          student_id: user_id,
        }, "course_id").lean();

        const enrolledCourseIds = enrolledCourses.map(
          (enrolledCourse) => enrolledCourse.course_id
        );
        
        if (enrolledCourseIds.length) {
          filter._id = { $nin: enrolledCourseIds };
        }
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      }
    }

    // Final debug log
    console.log("Final filter object:", JSON.stringify(filter, null, 2));

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
      course_fee: 1,
      course_duration: 1,
      isFree: 1,
      status: 1,
      category_type: 1,
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
      resource_videos: 1,
      resource_pdfs: 1,
      curriculum: 1,
      tools_technologies: 1,
      min_hours_per_week: 1,
      max_hours_per_week: 1,
      ...textSearchFields
    };

    const aggregationPipeline = [
      { $match: filter },
      {
        $addFields: {
          ...textSearchFields,
          pricing_summary: {
            min_price: { $min: "$prices.individual" },
            max_price: { $max: "$prices.batch" }
          }
        }
      },
      { $sort: sortOptions },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: projection }
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
              { $sort: { count: -1 } }
            ],
            categoryTypes: [
              { $group: { _id: "$category_type", count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            courseTags: [
              { $group: { _id: "$course_tag", count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            classTypes: [
              { $group: { _id: "$class_type", count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            priceRanges: [
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$course_fee", 0] }, then: "Free" },
                        { case: { $lte: ["$course_fee", 1000] }, then: "0-1000" },
                        { case: { $lte: ["$course_fee", 5000] }, then: "1001-5000" },
                        { case: { $lte: ["$course_fee", 10000] }, then: "5001-10000" }
                      ],
                      default: "10000+"
                    }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { "_id": 1 } }
            ],
            features: [
              {
                $group: {
                  _id: null,
                  certification: {
                    $push: {
                      k: "$is_Certification",
                      v: { $sum: 1 }
                    }
                  },
                  assignments: {
                    $push: {
                      k: "$is_Assignments",
                      v: { $sum: 1 }
                    }
                  },
                  projects: {
                    $push: {
                      k: "$is_Projects",
                      v: { $sum: 1 }
                    }
                  },
                  quizzes: {
                    $push: {
                      k: "$is_Quizes",
                      v: { $sum: 1 }
                    }
                  }
                }
              },
              {
                $project: {
                  certification: { $arrayToObject: "$certification" },
                  assignments: { $arrayToObject: "$assignments" },
                  projects: { $arrayToObject: "$projects" },
                  quizzes: { $arrayToObject: "$quizzes" }
                }
              }
            ]
          }
        }
      ])
    ]);

    const totalPages = Math.ceil(totalCourses / limit);

    res.status(200).json({
      success: true,
      courses,
      pagination: {
        totalCourses,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      facets: facets[0],
      filters: {
        applied: {
          search,
          course_category,
          category_type,
          course_tag,
          class_type,
          status,
          price_range,
          certification,
          has_assignments,
          has_projects,
          has_quizzes
        }
      }
    });
  } catch (error) {
    console.error("Error in getAllCoursesWithLimits:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching courses",
      error: error.message || "An unexpected error occurred"
    });
  }
};

/**
 * @desc    Get new courses with filtering and pagination
 * @route   GET /api/courses/new
 * @access  Public
 */
const getNewCoursesWithLimits = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      course_tag,
      status,
      search,
      user_id,
      sort_by = "createdAt",
      sort_order = "desc",
    } = req.query;

    // Parse and validate pagination parameters
    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page and limit must be positive numbers."
      });
    }

    // Validate user_id if provided
    if (user_id && !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    // Create a dynamic filter object
    const filter = {};

    // Add filters using regex for partial matches with case insensitivity
    if (course_tag) {
      if (Array.isArray(course_tag)) {
        filter.course_tag = { $in: course_tag };
      } else if (typeof course_tag === 'string') {
        // Handle comma-separated string values
        if (course_tag.includes(',')) {
          filter.course_tag = { $in: course_tag.split(',').map(c => c.trim()) };
        } else {
          filter.course_tag = course_tag;
        }
      }
    }
    
    if (status) {
      filter.status = status;
    }

    // Add full-text search across multiple fields
    if (search) {
      if (search.length >= 3) {
        filter.$text = { $search: search };
      } else {
        filter.$or = [
          { course_title: { $regex: search, $options: "i" } },
          { course_tag: { $regex: search, $options: "i" } },
          { course_category: { $regex: search, $options: "i" } },
          { "course_description.program_overview": { $regex: search, $options: "i" } },
          { "course_description.benefits": { $regex: search, $options: "i" } },
          { course_grade: { $regex: search, $options: "i" } },
        ];
      }
    }

    // If user_id is provided, exclude courses the user is already enrolled in
    let enrolledCourseIds = [];
    if (user_id) {
      const enrolledCourses = await EnrolledCourse.find({
        student_id: user_id,
      }, "course_id").lean();

      enrolledCourseIds = enrolledCourses.map(
        (enrolledCourse) => enrolledCourse.course_id
      );
      
      if (enrolledCourseIds.length) {
        filter._id = { $nin: enrolledCourseIds };
      }
    }

    // Handle sorting
    const sortOptions = {};
    
    if (sort_by === "relevance" && filter.$text) {
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

    // Select only needed fields for the response
    const projection = {
      course_title: 1,
      course_category: 1,
      course_tag: 1,
      course_image: 1,
      course_fee: 1,
      course_duration: 1,
      isFree: 1,
      status: 1,
      category_type: 1,
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
      resource_videos: 1,
      resource_pdfs: 1,
      curriculum: 1,
      tools_technologies: 1,
      course_videos: 1,
      brochures: 1,
      faqs: 1,
      related_courses: 1,
      course_image: 1,
      course_fee: 1,
      course_duration: 1,
      isFree: 1,
    };

    // Add textScore projection if using text search
    if (filter.$text) {
      projection.score = { $meta: "textScore" };
    }

    // Execute query with Promise.all for parallel processing
    const [courses, totalCourses] = await Promise.all([
      Course.find(filter, projection)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sortOptions)
        .lean(),
      Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCourses / limit);

    // Increment view count for returned courses
    if (courses.length > 0) {
      const bulkUpdateOps = courses.map(course => ({
        updateOne: {
          filter: { _id: course._id },
          update: { $inc: { "meta.views": 1 } }
        }
      }));
      
      // Execute bulk update without waiting for completion
      Course.bulkWrite(bulkUpdateOps).catch(err => {
        console.error("Error updating course view counts:", err);
      });
    }

    res.status(200).json({
      success: true,
      courses,
      pagination: {
        totalCourses,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        applied: {
          search,
          course_tag,
          status,
          user_id: user_id ? true : false,
          enrolledCoursesExcluded: enrolledCourseIds.length
        }
      }
    });
  } catch (error) {
    console.error("Error in getNewCoursesWithLimits:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching courses", 
      error: error.message || "An unexpected error occurred"
    });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;
    
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format"
      });
    }
    
    // Validate student ID if provided
    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    
    // Use aggregation to look up enrollment information if studentId is provided
    const aggregationPipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      }
    ];
    
    // Only add the lookup stage if studentId is provided
    if (studentId) {
      aggregationPipeline.push({
        $lookup: {
          from: "enrolledmodules",
          let: { course_id: "$_id" },
          pipeline: [
            {
              $match: {
                student_id: new mongoose.Types.ObjectId(studentId),
                $expr: {
                  $eq: ["$course_id", "$$course_id"],
                },
              },
            },
          ],
          as: "enrolled_module",
        },
      });
    }
    
    const course = await Course.aggregate(aggregationPipeline);

    if (!course.length) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: course[0]
    });
  } catch (error) {
    console.error("Error in getCourseById:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course", 
      error: error.message || "An unexpected error occurred"
    });
  }
};

// Get course by ID for corporate users
const getCoorporateCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { coorporateId } = req.query;
    
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format"
      });
    }
    
    // Validate corporate ID if provided
    if (coorporateId && !mongoose.Types.ObjectId.isValid(coorporateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid corporate ID format"
      });
    }
    
    // Use aggregation to look up enrollment information if coorporateId is provided
    const aggregationPipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      }
    ];
    
    // Only add the lookup stage if coorporateId is provided
    if (coorporateId) {
      aggregationPipeline.push({
        $lookup: {
          from: "coorporateenrolledmodules",
          let: { course_id: "$_id" },
          pipeline: [
            {
              $match: {
                coorporate_id: new mongoose.Types.ObjectId(coorporateId),
                $expr: {
                  $eq: ["$course_id", "$$course_id"],
                },
              },
            },
          ],
          as: "enrolled_module",
        },
      });
    }
    
    const course = await Course.aggregate(aggregationPipeline);

    if (!course.length) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: course[0]
    });
  } catch (error) {
    console.error("Error in getCoorporateCourseById:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course", 
      error: error.message || "An unexpected error occurred"
    });
  }
};

// Update course by ID
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      course_category,
      category_type,
      course_title,
      no_of_Sessions,
      course_duration,
      session_duration,
      course_description,
      course_fee,
      course_videos,
      brochures,
      course_image,
      course_grade,
      resource_videos,
      resource_pdfs,
      curriculum,
      tools_technologies,
      bonus_modules,
      faqs,
      min_hours_per_week,
      max_hours_per_week,
      efforts_per_Week,
      class_type,
      is_Certification,
      is_Assignments,
      is_Projects,
      is_Quizes,
      related_courses,
      prices,
    } = req.body;

    // Format efforts per week if not already formatted
    const formattedEffortsPerWeek = efforts_per_Week || 
      `${min_hours_per_week} - ${max_hours_per_week} hours / week`;

    // Process curriculum if provided
    const processedCurriculum = curriculum ? curriculum.map(week => ({
      weekTitle: week.weekTitle,
      weekDescription: week.weekDescription,
      topics: week.topics || [],
      resources: week.resources || []
    })) : undefined;

    // Process tools and technologies if provided
    const processedTools = tools_technologies ? tools_technologies.map(tool => ({
      name: tool.name,
      category: tool.category || 'other',
      description: tool.description || '',
      logo_url: tool.logo_url || ''
    })) : undefined;

    // Process bonus modules if provided
    const processedBonusModules = bonus_modules ? bonus_modules.map(module => ({
      title: module.title,
      description: module.description || '',
      resources: module.resources || []
    })) : undefined;

    // Process FAQs if provided
    const processedFaqs = faqs ? faqs.map(faq => ({
      question: faq.question,
      answer: faq.answer
    })) : undefined;

    // Process prices if provided
    const processedPrices = prices ? prices.map(price => ({
      currency: price.currency,
      individual: price.individual || 0,
      batch: price.batch || 0,
      min_batch_size: price.min_batch_size || 2,
      max_batch_size: price.max_batch_size || 10,
      early_bird_discount: price.early_bird_discount || 0,
      group_discount: price.group_discount || 0,
      is_active: price.is_active !== false
    })) : undefined;

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      {
        course_category,
        category_type,
        course_title,
        no_of_Sessions,
        course_duration,
        session_duration,
        course_description,
        course_fee,
        course_videos,
        brochures,
        course_image,
        course_grade,
        resource_videos,
        resource_pdfs,
        curriculum: processedCurriculum,
        tools_technologies: processedTools,
        bonus_modules: processedBonusModules,
        faqs: processedFaqs,
        min_hours_per_week,
        max_hours_per_week,
        efforts_per_Week: formattedEffortsPerWeek,
        class_type,
        is_Certification,
        is_Assignments,
        is_Projects,
        is_Quizes,
        related_courses,
        prices: processedPrices,
        isFree: category_type === "Free",
      },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse,
      summary: {
        curriculum: {
          totalWeeks: updatedCourse.curriculum?.length || 0,
          totalTopics: updatedCourse.curriculum?.reduce((total, week) => total + (week.topics?.length || 0), 0) || 0,
          totalResources: updatedCourse.curriculum?.reduce((total, week) => total + (week.resources?.length || 0), 0) || 0
        },
        tools: {
          count: updatedCourse.tools_technologies?.length || 0,
          categories: [...new Set(updatedCourse.tools_technologies?.map(t => t.category) || [])]
        },
        bonusModules: {
          count: updatedCourse.bonus_modules?.length || 0,
          totalResources: updatedCourse.bonus_modules?.reduce((total, module) => total + (module.resources?.length || 0), 0) || 0
        },
        faqs: {
          count: updatedCourse.faqs?.length || 0
        },
        pricing: {
          currencies: updatedCourse.prices?.map(p => p.currency) || [],
          hasBatchPricing: updatedCourse.prices?.some(p => p.batch > 0) || false,
          hasIndividualPricing: updatedCourse.prices?.some(p => p.individual > 0) || false
        }
      }
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ 
      message: "Error updating course", 
      error: error.errors || error 
    });
  }
};

// Delete course by ID
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course", error });
  }
};

// Get all course titles
const getCourseTitles = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Query only necessary fields for better performance
    const courseTitles = await Course.find(filter)
      .select("_id course_title course_category")
      .sort({ course_title: 1 })
      .lean();
      
    if (!courseTitles.length) {
      return res.status(404).json({
        success: false,
        message: "No courses found",
        data: []
      });
    }
    
    res.status(200).json({
      success: true,
      count: courseTitles.length,
      data: courseTitles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching course titles", 
      error: error.message || "An unexpected error occurred"
    });
  }
};

//Toggle course status by ID
const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the course by ID
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Toggle the course's status between "Published" and "Upcoming"
    const newStatus = course.status === "Published" ? "Upcoming" : "Published";
    course.status = newStatus;

    // Save the updated course status
    await course.save();

    // Send success response with updated course information
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

// Update course recorded videos by ID
const updateRecordedVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const { recorded_videos } = req.body;

    if (!recorded_videos || !Array.isArray(recorded_videos)) {
      return res.status(400).json({ message: "Invalid recorded videos data" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { $push: { recorded_videos: { $each: recorded_videos } } },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Error updating recorded videos:", error);
    res.status(500).json({ message: "Error updating recorded videos", error });
  }
};

const getRecordedVideosForUser = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const enrolledCourses = await EnrolledCourse.find(
      { student_id: studentId },
      "course_id"
    );
    if (!enrolledCourses.length) {
      return res
        .status(404)
        .json({ message: "No enrolled courses found for the user" });
    }

    const courseIds = enrolledCourses.map((enrollment) => enrollment.course_id);

    const courses = await Course.find({
      _id: { $in: courseIds },
      recorded_videos: { $exists: true, $ne: [] },
    }).select(
      "_id course_title course_category recorded_videos course_tag course_image"
    );

    if (!courses.length) {
      return res
        .status(404)
        .json({ message: "No recorded courses found for the user" });
    }

    res.status(200).json({ courses });
  } catch (error) {
    console.error("Error fetching recorded courses:", error);
    res.status(500).json({
      message: "Error fetching courses. Please try again later.",
      error: error.message,
    });
  }
};

const getAllRelatedCourses = async (req, res) => {
  try {
    let { course_ids = req.body.course_ids } = req.body;

    const courses = await Course.find({
      _id: { $in: course_ids },
    });

    res.status(200).json({
      courses,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

const downloadBrochure = async (courseId, userDetails) => {
  try {
    // Validate course ID first
    if (!courseId) {
      toast.error("Please select a valid course");
      return;
    }

    // Make the API call
    const response = await axios.post(`/api/v1/broucher/download/${courseId}`, {
      full_name: userDetails.full_name,
      email: userDetails.email,
      phone_number: userDetails.phone_number
    });

    if (response.data.success) {
      // Show success message
      toast.success(response.data.message);
      
      // Open the brochure in a new tab
      window.open(response.data.data.brochureUrl, '_blank');
    } else {
      // Show error message
      toast.error(response.data.message);
    }
  } catch (error) {
    // Handle different types of errors
    const errorMessage = error.response?.data?.message || 
                        "Error downloading brochure. Please try again.";
    toast.error(errorMessage);
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

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view sections"
      });
    }

    const course = await Course.findById(courseId)
      .select('curriculum')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Enhance sections with progress information
    const enhancedCurriculum = course.curriculum.map(week => ({
      ...week,
      sections: week.sections.map(section => {
        const sectionLessons = section.lessons;
        const completedLessons = sectionLessons.filter(lesson =>
          enrollment.completed_lessons.includes(lesson._id)
        );

        return {
          ...section,
          progress: {
            total: sectionLessons.length,
            completed: completedLessons.length,
            percentage: sectionLessons.length > 0 
              ? Math.round((completedLessons.length / sectionLessons.length) * 100)
              : 0
          },
          lessons: sectionLessons.map(lesson => ({
            ...lesson,
            isCompleted: enrollment.completed_lessons.includes(lesson._id)
          }))
        };
      })
    }));

    // Update last accessed time
    enrollment.last_accessed = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      data: enhancedCurriculum,
      overallProgress: enrollment.progress
    });
  } catch (error) {
    console.error("Error fetching course sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course sections",
      error: error.message
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

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view lessons"
      });
    }

    const course = await Course.findById(courseId)
      .select('curriculum')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Extract and enhance all lessons from the curriculum
    const enhancedLessons = course.curriculum.flatMap(week => 
      week.sections.flatMap(section => 
        section.lessons.map(lesson => ({
          ...lesson,
          week: {
            id: week._id,
            title: week.weekTitle,
            order: week.order
          },
          section: {
            id: section._id,
            title: section.title,
            order: section.order
          },
          isCompleted: enrollment.completed_lessons.includes(lesson._id),
          hasNotes: enrollment.notes.some(note => 
            note.lessonId.toString() === lesson._id.toString()
          ),
          hasBookmarks: enrollment.bookmarks.some(bookmark => 
            bookmark.lessonId.toString() === lesson._id.toString()
          )
        }))
      )
    );

    // Sort lessons by week order, section order, and lesson order
    enhancedLessons.sort((a, b) => {
      if (a.week.order !== b.week.order) {
        return a.week.order - b.week.order;
      }
      if (a.section.order !== b.section.order) {
        return a.section.order - b.section.order;
      }
      return a.order - b.order;
    });

    // Update last accessed time
    enrollment.last_accessed = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      data: enhancedLessons,
      progress: {
        total: enhancedLessons.length,
        completed: enrollment.completed_lessons.length,
        percentage: enrollment.progress
      }
    });
  } catch (error) {
    console.error("Error fetching course lessons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course lessons",
      error: error.message
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
    const userId = req.user._id;

    // Find the course and check enrollment
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active"
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to access lessons"
      });
    }

    // Find the lesson in the curriculum
    let lesson = null;
    let lessonContext = {
      week: null,
      section: null,
      weekIndex: -1,
      sectionIndex: -1,
      lessonIndex: -1
    };

    // Search through curriculum to find the lesson
    for (let weekIndex = 0; weekIndex < course.curriculum.length; weekIndex++) {
      const week = course.curriculum[weekIndex];
      
      for (let sectionIndex = 0; sectionIndex < week.sections.length; sectionIndex++) {
        const section = week.sections[sectionIndex];
        
        const lessonIndex = section.lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex !== -1) {
          lesson = section.lessons[lessonIndex];
          lessonContext = {
            week,
            section,
            weekIndex,
            sectionIndex,
            lessonIndex
          };
          break;
        }
      }
      
      if (lesson) break;
    }

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course. Please check the lesson ID and try again."
      });
    }

    // Get lesson progress
    const progress = await Progress.findOne({
      course: courseId,
      student: userId,
      lesson: lessonId
    });

    // Get lesson notes
    const notes = await Note.find({
      course: courseId,
      student: userId,
      lesson: lessonId
    }).sort({ createdAt: -1 });

    // Get lesson bookmarks
    const bookmarks = await Bookmark.find({
      course: courseId,
      student: userId,
      lesson: lessonId
    }).sort({ createdAt: -1 });

    // Find previous and next lessons
    const { week, section, weekIndex, sectionIndex, lessonIndex } = lessonContext;
    let previousLesson = null;
    let nextLesson = null;

    // Check for previous lesson in the same section
    if (lessonIndex > 0) {
      previousLesson = section.lessons[lessonIndex - 1];
    } else {
      // Check previous section
      if (sectionIndex > 0) {
        const prevSection = week.sections[sectionIndex - 1];
        if (prevSection.lessons.length > 0) {
          previousLesson = prevSection.lessons[prevSection.lessons.length - 1];
        }
      } else if (weekIndex > 0) {
        // Check previous week's last section
        const prevWeek = course.curriculum[weekIndex - 1];
        if (prevWeek.sections.length > 0) {
          const prevSection = prevWeek.sections[prevWeek.sections.length - 1];
          if (prevSection.lessons.length > 0) {
            previousLesson = prevSection.lessons[prevSection.lessons.length - 1];
          }
        }
      }
    }

    // Check for next lesson in the same section
    if (lessonIndex < section.lessons.length - 1) {
      nextLesson = section.lessons[lessonIndex + 1];
    } else {
      // Check next section
      if (sectionIndex < week.sections.length - 1) {
        const nextSection = week.sections[sectionIndex + 1];
        if (nextSection.lessons.length > 0) {
          nextLesson = nextSection.lessons[0];
        }
      } else if (weekIndex < course.curriculum.length - 1) {
        // Check next week's first section
        const nextWeek = course.curriculum[weekIndex + 1];
        if (nextWeek.sections.length > 0) {
          const nextSection = nextWeek.sections[0];
          if (nextSection.lessons.length > 0) {
            nextLesson = nextSection.lessons[0];
          }
        }
      }
    }

    // Return lesson details with context
    res.status(200).json({
      success: true,
      data: {
        lesson: {
          ...lesson.toObject(),
          progress: progress ? progress.status : "not_started",
          notes: notes.map(note => ({
            id: note._id,
            content: note.content,
            createdAt: note.createdAt
          })),
          bookmarks: bookmarks.map(bookmark => ({
            id: bookmark._id,
            createdAt: bookmark.createdAt
          }))
        },
        context: {
          week: {
            id: week.id,
            title: week.weekTitle,
            description: week.weekDescription
          },
          section: {
            id: section.id,
            title: section.title,
            description: section.description
          }
        },
        navigation: {
          previous: previousLesson ? {
            id: previousLesson.id,
            title: previousLesson.title
          } : null,
          next: nextLesson ? {
            id: nextLesson.id,
            title: nextLesson.title
          } : null
        }
      }
    });
  } catch (error) {
    console.error("Error fetching lesson details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lesson details",
      error: error.message
    });
  }
};

// =========================================
// COURSE PROGRESS & COMPLETION
// =========================================

/**
 * @desc    Get course progress for a student
 * @route   GET /api/courses/:courseId/progress
 * @access  Private (Enrolled Students)
 */
const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view progress"
      });
    }

    const course = await Course.findById(courseId)
      .select('lessons')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const totalLessons = course.lessons.length;
    const completedLessons = enrollment.completed_lessons?.length || 0;
    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLessons,
        completedLessons,
        progress,
        lastAccessed: enrollment.last_accessed,
        completedLessonsList: enrollment.completed_lessons || []
      }
    });
  } catch (error) {
    console.error("Error fetching course progress:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course progress",
      error: error.message
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

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to mark lessons complete"
      });
    }

    // Check if lesson is already completed
    if (enrollment.isLessonCompleted(lessonId)) {
      return res.status(200).json({
        success: true,
        message: "Lesson already marked as complete"
      });
    }

    // Add lesson to completed lessons
    enrollment.completed_lessons.push(lessonId);
    enrollment.last_accessed = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: {
        progress: enrollment.progress,
        completedLessons: enrollment.completed_lessons.length
      }
    });
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    res.status(500).json({
      success: false,
      message: "Error marking lesson complete",
      error: error.message
    });
  }
};

// =========================================
// COURSE ASSIGNMENTS
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

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view assignments"
      });
    }

    const course = await Course.findById(courseId)
      .select('assignments')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    res.status(200).json({
      success: true,
      data: course.assignments || []
    });
  } catch (error) {
    console.error("Error fetching course assignments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course assignments",
      error: error.message
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
      return res.status(400).json({
        success: false,
        message: "Submission content is required"
      });
    }

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to submit assignments"
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const assignment = course.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Add or update submission
    const existingSubmission = enrollment.getAssignmentSubmission(assignmentId);
    if (existingSubmission) {
      existingSubmission.submission = submission;
      existingSubmission.submittedAt = new Date();
    } else {
      enrollment.assignment_submissions.push({
        assignmentId,
        submission,
        submittedAt: new Date()
      });
    }

    // Mark assignment as completed if not already
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
        completedAssignments: enrollment.completed_assignments.length
      }
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting assignment",
      error: error.message
    });
  }
};

// =========================================
// COURSE QUIZZES
// =========================================

/**
 * @desc    Get all quizzes for a course
 * @route   GET /api/courses/:courseId/quizzes
 * @access  Private (Enrolled Students)
 */
const getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.user;

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view quizzes"
      });
    }

    const course = await Course.findById(courseId)
      .select('quizzes')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    res.status(200).json({
      success: true,
      data: course.quizzes || []
    });
  } catch (error) {
    console.error("Error fetching course quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course quizzes",
      error: error.message
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
      return res.status(400).json({
        success: false,
        message: "Valid answers array is required"
      });
    }

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to submit quizzes"
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const quiz = course.quizzes.id(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    // Calculate score
    let score = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score++;
      }
    });

    const percentage = (score / quiz.questions.length) * 100;

    // Add or update submission
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
        submittedAt: new Date()
      });
    }

    // Mark quiz as completed if not already
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
        completedQuizzes: enrollment.completed_quizzes.length
      }
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting quiz",
      error: error.message
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

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view quiz results"
      });
    }

    const course = await Course.findById(courseId)
      .select('quizzes')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const quiz = course.quizzes.find(q => q._id.toString() === quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    const submission = quiz.submissions.find(
      s => s.studentId.toString() === studentId
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this quiz"
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz results",
      error: error.message
    });
  }
};

// =========================================
// COURSE RESOURCES
// =========================================

/**
 * @desc    Get all resources for a lesson
 * @route   GET /api/courses/:courseId/lessons/:lessonId/resources
 * @access  Private (Enrolled Students)
 */
const getLessonResources = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { studentId } = req.user;

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view resources"
      });
    }

    const course = await Course.findById(courseId)
      .select('lessons')
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const lesson = course.lessons.find(l => l._id.toString() === lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found"
      });
    }

    res.status(200).json({
      success: true,
      data: lesson.resources || []
    });
  } catch (error) {
    console.error("Error fetching lesson resources:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lesson resources",
      error: error.message
    });
  }
};

/**
 * @desc    Download a resource
 * @route   GET /api/courses/:courseId/lessons/:lessonId/resources/:resourceId/download
 * @access  Private (Enrolled Students)
 */
const downloadResource = async (req, res) => {
  try {
    const { courseId, lessonId, resourceId } = req.params;
    const { studentId } = req.user;

    // Verify student is enrolled in the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to download resources"
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found"
      });
    }

    const resource = lesson.resources.id(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', resource.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resource.filename}"`);

    // Stream the file
    const fileStream = await getFileStream(resource.fileUrl);
    fileStream.pipe(res);

    // Handle errors in the stream
    fileStream.on('error', (error) => {
      console.error("Error streaming resource:", error);
      res.status(500).json({
        success: false,
        message: "Error downloading resource",
        error: error.message
      });
    });
  } catch (error) {
    console.error("Error downloading resource:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading resource",
      error: error.message
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

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active"
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to add notes"
      });
    }

    // Create new note
    const note = await Note.create({
      course: courseId,
      student: userId,
      lesson: lessonId,
      content,
      timestamp,
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({
      success: false,
      message: "Error adding note",
      error: error.message
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

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active"
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to add bookmarks"
      });
    }

    // Create new bookmark
    const bookmark = await Bookmark.create({
      course: courseId,
      student: userId,
      lesson: lessonId,
      timestamp,
      title,
      description: description || "",
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      data: bookmark
    });
  } catch (error) {
    console.error("Error adding bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error adding bookmark",
      error: error.message
    });
  }
};

/**
 * Handle single file upload
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Return file information
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Error in handleUpload:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
};

/**
 * Handle multiple file upload
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const handleMultipleUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Return information about all uploaded files
    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        count: files.length,
        files
      }
    });
  } catch (error) {
    console.error('Error in handleMultipleUpload:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
};

// Get lesson notes
const getLessonNotes = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active"
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view notes"
      });
    }

    // Get notes
    const notes = await Note.getLessonNotes(courseId, userId, lessonId);

    res.status(200).json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message
    });
  }
};

// Get lesson bookmarks
const getLessonBookmarks = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      course: courseId,
      student: userId,
      status: "active"
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view bookmarks"
      });
    }

    // Get bookmarks
    const bookmarks = await Bookmark.getLessonBookmarks(courseId, userId, lessonId);

    res.status(200).json({
      success: true,
      data: bookmarks
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookmarks",
      error: error.message
    });
  }
};

// Update note
const updateNote = async (req, res) => {
  try {
    const { courseId, lessonId, noteId } = req.params;
    const { content, tags } = req.body;
    const userId = req.user._id;

    // Find and update note
    const note = await Note.findOne({
      _id: noteId,
      course: courseId,
      student: userId,
      lesson: lessonId
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    await note.updateContent(content);
    if (tags) {
      note.tags = tags;
      await note.save();
    }

    res.status(200).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({
      success: false,
      message: "Error updating note",
      error: error.message
    });
  }
};

// Update bookmark
const updateBookmark = async (req, res) => {
  try {
    const { courseId, lessonId, bookmarkId } = req.params;
    const { title, description, tags } = req.body;
    const userId = req.user._id;

    // Find and update bookmark
    const bookmark = await Bookmark.findOne({
      _id: bookmarkId,
      course: courseId,
      student: userId,
      lesson: lessonId
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found"
      });
    }

    await bookmark.updateDetails(title, description, tags);

    res.status(200).json({
      success: true,
      data: bookmark
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bookmark",
      error: error.message
    });
  }
};

// Delete note
const deleteNote = async (req, res) => {
  try {
    const { courseId, lessonId, noteId } = req.params;
    const userId = req.user._id;

    const note = await Note.findOneAndDelete({
      _id: noteId,
      course: courseId,
      student: userId,
      lesson: lessonId
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting note",
      error: error.message
    });
  }
};

// Delete bookmark
const deleteBookmark = async (req, res) => {
  try {
    const { courseId, lessonId, bookmarkId } = req.params;
    const userId = req.user._id;

    const bookmark = await Bookmark.findOneAndDelete({
      _id: bookmarkId,
      course: courseId,
      student: userId,
      lesson: lessonId
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookmark deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting bookmark",
      error: error.message
    });
  }
};

// Export the new functions
module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  getCoorporateCourseById,
  updateCourse,
  deleteCourse,
  getCourseTitles,
  getAllCoursesWithLimits,
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
  getLessonBookmarks,
  updateNote,
  updateBookmark,
  deleteNote,
  deleteBookmark
};
