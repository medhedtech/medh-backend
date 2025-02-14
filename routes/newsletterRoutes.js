const express = require("express");
const router = express.Router();
const {
  addNewsletter,
  getAllSubscribers,
  deleteSubscriber,
} = require("../controllers/newsletterController");

// Routes
router.post("/add", addNewsletter);
router.get("/getAll", getAllSubscribers);
router.delete("/update/:id", deleteSubscriber);

module.exports = router;
