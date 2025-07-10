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
