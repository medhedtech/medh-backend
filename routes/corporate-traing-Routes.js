import express from "express";

import {
  createCorporate,
  getAllCorporates,
  getCorporateById,
  updateCorporate,
  deleteCorporate,
} from "../controllers/corporate-training-controller.js";

const router = express.Router();

router.post("/create", createCorporate);
router.get("/getAll", getAllCorporates);
router.get("/get/:id", getCorporateById);
router.put("/update/:id", updateCorporate);
router.delete("/delete/:id", deleteCorporate);

export default router;
