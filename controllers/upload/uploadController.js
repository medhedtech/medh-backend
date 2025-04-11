import multer from "multer";

import { ENV_VARS } from "../../config/envVars.js";
import {
  uploadFile,
  uploadBase64File,
  UploadError,
} from "../../utils/uploadFile.js";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE,
    files: ENV_VARS.UPLOAD_CONSTANTS.MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    try {
      // Log file details for debugging
      console.log("Processing file:", {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      if (!file.mimetype) {
        throw new UploadError("File mimetype is missing", "INVALID_MIME_TYPE");
      }

      if (!ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[file.mimetype]) {
        throw new UploadError(
          `Invalid file type: ${file.mimetype}. Allowed types: ${Object.keys(ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES).join(", ")}`,
          "INVALID_FILE_TYPE",
        );
      }

      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  },
});

export const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      throw new UploadError("No file uploaded", "NO_FILE");
    }

    // Validate file size
    if (req.file.size > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
      throw new UploadError(
        `File size exceeds maximum limit of ${ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        "FILE_TOO_LARGE",
      );
    }

    const fileType = req.file.mimetype.split("/")[0];
    const ext = ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[req.file.mimetype];
    const key = `${fileType}s/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const uploadParams = {
      key,
      file: req.file.buffer,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
    };

    const result = await uploadFile(uploadParams);

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(error.code === "NO_FILE" ? 400 : 500).json({
      success: false,
      message: error.message,
      error: error.code,
    });
  }
};

export const handleBase64Upload = async (req, res) => {
  try {
    // Explicitly set CORS headers for the upload endpoint
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Accept, x-access-token",
      );
      res.header("Access-Control-Allow-Credentials", "true");
    }

    // Check that request body is not undefined
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new UploadError(
        "Empty request body. Please ensure you are sending valid JSON with Content-Type: application/json",
        "INVALID_REQUEST",
      );
    }

    // Log the request details without the base64 string for debugging
    const debugBody = {
      hasBase64String: !!req.body.base64String,
      fileType: req.body.fileType,
      base64Length: req.body.base64String ? req.body.base64String.length : 0,
      bodyKeys: Object.keys(req.body),
      origin: req.headers.origin || "No origin",
    };
    console.log("Base64 upload request details:", debugBody);

    const { base64String, fileType } = req.body;

    // Validate request body
    if (!base64String) {
      throw new UploadError(
        "No file data provided. Please include base64String in the request body",
        "NO_DATA",
      );
    }

    // Check if base64String is complete (not truncated)
    if (base64String.length < 100) {
      throw new UploadError(
        "Base64 string is too short. It may be truncated or incomplete.",
        "INVALID_BASE64_FORMAT",
      );
    }

    // Validate file type
    const validFileTypes = ["image", "document", "video"];
    if (!fileType || !validFileTypes.includes(fileType)) {
      throw new UploadError(
        `Invalid file type. Must be one of: ${validFileTypes.join(", ")}`,
        "INVALID_FILE_TYPE",
      );
    }

    // Validate base64 string format
    if (!base64String.startsWith("data:")) {
      throw new UploadError(
        'Invalid base64 string format. Must start with "data:"',
        "INVALID_BASE64_FORMAT",
      );
    }

    // Extract and validate MIME type from base64 string
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    if (!mimeTypeMatch) {
      throw new UploadError(
        "Invalid base64 string format. Missing MIME type",
        "INVALID_BASE64_FORMAT",
      );
    }

    const mimeType = mimeTypeMatch[1];

    // Validate MIME type based on fileType
    if (fileType === "video" && !mimeType.startsWith("video/")) {
      throw new UploadError(
        "Invalid MIME type for video. Expected video/*",
        "INVALID_MIME_TYPE",
      );
    } else if (fileType === "image" && !mimeType.startsWith("image/")) {
      throw new UploadError(
        "Invalid MIME type for image. Expected image/*",
        "INVALID_MIME_TYPE",
      );
    } else if (
      fileType === "document" &&
      !mimeType.startsWith("application/")
    ) {
      throw new UploadError(
        "Invalid MIME type for document. Expected application/*",
        "INVALID_MIME_TYPE",
      );
    }

    // Determine folder based on file type
    let folder;
    switch (fileType) {
      case "image":
        folder = "images";
        break;
      case "document":
        folder = "documents";
        break;
      case "video":
        folder = "videos";
        break;
      default:
        throw new UploadError("Invalid file type", "INVALID_FILE_TYPE");
    }

    const result = await uploadBase64File(base64String, fileType, folder);

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Base64 upload error:", error);
    res.status(error.code === "NO_DATA" ? 400 : 500).json({
      success: false,
      message: error.message,
      error: error.code,
    });
  }
};

export const handleMultipleUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new UploadError("No files uploaded", "NO_FILES");
    }

    // Validate total number of files
    if (req.files.length > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILES) {
      throw new UploadError(
        `Too many files. Maximum allowed is ${ENV_VARS.UPLOAD_CONSTANTS.MAX_FILES}`,
        "TOO_MANY_FILES",
      );
    }

    // Validate each file
    for (const file of req.files) {
      if (file.size > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
        throw new UploadError(
          `File "${file.originalname}" exceeds maximum size limit of ${ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
          "FILE_TOO_LARGE",
        );
      }
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileType = file.mimetype.split("/")[0];
      const ext = ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[file.mimetype];
      const key = `${fileType}s/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const uploadParams = {
        key,
        file: file.buffer,
        contentType: file.mimetype,
        fileSize: file.size,
      };

      return uploadFile(uploadParams);
    });

    const results = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      data: results.map((result) => result.data),
    });
  } catch (error) {
    console.error("Multiple upload error:", error);
    res.status(error.code === "NO_FILES" ? 400 : 500).json({
      success: false,
      message: error.message,
      error: error.code,
    });
  }
};

// Export the multer instance to be used in routes
export { upload };
