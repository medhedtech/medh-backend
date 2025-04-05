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
const axios = require("axios");

/* ------------------------------ */
/* Helper Functions               */
/* ------------------------------ */

// Recursively decode URL-encoded strings
const fullyDecodeURIComponent = (str) => {
  try {
    let decoded = str;
    while (decoded.includes("%")) {
      const prev = decoded;
      decoded = decodeURIComponent(decoded);
      if (prev === decoded) break;
    }
    return decoded;
  } catch (e) {
    console.warn("Decoding error:", e);
    return str;
  }
};

// Escape regex special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Helper to assign IDs to curriculum structure recursively
const assignCurriculumIds = (curriculum) => {
  curriculum.forEach((week, weekIndex) => {
    week.id = `week_${weekIndex + 1}`;
    
    // Assign IDs to direct lessons under weeks
    if (week.lessons && week.lessons.length) {
      week.lessons.forEach((lesson, lessonIndex) => {
        lesson.id = `lesson_w${weekIndex + 1}_${lessonIndex + 1}`;
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
    
    if (req.file) {
      req.body.course_image = req.file.location;
    }
    
    // Extract course data from request body
    const courseData = req.body;
    
    // If curriculum data is provided as JSON string, parse it
    if (courseData.curriculum && typeof courseData.curriculum === 'string') {
      try {
        courseData.curriculum = JSON.parse(courseData.curriculum);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid curriculum data format. Expected valid JSON.",
          error: parseError.message
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
 * @desc    Get all courses without pagination
 * @route   GET /api/courses/get
 * @access  Public
 */
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}, {
      course_title: 1,
      course_category: 1,
      course_tag: 1,
      course_image: 1,
      course_fee: 1,
      isFree: 1,
      status: 1,
      category_type: 1,
      createdAt: 1,
      prices: 1
    }).lean();
    res.status(200).json({ success: true, count: courses.length, data: courses });
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
 * @desc    Get all courses with filtering, pagination and search (advanced)
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
      min_hours_per_week,
      max_hours_per_week,
      user_id,
      course_duration,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page and limit must be positive numbers."
      });
    }

    const filter = {};
    const textSearchFields = {};

    if (search) {
      const decodedSearch = fullyDecodeURIComponent(search);
      if (decodedSearch.length >= 3) {
        filter.$text = { $search: decodedSearch };
        textSearchFields.score = { $meta: "textScore" };
      } else {
        filter.$or = [
          { course_title: { $regex: new RegExp(escapeRegExp(decodedSearch), "i") } },
          { course_category: { $regex: new RegExp(escapeRegExp(decodedSearch), "i") } },
          { course_tag: { $regex: new RegExp(escapeRegExp(decodedSearch), "i") } },
          { "course_description.program_overview": { $regex: new RegExp(escapeRegExp(decodedSearch), "i") } },
          { "course_description.benefits": { $regex: new RegExp(escapeRegExp(decodedSearch), "i") } },
          { course_grade: { $regex: new RegExp(escapeRegExp(decodedSearch), "i") } }
        ];
      }
    }

    if (course_duration) filter.course_duration = fullyDecodeURIComponent(course_duration);
    if (min_hours_per_week) filter.min_hours_per_week = fullyDecodeURIComponent(min_hours_per_week);
    if (max_hours_per_week) filter.max_hours_per_week = fullyDecodeURIComponent(max_hours_per_week);
    if (no_of_Sessions) filter.no_of_Sessions = fullyDecodeURIComponent(no_of_Sessions);
    if (description) filter.course_description = fullyDecodeURIComponent(description);
    if (course_grade) filter.course_grade = fullyDecodeURIComponent(course_grade);

    const handleArrayOrStringFilter = (field, value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        const decodedValues = value.map(item => fullyDecodeURIComponent(item));
        filter[field] = { 
          $in: decodedValues.map(item => new RegExp("^" + escapeRegExp(item) + "$", "i"))
        };
      } else if (typeof value === "string") {
        const decodedValue = fullyDecodeURIComponent(value);
        if (decodedValue.includes(",") || decodedValue.includes("|") || decodedValue.includes(";")) {
          const values = decodedValue.split(/[,|;]/).map(v => v.trim()).filter(Boolean);
          filter[field] = { 
            $in: values.map(v => new RegExp("^" + escapeRegExp(v) + "$", "i"))
          };
        } else {
          filter[field] = { $regex: new RegExp(escapeRegExp(decodedValue), "i") };
        }
      }
    };

    handleArrayOrStringFilter("course_category", course_category);
    handleArrayOrStringFilter("category_type", category_type);
    handleArrayOrStringFilter("course_tag", course_tag);
    handleArrayOrStringFilter("class_type", class_type);

    if (status) {
      const decodedStatus = fullyDecodeURIComponent(status);
      filter.status = decodedStatus.includes(",")
        ? { $in: decodedStatus.split(",").map(s => new RegExp("^" + escapeRegExp(s.trim()) + "$", "i")) }
        : new RegExp("^" + escapeRegExp(decodedStatus) + "$", "i");
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
      const excludeIdsArray = Array.isArray(exclude_ids) ? exclude_ids : exclude_ids.split(",");
      const validIds = excludeIdsArray
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      if (validIds.length > 0) {
        filter._id = { $nin: validIds };
      }
    }

    if (user_id) {
      try {
        const enrolledCourses = await EnrolledCourse.find({ student_id: user_id }, "course_id").lean();
        const enrolledCourseIds = enrolledCourses.map(ec => ec.course_id);
        if (enrolledCourseIds.length) {
          filter._id = { $nin: enrolledCourseIds };
        }
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      }
    }

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
      brochures: 1,
      final_evaluation: 1
    };

    if (filter.$text) {
      projection.score = { $meta: "textScore" };
    }

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
              { $sort: { _id: 1 } }
            ],
            features: [
              {
                $group: {
                  _id: null,
                  certification: { $push: { k: "$is_Certification", v: { $sum: 1 } } },
                  assignments: { $push: { k: "$is_Assignments", v: { $sum: 1 } } },
                  projects: { $push: { k: "$is_Projects", v: { $sum: 1 } } },
                  quizzes: { $push: { k: "$is_Quizes", v: { $sum: 1 } } }
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
    if (courses.length > 0) {
      const bulkUpdateOps = courses.map(course => ({
        updateOne: {
          filter: { _id: course._id },
          update: { $inc: { "meta.views": 1 } }
        }
      }));
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
      facets: facets[0],
      filters: {
        applied: {
          search,
          course_tag,
          status,
          user_id: !!user_id,
          enrolledCoursesExcluded: user_id ? courses.length : 0
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
 * @desc    Get course by ID (including final evaluation)
 * @route   GET /api/courses/:id
 * @access  Public
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format"
      });
    }
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          course_title: 1,
          course_category: 1,
          course_tag: 1,
          course_image: 1,
          course_fee: 1,
          course_duration: 1,
          no_of_Sessions: 1,
          prices: 1,
          course_description: 1,
          final_evaluation: 1,
          curriculum: 1,
          faqs: 1,
          bonus_modules: 1,
          tools_technologies: 1,
          meta: 1
        }
      }
    ];
    const courseAgg = await Course.aggregate(pipeline);
    if (!courseAgg.length) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    res.status(200).json({ success: true, data: courseAgg[0] });
  } catch (error) {
    console.error("Error in getCourseById:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course",
      error: error.message || "An unexpected error occurred"
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
    
    if (req.file) {
      courseData.course_image = req.file.location;
    }
    
    // If curriculum data is provided as JSON string, parse it
    if (courseData.curriculum && typeof courseData.curriculum === 'string') {
      try {
        courseData.curriculum = JSON.parse(courseData.curriculum);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid curriculum data format. Expected valid JSON.",
          error: parseError.message
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
      { new: true, runValidators: true }
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
    const deletedCourse = await Course.findByIdAndDelete(id);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course", error });
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
        data: []
      });
    }
    res.status(200).json({ success: true, count: courseTitles.length, data: courseTitles });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching course titles", 
      error: error.message || "An unexpected error occurred"
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
      course: { id: course._id, status: course.status, course_title: course.course_title }
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view sections" });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    const enhancedCurriculum = course.curriculum.map(week => {
      // Create a week object with basic info
      const weekObj = {
        ...week,
        sections: []
      };
      
      // Handle direct lessons if they exist
      if (week.lessons && week.lessons.length) {
        const directLessons = week.lessons;
        const completedLessons = directLessons.filter(lesson => 
          enrollment.completed_lessons.includes(lesson.id)
        );
        
        weekObj.directLessonsProgress = {
          total: directLessons.length,
          completed: completedLessons.length,
          percentage: directLessons.length > 0 ? 
            Math.round((completedLessons.length / directLessons.length) * 100) : 0
        };
        
        weekObj.lessons = directLessons.map(lesson => ({
          ...lesson,
          isCompleted: enrollment.completed_lessons.includes(lesson.id)
        }));
      }
      
      // Handle live classes if they exist
      if (week.liveClasses && week.liveClasses.length) {
        weekObj.liveClasses = week.liveClasses;
      }
      
      // Process sections if they exist
      if (week.sections && week.sections.length) {
        weekObj.sections = week.sections.map(section => {
          const sectionLessons = section.lessons || [];
          const completedLessons = sectionLessons.filter(lesson => 
            enrollment.completed_lessons.includes(lesson.id)
          );
          
          return {
            ...section,
            progress: {
              total: sectionLessons.length,
              completed: completedLessons.length,
              percentage: sectionLessons.length > 0 ? 
                Math.round((completedLessons.length / sectionLessons.length) * 100) : 0
            },
            lessons: sectionLessons.map(lesson => ({
              ...lesson,
              isCompleted: enrollment.completed_lessons.includes(lesson.id)
            }))
          };
        });
      }
      
      return weekObj;
    });
    
    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({ success: true, data: enhancedCurriculum, overallProgress: enrollment.progress });
  } catch (error) {
    console.error("Error fetching course sections:", error);
    res.status(500).json({ success: false, message: "Error fetching course sections", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view lessons" });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    // Collect all lessons from both direct under weeks and from sections
    const enhancedLessons = [];
    
    course.curriculum.forEach(week => {
      // Add direct lessons under weeks
      if (week.lessons && week.lessons.length) {
        week.lessons.forEach(lesson => {
          enhancedLessons.push({
            ...lesson,
            week: { id: week.id, title: week.weekTitle },
            section: null, // No section for direct lessons
            isCompleted: enrollment.completed_lessons.includes(lesson.id),
            hasNotes: enrollment.notes.some(note => note.lessonId.toString() === lesson.id.toString()),
            hasBookmarks: enrollment.bookmarks.some(bookmark => bookmark.lessonId.toString() === lesson.id.toString())
          });
        });
      }
      
      // Add lessons from sections
      if (week.sections && week.sections.length) {
        week.sections.forEach(section => {
          if (section.lessons && section.lessons.length) {
            section.lessons.forEach(lesson => {
              enhancedLessons.push({
                ...lesson,
                week: { id: week.id, title: week.weekTitle },
                section: { id: section.id, title: section.title },
                isCompleted: enrollment.completed_lessons.includes(lesson.id),
                hasNotes: enrollment.notes.some(note => note.lessonId.toString() === lesson.id.toString()),
                hasBookmarks: enrollment.bookmarks.some(bookmark => bookmark.lessonId.toString() === lesson.id.toString())
              });
            });
          }
        });
      }
    });
    
    // Also collect live classes if requested
    const liveClasses = [];
    if (req.query.includeLiveClasses === 'true') {
      course.curriculum.forEach(week => {
        if (week.liveClasses && week.liveClasses.length) {
          week.liveClasses.forEach(liveClass => {
            liveClasses.push({
              ...liveClass,
              week: { id: week.id, title: week.weekTitle }
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
        percentage: enrollment.progress 
      }
    };
    
    if (req.query.includeLiveClasses === 'true') {
      response.liveClasses = liveClasses;
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching course lessons:", error);
    res.status(500).json({ success: false, message: "Error fetching course lessons", error: error.message });
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
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const enrollment = await Enrollment.findOne({ course: courseId, student: userId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to access lessons" });
    }
    
    let lesson = null;
    let lessonContext = {};
    
    // First search in direct lessons under weeks
    for (let week of course.curriculum) {
      // Check direct lessons under week
      if (week.lessons && week.lessons.length) {
        const found = week.lessons.find(l => l.id === lessonId);
        if (found) {
          lesson = found;
          lessonContext = {
            week: { id: week.id, title: week.weekTitle, description: week.weekDescription },
            section: null // No section for direct lessons
          };
          break;
        }
      }
      
      // Check in sections
      if (week.sections && week.sections.length) {
        for (let section of week.sections) {
          const found = section.lessons.find(l => l.id === lessonId);
          if (found) {
            lesson = found;
            lessonContext = {
              week: { id: week.id, title: week.weekTitle, description: week.weekDescription },
              section: { id: section.id, title: section.title, description: section.description }
            };
            break;
          }
        }
        if (lesson) break;
      }
    }
    
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found in this course" });
    }
    
    const progress = await Progress.findOne({ course: courseId, student: userId, lesson: lessonId });
    const notes = await Note.find({ course: courseId, student: userId, lesson: lessonId }).sort({ createdAt: -1 });
    const bookmarks = await Bookmark.find({ course: courseId, student: userId, lesson: lessonId }).sort({ createdAt: -1 });
    
    // Find previous and next lessons for navigation
    let allLessons = [];
    
    course.curriculum.forEach(week => {
      // Add direct lessons
      if (week.lessons && week.lessons.length) {
        allLessons = allLessons.concat(week.lessons.map(l => ({
          ...l.toObject(),
          weekId: week.id,
          sectionId: null
        })));
      }
      
      // Add section lessons
      if (week.sections && week.sections.length) {
        week.sections.forEach(section => {
          if (section.lessons && section.lessons.length) {
            allLessons = allLessons.concat(section.lessons.map(l => ({
              ...l.toObject(),
              weekId: week.id,
              sectionId: section.id
            })));
          }
        });
      }
    });
    
    // Sort lessons by order
    allLessons.sort((a, b) => a.order - b.order);
    
    // Find current lesson index
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
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
          notes: notes.map(note => ({ id: note._id, content: note.content, createdAt: note.createdAt })),
          bookmarks: bookmarks.map(b => ({ id: b._id, createdAt: b.createdAt }))
        },
        context: lessonContext,
        navigation: {
          previous: previousLesson ? { 
            id: previousLesson.id, 
            title: previousLesson.title,
            weekId: previousLesson.weekId,
            sectionId: previousLesson.sectionId
          } : null,
          next: nextLesson ? { 
            id: nextLesson.id, 
            title: nextLesson.title,
            weekId: nextLesson.weekId,
            sectionId: nextLesson.sectionId
          } : null
        }
      }
    });
  } catch (error) {
    console.error("Error fetching lesson details:", error);
    res.status(500).json({ success: false, message: "Error fetching lesson details", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view resources" });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    let lesson = null;
    
    // Search in direct lessons under weeks
    for (let week of course.curriculum) {
      // Check direct lessons under week
      if (week.lessons && week.lessons.length) {
        const found = week.lessons.find(l => l.id === lessonId);
        if (found) {
          lesson = found;
          break;
        }
      }
      
      // Check in sections
      if (!lesson && week.sections && week.sections.length) {
        for (let section of week.sections) {
          const found = section.lessons.find(l => l.id === lessonId);
          if (found) {
            lesson = found;
            break;
          }
        }
        if (lesson) break;
      }
    }
    
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }
    
    res.status(200).json({ success: true, data: lesson.resources || [] });
  } catch (error) {
    console.error("Error fetching lesson resources:", error);
    res.status(500).json({ success: false, message: "Error fetching lesson resources", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view progress" });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    // Count both direct lessons and section lessons
    let totalLessons = 0;
    
    course.curriculum.forEach(week => {
      // Count direct lessons under weeks
      if (week.lessons && week.lessons.length) {
        totalLessons += week.lessons.length;
      }
      
      // Count lessons in sections
      if (week.sections && week.sections.length) {
        week.sections.forEach(section => {
          if (section.lessons && section.lessons.length) {
            totalLessons += section.lessons.length;
          }
        });
      }
    });
    
    // Count live classes if any
    let totalLiveClasses = 0;
    let completedLiveClasses = 0;
    
    if (enrollment.attended_live_classes && enrollment.attended_live_classes.length) {
      course.curriculum.forEach(week => {
        if (week.liveClasses && week.liveClasses.length) {
          totalLiveClasses += week.liveClasses.length;
          week.liveClasses.forEach(liveClass => {
            if (enrollment.attended_live_classes.includes(liveClass.id)) {
              completedLiveClasses++;
            }
          });
        }
      });
    }
    
    const completedLessons = enrollment.completed_lessons?.length || 0;
    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    
    const liveClassProgress = totalLiveClasses > 0 ? 
      (completedLiveClasses / totalLiveClasses) * 100 : 0;
    
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
        attendedLiveClassesList: enrollment.attended_live_classes || []
      }
    });
  } catch (error) {
    console.error("Error fetching course progress:", error);
    res.status(500).json({ success: false, message: "Error fetching course progress", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view live classes" });
    }
    const course = await Course.findById(courseId).select("curriculum").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    // Extract all live classes
    const liveClasses = [];
    course.curriculum.forEach(week => {
      if (week.liveClasses && week.liveClasses.length) {
        week.liveClasses.forEach(liveClass => {
          liveClasses.push({
            ...liveClass,
            weekId: week.id,
            weekTitle: week.weekTitle,
            isAttended: enrollment.attended_live_classes?.includes(liveClass.id) || false
          });
        });
      }
    });
    
    // Sort by scheduled date
    liveClasses.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    
    // Group by upcoming and past
    const now = new Date();
    const upcoming = liveClasses.filter(c => new Date(c.scheduledDate) > now);
    const past = liveClasses.filter(c => new Date(c.scheduledDate) <= now);
    
    res.status(200).json({
      success: true,
      data: {
        all: liveClasses,
        upcoming,
        past,
        total: liveClasses.length,
        attended: enrollment.attended_live_classes?.length || 0
      }
    });
  } catch (error) {
    console.error("Error fetching course live classes:", error);
    res.status(500).json({ success: false, message: "Error fetching course live classes", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to mark live classes" });
    }
    
    // Check if live class exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    let liveClassExists = false;
    for (const week of course.curriculum) {
      if (week.liveClasses && week.liveClasses.length) {
        if (week.liveClasses.some(lc => lc.id === liveClassId)) {
          liveClassExists = true;
          break;
        }
      }
    }
    
    if (!liveClassExists) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }
    
    // Initialize attended_live_classes array if it doesn't exist
    if (!enrollment.attended_live_classes) {
      enrollment.attended_live_classes = [];
    }
    
    // Check if already attended
    if (enrollment.attended_live_classes.includes(liveClassId)) {
      return res.status(200).json({ success: true, message: "Live class already marked as attended" });
    }
    
    // Mark as attended
    enrollment.attended_live_classes.push(liveClassId);
    enrollment.last_accessed = new Date();
    await enrollment.save();
    
    res.status(200).json({
      success: true,
      message: "Live class marked as attended",
      data: { 
        attendedLiveClasses: enrollment.attended_live_classes.length
      }
    });
  } catch (error) {
    console.error("Error marking live class attended:", error);
    res.status(500).json({ success: false, message: "Error marking live class attended", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to mark lessons complete" });
    }
    
    // Check if the lesson exists in the course (either direct under week or in a section)
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    // Find the lesson to validate it exists
    let lessonExists = false;
    
    // Check in all possible locations (direct lessons and section lessons)
    for (const week of course.curriculum) {
      // Check direct lessons
      if (week.lessons && week.lessons.length) {
        if (week.lessons.some(l => l.id === lessonId)) {
          lessonExists = true;
          break;
        }
      }
      
      // Check lessons in sections
      if (!lessonExists && week.sections && week.sections.length) {
        for (const section of week.sections) {
          if (section.lessons && section.lessons.some(l => l.id === lessonId)) {
            lessonExists = true;
            break;
          }
        }
        if (lessonExists) break;
      }
    }
    
    if (!lessonExists) {
      return res.status(404).json({ success: false, message: "Lesson not found in this course" });
    }
    
    // Check if lesson is already marked as complete
    if (enrollment.completed_lessons && enrollment.completed_lessons.includes(lessonId)) {
      return res.status(200).json({ success: true, message: "Lesson already marked as complete" });
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
    course.curriculum.forEach(week => {
      // Count direct lessons
      if (week.lessons && week.lessons.length) {
        totalLessons += week.lessons.length;
      }
      
      // Count section lessons
      if (week.sections && week.sections.length) {
        week.sections.forEach(section => {
          if (section.lessons && section.lessons.length) {
            totalLessons += section.lessons.length;
          }
        });
      }
    });
    
    const newProgress = totalLessons > 0 ? 
      (enrollment.completed_lessons.length / totalLessons) * 100 : 0;
    
    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: { 
        progress: newProgress,
        completedLessons: enrollment.completed_lessons.length,
        totalLessons
      }
    });
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    res.status(500).json({ success: false, message: "Error marking lesson complete", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view assignments" });
    }
    const course = await Course.findById(courseId).select("assignments").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course.assignments || [] });
  } catch (error) {
    console.error("Error fetching course assignments:", error);
    res.status(500).json({ success: false, message: "Error fetching course assignments", error: error.message });
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
      return res.status(400).json({ success: false, message: "Submission content is required" });
    }
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to submit assignments" });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const assignment = course.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    const existingSubmission = enrollment.getAssignmentSubmission(assignmentId);
    if (existingSubmission) {
      existingSubmission.submission = submission;
      existingSubmission.submittedAt = new Date();
    } else {
      enrollment.assignment_submissions.push({ assignmentId, submission, submittedAt: new Date() });
    }
    if (!enrollment.isAssignmentCompleted(assignmentId)) {
      enrollment.completed_assignments.push(assignmentId);
    }
    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({
      success: true,
      message: "Assignment submitted successfully",
      data: { progress: enrollment.progress, completedAssignments: enrollment.completed_assignments.length }
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    res.status(500).json({ success: false, message: "Error submitting assignment", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view quizzes" });
    }
    const course = await Course.findById(courseId).select("quizzes").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course.quizzes || [] });
  } catch (error) {
    console.error("Error fetching course quizzes:", error);
    res.status(500).json({ success: false, message: "Error fetching course quizzes", error: error.message });
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
      return res.status(400).json({ success: false, message: "Valid answers array is required" });
    }
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to submit quizzes" });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const quiz = course.quizzes.id(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
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
        submittedAt: new Date()
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
        completedQuizzes: enrollment.completed_quizzes.length
      }
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ success: false, message: "Error submitting quiz", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view quiz results" });
    }
    const course = await Course.findById(courseId).select("quizzes").lean();
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const quiz = course.quizzes.find(q => q._id.toString() === quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    const submission = enrollment.quiz_submissions.find(s => s.quizId.toString() === quizId);
    if (!submission) {
      return res.status(404).json({ success: false, message: "No submission found for this quiz" });
    }
    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    res.status(500).json({ success: false, message: "Error fetching quiz results", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to download resources" });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }
    const resource = lesson.resources.id(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }
    res.setHeader("Content-Type", resource.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${resource.filename || "download"}"`);
    const fileStream = await getFileStream(resource.url);
    fileStream.pipe(res);
    fileStream.on("error", (error) => {
      console.error("Error streaming resource:", error);
      res.status(500).json({ success: false, message: "Error downloading resource", error: error.message });
    });
  } catch (error) {
    console.error("Error downloading resource:", error);
    res.status(500).json({ success: false, message: "Error downloading resource", error: error.message });
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
    const enrollment = await Enrollment.findOne({ course: courseId, student: userId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to add notes" });
    }
    const note = await Note.create({ course: courseId, student: userId, lesson: lessonId, content, timestamp, tags: tags || [] });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ success: false, message: "Error adding note", error: error.message });
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
    const enrollment = await Enrollment.findOne({ course: courseId, student: userId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to add bookmarks" });
    }
    const bookmark = await Bookmark.create({ course: courseId, student: userId, lesson: lessonId, timestamp, title, description: description || "", tags: tags || [] });
    res.status(201).json({ success: true, data: bookmark });
  } catch (error) {
    console.error("Error adding bookmark:", error);
    res.status(500).json({ success: false, message: "Error adding bookmark", error: error.message });
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
    const enrollment = await Enrollment.findOne({ course: courseId, student: userId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view notes" });
    }
    const notes = await Note.getLessonNotes(courseId, userId, lessonId);
    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ success: false, message: "Error fetching notes", error: error.message });
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
    const enrollment = await Enrollment.findOne({ course: courseId, student: userId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to view bookmarks" });
    }
    const bookmarks = await Bookmark.getLessonBookmarks(courseId, userId, lessonId);
    res.status(200).json({ success: true, data: bookmarks });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({ success: false, message: "Error fetching bookmarks", error: error.message });
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
    const note = await Note.findOne({ _id: noteId, course: courseId, student: userId, lesson: lessonId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    await note.updateContent(content);
    if (tags) {
      note.tags = tags;
      await note.save();
    }
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ success: false, message: "Error updating note", error: error.message });
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
    const bookmark = await Bookmark.findOne({ _id: bookmarkId, course: courseId, student: userId, lesson: lessonId });
    if (!bookmark) {
      return res.status(404).json({ success: false, message: "Bookmark not found" });
    }
    await bookmark.updateDetails(title, description, tags);
    res.status(200).json({ success: true, data: bookmark });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    res.status(500).json({ success: false, message: "Error updating bookmark", error: error.message });
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
    const note = await Note.findOneAndDelete({ _id: noteId, course: courseId, student: userId, lesson: lessonId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    res.status(200).json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ success: false, message: "Error deleting note", error: error.message });
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
    const bookmark = await Bookmark.findOneAndDelete({ _id: bookmarkId, course: courseId, student: userId, lesson: lessonId });
    if (!bookmark) {
      return res.status(404).json({ success: false, message: "Bookmark not found" });
    }
    res.status(200).json({ success: true, message: "Bookmark deleted successfully" });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    res.status(500).json({ success: false, message: "Error deleting bookmark", error: error.message });
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
      return res.status(400).json({ success: false, message: "No file uploaded" });
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
      }
    });
  } catch (error) {
    console.error("Error in handleUpload:", error);
    res.status(500).json({ success: false, message: "Error uploading file", error: error.message });
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
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    }));
    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      data: { count: files.length, files }
    });
  } catch (error) {
    console.error("Error in handleMultipleUpload:", error);
    res.status(500).json({ success: false, message: "Error uploading files", error: error.message });
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
      return res.status(400).json({ success: false, message: "Invalid course ID format" });
    }
    const course = await Course.findById(id).select("+corporate_details");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error("Error fetching corporate course:", error);
    res.status(500).json({ success: false, message: "Error fetching corporate course", error: error.message });
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
      return res.status(400).json({ success: false, message: "Videos must be an array" });
    }
    const course = await Course.findByIdAndUpdate(id, { $set: { recorded_videos: videos } }, { new: true });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.status(200).json({
      success: true,
      message: "Recorded videos updated successfully",
      data: course.recorded_videos
    });
  } catch (error) {
    console.error("Error updating recorded videos:", error);
    res.status(500).json({ success: false, message: "Error updating recorded videos", error: error.message });
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
      .filter(enrollment => enrollment.course_id != null)
      .map(enrollment => ({
        course_id: enrollment.course_id._id,
        course_title: enrollment.course_id.course_title,
        videos: enrollment.course_id.recorded_videos || []
      }));
      
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    console.error("Error fetching recorded videos:", error);
    res.status(500).json({ success: false, message: "Error fetching recorded videos", error: error.message });
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
      .select("course_title course_category course_image course_fee")
      .limit(parseInt(limit))
      .lean();
    res.status(200).json({ success: true, data: relatedCourses });
  } catch (error) {
    console.error("Error fetching related courses:", error);
    res.status(500).json({ success: false, message: "Error fetching related courses", error: error.message });
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
      .select("course_title course_category course_image course_fee course_duration")
      .lean();
    res.status(200).json({ success: true, data: newCourses });
  } catch (error) {
    console.error("Error fetching new courses:", error);
    res.status(500).json({ success: false, message: "Error fetching new courses", error: error.message });
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
    const enrollment = await EnrolledCourse.findOne({ student_id: studentId, course_id: courseId, status: "active" });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You must be enrolled in this course to download the brochure" });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (!course.brochures || course.brochures.length === 0) {
      return res.status(404).json({ success: false, message: "No brochure available for this course" });
    }
    const brochure = course.brochures[0];
    res.setHeader("Content-Type", brochure.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${brochure.filename || "course-brochure.pdf"}"`);
    const fileStream = await getFileStream(brochure.url);
    fileStream.pipe(res);
    fileStream.on("error", (error) => {
      console.error("Error streaming brochure:", error);
      res.status(500).json({ success: false, message: "Error downloading brochure", error: error.message });
    });
  } catch (error) {
    console.error("Error downloading brochure:", error);
    res.status(500).json({ success: false, message: "Error downloading brochure", error: error.message });
  }
};

// Get course prices
const getCoursePrices = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .select('prices course_title')
      .lean();
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: "Course not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        courseId: course._id,
        courseTitle: course.course_title,
        prices: course.prices || []
      }
    });
  } catch (error) {
    console.error("Error fetching course prices:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course prices",
      error: error.message
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
        message: "Prices must be provided as an array"
      });
    }

    // Validate and format price entries
    const formattedPrices = prices.map(price => {
      // Ensure required fields are present
      if (!price.currency || !price.individual) {
        throw new Error("Each price entry must contain currency and individual price");
      }

      // Convert string numbers to actual numbers
      const formattedPrice = {
        currency: price.currency.toUpperCase(),
        individual: Number(price.individual),
        batch: Number(price.batch) || Number(price.individual),
        min_batch_size: Number(price.min_batch_size) || 1,
        max_batch_size: Number(price.max_batch_size) || 10,
        early_bird_discount: price.early_bird_discount === 'N/A' ? 0 : Number(price.early_bird_discount) || 0,
        group_discount: price.group_discount === 'N/A' ? 0 : Number(price.group_discount) || 0,
        is_active: true
      };

      // Validate numeric values
      if (isNaN(formattedPrice.individual) || isNaN(formattedPrice.batch)) {
        throw new Error("Individual and batch prices must be valid numbers");
      }

      if (isNaN(formattedPrice.early_bird_discount) || isNaN(formattedPrice.group_discount)) {
        throw new Error("Discount values must be valid numbers");
      }

      if (isNaN(formattedPrice.min_batch_size) || isNaN(formattedPrice.max_batch_size)) {
        throw new Error("Batch size values must be valid numbers");
      }

      return formattedPrice;
    });

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { prices: formattedPrices } },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Prices updated successfully",
      data: course.prices
    });
  } catch (error) {
    console.error("Error updating course prices:", error);
    res.status(500).json({
      success: false,
      message: "Error updating course prices",
      error: error.message
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
        message: "Updates must be a non-empty array"
      });
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.courseId },
        update: { 
          $set: { 
            prices: update.prices,
            "meta.lastPriceUpdate": new Date()
          } 
        },
        runValidators: true
      }
    }));

    const result = await Course.bulkWrite(bulkOps);
    
    res.status(200).json({
      success: true,
      message: "Bulk price update completed",
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error("Error in bulk price update:", error);
    res.status(500).json({
      success: false,
      message: "Error performing bulk price update",
      error: error.message
    });
  }
};

const getAllCoursesWithPrices = async (req, res) => {
  try {
    const { 
      currency, 
      min_price, 
      max_price, 
      active_only,
      status,
      course_category,
      courseCategory, // Added to support both parameter names
      class_type,
      course_type, // Added to support both parameter names
      search,
      has_discount
    } = req.query;
    
    console.log("Received query parameters:", req.query);
    
    const filter = {};
    const projection = {
      course_title: 1,
      course_grade: 1,
      course_duration: 1,
      class_type: 1,
      course_category: 1,
      status: 1,
      prices: 1
    };

    // Apply filters
    if (status) {
      filter.status = status;
    }

    // Handle both course_category and courseCategory parameters for backward compatibility
    const category = course_category || courseCategory;
    if (category) {
      try {
        // Decode the URL-encoded category name
        const decodedCategory = decodeURIComponent(category);
        console.log(`Original category: "${category}", Decoded category: "${decodedCategory}"`);
        
        // Create a more flexible search pattern that handles variations of the category name
        // This will match "Data & Analytics", "Data and Analytics", etc.
        const searchPattern = decodedCategory
          .replace(/&/g, '(and|&)') // Replace & with (and|&) to match both "and" and "&"
          .replace(/\s+/g, '\\s+') // Replace spaces with \s+ to match any number of spaces
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape other regex special characters
        
        // Use case-insensitive regex for more flexible matching
        filter.course_category = { $regex: new RegExp(searchPattern, 'i') };
        console.log(`Using search pattern: "${searchPattern}"`);
        
        // First, let's check if there are any courses with the given category
        const categoryCheck = await Course.find({ course_category: { $regex: new RegExp(escapeRegExp(decodedCategory), 'i') } })
          .select('course_category')
          .lean();
        
        console.log(`Found ${categoryCheck.length} courses with category matching "${decodedCategory}"`);
        if (categoryCheck.length > 0) {
          console.log("Available categories:", categoryCheck.map(c => c.course_category).join(', '));
        } else {
          // Try a more lenient search without escaping special characters
          const lenientCategoryCheck = await Course.find({ 
            course_category: { 
              $regex: new RegExp(decodedCategory.replace(/[.*+?^${}()|[\]\\]/g, ''), 'i') 
            } 
          })
            .select('course_category')
            .lean();
          
          if (lenientCategoryCheck.length > 0) {
            console.log("Found categories with lenient search:", lenientCategoryCheck.map(c => c.course_category).join(', '));
          }
        }
      } catch (error) {
        console.error("Error processing category:", error);
        // Continue with the original category without special handling
        filter.course_category = category;
      }
    }

    // Handle both class_type and course_type parameters for backward compatibility
    const courseType = class_type || course_type;
    if (courseType) {
      // Decode the URL-encoded course type
      const decodedCourseType = decodeURIComponent(courseType);
      filter.class_type = decodedCourseType;
      console.log("Filtering by course type:", decodedCourseType);
    }

    if (search) {
      // Decode the URL-encoded search term
      const decodedSearch = decodeURIComponent(search);
      filter.course_title = { $regex: decodedSearch, $options: 'i' };
      console.log("Filtering by search term:", decodedSearch);
    }

    if (currency) {
      filter['prices.currency'] = currency.toUpperCase();
      console.log("Filtering by currency:", currency.toUpperCase());
    }

    if (min_price || max_price) {
      filter['prices.individual'] = {};
      if (min_price) filter['prices.individual'].$gte = Number(min_price);
      if (max_price) filter['prices.individual'].$lte = Number(max_price);
      console.log("Filtering by price range:", min_price ? `Min: ${min_price}` : '', max_price ? `Max: ${max_price}` : '');
    }

    if (active_only === 'true') {
      filter['prices.is_active'] = true;
      console.log("Filtering by active prices only");
    }

    if (has_discount === 'true') {
      filter.$or = [
        { 'prices.early_bird_discount': { $gt: 0 } },
        { 'prices.group_discount': { $gt: 0 } }
      ];
      console.log("Filtering by courses with discounts");
    }

    console.log("Final filter:", JSON.stringify(filter));
    
    // Log the MongoDB query that will be executed
    const queryString = JSON.stringify(filter);
    console.log(`MongoDB query: ${queryString}`);
    
    // First, let's check if there are any courses with the given category
    if (category) {
      const categoryCheck = await Course.find({ course_category: { $regex: new RegExp(escapeRegExp(decodedCategory), 'i') } })
        .select('course_category')
        .lean();
      
      console.log(`Found ${categoryCheck.length} courses with category matching "${decodedCategory}"`);
      if (categoryCheck.length > 0) {
        console.log("Available categories:", categoryCheck.map(c => c.course_category).join(', '));
      }
    }
    
    const courses = await Course.find(filter)
      .select(projection)
      .lean()
      .sort({'prices.currency': 1});

    console.log(`Found ${courses.length} courses matching the criteria`);

    // If no courses found and we're filtering by category, try a more lenient search
    if (!courses.length && category) {
      console.log("No courses found with initial search, trying a more lenient search...");
      
      // Create a more lenient filter by removing the category filter
      const lenientFilter = { ...filter };
      delete lenientFilter.course_category;
      
      // Try to find courses with the given status
      const lenientCourses = await Course.find(lenientFilter)
        .select(projection)
        .lean()
        .sort({'prices.currency': 1});
      
      console.log(`Found ${lenientCourses.length} courses with lenient search`);
      
      if (lenientCourses.length > 0) {
        // Get all available categories
        const allCategories = await Course.distinct('course_category');
        console.log("All available categories:", allCategories);
        
        // Find similar categories to suggest
        const decodedCategory = decodeURIComponent(category);
        const similarCategories = allCategories.filter(cat => {
          // Check if categories are similar (ignoring case and special characters)
          const normalizedSearch = decodedCategory.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, '');
          const normalizedCategory = cat.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, '');
          return normalizedCategory.includes(normalizedSearch) || normalizedSearch.includes(normalizedCategory);
        });
        
        return res.status(404).json({
          success: false,
          message: "No courses found with the specified category",
          filter: filter,
          debug: {
            originalCategory: category,
            decodedCategory: decodedCategory,
            searchPattern: searchPattern,
            availableCategories: allCategories,
            similarCategories: similarCategories,
            suggestion: similarCategories.length > 0 
              ? `Try using one of these similar categories: ${similarCategories.join(', ')}` 
              : "Try using one of the available categories listed above"
          }
        });
      }
    }

    if (!courses.length) {
      // Get all available categories for better error reporting
      const allCategories = await Course.distinct('course_category');
      
      return res.status(404).json({
        success: false,
        message: "No courses found with matching criteria",
        filter: filter, // Include the filter in the response for debugging
        debug: {
          originalCategory: category,
          decodedCategory: category ? decodedCategory : null,
          searchPattern: category ? searchPattern : null,
          availableCategories: category ? (await Course.distinct('course_category')) : []
        }
      });
    }

    // Get unique values for filters
    const uniqueCategories = [...new Set(courses.map(course => course.course_category))].filter(Boolean);
    const uniqueTypes = [...new Set(courses.map(course => course.class_type))].filter(Boolean);
    const uniqueCurrencies = [...new Set(courses.flatMap(course => 
      (course.prices || []).map(p => p.currency)
    ))];

    // Transform the data for better readability and handle undefined prices
    const transformed = courses.map(course => {
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
      const formattedTitle = titleParts.join(' | ');

      // Format pricing information
      const pricing = (course.prices || []).map(price => {
        if (!price) return null;
        
        const formattedPrice = {
          currency: price.currency || 'Not specified',
          prices: {
            individual: price.individual || 0,
            batch: price.batch || price.individual || 0
          },
          discounts: {
            earlyBird: price.early_bird_discount ? `${price.early_bird_discount}%` : 'N/A',
            group: price.group_discount ? `${price.group_discount}%` : 'N/A'
          },
          batchSize: {
            min: price.min_batch_size || 'N/A',
            max: price.max_batch_size || 'N/A'
          },
          status: price.is_active ? 'Active' : 'Inactive'
        };

        // Format currency with symbol
        if (price.currency === 'USD') {
          formattedPrice.prices.individual = `$${formattedPrice.prices.individual}`;
          formattedPrice.prices.batch = `$${formattedPrice.prices.batch}`;
        } else if (price.currency === 'EUR') {
          formattedPrice.prices.individual = `€${formattedPrice.prices.individual}`;
          formattedPrice.prices.batch = `€${formattedPrice.prices.batch}`;
        } else if (price.currency === 'INR') {
          formattedPrice.prices.individual = `₹${formattedPrice.prices.individual}`;
          formattedPrice.prices.batch = `₹${formattedPrice.prices.batch}`;
        }

        return formattedPrice;
      }).filter(Boolean); // Remove any null entries

      return {
        courseId: course._id,
        courseTitle: formattedTitle,
        courseCategory: course.course_category || 'Not specified',
        classType: course.class_type || 'Not specified',
        status: course.status || 'Not specified',
        pricing: pricing.length > 0 ? pricing : [{
          currency: 'Not specified',
          prices: {
            individual: 'N/A',
            batch: 'N/A'
          },
          discounts: {
            earlyBird: 'N/A',
            group: 'N/A'
          },
          batchSize: {
            min: 'N/A',
            max: 'N/A'
          },
          status: 'Not available'
        }]
      };
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      filters: {
        categories: uniqueCategories,
        types: uniqueTypes,
        currencies: uniqueCurrencies
      },
      data: transformed
    });

  } catch (error) {
    console.error("Error fetching course prices:", error);
    
    // Provide more detailed error information
    const errorResponse = {
      success: false,
      message: "Error fetching course prices",
      error: error.message
    };
    
    // Add stack trace in development environment
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }
    
    // Add query parameters for debugging
    errorResponse.query = req.query;
    
    res.status(500).json(errorResponse);
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseTitles,
  getAllCoursesWithLimits,
  toggleCourseStatus,
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
  deleteBookmark,
  getCoorporateCourseById,
  updateRecordedVideos,
  getRecordedVideosForUser,
  getAllRelatedCourses,
  getNewCoursesWithLimits,
  downloadBrochure,
  getCourseLiveClasses,
  markLiveClassAttended,
  getCoursePrices,
  updateCoursePrices,
  bulkUpdateCoursePrices,
  getAllCoursesWithPrices
};