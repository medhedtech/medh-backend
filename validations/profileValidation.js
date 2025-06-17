import { body, param, query } from "express-validator";

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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

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

export default {
  validateUserId,
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateDeleteProfile
}; 