const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
    },
    age: {
      type: Number,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    course_name: {
      type: String,
    },
    meta: {
      createdBy: {
        type: String,
      },
      updatedBy: {
        type: String,
      },
      deletedAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    upload_image: {
      type: String,
    },
    is_subscribed: {
      type: Boolean,
      default: false,
    },
    subscription_end_date: {
      type: Date,
    },
    membership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
