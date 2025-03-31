const express = require("express");
const router = express.Router();
const {
  createCurrency,
  getAllCurrencies,
  getCurrencyById,
  updateCurrency,
  deleteCurrency,
  toggleCurrencyStatus,
  getCurrencyByCountryCode
} = require("../controllers/currency-controller");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getAllCurrencies);
router.get("/code/:code", getCurrencyByCountryCode);
router.get("/:id", getCurrencyById);

// Admin routes (protected)
router.use(authenticate);
router.post("/", createCurrency);
router.put("/:id", updateCurrency);
router.delete("/:id", deleteCurrency);
router.patch("/:id/toggle-status", toggleCurrencyStatus);

module.exports = router; 