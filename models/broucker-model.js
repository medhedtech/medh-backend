import mongoose from "mongoose";

const BroucherSchema = new mongoose.Schema(
  {
    full_name: { 
      type: String,
      required: true,
      trim: true
    },
    email: { 
      type: String,
      required: true,
      trim: true
    },
    phone_number: { 
      type: String,
      required: true,
      trim: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    course_title: {
      type: String,
      required: true
    },
    // This will be automatically populated from the course's brochures
    selected_brochure: {
      type: String,
      required: true,
      validate: {
        validator: async function(v) {
          // Validate that the brochure exists in the referenced course
          const Course = mongoose.model('Course');
          const course = await Course.findById(this.course);
          return course && course.brochures && course.brochures.includes(v);
        },
        message: 'Selected brochure must exist in the referenced course'
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add a pre-save middleware to ensure course_title matches the referenced course
BroucherSchema.pre('save', async function(next) {
  if (this.isModified('course')) {
    const Course = mongoose.model('Course');
    const course = await Course.findById(this.course);
    if (course) {
      this.course_title = course.course_title;
    }
  }
  next();
});

const BroucherModel = mongoose.model("Broucher", BroucherSchema);
export default BroucherModel;
