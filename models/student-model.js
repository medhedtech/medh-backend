import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    age: {
      type: Number,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone_numbers: [{
      type: String,
      trim: true,
    }],
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
  { timestamps: true },
);

const Student = mongoose.model("Student", studentSchema);
export default Student;
