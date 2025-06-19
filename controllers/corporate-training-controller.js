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
      accept,
    } = req.body;

    // Validate required fields
    if (
      !full_name ||
      !email ||
      !country ||
      !phone_number ||
      !company_name ||
      !designation ||
      !company_website ||
      !message ||
      !accept
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields. Please fill in all mandatory information.',
        required_fields: [
          'full_name',
          'email',
          'country',
          'phone_number',
          'company_name',
          'designation',
          'company_website',
          'message',
          'accept',
        ],
      });
    }

    // Additional validation for phone number
    if (!phone_number.startsWith('+')) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must include country code',
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

    // Create corporate training inquiry using the universal form model
    const corporateForm = await UniversalForm.createCorporateTraining({
      full_name,
      email,
      country,
      phone_number,
      company_website,
      company_name,
      designation,
      message,
      accept,
    });

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
          'accept',
        ],
        field_descriptions: {
          full_name: 'Full name of the contact person',
          email: 'Valid email address',
          country: "Country name (e.g., 'India', 'United States')",
          phone_number:
            "Phone number with country code (e.g., '+911234567890')",
          designation: 'Job title/designation of the contact person',
          company_name: 'Name of the company',
          company_website: "Company website URL (e.g., 'https://company.com')",
          message: 'Detailed training requirements (minimum 20 characters)',
          accept: 'Must be true - acceptance of terms and privacy policy',
        },
        example_request: {
          full_name: 'John Doe',
          email: 'john.doe@company.com',
          country: 'India',
          phone_number: '+911234567890',
          designation: 'HR Manager',
          company_name: 'Tech Corp Ltd',
          company_website: 'https://techcorp.com',
          message:
            'We need comprehensive training for 50 employees on cloud technologies including AWS, Azure, and DevOps practices. Preferred timeline is next quarter.',
          accept: true,
        },
        validation_rules: {
          email: 'Must be valid email format',
          phone_number: 'Must include country code and be at least 10 digits',
          company_website: 'Must be valid URL format',
          message: 'Minimum 20 characters required',
          accept: 'Must be true',
        },
      },
    });
  } catch (err) {
    logger.error('Error fetching corporate form info', {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
