const mongoose = require("mongoose");

const BroucherSchema = new mongoose.Schema(
  {
    full_name: { type: String },
    email: { type: String },
    phone_number: { type: String },
    brochures: {
      type: String,
    },
    course_title: {
      type: String,
    },
  },
  { timestamps: true }
);

const BroucherModel = mongoose.model("Broucher", BroucherSchema);
module.exports = BroucherModel;
