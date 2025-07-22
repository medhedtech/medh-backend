# Demo Booking Form - Quick Start Guide

## 📋 Overview

Quick integration guide for the MEDH Demo Booking Form using the Universal Form API.

## 🚀 Basic Implementation

### 1. HTML Form Structure

```html
<form id="demo-booking-form">
  <!-- Age Selection -->
  <label>
    <input type="checkbox" name="is_student_under_16" id="under16" />
    Student is under 16 years old
  </label>

  <!-- Contact Information -->
  <input type="text" name="first_name" placeholder="First Name" required />
  <input type="text" name="last_name" placeholder="Last Name" required />
  <input type="email" name="email" placeholder="Email" required />

  <!-- Phone Number -->
  <select name="country_code" id="country-code">
    <option value="+91">India (+91)</option>
    <option value="+1">USA (+1)</option>
  </select>
  <input type="tel" name="phone" placeholder="Phone Number" required />

  <!-- Location -->
  <input type="text" name="city" placeholder="City" required />
  <select name="country" required>
    <option value="India">India</option>
    <option value="USA">USA</option>
  </select>

  <!-- Course Selection -->
  <div id="course-selection">
    <h3>Select Courses of Interest</h3>
    <!-- Courses loaded dynamically -->
  </div>

  <!-- Demo Timing -->
  <input type="date" name="preferred_date" min="2024-01-01" required />
  <select name="time_slot">
    <option value="09:00-10:00">9:00 AM - 10:00 AM</option>
    <option value="18:00-19:00">6:00 PM - 7:00 PM</option>
  </select>

  <!-- Consent -->
  <label>
    <input type="checkbox" name="terms_accepted" required />
    I agree to Terms & Privacy Policy
  </label>

  <button type="submit">Book Free Demo</button>
</form>
```

### 2. JavaScript Integration

```javascript
// Initialize form handler
document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("demo-booking-form");

  // Load courses and countries
  await loadCourses();
  await loadCountries();

  // Form submission
  form.addEventListener("submit", handleSubmit);
});

async function loadCourses() {
  try {
    const response = await fetch("/api/v1/forms/live-courses");
    const { success, data } = await response.json();

    if (success) {
      const container = document.getElementById("course-selection");
      data.forEach((course) => {
        container.innerHTML += `
          <label>
            <input type="checkbox" name="courses" value="${course.course_id}">
            ${course.title}
          </label>
        `;
      });
    }
  } catch (error) {
    console.error("Failed to load courses:", error);
  }
}

async function loadCountries() {
  try {
    const response = await fetch("/api/v1/forms/countries");
    const { success, data } = await response.json();

    if (success) {
      const countrySelect = document.querySelector('[name="country"]');
      const phoneSelect = document.querySelector('[name="country_code"]');

      countrySelect.innerHTML = "";
      phoneSelect.innerHTML = "";

      data.forEach((country) => {
        countrySelect.innerHTML += `<option value="${country.name}">${country.name}</option>`;
        phoneSelect.innerHTML += `<option value="${country.phone_code}">${country.name} (${country.phone_code})</option>`;
      });
    }
  } catch (error) {
    console.error("Failed to load countries:", error);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const selectedCourses = Array.from(
    document.querySelectorAll('[name="courses"]:checked'),
  ).map((cb) => cb.value);

  const payload = {
    form_type: "book_a_free_demo_session",
    is_student_under_16: formData.get("is_student_under_16") === "on",

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
      highest_qualification: "12th_passed", // Default or ask user
      currently_studying: true, // Default or ask user
      currently_working: false, // Default or ask user
      preferred_course: selectedCourses,
    },

    demo_session_details: {
      preferred_date: formData.get("preferred_date"),
      preferred_time_slot: formData.get("time_slot"),
      timezone: "Asia/Kolkata",
    },

    consent: {
      terms_and_privacy: formData.get("terms_accepted") === "on",
      data_collection_consent: formData.get("terms_accepted") === "on",
      marketing_consent: false,
    },

    captcha_token: "dummy_token", // Replace with actual CAPTCHA
  };

  try {
    const response = await fetch("/api/v1/forms/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      showSuccess(result.data.application_id);
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError("Something went wrong. Please try again.");
  }
}

function showSuccess(applicationId) {
  alert(`Demo booked successfully! Reference: ${applicationId}`);
  // Redirect or show success page
}

function showError(message) {
  alert(`Error: ${message}`);
}
```

## 🎯 Key API Endpoints

| Method | Endpoint                     | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| `POST` | `/api/v1/forms/submit`       | Submit demo booking           |
| `GET`  | `/api/v1/forms/live-courses` | Get available courses         |
| `GET`  | `/api/v1/forms/countries`    | Get countries list            |
| `GET`  | `/api/v1/forms/auto-fill`    | Get user data (auth required) |

## 📝 Required Fields

### For All Students

- `first_name`, `last_name`, `email`
- `mobile_number` (with country code)
- `city`, `country`
- `preferred_course` (at least 1)
- `terms_and_privacy` (must be true)

### For Students 16+

- `highest_qualification`
- `currently_studying`
- `currently_working`

### For Students Under 16

- `parent_details` with parent contact info
- `grade` level
- `school_name` (optional)

## ⚡ Minimal Example

```javascript
// Minimal demo booking submission
const minimalBooking = {
  form_type: "book_a_free_demo_session",
  is_student_under_16: false,

  contact_info: {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    mobile_number: { country_code: "+91", number: "9876543210" },
    city: "Mumbai",
    country: "India",
  },

  student_details: {
    name: "John Doe",
    highest_qualification: "12th_passed",
    currently_studying: true,
    currently_working: false,
    preferred_course: ["COURSE_ID_1"],
  },

  consent: {
    terms_and_privacy: true,
    data_collection_consent: true,
  },

  captcha_token: "token",
};

fetch("/api/v1/forms/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(minimalBooking),
});
```

## 🔧 Common Issues & Solutions

### Issue: "Validation failed" error

**Solution**: Check all required fields are present and correctly formatted.

```javascript
// Debug validation errors
.catch(async (response) => {
  if (response.status === 400) {
    const error = await response.json();
    console.log('Validation errors:', error.errors);
  }
});
```

### Issue: Courses not loading

**Solution**: Ensure API endpoint is accessible and returns proper format.

```javascript
// Test courses endpoint
fetch("/api/v1/forms/live-courses")
  .then((r) => r.json())
  .then((data) => console.log("Courses:", data));
```

### Issue: Phone validation fails

**Solution**: Ensure country code format is correct (+XX).

```javascript
// Correct phone format
mobile_number: {
  country_code: '+91',  // Include '+' sign
  number: '9876543210'  // Only digits
}
```

## 📱 Mobile-First CSS

```css
.demo-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section h3 {
  margin-bottom: 12px;
  font-size: 18px;
}

input,
select,
textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px; /* Prevents zoom on iOS */
}

.phone-input {
  display: flex;
  gap: 8px;
}

.phone-input select {
  flex: 0 0 120px;
}

.course-options {
  display: grid;
  gap: 8px;
}

.course-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.submit-btn {
  width: 100%;
  background: #007bff;
  color: white;
  padding: 16px;
  border: none;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 4px;
}

.success-message {
  color: #28a745;
  padding: 16px;
  background: #d4edda;
  border-radius: 6px;
  margin-bottom: 16px;
}
```

## 🚨 Security Checklist

- [ ] Implement CAPTCHA verification
- [ ] Validate all inputs server-side
- [ ] Rate limit form submissions
- [ ] Sanitize user inputs
- [ ] Use HTTPS for all API calls
- [ ] Implement CSRF protection

## 📊 Testing Checklist

- [ ] Test form with all required fields
- [ ] Test age-based form logic (under 16 vs 16+)
- [ ] Test course selection (single & multiple)
- [ ] Test phone number validation
- [ ] Test email format validation
- [ ] Test date/time selection
- [ ] Test error handling and display
- [ ] Test mobile responsiveness
- [ ] Test with slow network connections

## 🔗 Related Documentation

- [Complete Integration Guide](./DEMO_BOOKING_FORM_INTEGRATION_GUIDE.md) - Full detailed documentation
- [Universal Form API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Authentication API](./AUTHENTICATION_API_DOCUMENTATION.md) - For auto-fill functionality

---

**Need Help?** Contact the development team or check the full integration guide for detailed implementation examples.
