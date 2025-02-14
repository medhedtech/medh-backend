const express = require("express");
const {
  createFAQ,
  updateFAQ,
  getAllFAQs,
  getFAQById,
  deleteFAQ,
} = require("../controllers/freq-questions-controller");

const router = express.Router();

// Route to create a new FAQ
router.post("/create", createFAQ);
router.post("/update/:id", updateFAQ);
router.get("/get", getAllFAQs);
router.get("/get/:id", getFAQById);
router.delete("/delete/:id", deleteFAQ);

module.exports = router;
