import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  validateFormByType,
  validateFormUpdateMiddleware,
  validateInternalNote,
  validateFormId,
  validateFormQuery
} from "../validations/universalFormValidation.js";
import {
  submitForm,
  getAllForms,
  getFormById,
  getFormByFormId,
  updateForm,
  assignForm,
  addInternalNote,
  deleteForm,
  getFormsByType,
  getPendingForms,
  getFormAnalytics,
  exportForms
} from "../controllers/universalFormController.js";

const router = express.Router();

// =========================================
// PUBLIC ROUTES
// =========================================

/**
 * @desc    Submit a new form (any type)
 * @route   POST /api/v1/forms/submit
 * @access  Public
 */
router.post('/submit', validateFormByType, submitForm);

/**
 * @desc    Get form status by form_id (public lookup)
 * @route   GET /api/v1/forms/lookup/:formId
 * @access  Public
 */
router.get('/lookup/:formId', getFormByFormId);

// =========================================
// PROTECTED ROUTES (ADMIN ONLY)
// =========================================

/**
 * @desc    Get all forms with filtering and pagination
 * @route   GET /api/v1/forms
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, validateFormQuery, getAllForms);

/**
 * @desc    Get form analytics and statistics
 * @route   GET /api/v1/forms/analytics
 * @access  Private (Admin)
 */
router.get('/analytics', authenticateToken, getFormAnalytics);

/**
 * @desc    Export forms to CSV
 * @route   GET /api/v1/forms/export
 * @access  Private (Admin)
 */
router.get('/export', authenticateToken, exportForms);

/**
 * @desc    Get pending forms
 * @route   GET /api/v1/forms/pending
 * @access  Private (Admin)
 */
router.get('/pending', authenticateToken, getPendingForms);

/**
 * @desc    Get forms by type
 * @route   GET /api/v1/forms/type/:formType
 * @access  Private (Admin)
 */
router.get('/type/:formType', authenticateToken, getFormsByType);

/**
 * @desc    Get form by ID
 * @route   GET /api/v1/forms/:id
 * @access  Private (Admin or Form Owner)
 */
router.get('/:id', authenticateToken, validateFormId, getFormById);

/**
 * @desc    Update form status and details
 * @route   PUT /api/v1/forms/:id
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, validateFormId, validateFormUpdateMiddleware, updateForm);

/**
 * @desc    Assign form to user
 * @route   PUT /api/v1/forms/:id/assign
 * @access  Private (Admin)
 */
router.put('/:id/assign', authenticateToken, validateFormId, assignForm);

/**
 * @desc    Add internal note to form
 * @route   POST /api/v1/forms/:id/notes
 * @access  Private (Admin)
 */
router.post('/:id/notes', authenticateToken, validateFormId, validateInternalNote, addInternalNote);

/**
 * @desc    Delete form (soft delete)
 * @route   DELETE /api/v1/forms/:id
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, validateFormId, deleteForm);

// =========================================
// CONVENIENCE ROUTES FOR SPECIFIC FORM TYPES
// =========================================

/**
 * @desc    Submit corporate training inquiry
 * @route   POST /api/v1/forms/corporate-training
 * @access  Public
 */
router.post('/corporate-training', (req, res, next) => {
  req.body.form_type = 'corporate_training_inquiry';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit placement form
 * @route   POST /api/v1/forms/placement
 * @access  Public
 */
router.post('/placement', (req, res, next) => {
  req.body.form_type = 'placement_form';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit enrollment form
 * @route   POST /api/v1/forms/enrollment
 * @access  Public
 */
router.post('/enrollment', (req, res, next) => {
  req.body.form_type = 'enrollment_form';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit contact form
 * @route   POST /api/v1/forms/contact
 * @access  Public
 */
router.post('/contact', (req, res, next) => {
  req.body.form_type = 'contact_form';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit feedback form
 * @route   POST /api/v1/forms/feedback
 * @access  Public
 */
router.post('/feedback', (req, res, next) => {
  req.body.form_type = 'feedback_form';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit consultation request
 * @route   POST /api/v1/forms/consultation
 * @access  Public
 */
router.post('/consultation', (req, res, next) => {
  req.body.form_type = 'consultation_request';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit partnership inquiry
 * @route   POST /api/v1/forms/partnership
 * @access  Public
 */
router.post('/partnership', (req, res, next) => {
  req.body.form_type = 'partnership_inquiry';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit demo request
 * @route   POST /api/v1/forms/demo
 * @access  Public
 */
router.post('/demo', (req, res, next) => {
  req.body.form_type = 'demo_request';
  next();
}, validateFormByType, submitForm);

/**
 * @desc    Submit support ticket
 * @route   POST /api/v1/forms/support
 * @access  Public
 */
router.post('/support', (req, res, next) => {
  req.body.form_type = 'support_ticket';
  next();
}, validateFormByType, submitForm);

// =========================================
// ADMIN CONVENIENCE ROUTES
// =========================================

/**
 * @desc    Get all corporate training inquiries
 * @route   GET /api/v1/forms/admin/corporate-training
 * @access  Private (Admin)
 */
router.get('/admin/corporate-training', authenticateToken, (req, res, next) => {
  req.params.formType = 'corporate_training_inquiry';
  next();
}, getFormsByType);

/**
 * @desc    Get all placement forms
 * @route   GET /api/v1/forms/admin/placement
 * @access  Private (Admin)
 */
router.get('/admin/placement', authenticateToken, (req, res, next) => {
  req.params.formType = 'placement_form';
  next();
}, getFormsByType);

/**
 * @desc    Get all enrollment forms
 * @route   GET /api/v1/forms/admin/enrollment
 * @access  Private (Admin)
 */
router.get('/admin/enrollment', authenticateToken, (req, res, next) => {
  req.params.formType = 'enrollment_form';
  next();
}, getFormsByType);

/**
 * @desc    Get all contact forms
 * @route   GET /api/v1/forms/admin/contact
 * @access  Private (Admin)
 */
router.get('/admin/contact', authenticateToken, (req, res, next) => {
  req.params.formType = 'contact_form';
  next();
}, getFormsByType);

/**
 * @desc    Get all feedback forms
 * @route   GET /api/v1/forms/admin/feedback
 * @access  Private (Admin)
 */
router.get('/admin/feedback', authenticateToken, (req, res, next) => {
  req.params.formType = 'feedback_form';
  next();
}, getFormsByType);

// =========================================
// BULK OPERATIONS
// =========================================

/**
 * @desc    Bulk update forms
 * @route   PUT /api/v1/forms/bulk/update
 * @access  Private (Admin)
 */
router.put('/bulk/update', authenticateToken, async (req, res, next) => {
  try {
    const { form_ids, updates } = req.body;
    
    if (!form_ids || !Array.isArray(form_ids) || form_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'form_ids array is required'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'updates object is required'
      });
    }

    const UniversalForm = (await import('../models/universal-form.model.js')).default;
    
    const result = await UniversalForm.updateMany(
      { 
        _id: { $in: form_ids },
        is_deleted: false 
      },
      { 
        ...updates,
        handled_by: req.user._id
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} forms updated successfully`,
      modified_count: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Bulk delete forms
 * @route   DELETE /api/v1/forms/bulk/delete
 * @access  Private (Admin)
 */
router.delete('/bulk/delete', authenticateToken, async (req, res, next) => {
  try {
    const { form_ids } = req.body;
    
    if (!form_ids || !Array.isArray(form_ids) || form_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'form_ids array is required'
      });
    }

    const UniversalForm = (await import('../models/universal-form.model.js')).default;
    
    const result = await UniversalForm.updateMany(
      { 
        _id: { $in: form_ids },
        is_deleted: false 
      },
      { 
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: req.user._id
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} forms deleted successfully`,
      deleted_count: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
});

export default router; 