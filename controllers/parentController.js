import { validationResult } from "express-validator";
import mongoose from "mongoose";
import ParentService from "../services/parentService.js";
import ParentChild from "../models/parent-child.model.js";
import User from "../models/user-modal.js";
import Announcement from "../models/announcement-model.js";
import Assignment from "../models/assignment.js";
import RecordedSession from "../models/recorded-sessions-model.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import Enrollment from "../models/enrollment-model.js";
import { Course } from "../models/course-model.js";
import DemoBooking from "../models/demo-booking.model.js";
import Certificate from "../models/certificate-model.js";
import Attendance from "../models/attendance.model.js";
import catchAsync from "../utils/catchAsync.js";
import logger from "../utils/logger.js";

// Response formatter
const formatResponse = (success, message, data = null, status = 200) => ({
  success,
  message,
  data,
  status,
});

/**
 * @desc    Get parent dashboard profile with linked children
 * @route   GET /api/v1/parent/dashboard/profile
 * @access  Private (Parent only)
 */
export const getParentDashboardProfile = catchAsync(async (req, res) => {
  const parentId = req.user.id;

  try {
    const result = await ParentService.getParentDashboardProfile(parentId);
    
    res.status(200).json(
      formatResponse(true, "Parent dashboard profile retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message === 'Parent not found') {
      return res.status(404).json(
        formatResponse(false, "Parent not found", null, 404)
      );
    }
    throw error;
  }
});

/**
 * @desc    Get upcoming classes for parent's children
 * @route   GET /api/v1/parent/dashboard/classes/upcoming
 * @access  Private (Parent only)
 */
export const getUpcomingClasses = catchAsync(async (req, res) => {
  const { limit = 10, child_id, days_ahead = 7 } = req.query;
  const parentId = req.user.id;

  const options = {
    limit: parseInt(limit),
    child_id,
    days_ahead: parseInt(days_ahead)
  };

  try {
    const result = await ParentService.getUpcomingClasses(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Upcoming classes retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No upcoming classes found", { upcoming_classes: [] })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get performance summary for parent's children
 * @route   GET /api/v1/parent/dashboard/performance/summary
 * @access  Private (Parent only)
 */
export const getPerformanceSummary = catchAsync(async (req, res) => {
  const { child_id, time_period = 'month' } = req.query;
  const parentId = req.user.id;

  const options = {
    child_id,
    time_period
  };

  try {
    const result = await ParentService.getPerformanceSummary(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Performance summary retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No performance data available", { 
          summary: { excelling_count: 0, struggling_count: 0, average_performance: 0 },
          children_performance: []
        })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get dynamic dashboard shortcuts based on permissions
 * @route   GET /api/v1/parent/dashboard/shortcuts
 * @access  Private (Parent only)
 */
export const getDashboardShortcuts = catchAsync(async (req, res) => {
  const parentId = req.user.id;

  try {
    const result = await ParentService.getDashboardShortcuts(parentId);
    
    res.status(200).json(
      formatResponse(true, "Dashboard shortcuts retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No shortcuts available", { shortcuts: [] })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get demo sessions for parent's children
 * @route   GET /api/v1/parent/demo-sessions
 * @access  Private (Parent only)
 */
export const getDemoSessions = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, child_id } = req.query;
  const parentId = req.user.id;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    child_id
  };

  try {
    const result = await ParentService.getDemoSessions(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Demo sessions retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No demo sessions found", { 
          sessions: [],
          pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
        })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get specific demo session details
 * @route   GET /api/v1/parent/demo-sessions/:sessionId
 * @access  Private (Parent only)
 */
export const getDemoSessionById = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const parentId = req.user.id;

  // Validate sessionId format
  if (!mongoose.isValidObjectId(sessionId)) {
    return res.status(400).json(
      formatResponse(false, "Invalid session ID format", null, 400)
    );
  }

  try {
    const result = await ParentService.getDemoSessionById(parentId, sessionId);
    
    res.status(200).json(
      formatResponse(true, "Demo session retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json(
        formatResponse(false, "Session not found or access denied", null, 404)
      );
    }
    throw error;
  }
});

/**
 * @desc    Get demo certificates for parent's children
 * @route   GET /api/v1/parent/demo-certificates
 * @access  Private (Parent only)
 */
export const getDemoCertificates = catchAsync(async (req, res) => {
  const { child_id, course_id } = req.query;
  const parentId = req.user.id;

  const options = {
    child_id,
    course_id
  };

  try {
    const result = await ParentService.getCertificates(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Demo certificates retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No certificates found", { 
          certificates: [],
          total_certificates: 0,
          children_with_certificates: 0
        })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get class timetable for parent's children
 * @route   GET /api/v1/parent/timetable
 * @access  Private (Parent only)
 */
export const getTimetable = catchAsync(async (req, res) => {
  const { child_id, week_offset = 0, view = 'week' } = req.query;
  const parentId = req.user.id;

  const options = {
    child_id,
    week_offset: parseInt(week_offset),
    view
  };

  try {
    const result = await ParentService.getTimetable(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Timetable retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No timetable data available", { 
          timetable: [],
          week_info: { start_date: null, end_date: null }
        })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get attendance reports for parent's children
 * @route   GET /api/v1/parent/attendance
 * @access  Private (Parent only)
 */
export const getAttendanceReports = catchAsync(async (req, res) => {
  const { 
    child_id, 
    course_id, 
    start_date, 
    end_date, 
    page = 1, 
    limit = 20 
  } = req.query;
  const parentId = req.user.id;

  const options = {
    child_id,
    course_id,
    start_date,
    end_date,
    page: parseInt(page),
    limit: parseInt(limit)
  };

  try {
    const result = await ParentService.getAttendanceReports(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Attendance reports retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No attendance data available", { 
          attendance_summary: [],
          pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
        })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get recorded class sessions for children
 * @route   GET /api/v1/parent/classes/recordings
 * @access  Private (Parent only)
 */
export const getRecordedSessions = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, child_id, course_id } = req.query;
  const parentId = req.user.id;

  // Get parent's children
  const children = await ParentChild.findChildrenByParent(parentId);
  
  if (!children.length) {
    return res.status(200).json(
      formatResponse(true, "No recordings available", { recordings: [] }, 200)
    );
  }

  let childIds = children.map(rel => rel.child_id._id);

  // Filter by specific child if requested
  if (child_id) {
    if (!mongoose.isValidObjectId(child_id)) {
      return res.status(400).json(
        formatResponse(false, "Invalid child ID format", null, 400)
      );
    }
    
    const hasAccess = children.some(rel => 
      rel.child_id._id.toString() === child_id.toString()
    );
    
    if (!hasAccess) {
      return res.status(403).json(
        formatResponse(false, "Access denied to this child's recordings", null, 403)
      );
    }
    
    childIds = [child_id];
  }

  // Build query for enrollments
  const enrollmentQuery = {
    student: { $in: childIds },
    status: { $in: ['active', 'completed'] }
  };

  if (course_id) {
    if (!mongoose.isValidObjectId(course_id)) {
      return res.status(400).json(
        formatResponse(false, "Invalid course ID format", null, 400)
      );
    }
    enrollmentQuery.course = course_id;
  }

  // Get enrollments
  const enrollments = await Enrollment.find(enrollmentQuery)
    .populate('course', 'course_title course_image')
    .lean();

  const courseIds = enrollments.map(e => e.course._id);

  // Get recorded sessions
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [recordings, total] = await Promise.all([
    RecordedSession.find({ course_id: { $in: courseIds } })
      .populate('instructor_id', 'full_name email')
      .populate('course_id', 'course_title course_image')
      .sort({ session_date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    RecordedSession.countDocuments({ course_id: { $in: courseIds } })
  ]);

  // Enrich with child access information
  const enrichedRecordings = recordings.map(recording => {
    const relevantEnrollments = enrollments.filter(e => 
      e.course._id.toString() === recording.course_id._id.toString()
    );
    
    const accessibleChildren = relevantEnrollments.map(e => {
      const child = children.find(rel => 
        rel.child_id._id.toString() === e.student.toString()
      );
      return child ? {
        id: child.child_id._id,
        name: child.child_id.full_name,
        student_id: child.child_id.student_id
      } : null;
    }).filter(Boolean);

    return {
      ...recording,
      accessible_children: accessibleChildren,
      has_access: accessibleChildren.length > 0
    };
  }).filter(recording => recording.has_access);

  res.status(200).json(
    formatResponse(true, "Recorded sessions retrieved successfully", {
      recordings: enrichedRecordings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCount: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    })
  );
});

/**
 * @desc    Get detailed performance tracking over time
 * @route   GET /api/v1/parent/performance/tracking
 * @access  Private (Parent only)
 */
export const getPerformanceTracking = catchAsync(async (req, res) => {
  const { 
    child_id, 
    course_id, 
    time_period = 'month', 
    metric = 'overall' 
  } = req.query;
  const parentId = req.user.id;

  const options = {
    child_id,
    course_id,
    time_period,
    metric
  };

  try {
    const result = await ParentService.getPerformanceTracking(parentId, options);
    
    res.status(200).json(
      formatResponse(true, "Performance tracking retrieved successfully", result.data)
    );
  } catch (error) {
    if (error.message.includes('No children found')) {
      return res.status(200).json(
        formatResponse(true, "No performance tracking data available", { 
          tracking_data: [],
          summary: { trend: 'stable', improvement: 0 }
        })
      );
    }
    throw error;
  }
});

/**
 * @desc    Get pending assignments for parent's children
 * @route   GET /api/v1/parent/assignments/pending
 * @access  Private (Parent only)
 */
export const getPendingAssignments = catchAsync(async (req, res) => {
  const { child_id, course_id, page = 1, limit = 20 } = req.query;
  const parentId = req.user.id;

  // Get parent's children
  const children = await ParentChild.findChildrenByParent(parentId);
  
  if (!children.length) {
    return res.status(200).json(
      formatResponse(true, "No pending assignments found", { 
        assignments: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
      })
    );
  }

  let childIds = children.map(rel => rel.child_id._id);

  // Filter by specific child if requested
  if (child_id) {
    if (!mongoose.isValidObjectId(child_id)) {
      return res.status(400).json(
        formatResponse(false, "Invalid child ID format", null, 400)
      );
    }
    
    const hasAccess = children.some(rel => 
      rel.child_id._id.toString() === child_id.toString()
    );
    
    if (!hasAccess) {
      return res.status(403).json(
        formatResponse(false, "Access denied to this child's assignments", null, 403)
      );
    }
    
    childIds = [child_id];
  }

  // Get enrollments for children
  const enrollmentQuery = {
    student: { $in: childIds },
    status: { $in: ['active'] }
  };

  if (course_id) {
    if (!mongoose.isValidObjectId(course_id)) {
      return res.status(400).json(
        formatResponse(false, "Invalid course ID format", null, 400)
      );
    }
    enrollmentQuery.course = course_id;
  }

  const enrollments = await Enrollment.find(enrollmentQuery)
    .populate('course', 'course_title')
    .lean();

  const courseIds = enrollments.map(e => e.course._id);

  // Get assignments that are active and due in the future
  const assignmentQuery = {
    courseId: { $in: courseIds },
    due_date: { $gte: new Date() },
    is_active: true
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [assignments, total] = await Promise.all([
    Assignment.find(assignmentQuery)
      .populate('courseId', 'course_title')
      .populate('instructor_id', 'full_name email')
      .sort({ due_date: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Assignment.countDocuments(assignmentQuery)
  ]);

  // Check submission status for each child
  const enrichedAssignments = assignments.map(assignment => {
    const childSubmissions = assignment.submissions?.filter(sub => 
      childIds.some(childId => childId.toString() === sub.studentId.toString())
    ) || [];

    const submissionsByChild = childIds.map(childId => {
      const child = children.find(rel => 
        rel.child_id._id.toString() === childId.toString()
      );
      
      const submission = childSubmissions.find(sub => 
        sub.studentId.toString() === childId.toString()
      );

      return {
        child: {
          id: child.child_id._id,
          name: child.child_id.full_name,
          student_id: child.child_id.student_id
        },
        submission_status: submission ? {
          submitted: true,
          submitted_at: submission.submittedAt,
          graded: submission.graded,
          score: submission.score
        } : {
          submitted: false,
          days_until_due: Math.ceil((assignment.due_date - new Date()) / (1000 * 60 * 60 * 24))
        }
      };
    }).filter(item => {
      // Only include children enrolled in this course
      return enrollments.some(e => 
        e.student.toString() === item.child.id.toString() &&
        e.course._id.toString() === assignment.courseId._id.toString()
      );
    });

    return {
      ...assignment,
      children_submissions: submissionsByChild
    };
  });

  res.status(200).json(
    formatResponse(true, "Pending assignments retrieved successfully", {
      assignments: enrichedAssignments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCount: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    })
  );
});

/**
 * @desc    Get grade reports for parent's children
 * @route   GET /api/v1/parent/grades
 * @access  Private (Parent only)
 */
export const getGradeReports = catchAsync(async (req, res) => {
  const { 
    child_id, 
    course_id, 
    subject, 
    time_period = 'semester', 
    page = 1, 
    limit = 20 
  } = req.query;
  const parentId = req.user.id;

  // Get parent's children
  const children = await ParentChild.findChildrenByParent(parentId);
  
  if (!children.length) {
    return res.status(200).json(
      formatResponse(true, "No grade reports available", { 
        grade_reports: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
      })
    );
  }

  let childIds = children.map(rel => rel.child_id._id);

  // Filter by specific child if requested
  if (child_id) {
    if (!mongoose.isValidObjectId(child_id)) {
      return res.status(400).json(
        formatResponse(false, "Invalid child ID format", null, 400)
      );
    }
    
    const hasAccess = children.some(rel => 
      rel.child_id._id.toString() === child_id.toString()
    );
    
    if (!hasAccess) {
      return res.status(403).json(
        formatResponse(false, "Access denied to this child's grades", null, 403)
      );
    }
    
    childIds = [child_id];
  }

  // Get enrollments
  const enrollmentQuery = {
    student: { $in: childIds },
    status: { $in: ['active', 'completed'] }
  };

  if (course_id) {
    if (!mongoose.isValidObjectId(course_id)) {
      return res.status(400).json(
        formatResponse(false, "Invalid course ID format", null, 400)
      );
    }
    enrollmentQuery.course = course_id;
  }

  const enrollments = await Enrollment.find(enrollmentQuery)
    .populate('course', 'course_title course_category course_image')
    .populate('student', 'full_name student_id')
    .lean();

  // Filter by subject if provided
  let filteredEnrollments = enrollments;
  if (subject) {
    filteredEnrollments = enrollments.filter(e => 
      e.course.course_category?.toLowerCase().includes(subject.toLowerCase()) ||
      e.course.course_title.toLowerCase().includes(subject.toLowerCase())
    );
  }

  const courseIds = filteredEnrollments.map(e => e.course._id);

  // Get assignments with grades
  const assignments = await Assignment.find({
    courseId: { $in: courseIds },
    'submissions.graded': true
  })
  .populate('courseId', 'course_title course_category')
  .lean();

  // Process grade reports for each child
  const gradeReports = children.map(rel => {
    const childId = rel.child_id._id;
    const childEnrollments = filteredEnrollments.filter(e => 
      e.student._id.toString() === childId.toString()
    );

    const subjects = {};
    let totalGrades = 0;
    let totalScore = 0;

    childEnrollments.forEach(enrollment => {
      const courseId = enrollment.course._id.toString();
      const courseAssignments = assignments.filter(a => 
        a.courseId._id.toString() === courseId
      );

      const courseGrades = [];
      courseAssignments.forEach(assignment => {
        const submission = assignment.submissions?.find(sub => 
          sub.studentId.toString() === childId.toString() && sub.graded
        );
        
        if (submission) {
          courseGrades.push({
            assignment_id: assignment._id,
            assignment_title: assignment.title,
            score: submission.score,
            max_score: assignment.max_score || 100,
            percentage: Math.round((submission.score / (assignment.max_score || 100)) * 100),
            graded_at: submission.gradedAt,
            feedback: submission.feedback
          });
          
          totalGrades++;
          totalScore += submission.score;
        }
      });

      if (courseGrades.length > 0) {
        const courseAverage = Math.round(
          courseGrades.reduce((sum, g) => sum + g.percentage, 0) / courseGrades.length
        );

        const subjectName = enrollment.course.course_category || 'General';
        
        if (!subjects[subjectName]) {
          subjects[subjectName] = {
            subject_name: subjectName,
            courses: [],
            average_grade: 0,
            total_assignments: 0
          };
        }

        subjects[subjectName].courses.push({
          course: enrollment.course,
          grades: courseGrades,
          course_average: courseAverage,
          total_assignments: courseGrades.length
        });

        subjects[subjectName].total_assignments += courseGrades.length;
      }
    });

    // Calculate subject averages
    Object.keys(subjects).forEach(subjectName => {
      const subject = subjects[subjectName];
      const totalCourseAverages = subject.courses.reduce((sum, course) => sum + course.course_average, 0);
      subject.average_grade = subject.courses.length > 0 
        ? Math.round(totalCourseAverages / subject.courses.length)
        : 0;
    });

    const overallAverage = totalGrades > 0 ? Math.round(totalScore / totalGrades) : 0;

    return {
      child: {
        id: rel.child_id._id,
        name: rel.child_id.full_name,
        student_id: rel.child_id.student_id
      },
      subjects: Object.values(subjects),
      overall_average: overallAverage,
      total_assignments: totalGrades,
      time_period
    };
  }).filter(report => report.subjects.length > 0);

  // Apply pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginatedReports = gradeReports.slice(skip, skip + parseInt(limit));
  const totalPages = Math.ceil(gradeReports.length / parseInt(limit));

  res.status(200).json(
    formatResponse(true, "Grade reports retrieved successfully", {
      grade_reports: paginatedReports,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: gradeReports.length,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    })
  );
});

/**
 * @desc    Get messages with instructors
 * @route   GET /api/v1/parent/messages
 * @access  Private (Parent only)
 */
export const getMessages = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, instructor_id, child_id } = req.query;
  const parentId = req.user.id;

  // Check permissions
  let permissionQuery = {
    parent_id: parentId,
    status: 'active',
    can_communicate_with_instructors: true
  };

  if (child_id) {
    permissionQuery.child_id = child_id;
  }

  const hasPermission = await ParentChild.findOne(permissionQuery);

  if (!hasPermission) {
    return res.status(403).json(
      formatResponse(false, "No permission to view messages", null, 403)
    );
  }

  // For now, return a placeholder response since messaging system needs to be implemented
  res.status(200).json(
    formatResponse(true, "Messaging system coming soon", {
      messages: [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false
      },
      note: "Full messaging system is being developed"
    })
  );
});

/**
 * @desc    Send message to instructor
 * @route   POST /api/v1/parent/messages
 * @access  Private (Parent only)
 */
export const sendMessage = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      formatResponse(false, "Validation failed", { errors: errors.array() }, 400)
    );
  }

  const { instructor_id, child_id, message, subject } = req.body;
  const parentId = req.user.id;

  // Validate required fields
  if (!instructor_id || !message) {
    return res.status(400).json(
      formatResponse(false, "Instructor ID and message are required", null, 400)
    );
  }

  if (message.trim().length === 0) {
    return res.status(400).json(
      formatResponse(false, "Message cannot be empty", null, 400)
    );
  }

  // Check permissions
  let permissionQuery = {
    parent_id: parentId,
    status: 'active',
    can_communicate_with_instructors: true
  };

  if (child_id) {
    permissionQuery.child_id = child_id;
  }

  const hasPermission = await ParentChild.findOne(permissionQuery);

  if (!hasPermission) {
    return res.status(403).json(
      formatResponse(false, "No permission to communicate with instructors", null, 403)
    );
  }

  // Validate instructor exists
  const instructor = await User.findOne({
    _id: instructor_id,
    role: { $in: ['instructor'] }
  });

  if (!instructor) {
    return res.status(404).json(
      formatResponse(false, "Instructor not found", null, 404)
    );
  }

  // For now, return success response since messaging system needs to be implemented
  res.status(201).json(
    formatResponse(true, "Message sending feature coming soon", {
      message_id: new mongoose.Types.ObjectId(),
      status: "queued",
      note: "Messaging system is being developed"
    }, 201)
  );
});

/**
 * @desc    Get announcements for parent
 * @route   GET /api/v1/parent/announcements
 * @access  Private (Parent only)
 */
export const getAnnouncements = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type, include_expired = false } = req.query;
  const parentId = req.user.id;

  const options = {
    limit: parseInt(limit),
    page: parseInt(page),
    type,
    targetAudience: "parent",
    userId: parentId,
    includeExpired: include_expired === 'true'
  };

  const announcements = await Announcement.getRecent(options);

  // Get total count for pagination
  const totalQuery = {
    status: "published",
    $or: [
      { targetAudience: "all" },
      { targetAudience: "parent" },
      { specificStudents: parentId }
    ]
  };

  if (type) totalQuery.type = type;
  if (!options.includeExpired) {
    totalQuery.$and = [
      {
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } }
        ]
      }
    ];
  }

  const total = await Announcement.countDocuments(totalQuery);
  const totalPages = Math.ceil(total / options.limit);

  res.status(200).json(
    formatResponse(true, "Announcements retrieved successfully", {
      announcements,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    })
  );
}); 