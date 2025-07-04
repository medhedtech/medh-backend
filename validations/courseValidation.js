import Joi from "joi";
import { body, validationResult } from "express-validator";

/**
 * Validates course data
 * @param {Object} data - Course data to validate
 * @returns {Object} - Validation result
 */
export const validateCourseData = (data) => {
  const schema = Joi.object({
    course_title: Joi.string().required(),
    course_description: Joi.string().required(),
    course_category: Joi.string().required(),
    course_tag: Joi.array().items(Joi.string()),
    course_image: Joi.string().allow("", null),
    course_fee: Joi.number().min(0),
    isFree: Joi.boolean(),
    status: Joi.string().valid("draft", "published", "archived"),
    category_type: Joi.string().allow("", null),
    curriculum: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string().allow("", null),
        sections: Joi.array().items(
          Joi.object({
            title: Joi.string().required(),
            lessons: Joi.array().items(Joi.object()),
          }),
        ),
        lessons: Joi.array().items(Joi.object()),
        liveClasses: Joi.array().items(Joi.object()),
      }),
    ),
    prices: Joi.object().allow(null),
    // Add other fields as needed
  });

  return schema.validate(data);
};

/**
 * Validates video lesson data
 * @param {Object} data - Video lesson data to validate
 * @returns {Object} - Validation result
 */
export const validateVideoLessonData = (data) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow("", null),
    video_url: Joi.string().required(),
    duration: Joi.number().min(0),
    is_free: Joi.boolean(),
    resources: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        url: Joi.string().required(),
        type: Joi.string().valid(
          "pdf",
          "document",
          "spreadsheet",
          "link",
          "image",
          "other",
        ),
      }),
    ),
  });

  return schema.validate(data);
};

/**
 * Validates quiz lesson data
 * @param {Object} data - Quiz lesson data to validate
 * @returns {Object} - Validation result
 */
export const validateQuizLessonData = (data) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow("", null),
    questions: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().required(),
          options: Joi.array().items(Joi.string()).min(2).required(),
          correct_answer: Joi.number().required(),
          explanation: Joi.string().allow("", null),
        }),
      )
      .min(1)
      .required(),
    passing_score: Joi.number().min(0).max(100).required(),
    time_limit: Joi.number().min(0), // in minutes, 0 for no limit
  });

  return schema.validate(data);
};

/**
 * Validate schedule publish request
 */
export const validateSchedulePublish = [
  body("publishDate")
    .notEmpty()
    .withMessage("Publish date is required")
    .isISO8601()
    .withMessage("Publish date must be in ISO 8601 format (YYYY-MM-DD)")
    .custom((value) => {
      const publishDate = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time to start of day for date comparison
      
      if (publishDate < now) {
        throw new Error("Publish date must be today or in the future");
      }
      return true;
    }),
  
  body("publishTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Publish time must be in HH:MM format (24-hour)"),
  
  body("timezone")
    .optional()
    .isString()
    .withMessage("Timezone must be a string")
    .isLength({ min: 1, max: 50 })
    .withMessage("Timezone must be between 1 and 50 characters"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];
