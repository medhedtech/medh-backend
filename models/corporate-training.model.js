import mongoose from "mongoose";

const corporateFormSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String },
    country: { type: String },
    company_name: {
      type: String,
    },
    designation: {
      type: String,
    },
    company_website: {
      type: String,
    },
    message: { type: String },
    accept: { type: Boolean },
  },
  { timestamps: true }
);

const CorporateForm = mongoose.model("Corporate", corporateFormSchema);
export default CorporateForm;