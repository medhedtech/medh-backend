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
import { S3Client, PutObjectCommand, HeadBucketCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.IM_AWS_ACCESS_KEY,
    secretAccessKey: process.env.IM_AWS_SECRET_KEY,
  },
});

// Helper function to populate students from both collections
const populateStudents = async (studentIds) => {
  if (!studentIds || studentIds.length === 0) return [];
  
  const students = [];
  
  // Try to find students in Student collection first
  const studentCollectionStudents = await Student.find({
    _id: { $in: studentIds }
  }).select('_id full_name email grade');
  
  // Find remaining students in User collection
  const foundStudentIds = studentCollectionStudents.map(s => s._id.toString());
  const remainingIds = studentIds.filter(id => !foundStudentIds.includes(id.toString()));
  
  let userCollectionStudents = [];
  if (remainingIds.length > 0) {
    userCollectionStudents = await User.find({
      _id: { $in: remainingIds },
      role: 'student'
    }).select('_id full_name email');
  }
  
  return [...studentCollectionStudents, ...userCollectionStudents];
};

// Helper function to populate instructor from both collections
const populateInstructor = async (instructorId) => {
  if (!instructorId) return null;
  
  // Try to find instructor in Instructor collection first
  let instructor = await Instructor.findById(instructorId)
    .select('_id full_name email domain experience qualifications');
  
  // If not found, try User collection
  if (!instructor) {
    instructor = await User.findOne({
      _id: instructorId,
      role: 'instructor'
    }).select('_id full_name email');
  }
  
  return instructor;
};

// Get students with search and pagination
export const getStudents = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (search) {
    query = {
      $or: [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
  }

  console.log('🔍 Fetching students from Student collection with query:', query);

  try {
    // Primary: Fetch from Student collection
    const [students, total] = await Promise.all([
      Student.find(query)
        .select('_id full_name email grade')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      Student.countDocuments(query)
    ]);

    console.log(`✅ Found ${students.length} students from Student collection`);

    res.status(200).json({
      status: 'success',
      data: {
        items: students,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching students from Student collection:', error);
    console.log('🔄 Falling back to User collection...');
    
    // Fallback: Fetch from User collection with role filter
    let userQuery = { role: 'student' };
    if (search) {
      userQuery = {
        role: 'student',
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const [students, total] = await Promise.all([
      User.find(userQuery)
        .select('_id full_name email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      User.countDocuments(userQuery)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        items: students,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  }
});

// Get all grades (static data)
export const getGrades = catchAsync(async (req, res, next) => {
  const staticGrades = [
    { _id: 'preschool', name: 'Preschool', level: 1 },
    { _id: 'grade-1-2', name: 'Grade 1-2', level: 2 },
    { _id: 'grade-3-5', name: 'Grade 3-5', level: 3 },
    { _id: 'grade-6-8', name: 'Grade 6-8', level: 4 },
    { _id: 'grade-9-10', name: 'Grade 9-10', level: 5 },
    { _id: 'grade-11-12', name: 'Grade 11-12', level: 6 },
    { _id: 'foundation-cert', name: 'Foundation Certificate', level: 7 },
    { _id: 'advance-cert', name: 'Advance Certificate', level: 8 },
    { _id: 'executive-diploma', name: 'Executive Diploma', level: 9 },
    { _id: 'ug-graduate', name: 'UG - Graduate - Professionals', level: 10 }
  ];

  res.status(200).json({
    status: 'success',
    data: staticGrades
  });
});

// Get dashboards (static data)
export const getDashboards = catchAsync(async (req, res, next) => {
  const staticDashboards = [
    {
      _id: 'instructor-dashboard',
      name: 'Instructor Dashboard',
      type: 'instructor',
      description: 'Dashboard for instructors to manage courses and students'
    },
    {
      _id: 'student-dashboard', 
      name: 'Student Dashboard',
      type: 'student',
      description: 'Main dashboard for students to view courses and progress'
    },
    {
      _id: 'admin-dashboard',
      name: 'Admin Dashboard', 
      type: 'admin',
      description: 'Administrative dashboard for system management'
    }
  ];

  res.status(200).json({
    status: 'success',
    data: staticDashboards
  });
});

// Get instructors with search and pagination
export const getInstructors = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (search) {
    query = {
      $or: [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
  }

  console.log('🔍 Fetching instructors from Instructor collection with query:', query);

  try {
    // Primary: Fetch from Instructor collection
    const [instructors, total] = await Promise.all([
      Instructor.find(query)
        .select('_id full_name email domain experience qualifications')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      Instructor.countDocuments(query)
    ]);

    console.log(`✅ Found ${instructors.length} instructors from Instructor collection`);

    res.status(200).json({
      status: 'success',
      data: {
        items: instructors,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching instructors from Instructor collection:', error);
    console.log('🔄 Falling back to User collection...');
    
    // Fallback: Fetch from User collection with role filter
    let userQuery = { role: 'instructor' };
    if (search) {
      userQuery = {
        role: 'instructor',
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const [instructors, total] = await Promise.all([
      User.find(userQuery)
        .select('_id full_name email avatar')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ full_name: 1 }),
      User.countDocuments(userQuery)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        items: instructors,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  }
});

// Generate S3 presigned URL for video upload
export const generateUploadUrl = catchAsync(async (req, res, next) => {
  const { batchObjectId, studentName, fileName, fileType } = req.body;

  console.log('🔍 generateUploadUrl called with:', { batchObjectId, studentName, fileName, fileType });

  // Validate required parameters
  if (!batchObjectId || !studentName || !fileName) {
    console.error('❌ Missing required parameters:', { batchObjectId, studentName, fileName });
    return next(new AppError('Missing required parameters: batchObjectId, studentName, fileName', 400));
  }

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/mov', 'video/webm'];
  if (fileType && !allowedTypes.includes(fileType)) {
    console.error('❌ Invalid file type:', fileType);
    return next(new AppError('Invalid file type. Only MP4, MOV, and WebM files are allowed', 400));
  }

  try {
    // Create S3 key with folder structure: {batchObjectId}/{studentName}/{filename}
    const key = `${batchObjectId}/${studentName}/${fileName}`;
    console.log('🔑 S3 Key:', key);

    // Check AWS configuration
    console.log('🔧 AWS Config:', {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET_NAME,
          hasAccessKey: !!process.env.IM_AWS_ACCESS_KEY,
    hasSecretKey: !!process.env.IM_AWS_SECRET_KEY
    });

    // Create the command for S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'medh-video-uploads',
      Key: key,
      ContentType: fileType || 'video/mp4',
    });

    console.log('📤 S3 Command created, generating presigned URL...');

    // Generate presigned URL (valid for 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    console.log('✅ Presigned URL generated successfully');

    res.status(200).json({
      status: 'success',
      data: {
        uploadUrl,
        filePath: key,
        fileName,
        expiresIn: 300
      }
    });
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return next(new AppError(`Failed to generate upload URL: ${error.message}`, 500));
  }
});

// Upload file (legacy function for backward compatibility)
export const uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/mov', 'video/webm'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return next(new AppError('Invalid file type. Only MP4, MOV, and WebM files are allowed', 400));
  }

  // Validate file size (1GB)
  const maxSize = 1024 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return next(new AppError('File size too large. Maximum size is 1GB', 400));
  }

  // For now, return a mock response since Cloudinary is not configured
  res.status(200).json({
    status: 'success',
    data: {
      fileId: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `https://example.com/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size
    }
  });
});

// Upload multiple videos to S3 with batch and student organization
export const uploadVideos = catchAsync(async (req, res, next) => {
  console.log('🔍 uploadVideos called with files:', req.files?.length || 0);
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Environment variables check:');
  console.log('  - AWS_REGION:', process.env.AWS_REGION);
      console.log('  - IM_AWS_ACCESS_KEY:', process.env.IM_AWS_ACCESS_KEY ? 'SET' : 'NOT SET');
    console.log('  - IM_AWS_SECRET_KEY:', process.env.IM_AWS_SECRET_KEY ? 'SET' : 'NOT SET');
  console.log('  - AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
  
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No video files uploaded', 400));
  }

  // Get student IDs and batch ID from request body
  const { studentIds, batchId } = req.body;
  console.log('👥 Student IDs from request:', studentIds);
  console.log('📦 Batch ID from request:', batchId);

  // Validate student IDs
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return next(new AppError('Student IDs are required', 400));
  }

  // Find batch information for each student
  let batchInfo = null;
  let studentBatchMapping = {};

  try {
    const Batch = mongoose.model('Batch');
    const Enrollment = mongoose.model('Enrollment');

    // If batch ID is provided, validate it
    if (batchId) {
      batchInfo = await Batch.findById(batchId).select('_id batch_name batch_code course');
      if (!batchInfo) {
        return next(new AppError('Invalid batch ID provided', 400));
      }
      console.log('✅ Batch found:', {
        id: batchInfo._id,
        name: batchInfo.batch_name,
        code: batchInfo.batch_code
      });
    }

      // If batch ID is provided, use it directly for all students
  if (batchId && batchInfo) {
    console.log('📚 Using provided batch ID for all students:', batchInfo._id);
    
    // Create student-batch mapping using the provided batch ID
    for (const studentId of studentIds) {
      studentBatchMapping[studentId] = {
        batchId: batchInfo._id,
        batchName: batchInfo.batch_name,
        batchCode: batchInfo.batch_code
      };
    }
  } else {
    // Fallback: Find enrollments for all students to get their batch information
    const enrollments = await Enrollment.find({
      student: { $in: studentIds }
    }).populate('batch', '_id batch_name batch_code');

    console.log('📚 Found enrollments:', enrollments.length);

    // Create student-batch mapping
    for (const enrollment of enrollments) {
      if (enrollment.batch) {
        studentBatchMapping[enrollment.student.toString()] = {
          batchId: enrollment.batch._id,
          batchName: enrollment.batch.batch_name,
          batchCode: enrollment.batch.batch_code
        };
      }
    }
  }

    console.log('🗺️ Student-Batch Mapping:', studentBatchMapping);

  } catch (error) {
    console.error('❌ Error finding student-batch relationships:', error);
    return next(new AppError('Error finding student-batch relationships', 500));
  }

  // Validate files
  const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/avi', 'video/mkv'];
  const maxSize = 500 * 1024 * 1024; // 500MB per file
  
  const invalidFiles = req.files.filter(file => {
    if (!allowedTypes.includes(file.mimetype)) {
      return true;
    }
    if (file.size > maxSize) {
      return true;
    }
    return false;
  });

  if (invalidFiles.length > 0) {
    return next(new AppError(`Invalid files detected. Only MP4, MOV, WebM, AVI, MKV files up to 500MB are allowed`, 400));
  }

  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.IM_AWS_ACCESS_KEY,
        secretAccessKey: process.env.IM_AWS_SECRET_KEY,
      },
    });

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return next(new AppError('S3 bucket name not configured', 500));
    }

    const uploadedVideos = [];

    // Upload each file to S3
    for (const file of req.files) {
      console.log(`📁 Processing file: ${file.originalname} (${file.size} bytes)`);
      
      const fileExtension = file.originalname.split('.').pop();
      
      // Generate S3 key based on student-batch mapping
      let s3Key;
      let studentInfo = null;
      let batchInfoForUpload = null;

      // For each student, create a separate upload
      for (const studentId of studentIds) {
        const studentBatchInfo = studentBatchMapping[studentId];
        
        if (studentBatchInfo && studentBatchInfo.batchId) {
          // Student has a batch: videos/{batchObjectId}/{studentId}/{timestamp}-{random}.{extension}
          const batchObjectId = studentBatchInfo.batchId.toString(); // Ensure it's a string
          s3Key = `videos/${batchObjectId}/${studentId}/${Date.now()}-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
          studentInfo = { id: studentId, batchInfo: studentBatchInfo };
          batchInfoForUpload = studentBatchInfo;
          console.log(`📝 Generated S3 key for student ${studentId} in batch ${batchObjectId}: ${s3Key}`);
        } else {
          // Student not enrolled in any batch: videos/no-batch/{studentId}/{timestamp}-{random}.{extension}
          s3Key = `videos/no-batch/${studentId}/${Date.now()}-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
          studentInfo = { id: studentId, batchInfo: null };
          batchInfoForUpload = null;
          console.log(`📝 Generated S3 key for student ${studentId} (no batch): ${s3Key}`);
        }
        
        const uploadParams = {
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            studentId: studentId,
            batchId: batchInfoForUpload?.batchId?.toString() || 'no-batch',
            batchName: batchInfoForUpload?.batchName || 'no-batch-name',
            batchCode: batchInfoForUpload?.batchCode || 'no-batch-code'
          },
        };

              console.log(`🚀 Uploading to S3 bucket: ${bucketName}`);
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        const videoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
        
        uploadedVideos.push({
          fileId: s3Key,
          name: file.originalname,
          size: file.size,
          url: videoUrl,
          type: file.mimetype,
          uploadedAt: new Date().toISOString(),
          studentId: studentId,
          studentName: studentInfo?.id || null,
          batchId: batchInfoForUpload?.batchId?.toString() || null,
          batchName: batchInfoForUpload?.batchName || null,
          batchCode: batchInfoForUpload?.batchCode || null,
          s3Path: s3Key
        });

        console.log(`✅ Successfully uploaded video for student ${studentId}: ${file.originalname} -> ${s3Key}`);
        console.log(`🔗 Video URL: ${videoUrl}`);
        console.log(`📁 S3 Path: ${s3Key}`);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      data: {
        videos: uploadedVideos,
        totalSize: uploadedVideos.reduce((sum, video) => sum + video.size, 0),
        studentBatchMapping: studentBatchMapping,
        batchInfo: batchInfo ? {
          id: batchInfo._id,
          name: batchInfo.batch_name,
          code: batchInfo.batch_code
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error uploading videos to S3:', error);
    return next(new AppError('Failed to upload videos to S3', 500));
  }
});

// Create new live session
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

  // Validate required fields (video is now optional)
  if (!sessionTitle || !sessionNo || !students.length || !grades.length || !dashboard || !instructorId || !date) {
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

  // TEMPORARILY DISABLED: Check if session number already exists for the same course category
  console.log('🔍 Checking for existing session with sessionNo:', sessionNo);
  console.log('🔍 Session number type:', typeof sessionNo);
  console.log('🔍 Session number length:', sessionNo?.length);
  
  const existingSession = await LiveSession.findOne({ sessionNo });
  console.log('🔍 Existing session found:', existingSession);
  
  // TEMPORARILY DISABLED: Session number uniqueness check
  // if (existingSession) {
  //   console.error('❌ Session number already exists:', sessionNo);
  //   return next(new AppError('Session number already exists', 409));
  // }
  
  console.log('✅ Session number uniqueness check temporarily disabled');

  // Create new session with unique session number for database but display original
  const uniqueSessionNo = `${sessionNo}-${Date.now()}`;
  console.log('🔧 Generated unique session number for database:', uniqueSessionNo);
  console.log('📝 Original session number for display:', sessionNo);
  
  const sessionData = {
    sessionTitle,
    sessionNo: uniqueSessionNo, // Store unique in database
    originalSessionNo: sessionNo, // Store original for display
    students,
    grades,
    dashboard,
    instructorId,
    video: video || { fileId: 'no-video', name: 'No video uploaded', size: 0, url: '#' },
    date,
    remarks,
    summary,
    courseCategory, // Add course category
    status: 'scheduled'
  };

  console.log('📝 Session data to create:', sessionData);

  // Only add createdBy if user exists
  if (req.user?.id) {
    sessionData.createdBy = req.user.id;
    console.log('👤 Added createdBy:', req.user.id);
  }

  console.log('💾 Creating session in database...');
  const newSession = await LiveSession.create(sessionData);
  console.log('✅ Session created successfully with ID:', newSession._id);

  res.status(201).json({
    status: 'success',
    data: {
      sessionId: newSession._id,
      sessionNo: sessionNo, // Return original session number for display
      success: true
    }
  });
});

// Get latest session (most recently created/updated)
export const getPreviousSession = catchAsync(async (req, res, next) => {
  const { courseCategory } = req.query;

  // Build query - if courseCategory is provided, filter by it, otherwise get the latest session regardless
  let query = {};
  if (courseCategory) {
    query.courseCategory = courseCategory;
  }

  // Get the latest session regardless of status, sorted by updatedAt (most recent first)
  const latestSession = await LiveSession.findOne(query)
  .sort({ updatedAt: -1, createdAt: -1 }) // Sort by updatedAt first, then createdAt
  .populate('grades', 'name');

  if (!latestSession) {
    return res.status(200).json({
      status: 'success',
      data: null
    });
  }

  // Manually populate students and instructor using helper functions
  const [students, instructor] = await Promise.all([
    populateStudents(latestSession.students),
    populateInstructor(latestSession.instructorId)
  ]);

  // Create response object with populated data
  const sessionWithPopulatedData = {
    ...latestSession.toObject(),
    sessionNo: latestSession.originalSessionNo || latestSession.sessionNo, // Use original for display
    students,
    instructorId: instructor
  };

  res.status(200).json({
    status: 'success',
    data: sessionWithPopulatedData
  });
});

// Get all sessions for a course category
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

  // Manually populate students and instructors for all sessions
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

// Get session by ID
export const getSession = catchAsync(async (req, res, next) => {
  console.log('🔍 Fetching session with ID:', req.params.id);
  
  const session = await LiveSession.findById(req.params.id)
    .populate('grades', 'name');

  if (!session) {
    console.log('❌ Session not found');
    return next(new AppError('Session not found', 404));
  }

  console.log('📋 Session found:', {
    id: session._id,
    title: session.sessionTitle,
    students: session.students,
    instructorId: session.instructorId
  });

  // Manually populate students and instructor using helper functions
  const [students, instructor] = await Promise.all([
    populateStudents(session.students),
    populateInstructor(session.instructorId)
  ]);

  console.log('👥 Populated students:', students);
  console.log('👨‍🏫 Populated instructor:', instructor);

  // Create response object with populated data
  const sessionWithPopulatedData = {
    ...session.toObject(),
    students,
    instructorId: instructor
  };

  console.log('✅ Sending session data:', {
    students: sessionWithPopulatedData.students,
    instructorId: sessionWithPopulatedData.instructorId
  });

  res.status(200).json({
    status: 'success',
    data: sessionWithPopulatedData
  });
});

// Update session
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
    data: {
      success: true
    }
  });
});

// Delete session
export const deleteSession = catchAsync(async (req, res, next) => {
  const session = await LiveSession.findByIdAndDelete(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      success: true
    }
  });
});

// Get course statistics
export const getCourseStats = catchAsync(async (req, res, next) => {
  const { category } = req.params;

  const [
    totalBatches,
    totalStudents,
    upcomingSessions,
    recentSessions,
    courseRating
  ] = await Promise.all([
    // Count batches for this course category
    Course.countDocuments({ category }),
    
    // Count students enrolled in this course category
    Student.countDocuments({ enrolledCourses: { $in: [category] } }),
    
    // Count upcoming sessions
    LiveSession.countDocuments({
      courseCategory: category,
      status: 'scheduled',
      date: { $gte: new Date() }
    }),
    
    // Get recent sessions
    LiveSession.find({ courseCategory: category })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('students', 'full_name')
      .populate('instructorId', 'full_name'),
    
    // Get course rating (mock for now)
    Promise.resolve(4.8)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalBatches,
      totalStudents,
      upcomingSessions,
      courseRating,
      recentSessions
    }
  });
});

// Get course categories
export const getCourseCategories = catchAsync(async (req, res, next) => {
  // Mock data for now - replace with actual database queries
  const categories = [
    {
      id: "ai-data-science",
      name: "AI and Data Science",
      icon: "robot",
      description: "Master artificial intelligence, machine learning, and data analytics",
      totalBatches: 12,
      totalStudents: 156,
      upcomingSessions: 8,
      courseRating: 4.8,
      features: [
        "Live Interactive Sessions",
        "Voice & Chat Support",
        "Certification",
        "Project-Based Learning",
        "24/7 Support",
        "Career Guidance"
      ],
      color: "from-blue-500 to-purple-600"
    },
    {
      id: "web-development",
      name: "Web Development",
      icon: "code",
      description: "Learn modern web development with React, Node.js, and more",
      totalBatches: 8,
      totalStudents: 98,
      upcomingSessions: 5,
      courseRating: 4.7,
      features: [
        "Live Interactive Sessions",
        "Voice & Chat Support",
        "Certification",
        "Project-Based Learning",
        "24/7 Support",
        "Career Guidance"
      ],
      color: "from-green-500 to-teal-600"
    },
    {
      id: "business-analytics",
      name: "Business Analytics",
      icon: "chart-line",
      description: "Transform data into business insights and strategic decisions",
      totalBatches: 6,
      totalStudents: 72,
      upcomingSessions: 3,
      courseRating: 4.6,
      features: [
        "Live Interactive Sessions",
        "Voice & Chat Support",
        "Certification",
        "Project-Based Learning",
        "24/7 Support",
        "Career Guidance"
      ],
      color: "from-orange-500 to-red-600"
    }
  ];
  
  res.status(200).json({
    status: 'success',
    data: categories
  });
});

// Get student batch information
export const getStudentBatchInfo = catchAsync(async (req, res, next) => {
  const { studentIds } = req.query;
  
  if (!studentIds) {
    return next(new AppError('Student IDs are required', 400));
  }

  try {
    const studentIdArray = Array.isArray(studentIds) ? studentIds : [studentIds];
    const Enrollment = mongoose.model('Enrollment');
    const Batch = mongoose.model('Batch');

    // Find enrollments for all students
    const enrollments = await Enrollment.find({
      student: { $in: studentIdArray }
    }).populate('batch', '_id batch_name batch_code course');

    // Create student-batch mapping
    const studentBatchMapping = {};
    for (const enrollment of enrollments) {
      if (enrollment.batch) {
        studentBatchMapping[enrollment.student.toString()] = {
          batchId: enrollment.batch._id,
          batchName: enrollment.batch.batch_name,
          batchCode: enrollment.batch.batch_code,
          courseId: enrollment.batch.course
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        studentBatchMapping,
        totalStudents: studentIdArray.length,
        studentsWithBatches: Object.keys(studentBatchMapping).length
      }
    });

  } catch (error) {
    console.error('❌ Error getting student batch info:', error);
    return next(new AppError('Error getting student batch information', 500));
  }
});

// Test S3 connection and credentials
export const testS3Connection = catchAsync(async (req, res, next) => {
  try {
    console.log('🧪 Testing S3 connection...');
    
    // Test S3 client creation
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.IM_AWS_ACCESS_KEY,
        secretAccessKey: process.env.IM_AWS_SECRET_KEY,
      },
    });

    // Test bucket access
    const headBucketCommand = new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
    });

    await s3Client.send(headBucketCommand);
    
    console.log('✅ S3 connection test successful');
    
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
    console.error('❌ S3 connection test failed:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'S3 connection test failed',
      error: error.message,
      data: {
        bucketName: process.env.AWS_S3_BUCKET_NAME,
        region: process.env.AWS_REGION,
        accessStatus: 'failed',
        error: error.message
      }
    });
  }
});

// Verify uploaded videos in S3
export const verifyS3Videos = catchAsync(async (req, res, next) => {
  try {
    const { videos } = req.body;
    
    if (!videos || !Array.isArray(videos)) {
      return res.status(400).json({
        status: 'error',
        message: 'Videos array is required'
      });
    }

    console.log('🔍 Verifying videos in S3:', videos.length, 'videos');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.IM_AWS_ACCESS_KEY,
        secretAccessKey: process.env.IM_AWS_SECRET_KEY,
      },
    });

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
  } catch (error) {
    console.error('❌ Video verification failed:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Video verification failed',
      error: error.message
    });
  }
});

// Test batch and student organization
export const testBatchStudentOrg = catchAsync(async (req, res, next) => {
  try {
    console.log('🧪 Testing batch and student organization...');
    
    // Get test students
    const students = await Student.find({})
      .select('_id full_name email')
      .limit(5);
    
    // Get test batches
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
