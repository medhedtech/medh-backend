import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import multer from "multer";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads");
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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

// Configure memory storage for video uploads (for S3)
const memoryStorage = multer.memoryStorage();

// File filter function for general uploads
const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, and videos
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, PDF, MP4, and WEBM files are allowed.",
      ),
      false,
    );
  }
};

// File filter function for video uploads
const videoFileFilter = (req, file, cb) => {
  // Allow only video files
  const allowedTypes = [
    "video/mp4",
    "video/mov",
    "video/webm",
    "video/avi",
    "video/mkv",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only MP4, MOV, WebM, AVI, and MKV files are allowed.",
      ),
      false,
    );
  }
};

// Configure upload limits
const uploadLimits = {
  fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
  files: 1, // Single file upload
};

// Configure multiple upload limits
const multipleUploadLimits = {
  fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit per file
  files: 10, // Maximum 10 files
};

// Create multer instances
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: uploadLimits,
});

const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: multipleUploadLimits,
});

// Create multer instance for video uploads (memory storage for S3)
const uploadVideos = multer({
  storage: memoryStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file
    files: 10, // Maximum 10 files
  },
});

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      req.fileError = `File size exceeds limit of ${uploadLimits.fileSize} bytes.`;
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      req.fileError = "Too many files or invalid field name.";
    }
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

export { upload, uploadMultiple, uploadVideos };
