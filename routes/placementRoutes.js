import express from "express";

import {
  getAllPlacements,
  addPlacement,
} from "../controllers/placementController.js";

const router = express.Router();

router.get("/getAll", getAllPlacements);
router.post("/create", addPlacement);

export default router;
