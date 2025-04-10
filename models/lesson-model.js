import mongoose from 'mongoose';
import { baseLessonSchema, videoLessonSchema, quizLessonSchema, assessmentLessonSchema } from './lesson-schemas.js';

// Create the base Lesson model
const Lesson = mongoose.model('Lesson', baseLessonSchema);

// Create specific lesson type models
const VideoLesson = mongoose.model('VideoLesson', videoLessonSchema);
const QuizLesson = mongoose.model('QuizLesson', quizLessonSchema);
const AssessmentLesson = mongoose.model('AssessmentLesson', assessmentLessonSchema);

export default Lesson;
export { VideoLesson, QuizLesson, AssessmentLesson }; 