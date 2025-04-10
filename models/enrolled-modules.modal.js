import mongoose from "mongoose";

const { Schema } = mongoose;

const enrolledModuleSchema = new Schema(
  {
    student_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollment_id: {
      type: Schema.Types.ObjectId,
      ref: "EnrolledCourse",
      required: true,
    },
    video_url: {
      type: String,
    },
    is_watched: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const EnrolledModule = mongoose.model("EnrolledModule", enrolledModuleSchema);

export default EnrolledModule;
