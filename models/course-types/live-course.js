import mongoose from "mongoose";
import { BaseCourse } from "./base-course.js";

const { Schema } = mongoose;

// Schemas specific to live courses
const liveSessionSchema = new Schema({
  title: {
    type: String,
    required: [true, "Session title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Session description is required"],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, "Session date is required"],
  },
  duration: {
    type: Number,
    required: [true, "Session duration is required"],
    min: [15, "Session duration must be at least 15 minutes"],
  },
  meeting_link: {
    type: String,
    trim: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Instructor",
    required: [true, "Instructor is required"],
  },
  recording_url: {
    type: String,
    trim: true,
  },
  is_recorded: {
    type: Boolean,
    default: false,
  },
  materials: [{
    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    file_url: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["presentation", "document", "code", "other"],
      default: "other",
    }
  }],
  prerequisites: [{
    type: String,
    trim: true,
  }]
});

const moduleSchema = new Schema({
  title: {
    type: String,
    required: [true, "Module title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Module description is required"],
    trim: true,
  },
  order: {
    type: Number,
    required: [true, "Module order is required"],
  },
  sessions: [liveSessionSchema],
  resources: [{
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    file_url: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["pdf", "document", "video", "code", "other"],
      required: [true, "Resource type is required"],
    }
  }]
});

// Schema for live courses
const liveCourseSchema = new Schema({
  course_schedule: {
    start_date: {
      type: Date,
      required: [true, "Course start date is required"],
    },
    end_date: {
      type: Date,
      required: [true, "Course end date is required"],
      validate: {
        validator: function(v) {
          return v > this.course_schedule.start_date;
        },
        message: "End date must be after start date"
      }
    },
    session_days: [{
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: [true, "Session days are required"],
    }],
    session_time: {
      type: String,
      required: [true, "Session time is required"],
      trim: true,
    },
    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      trim: true,
    }
  },
  total_sessions: {
    type: Number,
    required: [true, "Total number of sessions is required"],
    min: [1, "Course must have at least 1 session"],
  },
  session_duration: {
    type: Number,
    required: [true, "Session duration is required"],
    min: [30, "Session duration must be at least 30 minutes"],
  },
  modules: {
    type: [moduleSchema],
    required: [true, "Course modules are required"],
    validate: {
      validator: function(modules) {
        return modules.length > 0;
      },
      message: "Course must have at least one module"
    }
  },
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Instructor",
    required: [true, "Course must have at least one instructor"],
  }],
  max_students: {
    type: Number,
    required: [true, "Maximum number of students is required"],
    min: [1, "Course must allow at least 1 student"],
  },
  prices: {
    regular: {
      type: Number,
      required: [true, "Regular price is required"],
      min: [0, "Price cannot be negative"],
    },
    early_bird: {
      type: Number,
      min: [0, "Early bird price cannot be negative"],
    },
    group_discount: {
      type: Number,
      min: [0, "Group discount cannot be negative"],
      max: [100, "Group discount cannot exceed 100%"],
    }
  },
  prerequisites: [{
    type: String,
    trim: true,
  }],
  certification: {
    is_certified: {
      type: Boolean,
      required: [true, "Certification status is required"],
      default: true
    },
    attendance_required: {
      type: Number,
      min: [0, "Attendance requirement cannot be negative"],
      max: [100, "Attendance requirement cannot exceed 100%"],
      default: 80
    }
  }
});

// Create the LiveCourse model using discriminator
const LiveCourse = BaseCourse.discriminator("live", liveCourseSchema);

export default LiveCourse; 