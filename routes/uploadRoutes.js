const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload, handleUpload, handleBase64Upload, handleMultipleUpload } = require('../controllers/upload/uploadController');

/**
 * @route POST /api/v1/upload
 * @desc Upload a single file
 * @access Private
 * @body multipart/form-data with field 'file'
 */
router.post('/', 
  authenticate,
  upload.single('file'),
  handleUpload
);

/**
 * @route POST /api/v1/upload/multiple
 * @desc Upload multiple files (max 10)
 * @access Private
 * @body multipart/form-data with field 'files'
 */
router.post('/multiple',
  authenticate,
  upload.array('files', 10),
  handleMultipleUpload
);

/**
 * @route POST /api/v1/upload/base64
 * @desc Upload a base64 encoded file (for images and documents)
 * @access Private
 * @body { base64String: string, fileType: 'image' | 'document' }
 */
router.post('/base64',
  authenticate,
  handleBase64Upload
);

module.exports = router; 