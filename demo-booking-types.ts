/**
 * TypeScript Type Definitions for Demo Booking Form
 * MEDH Universal Form API Integration
 *
 * @version 1.0.0
 * @author MEDH Development Team
 */

// ===== FORM DATA TYPES =====

export interface DemoBookingFormData {
  form_type: "book_a_free_demo_session";
  is_student_under_16: boolean;
  contact_info: ContactInfo;
  student_details?: StudentDetails;
  parent_details?: ParentDetails;
  demo_session_details?: DemoSessionDetails;
  consent: ConsentData;
  captcha_token: string;
}

export interface ContactInfo {
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name?: string; // Auto-generated
  email: string;
  mobile_number: MobileNumber;
  city: string;
  country: string;
  address?: string;
  social_profiles?: SocialProfiles;
}

export interface MobileNumber {
  country_code: string; // Format: "+XX"
  number: string;
  formatted?: string; // Auto-generated
  is_validated?: boolean; // Auto-generated
}

export interface SocialProfiles {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  portfolio?: string;
}

// Student Details (Age 16+)
export interface StudentDetails {
  name: string;
  email?: string;
  highest_qualification: HighestQualification;
  currently_studying: boolean;
  currently_working: boolean;
  education_institute_name?: string;
  preferred_course: string[]; // Course IDs
  preferred_timings?: string;
}

// Student Details (Under 16)
export interface StudentDetailsUnder16 {
  name: string;
  grade: GradeLevel;
  school_name?: string;
  preferred_course: string[]; // Course IDs
  preferred_timings?: string;
}

// Parent Details (for students under 16)
export interface ParentDetails {
  preferred_timings?: string;
  // Note: Parent contact info goes in main contact_info
}

export interface DemoSessionDetails {
  preferred_date?: Date | string;
  preferred_time_slot?: TimeSlot;
  timezone: string; // Default: "Asia/Kolkata"
  demo_status?: DemoStatus;
  zoom_meeting_id?: string; // Auto-generated
  zoom_meeting_url?: string; // Auto-generated
  zoom_passcode?: string; // Auto-generated
  instructor_assigned?: string; // User ID
  demo_completion_date?: Date;
  demo_feedback?: DemoFeedback;
}

export interface DemoFeedback {
  rating: number; // 1-5
  comments: string;
  would_recommend: boolean;
}

export interface ConsentData {
  terms_and_privacy: boolean; // Required: true
  data_collection_consent: boolean; // Required: true
  marketing_consent?: boolean; // Optional, default: false
}

// ===== ENUM TYPES =====

export type HighestQualification =
  | "10th_passed"
  | "12th_passed"
  | "undergraduate"
  | "graduate"
  | "post_graduate";

export type GradeLevel =
  | "grade_1-2"
  | "grade_3-4"
  | "grade_5-6"
  | "grade_7-8"
  | "grade_9-10"
  | "grade_11-12"
  | "home_study";

export type TimeSlot =
  | "09:00-10:00"
  | "10:00-11:00"
  | "11:00-12:00"
  | "12:00-13:00"
  | "13:00-14:00"
  | "14:00-15:00"
  | "15:00-16:00"
  | "16:00-17:00"
  | "17:00-18:00"
  | "18:00-19:00"
  | "19:00-20:00"
  | "20:00-21:00";

export type DemoStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type FormStatus =
  | "submitted"
  | "acknowledged"
  | "under_review"
  | "shortlisted"
  | "interview_scheduled"
  | "selected"
  | "rejected"
  | "on_hold"
  | "completed";

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ValidationError[];
}

export interface DemoBookingResponse {
  application_id: string;
  form_type: "book_a_free_demo_session";
  status: FormStatus;
  submitted_at: string; // ISO date string
  acknowledgment_sent: boolean;
  demo_session_details?: {
    preferred_date?: string;
    preferred_time_slot?: TimeSlot;
    demo_status: DemoStatus;
  };
  auto_filled?: boolean;
  auto_fill_source?: "user_profile" | "previous_form" | "oauth_data";
  auto_filled_fields?: string[];
}

export interface ValidationError {
  type: "field";
  msg: string;
  path: string;
  location: "body";
  value?: any;
}

export interface LiveCourse {
  course_id: string;
  title: string;
  category: string;
  grade_level: string;
  description: string;
  duration: string;
  next_batch_start: string; // ISO date string
  instructor_name?: string;
  price?: number;
  currency?: string;
}

export interface Country {
  name: string;
  code: string; // ISO country code
  phone_code: string; // Format: "+XX"
  popular?: boolean;
}

export interface AutoFillData {
  contact_info: Partial<ContactInfo>;
  auto_fill_source: "user_profile" | "previous_form" | "oauth_data";
}

// ===== ADMIN TYPES =====

export interface DemoBookingAdmin {
  _id: string;
  application_id: string;
  form_type: "book_a_free_demo_session";
  status: FormStatus;
  priority: "low" | "medium" | "high" | "urgent";
  contact_info: ContactInfo;
  student_details?: StudentDetails | StudentDetailsUnder16;
  demo_session_details?: DemoSessionDetails;
  assigned_to?: AdminUser;
  handled_by?: AdminUser;
  internal_notes: InternalNote[];
  submitted_at: string;
  processed_at?: string;
  completed_at?: string;
  is_deleted: boolean;
}

export interface AdminUser {
  _id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface InternalNote {
  note: string;
  added_by: AdminUser;
  added_at: string; // ISO date string
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  limit: number;
}

// ===== UTILITY TYPES =====

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface DemoBookingFormConfig {
  apiBaseUrl: string;
  captchaSiteKey?: string;
  defaultTimezone?: string;
  enableAutoFill?: boolean;
  requireCaptcha?: boolean;
  maxCourseSelection?: number;
}

// ===== CLASS INTERFACES =====

export interface IDemoBookingFormHandler {
  config: DemoBookingFormConfig;

  // Data loading methods
  getCountries(filters?: CountryFilters): Promise<Country[]>;
  getLiveCourses(filters?: CourseFilters): Promise<LiveCourse[]>;
  getAutoFillData(authToken: string): Promise<AutoFillData | null>;

  // Form submission
  submitDemoBooking(
    formData: DemoBookingFormData,
  ): Promise<DemoBookingResponse>;

  // Validation
  validateForm(formData: Partial<DemoBookingFormData>): FormValidationResult;

  // Utility methods
  formatPhoneNumber(countryCode: string, number: string): string;
  isValidEmail(email: string): boolean;
  isValidDate(date: string | Date): boolean;
}

export interface CountryFilters {
  format?: "phone" | "standard";
  popular?: boolean;
  search?: string;
}

export interface CourseFilters {
  category?: string;
  grade_level?: string;
  limit?: number;
}

// ===== FORM BUILDER TYPES =====

export interface FormFieldConfig {
  name: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "time";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: FieldValidation;
  conditional?: ConditionalLogic;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean | string;
}

export interface ConditionalLogic {
  dependsOn: string; // Field name
  operator: "equals" | "not_equals" | "contains";
  value: any;
  action: "show" | "hide" | "require";
}

// ===== ERROR TYPES =====

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export interface NetworkError extends Error {
  timeout?: boolean;
  offline?: boolean;
}

export interface ValidationErrorMap {
  [fieldPath: string]: string;
}

// ===== EVENT TYPES =====

export interface FormEventHandlers {
  onSubmitStart?: (formData: DemoBookingFormData) => void;
  onSubmitSuccess?: (response: DemoBookingResponse) => void;
  onSubmitError?: (error: ApiError) => void;
  onFieldChange?: (fieldName: string, value: any) => void;
  onValidationError?: (errors: ValidationErrorMap) => void;
  onAutoFillComplete?: (data: AutoFillData) => void;
}

// ===== ANALYTICS TYPES =====

export interface FormAnalytics {
  formViews: number;
  formStarts: number;
  formSubmissions: number;
  conversionRate: number;
  averageCompletionTime: number; // seconds
  dropOffPoints: DropOffPoint[];
  popularCourses: CoursePopularity[];
}

export interface DropOffPoint {
  fieldName: string;
  dropOffCount: number;
  dropOffRate: number;
}

export interface CoursePopularity {
  course_id: string;
  course_title: string;
  selectionCount: number;
  conversionRate: number;
}

// ===== EXPORT DEFAULTS =====

export default DemoBookingFormData;

// ===== TYPE GUARDS =====

export function isDemoBookingFormData(data: any): data is DemoBookingFormData {
  return (
    typeof data === "object" &&
    data.form_type === "book_a_free_demo_session" &&
    typeof data.is_student_under_16 === "boolean" &&
    typeof data.contact_info === "object" &&
    typeof data.consent === "object"
  );
}

export function isValidTimeSlot(slot: string): slot is TimeSlot {
  const validSlots: TimeSlot[] = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
    "16:00-17:00",
    "17:00-18:00",
    "18:00-19:00",
    "19:00-20:00",
    "20:00-21:00",
  ];
  return validSlots.includes(slot as TimeSlot);
}

export function isValidHighestQualification(
  qual: string,
): qual is HighestQualification {
  const validQualifications: HighestQualification[] = [
    "10th_passed",
    "12th_passed",
    "undergraduate",
    "graduate",
    "post_graduate",
  ];
  return validQualifications.includes(qual as HighestQualification);
}

// ===== UTILITY CONSTANTS =====

export const TIME_SLOTS: TimeSlot[] = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
  "19:00-20:00",
  "20:00-21:00",
];

export const HIGHEST_QUALIFICATIONS: HighestQualification[] = [
  "10th_passed",
  "12th_passed",
  "undergraduate",
  "graduate",
  "post_graduate",
];

export const GRADE_LEVELS: GradeLevel[] = [
  "grade_1-2",
  "grade_3-4",
  "grade_5-6",
  "grade_7-8",
  "grade_9-10",
  "grade_11-12",
  "home_study",
];

export const DEFAULT_CONFIG: DemoBookingFormConfig = {
  apiBaseUrl: "/api/v1",
  defaultTimezone: "Asia/Kolkata",
  enableAutoFill: true,
  requireCaptcha: true,
  maxCourseSelection: 5,
};
