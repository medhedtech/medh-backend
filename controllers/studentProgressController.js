import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import Progress from "../models/progress-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Assignment from "../models/assignment-model.js";
import Quiz from "../models/quiz-model.js";

/**
 * Get all pending assignments and quizzes for a student across all enrolled courses
 */
export const getPendingAssignmentsAndQuizzes = catchAsync(async (req, res) => {
  const studentId = req.user._id;

  // Get all enrolled courses for the student
  const enrolledCourses = await EnrolledCourse.find({
    student_id: studentId,
    status: { $in: ["active", "in_progress"] }
  }).select("course_id");

  const courseIds = enrolledCourses.map(ec => ec.course_id);

  // Get student's progress records for all enrolled courses
  const progressRecords = await Progress.find({
    student: studentId,
    course: { $in: courseIds }
  }).populate("course", "title");

  // Get all assignments and quizzes from enrolled courses
  const assignments = await Assignment.find({
    course: { $in: courseIds },
    isActive: true,
    dueDate: { $gt: new Date() } // Only get assignments that haven't passed their due date
  }).select("title description dueDate course maxScore lesson");

  const quizzes = await Quiz.find({
    course: { $in: courseIds },
    isActive: true,
    endDate: { $gt: new Date() } // Only get quizzes that haven't ended
  }).select("title description time_limit_minutes course passing_score lesson");

  // Process assignments to check which are pending
  const pendingAssignments = assignments.filter(assignment => {
    const courseProgress = progressRecords.find(p => 
      p.course._id.toString() === assignment.course.toString()
    );
    
    if (!courseProgress) return true;

    const assignmentProgress = courseProgress.assignmentProgress.find(
      ap => ap.assignmentId === assignment.id
    );

    return !assignmentProgress || 
           assignmentProgress.status === "not_started" || 
           assignmentProgress.status === "in_progress";
  });

  // Process quizzes to check which are pending
  const pendingQuizzes = quizzes.filter(quiz => {
    const courseProgress = progressRecords.find(p => 
      p.course._id.toString() === quiz.course.toString()
    );
    
    if (!courseProgress) return true;

    const quizProgress = courseProgress.quizProgress.find(
      qp => qp.quizId === quiz.id
    );

    return !quizProgress || 
           quizProgress.status === "not_started" || 
           quizProgress.status === "in_progress" || 
           quizProgress.status === "failed";
  });

  // Format the response
  const formattedAssignments = await Promise.all(pendingAssignments.map(async (assignment) => {
    const course = await mongoose.model("Course").findById(assignment.course).select("title");
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore,
      courseName: course?.title || "Unknown Course",
      courseId: assignment.course,
      lessonId: assignment.lesson,
      type: "assignment",
      // Navigation details
      viewUrl: `/course/${assignment.course}/lesson/${assignment.lesson}/assignment/${assignment.id}`,
      submitUrl: `/course/${assignment.course}/lesson/${assignment.lesson}/assignment/${assignment.id}/submit`,
      apiEndpoints: {
        view: `/api/v1/assignments/${assignment.id}`,
        submit: `/api/v1/assignments/${assignment.id}/submit`,
        progress: `/api/v1/assignments/${assignment.id}/progress`
      }
    };
  }));

  const formattedQuizzes = await Promise.all(pendingQuizzes.map(async (quiz) => {
    const course = await mongoose.model("Course").findById(quiz.course).select("title");
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.time_limit_minutes,
      passingScore: quiz.passing_score,
      courseName: course?.title || "Unknown Course",
      courseId: quiz.course,
      lessonId: quiz.lesson,
      type: "quiz",
      // Navigation details
      viewUrl: `/course/${quiz.course}/lesson/${quiz.lesson}/quiz/${quiz.id}`,
      startUrl: `/course/${quiz.course}/lesson/${quiz.lesson}/quiz/${quiz.id}/start`,
      apiEndpoints: {
        view: `/api/v1/quizzes/${quiz.id}`,
        start: `/api/v1/quizzes/${quiz.id}/start`,
        submit: `/api/v1/quizzes/${quiz.id}/submit`,
        progress: `/api/v1/quizzes/${quiz.id}/progress`
      }
    };
  }));

  // Sort by due date/end date
  const pendingItems = [
    ...formattedAssignments,
    ...formattedQuizzes
  ].sort((a, b) => {
    const dateA = a.dueDate || new Date();
    const dateB = b.dueDate || new Date();
    return dateA - dateB;
  });

  res.status(200).json({
    status: "success",
    data: {
      total: pendingItems.length,
      pendingItems
    }
  });
}); 