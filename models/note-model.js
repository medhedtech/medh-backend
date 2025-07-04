import mongoose from "mongoose";
const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    lesson: {
      type: String,
      required: [true, "Lesson ID is required"],
    },
    content: {
      type: String,
      required: [true, "Note content is required"],
      trim: true,
    },
    timestamp: {
      type: Number, // video timestamp in seconds
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Compound index for unique notes per student per lesson
noteSchema.index(
  { course: 1, student: 1, lesson: 1, timestamp: 1 },
  { unique: true },
);

// Method to update note content
noteSchema.methods.updateContent = async function (content, tags) {
  this.content = content;
  this.tags = tags;
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Static method to get all notes for a lesson
noteSchema.statics.getLessonNotes = async function (
  courseId,
  studentId,
  lessonId,
) {
  return await this.find({
    course: courseId,
    student: studentId,
    lesson: lessonId,
  }).sort({ timestamp: 1 });
};

// Static method to get notes by tags
noteSchema.statics.getNotesByTags = async function (courseId, studentId, tags) {
  return await this.find({
    course: courseId,
    student: studentId,
    tags: { $in: tags },
  }).sort({ timestamp: 1 });
};

const Note = mongoose.model("Note", noteSchema);
export default Note;
