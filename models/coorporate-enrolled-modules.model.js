import mongoose from "mongoose";

const { Schema } = mongoose;

const coorporateEnrolledModuleSchema = new Schema(
  {
    coorporate_id: {
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
      ref: "CoorporateAssignCourse",
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
  { timestamps: true },
);

const CoorporateEnrolledModule = mongoose.model(
  "CoorporateEnrolledModule",
  coorporateEnrolledModuleSchema,
);

export default CoorporateEnrolledModule;
