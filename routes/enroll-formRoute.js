import express from "express";

import {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} from "../controllers/enrollFormController.js";

const router = express.Router();

router.post("/create", createEnrollment);
router.get("/getAll", getAllEnrollments);
router.get("/get/:id", getEnrollmentById);
router.put("/update/:id", updateEnrollment);
router.delete("/delete/:id", deleteEnrollment);

export default router;
