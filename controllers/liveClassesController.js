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
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
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
    
    // Validate each file
    for (const file of req.files) {
      console.log(`📁 File validation: ${file.originalname}`);
      console.log(`   - Size: ${file.size} bytes`);
      console.log(`   - Path: ${file.path || 'memory'}`);
      console.log(`   - Mimetype: ${file.mimetype}`);
      
      if (!file.originalname) {
        console.error('❌ File missing originalname');
        return next(new AppError("Invalid file: missing filename", 400));
      }
      
      if (!file.mimetype || !file.mimetype.startsWith('video/')) {
        console.error('❌ Invalid file type:', file.mimetype);
        return next(new AppError(`Invalid file type: ${file.mimetype}. Only video files are allowed.`, 400));
      }
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
    const fileExtension = file.originalname.split(".").pop();
    
    // Get actual file size - handle both memory and disk storage
    let actualFileSize = file.size;
    if (!actualFileSize && file.path) {
      try {
        const fs = await import('fs');
        const stats = fs.statSync(file.path);
        actualFileSize = stats.size;
        console.log(`📁 File size from disk: ${actualFileSize} bytes (${(actualFileSize / (1024 * 1024)).toFixed(2)} MB)`);
      } catch (error) {
        console.error('❌ Error getting file size from disk:', error);
        actualFileSize = 0;
      }
    }
    
    console.log(`📹 Processing file: ${file.originalname}, Size: ${actualFileSize} bytes, Path: ${file.path || 'memory'}`);
    
    for (const studentId of parsedStudentIds) {
      const studentName = studentNames[studentId];
      
      // Create folder structure: videos/batch_object_id/student_object_id(student_name)/session_number/
      const s3Key = `videos/${batchId}/${studentId}(${studentName})/session-${sessionNo}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;
      
      const uploadParams = {
        Bucket: AWS_CONFIG.BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { 
          originalName: file.originalname, 
          studentId, 
          sessionNo,
          batchId,
          uploadedAt: new Date().toISOString()
        },
      };
      
      try {
        console.log('🔍 Attempting S3 upload with params:', {
          bucket: uploadParams.Bucket,
          key: uploadParams.Key,
          contentType: uploadParams.ContentType,
          hasBody: !!uploadParams.Body
        });
        
        // Check if we're in development mode with test credentials
        if (process.env.AWS_ACCESS_KEY_ID === 'test' || process.env.AWS_SECRET_ACCESS_KEY === 'test') {
          console.log('⚠️ Using test credentials - simulating S3 upload success');
          
          // Simulate successful upload for testing
          const videoUrl = `https://${AWS_CONFIG.BUCKET_NAME}.s3.${AWS_CONFIG.REGION}.amazonaws.com/${s3Key}`;
          uploadedVideos.push({
            fileId: s3Key,
            name: file.originalname,
            size: actualFileSize,
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
            // Verify file exists on disk
            const fsModule = await import('fs');
            if (!fsModule.existsSync(file.path)) {
              throw new Error(`File not found on disk: ${file.path}`);
            }
            
            const stats = fsModule.statSync(file.path);
            if (stats.size === 0) {
              throw new Error(`File is empty: ${file.path}`);
            }
            
            console.log(`📁 Uploading file from disk: ${file.path} (${stats.size} bytes)`);
            
            const { Upload } = await import('@aws-sdk/lib-storage');
            const readStream = fsModule.createReadStream(file.path);

            const uploader = new Upload({
              client: s3Client,
              params: {
                ...uploadParams,
                Body: readStream,
              },
              queueSize: 5, // parallel parts
              partSize: 10 * 1024 * 1024, // 10MB
              leavePartsOnError: false,
            });

            await uploader.done();
            console.log(`✅ S3 upload completed for: ${s3Key}`);
            
            // Clean up temporary file from disk
            try {
              if (fsModule.existsSync(file.path)) {
                fsModule.unlinkSync(file.path);
                console.log(`🗑️ Cleaned up temporary file: ${file.path}`);
              }
            } catch (cleanupError) {
              console.warn('⚠️ Could not clean up temporary file:', cleanupError.message);
            }
          } else {
            // Fallback to single put for memory uploads (small files)
            if (!file.buffer || file.buffer.length === 0) {
              throw new Error('File buffer is empty');
            }
            
            console.log(`📁 Uploading file from memory: ${file.originalname} (${file.buffer.length} bytes)`);
            
            const command = new PutObjectCommand({
              ...uploadParams,
              Body: file.buffer,
            });
            await s3Client.send(command);
            console.log(`✅ S3 upload completed for: ${s3Key}`);
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
            name: file.originalname,
            size: actualFileSize,
            url: signedUrl, // Use signed URL instead of direct URL
            directUrl: videoUrl, // Keep direct URL for reference
            studentId,
            sessionNo,
            batchId,
            s3Path: s3Key,
            studentName: studentNames[studentId],
            uploadedAt: new Date().toISOString()
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
      }
    }
  }
  
    console.log('✅ Upload completed successfully');
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
    video: video || { fileId: 'no-video', name: 'No video uploaded', size: 0, url: '#' },
    date: new Date(date),
    remarks: remarks?.toString()?.trim() || '',
    summary: summary || { title: '', description: '', items: [] },
    courseCategory: courseCategory?.toString() || 'ai-data-science',
    status: 'scheduled'
  };

  console.log('📝 Session data to create:', sessionData);

  // Only add createdBy if user exists
  if (req.user?.id) {
    sessionData.createdBy = req.user.id;
    console.log('👤 Added createdBy:', req.user.id);
  }

  console.log('💾 Creating session in database...');
  console.log('📝 Final session data to save:', JSON.stringify(sessionData, null, 2));
  
  let newSession;
  try {
    newSession = await LiveSession.create(sessionData);
  console.log('✅ Session created successfully with ID:', newSession._id);
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
      success: true
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

    // Transform to match expected format
    const formattedBatches = batches.map(batch => {
      const batchData = {
        _id: batch._id,
        name: batch.batch_name,
        code: batch.batch_code,
        startDate: batch.start_date,
        endDate: batch.end_date,
        enrolledStudents: batch.enrolled_students || 0,
        enrolled_student_ids: batch.enrolled_student_ids || []
      };
      
      // Debug log for batches missing enrolled_student_ids
      if (!batch.enrolled_student_ids || batch.enrolled_student_ids.length === 0) {
        console.log(`⚠️ Batch "${batch.batch_name}" missing enrolled_student_ids but has ${batch.enrolled_students || 0} enrolled students`);
      }
      
      return batchData;
    });

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

// --------------------
// Get Student Latest Session
// --------------------
export const getStudentLatestSession = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  
  console.log('🔍 Fetching latest session for student:', studentId);
  
  if (!studentId) {
    return next(new AppError('Student ID is required', 400));
  }

  try {
    // Validate and convert string ID to ObjectId for MongoDB query
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return next(new AppError('Invalid student ID format', 400));
    }
    const objectIdStudentId = new mongoose.Types.ObjectId(studentId);
    
    // Find the most recent session for this student
    const latestSession = await LiveSession.findOne({
      students: objectIdStudentId
    })
    .sort({ createdAt: -1, updatedAt: -1 })
    .populate('grades', 'name')
    .lean();

    console.log('📊 Latest session found:', latestSession ? 'Yes' : 'No');
    if (latestSession) {
      console.log('📊 Session details:', {
        id: latestSession._id,
        title: latestSession.sessionTitle,
        students: latestSession.students,
        grades: latestSession.grades
      });
    }

    if (!latestSession) {
      return res.status(200).json({
        status: 'success',
        message: 'No sessions found for this student',
        data: null
      });
    }

    // Populate students and instructor data
    const [students, instructor] = await Promise.all([
      populateStudents(latestSession.students),
      populateInstructor(latestSession.instructorId)
    ]);

    // Format the grade field to ensure it's an object
    let formattedGrades = latestSession.grades;
    if (typeof latestSession.grades === 'string') {
      formattedGrades = { name: latestSession.grades };
    } else if (Array.isArray(latestSession.grades) && latestSession.grades.length > 0) {
      // If it's an array, take the first grade and ensure it's an object
      const firstGrade = latestSession.grades[0];
      formattedGrades = typeof firstGrade === 'string' ? { name: firstGrade } : firstGrade;
    }

    const formattedSession = {
      ...latestSession,
      sessionNo: latestSession.originalSessionNo || latestSession.sessionNo,
      students,
      instructorId: instructor,
      grades: formattedGrades
    };

    console.log('✅ Formatted session data prepared');

    res.status(200).json({
      status: 'success',
      data: formattedSession
    });

  } catch (error) {
    console.error('❌ Error fetching student latest session:', error);
    return next(new AppError('Failed to fetch student latest session', 500));
  }
});

