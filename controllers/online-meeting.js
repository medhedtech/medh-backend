import moment from "moment";

import CoorporateAssignCourse from "../models/assigned-courses-coorporates-modal.js";
import Course from "../models/course-model.js";
import OnlineMeeting from "../models/online-meeting.js";
import User from "../models/user-modal.js";

export const createOnlineMeeting = async (req, res) => {
  try {
    const {
      course_name,
      category,
      students,
      meet_link,
      meet_title,
      meeting_tag,
      time,
      date,
      course_id,
    } = req.body;

    console.log("Incoming Data:", req.body);

    // Validate date format (YYYY-MM-DD)
    if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    // Validate time format (HH:mm)
    if (!moment(time, "HH:mm", true).isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid time format. Use HH:mm." });
    }

    const enrolled = await CoorporateAssignCourse.find({
      course_id: course_id,
    });

    const corporateIds = enrolled.map((c) => c.coorporate_id);

    const employees = await User.find({
      corporate_id: { $in: corporateIds },
    });

    const employeeIds = employees.map((e) => e._id);

    // Fetch all corporate students (users with role "coorporate-student" and status "Active")
    const corporateStudents = await User.find({
      role: "coorporate-student",
      is_active: true,
    });

    // Extract MongoDB _id for corporate students
    const corporateStudentIds = corporateStudents.map((student) => student._id);
    console.log("Corporate Students:", corporateStudents);

    const newMeeting = new OnlineMeeting({
      course_name,
      category,
      students,
      corporate_students: employeeIds,
      meet_link,
      meet_title,
      meeting_tag,
      time,
      date,
      course_id,
    });

    // Save the new meeting
    await newMeeting.save();

    res
      .status(201)
      .json({ message: "Online meeting created successfully", newMeeting });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error creating online meeting", error });
  }
};

// Get all online meetings
export const getAllOnlineMeetings = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch only active meetings
    const meetings = await OnlineMeeting.find({ status: "active" })
      .skip(skip)
      .limit(parseInt(limit));
    const totalMeetings = await OnlineMeeting.countDocuments({
      status: "active",
    });

    res.status(200).json({ meetings, totalMeetings });
  } catch (error) {
    res.status(500).json({ message: "Error fetching online meetings", error });
  }
};

// Get online meeting by ID
export const getOnlineMeetingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch only active meetings
    const meeting = await OnlineMeeting.findOne({ _id: id, status: "active" });

    if (!meeting) {
      return res
        .status(404)
        .json({ message: "Active online meeting not found" });
    }

    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Error fetching online meeting", error });
  }
};

// Update online meeting by ID
export const updateOnlineMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { course_name, meet_link, meet_title, meeting_tag, time, date } =
      req.body;

    const updatedMeeting = await OnlineMeeting.findByIdAndUpdate(
      id,
      { course_name, meet_link, meet_title, meeting_tag, time, date },
      { new: true, runValidators: true },
    );

    if (!updatedMeeting) {
      return res.status(404).json({ message: "Online meeting not found" });
    }

    res.status(200).json(updatedMeeting);
  } catch (error) {
    res.status(500).json({ message: "Error updating online meeting", error });
  }
};

// Delete online meeting by ID
export const deleteOnlineMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMeeting = await OnlineMeeting.findByIdAndDelete(id);

    if (!deletedMeeting) {
      return res.status(404).json({ message: "Online meeting not found" });
    }

    res.status(200).json({ message: "Online meeting deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting online meeting", error });
  }
};

export const getOnlineMeetingByStudentId = async (req, res) => {
  try {
    const studentId = req.params.student_id;
    const { show_all_upcoming } = req.query;
    const oneHourAgo = moment().subtract(1, "hours");
    const currentTime = moment();
    let query = {
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      time: {
        $gte: oneHourAgo.format("HH:mm"),
      },
    };

    if (!show_all_upcoming) {
      query = {
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          // $lte: new Date(currentTime.endOf("day")),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        time: {
          $gte: oneHourAgo.format("HH:mm"),
          $lte: currentTime.format("HH:mm"),
        },
      };
    }

    // Fetch only active meetings for the student
    const meetings = await OnlineMeeting.find({
      students: studentId,
      ...query,
    });

    if (!meetings || meetings.length === 0) {
      return res
        .status(404)
        .json({ message: "No active meeting found for this student" });
    }

    res.status(200).json(meetings);
  } catch (error) {
    console.error("Error fetching online meeting:", error);
    res.status(500).json({ message: "Error fetching online meeting", error });
  }
};

// Fetch upcoming classes for an instructor by ID
export const getUpcomingClassesByInstructorId = async (req, res) => {
  try {
    const { instructor_id } = req.params;

    // Step 1: Find all courses assigned to the instructor
    const courses = await Course.find({ assigned_instructor: instructor_id });

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses assigned to this instructor" });
    }

    const courseNames = courses.map((course) => course.course_title);

    // Step 2: Find all active online meetings for these courses
    const upcomingMeetings = await OnlineMeeting.find({
      course_name: { $in: courseNames },
      date: { $gte: moment().startOf("day").toDate() },
    });

    if (!upcomingMeetings || upcomingMeetings.length === 0) {
      return res.status(404).json({
        message: "No active upcoming classes found for this instructor",
      });
    }

    // Step 3: Map each meeting to its full course details
    const enrichedMeetings = upcomingMeetings.map((meeting) => {
      const courseDetails = courses.find(
        (course) => course.course_title === meeting.course_name,
      );
      return {
        ...meeting._doc,
        courseDetails,
      };
    });

    res.status(200).json({
      message: "Upcoming active classes fetched successfully",
      courseCount: courses.length,
      meetings: enrichedMeetings,
    });
  } catch (error) {
    console.error("Error fetching upcoming classes:", error);
    res.status(500).json({ message: "Error fetching upcoming classes", error });
  }
};

export const getOngoingClassesByInstructorId = async (req, res) => {
  try {
    const { instructor_id } = req.params;

    // Step 1: Find all courses assigned to the instructor
    const courses = await Course.find({ assigned_instructor: instructor_id });

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses assigned to this instructor" });
    }

    // Step 2: Extract course names
    const courseNames = courses.map((course) => course.course_title);

    // Step 3: Get current date and time
    const now = moment(); // Current date and time

    // Step 4: Find active meetings that are ongoing
    const ongoingMeetings = await OnlineMeeting.find({
      course_name: { $in: courseNames }, // Filter by courses
      date: now.startOf("day").toDate(), // Meetings on the current date
      expireAt: { $gte: now.toDate() }, // Meeting has not yet expired
      time: { $lte: now.format("HH:mm") }, // Meeting has started
      // status: "active", // Only active meetings
    });

    // Step 5: Enrich meetings with course details
    const enrichedMeetings = ongoingMeetings.map((meeting) => {
      const courseDetails = courses.find(
        (course) => course.course_title === meeting.course_name,
      );
      return {
        ...meeting._doc,
        courseDetails,
      };
    });

    // Step 6: Respond with enriched meetings
    if (!enrichedMeetings || enrichedMeetings.length === 0) {
      return res.status(404).json({
        message:
          "No ongoing classes found for this instructor at the current time",
      });
    }

    res.status(200).json({
      message: "Ongoing classes fetched successfully",
      meetings: enrichedMeetings,
    });
  } catch (error) {
    console.error("Error fetching current classes:", error);
    res.status(500).json({ message: "Error fetching current classes", error });
  }
};

export const getAllMeetingsForCorporateStudents = async (req, res) => {
  try {
    // Step 1: Fetch all corporate students (users with role "coorporate-student" and status "Active")
    const { student_id } = req.query;
    const { show_all_upcoming } = req.query;
    const corporateStudents = await User.find({
      role: "coorporate-student",
      // is_active: true,
    });

    // Step 2: If no corporate students found, return a 404
    if (!corporateStudents || corporateStudents.length === 0) {
      return res
        .status(404)
        .json({ message: "No active corporate students found." });
    }

    // Step 3: Extract MongoDB _id for corporate students
    const corporateStudentIds = corporateStudents.map((student) => student._id);

    const currentTime = moment();
    console.log(
      new Date(new Date().setHours(0, 0, 0, 0)),
      new Date(new Date().setHours(23, 59, 59, 999)),
    );
    const oneHourAgo = moment().subtract(1, "hours");

    let query = {
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      time: {
        $gte: oneHourAgo.format("HH:mm"),
      },
    };

    if (!show_all_upcoming) {
      query = {
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          // $lte: new Date(currentTime.endOf("day")),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        time: {
          $gte: oneHourAgo.format("HH:mm"),
          $lte: currentTime.format("HH:mm"),
        },
      };
    }

    // Step 4: Fetch all meetings that include corporate students
    const meetings = await OnlineMeeting.find({
      corporate_students: { $in: [student_id] },
      ...query,
    });

    // Step 5: If no meetings found, return a 404
    if (!meetings || meetings.length === 0) {
      return res
        .status(404)
        .json({ message: "No active meetings found for corporate students." });
    }

    // Step 6: Return the list of meetings
    res.status(200).json({
      message: "Active meetings for corporate students fetched successfully",
      meetings,
    });
  } catch (error) {
    console.error("Error fetching meetings for corporate students:", error);
    res.status(500).json({ message: "Error fetching meetings", error });
  }
};
