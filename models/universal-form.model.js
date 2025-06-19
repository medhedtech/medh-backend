import mongoose from "mongoose";

// Common contact information schema
const contactInfoSchema = new mongoose.Schema({
  full_name: { type: String, required: true, trim: true },
  first_name: { type: String, trim: true },
  last_name: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone_number: { type: String, trim: true },
  country: { type: String, trim: true },
  country_code: { type: String, trim: true, default: "+91" },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  postal_code: { type: String, trim: true },
}, { _id: false });

// Professional information schema
const professionalInfoSchema = new mongoose.Schema({
  designation: { type: String, trim: true },
  company_name: { type: String, trim: true },
  company_website: { type: String, trim: true },
  organization: { type: String, trim: true },
  industry: { type: String, trim: true },
  experience_level: { 
    type: String, 
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
    trim: true 
  },
  department: { type: String, trim: true },
  amount_per_session: { type: Number, min: 0 }, // For instructor forms
  category: { type: String, trim: true }, // For instructor/course category
}, { _id: false });

// Education information schema
const educationInfoSchema = new mongoose.Schema({
  highest_education: { type: String, trim: true },
  university: { type: String, trim: true },
  degree: { type: String, trim: true },
  field_of_study: { type: String, trim: true },
  graduation_year: { type: String, trim: true },
  gpa: { type: String, trim: true },
  school_institute_name: { type: String, trim: true }, // For school registration
}, { _id: false });

// Work experience schema
const workExperienceSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  company: { type: String, trim: true },
  location: { type: String, trim: true },
  start_date: { type: String, trim: true },
  end_date: { type: String, trim: true },
  current: { type: Boolean, default: false },
  description: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
  achievements: { type: String, trim: true },
}, { _id: false });

// Internship experience schema
const internshipSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  company: { type: String, trim: true },
  location: { type: String, trim: true },
  start_date: { type: String, trim: true },
  end_date: { type: String, trim: true },
  current: { type: Boolean, default: false },
  description: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
  supervisor: { type: String, trim: true },
  stipend: { type: String, trim: true },
}, { _id: false });

// Project schema
const projectSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
  github_url: { type: String, trim: true },
  demo_url: { type: String, trim: true },
  start_date: { type: String, trim: true },
  end_date: { type: String, trim: true },
  current: { type: Boolean, default: false },
  role: { type: String, trim: true },
  highlights: { type: String, trim: true },
  is_open_source: { type: Boolean, default: false },
  team_size: { type: Number, min: 1 },
}, { _id: false });

// Achievement schema
const achievementSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  date: { type: String, trim: true },
  issuer: { type: String, trim: true },
  category: { 
    type: String, 
    enum: ['academic', 'professional', 'competition', 'volunteer', 'other'],
    trim: true 
  },
  level: { 
    type: String, 
    enum: ['local', 'regional', 'national', 'international'],
    trim: true 
  },
}, { _id: false });

// Certification schema
const certificationSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  issuer: { type: String, trim: true },
  date: { type: String, trim: true },
  expiry: { type: String, trim: true },
  credential_id: { type: String, trim: true },
  url: { type: String, trim: true },
  score: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['active', 'expired', 'pending'],
    default: 'active' 
  },
}, { _id: false });

// Reference schema
const referenceSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  designation: { type: String, trim: true },
  company: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  relationship: { 
    type: String, 
    enum: ['supervisor', 'colleague', 'mentor', 'client', 'professor', 'other'],
    trim: true 
  },
  years_known: { type: Number, min: 0 },
}, { _id: false });

// Training requirements schema
const trainingRequirementsSchema = new mongoose.Schema({
  course_category: { type: String, trim: true },
  course_type: { type: String, trim: true },
  training_topics: [{ type: String, trim: true }],
  preferred_format: { 
    type: String, 
    enum: ['online', 'offline', 'hybrid', 'self-paced'],
    trim: true 
  },
  number_of_participants: { type: Number, min: 1 },
  duration_preference: { type: String, trim: true },
  budget_range: { type: String, trim: true },
  preferred_start_date: { type: Date },
  urgency_level: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium' 
  },
}, { _id: false });

// Files and documents schema
const fileSchema = new mongoose.Schema({
  resume_url: { type: String, trim: true },
  resume_file: { type: String, trim: true }, // For uploaded resume files
  portfolio_url: { type: String, trim: true },
  linkedin_profile: { type: String, trim: true },
  github_profile: { type: String, trim: true },
  website: { type: String, trim: true },
  user_image: { type: String, trim: true }, // Profile picture
  additional_documents: [{ 
    name: { type: String, trim: true },
    url: { type: String, trim: true },
    type: { type: String, trim: true },
    size: { type: Number },
    uploaded_at: { type: Date, default: Date.now }
  }],
}, { _id: false });

// Job preferences schema
const jobPreferencesSchema = new mongoose.Schema({
  preferred_location: [{ type: String, trim: true }],
  preferred_job_type: { 
    type: String, 
    enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
    trim: true 
  },
  preferred_work_type: { 
    type: String, 
    enum: ['remote', 'on-site', 'hybrid'],
    trim: true 
  },
  expected_salary: { type: String, trim: true },
  notice_period: { type: String, trim: true },
  willing_to_relocate: { type: Boolean, default: false },
  availability_date: { type: Date },
  job_title_interest: [{ type: String, trim: true }],
  industry_preference: [{ type: String, trim: true }],
}, { _id: false });

// Course enrollment preferences schema
const coursePreferencesSchema = new mongoose.Schema({
  course_category: { type: String, trim: true },
  course_type: { 
    type: String, 
    enum: ['online', 'offline', 'hybrid', 'self-paced', 'live'],
    trim: true 
  },
  learning_goals: { type: String, trim: true },
  experience_level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'],
    trim: true 
  },
  preferred_schedule: { type: String, trim: true },
  budget_range: { type: String, trim: true },
  preferred_start_date: { type: Date },
}, { _id: false });

// Personal details schema (for admin forms)
const personalDetailsSchema = new mongoose.Schema({
  age: { type: Number, min: 1, max: 120 },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    trim: true 
  },
  date_of_birth: { type: Date },
  nationality: { type: String, trim: true },
  languages_known: [{ type: String, trim: true }],
  marital_status: { 
    type: String, 
    enum: ['single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'],
    trim: true 
  },
}, { _id: false });

// Main universal form schema
const universalFormSchema = new mongoose.Schema(
  {
    // Form identification
    form_type: { 
      type: String, 
      required: true,
      enum: [
        // Contact & Inquiry Forms
        'contact_form',
        'blog_contact_form',
        'corporate_training_inquiry',
        
        // Registration Forms
        'general_registration',
        'school_registration',
        
        // Admin Forms
        'add_student_form',
        'add_instructor_form',
        
        // Enrollment Forms
        'course_enrollment',
        
        // Career Application Forms
        'job_application',
        'placement_form',
        
        // Additional Forms
        'feedback_form',
        'consultation_request',
        'partnership_inquiry',
        'demo_request',
        'support_ticket'
      ],
      index: true
    },
    form_id: { 
      type: String, 
      unique: true,
      default: function() {
        return `${this.form_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    },
    
    // User reference (optional - for logged-in users)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    
    // Core information (always present)
    contact_info: { 
      type: contactInfoSchema, 
      required: true 
    },
    
    // Message and communication
    message: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 2000
    },
    subject: { 
      type: String, 
      trim: true,
      maxlength: 200
    },
    
    // Conditional schemas based on form type
    professional_info: professionalInfoSchema,
    education_info: educationInfoSchema,
    personal_details: personalDetailsSchema,
    work_experience: [workExperienceSchema],
    internships: [internshipSchema],
    projects: [projectSchema],
    achievements: [achievementSchema],
    certifications: [certificationSchema],
    references: [referenceSchema],
    training_requirements: trainingRequirementsSchema,
    files: fileSchema,
    job_preferences: jobPreferencesSchema,
    course_preferences: coursePreferencesSchema,
    
    // Skills and languages
    skills: [{ type: String, trim: true }],
    languages_known: [{ type: String, trim: true }],
    
    // Form-specific fields
    // For corporate training
    company: { type: String, trim: true }, // For simple contact forms
    
    // For admin forms
    password: { type: String, trim: true }, // For manual password setting
    use_manual_password: { type: Boolean, default: false },
    role: { 
      type: String, 
      enum: ['student', 'instructor', 'admin'],
      default: 'student' 
    },
    
    // For enrollment forms
    course_name: { type: String, trim: true },
    
    // Additional information
    additional_info: { type: String, trim: true },
    
    // Additional flexible data
    custom_fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map()
    },
    
    // Consent and agreements
    terms_accepted: { 
      type: Boolean, 
      required: true,
      validate: {
        validator: function(v) {
          return v === true;
        },
        message: 'Terms and conditions must be accepted'
      }
    },
    privacy_policy_accepted: { 
      type: Boolean, 
      required: true,
      validate: {
        validator: function(v) {
          return v === true;
        },
        message: 'Privacy policy must be accepted'
      }
    },
    marketing_consent: { 
      type: Boolean, 
      default: false 
    },
    agree_terms: { // Alternative field name for some forms
      type: Boolean,
      default: function() {
        return this.terms_accepted;
      }
    },
    accept: { // Alternative field name for some forms
      type: Boolean,
      default: function() {
        return this.terms_accepted;
      }
    },
    
    // Status and workflow
    status: {
      type: String,
      enum: [
        'submitted',
        'received',
        'under_review',
        'in_progress',
        'shortlisted',
        'interviewed',
        'approved',
        'rejected',
        'completed',
        'cancelled',
        'on_hold'
      ],
      default: 'submitted',
      index: true
    },
    
    // Priority and categorization
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    
    // Assignment and handling
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    handled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    // Internal notes and tracking
    internal_notes: [{ 
      note: { type: String, trim: true },
      added_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      added_at: { type: Date, default: Date.now }
    }],
    
    // Communication history
    follow_up_required: { type: Boolean, default: false },
    follow_up_date: { type: Date },
    last_contacted: { type: Date },
    contact_attempts: { type: Number, default: 0 },
    
    // Source tracking
    source: { 
      type: String, 
      enum: ['website', 'mobile_app', 'admin_panel', 'api', 'import'],
      default: 'website'
    },
    referrer: { type: String, trim: true },
    utm_source: { type: String, trim: true },
    utm_medium: { type: String, trim: true },
    utm_campaign: { type: String, trim: true },
    
    // IP and device tracking
    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
    device_info: {
      type: { type: String, trim: true },
      os: { type: String, trim: true },
      browser: { type: String, trim: true }
    },
    
    // Multi-step form tracking
    current_step: { type: Number, default: 1 },
    total_steps: { type: Number, default: 1 },
    completed_steps: [{ type: Number }],
    step_data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map()
    },
    
    // Form validation and completion
    is_complete: { type: Boolean, default: false },
    completion_percentage: { type: Number, default: 0, min: 0, max: 100 },
    validation_errors: [{ 
      field: { type: String },
      message: { type: String },
      step: { type: Number }
    }],
    
    // Timestamps and audit
    submitted_at: { type: Date, default: Date.now },
    processed_at: { type: Date },
    completed_at: { type: Date },
    last_updated_at: { type: Date, default: Date.now },
    
    // Soft delete
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
universalFormSchema.index({ form_type: 1, status: 1 });
universalFormSchema.index({ 'contact_info.email': 1 });
universalFormSchema.index({ submitted_at: -1 });
universalFormSchema.index({ assigned_to: 1, status: 1 });
// Note: form_id index is already created via unique: true in schema
universalFormSchema.index({ user_id: 1, form_type: 1 });
universalFormSchema.index({ is_complete: 1, form_type: 1 });

// Virtual for processing time
universalFormSchema.virtual('processing_time').get(function() {
  if (this.processed_at && this.submitted_at) {
    return Math.floor((this.processed_at - this.submitted_at) / (1000 * 60 * 60)); // in hours
  }
  return null;
});

// Virtual for form age
universalFormSchema.virtual('form_age_days').get(function() {
  return Math.floor((Date.now() - this.submitted_at) / (1000 * 60 * 60 * 24));
});

// Virtual for full name (computed from first_name and last_name if available)
universalFormSchema.virtual('computed_full_name').get(function() {
  if (this.contact_info.first_name && this.contact_info.last_name) {
    return `${this.contact_info.first_name} ${this.contact_info.last_name}`;
  }
  return this.contact_info.full_name;
});

// Pre-save middleware
universalFormSchema.pre('save', function(next) {
  // Auto-generate form_id if not present
  if (!this.form_id) {
    this.form_id = `${this.form_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Update last_updated_at
  this.last_updated_at = new Date();
  
  // Set processed_at when status changes from submitted
  if (this.isModified('status') && this.status !== 'submitted' && !this.processed_at) {
    this.processed_at = new Date();
  }
  
  // Set completed_at when status is completed/approved/rejected
  if (this.isModified('status') && ['completed', 'approved', 'rejected'].includes(this.status) && !this.completed_at) {
    this.completed_at = new Date();
  }
  
  // Calculate completion percentage based on form type
  if (this.isModified() && !this.isModified('completion_percentage')) {
    this.completion_percentage = this.calculateCompletionPercentage();
  }
  
  // Set is_complete based on completion percentage
  this.is_complete = this.completion_percentage >= 90;
  
  // Sync alternative consent fields
  if (this.isModified('terms_accepted')) {
    this.agree_terms = this.terms_accepted;
    this.accept = this.terms_accepted;
  }
  
  next();
});

// Instance method to calculate completion percentage
universalFormSchema.methods.calculateCompletionPercentage = function() {
  let totalFields = 0;
  let completedFields = 0;
  
  // Core fields (always required)
  const coreFields = ['contact_info.full_name', 'contact_info.email', 'message'];
  coreFields.forEach(field => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });
  
  // Form-type specific required fields
  const requiredFieldsByType = {
    corporate_training_inquiry: [
      'contact_info.phone_number', 'professional_info.designation', 
      'professional_info.company_name', 'professional_info.company_website'
    ],
    placement_form: [
      'contact_info.first_name', 'contact_info.last_name', 'files.resume_url',
      'education_info.highest_education', 'education_info.university'
    ],
    job_application: [
      'contact_info.phone_number', 'contact_info.country'
    ],
    course_enrollment: [
      'contact_info.phone_number', 'course_preferences.course_category'
    ],
    add_student_form: [
      'personal_details.age', 'personal_details.gender', 'contact_info.phone_number'
    ],
    add_instructor_form: [
      'personal_details.age', 'personal_details.gender', 'professional_info.amount_per_session'
    ]
  };
  
  const specificFields = requiredFieldsByType[this.form_type] || [];
  specificFields.forEach(field => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });
  
  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
};

// Static methods for common queries
universalFormSchema.statics.findByFormType = function(formType, options = {}) {
  const query = { form_type: formType, is_deleted: false };
  return this.find(query, null, options);
};

universalFormSchema.statics.findPending = function(formType = null) {
  const query = { 
    status: { $in: ['submitted', 'under_review', 'in_progress'] },
    is_deleted: false
  };
  if (formType) query.form_type = formType;
  return this.find(query).sort({ submitted_at: -1 });
};

universalFormSchema.statics.findIncomplete = function(formType = null) {
  const query = { 
    is_complete: false,
    is_deleted: false
  };
  if (formType) query.form_type = formType;
  return this.find(query).sort({ last_updated_at: -1 });
};

universalFormSchema.statics.getFormStats = function(formType = null) {
  const matchStage = { is_deleted: false };
  if (formType) matchStage.form_type = formType;
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: { 
          $avg: { 
            $cond: [
              { $and: ['$processed_at', '$submitted_at'] },
              { $divide: [{ $subtract: ['$processed_at', '$submitted_at'] }, 1000 * 60 * 60] },
              null
            ]
          }
        },
        avgCompletionPercentage: { $avg: '$completion_percentage' }
      }
    }
  ]);
};

universalFormSchema.statics.getFormTypeStats = function() {
  return this.aggregate([
    { $match: { is_deleted: false } },
    {
      $group: {
        _id: '$form_type',
        total: { $sum: 1 },
        completed: { 
          $sum: { $cond: [{ $eq: ['$is_complete', true] }, 1, 0] }
        },
        pending: { 
          $sum: { $cond: [{ $in: ['$status', ['submitted', 'under_review', 'in_progress']] }, 1, 0] }
        },
        avgCompletionPercentage: { $avg: '$completion_percentage' }
      }
    },
    {
      $project: {
        form_type: '$_id',
        total: 1,
        completed: 1,
        pending: 1,
        completion_rate: { 
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
            0
          ]
        },
        avgCompletionPercentage: { $round: ['$avgCompletionPercentage', 2] }
      }
    }
  ]);
};

// Instance methods
universalFormSchema.methods.addInternalNote = function(note, userId) {
  this.internal_notes.push({
    note: note,
    added_by: userId,
    added_at: new Date()
  });
  return this.save();
};

universalFormSchema.methods.assignTo = function(userId) {
  this.assigned_to = userId;
  if (this.status === 'submitted') {
    this.status = 'under_review';
  }
  return this.save();
};

universalFormSchema.methods.updateStatus = function(newStatus, userId = null) {
  this.status = newStatus;
  if (userId) {
    this.handled_by = userId;
  }
  return this.save();
};

universalFormSchema.methods.markComplete = function() {
  this.is_complete = true;
  this.completion_percentage = 100;
  if (this.status === 'submitted' || this.status === 'under_review') {
    this.status = 'completed';
  }
  return this.save();
};

universalFormSchema.methods.updateStep = function(stepNumber, stepData = {}) {
  this.current_step = stepNumber;
  if (!this.completed_steps.includes(stepNumber)) {
    this.completed_steps.push(stepNumber);
  }
  
  // Update step data
  Object.keys(stepData).forEach(key => {
    this.step_data.set(`step_${stepNumber}_${key}`, stepData[key]);
  });
  
  // Update completion percentage
  this.completion_percentage = this.calculateCompletionPercentage();
  
  return this.save();
};

const UniversalForm = mongoose.model("UniversalForm", universalFormSchema);
export default UniversalForm; 