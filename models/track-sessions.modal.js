import mongoose from "mongoose";

const trackInstructorSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignedInstructor",
      required: true,
    },
  },
  { timestamps: true },
);

const TrackInstructor = mongoose.model(
  "TrackInstructor",
  trackInstructorSchema,
);

export default TrackInstructor;
