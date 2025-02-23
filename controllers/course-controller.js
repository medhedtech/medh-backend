const { default: mongoose } = require("mongoose");
const Course = require("../models/course-model");
const EnrolledCourse = require("../models/enrolled-courses-model");

const createCourse = async (req, res) => {
  try {
    const {
      course_category,
      course_title,
      course_tag,
      no_of_Sessions,
      course_duration,
      session_duration,
      course_description,
      course_fee,
      course_videos,
      brochures,
      course_image,
      course_grade,
      category,
      resource_videos,
      resource_pdfs,
      curriculum,
      recorded_videos,
      efforts_per_Week,
      class_type,
      is_Certification,
      is_Assignments,
      is_Projects,
      is_Quizes,
      related_courses,
    } = req.body;

    const isFree = course_tag === "Free" && course_fee === 0;

    const newCourse = new Course({
      course_category,
      course_title,
      course_tag,
      no_of_Sessions,
      course_duration,
      session_duration,
      course_description,
      course_fee,
      course_videos,
      brochures,
      course_image,
      course_grade,
      category,
      resource_videos,
      resource_pdfs,
      curriculum,
      isFree,
      recorded_videos,
      efforts_per_Week,
      class_type,
      is_Certification,
      is_Assignments,
      is_Projects,
      is_Quizes,
      related_courses,
    });

    await newCourse.save();
    res.status(201).json({ message: "Course created successfully", newCourse });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Error creating course", error });
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
      course_title,
      course_tag,
      no_of_Sessions,
      course_duration,
      session_duration,
      course_description,
      course_fee,
      course_videos,
      brochures,
      course_image,
      course_grade,
      category,
      resource_videos,
      resource_pdfs,
      efforts_per_Week,
      class_type,
      is_Certification,
      is_Assignments,
      is_Projects,
      is_Quizes,
      related_courses,
    } = req.body;

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      {
        course_category,
        course_title,
        course_tag,
        no_of_Sessions,
        course_duration,
        session_duration,
        course_description,
        course_fee,
        course_videos,
        brochures,
        course_image,
        course_grade,
        category,
        resource_videos,
        resource_pdfs,
        efforts_per_Week,
        class_type,
        is_Certification,
        is_Assignments,
        is_Projects,
        is_Quizes,
        related_courses,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: "Error updating course", error });
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
