import mongoose from "mongoose";

const demoBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Full name must be at least 2 characters long"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "rescheduled", "completed", "no-show"],
      default: "pending",
      index: true,
    },
    demoType: {
      type: String,
      enum: ["course_demo", "consultation", "product_walkthrough", "general_inquiry"],
      default: "course_demo",
    },
    courseInterest: {
      type: String,
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
    },
    companyName: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    requirements: {
      type: String,
      trim: true,
      maxlength: [1000, "Requirements cannot exceed 1000 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingId: {
      type: String,
      trim: true,
    },
    meetingPassword: {
      type: String,
      trim: true,
    },
    // Enhanced Zoom meeting details
    zoomMeeting: {
      id: {
        type: String,
        trim: true,
      },
      uuid: {
        type: String,
        trim: true,
      },
      host_id: {
        type: String,
        trim: true,
      },
      topic: {
        type: String,
        trim: true,
      },
      type: {
        type: Number,
        default: 2, // Scheduled meeting
      },
      status: {
        type: String,
        enum: ["waiting", "started", "ended"],
      },
      start_time: {
        type: Date,
      },
      duration: {
        type: Number,
        default: 60,
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      agenda: {
        type: String,
        trim: true,
      },
      created_at: {
        type: Date,
      },
      start_url: {
        type: String,
        trim: true,
      },
      join_url: {
        type: String,
        trim: true,
      },
      password: {
        type: String,
        trim: true,
      },
      h323_password: {
        type: String,
        trim: true,
      },
      pstn_password: {
        type: String,
        trim: true,
      },
      encrypted_password: {
        type: String,
        trim: true,
      },
      settings: {
        host_video: {
          type: Boolean,
          default: true,
        },
        participant_video: {
          type: Boolean,
          default: true,
        },
        cn_meeting: {
          type: Boolean,
          default: false,
        },
        in_meeting: {
          type: Boolean,
          default: false,
        },
        join_before_host: {
          type: Boolean,
          default: false,
        },
        jbh_time: {
          type: Number,
          default: 0,
        },
        mute_upon_entry: {
          type: Boolean,
          default: true,
        },
        watermark: {
          type: Boolean,
          default: false,
        },
        use_pmi: {
          type: Boolean,
          default: false,
        },
        approval_type: {
          type: Number,
          default: 2, // No registration required
        },
        registration_type: {
          type: Number,
          default: 1, // Attendees register once and can attend any of the occurrences
        },
        audio: {
          type: String,
          enum: ["both", "telephony", "voip"],
          default: "both",
        },
        auto_recording: {
          type: String,
          enum: ["local", "cloud", "none"],
          default: "cloud", // Default to cloud recording for admin-level access
        },
        enforce_login: {
          type: Boolean,
          default: false,
        },
        enforce_login_domains: {
          type: String,
          trim: true,
        },
        alternative_hosts: {
          type: String,
          trim: true,
        },
        close_registration: {
          type: Boolean,
          default: false,
        },
        show_share_button: {
          type: Boolean,
          default: true,
        },
        allow_multiple_devices: {
          type: Boolean,
          default: true,
        },
        registrants_confirmation_email: {
          type: Boolean,
          default: true,
        },
        waiting_room: {
          type: Boolean,
          default: true,
        },
        request_permission_to_unmute_participants: {
          type: Boolean,
          default: false,
        },
        registrants_email_notification: {
          type: Boolean,
          default: true,
        },
        meeting_authentication: {
          type: Boolean,
          default: false,
        },
        encryption_type: {
          type: String,
          enum: ["enhanced_encryption", "e2ee"],
          default: "enhanced_encryption",
        },
        approved_or_denied_countries_or_regions: {
          enable: {
            type: Boolean,
            default: false,
          },
          method: {
            type: String,
            enum: ["approve", "deny"],
            default: "approve",
          },
          approved_list: [String],
          denied_list: [String],
        },
        breakout_room: {
          enable: {
            type: Boolean,
            default: false,
          },
          rooms: [{
            name: String,
            participants: [String],
          }],
        },
        // Additional admin-level settings
        internal_meeting: {
          type: Boolean,
          default: false,
        },
        continuous_meeting_chat: {
          enable: {
            type: Boolean,
            default: true,
          },
          auto_add_invited_external_users: {
            type: Boolean,
            default: false,
          },
        },
        participant_focused_meeting: {
          type: Boolean,
          default: false,
        },
        push_change_to_calendar: {
          type: Boolean,
          default: false,
        },
        resources: [{
          resource_type: {
            type: String,
            enum: ["whiteboard", "shared_document"],
          },
          resource_id: String,
          permission_level: {
            type: String,
            enum: ["editor", "viewer", "commenter"],
            default: "editor",
          },
        }],
      },
      // Auto-generated fields for easy access
      isZoomMeetingCreated: {
        type: Boolean,
        default: false,
      },
      zoomMeetingCreatedAt: {
        type: Date,
      },
      zoomMeetingError: {
        type: String,
        trim: true,
      },
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    instructorNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Instructor notes cannot exceed 1000 characters"],
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: [15, "Demo duration must be at least 15 minutes"],
      max: [180, "Demo duration cannot exceed 180 minutes"],
    },
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderSent: {
      type: Date,
    },
    rescheduleHistory: [
      {
        fromDateTime: {
          type: Date,
          required: true,
        },
        toDateTime: {
          type: Date,
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
        rescheduledAt: {
          type: Date,
          default: Date.now,
        },
        rescheduledBy: {
          type: String,
          enum: ["user", "instructor", "admin"],
          required: true,
        },
      },
    ],
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancellationDate: {
      type: Date,
    },
    completionNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Completion notes cannot exceed 1000 characters"],
    },
    followUpRequired: {
      type: Boolean,
      default: true,
    },
    followUpCompleted: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [1000, "Feedback cannot exceed 1000 characters"],
    },
    source: {
      type: String,
      enum: ["website", "social_media", "referral", "advertisement", "other"],
      default: "website",
    },
    utmParameters: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Auto-generation settings
    autoGenerateZoomMeeting: {
      type: Boolean,
      default: true, // Auto-generate Zoom meetings by default
    },
    zoomMeetingSettings: {
      // Override default Zoom settings if needed
      duration: {
        type: Number,
        min: 15,
        max: 480, // Max 8 hours
      },
      auto_recording: {
        type: String,
        enum: ["local", "cloud", "none"],
        default: "cloud",
      },
      waiting_room: {
        type: Boolean,
        default: true,
      },
      host_video: {
        type: Boolean,
        default: true,
      },
      participant_video: {
        type: Boolean,
        default: true,
      },
      mute_upon_entry: {
        type: Boolean,
        default: true,
      },
      join_before_host: {
        type: Boolean,
        default: false,
      },
      meeting_authentication: {
        type: Boolean,
        default: false,
      },
      registrants_confirmation_email: {
        type: Boolean,
        default: true,
      },
      registrants_email_notification: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
demoBookingSchema.index({ userId: 1, status: 1 });
demoBookingSchema.index({ scheduledDateTime: 1, status: 1 });
demoBookingSchema.index({ email: 1, scheduledDateTime: -1 });
demoBookingSchema.index({ instructorId: 1, scheduledDateTime: 1 });
demoBookingSchema.index({ createdAt: -1 });
demoBookingSchema.index({ 'zoomMeeting.id': 1 });
demoBookingSchema.index({ 'zoomMeeting.isZoomMeetingCreated': 1 });

// Virtual for checking if booking is upcoming
demoBookingSchema.virtual('isUpcoming').get(function() {
  return this.scheduledDateTime > new Date() && 
         ['confirmed', 'rescheduled'].includes(this.status);
});

// Virtual for checking if booking can be rescheduled
demoBookingSchema.virtual('canReschedule').get(function() {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledDateTime);
  const hoursUntilDemo = (scheduledTime - now) / (1000 * 60 * 60);
  
  return hoursUntilDemo > 24 && 
         ['confirmed', 'pending'].includes(this.status) &&
         this.rescheduleHistory.length < 3; // Max 3 reschedules allowed
});

// Virtual for checking if booking can be cancelled
demoBookingSchema.virtual('canCancel').get(function() {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledDateTime);
  const hoursUntilDemo = (scheduledTime - now) / (1000 * 60 * 60);
  
  return hoursUntilDemo > 2 && 
         ['confirmed', 'pending', 'rescheduled'].includes(this.status);
});

// Pre-save middleware to set scheduledDateTime from timeSlot if not provided
demoBookingSchema.pre('save', function(next) {
  if (!this.scheduledDateTime && this.timeSlot) {
    try {
      // Assuming timeSlot format: "2024-01-15T14:30:00.000Z" or similar ISO string
      this.scheduledDateTime = new Date(this.timeSlot);
    } catch (error) {
      return next(new Error('Invalid timeSlot format. Please provide a valid ISO date string.'));
    }
  }
  next();
});

// Pre-save middleware to validate future date
demoBookingSchema.pre('save', function(next) {
  if (this.scheduledDateTime <= new Date()) {
    return next(new Error('Demo booking must be scheduled for a future date and time.'));
  }
  next();
});

// Instance method to reschedule booking
demoBookingSchema.methods.reschedule = function(newDateTime, reason, rescheduledBy = 'user') {
  if (!this.canReschedule) {
    throw new Error('This booking cannot be rescheduled.');
  }
  
  // Add to reschedule history
  this.rescheduleHistory.push({
    fromDateTime: this.scheduledDateTime,
    toDateTime: new Date(newDateTime),
    reason: reason || 'No reason provided',
    rescheduledBy
  });
  
  // Update booking details
  this.scheduledDateTime = new Date(newDateTime);
  this.timeSlot = new Date(newDateTime).toISOString();
  this.status = 'rescheduled';
  
  return this;
};

// Instance method to cancel booking
demoBookingSchema.methods.cancel = function(reason) {
  if (!this.canCancel) {
    throw new Error('This booking cannot be cancelled.');
  }
  
  this.status = 'cancelled';
  this.cancellationReason = reason || 'No reason provided';
  this.cancellationDate = new Date();
  
  return this;
};

// Instance method to mark as completed
demoBookingSchema.methods.markCompleted = function(notes, rating, feedback) {
  this.status = 'completed';
  if (notes) this.completionNotes = notes;
  if (rating) this.rating = rating;
  if (feedback) this.feedback = feedback;
  
  return this;
};

// Instance method to create Zoom meeting data structure
demoBookingSchema.methods.prepareZoomMeetingData = function() {
  const defaultSettings = this.zoomMeetingSettings || {};
  
  return {
    topic: `Demo Session - ${this.demoType.replace('_', ' ').toUpperCase()} - ${this.fullName}`,
    type: 2, // Scheduled meeting
    start_time: this.scheduledDateTime.toISOString(),
    duration: defaultSettings.duration || this.durationMinutes || 60,
    timezone: this.timezone || 'UTC',
    agenda: `Demo session for ${this.fullName}${this.courseInterest ? ` - ${this.courseInterest}` : ''}${this.requirements ? `\n\nRequirements: ${this.requirements}` : ''}`,
    settings: {
      host_video: defaultSettings.host_video ?? true,
      participant_video: defaultSettings.participant_video ?? true,
      join_before_host: defaultSettings.join_before_host ?? false,
      mute_upon_entry: defaultSettings.mute_upon_entry ?? true,
      auto_recording: defaultSettings.auto_recording ?? "cloud", // Admin-level setting for recording
      waiting_room: defaultSettings.waiting_room ?? true,
      registration_type: 1, // Required registration
      approval_type: 0, // Auto approve
      close_registration: false,
      registrants_confirmation_email: defaultSettings.registrants_confirmation_email ?? true,
      registrants_email_notification: defaultSettings.registrants_email_notification ?? true,
      meeting_authentication: defaultSettings.meeting_authentication ?? false,
      audio: "both",
      encryption_type: "enhanced_encryption",
      show_share_button: true,
      allow_multiple_devices: true,
      // Admin-level recording settings
      cloud_recording_available_reminder: true,
      recording_disclaimer: true,
      // Additional professional settings
      breakout_room: {
        enable: false, // Disabled for demo sessions
      },
      continuous_meeting_chat: {
        enable: true,
        auto_add_invited_external_users: false,
      },
      participant_focused_meeting: false,
      push_change_to_calendar: true,
    }
  };
};

// Instance method to store Zoom meeting details
demoBookingSchema.methods.storeZoomMeetingDetails = function(zoomMeetingData) {
  this.zoomMeeting = {
    id: zoomMeetingData.id,
    uuid: zoomMeetingData.uuid,
    host_id: zoomMeetingData.host_id,
    topic: zoomMeetingData.topic,
    type: zoomMeetingData.type,
    status: zoomMeetingData.status || "waiting",
    start_time: new Date(zoomMeetingData.start_time),
    duration: zoomMeetingData.duration,
    timezone: zoomMeetingData.timezone,
    agenda: zoomMeetingData.agenda,
    created_at: new Date(zoomMeetingData.created_at),
    start_url: zoomMeetingData.start_url,
    join_url: zoomMeetingData.join_url,
    password: zoomMeetingData.password,
    h323_password: zoomMeetingData.h323_password,
    pstn_password: zoomMeetingData.pstn_password,
    encrypted_password: zoomMeetingData.encrypted_password,
    settings: zoomMeetingData.settings,
    isZoomMeetingCreated: true,
    zoomMeetingCreatedAt: new Date(),
    zoomMeetingError: null,
  };
  
  // Also update legacy fields for backward compatibility
  this.meetingLink = zoomMeetingData.join_url;
  this.meetingId = zoomMeetingData.id.toString();
  this.meetingPassword = zoomMeetingData.password;
  
  return this;
};

// Instance method to handle Zoom meeting creation errors
demoBookingSchema.methods.handleZoomMeetingError = function(error) {
  this.zoomMeeting = this.zoomMeeting || {};
  this.zoomMeeting.isZoomMeetingCreated = false;
  this.zoomMeeting.zoomMeetingError = error.message || 'Failed to create Zoom meeting';
  this.zoomMeeting.zoomMeetingCreatedAt = new Date();
  
  return this;
};

// Static method to find upcoming bookings
demoBookingSchema.statics.findUpcoming = function(userId, limit = 10) {
  return this.find({
    userId,
    scheduledDateTime: { $gt: new Date() },
    status: { $in: ['confirmed', 'rescheduled'] },
    isActive: true
  })
  .sort({ scheduledDateTime: 1 })
  .limit(limit)
  .populate('instructorId', 'full_name email');
};

// Static method to find bookings by date range
demoBookingSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const query = {
    scheduledDateTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    isActive: true,
    ...options
  };
  
  return this.find(query)
    .sort({ scheduledDateTime: 1 })
    .populate('userId', 'full_name email')
    .populate('instructorId', 'full_name email');
};

const DemoBooking = mongoose.model("DemoBooking", demoBookingSchema);

export default DemoBooking; 