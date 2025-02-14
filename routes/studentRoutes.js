const express = require("express");
const studentController = require("../controllers/students-controller");

const router = express.Router();

router.post("/create", studentController.createStudent);
router.get("/get", studentController.getAllStudents);
router.get("/get/:id", studentController.getStudentById);
router.post("/update/:id", studentController.updateStudent);
router.post("/toggle-status/:id", studentController.toggleStudentStatus);
router.delete("/delete/:id", studentController.deleteStudent);

module.exports = router;
