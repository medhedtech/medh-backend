const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    blog_link: { type: String, required: true },
    upload_image: { type: String, required: true },
  },
  { timestamps: true }
);

const BlogsModel = mongoose.model("Blogs", blogSchema);
module.exports = BlogsModel;
