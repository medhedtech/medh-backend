import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for single file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, and videos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4', 'video/webm'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, MP4, and WEBM files are allowed.'), false);
  }
};

// Configure upload limits
const uploadLimits = {
  fileSize: 50 * 1024 * 1024, // 50MB limit
  files: 1 // Single file upload
};

// Configure multiple upload limits
const multipleUploadLimits = {
  fileSize: 50 * 1024 * 1024, // 50MB limit per file
  files: 10 // Maximum 10 files
};

// Create multer instances
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: uploadLimits
});

const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: multipleUploadLimits
});

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum allowed is 10 files.'
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

export { upload, uploadMultiple }; 