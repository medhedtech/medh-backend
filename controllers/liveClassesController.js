import mongoose from 'mongoose';
import Student from '../models/student-model.js';
import Instructor from '../models/instructor-model.js';
import User from '../models/user-modal.js';
import Grade from '../models/grade-model.js';
import Dashboard from '../models/dashboard.model.js';
import LiveSession from '../models/liveSession.model.js';
import { Course, Batch } from '../models/course-model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, validateAWSConfig, AWS_CONFIG } from '../config/aws-config.js';
import crypto from 'crypto';

// ✅ Initialize S3 client with validation
let s3Client;
try {
  s3Client = createS3Client();
  console.log('✅ S3 Client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize S3 Client:', error.message);
  s3Client = null;
}

// ================== Helpers ==================
const populateStudents = async (studentIds) => {
  if (!studentIds || studentIds.length === 0) return [];
  
  // Get students from Student model
  const students = await Student.find({
    _id: { $in: studentIds },
  }).select("_id full_name email phone_numbers status");
  
  return students;
};

const populateInstructor = async (instructorId) => {
  if (!instructorId) return null;
  let instructor = await Instructor.findById(instructorId).select(
    "_id full_name email domain experience qualifications",
  );
  
  if (!instructor) {
    instructor = await User.findOne({
      _id: instructorId,
      role: "instructor",
    }).select("_id full_name email");
  }
  return instructor;
};

// ================== Students ==================
export const getStudents = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (search) {
    query = {
      $or: [
        { full_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
  }

  try {
    const [students, total] = await Promise.all([
      Student.find(query)
        .select("_id full_name email phone_numbers status")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      Student.countDocuments(query),
    ]);
    res.status(200).json({
      status: "success",
      data: {
        items: students,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    let userQuery = { role: "student" };
    if (search) {
      userQuery = {
        role: "student",
        $or: [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }
    const [students, total] = await Promise.all([
      User.find(userQuery)
        .select("_id full_name email")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      User.countDocuments(userQuery),
    ]);
    res.status(200).json({
      status: "success",
      data: {
        items: students,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  }
});

// ================== Grades ==================
export const getGrades = catchAsync(async (req, res, next) => {
  const staticGrades = [
    { _id: "preschool", name: "Preschool", level: 1 },
    { _id: "grade-1-2", name: "Grade 1-2", level: 2 },
    { _id: "grade-3-5", name: "Grade 3-5", level: 3 },
    { _id: "grade-6-8", name: "Grade 6-8", level: 4 },
    { _id: "grade-9-10", name: "Grade 9-10", level: 5 },
    { _id: "grade-11-12", name: "Grade 11-12", level: 6 },
    { _id: "foundation-cert", name: "Foundation Certificate", level: 7 },
    { _id: "advance-cert", name: "Advance Certificate", level: 8 },
    { _id: "executive-diploma", name: "Executive Diploma", level: 9 },
    { _id: "ug-graduate", name: "UG - Graduate - Professionals", level: 10 },
  ];
  res.status(200).json({ status: "success", data: staticGrades });
});

// ================== Dashboards ==================
export const getDashboards = catchAsync(async (req, res, next) => {
  const staticDashboards = [
    {
      _id: "instructor-dashboard",
      name: "Instructor Dashboard",
      type: "instructor",
      description: "Dashboard for instructors",
    },
    {
      _id: "student-dashboard",
      name: "Student Dashboard",
      type: "student",
      description: "Dashboard for students",
    },
    {
      _id: "admin-dashboard",
      name: "Admin Dashboard",
      type: "admin",
      description: "Dashboard for admins",
    },
  ];
  res.status(200).json({ status: "success", data: staticDashboards });
});

// ================== Instructors ==================
export const getInstructors = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  let query = {};
  if (search) {
    query = {
      $or: [
        { full_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
  }
  try {
    const [instructors, total] = await Promise.all([
      Instructor.find(query)
        .select("_id full_name email domain experience qualifications")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      Instructor.countDocuments(query),
    ]);
    res
      .status(200)
      .json({
        status: "success",
      data: {
        items: instructors,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
    });
  } catch (error) {
    let userQuery = { role: "instructor" };
    if (search) {
      userQuery = {
        role: "instructor",
        $or: [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }
    const [instructors, total] = await Promise.all([
      User.find(userQuery)
        .select("_id full_name email avatar")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      User.countDocuments(userQuery),
    ]);
    res
      .status(200)
      .json({
        status: "success",
      data: {
        items: instructors,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
    });
  }
});

// ================== Generate S3 presigned URL ==================
export const generateUploadUrl = catchAsync(async (req, res, next) => {
  const { batchObjectId, studentName, fileName, fileType } = req.body;
  if (!batchObjectId || !studentName || !fileName) {
    return next(new AppError("Missing required parameters", 400));
  }
  const allowedTypes = ["video/mp4", "video/mov", "video/webm"];
  if (fileType && !allowedTypes.includes(fileType)) {
    return next(new AppError("Invalid file type", 400));
  }
  try {
    const key = `videos/${batchObjectId}/${studentName}/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType || "video/mp4",
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    res
      .status(200)
      .json({
        status: "success",
        data: { uploadUrl, filePath: key, fileName, expiresIn: 300 },
    });
  } catch (error) {
    return next(
      new AppError(`Failed to generate upload URL: ${error.message}`, 500),
    );
  }
});

// ================== Generate Signed URL for Video ==================
export const generateSignedVideoUrl = catchAsync(async (req, res, next) => {
  try {
    const { videoPath } = req.body;
    
    if (!videoPath) {
      return next(new AppError('Video path is required', 400));
    }
    
    // Validate AWS configuration
    const awsValidation = validateAWSConfig();
    if (!awsValidation.isValid) {
      return next(new AppError(`AWS S3 configuration is missing: ${awsValidation.missingVars.join(', ')}`, 500));
    }
    
    if (!s3Client) {
      return next(new AppError("S3 Client initialization failed", 500));
    }
    
    // Generate signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.BUCKET_NAME,
      Key: videoPath
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1 hour
    });
    
    console.log('✅ Generated signed URL for video:', videoPath);
    
    res.status(200).json({
      status: 'success',
      data: {
        signedUrl,
        expiresIn: 3600,
        videoPath
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    return next(new AppError(`Failed to generate signed URL: ${error.message}`, 500));
  }
});

// ================== Upload Videos ==================
export const uploadVideos = catchAsync(async (req, res, next) => {
  try {
    console.log('🔍 uploadVideos called');
    console.log('📝 Request body:', req.body);
    console.log('📁 Files:', req.files?.length || 0);
    
    // Enhanced validation
    if (!req.files || req.files.length === 0) {
      console.error('❌ No files uploaded');
      return next(new AppError("No video files uploaded", 400));
    }
    
    const { studentIds, batchId, sessionNo } = req.body;
    console.log('📝 Extracted data:', { studentIds, batchId, sessionNo });
    
    // Validate required fields
    if (!studentIds || !batchId || !sessionNo) {
      console.error('❌ Missing required fields:', { studentIds: !!studentIds, batchId: !!batchId, sessionNo: !!sessionNo });
      return next(new AppError("Student IDs, Batch ID, and Session Number are required", 400));
    }
    
    let parsedStudentIds = studentIds;
    if (typeof studentIds === "string") {
      try {
        parsedStudentIds = JSON.parse(studentIds);
      } catch (error) {
        console.error('❌ Error parsing studentIds:', error);
        return next(new AppError("Invalid student IDs format", 400));
      }
    }
    
    if (!Array.isArray(parsedStudentIds) || parsedStudentIds.length === 0) {
      console.error('❌ Invalid student IDs array:', parsedStudentIds);
      return next(new AppError("Student IDs are required", 400));
    }
    
    // Validate AWS configuration
    const awsValidation = validateAWSConfig();
    if (!awsValidation.isValid) {
      console.error('❌ AWS Configuration Error:', awsValidation.missingVars);
      return next(new AppError(`AWS S3 configuration is missing: ${awsValidation.missingVars.join(', ')}. Please add these to your .env file.`, 500));
    }

    // Check if S3 client was initialized properly
    if (!s3Client) {
      console.error('❌ S3 Client not initialized');
      return next(new AppError("S3 Client initialization failed. Please check AWS configuration.", 500));
    }

    // Get student names for folder structure with enhanced error handling
    console.log('🔍 Fetching student names for folder structure...');
    const studentNames = {};
    for (const studentId of parsedStudentIds) {
      try {
        console.log(`🔍 Looking up student: ${studentId}`);
        
        // First try to find in Student model
        let student = await Student.findById(studentId).select("full_name");
        if (student) {
          const studentName = student.full_name || "Unknown";
          studentNames[studentId] = studentName
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .toLowerCase()
            .trim();
          console.log(`✅ Found student in Student model: ${studentName}`);
        } else {
          // If not found in Student model, try User model
          console.log(`🔍 Student not found in Student model, trying User model...`);
          student = await User.findById(studentId).select("first_name last_name full_name");
          if (student) {
            const studentName =
              student.full_name ||
              `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
              "Unknown";
            studentNames[studentId] = studentName
              .replace(/[^a-zA-Z0-9\s]/g, "")
              .replace(/\s+/g, "_")
              .toLowerCase()
              .trim();
            console.log(`✅ Found student in User model: ${studentName}`);
          } else {
            console.log(`⚠️ Student not found in either model, using 'unknown'`);
            studentNames[studentId] = "unknown";
          }
        }
      } catch (error) {
        console.error('❌ Error finding student:', studentId, error.message);
        studentNames[studentId] = "unknown";
      }
    }
    
    console.log('📝 Student names mapping:', studentNames);

  const uploadedVideos = [];
  
  // Upload each video for each student
  for (const file of req.files) {
    // Support both memory and disk storage
    const originalName = file.originalname || file.filename || `video-${Date.now()}.mp4`;
    const fileExtension = originalName.split(".").pop();
    
    for (const studentId of parsedStudentIds) {
      const studentName = studentNames[studentId];
      
      // Create folder structure: videos/batch_object_id/student_object_id(student_name)/session_number/
      const s3Key = `videos/${batchId}/${studentId}(${studentName})/session-${sessionNo}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;
      
      // Prepare S3 key and basic params
      const uploadParamsBase = {
        Bucket: AWS_CONFIG.BUCKET_NAME,
        Key: s3Key,
        ContentType: file.mimetype || 'video/mp4',
        Metadata: {
          originalName: originalName,
          studentId,
          sessionNo,
          batchId,
          uploadedAt: new Date().toISOString(),
        },
      };
      
      try {
        // Log intended upload params (avoid referencing undefined variable)
        console.log('🔍 Attempting S3 upload with params:', {
          bucket: uploadParamsBase.Bucket,
          key: uploadParamsBase.Key,
          contentType: uploadParamsBase.ContentType,
          bodyType: file.path ? 'stream' : (file.buffer ? 'buffer' : 'none')
        });
        
        // Check if we're in development mode with test credentials
        if (process.env.AWS_ACCESS_KEY_ID === 'test' || process.env.AWS_SECRET_ACCESS_KEY === 'test') {
          console.log('⚠️ Using test credentials - simulating S3 upload success');
          
          // Simulate successful upload for testing
          const videoUrl = `https://${AWS_CONFIG.BUCKET_NAME}.s3.${AWS_CONFIG.REGION}.amazonaws.com/${s3Key}`;
          uploadedVideos.push({
            fileId: s3Key,
            name: file.originalname,
            size: file.size,
            url: videoUrl,
            studentId,
            sessionNo,
            batchId,
            s3Path: s3Key,
            studentName: studentNames[studentId],
            uploadedAt: new Date().toISOString()
          });
          
          console.log('✅ Simulated S3 upload success:', s3Key);
        } else {
          // Real S3 upload
          // Use multipart upload for large files if stored on disk
          if (file.path) {
            const { Upload } = await import('@aws-sdk/lib-storage');
            const fsModule = await import('fs');
            const readStream = fsModule.createReadStream(file.path);

            const uploader = new Upload({
              client: s3Client,
              params: {
                ...uploadParamsBase,
                Body: readStream,
              },
              queueSize: 5, // parallel parts
              partSize: 10 * 1024 * 1024, // 10MB
              leavePartsOnError: false,
            });

            await uploader.done();
          } else {
            // Fallback to single put for memory uploads (small files)
            const command = new PutObjectCommand({
              ...uploadParamsBase,
              Body: file.buffer,
            });
            await s3Client.send(command);
          }

          // Generate signed URL for immediate access
          const getCommand = new GetObjectCommand({
            Bucket: AWS_CONFIG.BUCKET_NAME,
            Key: s3Key
          });
          const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
          
          const videoUrl = `https://${AWS_CONFIG.BUCKET_NAME}.s3.${AWS_CONFIG.REGION}.amazonaws.com/${s3Key}`;
          uploadedVideos.push({
            fileId: s3Key,
            name: originalName,
            size: file.size,
            url: signedUrl, // Use signed URL instead of direct URL
            directUrl: videoUrl, // Keep direct URL for reference
            studentId,
            sessionNo,
            batchId,
            s3Path: s3Key,
            studentName: studentNames[studentId],
            uploadedAt: new Date().toISOString(),
            urlExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
          });
          
          console.log('✅ Successfully uploaded to S3:', s3Key);
        }
      } catch (error) {
        console.error('❌ S3 upload failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.Code,
          statusCode: error.$metadata?.httpStatusCode
        });
        
        return next(
          new AppError(`Failed to upload video: ${error.message}`, 500),
        );
      } finally {
        // Clean up temp file if exists (disk storage)
        if (file.path) {
          try {
            const fsModule = await import('fs');
            fsModule.unlink(file.path, () => {});
          } catch (cleanupErr) {
            console.warn('⚠️ Failed to delete temp file:', cleanupErr.message);
          }
        }
      }
    }
  }
  
    console.log('✅ Upload completed successfully');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: "success",
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      data: { 
        videos: uploadedVideos,
        folderStructure: `videos/${batchId}/[student_id]([student_name])/session-${sessionNo}/`
      },
    });
    
  } catch (error) {
    console.error('❌ Unexpected error in uploadVideos:', error);
    console.error('   - Error message:', error.message);
    console.error('   - Error stack:', error.stack);
    return next(new AppError(`Upload failed: ${error.message}`, 500));
  }
});

// ================== Create Session ==================
export const createSession = catchAsync(async (req, res, next) => {
  console.log('🔍 createSession called with body:', req.body);
  
  const {
    sessionTitle,
    sessionNo,
    students,
    grades,
    dashboard,
    instructorId,
    batchId,
    video,
    date,
    remarks,
    summary,
    courseCategory
  } = req.body;

  console.log('📝 Extracted session data:', {
    sessionTitle,
    sessionNo,
    studentsCount: students?.length,
    gradesCount: grades?.length,
    dashboard,
    instructorId,
    batchId,
    hasVideo: !!video,
    date,
    courseCategory
  });

  // Validate required fields
  if (!sessionTitle || !sessionNo || !students?.length || !grades?.length || !dashboard || !instructorId || !date) {
    console.error('❌ Missing required fields:', {
      hasSessionTitle: !!sessionTitle,
      hasSessionNo: !!sessionNo,
      sessionNoValue: sessionNo,
      studentsLength: students?.length,
      gradesLength: grades?.length,
      hasDashboard: !!dashboard,
      hasInstructorId: !!instructorId,
      hasVideo: !!video,
      hasDate: !!date
    });
    return next(new AppError('Missing required fields', 400));
  }
  
  // Additional validation for session number
  if (!sessionNo.trim()) {
    console.error('❌ Session number is empty or whitespace:', sessionNo);
    return next(new AppError('Session number cannot be empty', 400));
  }

  // Create new session with unique session number for database but display original
  const uniqueSessionNo = `${sessionNo}-${Date.now()}`;
  console.log('🔧 Generated unique session number for database:', uniqueSessionNo);
  console.log('📝 Original session number for display:', sessionNo);
  
  // Ensure proper data types
  const sessionData = {
    sessionTitle: sessionTitle?.toString()?.trim(),
    sessionNo: uniqueSessionNo?.toString()?.trim(),
    originalSessionNo: sessionNo?.toString()?.trim(),
    students: Array.isArray(students) ? students : [],
    grades: Array.isArray(grades) ? grades : [],
    dashboard: dashboard,
    instructorId: instructorId,
    batchId: batchId || null,
    video: video || { fileId: 'no-video', name: 'No video uploaded', size: 0, url: '#' },
    date: new Date(date),
    remarks: remarks?.toString()?.trim() || '',
    summary: summary || { title: '', description: '', items: [] },
    courseCategory: courseCategory?.toString() || 'ai-data-science',
    status: 'scheduled'
  };

  console.log('📝 Session data to create:', sessionData);
  console.log('🔍 DEBUG - batchId in sessionData:', sessionData.batchId);
  
  // Log video details specifically
  if (sessionData.video && sessionData.video.fileId !== 'no-video') {
    console.log('📹 Video data being saved');
    console.log('   - File size:', sessionData.video.size, 'bytes');
    console.log('   - Has valid URL:', !!sessionData.video.url && sessionData.video.url !== '#');
  } else {
    console.log('📹 No video data - using default placeholder');
  }

  // Only add createdBy if user exists
  if (req.user?.id) {
    sessionData.createdBy = req.user.id;
    console.log('👤 Added createdBy:', req.user.id);
  }

  console.log('💾 Creating session in database...');
  console.log('📝 Session data prepared for database save');
  
  let newSession;
  try {
    newSession = await LiveSession.create(sessionData);
    console.log('✅ Session created successfully with ID:', newSession._id);
    console.log('✅ Video data saved - Has video:', newSession.video && newSession.video.fileId !== 'no-video');
  } catch (error) {
    console.error('❌ Error creating session in database:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    
    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:', error.errors);
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${validationErrors.join(', ')}`, 400));
    }
    
    if (error.code === 11000) {
      console.error('❌ Duplicate key error:', error.keyValue);
      return next(new AppError('Session number already exists', 409));
    }
    
    return next(new AppError(`Failed to create session: ${error.message}`, 500));
  }

  res.status(201).json({
    status: 'success',
    data: {
      sessionId: newSession._id,
      sessionNo: sessionNo, // Return original session number for display
      success: true,
      video: newSession.video, // Include video data in response
      hasVideo: newSession.video && newSession.video.fileId !== 'no-video'
    }
  });
});

// ================== Test S3 Connection ==================
export const testS3Connection = catchAsync(async (req, res, next) => {
  try {
    const testClient = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,        // ✅ FIXED
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // ✅ FIXED
      },
    });

    const headBucketCommand = new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
    });

    await testClient.send(headBucketCommand);
    
    res.status(200).json({
      status: 'success',
      data: {
        bucketName: process.env.AWS_S3_BUCKET_NAME,
        region: process.env.AWS_REGION,
        accessStatus: 'accessible',
        
        message: 'S3 bucket is accessible and credentials are valid'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'S3 connection test failed',
      error: error.message
    });
  }
});

// --------------------
// Get Previous Session
// --------------------
export const getPreviousSession = catchAsync(async (req, res, next) => {
  const { courseCategory } = req.query;

  let query = {};
  if (courseCategory) {
    query.courseCategory = courseCategory;
  }

  const latestSession = await LiveSession.findOne(query)
    .sort({ updatedAt: -1, createdAt: -1 })
  .populate('grades', 'name');

  if (!latestSession) {
    return res.status(200).json({
      status: 'success',
      data: null
    });
  }

  const [students, instructor] = await Promise.all([
    populateStudents(latestSession.students),
    populateInstructor(latestSession.instructorId)
  ]);

  const sessionWithPopulatedData = {
    ...latestSession.toObject(),
    sessionNo: latestSession.originalSessionNo || latestSession.sessionNo,
    students,
    instructorId: instructor
  };

  res.status(200).json({
    status: 'success',
    data: sessionWithPopulatedData
  });
});

// --------------------
// Get Sessions
// --------------------
export const getSessions = catchAsync(async (req, res, next) => {
  const { courseCategory, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (courseCategory) {
    query.courseCategory = courseCategory;
  }

  const [sessions, total] = await Promise.all([
    LiveSession.find(query)
      .populate('grades', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    LiveSession.countDocuments(query)
  ]);

  const sessionsWithPopulatedData = await Promise.all(
    sessions.map(async (session) => {
      const [students, instructor] = await Promise.all([
        populateStudents(session.students),
        populateInstructor(session.instructorId)
      ]);

      return {
        ...session.toObject(),
        students,
        instructorId: instructor
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      items: sessionsWithPopulatedData,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// --------------------
// Get Session by ID
// --------------------
export const getSession = catchAsync(async (req, res, next) => {
  console.log('🔍 Fetching session with ID:', req.params.id);
  
  const session = await LiveSession.findById(req.params.id)
    .populate('grades', 'name');

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  const [students, instructor] = await Promise.all([
    populateStudents(session.students),
    populateInstructor(session.instructorId)
  ]);

  const sessionWithPopulatedData = {
    ...session.toObject(),
    sessionNo: session.originalSessionNo || session.sessionNo,
    students,
    instructorId: instructor
  };

  res.status(200).json({
    status: 'success',
    data: sessionWithPopulatedData
  });
});

// --------------------
// Get Student's Latest Session
// --------------------
export const getStudentLatestSession = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  
  console.log('🔍 Fetching latest session for student ID:', studentId);
  
  // Validate student ID
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return next(new AppError('Invalid student ID', 400));
  }
  
  // Find the latest session for this student
  const latestSession = await LiveSession.findOne({
    students: studentId
  })
    .sort({ createdAt: -1, date: -1 }) // Sort by creation date and session date (latest first)
    .populate('students', 'full_name email username')
    .populate('instructorId', 'full_name email username')
    .populate('grades', 'name')
    .populate('batchId', 'batch_name batch_code')
    .lean();
  
  if (!latestSession) {
    return res.status(200).json({
      status: 'success',
      data: null,
      message: 'No previous sessions found for this student'
    });
  }
  
  // Format the response data
  const formattedSession = {
    sessionTitle: latestSession.sessionTitle,
    sessionNo: latestSession.originalSessionNo || latestSession.sessionNo || '1',
    status: latestSession.status || 'scheduled',
    student: latestSession.students?.find(s => s._id.toString() === studentId) || latestSession.students?.[0],
    instructor: latestSession.instructorId,
    grade: (() => {
      const gradeData = latestSession.grades?.[0];
      // Handle both ObjectId (populated) and string cases
      if (typeof gradeData === 'string') {
        return { name: gradeData }; // Convert string to object format
      } else if (gradeData && gradeData.name) {
        return gradeData; // Already populated object
      } else {
        return { name: gradeData || 'N/A' }; // Fallback
      }
    })(),
    batch: latestSession.batchId,
    date: latestSession.date,
    courseCategory: latestSession.courseCategory,
    remarks: latestSession.remarks,
    summary: latestSession.summary
  };
  
  console.log('✅ Latest session found:', {
    sessionTitle: formattedSession.sessionTitle,
    sessionNo: formattedSession.sessionNo,
    status: formattedSession.status,
    studentName: formattedSession.student?.full_name
  });
  
  res.status(200).json({
    status: 'success',
    data: formattedSession
  });
});

// --------------------
// Update Session
// --------------------
export const updateSession = catchAsync(async (req, res, next) => {
  const session = await LiveSession.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: session
  });
});

// --------------------
// Delete Session
// --------------------
export const deleteSession = catchAsync(async (req, res, next) => {
  const session = await LiveSession.findByIdAndDelete(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// --------------------
// Upload File
// --------------------
export const uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size
    }
  });
});

// --------------------
// Get Course Stats
// --------------------
export const getCourseStats = catchAsync(async (req, res, next) => {
  const { category } = req.params;

  const stats = await LiveSession.aggregate([
    { $match: { courseCategory: category } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        scheduledSessions: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: stats[0] || { totalSessions: 0, completedSessions: 0, scheduledSessions: 0 }
  });
});

// --------------------
// Get Course Categories
// --------------------
export const getCourseCategories = catchAsync(async (req, res, next) => {
  const categories = await LiveSession.distinct('courseCategory');
  
  res.status(200).json({
    status: 'success',
    data: {
      items: categories
    }
  });
});

// --------------------
// Get Student Batch Info
// --------------------
export const getStudentBatchInfo = catchAsync(async (req, res, next) => {
  const { studentIds } = req.query;
  
  if (!studentIds) {
    return next(new AppError('Student IDs are required', 400));
  }

  const parsedStudentIds = JSON.parse(studentIds);

  const Enrollment = mongoose.model('Enrollment');
    const enrollments = await Enrollment.find({
    student: { $in: parsedStudentIds }
  }).populate('batch', '_id batch_name batch_code');

    const studentBatchMapping = {};
    for (const enrollment of enrollments) {
      if (enrollment.batch) {
        studentBatchMapping[enrollment.student.toString()] = {
          batchId: enrollment.batch._id,
          batchName: enrollment.batch.batch_name,
        batchCode: enrollment.batch.batch_code
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
      studentBatchMapping
    }
  });
});

// Get batches for selected students
export const getBatchesForStudents = catchAsync(async (req, res, next) => {
  const { studentIds } = req.query;
  
  if (!studentIds) {
    return next(new AppError('Student IDs are required', 400));
  }

  let parsedStudentIds = studentIds;
  if (typeof studentIds === 'string') {
    try {
      parsedStudentIds = JSON.parse(studentIds);
    } catch (error) {
      return next(new AppError('Invalid student IDs format', 400));
    }
  }

  if (!Array.isArray(parsedStudentIds) || parsedStudentIds.length === 0) {
    return next(new AppError('Student IDs array is required', 400));
  }

  try {
    const Batch = mongoose.model('Batch');
    
    console.log('🔍 Fetching batches from batches collection for students:', parsedStudentIds);
    
    // Convert string IDs to ObjectIds for MongoDB query
    const objectIdStudentIds = parsedStudentIds.map(id => new mongoose.Types.ObjectId(id));
    console.log('🔍 Converted to ObjectIds:', objectIdStudentIds);
    
    // Get batches directly from batches collection where students are enrolled
    const batches = await Batch.find({
      enrolled_student_ids: { $in: objectIdStudentIds }
    }).select('_id batch_name batch_code start_date end_date enrolled_students');

    console.log('📚 Raw batches found from database:', batches.length);

    // Get unique batches (in case same batch appears multiple times)
    const uniqueBatches = [];
    const batchMap = new Map();

    for (const batch of batches) {
      if (!batchMap.has(batch._id.toString())) {
        batchMap.set(batch._id.toString(), true);
        uniqueBatches.push({
          _id: batch._id,
          batch_name: batch.batch_name,
          batch_code: batch.batch_code,
          start_date: batch.start_date,
          end_date: batch.end_date,
          enrolled_students: batch.enrolled_students
        });
      }
    }

    // Sort batches by start date (newest first)
    uniqueBatches.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    console.log(`🔍 Found ${uniqueBatches.length} batches for students:`, parsedStudentIds);
    uniqueBatches.forEach((batch, index) => {
      console.log(`   ${index + 1}. ${batch.batch_name} (${batch.batch_code}) - ${batch.enrolled_students} students`);
    });

    res.status(200).json({
      status: 'success',
      data: {
        batches: uniqueBatches,
        totalBatches: uniqueBatches.length
      }
    });

  } catch (error) {
    console.error('Error fetching batches for students:', error);
    return next(new AppError('Failed to fetch batches for students', 500));
  }
});

// Get all batches
export const getAllBatches = catchAsync(async (req, res, next) => {
  try {
    const Batch = mongoose.model('Batch');
    
    console.log('🔍 Fetching all batches from batches collection');
    
    const batches = await Batch.find({})
      .select('_id batch_name batch_code start_date end_date enrolled_students enrolled_student_ids')
      .sort({ batch_name: 1 });

    console.log('📚 Total batches found:', batches.length);
    
    // Log batches with missing enrolled_student_ids for debugging
    const batchesWithMissingData = batches.filter(batch => 
      !batch.enrolled_student_ids || batch.enrolled_student_ids.length === 0
    );
    if (batchesWithMissingData.length > 0) {
      console.log('⚠️ Batches missing enrolled_student_ids:', 
        batchesWithMissingData.map(b => ({ id: b._id, name: b.batch_name }))
      );
    }

    // Transform to match expected format
    const formattedBatches = batches.map(batch => ({
      _id: batch._id,
      name: batch.batch_name,
      batch_name: batch.batch_name, // Keep both for compatibility
      code: batch.batch_code,
      batch_code: batch.batch_code, // Keep both for compatibility
      startDate: batch.start_date,
      endDate: batch.end_date,
      enrolledStudents: batch.enrolled_students || [],
      enrolled_student_ids: batch.enrolled_student_ids || [] // Add the student IDs array
    }));

    res.status(200).json({
      status: 'success',
      data: formattedBatches
    });
  } catch (error) {
    console.error('❌ Error fetching all batches:', error);
    return next(new AppError('Error fetching batches', 500));
  }
});

// --------------------
// Verify S3 Videos
// --------------------
export const verifyS3Videos = catchAsync(async (req, res, next) => {
    const { videos } = req.body;
    
    if (!videos || !Array.isArray(videos)) {
      return res.status(400).json({
        status: 'error',
        message: 'Videos array is required'
      });
    }

    console.log('🔍 Verifying videos in S3:', videos.length, 'videos');

    const verificationResults = {
      verifiedVideos: [],
      failedVerifications: []
    };

    for (const video of videos) {
      try {
        const headObjectCommand = new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: video.s3Key,
        });

        const result = await s3Client.send(headObjectCommand);
        
        verificationResults.verifiedVideos.push({
          s3Key: video.s3Key,
          size: result.ContentLength,
          lastModified: result.LastModified,
          etag: result.ETag
        });
        
        console.log(`✅ Verified: ${video.s3Key} (${result.ContentLength} bytes)`);
      } catch (error) {
        verificationResults.failedVerifications.push({
          s3Key: video.s3Key,
          error: error.message
        });
        
        console.log(`❌ Failed to verify: ${video.s3Key} - ${error.message}`);
      }
    }

    res.status(200).json({
      status: 'success',
      data: verificationResults,
      message: `Verified ${verificationResults.verifiedVideos.length}/${videos.length} videos`
    });
});

// --------------------
// Test Batch Student Org
// --------------------
export const testBatchStudentOrg = catchAsync(async (req, res, next) => {
  try {
    console.log('🧪 Testing batch and student organization...');
    
    const students = await Student.find({})
      .select('_id full_name email')
      .limit(5);
    
    const batches = await Batch.find({})
      .select('_id name course_details')
      .limit(3);
    
    console.log(`✅ Found ${students.length} students and ${batches.length} batches`);
    
    res.status(200).json({
      status: 'success',
      data: {
        students,
        batches,
        message: 'Batch and student organization test successful'
      }
    });
  } catch (error) {
    console.error('❌ Batch/student organization test failed:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Batch/student organization test failed',
      error: error.message
    });
  }
});


