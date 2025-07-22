import express from "express";
import { body } from "express-validator";
import {
  submitForm,
  getAllForms,
  getFormById,
  getFormByFormId,
  updateForm,
  assignForm,
  addInternalNote,
  deleteForm,
  getFormsByType,
  getPendingForms,
  getFormAnalytics,
  exportForms,
  submitCareerApplication,
  submitPartnershipInquiry,
  submitEducatorApplication,
  submitContactForm,
  submitCorporateTraining,
  getAutoFillData,
  getCountries,
  getLiveCourses,
} from "../controllers/universalFormController.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateFormSubmission } from "../middleware/validators/universalFormValidator.js";
import { validateCorporateTrainingForm } from "../middleware/validators/corporateTrainingValidator.js";

const router = express.Router();

// Public routes
router.get("/countries", getCountries);
router.get("/countries/search", getCountries); // Same endpoint with search support
router.get("/countries/popular", (req, res, next) => {
  req.query.popular = "true";
  getCountries(req, res, next);
});
router.get("/countries/phone-codes", (req, res, next) => {
  req.query.format = "phone";
  getCountries(req, res, next);
});
router.get("/live-courses", getLiveCourses);
router.post("/submit", submitForm);
router.post(
  "/corporate-training",
  validateCorporateTrainingForm,
  submitCorporateTraining,
);
router.get("/lookup/:formId", getFormByFormId);

// Auto-fill route (requires authentication)
router.get("/auto-fill", authenticateToken, getAutoFillData);

// Specific form submission routes
router.post(
  "/career-application",
  [
    body("contact_info.full_name")
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("contact_info.email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("contact_info.phone_number")
      .notEmpty()
      .withMessage("Phone number is required")
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("post_applying_for")
      .notEmpty()
      .withMessage("Position applying for is required"),
    body("employment_info.has_work_experience")
      .isBoolean()
      .withMessage("Work experience status is required"),
    body("employment_info.work_location_preference")
      .isIn(["wfh", "wfo", "hybrid"])
      .withMessage("Work location preference must be wfh, wfo, or hybrid"),
    body("files.resume_url")
      .optional()
      .isURL()
      .withMessage("Please provide a valid resume URL"),
    body("message")
      .notEmpty()
      .withMessage("Message is required")
      .isLength({ min: 20, max: 2000 })
      .withMessage("Message must be between 20 and 2000 characters"),
    body("terms_accepted")
      .equals("true")
      .withMessage("Terms and conditions must be accepted"),
    body("privacy_policy_accepted")
      .equals("true")
      .withMessage("Privacy policy must be accepted"),
  ],
  submitCareerApplication,
);

router.post(
  "/partnership-inquiry",
  [
    body("contact_info.full_name")
      .notEmpty()
      .withMessage("Representative name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
    body("contact_info.email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("contact_info.phone_number")
      .notEmpty()
      .withMessage("Phone number is required")
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("school_info.school_name")
      .notEmpty()
      .withMessage("Institution name is required")
      .isLength({ min: 2, max: 200 })
      .withMessage("Institution name must be between 2 and 200 characters"),
    body("school_info.school_type")
      .isIn(["CBSE", "ICSE", "IB", "State Board", "International", "Other"])
      .withMessage("Please select a valid institution type"),
    body("school_info.city_state")
      .notEmpty()
      .withMessage("City/State is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("City/State must be between 2 and 100 characters"),
    body("school_info.student_count")
      .isIn(["1-50", "51-100", "101-300", "301-500", "501-1000", "1000+"])
      .withMessage("Please select a valid student count range"),
    body("partnership_info.services_of_interest")
      .isArray({ min: 1 })
      .withMessage("Please select at least one service of interest"),
    body("message")
      .notEmpty()
      .withMessage("Message is required")
      .isLength({ min: 20, max: 2000 })
      .withMessage("Message must be between 20 and 2000 characters"),
    body("terms_accepted")
      .equals("true")
      .withMessage("Terms and conditions must be accepted"),
    body("privacy_policy_accepted")
      .equals("true")
      .withMessage("Privacy policy must be accepted"),
  ],
  submitPartnershipInquiry,
);

router.post(
  "/educator-application",
  [
    body("contact_info.full_name")
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("contact_info.email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("contact_info.phone_number")
      .notEmpty()
      .withMessage("Phone number is required")
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("subject_areas.primary_subjects")
      .isArray({ min: 1 })
      .withMessage("Please select at least one subject area"),
    body("subject_areas.grade_levels")
      .isArray({ min: 1 })
      .withMessage("Please select at least one grade level"),
    body("preferred_teaching_mode")
      .isIn(["in_person_only", "remote_only", "hybrid", "flexible"])
      .withMessage("Please select a valid teaching mode preference"),
    body("availability.hours_per_week")
      .isIn(["less_than_5", "5_to_10", "11_to_20", "21_to_30", "more_than_30"])
      .withMessage("Please select your available hours per week"),
    body("it_assets.has_desktop_laptop")
      .isBoolean()
      .withMessage("Desktop/laptop availability is required"),
    body("it_assets.has_webcam")
      .isBoolean()
      .withMessage("Webcam availability is required"),
    body("it_assets.has_headphone_mic")
      .isBoolean()
      .withMessage("Headphone/mic availability is required"),
    body("it_assets.internet_connection_quality")
      .isIn(["excellent", "good", "average", "poor"])
      .withMessage("Please specify your internet connection quality"),
    body("terms_accepted")
      .equals("true")
      .withMessage("Terms and conditions must be accepted"),
    body("privacy_policy_accepted")
      .equals("true")
      .withMessage("Privacy policy must be accepted"),
  ],
  submitEducatorApplication,
);

router.post(
  "/contact-us",
  [
    body("contact_info.full_name")
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("contact_info.email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("contact_info.phone_number")
      .optional()
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("subject")
      .notEmpty()
      .withMessage("Subject is required")
      .isLength({ min: 5, max: 200 })
      .withMessage("Subject must be between 5 and 200 characters"),
    body("message")
      .notEmpty()
      .withMessage("Message is required")
      .isLength({ min: 10, max: 2000 })
      .withMessage("Message must be between 10 and 2000 characters"),
    body("terms_accepted")
      .equals("true")
      .withMessage("Terms and conditions must be accepted"),
    body("privacy_policy_accepted")
      .equals("true")
      .withMessage("Privacy policy must be accepted"),
  ],
  submitContactForm,
);

// Admin routes (require authentication)
router.use(authenticateToken);
router.get("/", getAllForms);
router.get("/analytics", getFormAnalytics);
router.get("/pending", getPendingForms);
router.get("/export", exportForms);
router.get("/type/:formType", getFormsByType);
router.get("/:id", getFormById);
router.put("/:id", updateForm);
router.put("/:id/assign", assignForm);
router.post("/:id/notes", addInternalNote);
router.delete("/:id", deleteForm);

export default router;
