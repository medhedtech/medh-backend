import mongoose from "mongoose";

const SubscriptionCourseSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["success", "pending", "failed"],
      default: "pending",
    },
    pdfUrl: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

const SubscriptionCourse = mongoose.model(
  "Subscription",
  SubscriptionCourseSchema,
);

export default SubscriptionCourse;
