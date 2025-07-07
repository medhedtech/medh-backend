import multer from "multer";

import { ENV_VARS } from "../../config/envVars.js";
import {
  uploadFile,
  uploadBase64File,
  uploadBase64FileOptimized,
  uploadBase64FileChunked,
  UploadError,
} from "../../utils/uploadFile.js";
import {
  migrateImageToDocumentsBucket,
  shouldMigrateFromOldBucket,
} from "../../utils/s3BucketManager.js";

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

    // Generate key with original filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const originalFilename = req.file.originalname;

    // Clean the original filename (remove special characters, spaces, etc.)
    const cleanFilename = originalFilename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "");

    // Ensure the filename has the correct extension
    const filenameWithoutExt = cleanFilename.replace(/\.[^/.]+$/, "");
    const key = `${fileType}s/${timestamp}-${randomStr}-${filenameWithoutExt}.${ext}`;

    const uploadParams = {
      key,
      file: req.file.buffer,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
      originalFilename: originalFilename,
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

    // Handle both raw base64 strings and data URIs
    let formattedBase64String = base64String;
    let mimeType;

    if (base64String.startsWith("data:")) {
      // It's already a data URI, extract MIME type
      const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
      if (!mimeTypeMatch) {
        throw new UploadError(
          "Invalid data URI format. Missing MIME type",
          "INVALID_BASE64_FORMAT",
        );
      }
      mimeType = mimeTypeMatch[1];
    } else {
      // It's a raw base64 string, add the appropriate prefix
      // Determine default MIME type based on fileType
      switch (fileType) {
        case "image":
          mimeType = "image/jpeg";
          break;
        case "document":
          mimeType = "application/pdf";
          break;
        case "video":
          mimeType = "video/mp4";
          break;
        default:
          throw new UploadError(
            "Invalid file type for raw base64 data",
            "INVALID_FILE_TYPE",
          );
      }
      formattedBase64String = `data:${mimeType};base64,${base64String}`;
    }

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

    const result = await uploadBase64File(
      formattedBase64String,
      fileType,
      folder,
    );

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

// Optimized base64 upload handler with streaming support
export const handleBase64UploadOptimized = async (req, res) => {
  try {
    // Set CORS headers
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

    // Early validation
    if (!req.body || !req.body.base64String || !req.body.fileType) {
      throw new UploadError(
        "Missing required fields: base64String and fileType",
        "INVALID_REQUEST",
      );
    }

    const { base64String, fileType, originalFilename, fileName } = req.body;

    // Quick validation
    const validFileTypes = ["image", "document", "video"];
    if (!validFileTypes.includes(fileType)) {
      throw new UploadError(
        `Invalid file type. Must be one of: ${validFileTypes.join(", ")}`,
        "INVALID_FILE_TYPE",
      );
    }

    // Support both 'originalFilename' and 'fileName' field names
    const finalOriginalFilename = originalFilename || fileName;

    // Performance optimization: Use a single regex match and async processing
    let mimeType;
    let base64Data;

    // Use Promise.resolve to make this async and non-blocking
    const parseResult = await Promise.resolve().then(() => {
      const dataUriMatch = base64String.match(/^data:(.*?);base64,(.*)$/);
      if (dataUriMatch) {
        return {
          mimeType: dataUriMatch[1],
          base64Data: dataUriMatch[2],
        };
      } else {
        // Raw base64 string
        const mimeTypeMap = {
          image: "image/jpeg",
          document: "application/pdf",
          video: "video/mp4",
        };
        return {
          mimeType: mimeTypeMap[fileType],
          base64Data: base64String,
        };
      }
    });

    mimeType = parseResult.mimeType;
    base64Data = parseResult.base64Data;

    // Validate MIME type prefix
    const mimeTypePrefix = mimeType.split("/")[0];
    const expectedPrefix = fileType === "document" ? "application" : fileType;
    if (!mimeType.startsWith(expectedPrefix)) {
      throw new UploadError(
        `Invalid MIME type for ${fileType}. Expected ${expectedPrefix}/*`,
        "INVALID_MIME_TYPE",
      );
    }

    // Quick size estimation (base64 is ~33% larger than binary)
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
      throw new UploadError(
        `File size exceeds maximum limit of ${ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        "FILE_TOO_LARGE",
      );
    }

    // Choose processing method based on file size
    const folder = `${fileType}s`;
    const CHUNKED_THRESHOLD = 25 * 1024 * 1024; // 25MB threshold for chunked processing

    let result;
    if (estimatedSize > CHUNKED_THRESHOLD) {
      // Use chunked processing for large files
      result = await uploadBase64FileChunked(
        base64Data,
        mimeType,
        folder,
        finalOriginalFilename,
      );
    } else {
      // Use optimized processing for smaller files
      result = await uploadBase64FileOptimized(
        base64Data,
        mimeType,
        folder,
        finalOriginalFilename,
      );
    }

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Optimized base64 upload error:", error);

    // Determine appropriate status code
    let statusCode = 500;
    if (
      error.code === "INVALID_REQUEST" ||
      error.code === "INVALID_FILE_TYPE" ||
      error.code === "INVALID_MIME_TYPE" ||
      error.code === "FILE_TOO_LARGE"
    ) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.code || "UPLOAD_ERROR",
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

      // Generate key with original filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const originalFilename = file.originalname;

      // Clean the original filename (remove special characters, spaces, etc.)
      const cleanFilename = originalFilename
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_|_$/g, "");

      // Ensure the filename has the correct extension
      const filenameWithoutExt = cleanFilename.replace(/\.[^/.]+$/, "");
      const key = `${fileType}s/${timestamp}-${randomStr}-${filenameWithoutExt}.${ext}`;

      const uploadParams = {
        key,
        file: file.buffer,
        contentType: file.mimetype,
        fileSize: file.size,
        originalFilename: originalFilename,
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

/**
 * Handle recorded lesson upload via base64
 * Uploads to appropriate directory based on batch type:
 * - Individual batch: {bucket}/student/{student_id}/
 * - Group batch: {bucket}/{batch_id}/
 */
export const handleRecordedLessonUpload = async (req, res) => {
  try {
    // Set CORS headers safely
    const origin = req.headers?.origin;
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

    // Validate request body
    if (!req.body || !req.body.base64String || !req.body.batchId) {
      throw new UploadError(
        "Missing required fields: base64String and batchId",
        "INVALID_REQUEST",
      );
    }

    const { base64String, batchId, title, sessionId, recorded_date } = req.body;

    // Import batch models (dynamic import to avoid circular dependency)
    const { Batch } = await import("../../models/course-model.js");
    const Enrollment = (await import("../../models/enrollment-model.js"))
      .default;

    // Find the batch and determine upload path
    const batch = await Batch.findById(batchId)
      .populate("course", "course_title")
      .lean();

    if (!batch) {
      throw new UploadError("Batch not found", "BATCH_NOT_FOUND");
    }

    // Determine upload directory based on batch type
    let uploadFolder;
    if (batch.batch_type === "individual") {
      // For individual batch, find the enrolled student
      const enrollment = await Enrollment.findOne({
        batch: batchId,
        status: "active",
      }).select("student");

      if (!enrollment) {
        throw new UploadError(
          "No active student found for individual batch",
          "NO_STUDENT_FOUND",
        );
      }

      uploadFolder = `videos/student/${enrollment.student}`;
    } else {
      // For group batch, use batch ID
      uploadFolder = `videos/${batchId}`;
    }

    // Parse base64 data
    let mimeType;
    let base64Data;

    const dataUriMatch = base64String.match(/^data:(.*?);base64,(.*)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      base64Data = dataUriMatch[2];
    } else {
      // Raw base64 string, assume video/mp4
      mimeType = "video/mp4";
      base64Data = base64String;
    }

    // Validate that it's a video file
    if (!mimeType.startsWith("video/")) {
      throw new UploadError(
        "Only video files are allowed for recorded lessons",
        "INVALID_FILE_TYPE",
      );
    }

    // Quick size estimation
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
      throw new UploadError(
        `File size exceeds maximum limit of ${ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        "FILE_TOO_LARGE",
      );
    }

    // Choose processing method based on file size
    const CHUNKED_THRESHOLD = 25 * 1024 * 1024; // 25MB threshold

    let uploadResult;
    if (estimatedSize > CHUNKED_THRESHOLD) {
      uploadResult = await uploadBase64FileChunked(
        base64Data,
        mimeType,
        uploadFolder,
      );
    } else {
      uploadResult = await uploadBase64FileOptimized(
        base64Data,
        mimeType,
        uploadFolder,
      );
    }

    // If sessionId is provided, add the recorded lesson to the batch session
    if (sessionId) {
      const { addRecordedLessonToBatch } = await import(
        "../batch-controller.js"
      );

      // Create a fake request object for the batch controller
      const fakeReq = {
        params: { batchId, sessionId },
        body: {
          title: title || "Recorded Lesson",
          url: uploadResult.data.url,
          recorded_date: recorded_date || new Date(),
        },
        user: req.user,
      };

      const fakeRes = {
        status: (code) => ({
          json: (data) => {
            if (code !== 201) {
              console.error("Error adding recorded lesson to batch:", data);
            }
          },
        }),
      };

      // Add the lesson to the batch
      try {
        await addRecordedLessonToBatch(fakeReq, fakeRes);
      } catch (batchError) {
        console.error("Error adding lesson to batch:", batchError);
        // Don't fail the upload, just log the error
      }
    }

    res.status(200).json({
      success: true,
      message: "Recorded lesson uploaded successfully",
      data: {
        ...uploadResult.data,
        batch: {
          id: batch._id,
          name: batch.batch_name,
          type: batch.batch_type,
          course: batch.course?.course_title,
        },
        uploadPath: uploadFolder,
        lessonInfo: {
          title: title || "Recorded Lesson",
          recorded_date: recorded_date || new Date(),
          sessionId: sessionId || null,
        },
      },
    });
  } catch (error) {
    console.error("Recorded lesson upload error:", error);

    // Determine appropriate status code
    let statusCode = 500;
    if (
      [
        "INVALID_REQUEST",
        "INVALID_FILE_TYPE",
        "FILE_TOO_LARGE",
        "BATCH_NOT_FOUND",
        "NO_STUDENT_FOUND",
      ].includes(error.code)
    ) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.code || "UPLOAD_ERROR",
    });
  }
};

/**
 * Handle migration of files from medh-filess to medhdocuments bucket (excluding videos)
 * @route POST /api/v1/upload/migrate-file
 * @access Private
 */
export const handleFileMigration = async (req, res) => {
  try {
    // Set CORS headers
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

    const { fileUrl, newKey } = req.body;

    // Validate request
    if (!fileUrl) {
      throw new UploadError(
        "Missing required field: fileUrl",
        "INVALID_REQUEST",
      );
    }

    // Check if the file should be migrated
    if (!shouldMigrateFromOldBucket(fileUrl)) {
      return res.status(200).json({
        success: true,
        message:
          "File should not be migrated (either not from medh-filess or is a video file)",
        data: {
          originalUrl: fileUrl,
          migrated: false,
        },
      });
    }

    // Migrate the file
    const result = await migrateImageToDocumentsBucket(fileUrl, newKey);

    res.status(200).json({
      success: true,
      message: "File migrated successfully",
      data: {
        originalUrl: fileUrl,
        newUrl: result.destinationUrl,
        migrated: true,
        ...result,
      },
    });
  } catch (error) {
    console.error("File migration error:", error);

    let statusCode = 500;
    if (error.code === "INVALID_REQUEST") {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.code || "MIGRATION_ERROR",
    });
  }
};

/**
 * Handle migration of images from medh-filess to medhdocuments bucket (legacy endpoint)
 * @route POST /api/v1/upload/migrate-image
 * @access Private
 */
export const handleImageMigration = async (req, res) => {
  return await handleFileMigration(req, res);
};

/**
 * Handle bulk migration of files from medh-filess to medhdocuments bucket (excluding videos)
 * @route POST /api/v1/upload/migrate-files-bulk
 * @access Private
 */
export const handleBulkFileMigration = async (req, res) => {
  try {
    // Set CORS headers
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

    const { fileUrls } = req.body;

    // Validate request
    if (!fileUrls || !Array.isArray(fileUrls)) {
      throw new UploadError(
        "Missing or invalid field: fileUrls (must be an array)",
        "INVALID_REQUEST",
      );
    }

    if (fileUrls.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No files to migrate",
        data: {
          total: 0,
          migrated: 0,
          skipped: 0,
          failed: 0,
          results: [],
        },
      });
    }

    // Limit batch size to prevent overwhelming the system
    const MAX_BATCH_SIZE = 50;
    if (fileUrls.length > MAX_BATCH_SIZE) {
      throw new UploadError(
        `Too many files. Maximum allowed is ${MAX_BATCH_SIZE}`,
        "TOO_MANY_FILES",
      );
    }

    const results = [];
    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // Process each file
    for (const fileUrl of fileUrls) {
      try {
        // Check if the file should be migrated
        if (!shouldMigrateFromOldBucket(fileUrl)) {
          results.push({
            originalUrl: fileUrl,
            success: true,
            migrated: false,
            message:
              "File should not be migrated (either not from medh-filess or is a video file)",
          });
          skipped++;
          continue;
        }

        // Migrate the file
        const result = await migrateImageToDocumentsBucket(fileUrl);

        results.push({
          originalUrl: fileUrl,
          newUrl: result.destinationUrl,
          success: true,
          migrated: true,
          message: "File migrated successfully",
        });
        migrated++;
      } catch (error) {
        console.error(`Failed to migrate file ${fileUrl}:`, error);
        results.push({
          originalUrl: fileUrl,
          success: false,
          migrated: false,
          error: error.message,
        });
        failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk migration completed. ${migrated} migrated, ${skipped} skipped, ${failed} failed`,
      data: {
        total: fileUrls.length,
        migrated,
        skipped,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error("Bulk file migration error:", error);

    let statusCode = 500;
    if (error.code === "INVALID_REQUEST" || error.code === "TOO_MANY_FILES") {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.code || "BULK_MIGRATION_ERROR",
    });
  }
};

/**
 * Handle bulk migration of images from medh-filess to medhdocuments bucket (legacy endpoint)
 * @route POST /api/v1/upload/migrate-images-bulk
 * @access Private
 */
export const handleBulkImageMigration = async (req, res) => {
  return await handleBulkFileMigration(req, res);
};

// Export the multer instance to be used in routes
export { upload };
