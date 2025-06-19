import mongoose from 'mongoose';

// Field validation schema for form fields
const fieldValidationSchema = new mongoose.Schema({
  required: { type: Boolean, default: false },
  minLength: { type: Number },
  maxLength: { type: Number },
  pattern: { type: String }, // Regex pattern for validation
  min: { type: Number }, // For number inputs
  max: { type: Number }, // For number inputs
  custom: { type: String } // Custom validation function name
}, { _id: false });

// Field option schema for select, radio, checkbox groups
const fieldOptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  selected: { type: Boolean, default: false }
}, { _id: false });

// Individual form field schema
const formFieldSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(name) {
        // Field name should be valid identifier
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
      },
      message: 'Field name must be a valid identifier'
    }
  },
  label: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'text', 'email', 'password', 'tel', 'url', 'number', 'date', 'datetime-local',
      'time', 'color', 'range', 'textarea', 'select', 'radio', 'checkbox', 
      'file', 'hidden', 'search'
    ]
  },
  placeholder: { type: String, trim: true },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  description: { type: String, trim: true },
  helpText: { type: String, trim: true },
  
  // Field attributes
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false }, // For select, file inputs
  
  // Input-specific properties
  prefix: { type: String, trim: true }, // For phone numbers, currencies
  suffix: { type: String, trim: true },
  mask: { type: String, trim: true }, // Input mask pattern
  
  // Options for select, radio, checkbox
  options: [fieldOptionSchema],
  
  // Validation rules
  validation: fieldValidationSchema,
  
  // Conditional logic
  conditional: {
    field: { type: String }, // Field name to depend on
    operator: { 
      type: String, 
      enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in']
    },
    value: { type: mongoose.Schema.Types.Mixed }, // Value to compare against
    action: { 
      type: String, 
      enum: ['show', 'hide', 'enable', 'disable', 'require', 'optional'],
      default: 'show'
    }
  },
  
  // Layout and styling
  layout: {
    width: { type: String, default: 'full' }, // full, half, third, quarter
    order: { type: Number, default: 0 },
    section: { type: String }, // Group fields into sections
    className: { type: String },
    style: { type: mongoose.Schema.Types.Mixed }
  },
  
  // Field metadata
  metadata: {
    group: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    version: { type: String, default: '1.0' }
  }
}, { _id: false });

// Submit button configuration
const submitButtonSchema = new mongoose.Schema({
  label: { type: String, default: 'Submit' },
  className: { type: String },
  style: { type: mongoose.Schema.Types.Mixed },
  loadingText: { type: String, default: 'Submitting...' },
  successText: { type: String, default: 'Submitted!' },
  disabled: { type: Boolean, default: false }
}, { _id: false });

// Form styling and layout configuration
const formStyleSchema = new mongoose.Schema({
  theme: { 
    type: String, 
    enum: ['default', 'modern', 'minimal', 'corporate', 'colorful'],
    default: 'default'
  },
  layout: {
    type: String,
    enum: ['vertical', 'horizontal', 'grid'],
    default: 'vertical'
  },
  columns: { type: Number, default: 1, min: 1, max: 4 },
  spacing: { 
    type: String,
    enum: ['compact', 'normal', 'relaxed'],
    default: 'normal'
  },
  borderRadius: { type: String, default: 'md' },
  shadow: { type: String, default: 'sm' },
  customCSS: { type: String },
  customJS: { type: String }
}, { _id: false });

// Form notifications configuration
const notificationSchema = new mongoose.Schema({
  email: {
    enabled: { type: Boolean, default: true },
    recipients: [{ type: String }], // Email addresses
    subject: { type: String },
    template: { type: String },
    attachSubmission: { type: Boolean, default: true }
  },
  sms: {
    enabled: { type: Boolean, default: false },
    recipients: [{ type: String }], // Phone numbers
    message: { type: String }
  },
  webhook: {
    enabled: { type: Boolean, default: false },
    url: { type: String },
    method: { type: String, enum: ['POST', 'PUT'], default: 'POST' },
    headers: { type: mongoose.Schema.Types.Mixed },
    authentication: {
      type: { type: String, enum: ['none', 'bearer', 'basic', 'api_key'] },
      credentials: { type: mongoose.Schema.Types.Mixed }
    }
  },
  slack: {
    enabled: { type: Boolean, default: false },
    webhook_url: { type: String },
    channel: { type: String },
    message_template: { type: String }
  }
}, { _id: false });

// Main form schema
const formSchemaModel = new mongoose.Schema({
  // Basic form information
  form_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(form_id) {
        return /^[a-zA-Z0-9_-]+$/.test(form_id);
      },
      message: 'Form ID must contain only letters, numbers, hyphens, and underscores'
    }
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  version: { type: String, default: '1.0.0' },
  
  // Form configuration
  fields: [formFieldSchema],
  submitButton: submitButtonSchema,
  
  // Messages and notifications
  confirmationMessage: { 
    type: String, 
    default: 'Thank you for your submission. We will get back to you soon.' 
  },
  errorMessage: { 
    type: String, 
    default: 'There was an error submitting your form. Please try again.' 
  },
  privacyNote: { type: String },
  
  // Form behavior settings
  settings: {
    allowMultipleSubmissions: { type: Boolean, default: true },
    requireAuthentication: { type: Boolean, default: false },
    enableCaptcha: { type: Boolean, default: false },
    enableSaveProgress: { type: Boolean, default: false },
    enableFileUploads: { type: Boolean, default: false },
    maxFileSize: { type: Number, default: 5242880 }, // 5MB in bytes
    allowedFileTypes: [{ type: String }], // MIME types
    redirectUrl: { type: String },
    showProgressBar: { type: Boolean, default: false },
    enableAnalytics: { type: Boolean, default: true }
  },
  
  // Form styling and layout
  styling: formStyleSchema,
  
  // Notifications configuration
  notifications: notificationSchema,
  
  // Form status and management
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  category: { 
    type: String,
    enum: [
      'contact', 'registration', 'application', 'survey', 'feedback', 
      'support', 'corporate_training', 'enrollment', 'assessment', 'other'
    ],
    default: 'other'
  },
  tags: [{ type: String, trim: true }],
  
  // Access control
  access: {
    public: { type: Boolean, default: true },
    allowedRoles: [{ type: String }],
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    ipWhitelist: [{ type: String }],
    domainWhitelist: [{ type: String }]
  },
  
  // Analytics and tracking
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 }, // in seconds
    lastSubmissionAt: { type: Date },
    popularFields: [{ 
      fieldName: String, 
      interactionCount: Number 
    }]
  },
  
  // Integration settings
  integrations: {
    crm: {
      enabled: { type: Boolean, default: false },
      provider: { type: String }, // salesforce, hubspot, etc.
      configuration: { type: mongoose.Schema.Types.Mixed }
    },
    emailMarketing: {
      enabled: { type: Boolean, default: false },
      provider: { type: String }, // mailchimp, sendgrid, etc.
      configuration: { type: mongoose.Schema.Types.Mixed }
    },
    database: {
      collection: { type: String, default: 'universal_forms' },
      customMapping: { type: mongoose.Schema.Types.Mixed }
    }
  },
  
  // Audit fields
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  published_at: { type: Date },
  archived_at: { type: Date }
}, {
  timestamps: true,
  collection: 'form_schemas'
});

// Indexes for better performance
formSchemaModel.index({ form_id: 1 });
formSchemaModel.index({ status: 1, category: 1 });
formSchemaModel.index({ created_at: -1 });
formSchemaModel.index({ 'analytics.totalSubmissions': -1 });
formSchemaModel.index({ tags: 1 });

// Pre-save middleware
formSchemaModel.pre('save', function(next) {
  this.updated_at = new Date();
  
  // Calculate conversion rate
  if (this.analytics.totalViews > 0) {
    this.analytics.conversionRate = (this.analytics.totalSubmissions / this.analytics.totalViews) * 100;
  }
  
  // Set published_at when status changes to active
  if (this.isModified('status') && this.status === 'active' && !this.published_at) {
    this.published_at = new Date();
  }
  
  next();
});

// Instance methods
formSchemaModel.methods.incrementViews = function() {
  this.analytics.totalViews += 1;
  return this.save();
};

formSchemaModel.methods.incrementSubmissions = function() {
  this.analytics.totalSubmissions += 1;
  this.analytics.lastSubmissionAt = new Date();
  return this.save();
};

formSchemaModel.methods.getFormConfig = function() {
  return {
    form_id: this.form_id,
    title: this.title,
    description: this.description,
    fields: this.fields,
    submitButton: this.submitButton,
    confirmationMessage: this.confirmationMessage,
    privacyNote: this.privacyNote,
    settings: this.settings,
    styling: this.styling
  };
};

formSchemaModel.methods.validateSubmission = function(submissionData) {
  const errors = [];
  
  this.fields.forEach(field => {
    const value = submissionData[field.name];
    
    // Check required fields
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push({
        field: field.name,
        message: `${field.label} is required`
      });
    }
    
    // Check field-specific validation
    if (value && field.validation) {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        errors.push({
          field: field.name,
          message: `${field.label} must be at least ${field.validation.minLength} characters`
        });
      }
      
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        errors.push({
          field: field.name,
          message: `${field.label} must be no more than ${field.validation.maxLength} characters`
        });
      }
      
      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.name,
            message: `${field.label} format is invalid`
          });
        }
      }
    }
  });
  
  return errors;
};

formSchemaModel.methods.getAnalytics = function() {
  return {
    totalViews: this.analytics.totalViews,
    totalSubmissions: this.analytics.totalSubmissions,
    conversionRate: this.analytics.conversionRate,
    averageCompletionTime: this.analytics.averageCompletionTime,
    lastSubmissionAt: this.analytics.lastSubmissionAt,
    popularFields: this.analytics.popularFields
  };
};

// Static methods
formSchemaModel.statics.getActiveForm = function(form_id) {
  return this.findOne({ form_id, status: 'active' });
};

formSchemaModel.statics.getFormsByCategory = function(category, status = 'active') {
  return this.find({ category, status }).sort({ created_at: -1 });
};

formSchemaModel.statics.createCorporateTrainingForm = function() {
  const corporateTrainingForm = {
    form_id: 'corporate_training_inquiry_v1',
    title: 'Corporate Training Inquiry',
    description: 'Let us help your team grow. Please share your training requirements so we can design a custom solution for your organization.',
    category: 'corporate_training',
    fields: [
      {
        name: 'full_name',
        label: 'Full Name',
        type: 'text',
        placeholder: 'Enter your full name',
        required: true,
        validation: {
          required: true,
          pattern: '^[a-zA-Z\\s\'-]+$'
        }
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'Enter your email address',
        required: true,
        validation: {
          required: true,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        }
      },
      {
        name: 'phone_number',
        label: 'Phone Number',
        type: 'tel',
        prefix: '+91',
        placeholder: 'Enter your phone number',
        required: true,
        validation: {
          required: true,
          minLength: 10
        }
      },
      {
        name: 'country',
        label: 'Country',
        type: 'select',
        placeholder: 'Select your country',
        required: true,
        options: [
          { label: 'Afghanistan', value: 'Afghanistan' },
          { label: 'Albania', value: 'Albania' },
          { label: 'Algeria', value: 'Algeria' },
          { label: 'India', value: 'India', selected: true },
          { label: 'United States', value: 'United States' },
          { label: 'United Kingdom', value: 'United Kingdom' }
          // Add more countries as needed
        ],
        validation: {
          required: true
        }
      },
      {
        name: 'designation',
        label: 'Designation / Job Title',
        type: 'text',
        placeholder: 'e.g., Learning & Development Manager',
        required: true,
        validation: {
          required: true
        }
      },
      {
        name: 'company_name',
        label: 'Company Name',
        type: 'text',
        placeholder: 'Enter your company\'s name',
        required: true,
        validation: {
          required: true
        }
      },
      {
        name: 'company_website',
        label: 'Company Website',
        type: 'url',
        placeholder: 'https://www.yourcompany.com',
        required: false,
        validation: {
          pattern: '^https?:\\/\\/.+'
        }
      },
      {
        name: 'training_requirements',
        label: 'Training Needs',
        type: 'textarea',
        placeholder: 'Describe your training goals, team size, preferred format (onsite/online), technologies or skills needed, and timeline.',
        required: true,
        validation: {
          required: true,
          minLength: 20
        }
      },
      {
        name: 'terms_accepted',
        label: 'I accept the Terms of Service and Privacy Policy',
        type: 'checkbox',
        required: true,
        validation: {
          required: true
        }
      }
    ],
    submitButton: {
      label: 'Submit Inquiry',
      loadingText: 'Submitting...',
      successText: 'Submitted Successfully!'
    },
    confirmationMessage: 'Thank you for reaching out! Our team will review your request and respond within 24–48 hours.',
    privacyNote: 'Your information is safe with us. We will never share your contact details without your consent.',
    settings: {
      enableCaptcha: true,
      enableAnalytics: true
    },
    status: 'active'
  };
  
  return this.create(corporateTrainingForm);
};

const FormSchema = mongoose.model('FormSchema', formSchemaModel);

export default FormSchema; 