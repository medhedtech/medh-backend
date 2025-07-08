import mongoose from "mongoose";
import MasterData from "./master-data-model.js";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional bindings to master data
    grade: {
      type: String,
      trim: true,
      default: null,
    },
    classType: {
      type: String,
      trim: true,
      default: null,
    },
    parentCategory: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Static methods to fetch FAQs by various master data bindings
/**
 * Find FAQs by any combination of criteria: category, grade, classType, parentCategory
 */
faqSchema.statics.findByCriteria = function (criteria = {}) {
  const filter = {};
  if (criteria.category) filter.category = criteria.category;
  if (criteria.grade) filter.grade = criteria.grade;
  if (criteria.classType) filter.classType = criteria.classType;
  if (criteria.parentCategory) filter.parentCategory = criteria.parentCategory;
  return this.find(filter).lean();
};

faqSchema.statics.findByCategory = function (category) {
  return this.findByCriteria({ category });
};
faqSchema.statics.findByGrade = function (grade) {
  return this.findByCriteria({ grade });
};
faqSchema.statics.findByClassType = function (classType) {
  return this.findByCriteria({ classType });
};
faqSchema.statics.findByParentCategory = function (parentCategory) {
  return this.findByCriteria({ parentCategory });
};

const FAQ = mongoose.model("GeneralFAQ", faqSchema);

export default FAQ;
