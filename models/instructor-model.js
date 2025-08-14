import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instructorSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone_number: {
      type: String,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    domain: {
      type: String,
      trim: true,
    },
    experience: {
      years: {
        type: Number,
        min: 0,
        max: 50,
        default: 0
      },
      description: {
        type: String,
        trim: true,
        maxlength: 1000
      },
      previous_companies: [{
        company_name: { type: String, trim: true },
        position: { type: String, trim: true },
        duration: { type: String, trim: true },
        description: { type: String, trim: true }
      }]
    },
    qualifications: {
      education: [{
        degree: { type: String, trim: true, required: true },
        institution: { type: String, trim: true, required: true },
        year: { type: Number },
        grade: { type: String, trim: true }
      }],
      certifications: [{
        name: { type: String, trim: true, required: true },
        issuing_organization: { type: String, trim: true },
        issue_date: { type: Date },
        expiry_date: { type: Date },
        credential_id: { type: String, trim: true }
      }],
      skills: [{
        type: String,
        trim: true
      }]
    },
    meta: {
      course_name: { type: String },
      age: { type: Number },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Hash password before saving
instructorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
instructorSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Instructor = mongoose.model("Instructor", instructorSchema);
export default Instructor;
