import mongoose from "mongoose";
const { Schema } = mongoose;

const bookmarkSchema = new Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: [true, "Course ID is required"]
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Student ID is required"]
  },
  lesson: {
    type: String,
    required: [true, "Lesson ID is required"]
  },
  timestamp: {
    type: Number, // video timestamp in seconds
    required: [true, "Timestamp is required"]
  },
  title: {
    type: String,
    required: [true, "Bookmark title is required"],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Compound index for unique bookmarks per student per lesson
bookmarkSchema.index({ course: 1, student: 1, lesson: 1, timestamp: 1 }, { unique: true });

// Method to update bookmark details
bookmarkSchema.methods.updateDetails = async function(title, description, tags) {
  this.title = title;
  this.description = description;
  this.tags = tags;
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Static method to get all bookmarks for a lesson
bookmarkSchema.statics.getLessonBookmarks = async function(courseId, studentId, lessonId) {
  return await this.find({
    course: courseId,
    student: studentId,
    lesson: lessonId
  }).sort({ timestamp: 1 });
};

// Static method to get bookmarks by tags
bookmarkSchema.statics.getBookmarksByTags = async function(courseId, studentId, tags) {
  return await this.find({
    course: courseId,
    student: studentId,
    tags: { $in: tags }
  }).sort({ timestamp: 1 });
};

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
export default Bookmark; 