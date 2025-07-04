import express from "express";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// ==========================================
// PROGRAM COORDINATOR DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/dashboard/overview
 * @desc    Get program coordinator dashboard overview
 * @access  Private (Program Coordinator only)
 */
router.get("/dashboard/overview", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Dashboard overview retrieved successfully",
      data: {
        recent_activities: [
          {
            id: "activity_1",
            type: "enrollment_approved",
            description: "Approved enrollment for John Doe in Python Basics",
            timestamp: new Date().toISOString(),
            priority: "medium"
          },
          {
            id: "activity_2", 
            type: "instructor_assigned",
            description: "Assigned Sarah Wilson to Advanced JavaScript course",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            priority: "high"
          }
        ],
        quick_stats: {
          total_courses: 45,
          active_enrollments: 234,
          pending_applications: 12,
          active_classes_today: 8,
          technical_issues_reported: 3,
          instructor_performance_alerts: 2
        },
        quick_access: [
          { name: "Pending Enrollments", count: 12, url: "/enrollments/pending" },
          { name: "Today's Classes", count: 8, url: "/classes/today" },
          { name: "Technical Issues", count: 3, url: "/issues/technical" },
          { name: "Instructor Requests", count: 5, url: "/instructors/requests" }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get dashboard overview",
      error: error.message
    });
  }
});

// ==========================================
// COURSE OVERSIGHT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/courses
 * @desc    View all courses under coordinator's program
 * @access  Private (Program Coordinator only)
 */
router.get("/courses", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { status, category, instructor_id, page = 1, limit = 20 } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Courses retrieved successfully",
      data: {
        courses: [
          {
            _id: "course_1",
            title: "Python Programming Fundamentals",
            description: "Complete introduction to Python programming",
            category: "Programming",
            level: "beginner",
            instructor: {
              id: "instructor_1",
              name: "Dr. Sarah Wilson",
              email: "sarah@medh.co"
            },
            status: "active",
            enrollment_stats: {
              total_enrolled: 45,
              capacity: 50,
              completion_rate: 78,
              average_rating: 4.6
            },
            schedule: {
              start_date: "2024-01-15",
              end_date: "2024-04-15",
              duration_weeks: 12,
              classes_per_week: 3
            },
            progress_metrics: {
              modules_completed: 8,
              total_modules: 12,
              overall_progress: 67,
              attendance_rate: 85
            },
            recent_issues: [
              {
                type: "technical",
                description: "Audio issues in Module 7",
                severity: "medium",
                reported_date: "2024-01-20"
              }
            ]
          }
        ],
        pagination: {
          current_page: 1,
          total_pages: 3,
          total_courses: 45,
          per_page: 20
        },
        filters_applied: { status, category, instructor_id }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve courses",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/coordinator/courses/:courseId/progress
 * @desc    Monitor specific course progress
 * @access  Private (Program Coordinator only)
 */
router.get("/courses/:courseId/progress", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    
    return res.status(200).json({
      success: true,
      message: "Course progress retrieved successfully",
      data: {
        course_id: courseId,
        overall_progress: 67,
        module_progress: [
          { module_name: "Introduction", completion_rate: 100, avg_score: 92 },
          { module_name: "Basic Syntax", completion_rate: 95, avg_score: 88 },
          { module_name: "Data Structures", completion_rate: 78, avg_score: 85 }
        ],
        student_performance: {
          total_students: 45,
          active_students: 42,
          at_risk_students: 3,
          top_performers: 8,
          avg_completion_time: "3.2 weeks"
        },
        instructor_metrics: {
          response_time: "2.3 hours",
          feedback_quality: 4.7,
          engagement_score: 92
        },
        recommendations: [
          {
            type: "improvement",
            area: "Module 6 - Functions",
            suggestion: "Add more practical exercises",
            priority: "medium"
          }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get course progress",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/coordinator/courses/:courseId/feedback
 * @desc    Submit course improvement suggestions
 * @access  Private (Program Coordinator only)
 */
router.post("/courses/:courseId/feedback", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { feedback_type, subject, description, priority, suggested_actions } = req.body;
    
    return res.status(201).json({
      success: true,
      message: "Course feedback submitted successfully",
      data: {
        feedback_id: "feedback_" + Date.now(),
        course_id: courseId,
        submitted_by: req.user.id,
        feedback_type,
        subject,
        status: "pending_review",
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit course feedback",
      error: error.message
    });
  }
});

// ==========================================
// ENROLLMENT MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/enrollments/applications
 * @desc    Get student enrollment applications
 * @access  Private (Program Coordinator only)
 */
router.get("/enrollments/applications", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { status = 'pending', course_id, priority, page = 1, limit = 20 } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Enrollment applications retrieved successfully",
      data: {
        applications: [
          {
            application_id: "app_001",
            student: {
              id: "student_123",
              full_name: "John Doe",
              email: "john.doe@email.com",
              phone: "+1234567890",
              background: "Computer Science Graduate",
              experience_level: "beginner"
            },
            course: {
              id: "course_1",
              title: "Python Programming Fundamentals",
              category: "Programming",
              level: "beginner"
            },
            application_details: {
              submitted_date: "2024-01-20T10:30:00Z",
              motivation: "Looking to transition into software development",
              prerequisites_met: true,
              payment_status: "pending",
              documents_submitted: ["resume", "transcript"],
              priority_score: 85
            },
            status: "pending",
            coordinator_notes: "",
            last_updated: "2024-01-20T10:30:00Z"
          }
        ],
        summary: {
          total_applications: 45,
          pending_review: 12,
          approved_today: 8,
          rejected_today: 2,
          waitlisted: 5
        },
        filters_applied: { status, course_id, priority }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve enrollment applications",
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/coordinator/enrollments/:applicationId/review
 * @desc    Approve or reject enrollment application
 * @access  Private (Program Coordinator only)
 */
router.put("/enrollments/:applicationId/review", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { decision, reason, notes, batch_assignment } = req.body;
    
    return res.status(200).json({
      success: true,
      message: `Enrollment application ${decision} successfully`,
      data: {
        application_id: applicationId,
        decision,
        reviewed_by: req.user.id,
        review_date: new Date().toISOString(),
        reason,
        notes,
        batch_assignment: decision === 'approved' ? batch_assignment : null,
        next_steps: decision === 'approved' 
          ? "Student will receive enrollment confirmation and batch details"
          : "Student will receive rejection notification with feedback"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to review enrollment application",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/coordinator/enrollments/waitlist
 * @desc    Manage course waitlists
 * @access  Private (Program Coordinator only)
 */
router.get("/enrollments/waitlist", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { course_id } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Waitlist retrieved successfully",
      data: {
        waitlisted_students: [
          {
            position: 1,
            student: {
              id: "student_456",
              full_name: "Jane Smith",
              email: "jane.smith@email.com",
              application_date: "2024-01-18T14:20:00Z"
            },
            course: {
              id: "course_1",
              title: "Python Programming Fundamentals",
              current_capacity: 50,
              enrolled_count: 50
            },
            estimated_availability: "2024-02-15",
            priority_score: 78,
            waitlist_date: "2024-01-18T14:20:00Z"
          }
        ],
        waitlist_stats: {
          total_waitlisted: 15,
          expected_openings: 3,
          avg_wait_time: "2 weeks",
          conversion_rate: "68%"
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve waitlist",
      error: error.message
    });
  }
});

// ==========================================
// CLASS MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/classes/monitor
 * @desc    Monitor ongoing classes
 * @access  Private (Program Coordinator only)
 */
router.get("/classes/monitor", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], status } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Class monitoring data retrieved successfully",
      data: {
        classes: [
          {
            class_id: "class_001",
            course: {
              id: "course_1",
              title: "Python Programming Fundamentals",
              module: "Data Structures"
            },
            instructor: {
              id: "instructor_1",
              name: "Dr. Sarah Wilson",
              status: "online"
            },
            schedule: {
              start_time: "2024-01-25T10:00:00Z",
              end_time: "2024-01-25T12:00:00Z",
              duration_minutes: 120
            },
            attendance: {
              total_students: 45,
              present: 42,
              absent: 3,
              late_joiners: 2,
              attendance_rate: 93
            },
            technical_status: {
              platform: "Zoom",
              connection_quality: "excellent",
              audio_quality: "good",
              video_quality: "excellent",
              issues_reported: 0
            },
            engagement_metrics: {
              chat_messages: 156,
              questions_asked: 23,
              polls_conducted: 4,
              engagement_score: 88
            },
            status: "ongoing"
          }
        ],
        summary: {
          total_classes_today: 8,
          ongoing_classes: 3,
          completed_classes: 4,
          upcoming_classes: 1,
          technical_issues: 1,
          overall_health: "good"
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class monitoring data",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/coordinator/classes/issues/report
 * @desc    Report technical or quality issues
 * @access  Private (Program Coordinator only)
 */
router.post("/classes/issues/report", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { class_id, issue_type, severity, description, immediate_action_required } = req.body;
    
    return res.status(201).json({
      success: true,
      message: "Issue reported successfully",
      data: {
        issue_id: "issue_" + Date.now(),
        class_id,
        issue_type,
        severity,
        reported_by: req.user.id,
        reported_at: new Date().toISOString(),
        status: "open",
        assigned_to: immediate_action_required ? "technical_team" : null,
        estimated_resolution: severity === "high" ? "15 minutes" : "1 hour"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to report issue",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/coordinator/classes/feedback
 * @desc    Get class feedback and quality metrics
 * @access  Private (Program Coordinator only)
 */
router.get("/classes/feedback", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { course_id, instructor_id, date_range } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Class feedback retrieved successfully",
      data: {
        feedback_summary: {
          total_responses: 234,
          average_rating: 4.6,
          response_rate: 78,
          satisfaction_score: 92
        },
        feedback_categories: {
          content_quality: { rating: 4.7, feedback_count: 156 },
          instructor_performance: { rating: 4.8, feedback_count: 189 },
          technical_quality: { rating: 4.3, feedback_count: 134 },
          engagement_level: { rating: 4.5, feedback_count: 167 }
        },
        recent_feedback: [
          {
            feedback_id: "fb_001",
            student_id: "student_123",
            class_date: "2024-01-24",
            rating: 5,
            comment: "Excellent explanation of complex concepts",
            category: "instructor_performance",
            flagged: false
          }
        ],
        improvement_areas: [
          {
            area: "Technical Setup",
            priority: "medium",
            suggestion: "Improve audio quality in Room B",
            frequency: 12
          }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class feedback",
      error: error.message
    });
  }
});

// ==========================================
// INSTRUCTOR MANAGEMENT ROUTES
// ==========================================

/**
 * @route   POST /api/v1/coordinator/instructors/:instructorId/assign
 * @desc    Assign instructor to course
 * @access  Private (Program Coordinator only)
 */
router.post("/instructors/:instructorId/assign", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { course_id, batch_id, start_date, responsibilities, compensation } = req.body;
    
    return res.status(201).json({
      success: true,
      message: "Instructor assigned successfully",
      data: {
        assignment_id: "assign_" + Date.now(),
        instructor_id: instructorId,
        course_id,
        batch_id,
        start_date,
        responsibilities,
        compensation,
        status: "active",
        assigned_by: req.user.id,
        assigned_date: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to assign instructor",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/coordinator/instructors/performance
 * @desc    Monitor instructor performance metrics
 * @access  Private (Program Coordinator only)
 */
router.get("/instructors/performance", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { instructor_id, time_period = '30_days' } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Instructor performance data retrieved successfully",
      data: {
        instructors: [
          {
            instructor: {
              id: "instructor_1",
              name: "Dr. Sarah Wilson",
              email: "sarah@medh.co",
              specializations: ["Python", "Data Science"]
            },
            performance_metrics: {
              student_satisfaction: 4.8,
              completion_rate: 87,
              attendance_rate: 94,
              response_time: "2.3 hours",
              engagement_score: 92
            },
            course_stats: {
              total_courses: 3,
              active_students: 125,
              completed_students: 89,
              classes_conducted: 45
            },
            recent_feedback: {
              positive_count: 156,
              negative_count: 8,
              improvement_suggestions: 12
            },
            alerts: [
              {
                type: "low_engagement",
                course: "Advanced Python",
                severity: "medium",
                date: "2024-01-20"
              }
            ]
          }
        ],
        summary: {
          total_instructors: 12,
          high_performers: 8,
          needs_attention: 2,
          new_instructors: 2,
          avg_satisfaction: 4.6
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor performance",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/coordinator/communication/messages
 * @desc    Facilitate instructor-student communication
 * @access  Private (Program Coordinator only)
 */
router.get("/communication/messages", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { flagged_only, priority, course_id } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Communication messages retrieved successfully",
      data: {
        messages: [
          {
            message_id: "msg_001",
            from: {
              id: "student_123",
              name: "John Doe",
              type: "student"
            },
            to: {
              id: "instructor_1", 
              name: "Dr. Sarah Wilson",
              type: "instructor"
            },
            subject: "Question about Assignment 3",
            preview: "I'm having trouble understanding the recursion concept...",
            timestamp: "2024-01-24T14:30:00Z",
            status: "unread",
            priority: "medium",
            flagged: false,
            course_context: {
              id: "course_1",
              title: "Python Programming Fundamentals"
            }
          }
        ],
        summary: {
          total_messages: 234,
          unread_messages: 45,
          flagged_messages: 3,
          avg_response_time: "3.2 hours",
          escalated_issues: 2
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve communication messages",
      error: error.message
    });
  }
});

// ==========================================
// ATTENDANCE MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/attendance/reports
 * @desc    View comprehensive attendance reports
 * @access  Private (Program Coordinator only)
 */
router.get("/attendance/reports", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { report_type = 'summary', course_id, instructor_id, batch_id, date_range } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Attendance reports retrieved successfully",
      data: {
        summary: {
          overall_attendance_rate: 87,
          total_classes_conducted: 234,
          total_student_sessions: 10450,
          attendance_trend: "stable"
        },
        by_course: [
          {
            course_id: "course_1",
            course_title: "Python Programming Fundamentals",
            attendance_rate: 89,
            total_classes: 45,
            enrolled_students: 50,
            at_risk_students: 3
          }
        ],
        by_instructor: [
          {
            instructor_id: "instructor_1",
            instructor_name: "Dr. Sarah Wilson",
            courses_taught: 3,
            avg_attendance_rate: 91,
            total_classes: 67
          }
        ],
        by_batch: [
          {
            batch_id: "batch_001",
            batch_name: "Python Fundamentals - Morning",
            course_title: "Python Programming Fundamentals",
            attendance_rate: 93,
            student_count: 25,
            class_count: 22
          }
        ],
        attendance_alerts: [
          {
            type: "low_attendance",
            entity: "Student: John Doe",
            course: "Python Fundamentals",
            attendance_rate: 65,
            severity: "medium"
          }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance reports",
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/coordinator/attendance/:attendanceId/edit
 * @desc    Edit attendance records
 * @access  Private (Program Coordinator only)
 */
router.put("/attendance/:attendanceId/edit", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { student_id, status, reason, notes } = req.body;
    
    return res.status(200).json({
      success: true,
      message: "Attendance record updated successfully",
      data: {
        attendance_id: attendanceId,
        student_id,
        previous_status: "absent",
        new_status: status,
        reason,
        notes,
        modified_by: req.user.id,
        modification_date: new Date().toISOString(),
        approval_required: status === "excused"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update attendance record",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/coordinator/attendance/summary/generate
 * @desc    Generate attendance summaries and reports
 * @access  Private (Program Coordinator only)
 */
router.post("/attendance/summary/generate", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { report_type, filters, format, include_charts } = req.body;
    
    return res.status(201).json({
      success: true,
      message: "Attendance summary generated successfully",
      data: {
        report_id: "report_" + Date.now(),
        report_type,
        generated_by: req.user.id,
        generated_at: new Date().toISOString(),
        format,
        file_url: `/reports/attendance_summary_${Date.now()}.${format}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        filters_applied: filters,
        record_count: 1250
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate attendance summary",
      error: error.message
    });
  }
});

// ==========================================
// REPORTING ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/reports/program-analytics
 * @desc    Generate program-specific analytics and reports
 * @access  Private (Program Coordinator only)
 */
router.get("/reports/program-analytics", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { program_id, time_period = '30_days', metrics } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Program analytics retrieved successfully",
      data: {
        program_overview: {
          program_id: program_id || "all_programs",
          total_courses: 45,
          total_students: 1250,
          total_instructors: 12,
          completion_rate: 78,
          satisfaction_score: 4.6
        },
        key_metrics: {
          enrollment_growth: {
            current_period: 156,
            previous_period: 134,
            growth_rate: 16.4
          },
          revenue_metrics: {
            total_revenue: 125000,
            avg_revenue_per_student: 100,
            revenue_growth: 12.3
          },
          operational_efficiency: {
            instructor_utilization: 87,
            class_fill_rate: 93,
            resource_utilization: 82
          }
        },
        performance_indicators: {
          student_success_rate: 85,
          course_completion_rate: 78,
          student_satisfaction: 4.6,
          instructor_performance: 4.7,
          technical_reliability: 96
        },
        trends_analysis: {
          enrollment_trend: "increasing",
          completion_trend: "stable",
          satisfaction_trend: "improving",
          revenue_trend: "increasing"
        },
        recommendations: [
          {
            area: "Course Capacity",
            suggestion: "Increase capacity for Python courses due to high demand",
            impact: "high",
            effort: "medium"
          }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve program analytics",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/coordinator/reports/custom
 * @desc    Generate custom reports based on specific criteria
 * @access  Private (Program Coordinator only)
 */
router.post("/reports/custom", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { report_name, data_sources, filters, metrics, format, schedule } = req.body;
    
    return res.status(201).json({
      success: true,
      message: "Custom report generation initiated",
      data: {
        report_id: "custom_" + Date.now(),
        report_name,
        status: "generating",
        estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        created_by: req.user.id,
        data_sources,
        filters,
        metrics,
        format,
        schedule: schedule || "one_time",
        progress: 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to initiate custom report generation",
      error: error.message
    });
  }
});

// ==========================================
// RESOURCE ALLOCATION ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coordinator/resources/overview
 * @desc    Get program resource allocation overview
 * @access  Private (Program Coordinator only)
 */
router.get("/resources/overview", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Resource overview retrieved successfully",
      data: {
        resource_summary: {
          total_resources: 156,
          allocated_resources: 142,
          available_resources: 14,
          utilization_rate: 91
        },
        resource_categories: {
          digital_materials: {
            total: 89,
            allocated: 82,
            utilization: 92
          },
          physical_equipment: {
            total: 34,
            allocated: 31,
            utilization: 91
          },
          software_licenses: {
            total: 25,
            allocated: 22,
            utilization: 88
          },
          learning_platforms: {
            total: 8,
            allocated: 7,
            utilization: 87
          }
        },
        allocation_by_course: [
          {
            course_id: "course_1",
            course_title: "Python Programming Fundamentals",
            resources_allocated: 23,
            resource_value: 15000,
            utilization_rate: 94
          }
        ],
        resource_requests: {
          pending: 8,
          approved: 12,
          rejected: 2,
          under_review: 3
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve resource overview",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/coordinator/resources/allocate
 * @desc    Allocate resources to courses
 * @access  Private (Program Coordinator only)
 */
router.post("/resources/allocate", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { resource_id, course_id, quantity, allocation_period, notes } = req.body;
    
    return res.status(201).json({
      success: true,
      message: "Resource allocated successfully",
      data: {
        allocation_id: "alloc_" + Date.now(),
        resource_id,
        course_id,
        quantity,
        allocation_period,
        allocated_by: req.user.id,
        allocation_date: new Date().toISOString(),
        status: "active",
        notes,
        estimated_value: 2500
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to allocate resource",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/coordinator/resources/utilization
 * @desc    Monitor resource utilization metrics
 * @access  Private (Program Coordinator only)
 */
router.get("/resources/utilization", authenticateToken, authorize(['admin', 'super-admin']), async (req, res) => {
  try {
    const { resource_type, time_period = '30_days' } = req.query;
    
    return res.status(200).json({
      success: true,
      message: "Resource utilization data retrieved successfully",
      data: {
        utilization_metrics: {
          overall_utilization: 91,
          peak_utilization: 98,
          low_utilization: 67,
          avg_utilization: 91
        },
        by_resource_type: {
          digital_materials: { utilization: 92, trend: "stable" },
          physical_equipment: { utilization: 91, trend: "increasing" },
          software_licenses: { utilization: 88, trend: "decreasing" },
          learning_platforms: { utilization: 87, trend: "stable" }
        },
        underutilized_resources: [
          {
            resource_id: "res_045",
            resource_name: "Advanced Analytics Software",
            current_utilization: 45,
            allocated_to: "Data Science Course",
            recommendation: "Reallocate to Python Advanced course"
          }
        ],
        optimization_opportunities: [
          {
            opportunity: "Consolidate software licenses",
            potential_savings: 5000,
            implementation_effort: "medium"
          }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve resource utilization data",
      error: error.message
    });
  }
});

export default router;