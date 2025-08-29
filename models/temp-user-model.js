import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// Temporary User Schema - for storing user data before email verification
const tempUserSchema = new Schema(
  {
    // Basic Information (same as User model but temporary)
    full_name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    username: {
      type: String,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      validate: {
        validator: function (v) {
          return !v || /^[a-zA-Z0-9_]+$/.test(v);
        },
        message: "Username can only contain letters, numbers, and underscores",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [1, "Password must be at least 1 character"],
    },

    // Role and Account Info
    role: {
      type: Schema.Types.Mixed,
      default: ["student"],
    },
    account_type: {
      type: String,
      enum: ["free", "premium", "enterprise"],
      default: "free",
    },
    student_id: {
      type: String,
      trim: true,
    },

    // Email Verification
    email_verification_token: {
      type: String,
      required: true,
    },
    email_verification_expires: {
      type: Date,
      required: true,
    },

    // Device and Location Info (for analytics)
    device_info: {
      ip_address: String,
      user_agent: String,
      device_type: String,
    },
    location_info: {
      country: String,
      region: String,
      city: String,
      timezone: String,
    },
    referral_source: {
      type: String,
      default: "direct",
    },

    // Auto-cleanup after 24 hours if not verified
    expires_at: {
      type: Date,
      default: Date.now,
      expires: 24 * 60 * 60, // 24 hours in seconds
    },
  },
  {
    timestamps: true,
    collection: "temp_users",
  }
);

// Pre-save hook to hash password
tempUserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    console.log('🔐 TEMP USER PRE-SAVE HOOK - Hashing password for user:', this.email);
    
    // Use passwordSecurity utility for consistent hashing with pepper
    const passwordSecurity = (await import('../utils/passwordSecurity.js')).default;
    this.password = await passwordSecurity.hashPassword(this.password);
    
    console.log('✅ TEMP USER PRE-SAVE HOOK - Password hashed successfully with passwordSecurity');
    next();
  } catch (error) {
    console.error('❌ TEMP USER PRE-SAVE HOOK - Error hashing password:', error);
    next(error);
  }
});

// Index for email lookup
tempUserSchema.index({ email: 1 });
tempUserSchema.index({ email_verification_token: 1 });
tempUserSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const TempUser = mongoose.model("TempUser", tempUserSchema);

export default TempUser;
