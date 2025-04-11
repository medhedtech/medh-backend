import mongoose from "mongoose";

const instructorSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      trim: true,
    },
    phone_number: {
      type: String,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    meta: {
      course_name: { type: String },
      age: { type: Number },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

const Instructor = mongoose.model("Instructor", instructorSchema);
export default Instructor;
