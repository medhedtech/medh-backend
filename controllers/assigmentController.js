const Assignment = require("../models/assignment");
const Course = require("../models/course-model");
const EnrolledCourse = require("../models/enrolled-courses-model");
const CoorporateEnrolledModule = require("../models/coorporate-enrolled-modules.model");
const { AppError } = require("../utils/errorHandler");
const mongoose = require("mongoose");

// Response formatter
const formatResponse = (data, message = "Success") => ({
  status: "success",
  message,
  data,
});

// Catch Async utility
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getAllAssignments = catchAsync(async (req, res) => {
  const assignments = await Assignment.find()
    .populate("courseId")
    .lean()
    .cache({ time: 30 }); // Cache for 30 seconds

  res.status(200).json(formatResponse(assignments));
});

exports.createAssignment = catchAsync(async (req, res) => {
  const {
    courseId,
    title,
    description,
    deadline,
    instructor_id,
    assignment_resources,
  } = req.body;

  // Verify course exists
  const courseExists = await Course.exists({ _id: courseId });
  if (!courseExists) {
    throw new AppError("Course not found", 404);
  }

  const newAssignment = await Assignment.create({
    courseId,
    title,
    description,
    deadline,
    instructor_id,
    assignment_resources: assignment_resources || [],
  });

  res.status(201).json(formatResponse(newAssignment, "Assignment created successfully"));
});

exports.submitAssignment = catchAsync(async (req, res) => {
  const { assignmentId, studentId, submissionFile } = req.body;

  // Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError("Invalid assignment or student ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  const existingSubmission = assignment.submissions.find(
    (submission) => submission.studentId.toString() === studentId
  );

  if (existingSubmission) {
    existingSubmission.submissionFiles = [
      ...existingSubmission.submissionFiles,
      ...submissionFile,
    ];
    existingSubmission.updatedAt = new Date();
  } else {
    assignment.submissions.push({
      studentId,
      submissionFiles: submissionFile,
    });
  }

  await assignment.save();
  
  res.status(200).json(
    formatResponse(
      null,
      existingSubmission ? "Submission updated successfully" : "Submission successful"
    )
  );
});

exports.getCourseByAssignmentId = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError("Invalid assignment ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  const course = await Course.findById(assignment.courseId).lean().cache({ time: 60 });
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  res.status(200).json(formatResponse(course));
});

exports.getSubmittedAssignments = catchAsync(async (req, res) => {
  const { page = 1, limit = 5, filter } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNumber = parseInt(limit, 10);
  let dateFilter = {};
  const now = new Date();

  if (filter === "History") {
    const startOfDayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    dateFilter = { "submissions.submittedAt": { $lt: startOfDayUTC } };
  } else if (filter === "Today") {
    const startOfDayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const endOfDayUTC = new Date(startOfDayUTC);
    endOfDayUTC.setUTCDate(startOfDayUTC.getUTCDate() + 1);
    dateFilter = {
      "submissions.submittedAt": { $gte: startOfDayUTC, $lt: endOfDayUTC },
    };
  }

  const [submittedAssignments, totalAssignments] = await Promise.all([
    Assignment.find({
      "submissions.0": { $exists: true },
      ...dateFilter,
    })
      .skip(skip)
      .limit(limitNumber)
      .populate("submissions.studentId", "full_name email user_image")
      .populate("courseId", "course_title category")
      .lean()
      .cache({ time: 30 }),
    Assignment.countDocuments({
      "submissions.0": { $exists: true },
      ...dateFilter,
    }),
  ]);

  const totalPages = Math.ceil(totalAssignments / limitNumber);

  res.status(200).json(
    formatResponse({
      currentPage: parseInt(page),
      totalPages,
      totalAssignments,
      submittedAssignments,
    })
  );
});

exports.getSubmissionStatus = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError("Invalid assignment ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId)
    .populate("submissions.studentId", "full_name email")
    .lean()
    .cache({ time: 30 });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  res.status(200).json(formatResponse({ submissions: assignment.submissions }));
});

exports.getSubmittedAssignmentsCountByInstructor = catchAsync(async (req, res) => {
  const { instructor_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(instructor_id)) {
    throw new AppError("Invalid instructor ID", 400);
  }

  const submittedAssignmentsCount = await Assignment.countDocuments({
    instructor_id,
    "submissions.0": { $exists: true },
  });

  res.status(200).json(
    formatResponse({
      submittedAssignmentsCount,
    })
  );
});

exports.getAssignmentsForEnrolledCourses = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError("Invalid student ID", 400);
  }

  const enrolledCourses = await EnrolledCourse.find({
    student_id: studentId,
  }).lean();

  if (!enrolledCourses.length) {
    return res.status(200).json(
      formatResponse({
        assignments: [],
      })
    );
  }

  const courseIds = enrolledCourses.map((enrollment) => enrollment.course_id);
  
  const assignments = await Assignment.find({ courseId: { $in: courseIds } })
    .populate("courseId", "course_title")
    .populate("instructor_id", "full_name email")
    .lean()
    .cache({ time: 60 });

  res.status(200).json(formatResponse({ assignments }));
});

exports.getAssignmentsForCoorporateEnrolledCourses = catchAsync(async (req, res) => {
  const { coorporateId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(coorporateId)) {
    throw new AppError("Invalid corporate ID", 400);
  }

  const enrolledCourses = await CoorporateEnrolledModule.find({
    coorporate_id: coorporateId,
  }).lean();

  if (!enrolledCourses.length) {
    return res.status(200).json(
      formatResponse({
        assignments: [],
      })
    );
  }

  const courseIds = enrolledCourses.map((enrollment) => enrollment.course_id);
  
  const assignments = await Assignment.find({ courseId: { $in: courseIds } })
    .populate("courseId", "course_title")
    .populate("instructor_id", "full_name email")
    .lean()
    .cache({ time: 60 });

  const filteredAssignments = assignments.map(assignment => ({
    ...assignment,
    submissions: assignment.submissions.filter(
      submission => submission.studentId.toString() === coorporateId
    )
  }));

  res.status(200).json(formatResponse({ assignments: filteredAssignments }));
});
