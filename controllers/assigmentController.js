const Assignment = require("../models/assignment");
const Course = require("../models/course-model");
const EnrolledCourse = require("../models/enrolled-courses-model");
const CoorporateEnrolledModule = require("../models/coorporate-enrolled-modules.model");

exports.getAllAssignments = async (req, res) => {
  try {
    // Populate course details in each assignment
    const assignments = await Assignment.find().populate("courseId");
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new assignment
exports.createAssignment = async (req, res) => {
  const {
    courseId,
    title,
    description,
    deadline,
    instructor_id,
    assignment_resources,
  } = req.body;

  try {
    const newAssignment = new Assignment({
      courseId,
      title,
      description,
      deadline,
      instructor_id,
      assignment_resources: assignment_resources || [],
    });

    await newAssignment.save();
    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitAssignment = async (req, res) => {
  const { assignmentId, studentId, submissionFile } = req.body;

  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });

    // Check if the student has already submitted the assignment
    const existingSubmission = assignment.submissions.find(
      (submission) => submission.studentId.toString() === studentId
    );

    console.log(req.body);

    if (existingSubmission) {
      existingSubmission.submissionFiles = [
        ...existingSubmission.submissionFiles,
        ...submissionFile,
      ];
      await assignment.save();
      return res
        .status(200)
        .json({ message: "Submission updated successfully" });
    } else {
      // If no previous submission, create a new submission entry
      assignment.submissions.push({
        studentId,
        submissionFiles: submissionFile,
      });
      await assignment.save();
      return res.status(200).json({ message: "Submission successful" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New endpoint to get course details by assignment ID
exports.getCourseByAssignmentId = async (req, res) => {
  const { assignmentId } = req.params;

  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });

    const course = await Course.findById(assignment.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSubmittedAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 5, filter } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNumber = parseInt(limit, 10);
    let dateFilter = {};
    const now = new Date();

    if (filter === "History") {
      // Start of today in UTC
      const startOfDayUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      dateFilter = { "submissions.submittedAt": { $lt: startOfDayUTC } };
    } else if (filter === "Today") {
      // Start and end of today in UTC
      const startOfDayUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      const endOfDayUTC = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
      dateFilter = {
        "submissions.submittedAt": { $gte: startOfDayUTC, $lt: endOfDayUTC },
      };
    }

    // Fetch assignments with submissions based on the filter
    const submittedAssignments = await Assignment.find({
      "submissions.0": { $exists: true },
      ...dateFilter,
    })
      .skip(skip)
      .limit(limitNumber)
      .populate("submissions.studentId", "full_name email user_image")
      .populate("courseId", "course_title category");

    // Count the total number of submitted assignments
    const totalAssignments = await Assignment.countDocuments({
      "submissions.0": { $exists: true },
      ...dateFilter,
    });
    if (submittedAssignments.length === 0) {
      return res.status(200).json({
        message: "No submitted assignments found.",
        submittedAssignments: [],
        totalAssignments: 0,
        totalPages: 0,
        currentPage: parseInt(page),
      });
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalAssignments / limitNumber);

    // Return paginated results
    return res.status(200).json({
      currentPage: parseInt(page),
      totalPages,
      totalAssignments,
      submittedAssignments,
    });
  } catch (error) {
    console.error("Error fetching submitted assignments:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};

exports.getSubmissionStatus = async (req, res) => {
  const { assignmentId } = req.params;

  try {
    const assignment = await Assignment.findById(assignmentId).populate(
      "submissions.studentId",
      "full_name email"
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({
      submissions: assignment.submissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSubmittedAssignmentsCountByInstructor = async (req, res) => {
  const { instructor_id } = req.params;

  try {
    const submittedAssignments = await Assignment.find({
      instructor_id: instructor_id,
      "submissions.0": { $exists: true },
    });
    const submittedAssignmentsCount = submittedAssignments.length;

    if (submittedAssignmentsCount === 0) {
      return res.status(404).json({
        message: `No assignments with submissions found for instructor ${instructor_id}`,
      });
    }
    res.status(200).json({
      message: `Submitted assignments count fetched successfully for instructor ${instructor_id}`,
      submittedAssignmentsCount,
    });
  } catch (error) {
    console.error(
      "Error fetching submitted assignments count for instructor:",
      error
    );
    res
      .status(500)
      .json({ message: "Error fetching submitted assignments count", error });
  }
};

exports.getAssignmentsForEnrolledCourses = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Step 1: Get all enrolled course IDs for the student
    const enrolledCourses = await EnrolledCourse.find({
      student_id: studentId,
    });

    if (enrolledCourses.length === 0) {
      return res
        .status(404)
        .json({ message: "No enrolled courses found for the student." });
    }

    // Extract course IDs from enrolledCourses
    const courseIds = enrolledCourses.map((enrollment) => enrollment.course_id);
    const assignments = await Assignment.find({ courseId: { $in: courseIds } })
      .populate("courseId", "course_title")
      .populate("instructor_id", "full_name email")
      .exec();

    console.log(assignments);

    if (assignments.length === 0) {
      return res
        .status(404)
        .json({ message: "No assignments found for enrolled courses." });
    }

    // Step 3: Return assignments
    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments for enrolled courses:", error);
    res.status(500).json({ message: "Error fetching assignments.", error });
  }
};

exports.getAssignmentsForCoorporateEnrolledCourses = async (req, res) => {
  const { coorporateId } = req.params;

  try {
    // Step 1: Get all enrolled course IDs for the student
    const enrolledCourses = await CoorporateEnrolledModule.find({
      coorporate_id: coorporateId,
    });

    if (enrolledCourses.length === 0) {
      return res
        .status(404)
        .json({ message: "No enrolled courses found for the student." });
    }

    // Extract course IDs from enrolledCourses
    const courseIds = enrolledCourses.map((enrollment) => enrollment.course_id);
    console.log(courseIds);
    // Step 2: Fetch assignments for these course IDs
    // const assignments = await Assignment.find({ courseId: { $in: courseIds } })
    //   .populate("courseId", "course_title")
    //   .populate("instructor_id", "full_name email");

    const assignments = await Assignment.find({ courseId: { $in: courseIds } })
      .populate("courseId", "course_title")
      .populate("instructor_id", "full_name email")
      .exec();
    const final = [];
    assignments.forEach((assignment) => {
      assignment.submissions = assignment.submissions.filter(
        (submission) => submission.studentId.toString() === coorporateId
      );
      final.push(assignment);
    });

    console.log(final);

    if (final.length === 0) {
      return res
        .status(404)
        .json({ message: "No assignments found for enrolled courses." });
    }

    // Step 3: Return assignments
    res.status(200).json(final);
  } catch (error) {
    console.error("Error fetching assignments for enrolled courses:", error);
    res.status(500).json({ message: "Error fetching assignments.", error });
  }
};
