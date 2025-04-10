import Assignment from "../models/assignment.js";
import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import CoorporateEnrolledModule from "../models/coorporate-enrolled-modules.model.js";
import { AppError } from "../utils/errorHandler.js";
import mongoose from "mongoose";

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

export const getAllAssignments = catchAsync(async (req, res) => {
  const assignments = await Assignment.find()
    .populate("courseId", "course_title category")
    .populate("instructor_id", "full_name email")
    .lean()
    .cache({ time: 30 }); // Cache for 30 seconds

  res.status(200).json(formatResponse(assignments));
});

export const getAssignmentById = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError("Invalid assignment ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId)
    .populate("courseId", "course_title category")
    .populate("instructor_id", "full_name email")
    .lean()
    .cache({ time: 30 });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  res.status(200).json(formatResponse(assignment));
});

export const createAssignment = catchAsync(async (req, res) => {
  const {
    courseId,
    title,
    description,
    instructions,
    due_date,
    max_score,
    submission_type,
    allowed_file_types,
    max_file_size_mb,
    instructor_id,
    resources,
    is_active
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
    instructions,
    due_date,
    max_score,
    submission_type,
    allowed_file_types,
    max_file_size_mb,
    instructor_id,
    resources: resources || [],
    is_active: is_active !== undefined ? is_active : true
  });

  res.status(201).json(formatResponse(newAssignment, "Assignment created successfully"));
});

export const updateAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError("Invalid assignment ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  // Update only allowed fields
  const allowedFields = [
    'title', 'description', 'instructions', 'due_date', 'max_score',
    'submission_type', 'allowed_file_types', 'max_file_size_mb',
    'resources', 'is_active'
  ];

  const filteredData = Object.keys(updateData)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = updateData[key];
      return obj;
    }, {});

  const updatedAssignment = await Assignment.findByIdAndUpdate(
    assignmentId,
    filteredData,
    { new: true, runValidators: true }
  );

  res.status(200).json(formatResponse(updatedAssignment, "Assignment updated successfully"));
});

export const submitAssignment = catchAsync(async (req, res) => {
  const { assignmentId, studentId, submissionFiles, submissionText, submissionLinks } = req.body;

  // Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError("Invalid assignment or student ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  // Check if assignment is still active
  if (!assignment.is_active) {
    throw new AppError("This assignment is no longer accepting submissions", 400);
  }

  // Check if due date has passed
  if (assignment.due_date && new Date() > assignment.due_date) {
    throw new AppError("The deadline for this assignment has passed", 400);
  }

  const existingSubmission = assignment.submissions.find(
    (submission) => submission.studentId.toString() === studentId
  );

  if (existingSubmission) {
    // Update existing submission
    if (submissionFiles && Array.isArray(submissionFiles)) {
      existingSubmission.submissionFiles = [
        ...existingSubmission.submissionFiles,
        ...submissionFiles,
      ];
    }
    
    if (submissionText) {
      existingSubmission.submissionText = submissionText;
    }
    
    if (submissionLinks && Array.isArray(submissionLinks)) {
      existingSubmission.submissionLinks = [
        ...existingSubmission.submissionLinks,
        ...submissionLinks,
      ];
    }
    
    existingSubmission.submittedAt = new Date();
  } else {
    // Create new submission
    assignment.submissions.push({
      studentId,
      submissionFiles: submissionFiles || [],
      submissionText: submissionText || "",
      submissionLinks: submissionLinks || [],
    });
  }

  // Update assignment stats
  assignment.calculateStats();
  await assignment.save();
  
  res.status(200).json(
    formatResponse(
      null,
      existingSubmission ? "Submission updated successfully" : "Submission successful"
    )
  );
});

export const gradeSubmission = catchAsync(async (req, res) => {
  const { assignmentId, studentId, score, feedback } = req.body;

  // Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError("Invalid assignment or student ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  const submission = assignment.submissions.find(
    (sub) => sub.studentId.toString() === studentId
  );

  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  // Validate score
  if (score < 0 || score > assignment.max_score) {
    throw new AppError(`Score must be between 0 and ${assignment.max_score}`, 400);
  }

  // Update submission with grade
  submission.score = score;
  submission.feedback = feedback;
  submission.graded = true;
  submission.gradedAt = new Date();

  // Update assignment stats
  assignment.calculateStats();
  await assignment.save();

  res.status(200).json(formatResponse(null, "Submission graded successfully"));
});

export const getCourseByAssignmentId = catchAsync(async (req, res) => {
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

export const getSubmittedAssignments = catchAsync(async (req, res) => {
  const { page = 1, limit = 5, filter, courseId, instructorId } = req.query;

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

  // Add filters for courseId and instructorId if provided
  let additionalFilters = {};
  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    additionalFilters.courseId = mongoose.Types.ObjectId(courseId);
  }
  if (instructorId && mongoose.Types.ObjectId.isValid(instructorId)) {
    additionalFilters.instructor_id = mongoose.Types.ObjectId(instructorId);
  }

  const queryFilter = {
    "submissions.0": { $exists: true },
    ...dateFilter,
    ...additionalFilters
  };

  const [submittedAssignments, totalAssignments] = await Promise.all([
    Assignment.find(queryFilter)
      .skip(skip)
      .limit(limitNumber)
      .populate("submissions.studentId", "full_name email user_image")
      .populate("courseId", "course_title category")
      .populate("instructor_id", "full_name email")
      .lean()
      .cache({ time: 30 }),
    Assignment.countDocuments(queryFilter),
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

export const getSubmissionStatus = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { studentId } = req.query;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError("Invalid assignment ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId)
    .populate("submissions.studentId", "full_name email user_image")
    .lean()
    .cache({ time: 30 });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  // If studentId is provided, filter submissions for that student
  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    const submission = assignment.submissions.find(
      sub => sub.studentId._id.toString() === studentId
    );
    
    return res.status(200).json(formatResponse({ 
      assignment: {
        _id: assignment._id,
        id: assignment.id,
        title: assignment.title,
        due_date: assignment.due_date,
        max_score: assignment.max_score,
        submission_type: assignment.submission_type
      },
      submission: submission || null
    }));
  }

  res.status(200).json(formatResponse({ 
    assignment,
    submissions: assignment.submissions 
  }));
});

export const getSubmittedAssignmentsCountByInstructor = catchAsync(async (req, res) => {
  const { instructor_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(instructor_id)) {
    throw new AppError("Invalid instructor ID", 400);
  }

  const submittedAssignmentsCount = await Assignment.countDocuments({
    instructor_id,
    "submissions.0": { $exists: true },
  });

  const totalAssignmentsCount = await Assignment.countDocuments({
    instructor_id
  });

  const pendingGradingCount = await Assignment.countDocuments({
    instructor_id,
    "submissions.0": { $exists: true },
    "submissions.graded": false
  });

  res.status(200).json(
    formatResponse({
      totalAssignmentsCount,
      submittedAssignmentsCount,
      pendingGradingCount
    })
  );
});

export const getAssignmentsForEnrolledCourses = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { status } = req.query;

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
  
  let query = { courseId: { $in: courseIds } };
  
  // Add status filter if provided
  if (status === 'active') {
    query.is_active = true;
    query.due_date = { $gt: new Date() };
  } else if (status === 'past') {
    query.due_date = { $lt: new Date() };
  }
  
  const assignments = await Assignment.find(query)
    .populate("courseId", "course_title")
    .populate("instructor_id", "full_name email")
    .lean()
    .cache({ time: 60 });

  // Add submission status for the student
  const assignmentsWithStatus = assignments.map(assignment => {
    const studentSubmission = assignment.submissions.find(
      sub => sub.studentId.toString() === studentId
    );
    
    return {
      ...assignment,
      studentSubmissionStatus: studentSubmission ? {
        submitted: true,
        submittedAt: studentSubmission.submittedAt,
        graded: studentSubmission.graded,
        score: studentSubmission.score
      } : {
        submitted: false
      }
    };
  });

  res.status(200).json(formatResponse({ assignments: assignmentsWithStatus }));
});

export const getAssignmentsForCoorporateEnrolledCourses = catchAsync(async (req, res) => {
  const { coorporateId } = req.params;
  const { status } = req.query;

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
  
  let query = { courseId: { $in: courseIds } };
  
  // Add status filter if provided
  if (status === 'active') {
    query.is_active = true;
    query.due_date = { $gt: new Date() };
  } else if (status === 'past') {
    query.due_date = { $lt: new Date() };
  }
  
  const assignments = await Assignment.find(query)
    .populate("courseId", "course_title")
    .populate("instructor_id", "full_name email")
    .lean()
    .cache({ time: 60 });

  const filteredAssignments = assignments.map(assignment => ({
    ...assignment,
    submissions: assignment.submissions.filter(
      submission => submission.studentId.toString() === coorporateId
    ),
    submissionStatus: assignment.submissions.some(
      submission => submission.studentId.toString() === coorporateId
    ) ? {
      submitted: true,
      submission: assignment.submissions.find(
        submission => submission.studentId.toString() === coorporateId
      )
    } : {
      submitted: false
    }
  }));

  res.status(200).json(formatResponse({ assignments: filteredAssignments }));
});

export const getAssignmentStatistics = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw new AppError("Invalid assignment ID", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  // Calculate updated statistics
  const stats = assignment.calculateStats();
  
  // Get additional statistics
  const totalSubmissions = assignment.submissions.length;
  const gradedSubmissions = assignment.submissions.filter(sub => sub.graded).length;
  const pendingSubmissions = totalSubmissions - gradedSubmissions;
  
  const scoreDistribution = {};
  
  // Create score buckets (0-10, 11-20, etc.)
  for (let i = 0; i <= 100; i += 10) {
    scoreDistribution[`${i}-${i+9}`] = 0;
  }
  
  // Count submissions in each score bucket
  assignment.submissions.forEach(sub => {
    if (sub.graded && sub.score !== undefined) {
      const bucket = Math.floor(sub.score / 10) * 10;
      const bucketKey = `${bucket}-${bucket+9}`;
      scoreDistribution[bucketKey]++;
    }
  });

  res.status(200).json(formatResponse({
    assignmentId: assignment._id,
    title: assignment.title,
    totalSubmissions,
    gradedSubmissions,
    pendingSubmissions,
    averageScore: stats.average_score,
    scoreDistribution,
    lastUpdated: stats.last_updated
  }));
});

export const deleteSubmissionFile = catchAsync(async (req, res) => {
  const { assignmentId, studentId, fileUrl } = req.body;

  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError("Invalid assignment or student ID", 400);
  }

  if (!fileUrl) {
    throw new AppError("File URL is required", 400);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  const submission = assignment.submissions.find(
    sub => sub.studentId.toString() === studentId
  );

  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  // Remove the file URL from submission files
  const fileIndex = submission.submissionFiles.indexOf(fileUrl);
  if (fileIndex === -1) {
    throw new AppError("File not found in submission", 404);
  }

  submission.submissionFiles.splice(fileIndex, 1);
  await assignment.save();

  res.status(200).json(formatResponse(null, "File deleted successfully"));
});
