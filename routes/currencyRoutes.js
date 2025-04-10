import express from "express";
import {
  createCurrency,
  getAllCurrencies,
  getCurrencyById,
  updateCurrency,
  deleteCurrency,
  toggleCurrencyStatus,
  getCurrencyByCountryCode,
  getAllCurrencyCountryCodes
} from "../controllers/currency-controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllCurrencies);
router.get("/country-codes", getAllCurrencyCountryCodes);
router.get("/code/:code", getCurrencyByCountryCode);
router.get("/:id", getCurrencyById);

// Admin routes (protected)
router.use(authenticate);
router.post("/", createCurrency);
router.put("/:id", updateCurrency);
router.delete("/:id", deleteCurrency);
router.patch("/:id/toggle-status", toggleCurrencyStatus);

export default router; 