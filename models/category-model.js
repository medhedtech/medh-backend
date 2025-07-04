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
