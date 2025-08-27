import express from "express";

import * as studentController from "../controllers/students-controller.js";

const router = express.Router();

// Student Management Routes
router.post("/create", studentController.createStudent);
router.get("/get", studentController.getAllStudents);
router.get("/get/:id", studentController.getStudentById);
router.post("/update/:id", studentController.updateStudent);
router.post("/toggle-status/:id", studentController.toggleStudentStatus);
router.delete("/delete/:id", studentController.deleteStudent);

// Test endpoint to check both collections
router.get("/test-data", async (req, res) => {
  try {
    // Import models
    const Student = (await import("../models/student-model.js")).default;
    const User = (await import("../models/user-modal.js")).default;
    
    // Count students in both collections
    const studentCollectionCount = await Student.countDocuments({});
    const userCollectionCount = await User.countDocuments({ role: { $in: ["student", "coorporate-student"] } });
    
    // Get sample data from both
    const sampleStudents = await Student.find({}).limit(3).select('_id full_name email course_name');
    const sampleUsers = await User.find({ role: { $in: ["student", "coorporate-student"] } }).limit(3).select('_id full_name email role');
    
    res.status(200).json({
      success: true,
      message: "Student data test completed",
      data: {
        student_collection: {
          count: studentCollectionCount,
          sample: sampleStudents
        },
        user_collection: {
          count: userCollectionCount,
          sample: sampleUsers
        },
        recommendation: studentCollectionCount > 0 ? 'Use Student collection' : 'Use User collection fallback'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error testing student data",
      error: error.message
    });
  }
});

// Wishlist Management Routes
router.post("/wishlist/add", studentController.addToWishlist);
router.delete("/wishlist/remove", studentController.removeFromWishlist);
router.get("/wishlist/:studentId", studentController.getWishlist);
router.get(
  "/wishlist/check/:studentId/:courseId",
  studentController.checkWishlistStatus,
);
router.delete("/wishlist/clear/:studentId", studentController.clearWishlist);
router.get("/wishlist/stats/:studentId", studentController.getWishlistStats);

export default router;
