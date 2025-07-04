import moment from 'moment-timezone';
import mongoose from 'mongoose';

import DemoBooking from '../models/demo-booking.model.js';
import User from '../models/user-modal.js';
import { AppError } from '../utils/errorHandler.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../utils/logger.js';
import zoomService from '../services/zoomService.js';

/**
 * Create a new demo booking
 * @route POST /api/demo-booking
 * @access Private/Public (flexible based on authentication)
 */
export const createDemoBooking = catchAsync(async (req, res) => {
  const {
    userId,
    email,
    fullName,
    phoneNumber,
    timeSlot,
    timezone,
    demoType,
    courseInterest,
    experienceLevel,
    companyName,
    jobTitle,
    requirements,
    notes,
    source,
    utmParameters,
    ipAddress,
    userAgent,
    autoGenerateZoomMeeting = true,
    zoomMeetingSettings = {},
    // Enhanced student details
    age,
    gender,
    dateOfBirth,
    educationLevel,
    fieldOfStudy,
    currentOccupation,
    studentStatus, // 'student', 'working_professional', 'job_seeker', 'entrepreneur', 'other'
    programmingExperience,
    preferredLearningStyle, // 'visual', 'auditory', 'hands_on', 'reading', 'mixed'
    learningGoals,
    careerObjectives,
    currentSkills,
    interestedTechnologies,
    availableTimePerWeek, // Hours available for learning
    preferredContactMethod, // 'email', 'phone', 'whatsapp', 'telegram'
    socialMediaProfiles,
    howDidYouHearAboutUs,
    referralCode,
    emergencyContact,
    specialRequirements, // Accessibility, language preferences, etc.
    budgetRange,
    timelineExpectations,
    hasLaptop,
    internetSpeed,
    previousOnlineLearningExperience
  } = req.body;

  try {
    // Business Rule: Enforce minimum 1-day advance booking
    const requestedDateTime = new Date(timeSlot);
    const currentTime = new Date();
    const tomorrowStart = new Date(currentTime);
    tomorrowStart.setDate(currentTime.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    if (requestedDateTime < tomorrowStart) {
      return res.status(400).json({
        success: false,
        message: 'Demo bookings must be scheduled at least 1 day in advance. Please select a slot from tomorrow onwards.',
        error_code: 'INVALID_BOOKING_DATE',
        data: {
          requested_date: requestedDateTime.toISOString(),
          minimum_date: tomorrowStart.toISOString(),
          current_date: currentTime.toISOString()
        }
      });
    }

    // If user is authenticated, use their ID, otherwise use provided userId or create guest booking
    let finalUserId = null;
    let userDetails = null;
    
    if (req.user && req.user.id) {
      finalUserId = req.user.id;
      userDetails = await User.findById(finalUserId).select('full_name email');
    } else if (userId) {
      // Verify the provided userId exists
      userDetails = await User.findById(userId).select('full_name email');
      if (userDetails) {
        finalUserId = userId;
      }
    }

    // Validate timezone
    const supportedTimezones = [
      'UTC',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'America/Mexico_City',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
      'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Zurich', 'Europe/Vienna',
      'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
      'Asia/Hong_Kong', 'Asia/Seoul', 'Asia/Bangkok', 'Asia/Jakarta',
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
      'Pacific/Auckland', 'Pacific/Honolulu',
      'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg'
    ];

    // Validate and process enhanced student details
    const validationErrors = [];
    
    // Timezone validation
    if (timezone && !supportedTimezones.includes(timezone)) {
      validationErrors.push({ 
        field: 'timezone', 
        message: 'Unsupported timezone. Please select from the supported timezone list.',
        supportedTimezones: supportedTimezones
      });
    }
    
    // Age validation
    if (age && (isNaN(parseInt(age)) || parseInt(age) < 13 || parseInt(age) > 100)) {
      validationErrors.push({ field: 'age', message: 'Age must be between 13 and 100' });
    }
    
    // Gender validation
    const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'];
    if (gender && !validGenders.includes(gender.toLowerCase())) {
      validationErrors.push({ field: 'gender', message: 'Invalid gender option' });
    }
    
    // Education level validation
    const validEducationLevels = ['high-school', 'diploma', 'undergraduate', 'graduate', 'postgraduate', 'phd', 'other'];
    if (educationLevel && !validEducationLevels.includes(educationLevel.toLowerCase())) {
      validationErrors.push({ field: 'educationLevel', message: 'Invalid education level' });
    }
    
    // Student status validation
    const validStudentStatuses = ['student', 'working-professional', 'job-seeker', 'entrepreneur', 'freelancer', 'other'];
    if (studentStatus && !validStudentStatuses.includes(studentStatus.toLowerCase())) {
      validationErrors.push({ field: 'studentStatus', message: 'Invalid student status' });
    }
    
    // Programming experience validation
    const validExperienceLevels = ['beginner', 'basic', 'intermediate', 'advanced', 'expert'];
    if (programmingExperience && !validExperienceLevels.includes(programmingExperience.toLowerCase())) {
      validationErrors.push({ field: 'programmingExperience', message: 'Invalid programming experience level' });
    }
    
    // Learning style validation
    const validLearningStyles = ['visual', 'auditory', 'hands-on', 'reading', 'mixed'];
    if (preferredLearningStyle && !validLearningStyles.includes(preferredLearningStyle.toLowerCase())) {
      validationErrors.push({ field: 'preferredLearningStyle', message: 'Invalid learning style' });
    }
    
    // Contact method validation
    const validContactMethods = ['email', 'phone', 'whatsapp', 'telegram', 'discord'];
    if (preferredContactMethod && !validContactMethods.includes(preferredContactMethod.toLowerCase())) {
      validationErrors.push({ field: 'preferredContactMethod', message: 'Invalid contact method' });
    }
    
    // Available time validation
    if (availableTimePerWeek && (isNaN(parseInt(availableTimePerWeek)) || parseInt(availableTimePerWeek) < 1 || parseInt(availableTimePerWeek) > 168)) {
      validationErrors.push({ field: 'availableTimePerWeek', message: 'Available time per week must be between 1 and 168 hours' });
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Student details validation failed',
        error_code: 'STUDENT_DETAILS_VALIDATION_ERROR',
        errors: validationErrors
      });
    }

    const studentDetails = {
      personalInfo: {
        age: age ? parseInt(age) : null,
        gender: gender ? gender.toLowerCase() : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
      },
      academicInfo: {
        educationLevel: educationLevel ? educationLevel.toLowerCase() : null,
        fieldOfStudy,
        currentOccupation,
        studentStatus: studentStatus ? studentStatus.toLowerCase() : 'other'
      },
      technicalInfo: {
        programmingExperience: programmingExperience ? programmingExperience.toLowerCase() : 'beginner',
        currentSkills: Array.isArray(currentSkills) ? currentSkills : (currentSkills ? [currentSkills] : []),
        interestedTechnologies: Array.isArray(interestedTechnologies) ? interestedTechnologies : (interestedTechnologies ? [interestedTechnologies] : []),
        hasLaptop: hasLaptop !== undefined ? Boolean(hasLaptop) : null,
        internetSpeed,
        previousOnlineLearningExperience: previousOnlineLearningExperience ? previousOnlineLearningExperience.toLowerCase() : 'none'
      },
      learningPreferences: {
        preferredLearningStyle: preferredLearningStyle ? preferredLearningStyle.toLowerCase() : 'mixed',
        learningGoals: Array.isArray(learningGoals) ? learningGoals : (learningGoals ? [learningGoals] : []),
        careerObjectives,
        availableTimePerWeek: availableTimePerWeek ? parseInt(availableTimePerWeek) : null,
        timelineExpectations,
        budgetRange
      },
      contactInfo: {
        preferredContactMethod: preferredContactMethod ? preferredContactMethod.toLowerCase() : 'email',
        socialMediaProfiles: socialMediaProfiles || {},
        emergencyContact: emergencyContact || {}
      },
      additionalInfo: {
        howDidYouHearAboutUs,
        referralCode,
        specialRequirements
      }
    };

    // Process timezone and time information
    const userTimezone = timezone || 'UTC';
    const scheduledDateTime = new Date(timeSlot);
    const userTimezoneMoment = moment.tz(scheduledDateTime, userTimezone);

    // Create booking data
    const bookingData = {
      userId: finalUserId,
      email: email.toLowerCase(),
      fullName: fullName || userDetails?.full_name || fullName,
      phoneNumber,
      timeSlot,
      scheduledDateTime: scheduledDateTime,
      timezone: userTimezone,
      // Enhanced time information
      timeInfo: {
        originalTimeSlot: timeSlot,
        userTimezone: userTimezone,
        userLocalTime: userTimezoneMoment.format('YYYY-MM-DD HH:mm:ss'),
        userDisplayTime: userTimezoneMoment.format('MMMM Do, YYYY [at] h:mm A'),
        utcTime: moment.utc(scheduledDateTime).format('YYYY-MM-DD HH:mm:ss'),
        timezoneName: userTimezoneMoment.format('z'), // e.g., "EST", "PST"
        timezoneOffset: userTimezoneMoment.format('Z') // e.g., "-05:00"
      },
      demoType: demoType || 'course_demo',
      courseInterest,
      experienceLevel,
      companyName,
      jobTitle,
      requirements,
      notes,
      source: source || 'website',
      utmParameters,
      ipAddress,
      userAgent,
      status: 'pending', // Default status
      autoGenerateZoomMeeting,
      zoomMeetingSettings,
      // Enhanced student details
      studentDetails
    };

    // Create the demo booking
    const demoBooking = new DemoBooking(bookingData);
    await demoBooking.save();

    // Auto-generate Zoom meeting if enabled
    if (autoGenerateZoomMeeting) {
      try {
        logger.info('Creating Zoom meeting for demo booking', {
          bookingId: demoBooking._id,
          scheduledDateTime: demoBooking.scheduledDateTime
        });

        // Prepare Zoom meeting data using the model method
        const zoomMeetingData = demoBooking.prepareZoomMeetingData();
        
        // Create the Zoom meeting using the classroom meeting method for better features
        const zoomMeeting = await zoomService.createClassroomMeeting('me', zoomMeetingData);
        
        // Store the Zoom meeting details in the booking
        demoBooking.storeZoomMeetingDetails(zoomMeeting);
        await demoBooking.save();

        logger.info('Zoom meeting created successfully for demo booking', {
          bookingId: demoBooking._id,
          zoomMeetingId: zoomMeeting.id,
          joinUrl: zoomMeeting.join_url
        });

      } catch (zoomError) {
        logger.error('Failed to create Zoom meeting for demo booking', {
          bookingId: demoBooking._id,
          error: zoomError.message,
          stack: zoomError.stack
        });

        // Store the error but don't fail the booking creation
        demoBooking.handleZoomMeetingError(zoomError);
        await demoBooking.save();
      }
    }

    // Populate user details for response
    await demoBooking.populate('userId', 'full_name email');

    logger.info('Demo booking created successfully', {
      bookingId: demoBooking._id,
      userId: finalUserId,
      email: email,
      scheduledDateTime: demoBooking.scheduledDateTime,
      demoType: demoBooking.demoType
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Demo booking created successfully',
      data: {
        booking: {
          id: demoBooking._id,
          userId: demoBooking.userId,
          email: demoBooking.email,
          fullName: demoBooking.fullName,
          phoneNumber: demoBooking.phoneNumber,
          scheduledDateTime: demoBooking.scheduledDateTime,
          timezone: demoBooking.timezone,
          // Enhanced time information
          timeInfo: demoBooking.timeInfo || {
            userTimezone: demoBooking.timezone,
            userDisplayTime: moment.tz(demoBooking.scheduledDateTime, demoBooking.timezone).format('MMMM Do, YYYY [at] h:mm A'),
            timezoneName: moment.tz(demoBooking.scheduledDateTime, demoBooking.timezone).format('z'),
            timezoneOffset: moment.tz(demoBooking.scheduledDateTime, demoBooking.timezone).format('Z')
          },
          status: demoBooking.status,
          demoType: demoBooking.demoType,
          courseInterest: demoBooking.courseInterest,
          experienceLevel: demoBooking.experienceLevel,
          companyName: demoBooking.companyName,
          jobTitle: demoBooking.jobTitle,
          requirements: demoBooking.requirements,
          notes: demoBooking.notes,
          canReschedule: demoBooking.canReschedule,
          canCancel: demoBooking.canCancel,
          isUpcoming: demoBooking.isUpcoming,
          createdAt: demoBooking.createdAt,
          updatedAt: demoBooking.updatedAt,
          // Enhanced student details
          studentDetails: demoBooking.studentDetails,
          // Zoom meeting details
          meetingLink: demoBooking.meetingLink,
          meetingId: demoBooking.meetingId,
          meetingPassword: demoBooking.meetingPassword,
          zoomMeeting: demoBooking.zoomMeeting ? {
            id: demoBooking.zoomMeeting.id,
            topic: demoBooking.zoomMeeting.topic,
            start_time: demoBooking.zoomMeeting.start_time,
            duration: demoBooking.zoomMeeting.duration,
            timezone: demoBooking.zoomMeeting.timezone,
            agenda: demoBooking.zoomMeeting.agenda,
            join_url: demoBooking.zoomMeeting.join_url,
            password: demoBooking.zoomMeeting.password,
            isZoomMeetingCreated: demoBooking.zoomMeeting.isZoomMeetingCreated,
            zoomMeetingCreatedAt: demoBooking.zoomMeeting.zoomMeetingCreatedAt,
            zoomMeetingError: demoBooking.zoomMeeting.zoomMeetingError,
            settings: {
              auto_recording: demoBooking.zoomMeeting.settings?.auto_recording,
              waiting_room: demoBooking.zoomMeeting.settings?.waiting_room,
              host_video: demoBooking.zoomMeeting.settings?.host_video,
              participant_video: demoBooking.zoomMeeting.settings?.participant_video,
              mute_upon_entry: demoBooking.zoomMeeting.settings?.mute_upon_entry,
            }
          } : null,
          autoGenerateZoomMeeting: demoBooking.autoGenerateZoomMeeting
        }
      }
    });

  } catch (error) {
    logger.error('Error creating demo booking', {
      error: error.message,
      stack: error.stack,
      requestData: { email, timeSlot, demoType }
    });

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    throw new AppError('Failed to create demo booking', 500);
  }
});

/**
 * Get user bookings
 * @route GET /api/demo-booking
 * @access Private
 */
export const getUserBookings = catchAsync(async (req, res) => {
  const {
    userId,
    status,
    page = 1,
    limit = 10,
    startDate,
    endDate
  } = req.query;

  try {
    // Determine which user's bookings to fetch
    let targetUserId = userId;
    if (req.user && req.user.id && !userId) {
      targetUserId = req.user.id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        error_code: 'MISSING_USER_ID'
      });
    }

    // Build query
    const query = {
      userId: targetUserId,
      isActive: true
    };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.scheduledDateTime = {};
      if (startDate) {
        query.scheduledDateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.scheduledDateTime.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Fetch bookings with pagination
    const [bookings, total] = await Promise.all([
      DemoBooking.find(query)
        .sort({ scheduledDateTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('instructorId', 'full_name email')
        .lean(),
      DemoBooking.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Enhance bookings with virtual properties
    const enhancedBookings = bookings.map(booking => {
      const now = new Date();
      const scheduledTime = new Date(booking.scheduledDateTime);
      const hoursUntilDemo = (scheduledTime - now) / (1000 * 60 * 60);
      
      return {
        ...booking,
        isUpcoming: scheduledTime > now && ['confirmed', 'rescheduled'].includes(booking.status),
        canReschedule: hoursUntilDemo > 24 && 
                       ['confirmed', 'pending'].includes(booking.status) &&
                       booking.rescheduleHistory.length < 3,
        canCancel: hoursUntilDemo > 2 && 
                   ['confirmed', 'pending', 'rescheduled'].includes(booking.status)
      };
    });

    logger.info('User bookings retrieved successfully', {
      userId: targetUserId,
      totalBookings: total,
      page: parseInt(page),
      status: status
    });

    res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings: enhancedBookings,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: limitNum,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving user bookings', {
      error: error.message,
      stack: error.stack,
      userId: userId || req.user?.id
    });

    throw new AppError('Failed to retrieve bookings', 500);
  }
});

/**
 * Update a demo booking (cancel, reschedule, etc.)
 * @route PUT /api/demo-booking
 * @access Private
 */
export const updateDemoBooking = catchAsync(async (req, res) => {
  const {
    bookingId,
    action,
    newTimeSlot,
    reason,
    rating,
    feedback,
    completionNotes
  } = req.body;

  try {
    // Find the booking
    const booking = await DemoBooking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        error_code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check if user has permission to update this booking
    if (req.user && req.user.id && booking.userId && booking.userId.toString() !== req.user.id) {
      // Check if user is admin or instructor
      const userRole = req.user.role;
      if (!['admin', 'instructor'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this booking',
          error_code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    let updatedBooking;
    let successMessage;

    switch (action) {
      case 'cancel':
        if (!booking.canCancel) {
          return res.status(400).json({
            success: false,
            message: 'This booking cannot be cancelled',
            error_code: 'CANNOT_CANCEL_BOOKING'
          });
        }
        
        booking.cancel(reason);
        await booking.save();
        updatedBooking = booking;
        successMessage = 'Booking cancelled successfully';
        break;

      case 'reschedule':
        if (!booking.canReschedule) {
          return res.status(400).json({
            success: false,
            message: 'This booking cannot be rescheduled',
            error_code: 'CANNOT_RESCHEDULE_BOOKING'
          });
        }
        
        if (!newTimeSlot) {
          return res.status(400).json({
            success: false,
            message: 'New time slot is required for rescheduling',
            error_code: 'MISSING_NEW_TIME_SLOT'
          });
        }
        
        booking.reschedule(newTimeSlot, reason, 'user');
        await booking.save();
        updatedBooking = booking;
        successMessage = 'Booking rescheduled successfully';
        break;

      case 'confirm':
        if (booking.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Only pending bookings can be confirmed',
            error_code: 'INVALID_STATUS_FOR_CONFIRMATION'
          });
        }
        
        booking.status = 'confirmed';
        await booking.save();
        updatedBooking = booking;
        successMessage = 'Booking confirmed successfully';
        break;

      case 'complete':
        if (!['confirmed', 'rescheduled'].includes(booking.status)) {
          return res.status(400).json({
            success: false,
            message: 'Only confirmed or rescheduled bookings can be marked as completed',
            error_code: 'INVALID_STATUS_FOR_COMPLETION'
          });
        }
        
        booking.markCompleted(completionNotes, rating, feedback);
        await booking.save();
        updatedBooking = booking;
        successMessage = 'Booking marked as completed successfully';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action specified',
          error_code: 'INVALID_ACTION'
        });
    }

    // Populate instructor details
    await updatedBooking.populate('instructorId', 'full_name email');

    logger.info('Demo booking updated successfully', {
      bookingId: booking._id,
      action: action,
      userId: req.user?.id,
      newStatus: updatedBooking.status
    });

    res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        booking: {
          id: updatedBooking._id,
          userId: updatedBooking.userId,
          email: updatedBooking.email,
          fullName: updatedBooking.fullName,
          scheduledDateTime: updatedBooking.scheduledDateTime,
          timezone: updatedBooking.timezone,
          status: updatedBooking.status,
          demoType: updatedBooking.demoType,
          courseInterest: updatedBooking.courseInterest,
          canReschedule: updatedBooking.canReschedule,
          canCancel: updatedBooking.canCancel,
          isUpcoming: updatedBooking.isUpcoming,
          rescheduleHistory: updatedBooking.rescheduleHistory,
          cancellationReason: updatedBooking.cancellationReason,
          cancellationDate: updatedBooking.cancellationDate,
          rating: updatedBooking.rating,
          feedback: updatedBooking.feedback,
          completionNotes: updatedBooking.completionNotes,
          instructor: updatedBooking.instructorId,
          updatedAt: updatedBooking.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error('Error updating demo booking', {
      error: error.message,
      stack: error.stack,
      bookingId: bookingId,
      action: action
    });

    if (error.message.includes('cannot be')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error_code: 'BUSINESS_RULE_VIOLATION'
      });
    }

    throw new AppError('Failed to update booking', 500);
  }
});

/**
 * Get a specific demo booking by ID
 * @route GET /api/demo-booking/:bookingId
 * @access Private
 */
export const getDemoBookingById = catchAsync(async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await DemoBooking.findById(bookingId)
      .populate('userId', 'full_name email')
      .populate('instructorId', 'full_name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        error_code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check if user has permission to view this booking
    if (req.user && req.user.id && booking.userId && booking.userId._id.toString() !== req.user.id) {
      const userRole = req.user.role;
      if (!['admin', 'instructor'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this booking',
          error_code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking retrieved successfully',
      data: {
        booking: {
          id: booking._id,
          userId: booking.userId,
          email: booking.email,
          fullName: booking.fullName,
          phoneNumber: booking.phoneNumber,
          scheduledDateTime: booking.scheduledDateTime,
          timezone: booking.timezone,
          status: booking.status,
          demoType: booking.demoType,
          courseInterest: booking.courseInterest,
          experienceLevel: booking.experienceLevel,
          companyName: booking.companyName,
          jobTitle: booking.jobTitle,
          requirements: booking.requirements,
          notes: booking.notes,
          instructorNotes: booking.instructorNotes,
          durationMinutes: booking.durationMinutes,
          meetingLink: booking.meetingLink,
          meetingId: booking.meetingId,
          canReschedule: booking.canReschedule,
          canCancel: booking.canCancel,
          isUpcoming: booking.isUpcoming,
          rescheduleHistory: booking.rescheduleHistory,
          cancellationReason: booking.cancellationReason,
          cancellationDate: booking.cancellationDate,
          rating: booking.rating,
          feedback: booking.feedback,
          completionNotes: booking.completionNotes,
          instructor: booking.instructorId,
          source: booking.source,
          followUpRequired: booking.followUpRequired,
          followUpCompleted: booking.followUpCompleted,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving demo booking', {
      error: error.message,
      stack: error.stack,
      bookingId: bookingId
    });

    throw new AppError('Failed to retrieve booking', 500);
  }
});

/**
 * Get available time slots for demo booking (7+ days)
 * @route GET /api/demo-booking/available-slots
 * @access Public
 */
export const getAvailableTimeSlots = catchAsync(async (req, res) => {
  const { 
    startDate, 
    timezone = 'UTC', 
    days = 7,
    singleDay = false // Option to get single day slots (backward compatibility)
  } = req.query;

  try {
    const currentTime = moment.tz(timezone);
    let baseDate;

    // Business Rule: Demos can only be booked starting from tomorrow onwards
    const tomorrowDate = currentTime.clone().add(1, 'day').startOf('day');

    // Determine the starting date
    if (startDate) {
      baseDate = moment.tz(startDate, timezone).startOf('day');
      // Enforce minimum 1-day advance booking - start from tomorrow if date is today or earlier
      if (baseDate.isSameOrBefore(currentTime, 'day')) {
        baseDate = tomorrowDate;
      }
    } else {
      // Default: Start from tomorrow
      baseDate = tomorrowDate;
    }

    // Handle backward compatibility for single day requests
    if (singleDay === 'true' || singleDay === true) {
      const singleDaySlots = await generateSlotsForSingleDay(baseDate, currentTime, timezone);
      return res.status(200).json({
        success: true,
        message: 'Available time slots retrieved successfully (minimum 1-day advance booking)',
        data: {
          date: baseDate.format('YYYY-MM-DD'),
          display_date: baseDate.format('MMMM Do, YYYY'),
          timezone: timezone,
          minimum_advance_days: 1,
          earliest_booking_date: tomorrowDate.format('YYYY-MM-DD'),
          slots: singleDaySlots.slots,
          total_slots: singleDaySlots.totalSlots,
          available_slots: singleDaySlots.availableSlots
        }
      });
    }

    // Generate slots for multiple days (minimum 7 days)
    const numberOfDays = Math.max(parseInt(days) || 7, 7);
    const endDate = baseDate.clone().add(numberOfDays - 1, 'days').endOf('day');

    // Get existing bookings for the entire date range
    const existingBookings = await DemoBooking.find({
      scheduledDateTime: {
        $gte: baseDate.toDate(),
        $lte: endDate.toDate()
      },
      status: { $in: ['pending', 'confirmed', 'rescheduled'] },
      isActive: true
    }).select('scheduledDateTime');

    // Generate slots for each day
    const dailySlots = [];
    let totalAvailableSlots = 0;
    let totalSlots = 0;

    for (let i = 0; i < numberOfDays; i++) {
      const currentDay = baseDate.clone().add(i, 'days');
      const dayStart = currentDay.clone().startOf('day');
      const dayEnd = currentDay.clone().endOf('day');
      
      // Get bookings for this specific day
      const dayBookings = existingBookings.filter(booking => 
        moment(booking.scheduledDateTime).isBetween(dayStart, dayEnd, null, '[]')
      );

      // Generate time slots for this day (9 AM to 6 PM, 1-hour intervals)
      const daySlots = [];
      const slotStart = dayStart.clone().hour(9);
      const slotEnd = dayStart.clone().hour(18);

      while (slotStart.isBefore(slotEnd)) {
        const slotTime = slotStart.clone();
        
        // Only include slots that are after the current time
        if (slotTime.isAfter(currentTime)) {
          const bookingsAtThisTime = dayBookings.filter(booking => 
            moment(booking.scheduledDateTime).isSame(slotTime, 'hour')
          ).length;

          const isAvailable = bookingsAtThisTime < 3; // Max 3 concurrent demos
          
                     daySlots.push({
             datetime: slotTime.toISOString(),
             time: slotTime.format('HH:mm'),
             display_time: slotTime.format('h:mm A'),
             display_datetime: slotTime.format('MMMM Do, YYYY [at] h:mm A'),
             timezone_info: {
               timezone: timezone,
               offset: slotTime.format('Z'),
               timezone_name: slotTime.format('z')
             },
             available: isAvailable,
             bookings_count: bookingsAtThisTime
           });

          totalSlots++;
          if (isAvailable) {
            totalAvailableSlots++;
          }
        }

        slotStart.add(1, 'hour');
      }

      // Only include days that have available slots (since we start from tomorrow)
      if (daySlots.length > 0) {
        dailySlots.push({
          date: currentDay.format('YYYY-MM-DD'),
          display_date: currentDay.format('MMMM Do, YYYY'),
          day_name: currentDay.format('dddd'),
          is_tomorrow: currentDay.isSame(currentTime.clone().add(1, 'day'), 'day'),
          is_within_week: i < 7,
          days_from_today: i + 1, // Since we start from tomorrow, add 1
          slots: daySlots,
          total_day_slots: daySlots.length,
          available_day_slots: daySlots.filter(slot => slot.available).length
        });
      }
    }

    // Summary statistics
    const summary = {
      total_days: dailySlots.length,
      total_slots: totalSlots,
      available_slots: totalAvailableSlots,
      fully_booked_days: dailySlots.filter(day => day.available_day_slots === 0).length,
      partially_available_days: dailySlots.filter(day => day.available_day_slots > 0 && day.available_day_slots < day.total_day_slots).length,
      fully_available_days: dailySlots.filter(day => day.available_day_slots === day.total_day_slots).length
    };

    res.status(200).json({
      success: true,
      message: `Available time slots for ${numberOfDays} days retrieved successfully (minimum 1-day advance booking)`,
      data: {
        start_date: baseDate.format('YYYY-MM-DD'),
        end_date: baseDate.clone().add(numberOfDays - 1, 'days').format('YYYY-MM-DD'),
        timezone: timezone,
        days: numberOfDays,
        minimum_advance_days: 1,
        earliest_booking_date: tomorrowDate.format('YYYY-MM-DD'),
        current_date: currentTime.format('YYYY-MM-DD'),
        daily_slots: dailySlots,
        summary: summary,
        // Quick access to next 3 available slots across all days
        next_available_slots: getNextAvailableSlots(dailySlots, 3)
      }
    });

  } catch (error) {
    logger.error('Error retrieving available time slots', {
      error: error.message,
      stack: error.stack,
      startDate: startDate,
      timezone: timezone,
      days: days
    });

    throw new AppError('Failed to retrieve available time slots', 500);
  }
});

/**
 * Helper function to generate slots for a single day (backward compatibility)
 */
async function generateSlotsForSingleDay(requestedDate, currentTime, timezone) {
  const startOfDay = requestedDate.clone().startOf('day');
  const endOfDay = requestedDate.clone().endOf('day');

  // Get existing bookings for the date
  const existingBookings = await DemoBooking.find({
    scheduledDateTime: {
      $gte: startOfDay.toDate(),
      $lte: endOfDay.toDate()
    },
    status: { $in: ['pending', 'confirmed', 'rescheduled'] },
    isActive: true
  }).select('scheduledDateTime');

  // Generate time slots (9 AM to 6 PM, 1-hour intervals)
  const timeSlots = [];
  const current = startOfDay.clone().hour(9);
  const endTime = startOfDay.clone().hour(18);

  while (current.isBefore(endTime)) {
    const slotTime = current.clone();
    
    // Only include slots that are after the current time
    if (slotTime.isAfter(currentTime)) {
      const bookingsAtThisTime = existingBookings.filter(booking => 
        moment(booking.scheduledDateTime).isSame(slotTime, 'hour')
      ).length;

      timeSlots.push({
        datetime: slotTime.toISOString(),
        time: slotTime.format('HH:mm'),
        display_time: slotTime.format('h:mm A'),
        display_date: slotTime.format('MMMM Do, YYYY'),
        display_datetime: slotTime.format('MMMM Do, YYYY [at] h:mm A'),
        available: bookingsAtThisTime < 3, // Max 3 concurrent demos
        bookings_count: bookingsAtThisTime
      });
    }

    current.add(1, 'hour');
  }

  return {
    slots: timeSlots,
    totalSlots: timeSlots.length,
    availableSlots: timeSlots.filter(slot => slot.available).length
  };
}

/**
 * Helper function to get next N available slots across all days
 */
function getNextAvailableSlots(dailySlots, count = 3) {
  const availableSlots = [];
  
  for (const day of dailySlots) {
    for (const slot of day.slots) {
      if (slot.available && availableSlots.length < count) {
        availableSlots.push({
          ...slot,
          date: day.date,
          display_date: day.display_date,
          day_name: day.day_name,
          is_tomorrow: day.is_tomorrow,
          is_within_week: day.is_within_week,
          days_from_today: day.days_from_today
        });
      }
    }
    if (availableSlots.length >= count) break;
  }
  
  return availableSlots;
}

/**
 * Get booking statistics for admin dashboard
 * @route GET /api/demo-booking/stats
 * @access Private (Admin only)
 */
export const getBookingStats = catchAsync(async (req, res) => {
  const { startDate, endDate, period = '7d' } = req.query;

  try {
    // Check if user is admin
    if (!req.user || !['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        error_code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to last 7 days
      const daysAgo = period === '30d' ? 30 : 7;
      dateRange = {
        createdAt: {
          $gte: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        }
      };
    }

    // Get comprehensive statistics
    const [
      totalBookings,
      statusStats,
      demoTypeStats,
      recentBookings,
      upcomingBookings
    ] = await Promise.all([
      DemoBooking.countDocuments({ ...dateRange, isActive: true }),
      
      DemoBooking.aggregate([
        { $match: { ...dateRange, isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      DemoBooking.aggregate([
        { $match: { ...dateRange, isActive: true } },
        { $group: { _id: '$demoType', count: { $sum: 1 } } }
      ]),
      
      DemoBooking.find({ ...dateRange, isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'full_name email')
        .select('fullName email scheduledDateTime status demoType createdAt'),
      
      DemoBooking.find({
        scheduledDateTime: { $gt: new Date() },
        status: { $in: ['confirmed', 'rescheduled'] },
        isActive: true
      })
        .sort({ scheduledDateTime: 1 })
        .limit(10)
        .populate('userId', 'full_name email')
        .select('fullName email scheduledDateTime status demoType')
    ]);

    res.status(200).json({
      success: true,
      message: 'Booking statistics retrieved successfully',
      data: {
        summary: {
          total_bookings: totalBookings,
          status_breakdown: statusStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          demo_type_breakdown: demoTypeStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        },
        recent_bookings: recentBookings,
        upcoming_bookings: upcomingBookings,
        period: period,
        date_range: dateRange
      }
    });

  } catch (error) {
    logger.error('Error retrieving booking statistics', {
      error: error.message,
      stack: error.stack,
      period: period
    });

    throw new AppError('Failed to retrieve booking statistics', 500);
  }
});

/**
 * Create or regenerate Zoom meeting for existing demo booking
 * @route POST /api/demo-booking/:bookingId/zoom-meeting
 * @access Private (Admin/Instructor only)
 */
export const createZoomMeetingForDemo = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const { zoomMeetingSettings = {} } = req.body;

  try {
    // Find the booking
    const booking = await DemoBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Demo booking not found',
        error_code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check if user has permission (admin, instructor, or booking owner)
    const hasPermission = req.user && (
      ['admin', 'super-admin', 'instructor'].includes(req.user.role) ||
      req.user.id === booking.userId?.toString()
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create Zoom meeting',
        error_code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Check if booking is in the future
    if (booking.scheduledDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create Zoom meeting for past bookings',
        error_code: 'PAST_BOOKING'
      });
    }

    // Update zoom meeting settings if provided
    if (Object.keys(zoomMeetingSettings).length > 0) {
      booking.zoomMeetingSettings = { ...booking.zoomMeetingSettings, ...zoomMeetingSettings };
    }

    logger.info('Creating/regenerating Zoom meeting for demo booking', {
      bookingId: booking._id,
      userId: req.user?.id,
      scheduledDateTime: booking.scheduledDateTime
    });

    // Prepare Zoom meeting data
    const zoomMeetingData = booking.prepareZoomMeetingData();
    
    // Create the Zoom meeting
    const zoomMeeting = await zoomService.createClassroomMeeting('me', zoomMeetingData);
    
    // Store the Zoom meeting details
    booking.storeZoomMeetingDetails(zoomMeeting);
    await booking.save();

    logger.info('Zoom meeting created/regenerated successfully for demo booking', {
      bookingId: booking._id,
      zoomMeetingId: zoomMeeting.id,
      joinUrl: zoomMeeting.join_url
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Zoom meeting created successfully',
      data: {
        bookingId: booking._id,
        zoomMeeting: {
          id: zoomMeeting.id,
          topic: zoomMeeting.topic,
          start_time: zoomMeeting.start_time,
          duration: zoomMeeting.duration,
          timezone: zoomMeeting.timezone,
          agenda: zoomMeeting.agenda,
          join_url: zoomMeeting.join_url,
          start_url: zoomMeeting.start_url, // For instructors/admins
          password: zoomMeeting.password,
          settings: {
            auto_recording: zoomMeeting.settings?.auto_recording,
            waiting_room: zoomMeeting.settings?.waiting_room,
            host_video: zoomMeeting.settings?.host_video,
            participant_video: zoomMeeting.settings?.participant_video,
            mute_upon_entry: zoomMeeting.settings?.mute_upon_entry,
          }
        }
      }
    });

  } catch (error) {
    logger.error('Error creating Zoom meeting for demo booking', {
      bookingId,
      error: error.message,
      stack: error.stack
    });

    if (error.response?.data?.message) {
      return res.status(error.response.status || 500).json({
        success: false,
        message: `Zoom API error: ${error.response.data.message}`,
        error_code: 'ZOOM_API_ERROR'
      });
    }

    throw new AppError('Failed to create Zoom meeting', 500);
  }
});

/**
 * Get supported timezones for demo booking
 * @route GET /api/demo-booking/timezones
 * @access Public
 */
export const getSupportedTimezones = catchAsync(async (req, res) => {
  try {
    const timezones = [
      {
        value: 'UTC',
        label: 'UTC (Coordinated Universal Time)',
        offset: '+00:00',
        region: 'Global'
      },
      // North America
      {
        value: 'America/New_York',
        label: 'Eastern Time (New York)',
        offset: moment.tz('America/New_York').format('Z'),
        region: 'North America'
      },
      {
        value: 'America/Chicago',
        label: 'Central Time (Chicago)',
        offset: moment.tz('America/Chicago').format('Z'),
        region: 'North America'
      },
      {
        value: 'America/Denver',
        label: 'Mountain Time (Denver)',
        offset: moment.tz('America/Denver').format('Z'),
        region: 'North America'
      },
      {
        value: 'America/Los_Angeles',
        label: 'Pacific Time (Los Angeles)',
        offset: moment.tz('America/Los_Angeles').format('Z'),
        region: 'North America'
      },
      {
        value: 'America/Toronto',
        label: 'Eastern Time (Toronto)',
        offset: moment.tz('America/Toronto').format('Z'),
        region: 'North America'
      },
      {
        value: 'America/Vancouver',
        label: 'Pacific Time (Vancouver)',
        offset: moment.tz('America/Vancouver').format('Z'),
        region: 'North America'
      },
      {
        value: 'America/Mexico_City',
        label: 'Central Time (Mexico City)',
        offset: moment.tz('America/Mexico_City').format('Z'),
        region: 'North America'
      },
      // South America
      {
        value: 'America/Sao_Paulo',
        label: 'Brasília Time (São Paulo)',
        offset: moment.tz('America/Sao_Paulo').format('Z'),
        region: 'South America'
      },
      // Europe
      {
        value: 'Europe/London',
        label: 'Greenwich Mean Time (London)',
        offset: moment.tz('Europe/London').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Paris',
        label: 'Central European Time (Paris)',
        offset: moment.tz('Europe/Paris').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Berlin',
        label: 'Central European Time (Berlin)',
        offset: moment.tz('Europe/Berlin').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Rome',
        label: 'Central European Time (Rome)',
        offset: moment.tz('Europe/Rome').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Madrid',
        label: 'Central European Time (Madrid)',
        offset: moment.tz('Europe/Madrid').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Amsterdam',
        label: 'Central European Time (Amsterdam)',
        offset: moment.tz('Europe/Amsterdam').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Stockholm',
        label: 'Central European Time (Stockholm)',
        offset: moment.tz('Europe/Stockholm').format('Z'),
        region: 'Europe'
      },
      {
        value: 'Europe/Zurich',
        label: 'Central European Time (Zurich)',
        offset: moment.tz('Europe/Zurich').format('Z'),
        region: 'Europe'
      },
      // Asia
      {
        value: 'Asia/Dubai',
        label: 'Gulf Standard Time (Dubai)',
        offset: moment.tz('Asia/Dubai').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Kolkata',
        label: 'India Standard Time (Mumbai/Delhi)',
        offset: moment.tz('Asia/Kolkata').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Singapore',
        label: 'Singapore Standard Time',
        offset: moment.tz('Asia/Singapore').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Tokyo',
        label: 'Japan Standard Time (Tokyo)',
        offset: moment.tz('Asia/Tokyo').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Shanghai',
        label: 'China Standard Time (Shanghai)',
        offset: moment.tz('Asia/Shanghai').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Hong_Kong',
        label: 'Hong Kong Time',
        offset: moment.tz('Asia/Hong_Kong').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Seoul',
        label: 'Korea Standard Time (Seoul)',
        offset: moment.tz('Asia/Seoul').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Bangkok',
        label: 'Indochina Time (Bangkok)',
        offset: moment.tz('Asia/Bangkok').format('Z'),
        region: 'Asia'
      },
      {
        value: 'Asia/Jakarta',
        label: 'Western Indonesia Time (Jakarta)',
        offset: moment.tz('Asia/Jakarta').format('Z'),
        region: 'Asia'
      },
      // Australia & Oceania
      {
        value: 'Australia/Sydney',
        label: 'Australian Eastern Time (Sydney)',
        offset: moment.tz('Australia/Sydney').format('Z'),
        region: 'Australia & Oceania'
      },
      {
        value: 'Australia/Melbourne',
        label: 'Australian Eastern Time (Melbourne)',
        offset: moment.tz('Australia/Melbourne').format('Z'),
        region: 'Australia & Oceania'
      },
      {
        value: 'Australia/Perth',
        label: 'Australian Western Time (Perth)',
        offset: moment.tz('Australia/Perth').format('Z'),
        region: 'Australia & Oceania'
      },
      {
        value: 'Pacific/Auckland',
        label: 'New Zealand Time (Auckland)',
        offset: moment.tz('Pacific/Auckland').format('Z'),
        region: 'Australia & Oceania'
      },
      {
        value: 'Pacific/Honolulu',
        label: 'Hawaii-Aleutian Time (Honolulu)',
        offset: moment.tz('Pacific/Honolulu').format('Z'),
        region: 'Australia & Oceania'
      },
      // Africa
      {
        value: 'Africa/Cairo',
        label: 'Eastern European Time (Cairo)',
        offset: moment.tz('Africa/Cairo').format('Z'),
        region: 'Africa'
      },
      {
        value: 'Africa/Lagos',
        label: 'West Africa Time (Lagos)',
        offset: moment.tz('Africa/Lagos').format('Z'),
        region: 'Africa'
      },
      {
        value: 'Africa/Johannesburg',
        label: 'South Africa Time (Johannesburg)',
        offset: moment.tz('Africa/Johannesburg').format('Z'),
        region: 'Africa'
      }
    ];

    // Group timezones by region
    const groupedTimezones = timezones.reduce((acc, tz) => {
      if (!acc[tz.region]) {
        acc[tz.region] = [];
      }
      acc[tz.region].push({
        value: tz.value,
        label: tz.label,
        offset: tz.offset
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Supported timezones retrieved successfully',
      data: {
        timezones: timezones,
        grouped_timezones: groupedTimezones,
        total_timezones: timezones.length,
        current_utc_time: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
        user_detected_timezone: req.headers['x-timezone'] || 'UTC' // Can be set by frontend
      }
    });

  } catch (error) {
    logger.error('Error retrieving supported timezones', {
      error: error.message,
      stack: error.stack
    });

    throw new AppError('Failed to retrieve supported timezones', 500);
  }
});

/**
 * Get Zoom meeting details for a demo booking
 * @route GET /api/demo-booking/:bookingId/zoom-meeting
 * @access Private
 */
export const getZoomMeetingDetails = catchAsync(async (req, res) => {
  const { bookingId } = req.params;

  try {
    // Find the booking
    const booking = await DemoBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Demo booking not found',
        error_code: 'BOOKING_NOT_FOUND'
      });
    }

    // Check if user has permission
    const hasPermission = req.user && (
      ['admin', 'super-admin', 'instructor'].includes(req.user.role) ||
      req.user.id === booking.userId?.toString()
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view Zoom meeting details',
        error_code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Check if Zoom meeting exists
    if (!booking.zoomMeeting?.isZoomMeetingCreated) {
      return res.status(404).json({
        success: false,
        message: 'Zoom meeting not found for this booking',
        error_code: 'ZOOM_MEETING_NOT_FOUND',
        data: {
          zoomMeetingError: booking.zoomMeeting?.zoomMeetingError
        }
      });
    }

    // Return appropriate details based on user role
    const isInstructorOrAdmin = ['admin', 'super-admin', 'instructor'].includes(req.user.role);
    
    res.status(200).json({
      success: true,
      message: 'Zoom meeting details retrieved successfully',
      data: {
        bookingId: booking._id,
        zoomMeeting: {
          id: booking.zoomMeeting.id,
          topic: booking.zoomMeeting.topic,
          start_time: booking.zoomMeeting.start_time,
          duration: booking.zoomMeeting.duration,
          timezone: booking.zoomMeeting.timezone,
          agenda: booking.zoomMeeting.agenda,
          join_url: booking.zoomMeeting.join_url,
          start_url: isInstructorOrAdmin ? booking.zoomMeeting.start_url : undefined, // Only for instructors/admins
          password: booking.zoomMeeting.password,
          status: booking.zoomMeeting.status,
          created_at: booking.zoomMeeting.created_at,
          settings: {
            auto_recording: booking.zoomMeeting.settings?.auto_recording,
            waiting_room: booking.zoomMeeting.settings?.waiting_room,
            host_video: booking.zoomMeeting.settings?.host_video,
            participant_video: booking.zoomMeeting.settings?.participant_video,
            mute_upon_entry: booking.zoomMeeting.settings?.mute_upon_entry,
          }
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving Zoom meeting details', {
      bookingId,
      error: error.message,
      stack: error.stack
    });

    throw new AppError('Failed to retrieve Zoom meeting details', 500);
  }
});

export default {
  createDemoBooking,
  getUserBookings,
  updateDemoBooking,
  getDemoBookingById,
  getAvailableTimeSlots,
  getBookingStats,
  createZoomMeetingForDemo,
  getZoomMeetingDetails,
  getSupportedTimezones
}; 