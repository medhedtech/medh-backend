import express from "express";
import {
  createFAQ,
  updateFAQ,
  getAllFAQs,
  getFAQById,
  deleteFAQ,
} from "../controllers/freq-questions-controller.js";

const router = express.Router();

// Route to create a new FAQ
router.post("/create", createFAQ);
router.post("/update/:id", updateFAQ);
router.get("/get", getAllFAQs);
router.get("/get/:id", getFAQById);
router.delete("/delete/:id", deleteFAQ);

export default router;
