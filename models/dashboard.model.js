import mongoose from 'mongoose';

const dashboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Dashboard name is required'],
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    required: [true, 'Dashboard type is required'],
    enum: ['student', 'instructor', 'admin', 'corporate'],
    default: 'student'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  features: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
dashboardSchema.index({ name: 1 });
dashboardSchema.index({ type: 1 });
dashboardSchema.index({ isActive: 1 });

// Virtual for dashboard display name
dashboardSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.type})`;
});

// Static method to get active dashboards by type
dashboardSchema.statics.getActiveByType = function(type) {
  return this.find({ type, isActive: true })
    .select('_id name type description features')
    .sort({ name: 1 });
};

// Instance method to toggle active status
dashboardSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

const Dashboard = mongoose.model('Dashboard', dashboardSchema);

export default Dashboard;
