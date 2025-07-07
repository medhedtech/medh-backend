import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    category_name: {
      type: String,
      unique: true,
      required: [true, "Category name is required"],
      // trim: true,
    },
    category_image: {
      type: String,
      // required: true,
    },
    class_type: {
      type: String,
      enum: ["live", "blended", "free"],
      default: "live",
      required: [true, "Class type is required"],
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  { timestamps: true },
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
