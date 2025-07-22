import { validateFormByType } from "../../validations/universalFormValidation.js";

/**
 * Universal form validation middleware
 * This middleware validates forms based on their type
 */
export const validateFormSubmission = validateFormByType;

// Export as default for compatibility
export default validateFormSubmission;
