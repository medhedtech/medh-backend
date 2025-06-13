import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Instructor from "../models/instructor-model.js";
import RecordedSession from "../models/recorded-sessions-model.js";
import Student from "../models/student-model.js";
import { generateSignedUrl } from "../utils/cloudfrontSigner.js";

// Get Recorded Sessions for a student based on enrolled courses
export const getRecordedSessionsByStudent = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Check if the student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the list of courses the student is enrolled in
    const enrolledCourses = await EnrolledCourse.find({ student_id }).populate(
      "course_id",
    );

    if (!enrolledCourses || enrolledCourses.length === 0) {
      return res
        .status(404)
        .json({ message: "Student is not enrolled in any courses" });
    }

    // Extract course IDs from enrolled courses
    const courseIds = enrolledCourses.map((course) => course.course_id);

    // Fetch the recorded sessions for those courses
    const recordedSessions = await RecordedSession.find({
      course_id: { $in: courseIds },
    })
      .populate("instructor_id")
      .populate("course_id");

    if (!recordedSessions || recordedSessions.length === 0) {
      return res
        .status(404)
        .json({ message: "No recorded sessions found for enrolled courses" });
    }

    res.status(200).json(recordedSessions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching recorded sessions", error });
  }
};

// Create a new recorded session (for Instructor/Admin)
export const createRecordedSession = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.create(req.body);
    res.status(201).json({
      message: "Recorded session created successfully",
      recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating recorded session",
      error: error.message,
    });
  }
};

// Get recorded session by ID (accessible to students if they are enrolled in the course)
export const getRecordedSessionById = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findById(req.params.id)
      .populate("course")
      .populate("instructor");

    if (!recordedSession) {
      return res.status(404).json({
        message: "Recorded session not found",
      });
    }

    res.status(200).json({
      message: "Recorded session fetched successfully",
      recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recorded session",
      error: error.message,
    });
  }
};

// Update recorded session by ID (for instructor/admin)
export const updateRecordedSession = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    )
      .populate("course")
      .populate("instructor");

    if (!recordedSession) {
      return res.status(404).json({
        message: "Recorded session not found",
      });
    }

    res.status(200).json({
      message: "Recorded session updated successfully",
      recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating recorded session",
      error: error.message,
    });
  }
};

// Delete recorded session by ID (for instructor/admin)
export const deleteRecordedSession = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findByIdAndDelete(
      req.params.id,
    );

    if (!recordedSession) {
      return res.status(404).json({
        message: "Recorded session not found",
      });
    }

    res.status(200).json({
      message: "Recorded session deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting recorded session",
      error: error.message,
    });
  }
};

export const getRecordedSessionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const recordedSessions = await RecordedSession.find({ course: courseId })
      .populate("instructor")
      .sort("-createdAt");

    res.status(200).json({
      message: "Recorded sessions fetched successfully",
      recordedSessions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recorded sessions",
      error: error.message,
    });
  }
};

export const getRecordedSessionsByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const recordedSessions = await RecordedSession.find({
      instructor: instructorId,
    })
      .populate("course")
      .sort("-createdAt");

    res.status(200).json({
      message: "Recorded sessions fetched successfully",
      recordedSessions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recorded sessions",
      error: error.message,
    });
  }
};

/**
 * Create a new recorded session with automatic CloudFront URL signing
 * @route POST /api/v1/recorded-sessions
 * @access Admin, Instructor
 */
export const createRecordedSessionWithSigning = async (req, res) => {
  try {
    const sessionData = req.body;
    
    // Generate signed URL if the video URL is from CloudFront or S3
    if (sessionData.video_url) {
      try {
        let signedUrl;
        
        // Convert S3 URL to CloudFront URL and sign it (only for medh-filess bucket)
        if (sessionData.video_url.includes('medh-filess.s3.') && sessionData.video_url.includes('.amazonaws.com')) {
          const s3UrlParts = sessionData.video_url.split('.amazonaws.com/');
          if (s3UrlParts.length === 2) {
            const objectKey = s3UrlParts[1];
            const cloudFrontUrl = `https://cdn.medh.co/${objectKey}`;
            signedUrl = generateSignedUrl(cloudFrontUrl);
          }
        }
        // Sign existing CloudFront URLs
        else if (sessionData.video_url.includes('cdn.medh.co')) {
          signedUrl = generateSignedUrl(sessionData.video_url);
        }
        
        // Add signed URL to session data
        if (signedUrl) {
          sessionData.signed_video_url = signedUrl;
        }
      } catch (signError) {
        console.error("Error generating signed URL for recorded session:", signError);
        // Don't fail the operation, just log the error
      }
    }
    
    const recordedSession = await RecordedSession.create(sessionData);
    res.status(201).json({
      success: true,
      message: "Recorded session created successfully",
      data: recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating recorded session",
      error: error.message,
    });
  }
};

/**
 * Upload recorded session video via base64 and create session record
 * @route POST /api/v1/recorded-sessions/upload
 * @access Admin, Instructor
 */
export const uploadRecordedSession = async (req, res) => {
  try {
    const { 
      base64String, 
      course_id, 
      instructor_id, 
      title, 
      description,
      session_date,
      duration 
    } = req.body;

    if (!base64String || !course_id) {
      return res.status(400).json({
        success: false,
        message: "base64String and course_id are required"
      });
    }

    // Import the upload function
    const { handleRecordedLessonUpload } = await import("./upload/uploadController.js");
    
    // For recorded sessions, we'll use a general upload path
    const uploadReq = {
      ...req,
      body: {
        base64String,
        batchId: 'recorded-sessions', // Generic folder for recorded sessions
        title: title || 'Recorded Session Video'
      }
    };

    // Create a response handler that captures the upload result
    let uploadResult;
    const uploadRes = {
      header: () => {},
      status: (code) => ({
        json: (data) => {
          uploadResult = { statusCode: code, data };
        }
      })
    };

    // Perform the upload
    await handleRecordedLessonUpload(uploadReq, uploadRes);

    if (uploadResult && uploadResult.statusCode === 200) {
      // Create the recorded session record
      const sessionData = {
        course_id,
        instructor_id: instructor_id || req.user.id,
        title: title || 'Recorded Session',
        description: description || '',
        video_url: uploadResult.data.url,
        session_date: session_date || new Date(),
        duration: duration || 0,
        created_by: req.user.id
      };

      const recordedSession = await RecordedSession.create(sessionData);

      res.status(201).json({
        success: true,
        message: "Recorded session uploaded and created successfully",
        data: {
          session: recordedSession,
          uploadDetails: uploadResult.data
        }
      });
    } else {
      res.status(uploadResult?.statusCode || 500).json({
        success: false,
        message: "Upload failed",
        error: uploadResult?.data || "Unknown error"
      });
    }
  } catch (error) {
    console.error("Error uploading recorded session:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading recorded session",
      error: error.message
    });
  }
};

/**
 * Get recorded session with signed URL
 * @route GET /api/v1/recorded-sessions/:id/signed
 * @access Private (Students enrolled in course)
 */
export const getRecordedSessionWithSignedUrl = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findById(req.params.id)
      .populate("course")
      .populate("instructor");

    if (!recordedSession) {
      return res.status(404).json({
        success: false,
        message: "Recorded session not found",
      });
    }

    // Generate signed URL for the video
    let signedUrl = recordedSession.video_url;
    if (recordedSession.video_url) {
      try {
        // Convert S3 URL to CloudFront URL and sign it (only for medh-filess bucket)
        if (recordedSession.video_url.includes('medh-filess.s3.') && recordedSession.video_url.includes('.amazonaws.com')) {
          const s3UrlParts = recordedSession.video_url.split('.amazonaws.com/');
          if (s3UrlParts.length === 2) {
            const objectKey = s3UrlParts[1];
            const cloudFrontUrl = `https://cdn.medh.co/${objectKey}`;
            signedUrl = generateSignedUrl(cloudFrontUrl);
          }
        }
        // Sign existing CloudFront URLs
        else if (recordedSession.video_url.includes('cdn.medh.co')) {
          signedUrl = generateSignedUrl(recordedSession.video_url);
        }
      } catch (signError) {
        console.error("Error generating signed URL:", signError);
        // Use original URL if signing fails
      }
    }

    const sessionWithSignedUrl = {
      ...recordedSession.toObject(),
      signed_video_url: signedUrl
    };

    res.status(200).json({
      success: true,
      message: "Recorded session fetched successfully",
      data: sessionWithSignedUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching recorded session",
      error: error.message,
    });
  }
};
