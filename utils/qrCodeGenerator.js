import QRCode from "qrcode";
import logger from "./logger.js";

/**
 * Generate QR code for certificate verification
 * @param {string} verificationUrl - The verification URL to encode
 * @param {Object} options - QR code generation options
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
export const generateQRCode = async (verificationUrl, options = {}) => {
  try {
    // Default QR code options
    const defaultOptions = {
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 256,
      errorCorrectionLevel: "M", // Medium error correction
    };

    // Merge with custom options
    const qrOptions = { ...defaultOptions, ...options };

    // Validate URL
    if (!verificationUrl || typeof verificationUrl !== "string") {
      throw new Error("Invalid verification URL provided");
    }

    // Generate QR code as data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, qrOptions);

    logger.info("QR code generated successfully", {
      url: verificationUrl,
      options: qrOptions,
    });

    return qrCodeDataURL;
  } catch (error) {
    logger.error("Error generating QR code", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      verificationUrl,
    });
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

/**
 * Generate QR code as buffer for file saving
 * @param {string} verificationUrl - The verification URL to encode
 * @param {Object} options - QR code generation options
 * @returns {Promise<Buffer>} - QR code image buffer
 */
export const generateQRCodeBuffer = async (verificationUrl, options = {}) => {
  try {
    // Default options for buffer generation
    const defaultOptions = {
      type: "png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 256,
      errorCorrectionLevel: "M",
    };

    const qrOptions = { ...defaultOptions, ...options };

    // Validate URL
    if (!verificationUrl || typeof verificationUrl !== "string") {
      throw new Error("Invalid verification URL provided");
    }

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, qrOptions);

    logger.info("QR code buffer generated successfully", {
      url: verificationUrl,
      bufferSize: qrCodeBuffer.length,
    });

    return qrCodeBuffer;
  } catch (error) {
    logger.error("Error generating QR code buffer", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      verificationUrl,
    });
    throw new Error(`QR code buffer generation failed: ${error.message}`);
  }
};

/**
 * Generate QR code with custom styling for certificates
 * @param {string} verificationUrl - The verification URL to encode
 * @param {string} certificateNumber - Certificate number for styling
 * @returns {Promise<string>} - Styled QR code as data URL
 */
export const generateCertificateQRCode = async (
  verificationUrl,
  certificateNumber,
) => {
  try {
    const options = {
      type: "image/png",
      quality: 0.95,
      margin: 2,
      color: {
        dark: "#1a365d", // Dark blue for MEDH branding
        light: "#ffffff",
      },
      width: 300,
      errorCorrectionLevel: "H", // High error correction for certificates
    };

    const qrCodeDataURL = await generateQRCode(verificationUrl, options);

    logger.info("Certificate QR code generated", {
      certificateNumber,
      verificationUrl,
    });

    return qrCodeDataURL;
  } catch (error) {
    logger.error("Error generating certificate QR code", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      certificateNumber,
      verificationUrl,
    });
    throw error;
  }
};

/**
 * Validate QR code generation parameters
 * @param {string} url - URL to validate
 * @param {Object} options - Options to validate
 * @returns {Object} - Validation result
 */
export const validateQRCodeParams = (url, options = {}) => {
  const errors = [];

  // Validate URL
  if (!url || typeof url !== "string") {
    errors.push("URL is required and must be a string");
  } else {
    try {
      new URL(url);
    } catch {
      errors.push("URL must be a valid URL format");
    }
  }

  // Validate width if provided
  if (
    options.width &&
    (typeof options.width !== "number" ||
      options.width < 50 ||
      options.width > 2000)
  ) {
    errors.push("Width must be a number between 50 and 2000");
  }

  // Validate error correction level
  if (
    options.errorCorrectionLevel &&
    !["L", "M", "Q", "H"].includes(options.errorCorrectionLevel)
  ) {
    errors.push("Error correction level must be one of: L, M, Q, H");
  }

  // Validate margin
  if (
    options.margin &&
    (typeof options.margin !== "number" ||
      options.margin < 0 ||
      options.margin > 10)
  ) {
    errors.push("Margin must be a number between 0 and 10");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get QR code options for different use cases
 * @param {string} useCase - Use case: 'certificate', 'verification', 'general'
 * @returns {Object} - Optimized options for the use case
 */
export const getQRCodeOptions = (useCase = "general") => {
  const optionsMap = {
    certificate: {
      type: "image/png",
      quality: 0.95,
      margin: 2,
      color: {
        dark: "#1a365d",
        light: "#ffffff",
      },
      width: 300,
      errorCorrectionLevel: "H",
    },
    verification: {
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      width: 200,
      errorCorrectionLevel: "M",
    },
    general: {
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      width: 256,
      errorCorrectionLevel: "M",
    },
  };

  return optionsMap[useCase] || optionsMap.general;
};
