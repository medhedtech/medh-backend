import fs from "fs";
import path from "path";

import multer from "multer";

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    "image/jpeg": true,
    "image/png": true,
    "image/gif": true,
    "application/pdf": true,
    "application/msword": true,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
    "video/mp4": true,
    "video/webm": true,
    "application/zip": true,
    "text/plain": true,
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images, documents, videos, and zip files are allowed.",
      ),
      false,
    );
  }
};

// Configure upload limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10, // Maximum number of files
  },
});

// Handle file upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit of ${50 * 1024 * 1024} bytes.`,
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum number of files is 10.",
      });
    }
  }
  if (
    err.message ===
    "Invalid file type. Only images, documents, videos, and zip files are allowed."
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next(err);
};

// Clean up uploaded files on error
const cleanupUploadedFiles = (req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
  }
  if (req.files) {
    req.files.forEach((file) => {
      fs.unlink(file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadError,
  cleanupUploadedFiles,
};
