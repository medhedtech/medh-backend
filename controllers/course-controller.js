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
 * @desc    Create a new course with advanced features
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
    const course = await CourseCreationService.createCourseWithLessons(req.body);
    res.status(201).json({
      success: true,
      message: "Course created successfully",
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
 * @desc    Update course by ID (advanced: supports final evaluation)
 * @route   PUT /api/courses/:id
 * @access  Private/Admin
 */
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
      brochures,
      course_image,
      course_grade,
      resource_pdfs,
      curriculum,
      tools_technologies,
      bonus_modules,
      faqs,
      final_evaluation,
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

    const formattedEffortsPerWeek =
      efforts_per_Week || `${min_hours_per_week} - ${max_hours_per_week} hours / week`;

    const processedCurriculum = curriculum
      ? curriculum.map(week => ({
          weekTitle: week.weekTitle,
          weekDescription: week.weekDescription,
          topics: week.topics || [],
          sections: week.sections || []
        }))
      : undefined;

    const processedTools = tools_technologies
      ? tools_technologies.map(tool => ({
          name: tool.name,
          category: tool.category || "other",
          description: tool.description || "",
          logo_url: tool.logo_url || ""
        }))
      : undefined;

    const processedBonusModules = bonus_modules
      ? bonus_modules.map(module => ({
          title: module.title,
          description: module.description || "",
          resources: module.resources || []
        }))
      : undefined;

    const processedFaqs = faqs
      ? faqs.map(faq => ({
          question: faq.question,
          answer: faq.answer
        }))
      : undefined;

    const processedPrices = prices
      ? prices.map(price => ({
          currency: price.currency,
          individual: price.individual || 0,
          batch: price.batch || 0,
          min_batch_size: price.min_batch_size || 2,
          max_batch_size: price.max_batch_size || 10,
          early_bird_discount: price.early_bird_discount || 0,
          group_discount: price.group_discount || 0,
          is_active: price.is_active !== false
        }))
      : undefined;

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
        course_fee, // Note: This value will be overridden in pre-save by batch price
        brochures,
        course_image,
        course_grade,
        resource_pdfs,
        curriculum: processedCurriculum,
        tools_technologies: processedTools,
        bonus_modules: processedBonusModules,
        faqs: processedFaqs,
        final_evaluation,
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
        faqs: { count: updatedCourse.faqs?.length || 0 },
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
    const enhancedCurriculum = course.curriculum.map(week => ({
      ...week,
      sections: week.sections.map(section => {
        const sectionLessons = section.lessons;
        const completedLessons = sectionLessons.filter(lesson => enrollment.completed_lessons.includes(lesson.id));
        return {
          ...section,
          progress: {
            total: sectionLessons.length,
            completed: completedLessons.length,
            percentage: sectionLessons.length > 0 ? Math.round((completedLessons.length / sectionLessons.length) * 100) : 0
          },
          lessons: sectionLessons.map(lesson => ({
            ...lesson,
            isCompleted: enrollment.completed_lessons.includes(lesson.id)
          }))
        };
      })
    }));
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
    const enhancedLessons = course.curriculum.flatMap(week =>
      week.sections.flatMap(section =>
        section.lessons.map(lesson => ({
          ...lesson,
          week: { id: week.id, title: week.weekTitle },
          section: { id: section.id, title: section.title },
          isCompleted: enrollment.completed_lessons.includes(lesson.id),
          hasNotes: enrollment.notes.some(note => note.lessonId.toString() === lesson.id.toString()),
          hasBookmarks: enrollment.bookmarks.some(bookmark => bookmark.lessonId.toString() === lesson.id.toString())
        }))
      )
    );
    enhancedLessons.sort((a, b) => a.order - b.order);
    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({
      success: true,
      data: enhancedLessons,
      progress: { total: enhancedLessons.length, completed: enrollment.completed_lessons.length, percentage: enrollment.progress }
    });
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
    for (let week of course.curriculum) {
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
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found in this course" });
    }
    const progress = await Progress.findOne({ course: courseId, student: userId, lesson: lessonId });
    const notes = await Note.find({ course: courseId, student: userId, lesson: lessonId }).sort({ createdAt: -1 });
    const bookmarks = await Bookmark.find({ course: courseId, student: userId, lesson: lessonId }).sort({ createdAt: -1 });
    let previousLesson = null;
    let nextLesson = null;
    // Navigation logic could be implemented here
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
          previous: previousLesson ? { id: previousLesson.id, title: previousLesson.title } : null,
          next: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null
        }
      }
    });
  } catch (error) {
    console.error("Error fetching lesson details:", error);
    res.status(500).json({ success: false, message: "Error fetching lesson details", error: error.message });
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
    const totalLessons = course.curriculum.reduce((sum, week) => sum + week.sections.reduce((s, section) => s + section.lessons.length, 0), 0);
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
    res.status(500).json({ success: false, message: "Error fetching course progress", error: error.message });
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
    if (enrollment.isLessonCompleted(lessonId)) {
      return res.status(200).json({ success: true, message: "Lesson already marked as complete" });
    }
    enrollment.completed_lessons.push(lessonId);
    enrollment.last_accessed = new Date();
    await enrollment.save();
    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: { progress: enrollment.progress, completedLessons: enrollment.completed_lessons.length }
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
    for (let week of course.curriculum) {
      for (let section of week.sections) {
        const found = section.lessons.find(l => l.id === lessonId);
        if (found) {
          lesson = found;
          break;
        }
      }
      if (lesson) break;
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
    const videos = enrollments.map(enrollment => ({
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
  downloadBrochure
};