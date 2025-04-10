import OnlineMeeting from "../models/online-meeting.js";
import Course from "../models/course-model.js";

export const getInstructorCoursesAndClasses = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { startDate, endDate } = req.query;

    console.log("Received Instructor ID:", instructorId);
    console.log("Start Date:", startDate, "End Date:", endDate);

    // Fetch courses assigned to the instructor
    const assignedCourses = await Course.find({
      assigned_instructor: instructorId,
    });

    if (!assignedCourses || assignedCourses.length === 0) {
      console.log(`No courses assigned to instructor ID: ${instructorId}`);
      return res.status(404).json({
        message: "No courses assigned to this instructor",
      });
    }

    console.log("Assigned Courses:", assignedCourses);

    // Extract the course titles for the assigned courses
    const courseTitles = assignedCourses.map((course) => course.course_title);

    // Prepare date range filter based on `date` field in `OnlineMeeting` schema
    const dateFilter = {};
    if (startDate) {
      dateFilter.date = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.date = { ...dateFilter.date, $lte: new Date(endDate) };
    }

    // Fetch inactive meetings with date filter
    const inactiveMeetings = await OnlineMeeting.find({
      course_name: { $in: courseTitles },
      status: "inactive",
      ...dateFilter,
    });

    console.log("Inactive Meetings:", inactiveMeetings);

    let totalWorkingHours = 0;

    // Calculate total working hours for the fetched meetings
    for (let meeting of inactiveMeetings) {
      const course = assignedCourses.find(
        (course) => course.course_title === meeting.course_name
      );

      if (course && course.session_duration) {
        const durationString = course.session_duration.toString().trim();
        let hours = 0;

        if (durationString.includes("Hours")) {
          hours = parseFloat(durationString.replace("Hours", "").trim());
        } else if (durationString.includes("Minutes")) {
          hours = parseFloat(durationString.replace("Minutes", "").trim()) / 60;
        }

        totalWorkingHours += hours;
      }
    }

    const response = {
      totalCourses: assignedCourses.length,
      totalInactiveClasses: inactiveMeetings.length,
      totalWorkingHours,
    };

    res.status(200).json({
      message:
        "Instructor's courses, inactive classes, and working hours fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error(
      "Error fetching instructor courses, inactive classes, and working hours:",
      error
    );
    res.status(500).json({
      message:
        "Error fetching instructor courses, inactive classes, and working hours",
      error: error.message,
    });
  }
};
