const express = require("express");
const router = express.Router();
const {
  createJobForm,
  getAllJobForms,
  getJobFormById,
  updateJobForm,
  deleteJobForm,
} = require("../controllers/jobController");

router.post("/create", createJobForm);
router.get("/getAll", getAllJobForms);
router.get("/get/:id", getJobFormById);
router.put("/update/:id", updateJobForm);
router.delete("/delete/:id", deleteJobForm);

module.exports = router;
