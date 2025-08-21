import { body, param, query } from "express-validator";
import User from "../models/user-modal.js";

// Validation for user ID parameter
export const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

// Validation for profile update
export const validateProfileUpdate = [
  // Basic Information
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),

  // Contact Information
  body('phone_numbers')
    .optional()
    .isArray()
    .withMessage('Phone numbers must be an array'),

  body('phone_numbers.*.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2-3 characters'),

  body('phone_numbers.*.number')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),

  // Profile Information
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),

  body('age_group')
    .optional()
    .isIn(['teen', 'young-adult', 'adult', 'senior'])
    .withMessage('Invalid age group'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),

  body('organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name must be less than 200 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),

  // Profile Media
  body('user_image.url')
    .optional()
    .isURL()
    .withMessage('User image URL must be valid'),

  body('user_image.alt_text')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Alt text must be less than 200 characters'),

  body('cover_image.url')
    .optional()
    .isURL()
    .withMessage('Cover image URL must be valid'),

  body('cover_image.alt_text')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Alt text must be less than 200 characters'),

  // Social Profiles
  body('facebook_link')
    .optional()
    .matches(/^https?:\/\/(?:www\.)?facebook\.com\/.+/i)
    .withMessage('Invalid Facebook URL'),

  body('instagram_link')
    .optional()
    .matches(/^https?:\/\/(?:www\.)?instagram\.com\/.+/i)
    .withMessage('Invalid Instagram URL'),

  body('linkedin_link')
    .optional()
    .matches(/^https?:\/\/(?:www\.)?linkedin\.com\/.+/i)
    .withMessage('Invalid LinkedIn URL'),

  body('twitter_link')
    .optional()
    .matches(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/i)
    .withMessage('Invalid Twitter/X URL'),

  body('youtube_link')
    .optional()
    .matches(/^https?:\/\/(?:www\.)?youtube\.com\/.+/i)
    .withMessage('Invalid YouTube URL'),

  body('github_link')
    .optional()
    .matches(/^https?:\/\/(?:www\.)?github\.com\/.+/i)
    .withMessage('Invalid GitHub URL'),

  body('portfolio_link')
    .optional()
    .isURL()
    .withMessage('Invalid portfolio URL'),

  // Location
  body('country')
    .optional()
    .trim()
    .matches(/^[A-Za-z\s]{2,50}$/)
    .withMessage('Invalid country format'),

  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid timezone format'),

  // Account Management (Admin only fields)
  body('role')
    .optional()
    .isIn(['admin', 'student', 'instructor', 'corporate', 'corporate-student', 'parent'])
    .withMessage('Invalid role'),

  body('admin_role')
    .optional()
    .isIn(['super-admin', 'admin', 'corporate-admin'])
    .withMessage('Invalid admin role'),

  body('account_type')
    .optional()
    .isIn(['free', 'premium', 'enterprise', 'instructor', 'admin'])
    .withMessage('Invalid account type'),

  body('subscription_status')
    .optional()
    .isIn(['active', 'inactive', 'cancelled', 'suspended', 'trial'])
    .withMessage('Invalid subscription status'),

  // Status fields
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),

  body('is_banned')
    .optional()
    .isBoolean()
    .withMessage('is_banned must be a boolean'),

  body('ban_reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Ban reason must be less than 500 characters'),

  // Verification fields
  body('email_verified')
    .optional()
    .isBoolean()
    .withMessage('email_verified must be a boolean'),

  body('phone_verified')
    .optional()
    .isBoolean()
    .withMessage('phone_verified must be a boolean'),

  body('identity_verified')
    .optional()
    .isBoolean()
    .withMessage('identity_verified must be a boolean'),

  // Meta information validation
  body('meta.date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('meta.gender')
    .optional()
    .isIn(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'])
    .withMessage('Invalid gender'),

  body('meta.nationality')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nationality must be less than 100 characters'),

  body('meta.occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation must be less than 100 characters'),

  body('meta.industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters'),

  body('meta.company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name must be less than 200 characters'),

  body('meta.experience_level')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'executive', 'student', 'other'])
    .withMessage('Invalid experience level'),

  body('meta.annual_income_range')
    .optional()
    .isIn(['under-25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', '150k-plus', 'prefer-not-to-say'])
    .withMessage('Invalid income range'),

  body('meta.education_level')
    .optional()
    .isIn(['High School', 'Diploma', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate/PhD', 'Professional Certificate', 'Other'])
    .withMessage('Invalid education level'),

  body('meta.institution_name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Institution name must be less than 200 characters'),

  body('meta.field_of_study')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Field of study must be less than 200 characters'),

  body('meta.graduation_year')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() + 10 })
    .withMessage('Invalid graduation year'),

  body('meta.skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),

  body('meta.skills.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each skill must be between 1 and 50 characters'),

  // Real-time features
  body('status_message')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Status message cannot exceed 100 characters'),

  body('activity_status')
    .optional()
    .isIn(['online', 'away', 'busy', 'invisible'])
    .withMessage('Invalid activity status')
];

// Validation for preferences update
export const validatePreferencesUpdate = [
  // Theme preferences
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto', 'high_contrast'])
    .withMessage('Invalid theme'),

  body('language')
    .optional()
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Invalid language code format'),

  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Invalid currency code format'),

  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid timezone'),

  // Notification preferences
  body('notifications.email.marketing')
    .optional()
    .isBoolean()
    .withMessage('Marketing email preference must be boolean'),

  body('notifications.email.course_updates')
    .optional()
    .isBoolean()
    .withMessage('Course updates email preference must be boolean'),

  body('notifications.email.system_alerts')
    .optional()
    .isBoolean()
    .withMessage('System alerts email preference must be boolean'),

  body('notifications.email.weekly_summary')
    .optional()
    .isBoolean()
    .withMessage('Weekly summary email preference must be boolean'),

  body('notifications.email.achievement_unlocked')
    .optional()
    .isBoolean()
    .withMessage('Achievement email preference must be boolean'),

  body('notifications.push.enabled')
    .optional()
    .isBoolean()
    .withMessage('Push notifications enabled must be boolean'),

  body('notifications.push.marketing')
    .optional()
    .isBoolean()
    .withMessage('Push marketing preference must be boolean'),

  body('notifications.push.course_reminders')
    .optional()
    .isBoolean()
    .withMessage('Course reminders preference must be boolean'),

  body('notifications.push.live_sessions')
    .optional()
    .isBoolean()
    .withMessage('Live sessions preference must be boolean'),

  body('notifications.push.community_activity')
    .optional()
    .isBoolean()
    .withMessage('Community activity preference must be boolean'),

  body('notifications.sms.enabled')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications enabled must be boolean'),

  body('notifications.sms.security_alerts')
    .optional()
    .isBoolean()
    .withMessage('SMS security alerts preference must be boolean'),

  body('notifications.sms.urgent_only')
    .optional()
    .isBoolean()
    .withMessage('SMS urgent only preference must be boolean'),

  // Privacy preferences
  body('privacy.profile_visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid profile visibility setting'),

  body('privacy.activity_tracking')
    .optional()
    .isBoolean()
    .withMessage('Activity tracking preference must be boolean'),

  body('privacy.data_analytics')
    .optional()
    .isBoolean()
    .withMessage('Data analytics preference must be boolean'),

  body('privacy.third_party_sharing')
    .optional()
    .isBoolean()
    .withMessage('Third party sharing preference must be boolean'),

  body('privacy.marketing_emails')
    .optional()
    .isBoolean()
    .withMessage('Marketing emails preference must be boolean'),

  // Accessibility preferences
  body('accessibility.screen_reader')
    .optional()
    .isBoolean()
    .withMessage('Screen reader preference must be boolean'),

  body('accessibility.high_contrast')
    .optional()
    .isBoolean()
    .withMessage('High contrast preference must be boolean'),

  body('accessibility.large_text')
    .optional()
    .isBoolean()
    .withMessage('Large text preference must be boolean'),

  body('accessibility.keyboard_navigation')
    .optional()
    .isBoolean()
    .withMessage('Keyboard navigation preference must be boolean'),

  body('accessibility.reduced_motion')
    .optional()
    .isBoolean()
    .withMessage('Reduced motion preference must be boolean'),

  // Content preferences
  body('content.autoplay_videos')
    .optional()
    .isBoolean()
    .withMessage('Autoplay videos preference must be boolean'),

  body('content.subtitles_default')
    .optional()
    .isBoolean()
    .withMessage('Subtitles default preference must be boolean'),

  body('content.preferred_video_quality')
    .optional()
    .isIn(['auto', '480p', '720p', '1080p'])
    .withMessage('Invalid video quality preference'),

  body('content.content_maturity')
    .optional()
    .isIn(['all', 'teen', 'mature'])
    .withMessage('Invalid content maturity preference')
];

// Validation for delete profile
export const validateDeleteProfile = [
  query('permanent')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Permanent parameter must be true or false')
];

// Comprehensive validation for profile update (all fields except email and protected fields)
export const validateComprehensiveProfileUpdate = [
  // Basic Information (editable)
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),

  // Contact Information
  body('phone_numbers')
    .optional()
    .isArray()
    .withMessage('Phone numbers must be an array'),

  body('phone_numbers.*.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2-3 characters'),

  body('phone_numbers.*.number')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),

  // Profile Information
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),

  body('age_group')
    .optional()
    .isIn(['teen', 'young-adult', 'adult', 'senior'])
    .withMessage('Invalid age group'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),

  body('organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name must be less than 200 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),

  body('country')
    .optional()
    .trim()
    .matches(/^[A-Za-z\s]{2,50}$/)
    .withMessage('Invalid country format'),

  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid timezone format'),

  // Profile Media
  body('user_image.url')
    .optional()
    .isURL()
    .withMessage('User image URL must be valid'),

  body('user_image.public_id')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Public ID must be less than 200 characters'),

  body('user_image.alt_text')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Alt text must be less than 200 characters'),

  body('cover_image.url')
    .optional()
    .isURL()
    .withMessage('Cover image URL must be valid'),

  body('cover_image.public_id')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Public ID must be less than 200 characters'),

  body('cover_image.alt_text')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Alt text must be less than 200 characters'),

  // Social Profiles
  body('facebook_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(value);
    })
    .withMessage('Invalid Facebook URL'),

  body('instagram_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(value);
    })
    .withMessage('Invalid Instagram URL'),

  body('linkedin_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(value);
    })
    .withMessage('Invalid LinkedIn URL'),

  body('twitter_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/i.test(value);
    })
    .withMessage('Invalid Twitter/X URL'),

  body('youtube_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/(?:www\.)?youtube\.com\/.+/i.test(value);
    })
    .withMessage('Invalid YouTube URL'),

  body('github_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/(?:www\.)?github\.com\/.+/i.test(value);
    })
    .withMessage('Invalid GitHub URL'),

  body('portfolio_link')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^https?:\/\/.+/i.test(value);
    })
    .withMessage('Invalid portfolio URL'),

  // Meta data validation
  body('meta.date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('meta.gender')
    .optional()
    .isIn(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'])
    .withMessage('Invalid gender option'),

  body('meta.nationality')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nationality must be less than 100 characters'),

  body('meta.languages_spoken')
    .optional()
    .isArray()
    .withMessage('Languages spoken must be an array'),

  body('meta.languages_spoken.*.language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Language name must be between 2 and 50 characters'),

  body('meta.languages_spoken.*.proficiency')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'native'])
    .withMessage('Invalid proficiency level'),

  body('meta.occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation must be less than 100 characters'),

  body('meta.industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters'),

  body('meta.company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name must be less than 200 characters'),

  body('meta.experience_level')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'executive', 'student', 'other'])
    .withMessage('Invalid experience level'),

  body('meta.annual_income_range')
    .optional()
    .isIn(['under-25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', '150k-plus', 'prefer-not-to-say'])
    .withMessage('Invalid income range'),

  body('meta.education_level')
    .optional()
    .isIn(['High School', 'Diploma', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate/PhD', 'Professional Certificate', 'Other'])
    .withMessage('Invalid education level'),

  body('meta.institution_name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Institution name must be less than 200 characters'),

  body('meta.field_of_study')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Field of study must be less than 100 characters'),

  body('meta.graduation_year')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() + 10 })
    .withMessage('Invalid graduation year'),

  body('meta.skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),

  body('meta.skills.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each skill must be between 1 and 50 characters'),

  body('meta.certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),

  body('meta.certifications.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Certification name must be between 1 and 200 characters'),

  body('meta.certifications.*.issuer')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Certification issuer must be between 1 and 200 characters'),

  body('meta.certifications.*.year')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() + 1 })
    .withMessage('Invalid certification year'),

  body('meta.certifications.*.credential_url')
    .optional()
    .isURL()
    .withMessage('Credential URL must be valid'),

  body('meta.learning_goals')
    .optional()
    .isArray()
    .withMessage('Learning goals must be an array'),

  body('meta.learning_goals.*.goal')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Goal must be between 1 and 200 characters'),

  body('meta.learning_goals.*.priority')
    .optional()
    .isIn(['high', 'medium', 'low'])
    .withMessage('Invalid priority level'),

  body('meta.learning_goals.*.target_date')
    .optional()
    .isISO8601()
    .withMessage('Target date must be a valid date'),

  body('meta.learning_goals.*.progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),

  body('meta.preferred_learning_style')
    .optional()
    .isIn(['visual', 'auditory', 'kinesthetic', 'reading-writing', 'mixed'])
    .withMessage('Invalid learning style'),

  body('meta.available_time_per_week')
    .optional()
    .isInt({ min: 0, max: 168 })
    .withMessage('Available time per week must be between 0 and 168 hours'),

  body('meta.preferred_study_times')
    .optional()
    .isArray()
    .withMessage('Preferred study times must be an array'),

  body('meta.preferred_study_times.*.day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day'),

  body('meta.preferred_study_times.*.start_time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format'),

  body('meta.preferred_study_times.*.end_time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format'),

  body('meta.interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),

  body('meta.interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),

  // User Preferences validation
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto', 'high_contrast'])
    .withMessage('Invalid theme'),

  body('preferences.language')
    .optional()
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Invalid language code format'),

  body('preferences.currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Invalid currency code format'),

  body('preferences.timezone')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid timezone'),

  // Notification preferences
  body('preferences.notifications.email.marketing')
    .optional()
    .isBoolean()
    .withMessage('Email marketing preference must be boolean'),

  body('preferences.notifications.email.course_updates')
    .optional()
    .isBoolean()
    .withMessage('Email course updates preference must be boolean'),

  body('preferences.notifications.email.system_alerts')
    .optional()
    .isBoolean()
    .withMessage('Email system alerts preference must be boolean'),

  body('preferences.notifications.push.enabled')
    .optional()
    .isBoolean()
    .withMessage('Push notifications preference must be boolean'),

  body('preferences.notifications.sms.enabled')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications preference must be boolean'),

  // Privacy preferences
  body('preferences.privacy.profile_visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid profile visibility setting'),

  body('preferences.privacy.activity_tracking')
    .optional()
    .isBoolean()
    .withMessage('Activity tracking preference must be boolean'),

  body('preferences.privacy.data_analytics')
    .optional()
    .isBoolean()
    .withMessage('Data analytics preference must be boolean'),

  // Accessibility preferences
  body('preferences.accessibility.screen_reader')
    .optional()
    .isBoolean()
    .withMessage('Screen reader preference must be boolean'),

  body('preferences.accessibility.high_contrast')
    .optional()
    .isBoolean()
    .withMessage('High contrast preference must be boolean'),

  body('preferences.accessibility.large_text')
    .optional()
    .isBoolean()
    .withMessage('Large text preference must be boolean'),

  // Content preferences
  body('preferences.content.autoplay_videos')
    .optional()
    .isBoolean()
    .withMessage('Autoplay videos preference must be boolean'),

  body('preferences.content.preferred_video_quality')
    .optional()
    .isIn(['auto', '480p', '720p', '1080p'])
    .withMessage('Invalid video quality preference'),

  // Protected fields validation (should be rejected)
  body('email')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('Email cannot be updated through this endpoint');
      }
      return true;
    }),

  body('role')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('Role cannot be updated through this endpoint');
      }
      return true;
    }),

  body('admin_role')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('Admin role cannot be updated through this endpoint');
      }
      return true;
    }),

  body('is_active')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('Account status cannot be updated through this endpoint');
      }
      return true;
    }),

  body('statistics')
    .custom((value) => {
      if (value !== undefined) {
        throw new Error('Statistics cannot be updated through this endpoint');
      }
      return true;
    })
];

// New validation for comprehensive profile update with conditional requirements
export const validateComprehensiveProfileUpdateConditional = [

  // Basic Information - simplified validation (controller handles preservation)
  body('full_name')
    .optional()
    .custom((value) => {
      // Only validate if value is provided and not empty
      if (value && value.trim() !== '') {
        if (value.trim().length < 2 || value.trim().length > 100) {
          throw new Error('Full name must be between 2 and 100 characters');
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          throw new Error('Full name can only contain letters, spaces, hyphens, and apostrophes');
        }
      }
      return true;
    }),

  body('username')
    .optional()
    .custom((value) => {
      // Only validate if value is provided and not empty
      if (value && value.trim() !== '') {
        if (value.trim().length < 3 || value.trim().length > 30) {
          throw new Error('Username must be between 3 and 30 characters');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }
      }
      return true;
    }),

  body('password')
    .optional()
    .custom((value) => {
      if (value && value.length === 0) {
        throw new Error('Password cannot be empty');
      }
      return true;
    }),

  // Contact Information
  body('phone_numbers')
    .optional()
    .custom((value) => {
      if (value && Array.isArray(value) && value.length > 0) {
        for (const phone of value) {
          if (!phone.country || !phone.number) {
            throw new Error('Each phone number must have both country and number fields');
          }
          if (phone.country.length < 2 || phone.country.length > 3) {
            throw new Error('Country code must be 2-3 characters');
          }
          if (!/^\+?\d{10,15}$/.test(phone.number)) {
            throw new Error('Phone number must be 10-15 digits');
          }
        }
      }
      return true;
    }),

  // Profile Information
  body('age')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.age;
      if (existing && (value === null || value === undefined || value === '')) {
        throw new Error('Age cannot be empty once set');
      }
      if (value !== null && value !== undefined && value !== '') {
        const ageNum = parseInt(value);
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          throw new Error('Age must be between 13 and 120');
        }
      }
      return true;
    }),

  body('age_group')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.age_group;
      if (existing && (!value || value.trim() === '')) {
        throw new Error('Age group cannot be empty once set');
      }
      if (value && value.trim() !== '') {
        if (!['teen', 'young-adult', 'adult', 'senior'].includes(value)) {
          throw new Error('Invalid age group');
        }
      }
      return true;
    }),

  body('address')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.address;
      if (existing && (!value || value.trim() === '')) {
        throw new Error('Address cannot be empty once set');
      }
      if (value && value.trim() !== '' && value.trim().length > 500) {
        throw new Error('Address must be less than 500 characters');
      }
      return true;
    }),

  body('organization')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.organization;
      if (existing && (!value || value.trim() === '')) {
        throw new Error('Organization cannot be empty once set');
      }
      if (value && value.trim() !== '' && value.trim().length > 200) {
        throw new Error('Organization name must be less than 200 characters');
      }
      return true;
    }),

  body('bio')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.bio;
      if (existing && (!value || value.trim() === '')) {
        throw new Error('Bio cannot be empty once set');
      }
      if (value && value.trim() !== '' && value.trim().length > 1000) {
        throw new Error('Bio must be less than 1000 characters');
      }
      return true;
    }),

  body('country')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.country;
      if (existing && (!value || value.trim() === '')) {
        throw new Error('Country cannot be empty once set');
      }
      if (value && value.trim() !== '') {
        if (!/^[A-Za-z\s]{2,50}$/.test(value.trim())) {
          throw new Error('Invalid country format');
        }
      }
      return true;
    }),

  body('timezone')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.timezone;
      if (existing && (!value || value.trim() === '')) {
        throw new Error('Timezone cannot be empty once set');
      }
      if (value && value.trim() !== '') {
        if (value.trim().length < 3 || value.trim().length > 50) {
          throw new Error('Invalid timezone format');
        }
      }
      return true;
    }),

  // Social Profiles - allow emptying these
  body('facebook_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(value)) {
        throw new Error('Invalid Facebook URL');
      }
      return true;
    }),

  body('instagram_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(value)) {
        throw new Error('Invalid Instagram URL');
      }
      return true;
    }),

  body('linkedin_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(value)) {
        throw new Error('Invalid LinkedIn URL');
      }
      return true;
    }),

  body('twitter_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/i.test(value)) {
        throw new Error('Invalid Twitter/X URL');
      }
      return true;
    }),

  body('youtube_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/(?:www\.)?youtube\.com\/.+/i.test(value)) {
        throw new Error('Invalid YouTube URL');
      }
      return true;
    }),

  body('github_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/(?:www\.)?github\.com\/.+/i.test(value)) {
        throw new Error('Invalid GitHub URL');
      }
      return true;
    }),

  body('portfolio_link')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/.+/i.test(value)) {
        throw new Error('Invalid portfolio URL');
      }
      return true;
    }),

  // Profile Media - optional validation
  body('user_image.url')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/.+/i.test(value)) {
        throw new Error('User image URL must be valid');
      }
      return true;
    }),

  body('cover_image.url')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^https?:\/\/.+/i.test(value)) {
        throw new Error('Cover image URL must be valid');
      }
      return true;
    }),

  // Meta data - conditional validation for important fields
  body('meta.date_of_birth')
    .custom((value, { req }) => {
      const existing = req.existingUserData?.meta?.date_of_birth;
      if (existing && (!value || value === '')) {
        throw new Error('Date of birth cannot be empty once set');
      }
      if (value && value !== '' && !Date.parse(value)) {
        throw new Error('Date of birth must be a valid date');
      }
      return true;
    }),

  body('meta.gender')
    .optional()
    .custom((value) => {
      // Allow empty/null/undefined values - controller will handle preservation
      if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      
      // Only validate if value is provided
      const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'];
      if (!validGenders.includes(value.toLowerCase())) {
        throw new Error(`Invalid gender option. Valid options: ${validGenders.join(', ')}`);
      }
      return true;
    }),

  // Meta fields with specific validation
  body('meta.experience_level')
    .optional()
    .custom((value) => {
      // Allow empty values (will keep previous data in controller)
      if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      // Validate if value is provided
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert', 'entry-level', 'mid-level', 'senior-level'];
      if (!validLevels.includes(value.toLowerCase())) {
        throw new Error(`Invalid experience level. Valid options: ${validLevels.join(', ')}`);
      }
      return true;
    }),

  body('meta.annual_income_range')
    .optional()
    .custom((value) => {
      // Allow empty values (will keep previous data in controller)
      if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      // Validate if value is provided
      const validRanges = [
        'under-25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', 
        '150k-200k', '200k-300k', '300k-500k', 'over-500k', 'prefer-not-to-say'
      ];
      if (!validRanges.includes(value.toLowerCase())) {
        throw new Error(`Invalid income range. Valid options: ${validRanges.join(', ')}`);
      }
      return true;
    }),

  // Other optional fields that can be emptied
  body('meta.nationality').optional().trim().isLength({ max: 100 }).withMessage('Nationality must be less than 100 characters'),
  body('meta.occupation').optional().trim().isLength({ max: 100 }).withMessage('Occupation must be less than 100 characters'),
  body('meta.industry').optional().trim().isLength({ max: 100 }).withMessage('Industry must be less than 100 characters'),
  body('meta.company').optional().trim().isLength({ max: 200 }).withMessage('Company name must be less than 200 characters'),
  
  // Skills and certifications arrays
  body('meta.skills').optional().isArray().withMessage('Skills must be an array'),
  body('meta.certifications').optional().isArray().withMessage('Certifications must be an array'),
  body('meta.languages_spoken').optional().isArray().withMessage('Languages spoken must be an array'),
];

export default {
  validateUserId,
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateDeleteProfile,
  validateComprehensiveProfileUpdate,
  validateComprehensiveProfileUpdateConditional
}; 