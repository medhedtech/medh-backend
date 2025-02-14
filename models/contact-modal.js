const mongoose = require("mongoose");

const contactFormSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String},
    phone_number: { type: String},
    message: { type: String},
    accept: { type: Boolean},
    resume_image:{
      type: String,
    },
    page_title:{
      type: String,
    }
  },
  { timestamps: true }
);

const ContactForm = mongoose.model("Contact", contactFormSchema);
module.exports = ContactForm;
