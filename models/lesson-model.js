const mongoose = require("mongoose");
const { baseLessonSchema, videoLessonSchema, quizLessonSchema, assessmentLessonSchema } = require('./lesson-schemas');

// Create base Lesson model
const Lesson = mongoose.model("Lesson", baseLessonSchema);

// Create discriminator models for different lesson types
const VideoLesson = Lesson.discriminator('video', videoLessonSchema);
const QuizLesson = Lesson.discriminator('quiz', quizLessonSchema);
const AssessmentLesson = Lesson.discriminator('assessment', assessmentLessonSchema);

module.exports = {
  Lesson,
  VideoLesson,
  QuizLesson,
  AssessmentLesson
}; 