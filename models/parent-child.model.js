import mongoose from "mongoose";

const { Schema } = mongoose;

const parentChildSchema = new Schema(
  {
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Parent ID is required"],
      index: true,
      validate: {
        validator: async function(parentId) {
          const User = mongoose.model("User");
          const parent = await User.findById(parentId);
          return parent && (
            parent.role.includes("parent") || 
            parent.role === "parent"
          );
        },
        message: "Parent must have parent role"
      }
    },
    child_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: [true, "Child ID is required"],
      index: true,
      validate: {
        validator: async function(childId) {
          const User = mongoose.model("User");
          const child = await User.findById(childId);
          return child && (
            child.role.includes("student") || 
            child.role === "student"
          );
        },
        message: "Child must have student role"
      }
    },
    relationship_type: {
      type: String,
      enum: ["father", "mother", "guardian", "relative", "other"],
      required: [true, "Relationship type is required"],
      default: "guardian"
    },
    is_primary_contact: {
      type: Boolean,
      default: false
    },
    emergency_contact: {
      type: Boolean,
      default: true
    },
    can_view_grades: {
      type: Boolean,
      default: true
    },
    can_view_attendance: {
      type: Boolean,
      default: true
    },
    can_view_performance: {
      type: Boolean,
      default: true
    },
    can_communicate_with_instructors: {
      type: Boolean,
      default: true
    },
    can_schedule_meetings: {
      type: Boolean,
      default: true
    },
    can_make_payments: {
      type: Boolean,
      default: false
    },
    receive_notifications: {
      type: Boolean,
      default: true
    },
    notification_preferences: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ["immediate", "daily", "weekly", "monthly"],
        default: "daily"
      }
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "suspended"],
      default: "active"
    },
    linked_date: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    verification_method: {
      type: String,
      enum: ["email", "phone", "document", "manual", "none"],
      default: "none"
    },
    verification_date: {
      type: Date
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      trim: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to ensure unique parent-child relationships
parentChildSchema.index({ parent_id: 1, child_id: 1 }, { unique: true });

// Additional indexes for performance
parentChildSchema.index({ parent_id: 1, status: 1 });
parentChildSchema.index({ child_id: 1, status: 1 });
parentChildSchema.index({ is_primary_contact: 1 });

// Virtual for relationship duration
parentChildSchema.virtual('relationship_duration').get(function() {
  return Math.floor((Date.now() - this.linked_date) / (1000 * 60 * 60 * 24)); // days
});

// Static methods
parentChildSchema.statics.findChildrenByParent = function(parentId, status = 'active') {
  return this.find({ parent_id: parentId, status })
    .populate('child_id', 'full_name email student_id age user_image status phone_numbers')
    .sort({ is_primary_contact: -1, linked_date: -1 });
};

parentChildSchema.statics.findParentsByChild = function(childId, status = 'active') {
  return this.find({ child_id: childId, status })
    .populate('parent_id', 'full_name email phone_numbers user_image status')
    .sort({ is_primary_contact: -1, linked_date: -1 });
};

parentChildSchema.statics.findPrimaryParent = function(childId) {
  return this.findOne({ child_id: childId, is_primary_contact: true, status: 'active' })
    .populate('parent_id', 'full_name email phone_numbers user_image status');
};

parentChildSchema.statics.getParentDashboardData = async function(parentId) {
  const children = await this.findChildrenByParent(parentId);
  
  if (!children.length) {
    return {
      children: [],
      total_children: 0,
      active_children: 0,
      has_permissions: {
        can_view_grades: false,
        can_view_attendance: false,
        can_view_performance: false,
        can_communicate_with_instructors: false,
        can_schedule_meetings: false,
        can_make_payments: false
      }
    };
  }

  const activeChildren = children.filter(rel => rel.child_id.status === 'Active');
  
  // Aggregate permissions
  const hasPermissions = {
    can_view_grades: children.some(rel => rel.can_view_grades),
    can_view_attendance: children.some(rel => rel.can_view_attendance),
    can_view_performance: children.some(rel => rel.can_view_performance),
    can_communicate_with_instructors: children.some(rel => rel.can_communicate_with_instructors),
    can_schedule_meetings: children.some(rel => rel.can_schedule_meetings),
    can_make_payments: children.some(rel => rel.can_make_payments)
  };

  return {
    children: children.map(rel => ({
      relationship_id: rel._id,
      child: rel.child_id,
      relationship_type: rel.relationship_type,
      is_primary_contact: rel.is_primary_contact,
      permissions: {
        can_view_grades: rel.can_view_grades,
        can_view_attendance: rel.can_view_attendance,
        can_view_performance: rel.can_view_performance,
        can_communicate_with_instructors: rel.can_communicate_with_instructors,
        can_schedule_meetings: rel.can_schedule_meetings,
        can_make_payments: rel.can_make_payments
      },
      linked_date: rel.linked_date,
      verified: rel.verified
    })),
    total_children: children.length,
    active_children: activeChildren.length,
    has_permissions: hasPermissions
  };
};

// Instance methods
parentChildSchema.methods.updatePermissions = function(permissions) {
  Object.keys(permissions).forEach(key => {
    if (this.schema.paths.hasOwnProperty(key)) {
      this[key] = permissions[key];
    }
  });
  return this.save();
};

parentChildSchema.methods.verify = function(method = 'manual', verifiedBy = null) {
  this.verified = true;
  this.verification_method = method;
  this.verification_date = new Date();
  if (verifiedBy) {
    this.updated_by = verifiedBy;
  }
  return this.save();
};

// Pre-save middleware
parentChildSchema.pre('save', function(next) {
  // Ensure only one primary contact per child
  if (this.is_primary_contact && this.isModified('is_primary_contact')) {
    this.constructor.updateMany(
      { 
        child_id: this.child_id, 
        _id: { $ne: this._id },
        is_primary_contact: true 
      },
      { is_primary_contact: false }
    ).exec();
  }
  next();
});

const ParentChild = mongoose.model('ParentChild', parentChildSchema);

export default ParentChild; 