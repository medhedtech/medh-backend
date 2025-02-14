const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
    },
    dateFiled: { type: Date, default: Date.now },
    role: {
      type: [String],
      enum: ["student", "instructor", "coorporate-student"],
      default: ["coorporate-student"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
