const { default: mongoose } = require("mongoose");
const Course = require("../models/course-model");
const EnrolledCourse = require("../models/enrolled-courses-model");

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

    // Validate required fields
    if (!course_title || !course_category || !category_type) {
      return res.status(400).json({
        message: "Missing required fields",
        error: {
          course_title: !course_title ? "Course title is required" : undefined,
          course_category: !course_category ? "Course category is required" : undefined,
          category_type: !category_type ? "Category type is required" : undefined,
        },
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
      `${min_hours_per_week} - ${max_hours_per_week} hours / week`;

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

    const newCourse = new Course({
      course_category,
      category_type,
      course_title,
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
      prices: prices || [],
      isFree: category_type === "Free",
    });

    await newCourse.save();
    res.status(201).json({ 
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
        }
      }
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ 
      message: "Error creating course", 
      error: error.errors || error 
    });
  }
};

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching courses", 
      error 
    });
  }
};

// Get all courses
const getAllCoursesWithLimits = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      course_title,
      course_tag,
      course_grade,
      course_category,
      status,
      isFree,
      search, // Added search query
      category,
      exclude,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ message: "Page and limit must be positive numbers." });
    }

    // Create a dynamic filter object
    const filter = {};

    if (course_title) {
      filter.course_title = { $regex: course_title, $options: "i" }; // Case-insensitive regex
    }
    if (course_tag) {
      filter.course_tag = { $regex: course_tag, $options: "i" }; // Case-insensitive regex
    }
    if (course_grade) {
      filter.course_grade = { $regex: course_grade, $options: "i" };
    }
    if (category) {
      filter.category = { $in: category.split(",") }; // Case-insensitive regex
    }
    // $regex: category, $options: "i"
    if (course_category) {
      // Convert course_category to an array if it's not already
      const categories = Array.isArray(course_category)
        ? course_category
        : [course_category];
      filter.course_category = { $in: categories }; // Matches any category in the array
    }
    if (status) {
      filter.status = status;
    }
    if (isFree) {
      filter.isFree = isFree;
    }

    // Add a dynamic search filter if the search query is provided
    if (search) {
      filter.$or = [
        { course_title: { $regex: search, $options: "i" } },
        { course_tag: { $regex: search, $options: "i" } },
        { course_category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } },
        { course_grade: { $regex: search, $options: "i" } },
      ];
    }
    console.log(exclude, "asdsad");
    if (exclude) {
      filter._id = { $ne: exclude };
    }
    console.log(filter, "sadasdasdasdasd");
    console.log(category, "dksjhgafsdcavbn");

    const courses = await Course.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCourses = await Course.countDocuments(filter);

    res.status(200).json({
      courses,
      totalCourses,
      totalPages: Math.ceil(totalCourses / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

const getNewCoursesWithLimits = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      course_tag,
      status,
      search, //
      user_id,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ message: "Page and limit must be positive numbers." });
    }

    // Create a dynamic filter object
    const filter = {};

    if (course_tag) {
      filter.course_tag = { $regex: course_tag, $options: "i" };
    }
    if (status) {
      filter.status = status;
    }

    // Add a dynamic search filter if the search query is provided
    if (search) {
      filter.$or = [
        { course_title: { $regex: search, $options: "i" } },
        { course_tag: { $regex: search, $options: "i" } },
        { course_category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } },
        { course_grade: { $regex: search, $options: "i" } },
      ];
    }

    const enrolledCourses = await EnrolledCourse.find({
      student_id: user_id,
    });

    const enrolledCourseIds = enrolledCourses.map(
      (enrolledCourse) => enrolledCourse.course_id
    );
    if (enrolledCourseIds.length) {
      filter._id = { $nin: enrolledCourseIds };
    }

    const courses = await Course.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCourses = await Course.countDocuments(filter);

    res.status(200).json({
      courses,
      totalCourses,
      totalPages: Math.ceil(totalCourses / limit),
      currentPage: page,
    });
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;
    console.log("studentId", studentId);
    const course = await Course.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
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
      },
    ]);

    if (!course.length) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json(course[0]);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course", error });
  }
};

// Get course by ID
const getCoorporateCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { coorporateId } = req.query;
    console.log("coorporateId", coorporateId, id);
    const course = await Course.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
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
      },
    ]);

    if (!course.length) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json(course[0]);
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ message: "Error fetching course", error });
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
        prices,
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
    const courseTitles = await Course.find().select("course_title");
    if (!courseTitles.length) {
      return res.status(404).json({ message: "No courses found" });
    }
    res.status(200).json(courseTitles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course titles", error });
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
};
