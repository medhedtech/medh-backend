import express from "express";
const router = express.Router();
import {
  createJobForm,
  getAllJobForms,
  getJobFormById,
  updateJobForm,
  deleteJobForm,
} from "../controllers/jobController.js";

router.post("/create", createJobForm);
router.get("/getAll", getAllJobForms);
router.get("/get/:id", getJobFormById);
router.put("/update/:id", updateJobForm);
router.delete("/delete/:id", deleteJobForm);

export default router;
