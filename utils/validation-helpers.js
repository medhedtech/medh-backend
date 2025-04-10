import mongoose from 'mongoose';

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The id to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validates if the request body for a course is properly formatted
 * @param {object} courseData - The course data to validate
 * @returns {object} Object containing validation result and errors if any
 */
export const validateCourseData = (courseData) => {
  const errors = {};
  const requiredFields = [
    'course_title',
    'course_category',
    'category_type',
    'course_image',
    'is_Certification',
    'is_Assignments',
    'is_Projects',
    'is_Quizes'
  ];

  // Check required fields
  requiredFields.forEach(field => {
    if (!courseData[field]) {
      errors[field] = `${field.replace(/_/g, ' ')} is required`;
    }
  });

  // Validate course_fee for free courses
  if (courseData.category_type === 'Free' && courseData.course_fee !== 0) {
    errors.course_fee = 'Course fee must be 0 for free courses';
  }

  // Validate prices if provided
  if (courseData.prices && Array.isArray(courseData.prices)) {
    const currencyCodes = new Set();
    
    courseData.prices.forEach((price, index) => {
      if (!price.currency) {
        errors[`prices[${index}].currency`] = 'Currency is required for each price';
      } else if (currencyCodes.has(price.currency)) {
        errors[`prices[${index}].currency`] = 'Duplicate currency code';
      } else {
        currencyCodes.add(price.currency);
      }

      if (price.individual < 0) {
        errors[`prices[${index}].individual`] = 'Individual price cannot be negative';
      }

      if (price.batch < 0) {
        errors[`prices[${index}].batch`] = 'Batch price cannot be negative';
      }

      if (price.min_batch_size && price.max_batch_size && price.min_batch_size > price.max_batch_size) {
        errors[`prices[${index}].batch_size`] = 'Min batch size cannot be greater than max batch size';
      }
    });
  }

  // Validate curriculum if provided
  if (courseData.curriculum && Array.isArray(courseData.curriculum)) {
    courseData.curriculum.forEach((week, index) => {
      if (!week.weekTitle) {
        errors[`curriculum[${index}].weekTitle`] = 'Week title is required';
      }
      
      if (!week.weekDescription) {
        errors[`curriculum[${index}].weekDescription`] = 'Week description is required';
      }
    });
  }

  // Validate tools_technologies if provided
  if (courseData.tools_technologies && Array.isArray(courseData.tools_technologies)) {
    courseData.tools_technologies.forEach((tool, index) => {
      if (!tool.name) {
        errors[`tools_technologies[${index}].name`] = 'Tool name is required';
      }
    });
  }

  // Validate bonus_modules if provided
  if (courseData.bonus_modules && Array.isArray(courseData.bonus_modules)) {
    courseData.bonus_modules.forEach((module, index) => {
      if (!module.title) {
        errors[`bonus_modules[${index}].title`] = 'Module title is required';
      }
    });
  }

  // Validate FAQs if provided
  if (courseData.faqs && Array.isArray(courseData.faqs)) {
    courseData.faqs.forEach((faq, index) => {
      if (!faq.question) {
        errors[`faqs[${index}].question`] = 'FAQ question is required';
      }
      
      if (!faq.answer) {
        errors[`faqs[${index}].answer`] = 'FAQ answer is required';
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitizes course data by trimming string values and setting defaults
 * @param {object} courseData - The course data to sanitize
 * @returns {object} Sanitized course data
 */
export const sanitizeCourseData = (courseData) => {
  const sanitized = { ...courseData };
  
  // Trim string fields
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitized[key].trim();
    }
  });
  
  // Set default values for certain fields
  if (sanitized.category_type === 'Free') {
    sanitized.isFree = true;
    sanitized.course_fee = 0;
    sanitized.course_tag = 'Free';
  }
  
  return sanitized;
}; 