import { body } from "express-validator";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import countryService from "../../utils/countryService.js";

/**
 * Validation middleware for Corporate Training Inquiry Form
 * Matches the frontend form structure and requirements
 */

// Custom phone number validator
const validatePhoneNumber = (value) => {
  if (typeof value === "string") {
    // Handle string format like "+919876543210"
    try {
      return isValidPhoneNumber(value);
    } catch (error) {
      return false;
    }
  } else if (typeof value === "object" && value.country && value.number) {
    // Handle object format like { country: "91", number: "9876543210" }
    try {
      const fullNumber = `+${value.country}${value.number}`;
      return isValidPhoneNumber(fullNumber);
    } catch (error) {
      return false;
    }
  }
  return false;
};

// Custom country validator
const validateCountry = (value) => {
  if (!value) return false;
  return (
    countryService.isValidCountryCode(value) ||
    countryService.isValidCountryName(value)
  );
};

export const validateCorporateTrainingForm = [
  // Step 1: Contact Information
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Full name can only contain alphabets, spaces, hyphens, and apostrophes",
    ),

  body("email")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage("Please enter a valid business email address")
    .normalizeEmail(),

  body("country")
    .optional()
    .custom(validateCountry)
    .withMessage("Please select a valid country"),

  body("phone_number")
    .custom(validatePhoneNumber)
    .withMessage("Please enter a valid phone number"),

  // Step 2: Organization Details
  body("designation")
    .trim()
    .notEmpty()
    .withMessage("Job designation is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Designation must be between 2 and 100 characters"),

  body("company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ min: 2, max: 150 })
    .withMessage("Company name must be between 2 and 150 characters"),

  body("company_website")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(
      /^(https?:\/\/)?(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+([\/\w\.-]*)*\/?$/,
    )
    .withMessage("Please enter a valid company website URL"),

  // Step 3: Training Requirements
  body("training_requirements")
    .trim()
    .notEmpty()
    .withMessage("Training requirements are required")
    .isLength({ min: 20, max: 2000 })
    .withMessage(
      "Please provide at least 20 characters describing your training requirements (max 2000 characters)",
    ),

  body("terms_accepted")
    .notEmpty()
    .withMessage("You must accept the terms and privacy policy")
    .equals("true")
    .withMessage("You must accept the terms and privacy policy to proceed")
    .toBoolean(),

  // Optional advanced fields
  body("company_size")
    .optional()
    .isIn(["1-10", "11-50", "51-200", "201-500", "500+"])
    .withMessage("Please select a valid company size"),

  body("industry")
    .optional()
    .isIn([
      "technology",
      "healthcare",
      "finance",
      "education",
      "manufacturing",
      "retail",
      "consulting",
      "government",
      "non_profit",
      "other",
    ])
    .withMessage("Please select a valid industry"),

  body("training_type")
    .optional()
    .isIn([
      "technical_skills",
      "soft_skills",
      "leadership",
      "compliance",
      "product_training",
      "sales_training",
      "customer_service",
      "digital_transformation",
      "other",
    ])
    .withMessage("Please select a valid training type"),

  body("training_mode")
    .optional()
    .isIn(["online", "onsite", "hybrid", "flexible"])
    .withMessage("Please select a valid training mode"),

  body("participants_count")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Number of participants must be between 1 and 10,000")
    .toInt(),

  body("duration_preference")
    .optional()
    .isIn(["1_day", "2-3_days", "1_week", "2-4_weeks", "1-3_months", "ongoing"])
    .withMessage("Please select a valid duration preference"),

  body("budget_range")
    .optional()
    .isIn([
      "under_1l",
      "1l_5l",
      "5l_10l",
      "10l_25l",
      "25l_50l",
      "50l_plus",
      "not_disclosed",
    ])
    .withMessage("Please select a valid budget range"),

  body("timeline")
    .optional()
    .isIn([
      "immediate",
      "within_month",
      "within_quarter",
      "within_6months",
      "flexible",
    ])
    .withMessage("Please select a valid timeline"),

  body("specific_skills")
    .optional()
    .isArray()
    .withMessage("Specific skills must be an array"),

  body("specific_skills.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each skill must be between 1 and 100 characters"),
];

// Validation for the legacy format (if needed)
export const validateLegacyCorporateForm = [
  body("contact_info.full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("contact_info.email")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),

  body("professional_info.designation")
    .trim()
    .notEmpty()
    .withMessage("Designation is required"),

  body("professional_info.company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Training requirements are required")
    .isLength({ min: 20 })
    .withMessage(
      "Please provide at least 20 characters describing your training requirements",
    ),

  body("accept")
    .equals("true")
    .withMessage("You must accept the terms and privacy policy")
    .toBoolean(),
];

export default {
  validateCorporateTrainingForm,
  validateLegacyCorporateForm,
};
