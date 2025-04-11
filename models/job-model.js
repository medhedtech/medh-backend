import mongoose from "mongoose";

const enrollJobSchema = new mongoose.Schema(
  {
    full_name: { type: String },
    email: { type: String },
    country: { type: String },
    phone_number: { type: String },
    resume_image: { type: String },
    message: { type: String },
    accept: { type: Boolean },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    designation: {
      type: String,
    },
  },
  { timestamps: true },
);

const JobForm = mongoose.model("JobPost", enrollJobSchema);
export default JobForm;
