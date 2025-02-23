const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  plan_name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  duration_months: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 month']
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required']
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_id: {
    type: String,
    trim: true
  },
  receipt_url: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  cancelled_at: {
    type: Date
  },
  features: [{
    name: String,
    description: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
subscriptionSchema.index({ user_id: 1, status: 1 });
subscriptionSchema.index({ payment_status: 1 });
subscriptionSchema.index({ end_date: 1 }, { expireAfterSeconds: 0 });

// Virtual for subscription status
subscriptionSchema.virtual('isActive').get(function() {
  if (this.status === 'cancelled') return false;
  if (this.status === 'expired') return false;
  if (this.payment_status !== 'completed') return false;
  return new Date() <= this.end_date;
});

// Virtual for remaining days
subscriptionSchema.virtual('remainingDays').get(function() {
  if (!this.isActive) return 0;
  const now = new Date();
  const diffTime = this.end_date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update status based on dates
subscriptionSchema.pre('save', function(next) {
  const now = new Date();
  if (this.end_date < now) {
    this.status = 'expired';
  }
  next();
});

// Instance method to extend subscription
subscriptionSchema.methods.extend = async function(months) {
  const currentEndDate = this.end_date;
  this.end_date = new Date(currentEndDate.setMonth(currentEndDate.getMonth() + months));
  this.status = 'active';
  return this.save();
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  this.cancelled_at = new Date();
  return this.save();
};

// Static method to find active subscriptions
subscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({
    status: 'active',
    payment_status: 'completed',
    end_date: { $gt: new Date() }
  });
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiringSubscriptions = function(daysThreshold = 7) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    status: 'active',
    payment_status: 'completed',
    end_date: {
      $gt: new Date(),
      $lte: thresholdDate
    }
  });
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 