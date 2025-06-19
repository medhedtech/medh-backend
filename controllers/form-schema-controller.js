import FormSchema from "../models/form-schema.model.js";
import UniversalForm from "../models/universal-form.model.js";
import logger from "../utils/logger.js";
import { validationResult } from "express-validator";

/**
 * @desc Create a new form schema
 * @route POST /api/v1/forms/schema
 * @access Private (Admin only)
 */
export const createFormSchema = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const formData = req.body;

    // Check if form_id already exists
    const existingForm = await FormSchema.findOne({ form_id: formData.form_id });
    if (existingForm) {
      return res.status(400).json({
        success: false,
        message: "Form ID already exists"
      });
    }

    // Create new form schema
    const formSchema = new FormSchema({
      ...formData,
      created_by: userId,
      updated_by: userId
    });

    await formSchema.save();

    logger.info('Form schema created successfully', {
      formId: formSchema.form_id,
      createdBy: userId,
      category: formSchema.category
    });

    res.status(201).json({
      success: true,
      message: "Form schema created successfully",
      data: {
        form_schema: formSchema,
        form_config: formSchema.getFormConfig()
      }
    });

  } catch (error) {
    logger.error('Error creating form schema', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while creating form schema",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Get all form schemas with filtering and pagination
 * @route GET /api/v1/forms/schema
 * @access Private (Admin only)
 */
export const getAllFormSchemas = async (req, res) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 10,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { form_id: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [formSchemas, totalCount] = await Promise.all([
      FormSchema.find(query)
        .populate('created_by', 'full_name email')
        .populate('updated_by', 'full_name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      FormSchema.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    logger.info('Form schemas retrieved successfully', {
      totalCount,
      page,
      limit,
      filters: { status, category, search }
    });

    res.status(200).json({
      success: true,
      message: "Form schemas retrieved successfully",
      data: {
        form_schemas: formSchemas,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: totalCount,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters: { status, category, search }
      }
    });

  } catch (error) {
    logger.error('Error retrieving form schemas', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving form schemas",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Get a specific form schema by ID or form_id
 * @route GET /api/v1/forms/schema/:identifier
 * @access Public (for active forms) / Private (for all forms)
 */
export const getFormSchema = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { config_only = false } = req.query;

    // Try to find by form_id first, then by _id
    let formSchema = await FormSchema.findOne({ form_id: identifier });
    if (!formSchema) {
      formSchema = await FormSchema.findById(identifier);
    }

    if (!formSchema) {
      return res.status(404).json({
        success: false,
        message: "Form schema not found"
      });
    }

    // Check access permissions
    const isPublicAccess = !req.user;
    const isAdmin = req.user && ['admin', 'super-admin'].includes(req.user.role);

    if (isPublicAccess && formSchema.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: "This form is not currently available"
      });
    }

    if (isPublicAccess && !formSchema.access.public) {
      return res.status(403).json({
        success: false,
        message: "This form requires authentication"
      });
    }

    // Increment view count for active forms
    if (formSchema.status === 'active') {
      await formSchema.incrementViews();
    }

    // Return appropriate response based on request type
    const responseData = config_only === 'true' 
      ? { form_config: formSchema.getFormConfig() }
      : { form_schema: formSchema };

    logger.info('Form schema retrieved successfully', {
      formId: formSchema.form_id,
      identifier,
      isPublicAccess,
      configOnly: config_only
    });

    res.status(200).json({
      success: true,
      message: "Form schema retrieved successfully",
      data: responseData
    });

  } catch (error) {
    logger.error('Error retrieving form schema', {
      error: error.message,
      stack: error.stack,
      identifier: req.params.identifier
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving form schema",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Update a form schema
 * @route PUT /api/v1/forms/schema/:id
 * @access Private (Admin only)
 */
export const updateFormSchema = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const updateData = { ...req.body, updated_by: userId };

    // Check if form_id is being changed and if it conflicts with existing forms
    if (updateData.form_id) {
      const existingForm = await FormSchema.findOne({ 
        form_id: updateData.form_id, 
        _id: { $ne: id } 
      });
      if (existingForm) {
        return res.status(400).json({
          success: false,
          message: "Form ID already exists"
        });
      }
    }

    const updatedFormSchema = await FormSchema.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('created_by updated_by', 'full_name email');

    if (!updatedFormSchema) {
      return res.status(404).json({
        success: false,
        message: "Form schema not found"
      });
    }

    logger.info('Form schema updated successfully', {
      formId: updatedFormSchema.form_id,
      updatedBy: userId,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: "Form schema updated successfully",
      data: {
        form_schema: updatedFormSchema,
        form_config: updatedFormSchema.getFormConfig()
      }
    });

  } catch (error) {
    logger.error('Error updating form schema', {
      error: error.message,
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while updating form schema",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Delete a form schema (soft delete)
 * @route DELETE /api/v1/forms/schema/:id
 * @access Private (Admin only)
 */
export const deleteFormSchema = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Hard delete - only for super admins
      if (req.user.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          message: "Only super admins can permanently delete form schemas"
        });
      }

      const deletedForm = await FormSchema.findByIdAndDelete(id);
      if (!deletedForm) {
        return res.status(404).json({
          success: false,
          message: "Form schema not found"
        });
      }

      logger.warn('Form schema permanently deleted', {
        formId: deletedForm.form_id,
        deletedBy: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: "Form schema permanently deleted"
      });
    }

    // Soft delete - archive the form
    const archivedForm = await FormSchema.findByIdAndUpdate(
      id,
      { 
        status: 'archived', 
        archived_at: new Date(),
        updated_by: req.user.id
      },
      { new: true }
    );

    if (!archivedForm) {
      return res.status(404).json({
        success: false,
        message: "Form schema not found"
      });
    }

    logger.info('Form schema archived', {
      formId: archivedForm.form_id,
      archivedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: "Form schema archived successfully",
      data: { form_schema: archivedForm }
    });

  } catch (error) {
    logger.error('Error deleting form schema', {
      error: error.message,
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while deleting form schema",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Submit form data based on form schema
 * @route POST /api/v1/forms/schema/:form_id/submit
 * @access Public
 */
export const submitFormSchema = async (req, res) => {
  try {
    const { form_id } = req.params;
    const submissionData = req.body;

    // Get the form schema
    const formSchema = await FormSchema.getActiveForm(form_id);
    if (!formSchema) {
      return res.status(404).json({
        success: false,
        message: "Form not found or not active"
      });
    }

    // Check access permissions
    if (!formSchema.access.public && !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required for this form"
      });
    }

    // Validate submission data
    const validationErrors = formSchema.validateSubmission(submissionData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Create universal form entry based on form schema
    const universalFormData = {
      form_type: formSchema.category === 'corporate_training' ? 'corporate_training_inquiry' : 'custom_form',
      form_schema_id: formSchema._id,
      form_schema_version: formSchema.version,
      
      // Map submission data to universal form structure
      contact_info: {
        full_name: submissionData.full_name,
        email: submissionData.email,
        phone_number: submissionData.phone_number,
        country: submissionData.country
      },
      
      professional_info: {
        designation: submissionData.designation,
        company_name: submissionData.company_name,
        company_website: submissionData.company_website
      },
      
      message: submissionData.training_requirements || submissionData.message,
      
      // Store all submission data in custom_fields
      custom_fields: submissionData,
      
      // Consent fields
      terms_accepted: submissionData.terms_accepted || false,
      privacy_policy_accepted: submissionData.terms_accepted || false,
      
      // Metadata
      metadata: {
        form_schema_id: formSchema._id,
        form_id: form_id,
        submission_source: 'dynamic_form',
        user_agent: req.headers['user-agent'],
        ip_address: req.ip,
        submission_timestamp: new Date()
      }
    };

    // Create the universal form entry
    const universalForm = new UniversalForm(universalFormData);
    await universalForm.save();

    // Increment form schema submission count
    await formSchema.incrementSubmissions();

    logger.info('Form submitted successfully', {
      formId: form_id,
      submissionId: universalForm._id,
      userId: req.user?.id,
      submitterEmail: submissionData.email
    });

    res.status(201).json({
      success: true,
      message: formSchema.confirmationMessage || "Form submitted successfully",
      data: {
        submission_id: universalForm._id,
        form_id: universalForm.form_id,
        submitted_at: universalForm.submitted_at,
        status: universalForm.status
      }
    });

  } catch (error) {
    logger.error('Error submitting form', {
      error: error.message,
      stack: error.stack,
      formId: req.params.form_id,
      submissionData: req.body
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while submitting form",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Get form analytics
 * @route GET /api/v1/forms/schema/:id/analytics
 * @access Private (Admin only)
 */
export const getFormAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d', detailed = false } = req.query;

    const formSchema = await FormSchema.findById(id);
    if (!formSchema) {
      return res.status(404).json({
        success: false,
        message: "Form schema not found"
      });
    }

    // Get basic analytics from form schema
    const basicAnalytics = formSchema.getAnalytics();

    // Get submission data from UniversalForm for detailed analytics
    let detailedAnalytics = {};
    if (detailed === 'true') {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const periodDays = parseInt(period.replace('d', '')) || 30;
      startDate.setDate(endDate.getDate() - periodDays);

      // Get submissions in the period
      const submissions = await UniversalForm.find({
        form_schema_id: formSchema._id,
        submitted_at: { $gte: startDate, $lte: endDate }
      }).select('submitted_at custom_fields metadata');

      detailedAnalytics = {
        timeAnalytics: calculateTimeAnalytics(submissions),
        fieldAnalytics: calculateFieldAnalytics(submissions, formSchema.fields),
        submissionTrend: calculateSubmissionTrend(submissions)
      };
    }

    logger.info('Form analytics retrieved', {
      formId: formSchema.form_id,
      period,
      detailed,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: "Form analytics retrieved successfully",
      data: {
        basic: basicAnalytics,
        ...(detailed === 'true' && { detailed: detailedAnalytics }),
        period,
        generated_at: new Date()
      }
    });

  } catch (error) {
    logger.error('Error retrieving form analytics', {
      error: error.message,
      stack: error.stack,
      id: req.params.id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving analytics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Create the default corporate training form
 * @route POST /api/v1/forms/schema/create-corporate-training
 * @access Private (Admin only)
 */
export const createCorporateTrainingForm = async (req, res) => {
  try {
    // Check if corporate training form already exists
    const existingForm = await FormSchema.findOne({ 
      form_id: 'corporate_training_inquiry_v1' 
    });

    if (existingForm) {
      return res.status(409).json({
        success: false,
        message: "Corporate training form already exists",
        data: {
          existing_form: existingForm,
          form_config: existingForm.getFormConfig()
        }
      });
    }

    // Create the corporate training form using the static method
    const corporateForm = await FormSchema.createCorporateTrainingForm();
    
    // Set creator information
    corporateForm.created_by = req.user.id;
    corporateForm.updated_by = req.user.id;
    await corporateForm.save();

    logger.info('Corporate training form created successfully', {
      formId: corporateForm.form_id,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Corporate training form created successfully",
      data: {
        form_schema: corporateForm,
        form_config: corporateForm.getFormConfig()
      }
    });

  } catch (error) {
    logger.error('Error creating corporate training form', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while creating corporate training form",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper functions for analytics
const calculateTimeAnalytics = (submissions) => {
  if (!submissions.length) return { averageTime: 0, peakHours: [], peakDays: [] };

  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);

  submissions.forEach(submission => {
    const date = new Date(submission.submitted_at);
    hourCounts[date.getHours()]++;
    dayCounts[date.getDay()]++;
  });

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts));

  return {
    averageTime: submissions.length > 0 ? submissions.reduce((acc, sub) => {
      return acc + (sub.metadata?.completion_time || 0);
    }, 0) / submissions.length : 0,
    peakHours: [peakHour],
    peakDays: [peakDay],
    hourlyDistribution: hourCounts,
    dailyDistribution: dayCounts
  };
};

const calculateFieldAnalytics = (submissions, fields) => {
  if (!submissions.length || !fields.length) return [];

  return fields.map(field => {
    const fieldData = submissions.map(sub => sub.custom_fields?.[field.name]).filter(Boolean);
    const completionRate = (fieldData.length / submissions.length) * 100;

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      completionRate: Math.round(completionRate * 100) / 100,
      totalResponses: fieldData.length,
      fieldType: field.type
    };
  });
};

const calculateSubmissionTrend = (submissions) => {
  if (!submissions.length) return [];

  const dailySubmissions = {};
  
  submissions.forEach(submission => {
    const date = new Date(submission.submitted_at).toISOString().split('T')[0];
    dailySubmissions[date] = (dailySubmissions[date] || 0) + 1;
  });

  return Object.entries(dailySubmissions)
    .map(([date, count]) => ({ date, submissions: count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

export default {
  createFormSchema,
  getAllFormSchemas,
  getFormSchema,
  updateFormSchema,
  deleteFormSchema,
  submitFormSchema,
  getFormAnalytics,
  createCorporateTrainingForm
}; 