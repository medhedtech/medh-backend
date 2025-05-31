import express from "express";

const router = express.Router();
import {
  upload,
  handleUpload,
  handleBase64Upload,
  handleBase64UploadOptimized,
  handleMultipleUpload,
} from "../controllers/upload/uploadController.js";
import { authenticateToken } from "../middleware/auth.js";
import { 
  validateBase64Middleware, 
  compressUploadResponse 
} from "../middleware/uploadMiddleware.js";

/**
 * @route POST /api/v1/upload
 * @desc Upload a single file
 * @access Private
 * @body multipart/form-data with field 'file'
 */
router.post("/", authenticateToken, upload.single("file"), handleUpload);

/**
 * @route POST /api/v1/upload/multiple
 * @desc Upload multiple files (max 10)
 * @access Private
 * @body multipart/form-data with field 'files'
 */
router.post(
  "/multiple",
  authenticateToken,
  upload.array("files", 10),
  handleMultipleUpload,
);

/**
 * @route POST /api/v1/upload/base64
 * @desc Upload a base64 encoded file (optimized for performance)
 * @access Private
 * @body { base64String: string, fileType: 'image' | 'document' | 'video' }
 */
router.post(
  "/base64", 
  authenticateToken, 
  validateBase64Middleware,
  compressUploadResponse,
  handleBase64UploadOptimized
);

/**
 * @route POST /api/v1/upload/base64-legacy
 * @desc Legacy base64 upload endpoint (kept for backward compatibility)
 * @access Private
 * @body { base64String: string, fileType: 'image' | 'document' | 'video' }
 */
router.post("/base64-legacy", authenticateToken, handleBase64Upload);

export default router;
