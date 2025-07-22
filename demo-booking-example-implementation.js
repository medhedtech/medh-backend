/**
 * Demo Booking Form - Example Implementation
 * Complete working example for MEDH Universal Form API integration
 */

class DemoBookingFormHandler {
  constructor(config = {}) {
    this.config = {
      apiBaseUrl: "/api/v1",
      defaultTimezone: "Asia/Kolkata",
      enableAutoFill: true,
      requireCaptcha: true,
      maxCourseSelection: 5,
      ...config,
    };

    this.countries = [];
    this.courses = [];
    this.isLoading = false;
  }

  /**
   * Initialize the form handler
   */
  async init() {
    try {
      await Promise.all([this.loadCountries(), this.loadCourses()]);

      this.setupFormListeners();

      // Load auto-fill data if user is authenticated
      const authToken = this.getAuthToken();
      if (authToken && this.config.enableAutoFill) {
        await this.loadAutoFillData(authToken);
      }
    } catch (error) {
      console.error("Failed to initialize demo booking form:", error);
      this.showError("Failed to load form data. Please refresh the page.");
    }
  }

  /**
   * Load countries from API
   */
  async loadCountries() {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/forms/countries`);
      const result = await response.json();

      if (result.success) {
        this.countries = result.data;
        this.populateCountrySelects();
      } else {
        throw new Error(result.message || "Failed to load countries");
      }
    } catch (error) {
      console.error("Error loading countries:", error);
      // Fallback to basic countries list
      this.countries = [
        { name: "India", code: "IN", phone_code: "+91", popular: true },
        { name: "United States", code: "US", phone_code: "+1", popular: true },
      ];
      this.populateCountrySelects();
    }
  }

  /**
   * Load available courses from API
   */
  async loadCourses() {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/forms/live-courses`,
      );
      const result = await response.json();

      if (result.success) {
        this.courses = result.data;
        this.populateCourseSelection();
      } else {
        throw new Error(result.message || "Failed to load courses");
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      this.showError(
        "Failed to load courses. Some features may not work properly.",
      );
    }
  }

  /**
   * Load auto-fill data for authenticated users
   */
  async loadAutoFillData(authToken) {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/forms/auto-fill`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.fillFormWithUserData(result.data);
        }
      }
    } catch (error) {
      console.log("Auto-fill not available:", error.message);
      // Auto-fill failure is not critical, continue normally
    }
  }

  /**
   * Populate country dropdowns
   */
  populateCountrySelects() {
    const countrySelect = document.getElementById("country");
    const phoneCodeSelect = document.getElementById("country-code");

    if (countrySelect) {
      countrySelect.innerHTML = "";
      this.countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.name;
        option.textContent = country.name;
        if (country.popular) option.setAttribute("data-popular", "true");
        countrySelect.appendChild(option);
      });

      // Set default to India
      countrySelect.value = "India";
    }

    if (phoneCodeSelect) {
      phoneCodeSelect.innerHTML = "";
      this.countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.phone_code;
        option.textContent = `${country.name} (${country.phone_code})`;
        if (country.popular) option.setAttribute("data-popular", "true");
        phoneCodeSelect.appendChild(option);
      });

      // Set default to +91
      phoneCodeSelect.value = "+91";
    }
  }

  /**
   * Populate course selection checkboxes
   */
  populateCourseSelection() {
    const courseContainer = document.getElementById("course-selection");

    if (!courseContainer) return;

    courseContainer.innerHTML = "<h3>Select Courses of Interest</h3>";

    this.courses.forEach((course) => {
      const courseDiv = document.createElement("div");
      courseDiv.className = "course-option";

      courseDiv.innerHTML = `
        <label>
          <input type="checkbox" name="courses" value="${course.course_id}" 
                 data-course-title="${course.title}">
          <div class="course-info">
            <strong>${course.title}</strong>
            <span class="course-category">${course.category}</span>
            <span class="course-duration">${course.duration}</span>
          </div>
        </label>
      `;

      courseContainer.appendChild(courseDiv);
    });
  }

  /**
   * Fill form with user data (auto-fill)
   */
  fillFormWithUserData(autoFillData) {
    const { contact_info } = autoFillData;

    if (contact_info.first_name) {
      this.setFieldValue("first_name", contact_info.first_name);
    }

    if (contact_info.last_name) {
      this.setFieldValue("last_name", contact_info.last_name);
    }

    if (contact_info.email) {
      this.setFieldValue("email", contact_info.email);
    }

    if (contact_info.mobile_number) {
      if (contact_info.mobile_number.country_code) {
        this.setFieldValue(
          "country_code",
          contact_info.mobile_number.country_code,
        );
      }
      if (contact_info.mobile_number.number) {
        this.setFieldValue("phone", contact_info.mobile_number.number);
      }
    }

    if (contact_info.city) {
      this.setFieldValue("city", contact_info.city);
    }

    if (contact_info.country) {
      this.setFieldValue("country", contact_info.country);
    }

    this.showSuccess("Form auto-filled with your profile data", 3000);
  }

  /**
   * Setup form event listeners
   */
  setupFormListeners() {
    const form = document.getElementById("demo-booking-form");
    if (!form) return;

    // Form submission
    form.addEventListener("submit", (e) => this.handleSubmit(e));

    // Age checkbox change
    const ageCheckbox = document.getElementById("under16");
    if (ageCheckbox) {
      ageCheckbox.addEventListener("change", (e) =>
        this.handleAgeChange(e.target.checked),
      );
    }

    // Course selection limit
    const courseCheckboxes = document.querySelectorAll('[name="courses"]');
    courseCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.handleCourseSelection());
    });

    // Phone number formatting
    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", (e) =>
        this.formatPhoneNumber(e.target),
      );
    }

    // Real-time validation
    this.setupFieldValidation();
  }

  /**
   * Handle age checkbox change
   */
  handleAgeChange(isUnder16) {
    const studentFields = document.getElementById("student-fields-16plus");
    const parentFields = document.getElementById("parent-fields");

    if (isUnder16) {
      if (studentFields) studentFields.style.display = "none";
      if (parentFields) parentFields.style.display = "block";
    } else {
      if (studentFields) studentFields.style.display = "block";
      if (parentFields) parentFields.style.display = "none";
    }
  }

  /**
   * Handle course selection with limits
   */
  handleCourseSelection() {
    const selected = document.querySelectorAll('[name="courses"]:checked');
    const unselected = document.querySelectorAll(
      '[name="courses"]:not(:checked)',
    );

    if (selected.length >= this.config.maxCourseSelection) {
      unselected.forEach((checkbox) => {
        checkbox.disabled = true;
        checkbox.parentElement.classList.add("disabled");
      });
      this.showWarning(
        `Maximum ${this.config.maxCourseSelection} courses can be selected`,
        3000,
      );
    } else {
      unselected.forEach((checkbox) => {
        checkbox.disabled = false;
        checkbox.parentElement.classList.remove("disabled");
      });
    }
  }

  /**
   * Setup real-time field validation
   */
  setupFieldValidation() {
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");

    if (emailInput) {
      emailInput.addEventListener("blur", () => {
        this.validateEmail(emailInput.value, emailInput);
      });
    }

    if (phoneInput) {
      phoneInput.addEventListener("blur", () => {
        this.validatePhone(phoneInput.value, phoneInput);
      });
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    if (this.isLoading) return;

    this.isLoading = true;
    this.updateSubmitButton(true);
    this.clearMessages();

    try {
      const formData = this.collectFormData();
      const validationResult = this.validateFormData(formData);

      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult.errors);
        return;
      }

      const response = await this.submitToAPI(formData);
      this.handleSubmissionSuccess(response);
    } catch (error) {
      this.handleSubmissionError(error);
    } finally {
      this.isLoading = false;
      this.updateSubmitButton(false);
    }
  }

  /**
   * Collect form data
   */
  collectFormData() {
    const form = document.getElementById("demo-booking-form");
    const formData = new FormData(form);

    const selectedCourses = Array.from(
      document.querySelectorAll('[name="courses"]:checked'),
    ).map((cb) => cb.value);

    const isUnder16 = document.getElementById("under16")?.checked || false;

    return {
      form_type: "book_a_free_demo_session",
      is_student_under_16: isUnder16,

      contact_info: {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        email: formData.get("email"),
        mobile_number: {
          country_code: formData.get("country_code"),
          number: formData.get("phone"),
        },
        city: formData.get("city"),
        country: formData.get("country"),
      },

      student_details: {
        name: `${formData.get("first_name")} ${formData.get("last_name")}`,
        email: formData.get("email"),
        highest_qualification:
          formData.get("highest_qualification") || "12th_passed",
        currently_studying: formData.get("currently_studying") === "on",
        currently_working: formData.get("currently_working") === "on",
        education_institute_name: formData.get("institute_name"),
        preferred_course: selectedCourses,
        preferred_timings: formData.get("preferred_timings"),
      },

      demo_session_details: {
        preferred_date: formData.get("preferred_date"),
        preferred_time_slot: formData.get("time_slot"),
        timezone: this.config.defaultTimezone,
      },

      consent: {
        terms_and_privacy: formData.get("terms_accepted") === "on",
        data_collection_consent: formData.get("terms_accepted") === "on",
        marketing_consent: formData.get("marketing_consent") === "on",
      },

      captcha_token: this.getCaptchaToken(),
    };
  }

  /**
   * Validate form data
   */
  validateFormData(data) {
    const errors = {};

    // Required fields validation
    if (!data.contact_info.first_name)
      errors.first_name = "First name is required";
    if (!data.contact_info.last_name)
      errors.last_name = "Last name is required";
    if (!data.contact_info.email) errors.email = "Email is required";
    if (!data.contact_info.mobile_number.number)
      errors.phone = "Phone number is required";
    if (!data.contact_info.city) errors.city = "City is required";
    if (!data.student_details.preferred_course.length)
      errors.courses = "Please select at least one course";
    if (!data.consent.terms_and_privacy)
      errors.terms_accepted = "You must accept the terms and conditions";

    // Email format validation
    if (
      data.contact_info.email &&
      !this.isValidEmail(data.contact_info.email)
    ) {
      errors.email = "Please enter a valid email address";
    }

    // Phone format validation
    if (
      data.contact_info.mobile_number.number &&
      !this.isValidPhone(data.contact_info.mobile_number.number)
    ) {
      errors.phone = "Please enter a valid phone number";
    }

    // Date validation
    if (data.demo_session_details.preferred_date) {
      const selectedDate = new Date(data.demo_session_details.preferred_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        errors.preferred_date = "Please select a future date";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Submit data to API
   */
  async submitToAPI(formData) {
    const response = await fetch(`${this.config.apiBaseUrl}/forms/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.errors) {
        const error = new Error("Validation failed");
        error.validationErrors = result.errors;
        throw error;
      } else {
        throw new Error(result.message || "Submission failed");
      }
    }

    return result;
  }

  /**
   * Handle successful submission
   */
  handleSubmissionSuccess(response) {
    this.showSuccess(
      `Demo session booked successfully! Reference ID: ${response.data.application_id}`,
    );

    // Clear form
    document.getElementById("demo-booking-form").reset();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Optional: Redirect to success page
    // window.location.href = '/demo-booking-success';
  }

  /**
   * Handle submission error
   */
  handleSubmissionError(error) {
    console.error("Demo booking submission error:", error);

    if (error.validationErrors) {
      const errorMap = {};
      error.validationErrors.forEach((err) => {
        errorMap[err.path] = err.msg;
      });
      this.displayValidationErrors(errorMap);
    } else {
      this.showError(
        error.message || "Something went wrong. Please try again.",
      );
    }
  }

  /**
   * Utility methods
   */
  setFieldValue(fieldName, value) {
    const field =
      document.getElementById(fieldName) ||
      document.querySelector(`[name="${fieldName}"]`);
    if (field) field.value = value;
  }

  getAuthToken() {
    return (
      localStorage.getItem("authToken") ||
      document.querySelector('meta[name="auth-token"]')?.content
    );
  }

  getCaptchaToken() {
    // Implement your CAPTCHA logic here
    return "dummy_captcha_token";
  }

  isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }

  isValidPhone(phone) {
    return /^\d{10,15}$/.test(phone.replace(/\D/g, ""));
  }

  formatPhoneNumber(input) {
    const value = input.value.replace(/\D/g, "");
    input.value = value;
  }

  validateEmail(email, field) {
    if (email && !this.isValidEmail(email)) {
      this.showFieldError(field, "Please enter a valid email address");
      return false;
    } else {
      this.clearFieldError(field);
      return true;
    }
  }

  validatePhone(phone, field) {
    if (phone && !this.isValidPhone(phone)) {
      this.showFieldError(field, "Please enter a valid phone number");
      return false;
    } else {
      this.clearFieldError(field);
      return true;
    }
  }

  /**
   * UI Helper methods
   */
  updateSubmitButton(loading) {
    const button = document.querySelector('[type="submit"]');
    if (button) {
      button.disabled = loading;
      button.textContent = loading ? "Booking Demo..." : "Book Free Demo";
    }
  }

  displayValidationErrors(errors) {
    Object.keys(errors).forEach((fieldName) => {
      const field =
        document.getElementById(fieldName) ||
        document.querySelector(`[name="${fieldName}"]`);
      if (field) {
        this.showFieldError(field, errors[fieldName]);
      }
    });

    // Also show a general error message
    this.showError("Please correct the errors below and try again.");
  }

  showFieldError(field, message) {
    this.clearFieldError(field);

    field.classList.add("error");

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;

    field.parentNode.appendChild(errorDiv);
  }

  clearFieldError(field) {
    field.classList.remove("error");
    const existingError = field.parentNode.querySelector(".error-message");
    if (existingError) existingError.remove();
  }

  showSuccess(message, duration = 5000) {
    this.showMessage(message, "success", duration);
  }

  showError(message, duration = 5000) {
    this.showMessage(message, "error", duration);
  }

  showWarning(message, duration = 3000) {
    this.showMessage(message, "warning", duration);
  }

  showMessage(message, type = "info", duration = 5000) {
    // Remove existing messages
    this.clearMessages();

    const messageDiv = document.createElement("div");
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;

    const form = document.getElementById("demo-booking-form");
    form.parentNode.insertBefore(messageDiv, form);

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, duration);
    }
  }

  clearMessages() {
    const messages = document.querySelectorAll(".message");
    messages.forEach((msg) => msg.remove());
  }
}

/**
 * Initialize demo booking form when DOM is ready
 */
document.addEventListener("DOMContentLoaded", function () {
  const demoForm = new DemoBookingFormHandler({
    apiBaseUrl: "/api/v1", // Adjust as needed
    enableAutoFill: true,
    requireCaptcha: true,
  });

  demoForm.init().catch((error) => {
    console.error("Failed to initialize demo booking form:", error);
  });

  // Make available globally for debugging
  window.demoFormHandler = demoForm;
});

/**
 * CSS Classes that should be defined in your stylesheet:
 *
 * .course-option { margin-bottom: 8px; }
 * .course-info { margin-left: 8px; }
 * .course-category { color: #666; font-size: 0.9em; }
 * .course-duration { color: #999; font-size: 0.8em; }
 *
 * .error { border-color: #dc3545 !important; }
 * .error-message { color: #dc3545; font-size: 0.875em; margin-top: 4px; }
 *
 * .message { padding: 12px 16px; margin-bottom: 16px; border-radius: 4px; }
 * .message-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
 * .message-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
 * .message-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
 *
 * .disabled { opacity: 0.6; pointer-events: none; }
 */
