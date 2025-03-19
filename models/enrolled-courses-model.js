const mongoose = require("mongoose");

const enrolledCourseSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollment_type: {
      type: String,
      required: true,
    },
    batch_size: {
      type: Number,
      default: 1,
    },
    payment_status: {
      type: String,
      default: 'completed',
    },
    enrollment_date: {
      type: Date,
      default: Date.now,
    },
    course_progress: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'active',
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    completed_on: { 
      type: Date, 
      default: null 
    },
    expiry_date: {
      type: Date,
    },
    memership_id: {
      type: String,
    },
    is_certifiled: {
      type: Boolean,
      default: false,
    },
    is_self_paced: {
      type: Boolean,
      default: false,
    },
    payment_details: {
      payment_id: {
        type: String,
      },
      payment_signature: {
        type: String,
      },
      payment_order_id: {
        type: String,
      },
      payment_method: {
        type: String,
        default: 'razorpay',
      },
      amount: {
        type: Number,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      payment_date: {
        type: Date,
        default: Date.now,
      }
    }
  },
  { timestamps: true }
);

const EnrolledCourse = mongoose.model("EnrolledCourse", enrolledCourseSchema);

module.exports = EnrolledCourse;
