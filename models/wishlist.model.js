import mongoose from "mongoose";
const { Schema } = mongoose;

const wishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "User reference is required"],
    index: true
  },
  courses: [{
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    notificationPreference: {
      priceDrops: { type: Boolean, default: true },
      startDate: { type: Boolean, default: true }
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
wishlistSchema.index({ user: 1, 'courses.course': 1 });

// Method to check if a course is in wishlist
wishlistSchema.methods.hasCourse = function(courseId) {
  return this.courses.some(item => item.course.toString() === courseId.toString());
};

// Static method to get user's wishlist with populated courses
wishlistSchema.statics.getDetailedWishlist = async function(userId) {
  return this.findOne({ user: userId })
    .populate({
      path: 'courses.course',
      select: 'course_title course_thumbnail price course_category meta'
    });
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist; 