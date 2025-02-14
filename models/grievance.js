const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ["open", "investigating", "resolved"],
    default: "open",
  },
  dateFiled: { type: Date, default: Date.now },
  resolutionDate: { type: Date },
});

module.exports = mongoose.model("Grievance", grievanceSchema);
