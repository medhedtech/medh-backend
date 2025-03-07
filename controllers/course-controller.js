const { default: mongoose } = require("mongoose");
const Course = require("../models/course-model");
const EnrolledCourse = require("../models/enrolled-courses-model");
const { validateObjectId } = require("../utils/validation-helpers");

/**
 * @desc    Create a new course
 * @route   POST /api/courses/create
 * @access  Private/Admin
 */
const createCourse = async (req, res) => {
  try {
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

    // Validate required fields with detailed error messages
    const requiredFields = {
      course_title,
      course_category,
      category_type,
      course_image,
      is_Certification,
      is_Assignments,
      is_Projects,
      is_Quizes
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        error: missingFields.reduce((acc, field) => {
          acc[field] = `${field.replace(/_/g, ' ')} is required`;
          return acc;
        }, {})
      });
    }

    // Validate course fee for free courses
    if (category_type === "Free" && course_fee !== 0) {
      return res.status(400).json({
        message: "Course fee must be 0 for free courses",
        error: { course_fee: "Course fee must be 0 for free courses" },
      });
    }

    // Format efforts per week if not already formatted
    const formattedEffortsPerWeek = efforts_per_Week || 
      (min_hours_per_week && max_hours_per_week) ? 
      `${min_hours_per_week} - ${max_hours_per_week} hours / week` : 
      undefined;

    // Process curriculum if provided
    const processedCurriculum = curriculum?.map(week => ({
      weekTitle: week.weekTitle,
      weekDescription: week.weekDescription,
      topics: week.topics || [],
      resources: week.resources || []
    })) || [];

    // Process tools and technologies if provided
    const processedTools = tools_technologies?.map(tool => ({
      name: tool.name,
      category: tool.category || 'other',
      description: tool.description || '',
      logo_url: tool.logo_url || ''
    })) || [];

    // Process bonus modules if provided
    const processedBonusModules = bonus_modules?.map(module => ({
      title: module.title,
      description: module.description || '',
      resources: module.resources || []
    })) || [];

    // Process FAQs if provided
    const processedFaqs = faqs?.map(faq => ({
      question: faq.question,
      answer: faq.answer
    })) || [];

    // Process prices if provided
    const processedPrices = prices?.map(price => ({
      currency: price.currency,
      individual: price.individual || 0,
      batch: price.batch || 0,
      min_batch_size: price.min_batch_size || 2,
      max_batch_size: price.max_batch_size || 10,
      early_bird_discount: price.early_bird_discount || 0,
      group_discount: price.group_discount || 0,
      is_active: price.is_active !== false
    })) || [];

    const newCourse = new Course({
      course_category,
      category_type,
      course_title,
      course_tag: category_type === "Free" ? "Free" : (req.body.course_tag || "Live"),
      no_of_Sessions,
      course_duration,
      session_duration,
      course_description,
      course_fee,
      course_videos: course_videos || [],
      brochures: brochures || [],
      course_image,
      course_grade,
      resource_videos: resource_videos || [],
      resource_pdfs: resource_pdfs || [],
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
      related_courses: related_courses || [],
      prices: processedPrices,
      isFree: category_type === "Free",
    });

    await newCourse.save();
    
    res.status(201).json({ 
      success: true,
      message: "Course created successfully", 
      newCourse,
      summary: {
        curriculum: {
          totalWeeks: processedCurriculum.length,
          totalTopics: processedCurriculum.reduce((total, week) => total + (week.topics?.length || 0), 0),
          totalResources: processedCurriculum.reduce((total, week) => total + (week.resources?.length || 0), 0)
        },
        tools: {
          count: processedTools.length,
          categories: [...new Set(processedTools.map(t => t.category))]
        },
        bonusModules: {
          count: processedBonusModules.length,
          totalResources: processedBonusModules.reduce((total, module) => total + (module.resources?.length || 0), 0)
        },
        faqs: {
          count: processedFaqs.length
        },
        pricing: {
          currencies: processedPrices.map(p => p.currency),
          hasBatchPricing: processedPrices.some(p => p.batch > 0),
          hasIndividualPricing: processedPrices.some(p => p.individual > 0)
        }
      }
    });
  } catch (error) {
    console.error("Error creating course:", error);
    
    // Send more detailed validation errors if available
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      
      return res.status(400).json({ 
        success: false,
        message: "Validation error creating course", 
        error: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error creating course", 
      error: error.message || "An unexpected error occurred" 
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
    } = req.query;

    if(min_hours_per_week){
      filter.min_hours_per_week = min_hours_per_week;
    }
    
    if(max_hours_per_week){
      filter.max_hours_per_week = max_hours_per_week;
    }

    if(no_of_Sessions){
      filter.no_of_Sessions = no_of_Sessions;
    }
    if(description){
      filter.course_description = description;
    }
    if(course_grade){
      filter.course_grade = course_grade;
    }
    if(resource_videos){
      filter.resource_videos = resource_videos;
    }
    if(resource_pdfs){
      filter.resource_pdfs = resource_pdfs;
    }
    if(curriculum){
      filter.curriculum = curriculum;
    }
    if(tools_technologies){
      filter.tools_technologies = tools_technologies;
    }
    
    // Parse and validate pagination parameters
    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page and limit must be positive numbers."
      });
    }

    // Build the filter object
    const filter = {};
    const textSearchFields = {};

    // Text search handling
    if (search) {
      // If using text index
      if (search.length >= 3) {
        filter.$text = { $search: search };
        textSearchFields.score = { $meta: "textScore" };
      } else {
        // For shorter search terms, use regex on key fields
        filter.$or = [
          { course_title: { $regex: search, $options: "i" } },
          { course_category: { $regex: search, $options: "i" } },
          { course_tag: { $regex: search, $options: "i" } }
        ];
      }
    }

    // Category filter - support array or string
    if (course_category) {
      if (Array.isArray(course_category)) {
        filter.course_category = { $in: course_category };
      } else if (typeof course_category === 'string') {
        // Handle comma-separated string values
        if (course_category.includes(',')) {
          filter.course_category = { $in: course_category.split(',').map(c => c.trim()) };
        } else {
          filter.course_category = course_category;
        }
      }
    }

    // Category type filter - support array or string
    if (category_type) {
      if (Array.isArray(category_type)) {
        filter.category_type = { $in: category_type };
      } else if (typeof category_type === 'string') {
        // Handle comma-separated string values
        if (category_type.includes(',')) {
          filter.category_type = { $in: category_type.split(',').map(c => c.trim()) };
        } else {
          filter.category_type = category_type;
        }
      }
    }

    // Course tag filter
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

    // Class type filter - Add proper handling for class_type parameter
    if (class_type) {
      if (Array.isArray(class_type)) {
        filter.class_type = { $in: class_type };
      } else if (typeof class_type === 'string') {
        // Handle comma-separated string values
        if (class_type.includes(',')) {
          filter.class_type = { $in: class_type.split(',').map(c => c.trim()) };
        } else {
          filter.class_type = { $regex: new RegExp(class_type, 'i') };
        }
      }
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Price range filter
    if (price_range) {
      const [min, max] = price_range.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filter.course_fee = { $gte: min, $lte: max };
      }
    }

    // Duration filter - parse and validate values
    if (min_duration || max_duration) {
      // If duration is stored as a string like "10 weeks", we need to extract numbers
      // This assumes course_duration is stored consistently
      const durationFilterQuery = [];
      
      if (min_duration) {
        const minDuration = parseInt(min_duration);
        if (!isNaN(minDuration)) {
          durationFilterQuery.push({ 
            course_duration: { $regex: new RegExp(`${minDuration}.*weeks?|${minDuration}.*months?|${minDuration}.*days?`, 'i') } 
          });
          
          // Also match any duration greater than the minimum
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
            // Filter out durations above max
            for (let i = maxDuration + 1; i <= 52; i++) {
              durationFilterQuery.push({ 
                course_duration: { $not: { $regex: new RegExp(`${i}.*weeks?|${i}.*months?|${i}.*days?`, 'i') } } 
              });
            }
          } else {
            // Create a filter for max duration only
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

    // Feature filters - ensure values match the exact format in the database
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
      const excludeIdsArray = Array.isArray(exclude_ids) ? exclude_ids : exclude_ids.split(',');
      const validIds = excludeIdsArray
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
        
      if (validIds.length > 0) {
        filter._id = { $nin: validIds };
      }
    }

    // Build sort options
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

    // Determine fields to project in the response
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

    // Execute the query with aggregation pipeline
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

    // Execute query with Promise.all for parallel processing
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
      return res
        .status(400)
        .json({ 
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
      createdAt: 1
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

// Export only the defined functions
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
};
