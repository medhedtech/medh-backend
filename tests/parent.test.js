import supertest from "supertest";
import app from "../../app.js";
import {
  setupTestDB,
  getOrCreateUser,
  createCourse,
  createBatch,
  enrollStudent,
  linkParentToChild,
} from "./utils/testHelper.js";
import logger from "../../utils/logger.js";

const request = supertest(app);
const TEST_TIMEOUT = 60000;

describe("Parent API Endpoints", () => {
  let student,
    parent,
    instructor,
    course,
    batch,
    enrollment,
    parentChildLink,
    studentToken,
    parentToken,
    instructorToken;

  // Setup test database
  setupTestDB();

  beforeAll(async () => {
    try {
      // 1. Create users
      const studentData = await getOrCreateUser(
        request,
        {
          email: "student@medh.co",
          password: "Student@123",
          full_name: "Test Student",
        },
        "student",
      );
      student = studentData.user;
      studentToken = studentData.token;

      const parentData = await getOrCreateUser(
        request,
        {
          email: "parent@medh.co",
          password: "Parent@123",
          full_name: "Test Parent",
        },
        "parent",
      );
      parent = parentData.user;
      parentToken = parentData.token;

      const instructorData = await getOrCreateUser(
        request,
        {
          email: "instructor@medh.co",
          password: "Instructor@123",
          full_name: "Test Instructor",
        },
        "instructor",
      );
      instructor = instructorData.user;
      instructorToken = instructorData.token;

      // 2. Create course and batch
      course = await createCourse(instructor._id);
      batch = await createBatch(course._id, instructor._id);

      // 3. Enroll student
      enrollment = await enrollStudent(student._id, course._id, batch._id);

      // 4. Link parent and child
      parentChildLink = await linkParentToChild(parent._id, student._id);

      logger.info("Test setup complete for Parent APIs");
    } catch (error) {
      logger.error("Error in beforeAll setup for Parent APIs", { error });
      throw error;
    }
  }, TEST_TIMEOUT);

  // ==========================================
  // PARENT DASHBOARD ROUTES
  // ==========================================
  describe("GET /api/v1/parent/dashboard/profile", () => {
    it("should return parent profile with linked children", async () => {
      const res = await request
        .get("/api/v1/parent/dashboard/profile")
        .set("Authorization", `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parent.id).toBe(parent._id.toString());
      expect(res.body.data.children).toBeInstanceOf(Array);
      expect(res.body.data.children.length).toBeGreaterThan(0);
      expect(res.body.data.children[0].child.id).toBe(
        student._id.toString(),
      );
    });
  });

  describe("GET /api/v1/parent/dashboard/classes/upcoming", () => {
    it("should get upcoming classes for the child", async () => {
      const res = await request
        .get("/api/v1/parent/dashboard/classes/upcoming")
        .set("Authorization", `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Further assertions can be made if a class is scheduled for the test batch
    });
  });

  // Add tests for all other parent API endpoints...
}); 