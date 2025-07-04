import UniversalForm from "../models/universal-form.model.js";
import logger from "../utils/logger.js";

// Create a new hire from medh inquiry
export const createHireFromMedh = async (req, res) => {
  try {
    const {
      full_name,
      email,
      country,
      phone,
      company_name,
      company_website,
      department,
      team_size,
      requirement_type,
      training_domain,
      start_date,
      budget_range,
      detailed_requirements,
      document_upload,
      terms_accepted,
    } = req.body;

    // Validate required fields based on the form schema
    if (
      !full_name ||
      !email ||
      !country ||
      !phone ||
      !company_name ||
      !department ||
      !team_size ||
      !requirement_type ||
      !training_domain ||
      !detailed_requirements ||
      !terms_accepted
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Please fill in all mandatory information.",
        required_fields: [
          "full_name", "email", "country", "phone", 
          "company_name", "department", "team_size", "requirement_type", 
          "training_domain", "detailed_requirements", "terms_accepted"
        ]
      });
    }

    // Additional validation for phone number
    if (!phone.startsWith('+')) {
      return res.status(400).json({
        success: false,
        message: "Phone number must include country code"
      });
    }

    // Additional validation for website URL (if provided)
    if (company_website) {
      const websiteRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9-]*)*$/;
      if (!websiteRegex.test(company_website)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid company website URL"
        });
      }
    }

    // Validate requirement type
    const validRequirementTypes = ['Hire Medh-trained Candidates', 'Corporate Upskilling/Training', 'Both'];
    if (!validRequirementTypes.includes(requirement_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement type. Must be one of: " + validRequirementTypes.join(', ')
      });
    }

    // Validate team size
    const validTeamSizes = ['1–5', '6–20', '21–50', '50+'];
    if (!validTeamSizes.includes(team_size)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team size. Must be one of: " + validTeamSizes.join(', ')
      });
    }

    // Validate detailed requirements length
    if (detailed_requirements.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Detailed requirements must be at least 20 characters long"
      });
    }

    // Validate terms acceptance
    if (terms_accepted !== true) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and privacy policy to proceed"
      });
    }

    // Create hire from medh inquiry using the universal form model
    const hireForm = await UniversalForm.createHireFromMedh({
      full_name,
      email,
      country,
      phone,
      company_name,
      company_website,
      department,
      team_size,
      requirement_type,
      training_domain,
      start_date,
      budget_range,
      detailed_requirements,
      document_upload,
      terms_accepted,
    });

    // Log the form submission
    logger.info('Hire from Medh inquiry submitted successfully', {
      form_id: hireForm.form_id,
      company_name,
      email,
      country,
      requirement_type,
      team_size,
      ip_address: req.ip || req.connection.remoteAddress
    });

    res.status(201).json({
      success: true,
      message: "✅ Thank you for submitting your request. Our partnerships team will contact you shortly.",
      data: {
        form_id: hireForm.form_id,
        submission_date: hireForm.submitted_at,
        status: hireForm.status,
        priority: hireForm.priority,
        requirement_type: hireForm.hire_requirements.requirement_type,
        team_size: hireForm.hire_requirements.team_size
      }
    });
  } catch (err) {
    logger.error('Error submitting hire from medh inquiry', {
      error: err.message,
      stack: err.stack,
      body: req.body
    });

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    res.status(500).json({ 
      success: false, 
      message: "Internal server error while processing your inquiry. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Retrieve all hire from medh inquiries
export const getAllHireFromMedh = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      requirement_type,
      team_size,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build query
    const query = { form_type: 'hire_from_medh_inquiry', is_deleted: false };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (requirement_type) query['hire_requirements.requirement_type'] = requirement_type;
    if (team_size) query['hire_requirements.team_size'] = team_size;
    
    // Pagination
    const skip = (page - 1) * limit;
    
    const hireInquiries = await UniversalForm.find(query)
      .sort({ submitted_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('form_id contact_info professional_info hire_requirements status priority submitted_at completion_percentage');
    
    const total = await UniversalForm.countDocuments(query);
    
    res.status(200).json({ 
      success: true, 
      data: hireInquiries,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (err) {
    logger.error('Error fetching hire from medh inquiries', {
      error: err.message,
      stack: err.stack,
      query: req.query
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error while fetching inquiries", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Retrieve a single hire from medh inquiry by ID
export const getHireFromMedhById = async (req, res) => {
  try {
    const hireInquiry = await UniversalForm.findOne({
      _id: req.params.id,
      form_type: 'hire_from_medh_inquiry',
      is_deleted: false
    });
    
    if (!hireInquiry) {
      return res.status(404).json({ 
        success: false, 
        message: "Hire from Medh inquiry not found" 
      });
    }
    
    res.status(200).json({ success: true, data: hireInquiry });
  } catch (err) {
    logger.error('Error fetching hire from medh inquiry', {
      error: err.message,
      stack: err.stack,
      id: req.params.id
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error while fetching inquiry", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update a hire from medh inquiry by ID
export const updateHireFromMedh = async (req, res) => {
  try {
    const { status, priority, assigned_to, internal_notes } = req.body;
    
    // Only allow specific fields to be updated
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assigned_to) updateData.assigned_to = assigned_to;
    
    // Add internal note if provided
    if (internal_notes) {
      const hireInquiry = await UniversalForm.findOne({
        _id: req.params.id,
        form_type: 'hire_from_medh_inquiry',
        is_deleted: false
      });
      
      if (hireInquiry) {
        await hireInquiry.addInternalNote(internal_notes, req.user?.id);
      }
    }

    const updatedHireInquiry = await UniversalForm.findOneAndUpdate(
      { 
        _id: req.params.id, 
        form_type: 'hire_from_medh_inquiry',
        is_deleted: false 
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedHireInquiry) {
      return res.status(404).json({ 
        success: false, 
        message: "Hire from Medh inquiry not found" 
      });
    }

    logger.info('Hire from Medh inquiry updated', {
      form_id: updatedHireInquiry.form_id,
      updated_by: req.user?.id,
      updates: updateData
    });

    res.status(200).json({ success: true, data: updatedHireInquiry });
  } catch (err) {
    logger.error('Error updating hire from medh inquiry', {
      error: err.message,
      stack: err.stack,
      id: req.params.id,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error while updating inquiry", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete (soft delete) a hire from medh inquiry by ID
export const deleteHireFromMedh = async (req, res) => {
  try {
    const deletedHireInquiry = await UniversalForm.findOneAndUpdate(
      { 
        _id: req.params.id, 
        form_type: 'hire_from_medh_inquiry',
        is_deleted: false 
      },
      {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: req.user?.id
      },
      { new: true }
    );

    if (!deletedHireInquiry) {
      return res.status(404).json({ 
        success: false, 
        message: "Hire from Medh inquiry not found" 
      });
    }

    logger.info('Hire from Medh inquiry deleted', {
      form_id: deletedHireInquiry.form_id,
      deleted_by: req.user?.id
    });

    res.status(200).json({ 
      success: true, 
      message: "Hire from Medh inquiry deleted successfully" 
    });
  } catch (err) {
    logger.error('Error deleting hire from medh inquiry', {
      error: err.message,
      stack: err.stack,
      id: req.params.id
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error while deleting inquiry", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get hire from medh form requirements and example
export const getHireFromMedhFormInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Hire from Medh form information",
      data: {
        form_type: "hire_from_medh_inquiry",
        title: "Hire from Medh – Corporate Talent & Upskilling Inquiry",
        description: "Connect with industry-ready professionals trained by Medh or request a custom training solution for your team.",
        required_fields: [
          "full_name",
          "email", 
          "country",
          "phone",
          "company_name",
          "department",
          "team_size",
          "requirement_type",
          "training_domain",
          "detailed_requirements",
          "terms_accepted"
        ],
        field_descriptions: {
          full_name: "Your full name",
          email: "Work email address",
          country: "Country name (e.g., 'India', 'United States')",
          phone: "Phone number with country code (e.g., '+911234567890')",
          company_name: "Name of your company",
          company_website: "Company website URL (optional)",
          department: "Department or function (e.g., 'Engineering', 'Marketing', 'HR')",
          team_size: "Team size for training or hiring",
          requirement_type: "What you need from Medh",
          training_domain: "Preferred domain or skills",
          start_date: "Expected start date (optional)",
          budget_range: "Budget range (optional)",
          detailed_requirements: "Detailed requirements (minimum 20 characters)",
          document_upload: "Upload JD or document (optional)",
          terms_accepted: "Must be true - acceptance of terms and privacy policy"
        },
        field_options: {
          team_size: ["1–5", "6–20", "21–50", "50+"],
          requirement_type: ["Hire Medh-trained Candidates", "Corporate Upskilling/Training", "Both"]
        },
        example_request: {
          full_name: "Radhika Sharma",
          email: "radhika@company.com",
          country: "India",
          phone: "+911234567890",
          company_name: "TechNova Solutions",
          company_website: "https://www.technova.com",
          department: "Engineering",
          team_size: "21–50",
          requirement_type: "Both",
          training_domain: "Full Stack Web Development, UI/UX, DevOps",
          start_date: "2024-02-01",
          budget_range: "₹50,000 – ₹1,00,000",
          detailed_requirements: "We are looking to hire 5 full-stack developers with experience in React, Node.js, and cloud technologies. Additionally, we need training for our existing team of 15 developers on modern DevOps practices including Docker, Kubernetes, and CI/CD pipelines. We prefer candidates with hands-on project experience and industry certifications.",
          terms_accepted: true
        },
        validation_rules: {
          email: "Must be valid email format",
          phone: "Must include country code and be at least 10 digits",
          company_website: "Must be valid URL format (if provided)",
          detailed_requirements: "Minimum 20 characters required",
          terms_accepted: "Must be true",
          team_size: "Must be one of the predefined options",
          requirement_type: "Must be one of the predefined options"
        },
        benefits: [
          "✅ Pre-trained, job-ready talent",
          "🎯 Custom training programs for your team", 
          "🛠️ Hands-on project-based learning",
          "📄 Certification from Medh",
          "💬 Dedicated hiring/training support",
          "🔁 Option to retrain or rehire as needed"
        ]
      }
    });
  } catch (err) {
    logger.error('Error fetching hire from medh form info', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get hire from medh analytics
export const getHireFromMedhAnalytics = async (req, res) => {
  try {
    const pipeline = [
      { $match: { form_type: 'hire_from_medh_inquiry', is_deleted: false } },
      {
        $group: {
          _id: null,
          total_inquiries: { $sum: 1 },
          by_requirement_type: {
            $push: '$hire_requirements.requirement_type'
          },
          by_team_size: {
            $push: '$hire_requirements.team_size'
          },
          by_status: {
            $push: '$status'
          },
          avg_completion_percentage: { $avg: '$completion_percentage' }
        }
      }
    ];

    const analytics = await UniversalForm.aggregate(pipeline);
    
    // Process the results for better visualization
    const result = analytics[0] || {
      total_inquiries: 0,
      by_requirement_type: [],
      by_team_size: [],
      by_status: [],
      avg_completion_percentage: 0
    };

    // Count occurrences
    const requirementTypeCounts = result.by_requirement_type.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const teamSizeCounts = result.by_team_size.reduce((acc, size) => {
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {});

    const statusCounts = result.by_status.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        total_inquiries: result.total_inquiries,
        avg_completion_percentage: Math.round(result.avg_completion_percentage || 0),
        breakdown: {
          by_requirement_type: requirementTypeCounts,
          by_team_size: teamSizeCounts,
          by_status: statusCounts
        }
      }
    });
  } catch (err) {
    logger.error('Error fetching hire from medh analytics', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Internal server error while fetching analytics", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}; 