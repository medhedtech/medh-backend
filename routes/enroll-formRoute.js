const express = require("express");
const {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} = require("../controllers/enrollFormController");

const router = express.Router();

router.post("/create", createEnrollment);
router.get("/getAll", getAllEnrollments);
router.get("/get/:id", getEnrollmentById);
router.put("/update/:id", updateEnrollment);
router.delete("/delete/:id", deleteEnrollment);

module.exports = router;
