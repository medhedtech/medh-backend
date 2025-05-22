import { BlendedCourse, LiveCourse, FreeCourse } from "../models/course-types/index.js";
import { validateMongoDbId } from "../utils/validateMongodbId.js";
import asyncHandler from "express-async-handler";

/**
 * @desc    Create a new course (blended, live, or free)
 * @route   POST /api/v1/courses
 * @access  Private/Admin
 */
export const createCourse = asyncHandler(async (req, res) => {
  try {
    const { course_type } = req.body;
    let CourseModel;

    // Select the appropriate course model based on type
    switch (course_type) {
      case "blended":
        CourseModel = BlendedCourse;
        break;
      case "live":
        CourseModel = LiveCourse;
        break;
      case "free":
        CourseModel = FreeCourse;
        break;
      default:
        throw new Error("Invalid course type");
    }

    const course = await CourseModel.create(req.body);
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
 * @desc    Get all courses of a specific type
 * @route   GET /api/v1/courses/:type
 * @access  Public
 */
export const getCoursesByType = asyncHandler(async (req, res) => {
  try {
    const { type } = req.params;
    let CourseModel;

    switch (type) {
      case "blended":
        CourseModel = BlendedCourse;
        break;
      case "live":
        CourseModel = LiveCourse;
        break;
      case "free":
        CourseModel = FreeCourse;
        break;
      default:
        throw new Error("Invalid course type");
    }

    const courses = await CourseModel.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }
});

/**
 * @desc    Get a single course by ID
 * @route   GET /api/v1/courses/:type/:id
 * @access  Public
 */
export const getCourseById = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    validateMongoDbId(id);

    let CourseModel;
    switch (type) {
      case "blended":
        CourseModel = BlendedCourse;
        break;
      case "live":
        CourseModel = LiveCourse;
        break;
      case "free":
        CourseModel = FreeCourse;
        break;
      default:
        throw new Error("Invalid course type");
    }

    const course = await CourseModel.findById(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    throw new Error(`Failed to fetch course: ${error.message}`);
  }
});

/**
 * @desc    Update a course
 * @route   PUT /api/v1/courses/:type/:id
 * @access  Private/Admin
 */
export const updateCourse = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    validateMongoDbId(id);

    let CourseModel;
    switch (type) {
      case "blended":
        CourseModel = BlendedCourse;
        break;
      case "live":
        CourseModel = LiveCourse;
        break;
      case "free":
        CourseModel = FreeCourse;
        break;
      default:
        throw new Error("Invalid course type");
    }

    const course = await CourseModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    res.json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }
});

/**
 * @desc    Delete a course
 * @route   DELETE /api/v1/courses/:type/:id
 * @access  Private/Admin
 */
export const deleteCourse = asyncHandler(async (req, res) => {
  try {
    const { type, id } = req.params;
    validateMongoDbId(id);

    let CourseModel;
    switch (type) {
      case "blended":
        CourseModel = BlendedCourse;
        break;
      case "live":
        CourseModel = LiveCourse;
        break;
      case "free":
        CourseModel = FreeCourse;
        break;
      default:
        throw new Error("Invalid course type");
    }

    const course = await CourseModel.findByIdAndDelete(id);
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }

    res.json({
      success: true,
      message: "Course deleted successfully",
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
    validateMongoDbId(id);

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
    validateMongoDbId(id);

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
    validateMongoDbId(id);

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
    validateMongoDbId(id);

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
    validateMongoDbId(id);

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