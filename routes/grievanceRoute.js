import express from "express";

import {
  createGrievance,
  getAllGrievances,
  getGrievanceById,
  updateGrievance,
  deleteGrievance,
  getGrievancesByUser,
} from "../controllers/grievance-controller.js";

const router = express.Router();

router.post("/", createGrievance);
router.get("/", getAllGrievances);
router.get("/user/:userId", getGrievancesByUser);
router.get("/:id", getGrievanceById);
router.patch("/:id", updateGrievance);
router.delete("/:id", deleteGrievance);

export default router;
