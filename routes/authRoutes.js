const express = require("express");
const {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  updateUserByEmail,
  toggleStudentStatus,
  forgotPassword,
  resetPassword,
  verifyTemporaryPassword,
  sendEmail,
} = require("../controllers/authController");
const instructorController = require("../controllers/instructor-controller");
const corporateController = require("../controllers/corporateController");
const corporateStudentController = require("../controllers/coorporate-student-controller");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/get-all", getAllUsers);
router.get("/get/:id", getUserById);
router.post("/toggle-status/:id", toggleStudentStatus);
router.post("/forgot-password", forgotPassword);
router.post("/verify-temp-password", verifyTemporaryPassword);
router.post("/reset-password", resetPassword);
router.post("/update-by-email", updateUserByEmail);
router.post("/update/:id", updateUser);
router.delete("/delete/:id", deleteUser);

router.post("/create", instructorController.createInstructor);
router.get("/get-all-instructors", instructorController.getAllInstructors);
router.get("/get-all-instrucors", instructorController.getAllInstructors);
router.get("/get-instructor/:id", instructorController.getInstructorById);
router.post("/updateInstrucor/:id", instructorController.updateInstructor);
router.post(
  "/toggle-status-instrucor/:id",
  instructorController.toggleInstructorStatus
);
router.delete("/delete-instrucor/:id", instructorController.deleteInstructor);

router.post("/add", corporateController.createCorporate);
router.get("/get-all-coorporates", corporateController.getAllCorporateUsers);
router.get("/get-coorporate/:id", corporateController.getCorporateById);
router.post("/update-coorporate/:id", corporateController.updateCorporate);
router.post(
  "/toggle-coorporate-status/:id",
  corporateController.toggleCorporateStatus
);
router.delete("/delete-coorporate/:id", corporateController.deleteCorporate);

router.post(
  "/add-coorporate-student",
  corporateStudentController.createCorporateStudent
);
router.get(
  "/get-all-coorporate-students",
  corporateStudentController.getAllCorporateStudents
);
router.get(
  "/get-coorporate-student/:id",
  corporateStudentController.getCorporateStudentById
);
router.post(
  "/update-coorporate-student/:id",
  corporateStudentController.updateCorporateStudent
);
router.post(
  "/toggle-coorporate-student-status/:id",
  corporateStudentController.toggleCorporateStudentStatus
);
router.delete(
  "/delete-coorporate-student/:id",
  corporateStudentController.deleteCorporateStudent
);

router.post("/test-email", async (req, res) => {
  try {
    const mailOptions = {
      from: `"Medh Care" <care@medh.co>`,
      to: "care@medh.co",
      subject: "Test Email",
      html: "<p>This is a test email to verify the email configuration.</p>"
    };

    await sendEmail(mailOptions);
    res.status(200).json({
      success: true,
      message: "Test email sent successfully"
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message
    });
  }
});

module.exports = router;
