import supertest from "supertest";
import app from "../../app.js";
import {
  setupTestDB,
  getOrCreateUser,
  createCourse,
  createBatch,
  enrollStudent,
} from "./utils/testHelper.js";
import logger from "../../utils/logger.js";

const request = supertest(app);
const TEST_TIMEOUT = 60000;

describe("Instructor API Endpoints", () => {
  let student,
    instructor,
    course,
    batch,
    enrollment,
    studentToken,
    instructorToken;

  // Setup test database
  setupTestDB();

  beforeAll(async () => {
    try {
      // 1. Create users
      const studentData = await getOrCreateUser(
        request,
        {
          email: "student-for-instructor@medh.co",
          password: "Student@123",
          full_name: "Test Student for Instructor",
        },
        "student",
      );
      student = studentData.user;
      studentToken = studentData.token;

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

      logger.info("Test setup complete for Instructor APIs");
    } catch (error) {
      logger.error("Error in beforeAll setup for Instructor APIs", { error });
      throw error;
    }
  }, TEST_TIMEOUT);

  // ==========================================
  // INSTRUCTOR DASHBOARD/COURSE ROUTES
  // ==========================================
  describe("GET /api/v1/instructors/courses", () => {
    it("should return courses assigned to the instructor", async () => {
      const res = await request
        .get("/api/v1/instructors/courses")
        .set("Authorization", `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      const courseIds = res.body.data.map((c) => c._id);
      expect(courseIds).toContain(course._id.toString());
    });
  });

  describe("GET /api/v1/instructors/students/:courseId", () => {
    it("should return students enrolled in the instructor's course", async () => {
      const res = await request
        .get(`/api/v1/instructors/students/${course._id}`)
        .set("Authorization", `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      const studentIds = res.body.data.map((s) => s.student._id);
      expect(studentIds).toContain(student._id.toString());
    });
  });

  // Add tests for other relevant instructor API endpoints...
}); 