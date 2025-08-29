import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import passwordSecurity from "../utils/passwordSecurity.js";

const adminSchema = new mongoose.Schema(
  {
    // Basic Information
    full_name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
    },
    
    // Admin Specific Fields
    admin_role: {
      type: String,
      enum: ["super-admin", "admin", "moderator"],
      default: "admin",
    },
    permissions: [{
      type: String,
      enum: [
        "user_management",
        "course_management", 
        "content_management",
        "financial_management",
        "system_settings",
        "analytics_access",
        "support_management"
      ]
    }],
    
    // Security Fields
    is_active: {
      type: Boolean,
      default: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    last_login: {
      type: Date,
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
    },
    lock_until: {
      type: Date,
    },
    
    // Profile Information
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    
    // Activity Tracking
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    last_activity: {
      type: Date,
      default: Date.now,
    },
    
    // Sessions
    sessions: [{
      session_id: String,
      device_id: String,
      ip_address: String,
      user_agent: String,
      created_at: {
        type: Date,
        default: Date.now,
      },
      is_active: {
        type: Boolean,
        default: true,
      },
      invalidated_at: Date,
    }],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.failed_login_attempts;
        delete ret.lock_until;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
adminSchema.index({ email: 1 });
adminSchema.index({ admin_role: 1 });
adminSchema.index({ is_active: 1 });
adminSchema.index({ created_at: -1 });

// Virtual for account lock status
adminSchema.virtual("isLocked").get(function () {
  return !!(this.lock_until && this.lock_until > Date.now());
});

// Pre-save hook to hash password
adminSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();
  
  // Skip hashing if explicitly requested (for already hashed passwords)
  if (this._skipPasswordHash) return next();
  
  try {
    console.log("🔐 ADMIN PRE-SAVE HOOK - Hashing password for admin:", this.email);
    
    // Use passwordSecurity utility for consistent hashing with pepper
    this.password = await passwordSecurity.hashPassword(this.password);
    
    console.log("✅ ADMIN PRE-SAVE HOOK - Password hashed successfully");
    next();
  } catch (error) {
    console.error("❌ ADMIN PRE-SAVE HOOK - Error hashing password:", error);
    next(error);
  }
});

// Instance methods
adminSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // For backward compatibility: Try old method first (direct bcrypt without pepper)
    const oldMethodResult = await bcrypt.compare(candidatePassword, this.password);
    
    if (oldMethodResult) {
      console.log("✅ Admin login successful with original password method for:", this.email);
      return true;
    }
    
    // If old method fails, try new method (with pepper) for newly created admins
    const newMethodResult = await passwordSecurity.comparePassword(
      candidatePassword,
      this.password
    );
    
    if (newMethodResult) {
      console.log("✅ Admin login successful with new password method for:", this.email);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("❌ Error in admin comparePassword:", error);
    return false;
  }
};

// Handle failed login attempts
adminSchema.methods.incLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lock_until && this.lock_until < Date.now()) {
    return this.updateOne({
      $unset: { lock_until: 1 },
      $set: { failed_login_attempts: 1 },
    });
  }
  
  const updates = { $inc: { failed_login_attempts: 1 } };
  
  // After 5 failed attempts, lock account for 2 hours
  if (this.failed_login_attempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lock_until: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
adminSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $unset: { failed_login_attempts: 1, lock_until: 1 },
  });
};

// Create session
adminSchema.methods.createSession = async function (sessionData) {
  // Initialize sessions array if it doesn't exist
  if (!this.sessions) {
    this.sessions = [];
  }
  
  // Add new session
  this.sessions.push({
    session_id: sessionData.session_id,
    device_id: sessionData.device_id,
    ip_address: sessionData.ip_address,
    user_agent: sessionData.user_agent,
    created_at: new Date(),
    is_active: true,
  });
  
  // Keep only the last 5 sessions for admins
  if (this.sessions.length > 5) {
    this.sessions = this.sessions.slice(-5);
  }

  return this.save();
};

// Invalidate all sessions
adminSchema.methods.invalidateAllSessions = async function () {
  if (this.sessions) {
    this.sessions.forEach(session => {
      session.is_active = false;
      session.invalidated_at = new Date();
    });
  }
  return this.save();
};

// Static methods
adminSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Generate admin ID
adminSchema.statics.generateAdminId = async function () {
  const count = await this.countDocuments();
  return `ADM${String(count + 1).padStart(6, "0")}`;
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;


