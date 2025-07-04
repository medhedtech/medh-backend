import mongoose from "mongoose";

const instructorAssignmentSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
    },
    email: {
      type: String,
    },
    course_title: {
      type: String,
    },
    course_type: {
      type: String,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const InstructorAssignment = mongoose.model(
  "AssignedInstructor",
  instructorAssignmentSchema,
);

export default InstructorAssignment;
