const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  highest_education: { type: String, required: true },
  university: { type: String, required: true },
  degree: { type: String, required: true },
  field_of_study: { type: String, required: true },
  graduation_year: { type: String, required: true },
  gpa: { type: String, required: true }
});

const workExperienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  startDate: { type: String, required: true },
  endDate: { type: String },
  current: { type: Boolean, default: false },
  description: { type: String, required: true },
  technologies: { type: String },
  achievements: { type: String }
});

const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  description: { type: String, required: true }
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  technologies: { type: String, required: true },
  githubUrl: { type: String },
  demoUrl: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  current: { type: Boolean, default: false },
  role: { type: String },
  highlights: { type: String },
  isOpenSource: { type: Boolean, default: false }
});

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  issuer: { type: String },
  date: { type: String, required: true },
  description: { type: String },
  url: { type: String }
});

const certificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  issuer: { type: String, required: true },
  date: { type: String, required: true },
  expiry: { type: String },
  credentialID: { type: String },
  url: { type: String }
});

const referenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String },
  company: { type: String },
  email: { type: String },
  phone: { type: String },
  relationship: { type: String }
});

const placementFormSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String, required: true },
    resumeUrl: { type: String, required: true },
    linkedin_profile: { type: String },
    github_profile: { type: String },
    portfolio_url: { type: String },
    website: { type: String },
    
    // Education details
    education: { type: educationSchema, required: true },
    skills: [{ type: String }],
    languages_known: { type: String, required: true },
    
    // Experience details
    work_experience: [workExperienceSchema],
    internships: [internshipSchema],
    
    // Projects and achievements
    projects: [projectSchema],
    achievements: [achievementSchema],
    certifications: [certificationSchema],
    
    // Preferences and additional info
    preferred_location: { type: String },
    preferred_job_type: { type: String },
    preferred_work_type: { type: String, required: true },
    expected_salary: { type: String },
    notice_period: { type: String },
    references: [referenceSchema],
    additional_info: { type: String },
    message: { type: String, required: true },
    willing_to_relocate: { type: Boolean, required: true },
    availability_date: { type: String },
    
    // Application status
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'shortlisted', 'interviewed', 'offered', 'rejected', 'accepted', 'withdrawn'],
      default: 'submitted'
    },
    application_notes: { type: String },
    interview_date: { type: Date },
    interviewer: { type: String },
    interview_feedback: { type: String }
  },
  { timestamps: true }
);

const PlacementForm = mongoose.model("PlacementForm", placementFormSchema);
module.exports = PlacementForm; 