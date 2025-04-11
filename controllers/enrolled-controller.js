import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import EnrolledModule from "../models/enrolled-modules.modal.js";
import OnlineMeeting from "../models/online-meeting.js";
import Student from "../models/student-model.js";
import User from "../models/user-modal.js";
import { errorHandler } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

// Unused imports (kept for future reference)
const _Student = Student;
const _logger = logger;

// Create a new enrollment
export const createEnrolledCourse = async (req, res, next) => {
  try {
    const {
      student_id,
      course_id,
      expiry_date,
      is_self_paced,
      enrollment_type,
      payment_status,
      status,
      paymentResponse,
      currencyCode,
      activePricing,
      getFinalPrice,
      metadata,
    } = req.body;

    // Unused variable but kept for future implementation
    const _batch_size = req.body.batch_size;

    // Validate required fields
    if (!student_id || !course_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Check if the student exists
    const student = await User.findById(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check for existing enrollment
    const existingEnrollment = await EnrolledCourse.findOne({
      student_id,
      course_id,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this course",
      });
    }

    // Create enrollment data
    const enrollmentData = {
      student_id,
      course_id,
      is_self_paced: is_self_paced || false,
      enrollment_type,
      batch_size:
        enrollment_type === "batch" && activePricing
          ? activePricing.min_batch_size
          : 1,
      payment_status: payment_status || "completed",
      enrollment_date: new Date(),
      course_progress: 0,
      status: status || "active",
      metadata: {
        deviceInfo: req.headers["user-agent"],
        ipAddress: req.ip,
        enrollmentSource: req.headers.referer || "direct",
        ...metadata,
      },
    };

    // Handle expiry date based on course type and is_self_paced flag
    if (!enrollmentData.is_self_paced) {
      if (!expiry_date) {
        // If not self-paced and no expiry date provided, set default expiry to 1 year from now
        const defaultExpiry = new Date();
        defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
        enrollmentData.expiry_date = defaultExpiry;
      } else {
        enrollmentData.expiry_date = expiry_date;
      }
    }

    // Add payment details if available
    if (paymentResponse) {
      enrollmentData.payment_details = {
        payment_id: paymentResponse.razorpay_payment_id || "",
        payment_signature: paymentResponse.razorpay_signature || "",
        payment_order_id: paymentResponse.razorpay_order_id || "",
        payment_method: "razorpay",
        amount:
          typeof getFinalPrice === "function"
            ? getFinalPrice()
            : paymentResponse.amount || 0,
        currency: currencyCode || "INR",
        payment_date: new Date(),
      };
    }

    // Create new enrollment
    const newEnrolledCourse = new EnrolledCourse(enrollmentData);
    await newEnrolledCourse.save();

    // Create enrolled modules if course has videos
    if (course.course_videos && course.course_videos.length > 0) {
      const enrolledModules = course.course_videos.map((video_url) => ({
        student_id,
        course_id,
        enrollment_id: newEnrolledCourse._id,
        video_url,
      }));
      await EnrolledModule.insertMany(enrolledModules);
    }

    res.status(201).json({
      success: true,
      message: "Student enrolled successfully",
      data: newEnrolledCourse,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get all enrollments with pagination and filters
export const getAllEnrolledCourses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      payment_status,
      enrollment_type,
      search,
    } = req.query;

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (payment_status) query.payment_status = payment_status;
    if (enrollment_type) query.enrollment_type = enrollment_type;
    if (search) {
      query.$or = [
        { "student_id.name": { $regex: search, $options: "i" } },
        { "course_id.course_title": { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { enrollment_date: -1 },
      populate: [
        { path: "student_id", select: "name email role" },
        { path: "course_id", select: "course_title description thumbnail" },
      ],
    };

    const enrollments = await EnrolledCourse.paginate(query, options);

    res.status(200).json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get enrollment by ID with detailed information
export const getEnrolledCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await EnrolledCourse.findById(id)
      .populate("student_id", "name email role profile_image")
      .populate("course_id", "course_title description thumbnail duration")
      .populate("certificate_id")
      .lean();

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Add additional enrollment statistics
    const stats = await EnrolledCourse.getEnrollmentStats(enrollment.course_id);
    enrollment.statistics = stats;

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Update enrollment with validation
export const updateEnrolledCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the enrollment
    const enrollment = await EnrolledCourse.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Validate student if provided
    if (updateData.student_id) {
      const student = await User.findById(updateData.student_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }
    }

    // Validate course if provided
    if (updateData.course_id) {
      const course = await Course.findById(updateData.course_id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (key !== "student_id" && key !== "course_id") {
        enrollment[key] = updateData[key];
      }
    });

    // Update completion status
    if (typeof updateData.is_completed !== "undefined") {
      enrollment.is_completed = updateData.is_completed;
      enrollment.completed_on = updateData.is_completed ? new Date() : null;
      if (updateData.is_completed) {
        enrollment.status = "completed";
      }
    }

    const updatedEnrolledCourse = await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Enrollment updated successfully",
      data: updatedEnrolledCourse,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Delete enrollment with related data cleanup
export const deleteEnrolledCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the enrollment
    const enrollment = await EnrolledCourse.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Delete related enrolled modules
    await EnrolledModule.deleteMany({ enrollment_id: id });

    // Delete the enrollment
    await EnrolledCourse.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Enrollment deleted successfully",
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get enrollments by student ID with detailed information
export const getEnrolledCourseByStudentId = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { status, includeExpired = false } = req.query;

    const query = { student_id };
    if (!includeExpired) {
      query.status = { $ne: "expired" };
    }
    if (status) {
      query.status = status;
    }

    const enrollments = await EnrolledCourse.find(query)
      .populate("student_id", "name email role profile_image")
      .populate({
        path: "course_id",
        populate: {
          path: "assigned_instructor",
          model: "AssignedInstructor",
        },
      })
      .sort({ enrollment_date: -1 });

    if (!enrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No enrollments found for this student",
      });
    }

    // Transform the data
    const enrollmentsWithPaymentInfo = enrollments.map((enrollment) => {
      const enrollmentObj = enrollment.toObject();
      enrollmentObj.payment_type = "course";
      return enrollmentObj;
    });

    res.status(200).json({
      success: true,
      data: enrollmentsWithPaymentInfo,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get enrolled students by course ID with detailed information
export const getEnrolledStudentsByCourseId = async (req, res, next) => {
  try {
    const { course_id } = req.params;
    const { status, includeExpired = false } = req.query;

    const query = { course_id };
    if (!includeExpired) {
      query.status = { $ne: "expired" };
    }
    if (status) {
      query.status = status;
    }

    const studentsEnrolled = await EnrolledCourse.find(query)
      .populate("student_id", "name email role profile_image")
      .sort({ enrollment_date: -1 });

    if (!studentsEnrolled.length) {
      return res.status(404).json({
        success: false,
        message: "No students enrolled for this course",
      });
    }

    // Filter students with role "student"
    const filteredStudents = studentsEnrolled.filter(
      (enrollment) =>
        enrollment.student_id && enrollment.student_id.role.includes("student"),
    );

    if (!filteredStudents.length) {
      return res.status(404).json({
        success: false,
        message: "No students with role 'student' enrolled for this course",
      });
    }

    // Get course statistics
    const stats = await EnrolledCourse.getEnrollmentStats(course_id);

    res.status(200).json({
      success: true,
      data: {
        students: filteredStudents,
        statistics: stats,
      },
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Mark course as completed with validation
export const markCourseAsCompleted = async (req, res, next) => {
  try {
    const { student_id, course_id } = req.body;

    if (!student_id || !course_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    const enrollment = await EnrolledCourse.findOne({ student_id, course_id });
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Check if course is already completed
    if (enrollment.is_completed) {
      return res.status(400).json({
        success: false,
        message: "Course is already marked as completed",
      });
    }

    // Update completion status
    enrollment.is_completed = true;
    enrollment.completed_on = new Date();
    enrollment.status = "completed";

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Course marked as completed successfully",
      data: enrollment,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

/**
 * Get enrollment counts for a student
 */
export const getEnrollmentCountsByStudentId = async (req, res, next) => {
  try {
    const { student_id } = req.params;

    // Validate student_id
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Get all enrollments for the student with populated course information
    const enrollments = await EnrolledCourse.find({ student_id }).populate(
      "course_id",
      "course_title class_type description thumbnail duration",
    );

    // Calculate counts
    const counts = {
      total: enrollments.length,
      active: enrollments.filter((e) => e.status === "active").length,
      completed: enrollments.filter((e) => e.status === "completed").length,
      pending: enrollments.filter((e) => e.status === "pending").length,
      cancelled: enrollments.filter((e) => e.status === "cancelled").length,
      expired: enrollments.filter((e) => e.status === "expired").length,
      byPaymentStatus: {
        paid: enrollments.filter((e) => e.payment_status === "paid").length,
        pending: enrollments.filter((e) => e.payment_status === "pending")
          .length,
        failed: enrollments.filter((e) => e.payment_status === "failed").length,
        refunded: enrollments.filter((e) => e.payment_status === "refunded")
          .length,
      },
      byEnrollmentType: {
        individual: enrollments.filter(
          (e) => e.enrollment_type === "individual",
        ).length,
        batch: enrollments.filter((e) => e.enrollment_type === "batch").length,
        corporate: enrollments.filter((e) => e.enrollment_type === "corporate")
          .length,
      },
      byCourseType: {
        live: enrollments.filter(
          (e) => e.course_id?.class_type === "Live Courses",
        ).length,
        blended: enrollments.filter(
          (e) => e.course_id?.class_type === "Blended Courses",
        ).length,
        selfPaced: enrollments.filter(
          (e) => e.course_id?.class_type === "Self Paced",
        ).length,
      },
    };

    // Calculate progress statistics
    const progressStats = {
      averageProgress: 0,
      coursesInProgress: 0,
      coursesCompleted: 0,
      byCourseType: {
        live: { inProgress: 0, completed: 0, averageProgress: 0 },
        blended: { inProgress: 0, completed: 0, averageProgress: 0 },
        selfPaced: { inProgress: 0, completed: 0, averageProgress: 0 },
      },
    };

    if (enrollments.length > 0) {
      // Calculate overall progress
      const totalProgress = enrollments.reduce((sum, enrollment) => {
        return sum + (enrollment.progress?.overall || 0);
      }, 0);
      progressStats.averageProgress = totalProgress / enrollments.length;

      // Calculate progress by course type
      enrollments.forEach((enrollment) => {
        const courseType = enrollment.course_id?.class_type;
        const progress = enrollment.progress?.overall || 0;

        if (courseType) {
          let typeKey;
          switch (courseType) {
            case "Live Courses":
              typeKey = "live";
              break;
            case "Blended Courses":
              typeKey = "blended";
              break;
            case "Self Paced":
              typeKey = "selfPaced";
              break;
            default:
              return; // Skip unknown course types
          }

          if (progress < 100) {
            progressStats.byCourseType[typeKey].inProgress++;
          } else {
            progressStats.byCourseType[typeKey].completed++;
          }
          progressStats.byCourseType[typeKey].averageProgress += progress;
        }
      });

      // Calculate averages for each course type
      Object.keys(progressStats.byCourseType).forEach((type) => {
        const total =
          progressStats.byCourseType[type].inProgress +
          progressStats.byCourseType[type].completed;
        if (total > 0) {
          progressStats.byCourseType[type].averageProgress /= total;
        }
      });

      progressStats.coursesInProgress = enrollments.filter(
        (e) => e.status === "active" && e.progress?.overall < 100,
      ).length;

      progressStats.coursesCompleted = enrollments.filter(
        (e) => e.status === "completed" || e.progress?.overall === 100,
      ).length;
    }

    // Get upcoming courses with detailed information
    const upcomingCourses = enrollments
      .filter((e) => e.status === "active" && e.expiry_date > new Date())
      .sort((a, b) => a.expiry_date - b.expiry_date)
      .slice(0, 5)
      .map((e) => ({
        course_id: e.course_id?._id,
        course_title: e.course_id?.course_title || "Unknown Course",
        class_type: e.course_id?.class_type || "Unknown Type",
        thumbnail: e.course_id?.thumbnail,
        duration: e.course_id?.duration,
        expiry_date: e.expiry_date,
        progress: e.progress?.overall || 0,
        status: e.status,
      }));

    // Get recent activity with detailed information
    const recentActivity = enrollments
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, 5)
      .map((e) => ({
        course_id: e.course_id?._id,
        course_title: e.course_id?.course_title || "Unknown Course",
        class_type: e.course_id?.class_type || "Unknown Type",
        thumbnail: e.course_id?.thumbnail,
        status: e.status,
        last_activity: e.updated_at,
        progress: e.progress?.overall || 0,
        payment_status: e.payment_status,
      }));

    // Prepare response data
    const responseData = {
      counts,
      progress: progressStats,
      upcoming_courses: upcomingCourses,
      recent_activity: recentActivity,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get upcoming online meetings for a student's enrolled courses
export const getUpcomingMeetingsForStudent = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { limit = 10 } = req.query;

    // Find all active enrollments
    const enrollments = await EnrolledCourse.find({
      student_id,
      status: "active",
    }).populate("course_id", "course_title");

    if (!enrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No active enrollments found for this student",
      });
    }

    // Get enrolled course names
    const enrolledCourseNames = enrollments.map(
      (enrollment) => enrollment.course_id.course_title,
    );

    // Fetch upcoming meetings
    const upcomingMeetings = await OnlineMeeting.find({
      course_name: { $in: enrolledCourseNames },
      date: { $gte: new Date() },
    })
      .sort({ date: 1, time: 1 })
      .limit(parseInt(limit));

    if (!upcomingMeetings.length) {
      return res.status(404).json({
        success: false,
        message: "No upcoming meetings found for the student's courses",
      });
    }

    res.status(200).json({
      success: true,
      data: upcomingMeetings,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Mark video as watched with progress tracking
export const watchVideo = async (req, res, next) => {
  try {
    const { id } = req.query;
    const { student_id } = req.body;

    if (!id || !student_id) {
      return res.status(400).json({
        success: false,
        message: "Video ID and Student ID are required",
      });
    }

    const enrolledModule = await EnrolledModule.findById(id);
    if (!enrolledModule) {
      return res.status(404).json({
        success: false,
        message: "Enrolled module not found",
      });
    }

    // Verify student owns this enrollment
    if (enrolledModule.student_id.toString() !== student_id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this video",
      });
    }

    // Mark video as watched
    enrolledModule.is_watched = true;
    await enrolledModule.save();

    // Get course and check completion
    const course = await Course.findById(enrolledModule.course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Get all watched videos for this course
    const enrolledModules = await EnrolledModule.find({
      course_id: course._id,
      student_id,
      is_watched: true,
    });

    // Check if all videos are watched
    if (course.course_videos.length === enrolledModules.length) {
      await EnrolledCourse.findOneAndUpdate(
        {
          course_id: course._id,
          student_id,
          is_completed: false,
        },
        {
          is_completed: true,
          completed_on: new Date(),
          status: "completed",
        },
      );
    }

    res.status(200).json({
      success: true,
      message: "Video marked as watched successfully",
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get all students with enrolled courses
export const getAllStudentsWithEnrolledCourses = async (req, res, next) => {
  try {
    const {
      status,
      includeExpired = false,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const query = { course_id: { $exists: true } };
    if (!includeExpired) {
      query.status = { $ne: "expired" };
    }
    if (status) {
      query.status = status;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { "student_id.full_name": { $regex: search, $options: "i" } },
        { "student_id.email": { $regex: search, $options: "i" } },
        { "course_id.course_title": { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { enrollment_date: -1 },
      populate: [
        {
          path: "student_id",
          match: { role: "student" },
          model: "User",
          select:
            "full_name email phone_numbers role role_description status facebook_link instagram_link linkedin_link user_image meta age_group",
        },
        {
          path: "course_id",
          model: "Course",
          select: "course_title description thumbnail",
        },
      ],
    };

    const enrollments = await EnrolledCourse.paginate(query, options);

    // Filter out invalid enrollments
    const filteredDocs = enrollments.docs.filter(
      (enrollment) => enrollment.student_id && enrollment.course_id,
    );

    if (!filteredDocs.length) {
      return res.status(404).json({
        success: false,
        message: "No students enrolled in courses found",
      });
    }

    // Group enrollments by student
    const studentsWithCourses = filteredDocs.reduce((acc, enrollment) => {
      const studentId = enrollment.student_id._id.toString();
      if (!acc[studentId]) {
        acc[studentId] = {
          student: enrollment.student_id,
          enrollments: [],
        };
      }
      acc[studentId].enrollments.push(enrollment);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        students: Object.values(studentsWithCourses),
        pagination: {
          totalDocs: enrollments.totalDocs,
          limit: enrollments.limit,
          totalPages: enrollments.totalPages,
          page: enrollments.page,
          pagingCounter: enrollments.pagingCounter,
          hasPrevPage: enrollments.hasPrevPage,
          hasNextPage: enrollments.hasNextPage,
          prevPage: enrollments.prevPage,
          nextPage: enrollments.nextPage,
        },
      },
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};
