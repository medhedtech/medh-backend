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

// Create a new enrollment with EMI support
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
      is_emi,
      emi_config,
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
      paymentType: is_emi ? "emi" : "full",
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

    // Setup EMI if applicable
    if (is_emi && emi_config) {
      await newEnrolledCourse.setupEmiSchedule({
        totalAmount: emi_config.totalAmount || enrollmentData.payment_details.amount,
        downPayment: emi_config.downPayment || 0,
        numberOfInstallments: emi_config.numberOfInstallments,
        startDate: emi_config.startDate || new Date(),
        interestRate: emi_config.interestRate || 0,
        processingFee: emi_config.processingFee || 0,
        gracePeriodDays: emi_config.gracePeriodDays || 5,
      });
    }

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
      .populate({
        path: "student_id", 
        select: "full_name email role profile_image"
      })
      .populate({
        path: "course_id",
        populate: {
          path: "assigned_instructor",
          select: 'full_name email role domain phone_numbers',
          match: { role: { $in: ['instructor'] } }
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
            "full_name email phone_numbers role role_description status facebook_link instagram_link linkedin_link user_image meta age_group"
        },
        {
          path: "course_id",
          model: "Course",
          select: "course_title description thumbnail assigned_instructor",
          populate: {
            path: 'assigned_instructor',
            select: 'full_name email role domain phone_numbers',
            match: { role: { $in: ['instructor'] } }
          }
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

// Save a course for later
export const saveCourse = async (req, res, next) => {
  try {
    const { course_id, notes } = req.body;
    const student_id = req.user._id; // Get student ID from authenticated user

    // Validate required fields
    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
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

    // Check if the course is already saved
    const existingSavedCourse = await EnrolledCourse.findOne({
      student_id,
      course_id,
      enrollmentType: "saved"
    });

    if (existingSavedCourse) {
      return res.status(400).json({
        success: false,
        message: "Course is already saved",
      });
    }

    // Check if the student is already enrolled in this course
    const existingEnrollment = await EnrolledCourse.findOne({
      student_id,
      course_id,
      enrollmentType: { $ne: "saved" }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this course",
      });
    }

    // Create saved course data
    const savedCourseData = {
      student_id,
      course_id,
      enrollmentType: "saved",
      status: "active",
      savedDetails: {
        savedAt: new Date(),
        notes: notes || ""
      },
      metadata: {
        deviceInfo: req.headers["user-agent"],
        ipAddress: req.ip,
        saveSource: req.headers.referer || "direct"
      }
    };

    // Create new saved course record
    const newSavedCourse = new EnrolledCourse(savedCourseData);
    await newSavedCourse.save();

    res.status(201).json({
      success: true,
      message: "Course saved successfully",
      data: newSavedCourse,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get all saved courses for a student
export const getSavedCourses = async (req, res, next) => {
  try {
    const student_id = req.user._id; // Get student ID from authenticated user

    const savedCourses = await EnrolledCourse.find({
      student_id,
      enrollmentType: "saved"
    })
    .populate({
      path: "course_id",
      select: "course_title course_category course_image course_duration prices status"
    })
    .sort({ "savedDetails.savedAt": -1 })
    .lean();

    res.status(200).json({
      success: true,
      count: savedCourses.length,
      data: savedCourses,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Remove a saved course
export const removeSavedCourse = async (req, res, next) => {
  try {
    const { course_id } = req.params;
    const student_id = req.user._id; // Get student ID from authenticated user

    // Find and delete the saved course
    const deletedCourse = await EnrolledCourse.findOneAndDelete({
      student_id,
      course_id,
      enrollmentType: "saved"
    });

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        message: "Saved course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course removed from saved list successfully",
      data: deletedCourse,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Convert a saved course to an enrollment
export const convertSavedCourseToEnrollment = async (req, res, next) => {
  try {
    const { course_id } = req.params;
    const student_id = req.user._id; // Get student ID from authenticated user
    const {
      enrollment_type = "individual",
      payment_status = "pending",
      payment_details,
      is_self_paced = false,
      expiry_date,
    } = req.body;

    // Find the saved course
    const savedCourse = await EnrolledCourse.findOne({
      student_id,
      course_id,
      enrollmentType: "saved"
    });

    if (!savedCourse) {
      return res.status(404).json({
        success: false,
        message: "Saved course not found",
      });
    }

    // Check if there's already an active enrollment for this course
    const existingEnrollment = await EnrolledCourse.findOne({
      student_id,
      course_id,
      enrollmentType: { $ne: "saved" },
      status: "active"
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this course",
      });
    }

    // Create enrollment data
    const enrollmentData = {
      enrollmentType: enrollment_type,
      status: "active",
      enrolledAt: new Date(),
      paymentStatus: payment_status,
      is_self_paced,
    };

    if (payment_details) {
      enrollmentData.paymentDetails = payment_details;
    }

    if (expiry_date) {
      enrollmentData.accessExpiresAt = expiry_date;
    }

    // Convert the saved course to an active enrollment
    await savedCourse.convertToEnrollment(enrollmentData);

    // Get the updated enrollment with populated course data
    const updatedEnrollment = await EnrolledCourse.findById(savedCourse._id)
      .populate({
        path: "course_id",
        select: "course_title course_category course_image course_duration prices status"
      });

    res.status(200).json({
      success: true,
      message: "Saved course converted to enrollment successfully",
      data: updatedEnrollment,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

/**
 * @description Check and update EMI access status for all enrollments
 * @route POST /api/v1/enrolled/check-emi-status
 * @access Private (Admin/System)
 */
export const checkAndUpdateEmiStatus = async (req, res, next) => {
  try {
    const enrollments = await EnrolledCourse.find({
      paymentType: "emi",
      "emiDetails.status": "active",
    });

    const results = {
      total: enrollments.length,
      updated: 0,
      restricted: 0,
      active: 0,
      errors: [],
    };

    for (const enrollment of enrollments) {
      try {
        const previousStatus = enrollment.accessStatus;
        await enrollment.checkAndUpdateAccess();
        
        results.updated++;
        if (enrollment.accessStatus === "restricted") {
          results.restricted++;
        } else if (enrollment.accessStatus === "active") {
          results.active++;
        }

        // Log status changes
        if (previousStatus !== enrollment.accessStatus) {
          logger.info("Enrollment access status changed", {
            enrollmentId: enrollment._id,
            previousStatus,
            newStatus: enrollment.accessStatus,
            reason: enrollment.accessRestrictionReason,
          });
        }
      } catch (error) {
        results.errors.push({
          enrollmentId: enrollment._id,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "EMI status check completed",
      data: results,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

/**
 * @description Get EMI analytics for a course
 * @route GET /api/v1/enrolled/emi-analytics/:courseId
 * @access Private (Admin)
 */
export const getEmiAnalytics = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const enrollments = await EnrolledCourse.find({
      course_id: courseId,
      paymentType: "emi",
    });

    const analytics = {
      totalEmiEnrollments: enrollments.length,
      activeEmiPlans: 0,
      completedEmiPlans: 0,
      defaultedEmiPlans: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      collectedRevenue: 0,
      averageInstallmentAmount: 0,
      missedPaymentsCount: 0,
      onTimePaymentsPercentage: 0,
      installmentAnalytics: {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
      },
    };

    let totalInstallments = 0;
    let paidInstallments = 0;
    let onTimePayments = 0;

    enrollments.forEach(enrollment => {
      const emi = enrollment.emiDetails;
      if (!emi) return;

      switch (emi.status) {
        case "active":
          analytics.activeEmiPlans++;
          break;
        case "completed":
          analytics.completedEmiPlans++;
          break;
        case "defaulted":
          analytics.defaultedEmiPlans++;
          break;
      }

      analytics.totalRevenue += emi.totalAmount;
      analytics.missedPaymentsCount += emi.missedPayments;

      emi.schedule.forEach(installment => {
        totalInstallments++;
        analytics.installmentAnalytics.total++;

        switch (installment.status) {
          case "paid":
            paidInstallments++;
            analytics.installmentAnalytics.paid++;
            analytics.collectedRevenue += installment.amount;
            if (installment.paidDate <= installment.dueDate) {
              onTimePayments++;
            }
            break;
          case "pending":
            analytics.installmentAnalytics.pending++;
            analytics.pendingRevenue += installment.amount;
            break;
          case "overdue":
            analytics.installmentAnalytics.overdue++;
            analytics.pendingRevenue += installment.amount;
            break;
        }
      });
    });

    // Calculate averages and percentages
    if (totalInstallments > 0) {
      analytics.averageInstallmentAmount = analytics.totalRevenue / totalInstallments;
      analytics.onTimePaymentsPercentage = (onTimePayments / paidInstallments) * 100;
    }

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get completed courses with detailed information for student dashboard
export const getCompletedCoursesByStudentId = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate student_id
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
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

    // Get completed enrollments with populated course and certificate information
    const completedEnrollments = await EnrolledCourse.find({
      student_id,
      status: "completed",
      is_completed: true
    })
    .populate({
      path: "course_id",
      select: "course_title course_description assigned_instructor curriculum meta course_duration course_tag",
      populate: {
        path: "assigned_instructor",
        select: "full_name email",
        match: { role: { $in: ['instructor'] } }
      }
    })
    .populate("certificate_id")
    .sort({ completed_on: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

    if (!completedEnrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No completed courses found for this student",
      });
    }

    // Transform the data to match the requested format
    const formattedCourses = await Promise.all(
      completedEnrollments.map(async (enrollment) => {
        const course = enrollment.course_id;
        
        // Calculate course duration in weeks
        let durationInWeeks = 0;
        if (course.curriculum && course.curriculum.length) {
          durationInWeeks = course.curriculum.length;
        } else if (course.course_duration) {
          // Try to extract weeks from duration string
          const weekMatch = course.course_duration.match(/(\d+)\s*week/i);
          if (weekMatch) {
            durationInWeeks = parseInt(weekMatch[1]);
          }
        }

        // Extract key topics/skills from course tags or curriculum
        let keyTopics = [];
        if (course.course_tag && Array.isArray(course.course_tag)) {
          keyTopics = course.course_tag.slice(0, 3); // Take first 3 tags
        } else if (course.curriculum && course.curriculum.length) {
          // Extract topics from curriculum week titles
          keyTopics = course.curriculum
            .slice(0, 3)
            .map(week => week.weekTitle || week.title)
            .filter(title => title);
        }

        // Get instructor name
        const instructorName = course.assigned_instructor?.full_name || "Instructor";

        // Get rating from course meta
        const rating = course.meta?.ratings?.average || 0;

        // Check if certificate exists
        const hasCertificate = !!enrollment.certificate_id;

        return {
          courseId: course._id,
          title: course.course_title,
          instructor: instructorName,
          completedDate: enrollment.completed_on,
          duration: `${durationInWeeks} weeks`,
          keyTopics: keyTopics,
          rating: parseFloat(rating.toFixed(1)),
          status: "Completed",
          actions: {
            review: true,
            certificate: hasCertificate
          },
          enrollmentId: enrollment._id,
          progress: enrollment.progress || 100
        };
      })
    );

    // Get total count for pagination
    const totalCompleted = await EnrolledCourse.countDocuments({
      student_id,
      status: "completed",
      is_completed: true
    });

    const totalPages = Math.ceil(totalCompleted / limit);

    res.status(200).json({
      success: true,
      message: "Completed courses retrieved successfully",
      data: {
        courses: formattedCourses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCourses: totalCompleted,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

// Get all resources from all enrolled courses for a student (excluding video lessons)
export const getAllResourcesByStudentId = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      resourceType, 
      courseId, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate student_id
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
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

    // Build query for enrolled courses
    const enrollmentQuery = {
      student_id,
      status: { $in: ["active", "completed"] }
    };

    // If specific course is requested
    if (courseId) {
      enrollmentQuery.course_id = courseId;
    }

    // Get all enrolled courses with populated course data
    const enrolledCourses = await EnrolledCourse.find(enrollmentQuery)
      .populate({
        path: "course_id",
        select: "course_title curriculum resource_pdfs bonus_modules course_image assigned_instructor",
        populate: {
          path: "assigned_instructor",
          select: "full_name email",
          match: { role: { $in: ['instructor'] } }
        }
      })
      .lean();

    if (!enrolledCourses.length) {
      return res.status(404).json({
        success: false,
        message: "No enrolled courses found for this student",
      });
    }

    // Extract all resources from all courses
    const allResources = [];

    enrolledCourses.forEach(enrollment => {
      const course = enrollment.course_id;
      if (!course) return;

      // 1. Extract resources from curriculum (lessons, sections, live classes)
      if (course.curriculum && course.curriculum.length) {
        course.curriculum.forEach((week, weekIndex) => {
          // Resources from direct lessons under weeks (excluding video lessons)
          if (week.lessons && week.lessons.length) {
            week.lessons.forEach((lesson, lessonIndex) => {
              // Skip video lessons
              if (lesson.lessonType === 'video') return;
              
              if (lesson.resources && lesson.resources.length) {
                lesson.resources.forEach((resource, resourceIndex) => {
                  allResources.push({
                    id: resource.id || `${lesson.id}_resource_${resourceIndex}`,
                    title: resource.title,
                    description: resource.description || '',
                    url: resource.url,
                    type: resource.type,
                    source: {
                      type: 'lesson',
                      courseId: course._id,
                      courseTitle: course.course_title,
                      courseThumbnail: course.course_image,
                      instructor: course.assigned_instructor?.full_name || 'Instructor',
                      weekTitle: week.weekTitle,
                      weekNumber: weekIndex + 1,
                      lessonTitle: lesson.title,
                      lessonType: lesson.lessonType,
                      lessonId: lesson.id
                    },
                    enrollmentId: enrollment._id,
                    addedDate: enrollment.enrollment_date
                  });
                });
              }
            });
          }

          // Resources from sections
          if (week.sections && week.sections.length) {
            week.sections.forEach((section, sectionIndex) => {
              // Section-level resources
              if (section.resources && section.resources.length) {
                section.resources.forEach((resource, resourceIndex) => {
                  allResources.push({
                    id: resource.id || `${section.id}_resource_${resourceIndex}`,
                    title: resource.title,
                    description: resource.description || '',
                    url: resource.fileUrl || resource.url,
                    type: resource.type,
                    source: {
                      type: 'section',
                      courseId: course._id,
                      courseTitle: course.course_title,
                      courseThumbnail: course.course_image,
                      instructor: course.assigned_instructor?.full_name || 'Instructor',
                      weekTitle: week.weekTitle,
                      weekNumber: weekIndex + 1,
                      sectionTitle: section.title,
                      sectionId: section.id
                    },
                    enrollmentId: enrollment._id,
                    addedDate: enrollment.enrollment_date
                  });
                });
              }

              // Resources from lessons within sections (excluding video lessons)
              if (section.lessons && section.lessons.length) {
                section.lessons.forEach((lesson, lessonIndex) => {
                  // Skip video lessons
                  if (lesson.lessonType === 'video') return;
                  
                  if (lesson.resources && lesson.resources.length) {
                    lesson.resources.forEach((resource, resourceIndex) => {
                      allResources.push({
                        id: resource.id || `${lesson.id}_resource_${resourceIndex}`,
                        title: resource.title,
                        description: resource.description || '',
                        url: resource.url,
                        type: resource.type,
                        source: {
                          type: 'lesson',
                          courseId: course._id,
                          courseTitle: course.course_title,
                          courseThumbnail: course.course_image,
                          instructor: course.assigned_instructor?.full_name || 'Instructor',
                          weekTitle: week.weekTitle,
                          weekNumber: weekIndex + 1,
                          sectionTitle: section.title,
                          sectionId: section.id,
                          lessonTitle: lesson.title,
                          lessonType: lesson.lessonType,
                          lessonId: lesson.id
                        },
                        enrollmentId: enrollment._id,
                        addedDate: enrollment.enrollment_date
                      });
                    });
                  }
                });
              }
            });
          }

          // Resources from live classes
          if (week.liveClasses && week.liveClasses.length) {
            week.liveClasses.forEach((liveClass, classIndex) => {
              if (liveClass.materials && liveClass.materials.length) {
                liveClass.materials.forEach((material, materialIndex) => {
                  allResources.push({
                    id: `${liveClass.id || `live_${classIndex}`}_material_${materialIndex}`,
                    title: material.title,
                    description: material.description || '',
                    url: material.url,
                    type: material.type,
                    source: {
                      type: 'live_class',
                      courseId: course._id,
                      courseTitle: course.course_title,
                      courseThumbnail: course.course_image,
                      instructor: course.assigned_instructor?.full_name || 'Instructor',
                      weekTitle: week.weekTitle,
                      weekNumber: weekIndex + 1,
                      liveClassTitle: liveClass.title,
                      scheduledDate: liveClass.scheduledDate
                    },
                    enrollmentId: enrollment._id,
                    addedDate: enrollment.enrollment_date
                  });
                });
              }
            });
          }
        });
      }

      // 2. Extract resources from course-level resource_pdfs
      if (course.resource_pdfs && course.resource_pdfs.length) {
        course.resource_pdfs.forEach((pdf, pdfIndex) => {
          allResources.push({
            id: `course_pdf_${pdfIndex}`,
            title: pdf.title,
            description: pdf.description || '',
            url: pdf.url,
            type: 'pdf',
            size_mb: pdf.size_mb,
            pages: pdf.pages,
            source: {
              type: 'course_resource',
              courseId: course._id,
              courseTitle: course.course_title,
              courseThumbnail: course.course_image,
              instructor: course.assigned_instructor?.full_name || 'Instructor'
            },
            enrollmentId: enrollment._id,
            addedDate: pdf.upload_date || enrollment.enrollment_date
          });
        });
      }

      // 3. Extract resources from bonus modules
      if (course.bonus_modules && course.bonus_modules.length) {
        course.bonus_modules.forEach((module, moduleIndex) => {
          if (module.resources && module.resources.length) {
            module.resources.forEach((resource, resourceIndex) => {
              // Skip video resources from bonus modules
              if (resource.type === 'video') return;
              
              allResources.push({
                id: `bonus_${moduleIndex}_resource_${resourceIndex}`,
                title: resource.title,
                description: resource.description || '',
                url: resource.url,
                type: resource.type,
                size_mb: resource.size_mb,
                source: {
                  type: 'bonus_module',
                  courseId: course._id,
                  courseTitle: course.course_title,
                  courseThumbnail: course.course_image,
                  instructor: course.assigned_instructor?.full_name || 'Instructor',
                  moduleTitle: module.title
                },
                enrollmentId: enrollment._id,
                addedDate: enrollment.enrollment_date
              });
            });
          }
        });
      }
    });

    // Apply filters
    let filteredResources = allResources;

    // Filter by resource type
    if (resourceType) {
      filteredResources = filteredResources.filter(resource => 
        resource.type === resourceType
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResources = filteredResources.filter(resource =>
        resource.title.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower) ||
        resource.source.courseTitle.toLowerCase().includes(searchLower)
      );
    }

    // Sort resources
    filteredResources.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'course':
          aValue = a.source.courseTitle.toLowerCase();
          bValue = b.source.courseTitle.toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.addedDate);
          bValue = new Date(b.addedDate);
          break;
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const totalResources = filteredResources.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResources = filteredResources.slice(startIndex, endIndex);

    // Calculate statistics
    const resourceStats = {
      total: totalResources,
      byType: {},
      byCourse: {},
      bySource: {}
    };

    filteredResources.forEach(resource => {
      // Count by type
      resourceStats.byType[resource.type] = (resourceStats.byType[resource.type] || 0) + 1;
      
      // Count by course
      const courseTitle = resource.source.courseTitle;
      resourceStats.byCourse[courseTitle] = (resourceStats.byCourse[courseTitle] || 0) + 1;
      
      // Count by source type
      const sourceType = resource.source.type;
      resourceStats.bySource[sourceType] = (resourceStats.bySource[sourceType] || 0) + 1;
    });

    const totalPages = Math.ceil(totalResources / limit);

    res.status(200).json({
      success: true,
      message: "Resources retrieved successfully",
      data: {
        resources: paginatedResources,
        statistics: resourceStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalResources,
          resourcesPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          appliedResourceType: resourceType || null,
          appliedCourseId: courseId || null,
          appliedSearch: search || null,
          sortBy,
          sortOrder
        }
      }
    });
  } catch (error) {
    errorHandler(error, req, res, next);
  }
};

