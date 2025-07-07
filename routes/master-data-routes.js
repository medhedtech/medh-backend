import express from "express";
const router = express.Router();

import {
  getAllMasterData,
  getMasterType,
  getCategoriesWithClassTypes,
  addToMasterType,
  removeFromMasterType,
  updateMasterType,
  initializeMasterData,
  resetMasterData,
  getMasterDataStats,
} from "../controllers/master-data-controller.js";

import { authenticateToken } from "../middleware/auth.js";
import {
  validateMasterType,
  validateAddItem,
  validateUpdateItems,
  validateItemParam,
} from "../validations/masterDataValidation.js";

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Master data routes
router.get("/", getAllMasterData);
router.get("/stats", getMasterDataStats);
router.get("/categories-with-types", getCategoriesWithClassTypes);
router.get("/:type", validateMasterType, getMasterType);

// CRUD operations for specific master types
router.post("/:type/add", validateMasterType, validateAddItem, addToMasterType);
router.delete(
  "/:type/:item",
  validateMasterType,
  validateItemParam,
  removeFromMasterType,
);
router.put("/:type", validateMasterType, validateUpdateItems, updateMasterType);

// Utility routes
router.post("/initialize", initializeMasterData);
router.post("/reset", resetMasterData);

export default router;
