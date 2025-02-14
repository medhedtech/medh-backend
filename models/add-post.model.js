const mongoose = require("mongoose");

const enrollJobPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const JobPost = mongoose.model("AddedJobPost", enrollJobPostSchema);

module.exports = JobPost;