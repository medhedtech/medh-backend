import mongoose from "mongoose";
import User from "../../models/user-modal.js";
import { Course, Batch } from "../../models/course-model.js";
import Enrollment from "../../models/enrollment-model.js";
import ParentChild from "../../models/parent-child.model.js";
import logger from "../../utils/logger.js";

const TEST_TIMEOUT = 60000; // 60 seconds

// Centralized error handler
const handleError = (error, message) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      response: error.response ? error.response.body : "No response body",
    },
  });
  throw new Error(`${message}: ${error.message}`);
};

/**
 * Connect to MongoDB before all tests
 */
export const setupTestDB = () => {
  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        logger.info("MongoDB connected for tests");
      }
    } catch (error) {
      handleError(error, "Failed to connect to MongoDB");
    }
  }, TEST_TIMEOUT);

  // Disconnect after all tests
  afterAll(async () => {
    try {
      await mongoose.disconnect();
      logger.info("MongoDB disconnected");
    } catch (error) {
      handleError(error, "Failed to disconnect MongoDB");
    }
  }, TEST_TIMEOUT);
};

/**
 * Create or retrieve a user
 * @param {Object} userData - User data
 * @param {string} role - User role
 * @returns {Object} User document and JWT token
 */
export const getOrCreateUser = async (request, userData, role) => {
  try {
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = new User({ ...userData, role: [role] });
      await user.save();
      logger.info(`Created test user: ${userData.email}`);
    }

    const res = await request
      .post("/api/v1/auth/login")
      .send({ email: userData.email, password: userData.password });

    if (res.status !== 200) {
      throw new Error(
        `Login failed with status ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
    return { user, token: res.body.data.access_token };
  } catch (error) {
    handleError(error, `Failed to get or create user ${userData.email}`);
  }
};

/**
 * Create a course
 * @returns {Object} Course document
 */
export const createCourse = async (instructorId) => {
  try {
    const courseData = {
      course_title: "Test Course for Parent-Instructor API",
      course_description: "A comprehensive test course.",
      assigned_instructor: instructorId,
      created_by: instructorId,
    };
    let course = await Course.findOne({
      course_title: courseData.course_title,
    });
    if (!course) {
      course = new Course(courseData);
      await course.save();
      logger.info(`Created test course: ${course.course_title}`);
    }
    return course;
  } catch (error) {
    handleError(error, "Failed to create course");
  }
};

/**
 * Create a batch for a course
 * @returns {Object} Batch document
 */
export const createBatch = async (courseId, instructorId) => {
  try {
    const batchData = {
      batch_name: `Test Batch - ${courseId}`,
      course: courseId,
      instructor: instructorId,
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      capacity: 20,
    };
    let batch = await Batch.findOne({ batch_name: batchData.batch_name });
    if (!batch) {
      batch = new Batch(batchData);
      await batch.save();
      logger.info(`Created test batch: ${batch.batch_name}`);
    }
    return batch;
  } catch (error) {
    handleError(error, "Failed to create batch");
  }
};

/**
 * Enroll a student in a course/batch
 * @returns {Object} Enrollment document
 */
export const enrollStudent = async (studentId, courseId, batchId) => {
  try {
    const enrollmentData = {
      student: studentId,
      course: courseId,
      batch: batchId,
      status: "active",
      access_expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      pricing_snapshot: {
        original_price: 1000,
        final_price: 1000,
        currency: "INR",
        pricing_type: "batch",
      },
    };
    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });
    if (!enrollment) {
      enrollment = new Enrollment(enrollmentData);
      await enrollment.save();
      logger.info(
        `Enrolled student ${studentId} in course ${courseId}`,
      );
    }
    return enrollment;
  } catch (error) {
    handleError(error, "Failed to enroll student");
  }
};

/**
 * Link a parent to a child
 * @returns {Object} ParentChild relationship document
 */
export const linkParentToChild = async (parentId, childId) => {
  try {
    const parentChildData = {
      parent_id: parentId,
      child_id: childId,
      relationship_type: "father",
      verified: true,
    };
    let relationship = await ParentChild.findOne({
      parent_id: parentId,
      child_id: childId,
    });
    if (!relationship) {
      relationship = new ParentChild(parentChildData);
      await relationship.save();
      logger.info(`Linked parent ${parentId} to child ${childId}`);
    }
    return relationship;
  } catch (error) {
    handleError(error, "Failed to link parent to child");
  }
}; 