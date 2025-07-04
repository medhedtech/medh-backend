import UniversalForm from '../models/universal-form.model.js';
import logger from '../utils/logger.js';

// Create a new corporate training inquiry
export const createCorporate = async (req, res) => {
  try {
    const {
      full_name,
      email,
      country,
      phone_number,
      company_website,
      company_name,
      designation,
      message,
      training_requirements,
      terms_accepted,
      accept,
    } = req.body;

    // Sanitize phone number: remove all non-digits except leading +
    const sanitizedPhone = phone_number ? phone_number.replace(/[^\d+]/g, '') : '';

    // Normalize terms acceptance
    const isTermsAccepted = terms_accepted || accept || false;

    // Prepare message - use training_requirements if message is not provided
    const formMessage = message || 
      (training_requirements && typeof training_requirements === 'string' 
        ? training_requirements 
        : (training_requirements?.message || ''));

    // Validate required fields with more flexibility
    const requiredFields = [
      { name: 'full_name', value: full_name },
      { name: 'email', value: email },
      { name: 'country', value: country },
      { name: 'phone_number', value: sanitizedPhone },
      { name: 'company_name', value: company_name },
      { name: 'designation', value: designation },
      { name: 'message', value: formMessage },
    ];

    const missingFields = requiredFields
      .filter(field => !field.value)
      .map(field => field.name);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields. Please fill in all mandatory information.',
        required_fields: missingFields,
      });
    }

    // Additional validation for phone number
    if (!sanitizedPhone.startsWith('+')) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must include country code',
      });
    }

    // Validate terms acceptance
    if (!isTermsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms and conditions',
      });
    }

    // Additional validation for website URL
    const websiteRegex = 
      /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9-]*)*$/;
    if (!websiteRegex.test(company_website)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid company website URL',
      });
    }

    // Prepare data for UniversalForm
    const corporateFormData = {
      form_type: 'corporate_training_inquiry',
      contact_info: {
        full_name,
        email,
        country,
        phone_number: sanitizedPhone,
      },
      professional_info: {
        designation,
        company_name,
        company_website,
      },
      message: formMessage,
      training_requirements: typeof training_requirements === 'object' ? training_requirements : {},
      terms_accepted: isTermsAccepted,
      privacy_policy_accepted: isTermsAccepted,
      priority: 'high',
      status: 'submitted',
    };

    // Create corporate training inquiry using the universal form model
    const corporateForm = await UniversalForm.createCorporateTraining(corporateFormData);

    // Log the form submission
    logger.info('Corporate training inquiry submitted successfully', {
      form_id: corporateForm.form_id,
      company_name,
      email,
      country,
      ip_address: req.ip || req.connection.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: 
        'Corporate training inquiry submitted successfully! We will contact you shortly.',
      data: {
        form_id: corporateForm.form_id,
        submission_date: corporateForm.submitted_at,
        status: corporateForm.status,
        priority: corporateForm.priority,
      },
    });
  } catch (err) {
    logger.error('Error submitting corporate training inquiry', {
      error: err.message,
      stack: err.stack,
      body: req.body,
    });

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map((error) => ({
        field: error.path,
        message: error.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message:
        'Internal server error while processing your inquiry. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Retrieve all corporate training inquiries
export const getAllCorporates = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {
      form_type: 'corporate_training_inquiry',
      is_deleted: false,
    };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Pagination
    const skip = (page - 1) * limit;

    const corporates = await UniversalForm.find(query)
      .sort({ submitted_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        'form_id contact_info professional_info message status priority submitted_at completion_percentage',
      );

    const total = await UniversalForm.countDocuments(query);

    res.status(200).json({
      success: true,
      data: corporates,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
      },
    });
  } catch (err) {
    logger.error('Error fetching corporate training inquiries', {
      error: err.message,
      stack: err.stack,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching inquiries',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Retrieve a single corporate training inquiry by ID
export const getCorporateById = async (req, res) => {
  try {
    const corporate = await UniversalForm.findOne({
      _id: req.params.id,
      form_type: 'corporate_training_inquiry',
      is_deleted: false,
    });

    if (!corporate) {
      return res.status(404).json({
        success: false,
        message: 'Corporate training inquiry not found',
      });
    }

    res.status(200).json({ success: true, data: corporate });
  } catch (err) {
    logger.error('Error fetching corporate training inquiry', {
      error: err.message,
      stack: err.stack,
      id: req.params.id,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching inquiry',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Update a corporate training inquiry by ID
export const updateCorporate = async (req, res) => {
  try {
    const { status, priority, assigned_to, internal_notes } = req.body;

    // Only allow specific fields to be updated
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assigned_to) updateData.assigned_to = assigned_to;

    // Add internal note if provided
    if (internal_notes) {
      const corporate = await UniversalForm.findOne({
        _id: req.params.id,
        form_type: 'corporate_training_inquiry',
        is_deleted: false,
      });

      if (corporate) {
        await corporate.addInternalNote(internal_notes, req.user?.id);
      }
    }

    const updatedCorporate = await UniversalForm.findOneAndUpdate(
      {
        _id: req.params.id,
        form_type: 'corporate_training_inquiry',
        is_deleted: false,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedCorporate) {
      return res.status(404).json({
        success: false,
        message: 'Corporate training inquiry not found',
      });
    }

    logger.info('Corporate training inquiry updated', {
      form_id: updatedCorporate.form_id,
      updated_by: req.user?.id,
      updates: updateData,
    });

    res.status(200).json({ success: true, data: updatedCorporate });
  } catch (err) {
    logger.error('Error updating corporate training inquiry', {
      error: err.message,
      stack: err.stack,
      id: req.params.id,
      body: req.body,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating inquiry',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Delete (soft delete) a corporate training inquiry by ID
export const deleteCorporate = async (req, res) => {
  try {
    const deletedCorporate = await UniversalForm.findOneAndUpdate(
      {
        _id: req.params.id,
        form_type: 'corporate_training_inquiry',
        is_deleted: false,
      },
      {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: req.user?.id,
      },
      { new: true },
    );

    if (!deletedCorporate) {
      return res.status(404).json({
        success: false,
        message: 'Corporate training inquiry not found',
      });
    }

    logger.info('Corporate training inquiry deleted', {
      form_id: deletedCorporate.form_id,
      deleted_by: req.user?.id,
    });

    res.status(200).json({
      success: true,
      message: 'Corporate training inquiry deleted successfully',
    });
  } catch (err) {
    logger.error('Error deleting corporate training inquiry', {
      error: err.message,
      stack: err.stack,
      id: req.params.id,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting inquiry',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Get corporate training form requirements and example
export const getCorporateFormInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Corporate training form information',
      data: {
        form_type: 'corporate_training_inquiry',
        required_fields: [
          'full_name',
          'email',
          'country',
          'phone_number',
          'designation',
          'company_name',
          'company_website',
          'message',
          'terms_accepted',
        ],
        optional_fields: [
          'training_requirements',
          'marketing_consent',
        ],
        field_descriptions: {
          full_name: 'Full name of the contact person',
          email: 'Valid business email address',
          country: "Country name (e.g., 'India', 'United States')",
          phone_number: "Phone number with country code (e.g., '+911234567890')",
          designation: 'Job title/designation of the contact person',
          company_name: 'Name of the company',
          company_website: "Company website URL (e.g., 'https://company.com')",
          message: 'Detailed training requirements (minimum 20 characters)',
          terms_accepted: 'Must be true - acceptance of terms and privacy policy',
          training_requirements: 'Optional detailed training needs (can be a string or object)',
          marketing_consent: 'Optional consent for marketing communications',
        },
        validation_rules: {
          full_name: {
            type: 'text',
            required: true,
            min_length: 2,
            max_length: 100,
            pattern: '^[a-zA-Z\\s\'-]+$'
          },
          email: {
            type: 'email',
            required: true,
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          },
          phone_number: {
            type: 'tel',
            required: true,
            pattern: '^\\+[1-9]\\d{1,14}$',
            description: 'Must include country code'
          },
          company_website: {
            type: 'url',
            required: true,
            pattern: '^(https?:\\/\\/)?([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}(\\/[a-zA-Z0-9-]*)*$'
          },
          terms_accepted: {
            type: 'boolean',
            required: true,
            must_be: true
          }
        },
        example_request: {
          full_name: 'John Doe',
          email: 'john.doe@company.com',
          country: 'India',
          phone_number: '+911234567890',
          designation: 'HR Manager',
          company_name: 'Tech Corp Ltd',
          company_website: 'https://techcorp.com',
          message: 'We need comprehensive training for 50 employees on cloud technologies including AWS, Azure, and DevOps practices. Preferred timeline is next quarter.',
          training_requirements: {
            course_category: 'Cloud Technologies',
            number_of_participants: 50,
            preferred_format: 'hybrid',
            topics: ['AWS', 'Azure', 'DevOps']
          },
          terms_accepted: true,
          marketing_consent: false
        },
        submission_notes: [
          'All required fields must be filled',
          'Phone number must include country code',
          'Company website must be a valid URL',
          'Terms must be accepted',
          'Message or training requirements must provide details'
        ]
      }
    });
  } catch (error) {
    logger.error('Error fetching corporate training form info', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve form information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
