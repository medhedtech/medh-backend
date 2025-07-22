// MEDH Universal Form API Integration - Production Ready
// Refined to match actual MEDH backend implementation

import { apiClient } from "./apiClient";
import type {
  UniversalForm,
  FormSubmissionResponse,
  AutoFillResponse,
  CountriesResponse,
  AutoFillData,
  Country,
  FormType,
  ContactInfo,
  MobileNumber,
} from "@/types/universalForm";
import { formatPhoneNumber, sanitizeFormData } from "@/utils/formValidation";

// ===== ACTUAL MEDH API ENDPOINTS =====
const ENDPOINTS = {
  SUBMIT_FORM: "/forms/submit",
  AUTO_FILL: "/forms/auto-fill",
  COUNTRIES: "/forms/countries",
  LOOKUP_FORM: "/forms/lookup",
  // Specific form endpoints
  CAREER_APPLICATION: "/forms/career-application",
  PARTNERSHIP_INQUIRY: "/forms/partnership-inquiry",
  EDUCATOR_APPLICATION: "/forms/educator-application",
  CONTACT_US: "/forms/contact-us",
  CORPORATE_TRAINING: "/forms/corporate-training",
};

// ===== MEDH RESPONSE TYPES =====
interface MEDHBaseResponse {
  success: boolean;
  message: string;
}

interface MEDHFormSubmissionResponse extends MEDHBaseResponse {
  data: {
    application_id: string;
    form_type: string;
    status: string;
    submitted_at: string;
    acknowledgment_sent?: boolean;
    auto_filled?: boolean;
    auto_fill_source?: string;
    auto_filled_fields?: string[];
    priority?: string;
    form_id?: string; // Some endpoints return this instead of application_id
  };
}

interface MEDHCountriesResponse extends MEDHBaseResponse {
  data: Array<{
    code: string;
    code3?: string;
    name: string;
    nativeName?: string;
    phone: string; // Includes "+" prefix like "+91"
    phoneCode?: number | number[]; // Can be number or array
    continent?: string;
    region?: string;
    subregion?: string;
    emoji?: string;
    flag: string;
    currency?: string | string[];
    currencies?: Record<string, any>;
    languages?: string[];
    capital?: string;
    timezone?: string | null;
    tld?: string;
    priority?: number;
    searchTerms?: string[];
  }>;
  meta: {
    total: number;
    returned: number;
    format: string;
    filters: {
      search?: string | null;
      continent?: string | null;
      popular: boolean;
      phone_codes_only: boolean;
    };
  };
}

interface MEDHAutoFillResponse extends MEDHBaseResponse {
  data: {
    contact_info?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      mobile_number?: {
        country_code: string;
        number: string;
        formatted?: string;
      };
      city?: string;
      country?: string;
      address?: string;
      social_profiles?: {
        linkedin?: string;
        portfolio?: string;
        github?: string;
      };
    };
    professional_info?: {
      current_company?: {
        name: string;
        designation: string;
        working_since: {
          month: string;
          year: number;
        };
      };
      employment_info?: {
        has_work_experience: boolean;
        currently_employed: boolean;
        preferred_work_mode: string;
      };
    };
    education_info?: {
      highest_qualification: string;
      specialization: string;
      years_of_experience: string;
    };
    // Add other form-specific data as needed
  };
}

interface MEDHErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    type: string;
    value: any;
    msg: string;
    path: string;
    location: string;
  }>;
}

// ===== CORE API FUNCTIONS =====

/**
 * Submit a universal form using the main MEDH endpoint
 */
export const submitUniversalForm = async (
  formData: Partial<UniversalForm>,
): Promise<FormSubmissionResponse> => {
  try {
    // Sanitize form data before submission
    const sanitizedData = sanitizeFormData(formData);

    // Add required metadata and fix mobile_number format
    const submissionData = {
      ...sanitizedData,
      submitted_at: new Date().toISOString(),
      source: "website",

      // Required fields based on MEDH backend validation
      consent: {
        terms_and_privacy: sanitizedData.terms_accepted || false,
        data_collection_consent: sanitizedData.terms_accepted || false,
        marketing_consent: false,
      },

      // Add captcha_token (frontend should handle this)
      captcha_token: formData.captcha_token || "development_mode",

      // Ensure mobile_number is in correct format
      contact_info: sanitizedData.contact_info
        ? {
            ...sanitizedData.contact_info,
            mobile_number: sanitizedData.contact_info.mobile_number
              ? formatMobileNumberForMEDH(
                  sanitizedData.contact_info.mobile_number,
                )
              : undefined,
          }
        : undefined,
    };

    const response = await apiClient.post<MEDHFormSubmissionResponse>(
      ENDPOINTS.SUBMIT_FORM,
      submissionData,
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Form submission failed");
    }

    // Transform MEDH response to expected format
    const transformedResponse: FormSubmissionResponse = {
      success: response.data.success,
      message: response.data.message,
      data: {
        application_id:
          response.data.data.application_id || response.data.data.form_id,
        form_type: response.data.data.form_type as FormType,
        status: response.data.data.status,
        submitted_at: response.data.data.submitted_at,
        acknowledgment_sent: response.data.data.acknowledgment_sent || false,
        auto_filled: response.data.data.auto_filled || false,
        auto_fill_source: response.data.data.auto_fill_source,
        auto_filled_fields: response.data.data.auto_filled_fields || [],
        priority:
          (response.data.data.priority as
            | "low"
            | "medium"
            | "high"
            | "urgent") || "medium",
        confirmation_number: `CONF-${response.data.data.application_id || response.data.data.form_id}`,
        next_steps: getNextSteps(response.data.data.form_type as FormType),
        estimated_response_time: getEstimatedResponseTime(
          response.data.data.form_type as FormType,
        ),
      },
    };

    return transformedResponse;
  } catch (error: any) {
    console.error("Form submission error:", error);

    // Handle MEDH validation errors
    if (error.response?.status === 400 && error.response?.data?.errors) {
      const medhError = error.response.data as MEDHErrorResponse;
      const validationErrors =
        medhError.errors?.map((err) => err.msg).join(", ") || medhError.message;
      throw new Error(`Validation failed: ${validationErrors}`);
    }

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "An error occurred while submitting the form. Please try again.";

    throw new Error(errorMessage);
  }
};

/**
 * Submit to specific MEDH form endpoints (alternative method)
 */
export const submitSpecificForm = async (
  formType: FormType,
  formData: any,
): Promise<FormSubmissionResponse> => {
  try {
    let endpoint = ENDPOINTS.SUBMIT_FORM;

    // Use specific endpoints for certain form types
    switch (formType) {
      case "candidate_application":
        endpoint = ENDPOINTS.CAREER_APPLICATION;
        break;
      case "school_partnership":
        endpoint = ENDPOINTS.PARTNERSHIP_INQUIRY;
        break;
      case "educator_application":
        endpoint = ENDPOINTS.EDUCATOR_APPLICATION;
        break;
      case "general_contact":
        endpoint = ENDPOINTS.CONTACT_US;
        break;
      case "corporate_training_inquiry":
        endpoint = ENDPOINTS.CORPORATE_TRAINING;
        break;
    }

    const response = await apiClient.post<MEDHFormSubmissionResponse>(
      endpoint,
      formData,
    );

    return transformMEDHResponse(response.data);
  } catch (error: any) {
    console.error("Specific form submission error:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * Get auto-fill data for authenticated users
 */
export const getAutoFillData = async (
  formType: FormType,
  token?: string,
): Promise<AutoFillResponse> => {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await apiClient.get<MEDHAutoFillResponse>(
      ENDPOINTS.AUTO_FILL,
      { headers },
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to get auto-fill data");
    }

    // Transform MEDH auto-fill response
    const transformedResponse: AutoFillResponse = {
      success: response.data.success,
      message: response.data.message,
      data: transformAutoFillData(response.data.data, formType),
    };

    return transformedResponse;
  } catch (error: any) {
    console.error("Auto-fill data error:", error);

    // Return empty data instead of throwing error for better UX
    return {
      success: false,
      message:
        error.response?.status === 401
          ? "Authentication required"
          : "Could not load auto-fill data",
      data: {},
    };
  }
};

/**
 * Get countries list from MEDH backend
 */
export const getCountries = async (
  options: {
    format?: "full" | "dropdown" | "phone" | "popular";
    search?: string;
    continent?: string;
    popular?: boolean;
    phone_codes_only?: boolean;
  } = {},
): Promise<CountriesResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (options.format) queryParams.append("format", options.format);
    if (options.search) queryParams.append("search", options.search);
    if (options.continent) queryParams.append("continent", options.continent);
    if (options.popular) queryParams.append("popular", "true");
    if (options.phone_codes_only)
      queryParams.append("phone_codes_only", "true");

    const url = `${ENDPOINTS.COUNTRIES}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiClient.get<MEDHCountriesResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to fetch countries");
    }

    // Transform MEDH countries response to expected format
    const countries: Country[] = response.data.data.map((country) => ({
      code: country.code,
      name: country.name,
      phone: country.phone.replace("+", ""), // Remove + prefix for frontend compatibility
      emoji: country.emoji || country.flag,
      priority: country.priority || 1, // Default priority if not provided
    }));

    return {
      success: true,
      data: countries,
    };
  } catch (error: any) {
    console.error("Countries fetch error:", error);

    // Return basic fallback countries
    const fallbackCountries: Country[] = [
      { code: "IN", name: "India", phone: "91", emoji: "🇮🇳" },
      { code: "US", name: "United States", phone: "1", emoji: "🇺🇸" },
      { code: "GB", name: "United Kingdom", phone: "44", emoji: "🇬🇧" },
      { code: "CA", name: "Canada", phone: "1", emoji: "🇨🇦" },
      { code: "AU", name: "Australia", phone: "61", emoji: "🇦🇺" },
    ];

    return {
      success: true,
      data: fallbackCountries,
    };
  }
};

/**
 * Lookup form by application ID using MEDH endpoint
 */
export const lookupFormByApplicationId = async (
  applicationId: string,
): Promise<{ success: boolean; data?: UniversalForm; message?: string }> => {
  try {
    const response = await apiClient.get(
      `${ENDPOINTS.LOOKUP_FORM}/${applicationId}`,
    );

    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error: any) {
    console.error("Form lookup error:", error);

    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Form not found or an error occurred during lookup.",
    };
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Format mobile number for MEDH backend (separate country_code and number)
 */
const formatMobileNumberForMEDH = (mobileNumber: any): any => {
  if (typeof mobileNumber === "string") {
    // Handle string format like "+919876543210"
    const match = mobileNumber.match(/^(\+\d{1,4})(\d{10})$/);
    if (match) {
      return {
        country_code: match[1],
        number: match[2],
      };
    }
    // Fallback for other string formats
    return {
      country_code: mobileNumber.substring(0, mobileNumber.length - 10),
      number: mobileNumber.substring(mobileNumber.length - 10),
    };
  }

  if (
    typeof mobileNumber === "object" &&
    mobileNumber.country_code &&
    mobileNumber.number
  ) {
    // Already in correct format
    return {
      country_code: mobileNumber.country_code,
      number: mobileNumber.number,
    };
  }

  // Return as-is if format is unknown
  return mobileNumber;
};

/**
 * Transform MEDH response to standardized format
 */
const transformMEDHResponse = (
  medhResponse: MEDHFormSubmissionResponse,
): FormSubmissionResponse => {
  return {
    success: medhResponse.success,
    message: medhResponse.message,
    data: {
      application_id:
        medhResponse.data.application_id || medhResponse.data.form_id,
      form_type: medhResponse.data.form_type as FormType,
      status: medhResponse.data.status,
      submitted_at: medhResponse.data.submitted_at,
      acknowledgment_sent: medhResponse.data.acknowledgment_sent || false,
      auto_filled: medhResponse.data.auto_filled || false,
      auto_fill_source: medhResponse.data.auto_fill_source,
      auto_filled_fields: medhResponse.data.auto_filled_fields || [],
      priority: (medhResponse.data.priority as any) || "medium",
      confirmation_number: `CONF-${medhResponse.data.application_id || medhResponse.data.form_id}`,
      next_steps: getNextSteps(medhResponse.data.form_type as FormType),
      estimated_response_time: getEstimatedResponseTime(
        medhResponse.data.form_type as FormType,
      ),
    },
  };
};

/**
 * Transform MEDH auto-fill data to expected format
 */
const transformAutoFillData = (
  medhData: MEDHAutoFillResponse["data"],
  formType: FormType,
): AutoFillData => {
  const autoFillData: AutoFillData = {};

  // Transform contact info
  if (medhData.contact_info) {
    autoFillData.contact_info = {
      first_name: medhData.contact_info.first_name,
      middle_name: "", // Not provided by MEDH backend
      last_name: medhData.contact_info.last_name,
      email: medhData.contact_info.email,
      mobile_number: medhData.contact_info.mobile_number
        ? {
            country_code: medhData.contact_info.mobile_number.country_code,
            number: medhData.contact_info.mobile_number.number,
            formatted:
              medhData.contact_info.mobile_number.formatted ||
              `${medhData.contact_info.mobile_number.country_code} ${medhData.contact_info.mobile_number.number}`,
            is_validated: true,
            is_whatsapp: false, // Default value
          }
        : undefined,
      city: medhData.contact_info.city,
      country: medhData.contact_info.country,
      address: medhData.contact_info.address,
      social_profiles: medhData.contact_info.social_profiles,
    };
  }

  // Transform professional info for relevant forms
  if (
    medhData.professional_info &&
    ["candidate_application", "corporate_training_inquiry"].includes(formType)
  ) {
    autoFillData.professional_info = medhData.professional_info;
  }

  // Transform education info for educator applications
  if (medhData.education_info && formType === "educator_application") {
    autoFillData.education_info = medhData.education_info;
  }

  return autoFillData;
};

/**
 * Get next steps by form type
 */
const getNextSteps = (formType: string): string => {
  const nextSteps: Record<string, string> = {
    candidate_application:
      "Our HR team will review your application and contact you for the next round of interviews.",
    school_partnership:
      "Our partnerships team will schedule a meeting to discuss collaboration opportunities.",
    educator_application:
      "You will receive a demo session link and interview schedule via email.",
    general_contact:
      "Our support team will respond to your inquiry via email or phone.",
    corporate_training_inquiry:
      "Our business team will prepare a customized training proposal for your organization.",
    membership_inquiry:
      "You will receive detailed membership information and pricing options.",
    hire_from_medh_inquiry:
      "Our placement team will share candidate profiles matching your requirements.",
    course_inquiry:
      "An academic advisor will provide course details and enrollment guidance.",
    support_request:
      "Our support team will investigate and resolve your issue promptly.",
    partnership_inquiry:
      "We will evaluate your proposal and schedule a discussion meeting.",
    media_inquiry:
      "Our communications team will provide requested information and media assets.",
    technical_support:
      "Our technical team will diagnose and fix the reported issue.",
    billing_inquiry:
      "Our accounts team will review your billing query and provide clarification.",
    feedback_submission:
      "We will review your feedback and implement improvements where possible.",
    book_a_free_demo_session:
      "You will receive a calendar link to book your preferred demo session time.",
  };

  return (
    nextSteps[formType] || "We will process your request and contact you soon."
  );
};

/**
 * Get estimated response time by form type
 */
const getEstimatedResponseTime = (formType: string): string => {
  const responseTimes: Record<string, string> = {
    candidate_application: "3-5 business days",
    school_partnership: "2-3 business days",
    educator_application: "5-7 business days",
    general_contact: "24-48 hours",
    corporate_training_inquiry: "1-2 business days",
    membership_inquiry: "24 hours",
    hire_from_medh_inquiry: "2-3 business days",
    course_inquiry: "24 hours",
    support_request: "4-6 hours",
    partnership_inquiry: "3-5 business days",
    media_inquiry: "24 hours",
    technical_support: "2-4 hours",
    billing_inquiry: "24 hours",
    feedback_submission: "3-5 business days",
    book_a_free_demo_session: "24 hours",
  };

  return responseTimes[formType] || "24-48 hours";
};

/**
 * Merge auto-fill data with current form data
 */
export const mergeAutoFillData = (
  currentData: Partial<UniversalForm>,
  autoFillData: AutoFillData,
): Partial<UniversalForm> => {
  const merged = { ...currentData };

  // Merge contact info (only if fields are empty)
  if (autoFillData.contact_info) {
    merged.contact_info = {
      ...merged.contact_info,
      first_name:
        merged.contact_info?.first_name || autoFillData.contact_info.first_name,
      last_name:
        merged.contact_info?.last_name || autoFillData.contact_info.last_name,
      email: merged.contact_info?.email || autoFillData.contact_info.email,
      mobile_number:
        merged.contact_info?.mobile_number ||
        autoFillData.contact_info.mobile_number,
      city: merged.contact_info?.city || autoFillData.contact_info.city,
      country:
        merged.contact_info?.country || autoFillData.contact_info.country,
    };
  }

  // Track auto-filled fields
  const autoFilledFields: string[] = [];
  if (autoFillData.contact_info) {
    Object.keys(autoFillData.contact_info).forEach((key) => {
      if (autoFillData.contact_info![key as keyof ContactInfo]) {
        autoFilledFields.push(`contact_info.${key}`);
      }
    });
  }

  merged.auto_filled = autoFilledFields.length > 0;
  merged.auto_fill_source = "user_profile";
  merged.auto_filled_fields = autoFilledFields;

  return merged;
};

/**
 * Check if field was auto-filled
 */
export const isFieldAutoFilled = (
  fieldPath: string,
  autoFilledFields: string[] = [],
): boolean => {
  return autoFilledFields.includes(fieldPath);
};

/**
 * Prepare phone number for MEDH submission format
 */
export const preparePhoneNumberForSubmission = (
  mobileNumber: MobileNumber,
): any => {
  // MEDH backend expects: "+919876543210" format or object with country_code and number
  if (typeof mobileNumber === "object") {
    return `${mobileNumber.country_code}${mobileNumber.number}`;
  }
  return mobileNumber;
};

// Export all functions
export default {
  submitUniversalForm,
  submitSpecificForm,
  getAutoFillData,
  getCountries,
  lookupFormByApplicationId,
  mergeAutoFillData,
  preparePhoneNumberForSubmission,
  isFieldAutoFilled,
};
