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

// Validation rules for creating a grade
export const validateCreateGrade = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Grade name is required")
    .isIn([
      "Preschool",
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "UG - Graduate - Professionals",
    ])
    .withMessage("Grade must be one of the predefined grade levels")
    .isLength({ max: 50 })
    .withMessage("Grade name cannot exceed 50 characters"),

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

  body("metadata.ageRange.min")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Minimum age must be between 0 and 150"),

  body("metadata.ageRange.max")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Maximum age must be between 0 and 150")
    .custom((value, { req }) => {
      const minAge = req.body.metadata?.ageRange?.min;
      if (minAge && value <= minAge) {
        throw new Error("Maximum age must be greater than minimum age");
      }
      return true;
    }),

  body("metadata.difficultyLevel")
    .optional()
    .isIn(["beginner", "elementary", "intermediate", "advanced", "expert"])
    .withMessage(
      "Difficulty level must be one of: beginner, elementary, intermediate, advanced, expert",
    ),

  body("metadata.subjectAreas")
    .optional()
    .isArray()
    .withMessage("Subject areas must be an array"),

  body("metadata.subjectAreas.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Subject area cannot exceed 100 characters"),

  body("metadata.learningObjectives")
    .optional()
    .isArray()
    .withMessage("Learning objectives must be an array"),

  body("metadata.learningObjectives.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Learning objective cannot exceed 200 characters"),

  body("metadata.prerequisites")
    .optional()
    .isArray()
    .withMessage("Prerequisites must be an array"),

  body("metadata.prerequisites.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Prerequisite cannot exceed 200 characters"),

  body("academicInfo.gradeLevel")
    .optional()
    .isIn(["preschool", "primary", "middle", "high", "university"])
    .withMessage(
      "Academic grade level must be one of: preschool, primary, middle, high, university",
    ),

  body("academicInfo.typicalAge.min")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Minimum typical age must be between 0 and 150"),

  body("academicInfo.typicalAge.max")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Maximum typical age must be between 0 and 150")
    .custom((value, { req }) => {
      const minAge = req.body.academicInfo?.typicalAge?.min;
      if (minAge && value <= minAge) {
        throw new Error(
          "Maximum typical age must be greater than minimum typical age",
        );
      }
      return true;
    }),

  body("academicInfo.curriculumStandards")
    .optional()
    .isArray()
    .withMessage("Curriculum standards must be an array"),

  body("academicInfo.curriculumStandards.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Curriculum standard cannot exceed 100 characters"),

  body("academicInfo.keySkills")
    .optional()
    .isArray()
    .withMessage("Key skills must be an array"),

  body("academicInfo.keySkills.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Key skill cannot exceed 100 characters"),

  handleValidationErrors,
];

// Validation rules for updating a grade
export const validateUpdateGrade = [
  param("id").isMongoId().withMessage("Invalid grade ID format"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Grade name cannot be empty")
    .isIn([
      "Preschool",
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "UG - Graduate - Professionals",
    ])
    .withMessage("Grade must be one of the predefined grade levels")
    .isLength({ max: 50 })
    .withMessage("Grade name cannot exceed 50 characters"),

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

  body("metadata.ageRange.min")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Minimum age must be between 0 and 150"),

  body("metadata.ageRange.max")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Maximum age must be between 0 and 150")
    .custom((value, { req }) => {
      const minAge = req.body.metadata?.ageRange?.min;
      if (minAge && value <= minAge) {
        throw new Error("Maximum age must be greater than minimum age");
      }
      return true;
    }),

  body("metadata.difficultyLevel")
    .optional()
    .isIn(["beginner", "elementary", "intermediate", "advanced", "expert"])
    .withMessage(
      "Difficulty level must be one of: beginner, elementary, intermediate, advanced, expert",
    ),

  body("metadata.subjectAreas")
    .optional()
    .isArray()
    .withMessage("Subject areas must be an array"),

  body("metadata.subjectAreas.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Subject area cannot exceed 100 characters"),

  body("metadata.learningObjectives")
    .optional()
    .isArray()
    .withMessage("Learning objectives must be an array"),

  body("metadata.learningObjectives.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Learning objective cannot exceed 200 characters"),

  body("metadata.prerequisites")
    .optional()
    .isArray()
    .withMessage("Prerequisites must be an array"),

  body("metadata.prerequisites.*")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Prerequisite cannot exceed 200 characters"),

  body("academicInfo.gradeLevel")
    .optional()
    .isIn(["preschool", "primary", "middle", "high", "university"])
    .withMessage(
      "Academic grade level must be one of: preschool, primary, middle, high, university",
    ),

  body("academicInfo.typicalAge.min")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Minimum typical age must be between 0 and 150"),

  body("academicInfo.typicalAge.max")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Maximum typical age must be between 0 and 150")
    .custom((value, { req }) => {
      const minAge = req.body.academicInfo?.typicalAge?.min;
      if (minAge && value <= minAge) {
        throw new Error(
          "Maximum typical age must be greater than minimum typical age",
        );
      }
      return true;
    }),

  body("academicInfo.curriculumStandards")
    .optional()
    .isArray()
    .withMessage("Curriculum standards must be an array"),

  body("academicInfo.curriculumStandards.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Curriculum standard cannot exceed 100 characters"),

  body("academicInfo.keySkills")
    .optional()
    .isArray()
    .withMessage("Key skills must be an array"),

  body("academicInfo.keySkills.*")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Key skill cannot exceed 100 characters"),

  handleValidationErrors,
];

// Validation rules for getting grades
export const validateGetGrades = [
  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be either 'true' or 'false'"),

  query("academicLevel")
    .optional()
    .isIn(["preschool", "primary", "middle", "high", "university"])
    .withMessage(
      "academicLevel must be one of: preschool, primary, middle, high, university",
    ),

  query("difficulty")
    .optional()
    .isIn(["beginner", "elementary", "intermediate", "advanced", "expert"])
    .withMessage(
      "difficulty must be one of: beginner, elementary, intermediate, advanced, expert",
    ),

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

// Validation rules for getting a single grade
export const validateGetGradeById = [
  param("id").isMongoId().withMessage("Invalid grade ID format"),

  handleValidationErrors,
];

// Validation rules for deleting a grade
export const validateDeleteGrade = [
  param("id").isMongoId().withMessage("Invalid grade ID format"),

  handleValidationErrors,
];

// Validation rules for getting grade details
export const validateGetGradeDetails = [
  param("id").isMongoId().withMessage("Invalid grade ID format"),

  handleValidationErrors,
];

// Validation rules for getting grades by academic level
export const validateGetGradesByAcademicLevel = [
  param("level")
    .isIn(["preschool", "primary", "middle", "high", "university"])
    .withMessage(
      "Academic level must be one of: preschool, primary, middle, high, university",
    ),

  handleValidationErrors,
];

// Validation rules for getting grades by difficulty
export const validateGetGradesByDifficulty = [
  param("difficulty")
    .isIn(["beginner", "elementary", "intermediate", "advanced", "expert"])
    .withMessage(
      "Difficulty level must be one of: beginner, elementary, intermediate, advanced, expert",
    ),

  handleValidationErrors,
];
