// MEDH Universal Form API Integration - Usage Examples
// This demonstrates how to use the refined API with your actual MEDH backend

import {
  submitUniversalForm,
  getCountries,
  getAutoFillData,
} from "./refined-medh-universal-form-api";

// ===== EXAMPLE 1: Get Countries List =====

async function loadCountriesExample() {
  try {
    // Get popular countries (as seen working in your backend)
    const popularCountries = await getCountries({
      format: "popular",
    });

    console.log("Popular Countries:", popularCountries.data);
    // Output: India, US, UK, Canada, Australia, etc. with priority 100

    // Get countries with phone codes only
    const phoneCountries = await getCountries({
      format: "phone",
      popular: true,
    });

    console.log("Phone Countries:", phoneCountries.data);
    // Output: Countries with phone codes like +91, +1, +44, etc.

    // Search countries
    const searchResults = await getCountries({
      search: "united",
    });

    console.log("Search Results:", searchResults.data);
    // Output: United States, United Kingdom, UAE, etc.
  } catch (error) {
    console.error("Countries loading failed:", error);
    // Fallback countries are automatically returned
  }
}

// ===== EXAMPLE 2: Submit Corporate Training Form =====

async function submitCorporateTrainingExample() {
  try {
    const formData = {
      form_type: "corporate_training_inquiry" as const,

      // Contact Information (matches MEDH backend validation requirements)
      contact_info: {
        first_name: "Radhika",
        last_name: "Sharma",
        full_name: "Radhika Sharma",
        email: "radhika@techcorp.com",
        mobile_number: {
          country_code: "+91", // Required: separate country code with +
          number: "9876543210", // Required: 10-digit number without country code
        },
        city: "Mumbai",
        country: "India",
      },

      // Professional Information
      professional_info: {
        designation: "Learning & Development Manager",
        company_name: "TechCorp Solutions",
        company_website: "https://techcorp.com",
      },

      // Training Requirements
      subject: "Corporate Training Inquiry",
      message:
        "We need comprehensive AI and Machine Learning training for our team of 25 developers. Looking for hands-on, project-based learning with certification.",

      // Training Details
      training_requirements: {
        training_type: "custom",
        participants_count: 25,
        budget_range: "5l_10l",
        timeline: "within_quarter",
        specific_skills: [
          "Python",
          "Machine Learning",
          "Deep Learning",
          "MLOps",
        ],
      },

      // Consent (required by MEDH backend)
      consent: {
        terms_and_privacy: true,
        data_collection_consent: true,
        marketing_consent: false,
      },

      // Legacy fields for backward compatibility
      terms_accepted: true,
      privacy_policy_accepted: true,

      // Required by MEDH backend validation
      captcha_token: "development_mode", // In production, get this from reCAPTCHA

      // Metadata
      source: "website",
    };

    const response = await submitUniversalForm(formData);

    console.log("Form submitted successfully:", response);

    // Expected response structure:
    // {
    //   success: true,
    //   message: "Corporate training inquiry submitted successfully...",
    //   data: {
    //     application_id: "COR20240122ABC123",
    //     form_type: "corporate_training_inquiry",
    //     status: "submitted",
    //     submitted_at: "2024-01-22T10:30:00Z",
    //     acknowledgment_sent: true,
    //     priority: "high",
    //     confirmation_number: "CONF-COR20240122ABC123",
    //     next_steps: "Our business team will prepare a customized training proposal...",
    //     estimated_response_time: "1-2 business days"
    //   }
    // }
  } catch (error) {
    console.error("Form submission failed:", error.message);

    // Handle specific errors
    if (error.message.includes("Validation failed")) {
      // Show validation errors to user
      console.log("Please check the form data and try again");
    }
  }
}

// ===== EXAMPLE 3: Auto-fill Form for Logged-in Users =====

async function autoFillFormExample(userToken: string) {
  try {
    const autoFillData = await getAutoFillData(
      "corporate_training_inquiry",
      userToken,
    );

    if (autoFillData.success && autoFillData.data.contact_info) {
      console.log("Auto-fill data retrieved:", autoFillData.data);

      // Use the auto-fill data to populate form
      const preFilledForm = {
        form_type: "corporate_training_inquiry" as const,
        contact_info: autoFillData.data.contact_info,
        professional_info: autoFillData.data.professional_info,
        // User fills in specific training requirements
      };

      return preFilledForm;
    }
  } catch (error) {
    console.log("Auto-fill not available, user will fill manually");
    return null;
  }
}

// ===== EXAMPLE 4: Submit Educator Application =====

async function submitEducatorApplicationExample() {
  try {
    const formData = {
      form_type: "educator_application" as const,

      contact_info: {
        first_name: "Dr. Amit",
        last_name: "Kumar",
        full_name: "Dr. Amit Kumar",
        email: "amit.kumar@email.com",
        mobile_number: {
          country_code: "+91",
          number: "9123456789",
          formatted: "+91 91234 56789",
        },
        city: "Delhi",
        country: "India",
      },

      // Education & Experience
      education_info: {
        highest_qualification: "phd",
        specialization: "Computer Science",
        years_of_experience: "10+",
      },

      // Teaching Information
      teaching_info: {
        preferred_teaching_mode: "hybrid",
        engagement_type: ["part_time"],
        subject_areas: ["Data Science", "Machine Learning", "Python"],
        grade_levels: ["undergraduate", "postgraduate"],

        // IT Assets (as required by MEDH backend)
        it_assets: {
          has_computer: true,
          has_webcam: true,
          has_microphone: true,
          internet_quality: "excellent",
          teaching_platform_experience: true,
        },

        availability: {
          weekly_hours: "11-20",
          notice_period: "1_month",
        },
      },

      terms_accepted: true,
      privacy_policy_accepted: true,
    };

    const response = await submitUniversalForm(formData);
    console.log("Educator application submitted:", response);
  } catch (error) {
    console.error("Educator application failed:", error);
  }
}

// ===== EXAMPLE 5: Handle Form with Auto-fill =====

async function submitFormWithAutoFill(
  formType:
    | "candidate_application"
    | "educator_application"
    | "corporate_training_inquiry",
  userToken?: string,
) {
  let formData: any = { form_type: formType };

  // Try to get auto-fill data if user is logged in
  if (userToken) {
    try {
      const autoFillData = await getAutoFillData(formType, userToken);

      if (autoFillData.success) {
        // Merge auto-fill data with form
        formData = {
          ...formData,
          ...autoFillData.data,
          auto_filled: true,
          auto_fill_source: "user_profile",
        };

        console.log("Form pre-filled with user data");
      }
    } catch (error) {
      console.log("Auto-fill failed, continuing with empty form");
    }
  }

  // User completes the form...
  // Add user-specific data like message, requirements, etc.

  // Submit the form
  const response = await submitUniversalForm(formData);
  return response;
}

// ===== EXAMPLE 6: Real-time Countries Search =====

async function implementCountriesSearch() {
  const searchInput = "united"; // User types this

  try {
    const results = await getCountries({
      search: searchInput,
      format: "dropdown", // Gets label and value format
    });

    // Display in dropdown
    results.data.forEach((country) => {
      console.log(`${country.emoji} ${country.name} (+${country.phone})`);
    });

    // Example output:
    // 🇺🇸 United States (+1)
    // 🇬🇧 United Kingdom (+44)
    // 🇦🇪 United Arab Emirates (+971)
  } catch (error) {
    console.error("Search failed, using cached countries");
  }
}

// ===== EXAMPLE 7: Error Handling Best Practices =====

async function robustFormSubmission(formData: any) {
  try {
    const response = await submitUniversalForm(formData);

    // Success handling
    if (response.success) {
      // Show success message
      console.log(`✅ ${response.message}`);

      // Show next steps
      console.log(`📋 Next Steps: ${response.data.next_steps}`);

      // Show expected response time
      console.log(
        `⏰ Expected Response: ${response.data.estimated_response_time}`,
      );

      // Store confirmation number
      localStorage.setItem("last_application_id", response.data.application_id);

      return response;
    }
  } catch (error: any) {
    // Error handling
    console.error("❌ Form submission failed:", error.message);

    // Parse different types of errors
    if (error.message.includes("Validation failed")) {
      // Validation errors - show specific field errors
      console.log("Please check your form data and try again");
    } else if (error.message.includes("Authentication required")) {
      // Auth required for auto-fill
      console.log("Please log in to use auto-fill features");
    } else if (error.message.includes("Network")) {
      // Network error
      console.log("Please check your internet connection and try again");
    } else {
      // Generic error
      console.log("Something went wrong. Please try again later.");
    }

    // Don't lose user's form data on error
    localStorage.setItem("draft_form_data", JSON.stringify(formData));

    throw error;
  }
}

// ===== USAGE INSTRUCTIONS =====

/*

1. **Install Dependencies:**
   npm install axios  // or your HTTP client

2. **Configure API Base URL:**
   Update apiClient.js to use: http://localhost:8080/api/v1

3. **Import and Use:**
   import { submitUniversalForm, getCountries } from './refined-medh-universal-form-api';

4. **Test with Your Backend:**
   - Countries endpoint: GET /api/v1/forms/countries ✅ (confirmed working)
   - Form submission: POST /api/v1/forms/submit ✅ (implemented)
   - Auto-fill: GET /api/v1/forms/auto-fill (requires auth) ✅
   - Lookup: GET /api/v1/forms/lookup/:id ✅

5. **Response Format:**
   All endpoints return: { success: boolean, message: string, data: any }

6. **Error Handling:**
   - 400: Validation errors with detailed field messages
   - 401: Authentication required (for auto-fill)
   - 404: Form not found (for lookup)
   - 500: Server errors

*/

export {
  loadCountriesExample,
  submitCorporateTrainingExample,
  autoFillFormExample,
  submitEducatorApplicationExample,
  submitFormWithAutoFill,
  implementCountriesSearch,
  robustFormSubmission,
};
