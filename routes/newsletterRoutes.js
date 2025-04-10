import express from "express";
const router = express.Router();
import {
  addNewsletter,
  getAllSubscribers,
  deleteSubscriber,
} from "../controllers/newsletterController.js";

// Routes
router.post("/add", addNewsletter);
router.get("/getAll", getAllSubscribers);
router.delete("/update/:id", deleteSubscriber);

export default router;
