import Student from "../models/student-model.js";
import Course from "../models/course-model.js";
import Wishlist from "../models/wishlist.model.js";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import { USER_ROLES } from "../models/user-modal.js";

// Create a new student (stored in Student collection)
export const createStudent = async (req, res) => {
  try {
    const { full_name, email, phone_numbers = [], status, age, course_name } = req.body;
    
    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ 
        success: false, 
        message: "Student with this email already exists" 
      });
    }

    // Create new student
    const newStudent = new Student({
      full_name,
      email,
      age,
      phone_numbers,
      course_name,
      status: status || "Active",
      meta: {
        createdBy: "system",
        updatedBy: "system"
      }
    });
    await newStudent.save();
    
    res.status(201).json({ 
      success: true,
      message: "Student created successfully", 
      student: newStudent 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error creating student", 
      error: error.message 
    });
  }
};

// Get all students from Student collection only
export const getAllStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    
    console.log('getAllStudents called with:', { search, page, limit });
    
    // Build query for Student collection - remove status filter to get ALL students
    const studentQuery = {};
    
    // Add search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      studentQuery.$or = [
        { full_name: searchRegex },
        { email: searchRegex },
        { course_name: searchRegex }
      ];
    }
    
    console.log('Student Query:', JSON.stringify(studentQuery, null, 2));
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch ALL students from Student collection (no status filter)
    const students = await Student.find(studentQuery)
      .select('_id full_name email age course_name status meta')
      .sort({ full_name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log(`Found ${students.length} students from Student collection`);
    
    // Get total count for pagination
    const totalStudents = await Student.countDocuments(studentQuery);
    
    console.log(`Total students in Student collection: ${totalStudents}`);
    
    res.status(200).json({
      success: true,
      message: "Students fetched successfully from Student collection",
      data: {
        items: students,
        total: totalStudents,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalStudents / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching students", 
      error: error.message 
    });
  }
};

// Get a student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ message: "Error fetching student", error });
  }
};

// Update a student by ID
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({ success: true, data: updatedStudent });
  } catch (error) {
    res.status(500).json({ message: "Error updating student", error });
  }
};

// Delete a student by ID
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findByIdAndDelete(id);
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student", error });
  }
};

// Toggle student status by ID
export const toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    const newStatus = student.status === "Active" ? "Inactive" : "Active";
    student.status = newStatus;
    await student.save();
    res.status(200).json({
      success: true,
      message: `Student status updated to ${newStatus}`,
      student: {
        id: student._id,
        status: student.status,
        full_name: student.full_name,
      },
    });
  } catch (error) {
    console.error("Error toggling student status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling student status. Please try again later.",
      error: error.message,
    });
  }
};

// WISHLIST MANAGEMENT APIs

/**
 * Add a course to student's wishlist
 * @route POST /api/students/wishlist/add
 * @access Private (Student)
 */
export const addToWishlist = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    // Validate required fields
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
        errors: {
          studentId: !studentId ? "Student ID is required" : null,
          courseId: !courseId ? "Course ID is required" : null,
        },
      });
    }

    // Verify student exists and has student role
    const student = await User.findOne({
      _id: studentId,
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.CORPORATE_STUDENT] },
      is_active: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Verify course exists and is published
    const course = await Course.findOne({
      _id: courseId,
      status: { $in: ["Published", "Upcoming"] },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not available",
      });
    }

    // Find or create wishlist for the student
    let wishlist = await Wishlist.findOne({ user: studentId });

    if (!wishlist) {
      // Create new wishlist
      wishlist = new Wishlist({
        user: studentId,
        courses: [
          {
            course: courseId,
            addedAt: new Date(),
            notificationPreference: {
              priceDrops: true,
              startDate: true,
            },
          },
        ],
      });
    } else {
      // Check if course is already in wishlist
      const existingCourse = wishlist.courses.find(
        (item) => item.course.toString() === courseId.toString(),
      );

      if (existingCourse) {
        return res.status(409).json({
          success: false,
          message: "Course is already in your wishlist",
          data: {
            course: {
              id: course._id,
              title: course.course_title,
              addedAt: existingCourse.addedAt,
            },
          },
        });
      }

      // Add course to existing wishlist
      wishlist.courses.push({
        course: courseId,
        addedAt: new Date(),
        notificationPreference: {
          priceDrops: true,
          startDate: true,
        },
      });
    }

    // Update lastUpdated timestamp
    wishlist.lastUpdated = new Date();
    await wishlist.save();

    // Log activity
    try {
      await student.logActivity("course_wishlist_add", courseId, {
        course_title: course.course_title,
        course_category: course.course_category,
        added_at: new Date(),
        wishlist_count: wishlist.courses.length,
      });
    } catch (logError) {
      logger.warn("Failed to log wishlist activity", {
        error: logError.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Course added to wishlist successfully",
      data: {
        wishlist: {
          id: wishlist._id,
          totalCourses: wishlist.courses.length,
          lastUpdated: wishlist.lastUpdated,
        },
        course: {
          id: course._id,
          title: course.course_title,
          category: course.course_category,
          image: course.course_image,
          addedAt: new Date(),
        },
      },
    });
  } catch (error) {
    logger.error("Error adding course to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding course to wishlist",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Remove a course from student's wishlist
 * @route DELETE /api/students/wishlist/remove
 * @access Private (Student)
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    // Validate required fields
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
        errors: {
          studentId: !studentId ? "Student ID is required" : null,
          courseId: !courseId ? "Course ID is required" : null,
        },
      });
    }

    // Verify student exists
    const student = await User.findOne({
      _id: studentId,
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.CORPORATE_STUDENT] },
      is_active: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Find student's wishlist
    const wishlist = await Wishlist.findOne({ user: studentId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Check if course exists in wishlist
    const courseIndex = wishlist.courses.findIndex(
      (item) => item.course.toString() === courseId.toString(),
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Course not found in wishlist",
      });
    }

    // Get course details before removal for response
    const course = await Course.findById(courseId).select(
      "course_title course_category",
    );

    // Remove course from wishlist
    wishlist.courses.splice(courseIndex, 1);
    wishlist.lastUpdated = new Date();
    await wishlist.save();

    // Log activity
    try {
      await student.logActivity("course_wishlist_remove", courseId, {
        course_title: course?.course_title || "Unknown Course",
        course_category: course?.course_category || "Unknown",
        removed_at: new Date(),
        wishlist_count: wishlist.courses.length,
      });
    } catch (logError) {
      logger.warn("Failed to log wishlist removal activity", {
        error: logError.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Course removed from wishlist successfully",
      data: {
        wishlist: {
          id: wishlist._id,
          totalCourses: wishlist.courses.length,
          lastUpdated: wishlist.lastUpdated,
        },
        removedCourse: {
          id: courseId,
          title: course?.course_title || "Unknown Course",
          category: course?.course_category || "Unknown",
        },
      },
    });
  } catch (error) {
    logger.error("Error removing course from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing course from wishlist",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Get student's wishlist with course details
 * @route GET /api/students/wishlist/:studentId
 * @access Private (Student)
 */
export const getWishlist = async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "addedAt",
      sortOrder = "desc",
    } = req.query;

    // Validate student ID
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Verify student exists
    const student = await User.findOne({
      _id: studentId,
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.CORPORATE_STUDENT] },
      is_active: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Get wishlist with populated course details
    const wishlist = await Wishlist.findOne({ user: studentId })
      .populate({
        path: "courses.course",
        select:
          "course_title course_category course_image course_level prices category_type status meta course_description course_duration no_of_Sessions class_type",
        match: { status: { $in: ["Published", "Upcoming"] } }, // Only include published/upcoming courses
      })
      .lean();

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is empty",
        data: {
          wishlist: {
            totalCourses: 0,
            courses: [],
            lastUpdated: null,
          },
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalCourses: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    }

    // Filter out courses that couldn't be populated (deleted or unpublished)
    const validCourses = wishlist.courses.filter(
      (item) => item.course !== null,
    );

    // Sort courses
    const sortDirection = sortOrder === "desc" ? -1 : 1;
    validCourses.sort((a, b) => {
      if (sortBy === "addedAt") {
        return sortDirection * (new Date(b.addedAt) - new Date(a.addedAt));
      } else if (sortBy === "title") {
        return (
          sortDirection *
          a.course.course_title.localeCompare(b.course.course_title)
        );
      } else if (sortBy === "category") {
        return (
          sortDirection *
          a.course.course_category.localeCompare(b.course.course_category)
        );
      }
      return 0;
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCourses = validCourses.slice(startIndex, endIndex);

    // Format course data for response
    const formattedCourses = paginatedCourses.map((item) => ({
      id: item.course._id,
      title: item.course.course_title,
      category: item.course.course_category,
      image: item.course.course_image,
      level: item.course.course_level,
      duration: item.course.course_duration,
      sessions: item.course.no_of_Sessions,
      class_type: item.course.class_type,
      category_type: item.course.category_type,
      status: item.course.status,
      description:
        typeof item.course.course_description === "string"
          ? item.course.course_description
          : item.course.course_description?.program_overview || "",
      pricing:
        item.course.prices && item.course.prices.length > 0
          ? {
              currency: item.course.prices[0].currency,
              individual: item.course.prices[0].individual,
              batch: item.course.prices[0].batch,
            }
          : null,
      meta: {
        views: item.course.meta?.views || 0,
        ratings: item.course.meta?.ratings || { average: 0, count: 0 },
        enrollments: item.course.meta?.enrollments || 0,
      },
      wishlist_info: {
        addedAt: item.addedAt,
        notificationPreference: item.notificationPreference,
      },
    }));

    // Calculate pagination info
    const totalCourses = validCourses.length;
    const totalPages = Math.ceil(totalCourses / parseInt(limit));
    const currentPage = parseInt(page);

    res.status(200).json({
      success: true,
      message: "Wishlist retrieved successfully",
      data: {
        wishlist: {
          id: wishlist._id,
          totalCourses: totalCourses,
          courses: formattedCourses,
          lastUpdated: wishlist.lastUpdated,
        },
        pagination: {
          currentPage: currentPage,
          totalPages: totalPages,
          totalCourses: totalCourses,
          limit: parseInt(limit),
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error retrieving wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving wishlist",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Check if a course is in student's wishlist
 * @route GET /api/students/wishlist/check/:studentId/:courseId
 * @access Private (Student)
 */
export const checkWishlistStatus = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // Validate required parameters
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Verify student exists
    const student = await User.findOne({
      _id: studentId,
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.CORPORATE_STUDENT] },
      is_active: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Check if course exists in wishlist
    const wishlist = await Wishlist.findOne({
      user: studentId,
      "courses.course": courseId,
    });

    const isInWishlist = !!wishlist;
    let addedAt = null;

    if (isInWishlist) {
      const courseItem = wishlist.courses.find(
        (item) => item.course.toString() === courseId.toString(),
      );
      addedAt = courseItem ? courseItem.addedAt : null;
    }

    res.status(200).json({
      success: true,
      message: "Wishlist status checked successfully",
      data: {
        isInWishlist: isInWishlist,
        addedAt: addedAt,
        studentId: studentId,
        courseId: courseId,
      },
    });
  } catch (error) {
    logger.error("Error checking wishlist status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking wishlist status",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Clear entire wishlist for a student
 * @route DELETE /api/students/wishlist/clear/:studentId
 * @access Private (Student)
 */
export const clearWishlist = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate student ID
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Verify student exists
    const student = await User.findOne({
      _id: studentId,
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.CORPORATE_STUDENT] },
      is_active: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Find and clear wishlist
    const wishlist = await Wishlist.findOne({ user: studentId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    const clearedCount = wishlist.courses.length;
    wishlist.courses = [];
    wishlist.lastUpdated = new Date();
    await wishlist.save();

    // Log activity
    try {
      await student.logActivity("wishlist_cleared", null, {
        cleared_count: clearedCount,
        cleared_at: new Date(),
      });
    } catch (logError) {
      logger.warn("Failed to log wishlist clear activity", {
        error: logError.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      data: {
        clearedCount: clearedCount,
        wishlist: {
          id: wishlist._id,
          totalCourses: 0,
          lastUpdated: wishlist.lastUpdated,
        },
      },
    });
  } catch (error) {
    logger.error("Error clearing wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error while clearing wishlist",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Get wishlist statistics for a student
 * @route GET /api/students/wishlist/stats/:studentId
 * @access Private (Student)
 */
export const getWishlistStats = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate student ID
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Verify student exists
    const student = await User.findOne({
      _id: studentId,
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.CORPORATE_STUDENT] },
      is_active: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
    }

    // Get wishlist with populated course details
    const wishlist = await Wishlist.findOne({ user: studentId })
      .populate({
        path: "courses.course",
        select: "course_category category_type prices meta",
      })
      .lean();

    if (!wishlist || wishlist.courses.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No wishlist data found",
        data: {
          totalCourses: 0,
          categoryBreakdown: {},
          typeBreakdown: {},
          priceRange: { min: 0, max: 0, average: 0 },
          lastUpdated: null,
        },
      });
    }

    // Filter valid courses
    const validCourses = wishlist.courses.filter(
      (item) => item.course !== null,
    );

    // Calculate statistics
    const categoryBreakdown = {};
    const typeBreakdown = {};
    const prices = [];

    validCourses.forEach((item) => {
      const course = item.course;

      // Category breakdown
      if (course.course_category) {
        categoryBreakdown[course.course_category] =
          (categoryBreakdown[course.course_category] || 0) + 1;
      }

      // Type breakdown
      if (course.category_type) {
        typeBreakdown[course.category_type] =
          (typeBreakdown[course.category_type] || 0) + 1;
      }

      // Price collection
      if (course.prices && course.prices.length > 0) {
        prices.push(course.prices[0].individual || 0);
      }
    });

    // Calculate price statistics
    const priceStats =
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            average:
              Math.round(
                (prices.reduce((sum, price) => sum + price, 0) /
                  prices.length) *
                  100,
              ) / 100,
          }
        : { min: 0, max: 0, average: 0 };

    res.status(200).json({
      success: true,
      message: "Wishlist statistics retrieved successfully",
      data: {
        totalCourses: validCourses.length,
        categoryBreakdown: categoryBreakdown,
        typeBreakdown: typeBreakdown,
        priceRange: priceStats,
        lastUpdated: wishlist.lastUpdated,
      },
    });
  } catch (error) {
    logger.error("Error retrieving wishlist statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving wishlist statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
