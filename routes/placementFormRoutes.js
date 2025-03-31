const express = require("express");
const {
  getAllPlacementForms,
  getPlacementFormById,
  createPlacementForm,
  updatePlacementForm,
  deletePlacementForm,
  updateApplicationStatus,
  bulkUpdateCourseFees
} = require("../controllers/placementFormController");

const router = express.Router();

// Route for retrieving all placement forms
router.get("/", getAllPlacementForms);

// Route for retrieving a single placement form by ID
router.get("/:id", getPlacementFormById);

// Route for creating a new placement form
router.post("/", createPlacementForm);

// Route for updating a placement form
router.put("/:id", updatePlacementForm);

// Route for deleting a placement form
router.delete("/:id", deletePlacementForm);

// Route for updating application status
router.patch("/:id/status", updateApplicationStatus);

// Route for bulk updating course fees
router.post("/bulk-update-fees", bulkUpdateCourseFees);

module.exports = router; 