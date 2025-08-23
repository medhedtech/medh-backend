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
  console.log('📁 Created uploads directory:', uploadDir);
}

// Ensure directory has proper permissions
try {
  fs.accessSync(uploadDir, fs.constants.W_OK);
  console.log('✅ Uploads directory is writable');
} catch (error) {
  console.error('❌ Uploads directory is not writable:', error.message);
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

// Configure disk storage for video uploads (temporary, for S3 streaming)
const videoUploadsDir = path.join(uploadDir, "videos");
if (!fs.existsSync(videoUploadsDir)) {
  fs.mkdirSync(videoUploadsDir, { recursive: true });
  console.log('📁 Created video uploads directory:', videoUploadsDir);
}

// Ensure video directory has proper permissions
try {
  fs.accessSync(videoUploadsDir, fs.constants.W_OK);
  console.log('✅ Video uploads directory is writable');
} catch (error) {
  console.error('❌ Video uploads directory is not writable:', error.message);
}

const videoDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(`📁 Storing video file: ${file.originalname} in ${videoUploadsDir}`);
    cb(null, videoUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `video-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log(`📝 Generated filename: ${filename}`);
    cb(null, filename);
  },
});

// Configure memory storage for smaller video uploads (for S3)
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

// Create multer instance for video uploads (disk storage to avoid RAM usage)
const uploadVideos = multer({
  storage: videoDiskStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB per file
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
