import dotenv from "dotenv";
import path from "path";

// Force load the .env file from the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const ENV_VARS = {
  MONGODB_URI: process.env.MONGODB_URL,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  PORT: process.env.PORT || 8080,
  
  // Password Security Configuration
  BCRYPT_WORK_FACTOR: process.env.BCRYPT_WORK_FACTOR || 12,
  PASSWORD_PEPPER: process.env.PASSWORD_PEPPER || "",
  HTTPS_PORT: process.env.HTTPS_PORT || 443,
  NODE_ENV: process.env.NODE_ENV || "development",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [],
  AWS_ACCESS_KEY: process.env.IM_AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.IM_AWS_SECRET_KEY,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "medh-files",
  AWS_REGION: process.env.AWS_REGION || "ap-south-1",

  // TLS Configuration
  TLS_CERT_PATH: process.env.TLS_CERT_PATH,
  USE_HTTPS: process.env.USE_HTTPS || false,

  // Sentry Configuration
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  SENTRY_TRACES_SAMPLE_RATE: parseFloat(
    process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1",
  ),

  // Redis Configuration
  REDIS_ENABLED: process.env.REDIS_ENABLED === "true",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || "email-smtp.us-east-1.amazonaws.com",
  EMAIL_PORT: process.env.EMAIL_PORT || 465,
  EMAIL_SECURE: process.env.EMAIL_SECURE === "true" || true,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@medh.co",
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || "SES", // "Gmail" or "SES"

  // Razorpay Configuration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,

  // Upload Constants (Update these values as needed)
  UPLOAD_CONSTANTS: {
    ALLOWED_MIME_TYPES: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf",
      "video/mp4": "mp4",
      "video/quicktime": "mov",
      "video/webm": "webm",
    },
    MAX_FILE_SIZE: 10 * 1024 * 1024 * 1024, // 10 GB
    BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "medh-filess", // Using environment variable or fallback
    MAX_FILES: 10, // Placeholder for maximum number of files in multi-upload
    // Updated bucket configuration: only videos in medh-filess, rest in medhdocuments
    BUCKETS: {
      IMAGES: process.env.AWS_S3_IMAGES_BUCKET || "medhdocuments",
      DOCUMENTS: process.env.AWS_S3_DOCUMENTS_BUCKET || "medhdocuments",
      VIDEOS: process.env.AWS_S3_VIDEOS_BUCKET || "medh-filess",
      DEFAULT: process.env.AWS_S3_DOCUMENTS_BUCKET || "medhdocuments", // Default to documents bucket
    },
  },

  // CloudFront Configuration
  CLOUDFRONT_KEY_PAIR_ID: process.env.CLOUDFRONT_KEY_PAIR_ID,
  CLOUDFRONT_PRIVATE_KEY_PATH:
    process.env.CLOUDFRONT_PRIVATE_KEY_PATH ||
    path.join(process.cwd(), "private_key.pem"),
  CLOUDFRONT_DEFAULT_EXPIRES_IN: parseInt(
    process.env.CLOUDFRONT_DEFAULT_EXPIRES_IN || "300",
    10,
  ),

  // OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY_PATH: process.env.APPLE_PRIVATE_KEY_PATH,
  SESSION_SECRET: process.env.SESSION_SECRET,
  
  // Admin Security Configuration
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || "MEDH_ADMIN_SECRET_2025",
};
