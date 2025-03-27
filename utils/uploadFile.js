const { s3Client, UPLOAD_CONSTANTS } = require('../config/aws-config');

class UploadError extends Error {
  constructor(message, code = 'UPLOAD_ERROR') {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

const validateFileType = (mimeType) => {
  if (!UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[mimeType]) {
    throw new UploadError(
      `Invalid file type. Allowed types: ${Object.keys(UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES).join(', ')}`,
      'INVALID_FILE_TYPE'
    );
  }
  return true;
};

const validateFileSize = (size) => {
  if (size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
    throw new UploadError(
      `File size exceeds maximum limit of ${UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      'FILE_TOO_LARGE'
    );
  }
  return true;
};

const uploadFile = async (uploadData) => {
  try {
    // Validate file type
    if (uploadData.contentType) {
      validateFileType(uploadData.contentType);
    }

    // Validate file size if provided
    if (uploadData.fileSize) {
      validateFileSize(uploadData.fileSize);
    }

    const uploadParams = {
      Bucket: uploadData.bucketName || UPLOAD_CONSTANTS.BUCKET_NAME,
      Key: uploadData.key,
      Body: uploadData.file,
      ContentType: uploadData.contentType
    };

    const result = await s3Client.upload(uploadParams).promise();
    
    return {
      success: true,
      data: {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        contentType: result.ContentType
      }
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new UploadError(
      error.message || 'Failed to upload file',
      error.code || 'UPLOAD_ERROR'
    );
  }
};

const uploadBase64File = async (base64String, fileType, folder) => {
  try {
    // Extract MIME type and base64 data
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    if (!mimeTypeMatch) {
      throw new UploadError('Invalid base64 string format', 'INVALID_BASE64');
    }

    const mimeType = mimeTypeMatch[1];
    const base64Data = base64String.replace(/^data:.*;base64,/, '');

    // Validate file type
    validateFileType(mimeType);

    // Create file buffer
    const file = Buffer.from(base64Data, 'base64');

    // Generate S3 key
    const fileExtension = UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[mimeType];
    const key = `${folder}/${Date.now()}.${fileExtension}`;

    // Upload parameters
    const uploadParams = {
      key,
      file,
      contentType: mimeType
    };

    return await uploadFile(uploadParams);
  } catch (error) {
    console.error('Base64 upload error:', error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  uploadBase64File,
  UploadError
};
