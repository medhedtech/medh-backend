import express from "express";

import {
  createCorporate,
  getAllCorporates,
  getCorporateById,
  updateCorporate,
  deleteCorporate,
  getCorporateFormInfo,
} from "../controllers/corporate-training-controller.js";

const router = express.Router();

// Corporate training form endpoints
router.post("/", createCorporate); // Matches frontend API call to /corporate-training
router.post("/create", createCorporate); // Legacy endpoint
router.get("/", getAllCorporates);
router.get("/getAll", getAllCorporates); // Legacy endpoint
router.get("/form-info", getCorporateFormInfo); // New endpoint for form requirements
router.get("/:id", getCorporateById);
router.get("/get/:id", getCorporateById); // Legacy endpoint
router.put("/:id", updateCorporate);
router.put("/update/:id", updateCorporate); // Legacy endpoint
router.delete("/:id", deleteCorporate);
router.delete("/delete/:id", deleteCorporate); // Legacy endpoint

export default router;
