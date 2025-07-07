import { body, param, query, validationResult } from "express-validator";

// Validation middleware to check for validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// Validation rules for creating a certificate master
export const validateCreateCertificateMaster = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Certificate name is required")
    .isIn([
      "Executive Diploma",
      "Professional Grad Diploma",
      "Foundational Certificate",
      "Advanced Certificate",
      "Professional Certificate",
      "Specialist Certificate",
      "Master Certificate",
      "Industry Certificate",
    ])
    .withMessage("Certificate must be one of the predefined certificate types")
    .isLength({ max: 100 })
    .withMessage("Certificate name cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon name cannot exceed 100 characters"),

  body("color")
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  body("metadata.level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "expert", "professional"])
    .withMessage(
      "Level must be one of: beginner, intermediate, advanced, expert, professional",
    ),

  body("metadata.duration")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Duration cannot exceed 50 characters"),

  body("metadata.prerequisites")
    .optional()
    .isArray()
    .withMessage("Prerequisites must be an array"),

  body("metadata.prerequisites.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Prerequisite cannot exceed 200 characters"),

  body("metadata.learningOutcomes")
    .optional()
    .isArray()
    .withMessage("Learning outcomes must be an array"),

  body("metadata.learningOutcomes.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Learning outcome cannot exceed 200 characters"),

  body("metadata.targetAudience")
    .optional()
    .isArray()
    .withMessage("Target audience must be an array"),

  body("metadata.targetAudience.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Target audience item cannot exceed 100 characters"),

  body("metadata.industryRecognition")
    .optional()
    .isBoolean()
    .withMessage("Industry recognition must be a boolean value"),

  body("metadata.accreditation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Accreditation cannot exceed 100 characters"),

  body("certificateInfo.certificateType")
    .optional()
    .isIn([
      "diploma",
      "certificate",
      "professional",
      "specialist",
      "master",
      "industry",
    ])
    .withMessage(
      "Certificate type must be one of: diploma, certificate, professional, specialist, master, industry",
    ),

  body("certificateInfo.validityPeriod")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Validity period cannot exceed 50 characters"),

  body("certificateInfo.renewalRequired")
    .optional()
    .isBoolean()
    .withMessage("Renewal required must be a boolean value"),

  body("certificateInfo.renewalPeriod")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Renewal period cannot exceed 50 characters"),

  body("certificateInfo.issuingAuthority")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Issuing authority cannot exceed 100 characters"),

  body("certificateInfo.digitalBadge")
    .optional()
    .isBoolean()
    .withMessage("Digital badge must be a boolean value"),

  body("certificateInfo.physicalCertificate")
    .optional()
    .isBoolean()
    .withMessage("Physical certificate must be a boolean value"),

  body("certificateInfo.certificateTemplate")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Certificate template cannot exceed 100 characters"),

  body("requirements.minimumCourses")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum courses must be a positive integer"),

  body("requirements.minimumHours")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum hours must be a non-negative integer"),

  body("requirements.minimumScore")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Minimum score must be between 0 and 100"),

  body("requirements.mandatoryCourses")
    .optional()
    .isArray()
    .withMessage("Mandatory courses must be an array"),

  body("requirements.mandatoryCourses.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Mandatory course cannot exceed 200 characters"),

  body("requirements.electiveCourses")
    .optional()
    .isArray()
    .withMessage("Elective courses must be an array"),

  body("requirements.electiveCourses.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Elective course cannot exceed 200 characters"),

  body("requirements.assessmentRequired")
    .optional()
    .isBoolean()
    .withMessage("Assessment required must be a boolean value"),

  body("requirements.projectRequired")
    .optional()
    .isBoolean()
    .withMessage("Project required must be a boolean value"),

  body("pricing.basePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base price must be a non-negative number"),

  body("pricing.currency")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Currency cannot exceed 10 characters"),

  body("pricing.discountAvailable")
    .optional()
    .isBoolean()
    .withMessage("Discount available must be a boolean value"),

  body("pricing.discountPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percentage must be between 0 and 100"),

  body("pricing.installmentAvailable")
    .optional()
    .isBoolean()
    .withMessage("Installment available must be a boolean value"),

  body("pricing.installmentCount")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Installment count must be between 1 and 12"),

  handleValidationErrors,
];

// Validation rules for updating a certificate master
export const validateUpdateCertificateMaster = [
  param("id").isMongoId().withMessage("Invalid certificate ID format"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Certificate name cannot be empty")
    .isIn([
      "Executive Diploma",
      "Professional Grad Diploma",
      "Foundational Certificate",
      "Advanced Certificate",
      "Professional Certificate",
      "Specialist Certificate",
      "Master Certificate",
      "Industry Certificate",
    ])
    .withMessage("Certificate must be one of the predefined certificate types")
    .isLength({ max: 100 })
    .withMessage("Certificate name cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon name cannot exceed 100 characters"),

  body("color")
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  body("metadata.level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "expert", "professional"])
    .withMessage(
      "Level must be one of: beginner, intermediate, advanced, expert, professional",
    ),

  body("metadata.duration")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Duration cannot exceed 50 characters"),

  body("metadata.prerequisites")
    .optional()
    .isArray()
    .withMessage("Prerequisites must be an array"),

  body("metadata.prerequisites.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Prerequisite cannot exceed 200 characters"),

  body("metadata.learningOutcomes")
    .optional()
    .isArray()
    .withMessage("Learning outcomes must be an array"),

  body("metadata.learningOutcomes.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Learning outcome cannot exceed 200 characters"),

  body("metadata.targetAudience")
    .optional()
    .isArray()
    .withMessage("Target audience must be an array"),

  body("metadata.targetAudience.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Target audience item cannot exceed 100 characters"),

  body("metadata.industryRecognition")
    .optional()
    .isBoolean()
    .withMessage("Industry recognition must be a boolean value"),

  body("metadata.accreditation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Accreditation cannot exceed 100 characters"),

  body("certificateInfo.certificateType")
    .optional()
    .isIn([
      "diploma",
      "certificate",
      "professional",
      "specialist",
      "master",
      "industry",
    ])
    .withMessage(
      "Certificate type must be one of: diploma, certificate, professional, specialist, master, industry",
    ),

  body("certificateInfo.validityPeriod")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Validity period cannot exceed 50 characters"),

  body("certificateInfo.renewalRequired")
    .optional()
    .isBoolean()
    .withMessage("Renewal required must be a boolean value"),

  body("certificateInfo.renewalPeriod")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Renewal period cannot exceed 50 characters"),

  body("certificateInfo.issuingAuthority")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Issuing authority cannot exceed 100 characters"),

  body("certificateInfo.digitalBadge")
    .optional()
    .isBoolean()
    .withMessage("Digital badge must be a boolean value"),

  body("certificateInfo.physicalCertificate")
    .optional()
    .isBoolean()
    .withMessage("Physical certificate must be a boolean value"),

  body("certificateInfo.certificateTemplate")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Certificate template cannot exceed 100 characters"),

  body("requirements.minimumCourses")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum courses must be a positive integer"),

  body("requirements.minimumHours")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum hours must be a non-negative integer"),

  body("requirements.minimumScore")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Minimum score must be between 0 and 100"),

  body("requirements.mandatoryCourses")
    .optional()
    .isArray()
    .withMessage("Mandatory courses must be an array"),

  body("requirements.mandatoryCourses.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Mandatory course cannot exceed 200 characters"),

  body("requirements.electiveCourses")
    .optional()
    .isArray()
    .withMessage("Elective courses must be an array"),

  body("requirements.electiveCourses.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Elective course cannot exceed 200 characters"),

  body("requirements.assessmentRequired")
    .optional()
    .isBoolean()
    .withMessage("Assessment required must be a boolean value"),

  body("requirements.projectRequired")
    .optional()
    .isBoolean()
    .withMessage("Project required must be a boolean value"),

  body("pricing.basePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base price must be a non-negative number"),

  body("pricing.currency")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Currency cannot exceed 10 characters"),

  body("pricing.discountAvailable")
    .optional()
    .isBoolean()
    .withMessage("Discount available must be a boolean value"),

  body("pricing.discountPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percentage must be between 0 and 100"),

  body("pricing.installmentAvailable")
    .optional()
    .isBoolean()
    .withMessage("Installment available must be a boolean value"),

  body("pricing.installmentCount")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Installment count must be between 1 and 12"),

  handleValidationErrors,
];

// Validation rules for getting certificate masters
export const validateGetCertificateMasters = [
  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be either 'true' or 'false'"),

  query("level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "expert", "professional"])
    .withMessage(
      "level must be one of: beginner, intermediate, advanced, expert, professional",
    ),

  query("certificateType")
    .optional()
    .isIn([
      "diploma",
      "certificate",
      "professional",
      "specialist",
      "master",
      "industry",
    ])
    .withMessage(
      "certificateType must be one of: diploma, certificate, professional, specialist, master, industry",
    ),

  query("industryRecognition")
    .optional()
    .isIn(["true", "false"])
    .withMessage("industryRecognition must be either 'true' or 'false'"),

  query("sortBy")
    .optional()
    .isIn(["name", "sortOrder", "createdAt", "updatedAt"])
    .withMessage(
      "sortBy must be one of: name, sortOrder, createdAt, updatedAt",
    ),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("order must be either 'asc' or 'desc'"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  handleValidationErrors,
];

// Validation rules for getting a single certificate master
export const validateGetCertificateMasterById = [
  param("id").isMongoId().withMessage("Invalid certificate ID format"),

  handleValidationErrors,
];

// Validation rules for deleting a certificate master
export const validateDeleteCertificateMaster = [
  param("id").isMongoId().withMessage("Invalid certificate ID format"),

  handleValidationErrors,
];

// Validation rules for getting certificate master details
export const validateGetCertificateMasterDetails = [
  param("id").isMongoId().withMessage("Invalid certificate ID format"),

  handleValidationErrors,
];

// Validation rules for getting certificates by level
export const validateGetCertificatesByLevel = [
  param("level")
    .isIn(["beginner", "intermediate", "advanced", "expert", "professional"])
    .withMessage(
      "Certificate level must be one of: beginner, intermediate, advanced, expert, professional",
    ),

  handleValidationErrors,
];

// Validation rules for getting certificates by type
export const validateGetCertificatesByType = [
  param("type")
    .isIn([
      "diploma",
      "certificate",
      "professional",
      "specialist",
      "master",
      "industry",
    ])
    .withMessage(
      "Certificate type must be one of: diploma, certificate, professional, specialist, master, industry",
    ),

  handleValidationErrors,
];
