import Joi from "joi";

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
