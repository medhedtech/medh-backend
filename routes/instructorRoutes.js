const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructor-controller");

router.post("/create", instructorController.createInstructor);
router.get("/get", instructorController.getAllInstructors);
router.get("/get/:id", instructorController.getInstructorById);
router.post("/update/:id", instructorController.updateInstructor);
router.post("/toggle-status/:id", instructorController.toggleInstructorStatus);
router.delete("/delete/:id", instructorController.deleteInstructor);

module.exports = router;
