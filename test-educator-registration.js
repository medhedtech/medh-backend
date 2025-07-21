import { validateFormByType } from "./validations/universalFormValidation.js";

// Test data for educator_registration from the user's request
const testFormData = {
  form_type: "educator_registration",
  priority: "high",
  status: "submitted",
  source: "website_form",
  contact_info: {
    full_name: "Abhishek Jha",
    email: "abhijha903@gmail.com",
    phone_number: "+09343011613",
    country: "IN",
  },
  professional_info: {
    current_role: "teacher",
    experience_years: "1-3",
    expertise_areas: [
      "Digital Marketing",
      "Machine Learning",
      "Backend Development",
      "Full Stack Development",
      "Frontend Development",
      "Data Science & Analytics",
      "UI/UX Design",
      "DevOps & Cloud",
      "Mobile App Development",
      "Cybersecurity",
      "Quality Assurance",
      "Project Management",
      "Database Management",
      "Business Analysis",
    ],
    education_background: "btech",
    current_company: "",
  },
  teaching_preferences: {
    preferred_subjects: [
      "UI/UX Design",
      "Digital Marketing",
      "AWS Cloud",
      "Mobile Development",
      "Machine Learning",
      "Project Management",
      "Cybersecurity",
      "Quality Testing",
      "Database Design",
      "API Development",
      "JavaScript & React",
      "Java Development",
      "Python Programming",
      "Data Analytics",
    ],
    teaching_mode: [
      "Online Live Sessions",
      "Recorded Content",
      "One-on-One Mentoring",
      "In-Person Workshops",
    ],
    availability: "weekends",
    portfolio_links: "",
    demo_video_url: "",
    has_resume: false,
  },
  consent: {
    terms_accepted: true,
    background_check_consent: true,
  },
  additional_notes: "",
  submission_metadata: {
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    timestamp: "2025-07-19T11:28:27.415Z",
    referrer: "",
    form_version: "3.0",
    validation_passed: true,
  },
};

// Mock request and response objects
const mockReq = {
  body: testFormData,
};

const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log(`Status: ${code}`);
      console.log("Response:", JSON.stringify(data, null, 2));
      return mockRes;
    },
  }),
};

const mockNext = (error) => {
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("✅ Validation passed successfully!");
  }
};

console.log("🧪 Testing Educator Registration Form Validation");
console.log("=".repeat(60));

// Test the validation
validateFormByType(mockReq, mockRes, mockNext);

console.log("\n📋 Test Data Used:");
console.log(JSON.stringify(testFormData, null, 2));
