import EnhancedProgress from '../models/enhanced-progress.model.js';
import EnrolledCourse from '../models/enrolled-courses-model.js';
import User from '../models/user-modal.js';
import { BaseCourse } from '../models/course-types/base-course.js';
import { AppError } from '../utils/errorHandler.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

/**
 * Initialize or get enhanced progress for a student's course enrollment
 * @route POST /api/v1/progress/initialize
 * @access Private
 */
export const initializeProgress = catchAsync(async (req, res) => {
  const { courseId, enrollmentId } = req.body;
  const studentId = req.user.id;

  try {
    // Check if progress already exists
    let progress = await EnhancedProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (progress) {
      return res.status(200).json({
        success: true,
        message: 'Progress already initialized',
        data: {
          progress: progress.getProgressReport()
        }
      });
    }

    // Verify enrollment exists
    const enrollment = await EnrolledCourse.findOne({
      _id: enrollmentId,
      student_id: studentId,
      course_id: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Active enrollment not found for this course',
        error_code: 'ENROLLMENT_NOT_FOUND'
      });
    }

    // Get course structure
    const course = await BaseCourse.findById(courseId).select('curriculum course_title');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
        error_code: 'COURSE_NOT_FOUND'
      });
    }

    // Analyze course structure
    const courseStructure = analyzeCourseStructure(course.curriculum);

    // Create progress tracking for all lessons
    const lessonProgress = createLessonProgressEntries(course.curriculum);

    // Initialize enhanced progress
    progress = new EnhancedProgress({
      student: studentId,
      course: courseId,
      enrollment: enrollmentId,
      courseStructure,
      lessonProgress,
      overallProgress: {
        lessonsCompleted: 0,
        lessonsInProgress: 0,
        lessonsNotStarted: courseStructure.totalLessons,
        lessonCompletionPercentage: 0,
        overallCompletionPercentage: 0,
        totalTimeSpent: 0,
        averageTimePerLesson: 0
      },
      learningPath: {
        currentWeek: 1,
        currentSection: null,
        currentLesson: lessonProgress[0]?.lessonId || null,
        isSequential: true,
        unlockedLessons: [lessonProgress[0]?.lessonId].filter(Boolean),
        blockedLessons: lessonProgress.slice(1).map(lesson => lesson.lessonId)
      },
      completionCriteria: {
        requireAllLessons: true,
        requiredLessonPercentage: 100
      }
    });

    await progress.save();

    logger.info('Enhanced progress initialized successfully', {
      studentId,
      courseId,
      enrollmentId,
      totalLessons: courseStructure.totalLessons
    });

    res.status(201).json({
      success: true,
      message: 'Progress tracking initialized successfully',
      data: {
        progress: progress.getProgressReport(),
        courseStructure
      }
    });

  } catch (error) {
    logger.error('Error initializing progress', {
      error: error.message,
      stack: error.stack,
      studentId,
      courseId
    });

    throw new AppError('Failed to initialize progress tracking', 500);
  }
});

/**
 * Update lesson progress
 * @route PUT /api/v1/progress/lesson/:lessonId
 * @access Private
 */
export const updateLessonProgress = catchAsync(async (req, res) => {
  const { lessonId } = req.params;
  const { 
    courseId,
    status,
    progressPercentage = 0,
    timeSpent = 0,
    videoProgress = {},
    interactions = {}
  } = req.body;
  const studentId = req.user.id;

  try {
    // Find progress record
    const progress = await EnhancedProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress tracking not found. Please initialize first.',
        error_code: 'PROGRESS_NOT_INITIALIZED'
      });
    }

    // Validate lesson exists in course
    const lessonExists = progress.lessonProgress.some(lesson => lesson.lessonId === lessonId);
    if (!lessonExists) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found in course curriculum',
        error_code: 'LESSON_NOT_FOUND'
      });
    }

    // Check sequential learning path
    if (progress.learningPath.isSequential && status === 'completed') {
      const currentLessonIndex = progress.lessonProgress.findIndex(lesson => lesson.lessonId === lessonId);
      const previousLessons = progress.lessonProgress.slice(0, currentLessonIndex);
      const uncompletedPreviousLessons = previousLessons.filter(lesson => lesson.status !== 'completed');

      if (uncompletedPreviousLessons.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You must complete previous lessons before marking this lesson as complete',
          error_code: 'SEQUENTIAL_LEARNING_VIOLATION',
          data: {
            uncompletedLessons: uncompletedPreviousLessons.map(lesson => lesson.lessonId)
          }
        });
      }
    }

    // Update lesson progress
    const progressData = {
      status,
      progressPercentage,
      timeSpent,
      videoProgress,
      interactions
    };

    await progress.updateLessonProgress(lessonId, progressData);

    // Update learning path
    if (status === 'completed' && progress.learningPath.isSequential) {
      updateLearningPath(progress, lessonId);
      await progress.save();
    }

    // Update enrollment progress for backward compatibility
    const enrollment = await EnrolledCourse.findById(progress.enrollment);
    if (enrollment) {
      if (status === 'completed' && !enrollment.completed_lessons.includes(lessonId)) {
        enrollment.completed_lessons.push(lessonId);
      }
      enrollment.progress = progress.overallProgress.overallCompletionPercentage;
      enrollment.last_accessed = new Date();
      await enrollment.save();
    }

    logger.info('Lesson progress updated successfully', {
      studentId,
      courseId,
      lessonId,
      status,
      overallProgress: progress.overallProgress.overallCompletionPercentage
    });

    res.status(200).json({
      success: true,
      message: 'Lesson progress updated successfully',
      data: {
        lessonProgress: progress.lessonProgress.find(lesson => lesson.lessonId === lessonId),
        overallProgress: progress.overallProgress,
        nextLesson: progress.nextLesson,
        isCompleted: progress.isCompleted,
        recommendedActions: progress.getRecommendedActions()
      }
    });

  } catch (error) {
    logger.error('Error updating lesson progress', {
      error: error.message,
      stack: error.stack,
      studentId,
      courseId,
      lessonId
    });

    throw new AppError('Failed to update lesson progress', 500);
  }
});

/**
 * Get detailed progress report for a course
 * @route GET /api/v1/progress/course/:courseId
 * @access Private
 */
export const getCourseProgress = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  try {
    const progress = await EnhancedProgress.findOne({
      student: studentId,
      course: courseId
    }).populate('course', 'course_title course_image');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress tracking not found for this course',
        error_code: 'PROGRESS_NOT_FOUND'
      });
    }

    const detailedReport = progress.getProgressReport();

    // Add course-specific insights
    const insights = generateLearningInsights(progress);

    res.status(200).json({
      success: true,
      message: 'Course progress retrieved successfully',
      data: {
        course: progress.course,
        progress: detailedReport,
        insights,
        lastAccessed: progress.lastAccessedAt,
        enrollmentDate: progress.firstAccessedAt
      }
    });

  } catch (error) {
    logger.error('Error retrieving course progress', {
      error: error.message,
      stack: error.stack,
      studentId,
      courseId
    });

    throw new AppError('Failed to retrieve course progress', 500);
  }
});

/**
 * Get student's overall progress across all courses
 * @route GET /api/v1/progress/student/overview
 * @access Private
 */
export const getStudentOverallProgress = catchAsync(async (req, res) => {
  const studentId = req.user.id;

  try {
    const overallProgress = await EnhancedProgress.getStudentOverallProgress(studentId);

    // Generate personalized recommendations
    const recommendations = generatePersonalizedRecommendations(overallProgress);

    res.status(200).json({
      success: true,
      message: 'Student overall progress retrieved successfully',
      data: {
        ...overallProgress,
        recommendations,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Error retrieving student overall progress', {
      error: error.message,
      stack: error.stack,
      studentId
    });

    throw new AppError('Failed to retrieve overall progress', 500);
  }
});

/**
 * Get lesson-by-lesson progress for a course
 * @route GET /api/v1/progress/course/:courseId/lessons
 * @access Private
 */
export const getLessonProgressList = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { week, section, status } = req.query;
  const studentId = req.user.id;

  try {
    const progress = await EnhancedProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress tracking not found for this course',
        error_code: 'PROGRESS_NOT_FOUND'
      });
    }

    let lessonProgress = progress.lessonProgress;

    // Apply filters
    if (week) {
      lessonProgress = lessonProgress.filter(lesson => lesson.weekId === week);
    }

    if (section) {
      lessonProgress = lessonProgress.filter(lesson => lesson.sectionId === section);
    }

    if (status) {
      lessonProgress = lessonProgress.filter(lesson => lesson.status === status);
    }

    // Sort by lesson order (assuming lesson IDs contain ordering info)
    lessonProgress.sort((a, b) => {
      const aWeek = parseInt(a.weekId) || 0;
      const bWeek = parseInt(b.weekId) || 0;
      if (aWeek !== bWeek) return aWeek - bWeek;
      
      const aSection = a.sectionId || '';
      const bSection = b.sectionId || '';
      if (aSection !== bSection) return aSection.localeCompare(bSection);
      
      return a.lessonId.localeCompare(b.lessonId);
    });

    res.status(200).json({
      success: true,
      message: 'Lesson progress list retrieved successfully',
      data: {
        lessons: lessonProgress,
        summary: {
          total: lessonProgress.length,
          completed: lessonProgress.filter(lesson => lesson.status === 'completed').length,
          inProgress: lessonProgress.filter(lesson => lesson.status === 'in_progress').length,
          notStarted: lessonProgress.filter(lesson => lesson.status === 'not_started').length
        },
        filters: {
          week,
          section,
          status
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving lesson progress list', {
      error: error.message,
      stack: error.stack,
      studentId,
      courseId
    });

    throw new AppError('Failed to retrieve lesson progress list', 500);
  }
});

/**
 * Get progress analytics and insights
 * @route GET /api/v1/progress/analytics/:courseId
 * @access Private
 */
export const getProgressAnalytics = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  try {
    const progress = await EnhancedProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress tracking not found for this course',
        error_code: 'PROGRESS_NOT_FOUND'
      });
    }

    // Generate comprehensive analytics
    const analytics = {
      completionMetrics: {
        overallCompletion: progress.overallProgress.overallCompletionPercentage,
        lessonCompletion: progress.overallProgress.lessonCompletionPercentage,
        timeSpent: {
          total: progress.overallProgress.totalTimeSpent,
          average: progress.overallProgress.averageTimePerLesson,
          formatted: formatTime(progress.overallProgress.totalTimeSpent)
        }
      },
      learningVelocity: {
        currentStreak: progress.learningAnalytics.studyStreak.current,
        longestStreak: progress.learningAnalytics.studyStreak.longest,
        lastStudyDate: progress.learningAnalytics.studyStreak.lastStudyDate,
        weeklyActivity: progress.learningAnalytics.weeklyActivity
      },
      progressTrend: calculateProgressTrend(progress),
      completionPrediction: predictCompletionDate(progress),
      strengths: progress.learningAnalytics.strongAreas,
      improvementAreas: progress.learningAnalytics.improvementAreas,
      recommendations: progress.getRecommendedActions()
    };

    res.status(200).json({
      success: true,
      message: 'Progress analytics retrieved successfully',
      data: analytics
    });

  } catch (error) {
    logger.error('Error retrieving progress analytics', {
      error: error.message,
      stack: error.stack,
      studentId,
      courseId
    });

    throw new AppError('Failed to retrieve progress analytics', 500);
  }
});

/**
 * Reset lesson progress (for retaking)
 * @route POST /api/v1/progress/lesson/:lessonId/reset
 * @access Private
 */
export const resetLessonProgress = catchAsync(async (req, res) => {
  const { lessonId } = req.params;
  const { courseId } = req.body;
  const studentId = req.user.id;

  try {
    const progress = await EnhancedProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress tracking not found',
        error_code: 'PROGRESS_NOT_FOUND'
      });
    }

    // Reset lesson progress
    await progress.updateLessonProgress(lessonId, {
      status: 'not_started',
      progressPercentage: 0,
      timeSpent: 0,
      videoProgress: {
        totalDuration: 0,
        watchedDuration: 0,
        watchedPercentage: 0,
        lastWatchPosition: 0
      },
      interactions: {
        notes: [],
        bookmarks: []
      }
    });

    logger.info('Lesson progress reset successfully', {
      studentId,
      courseId,
      lessonId
    });

    res.status(200).json({
      success: true,
      message: 'Lesson progress reset successfully',
      data: {
        lessonProgress: progress.lessonProgress.find(lesson => lesson.lessonId === lessonId),
        overallProgress: progress.overallProgress
      }
    });

  } catch (error) {
    logger.error('Error resetting lesson progress', {
      error: error.message,
      stack: error.stack,
      studentId,
      courseId,
      lessonId
    });

    throw new AppError('Failed to reset lesson progress', 500);
  }
});

// Helper functions

function analyzeCourseStructure(curriculum) {
  let totalWeeks = 0;
  let totalSections = 0;
  let totalLessons = 0;
  let totalVideoDuration = 0;

  if (curriculum && Array.isArray(curriculum)) {
    totalWeeks = curriculum.length;

    curriculum.forEach(week => {
      // Count direct lessons in week
      if (week.lessons && Array.isArray(week.lessons)) {
        totalLessons += week.lessons.length;
        totalVideoDuration += week.lessons.reduce((sum, lesson) => {
          return sum + (lesson.duration || 0);
        }, 0);
      }

      // Count sections and their lessons
      if (week.sections && Array.isArray(week.sections)) {
        totalSections += week.sections.length;
        week.sections.forEach(section => {
          if (section.lessons && Array.isArray(section.lessons)) {
            totalLessons += section.lessons.length;
            totalVideoDuration += section.lessons.reduce((sum, lesson) => {
              return sum + (lesson.duration || 0);
            }, 0);
          }
        });
      }
    });
  }

  return {
    totalWeeks,
    totalSections,
    totalLessons,
    totalAssessments: 0, // To be calculated separately if needed
    totalVideoDuration
  };
}

function createLessonProgressEntries(curriculum) {
  const lessonProgress = [];

  if (curriculum && Array.isArray(curriculum)) {
    curriculum.forEach(week => {
      // Add direct lessons
      if (week.lessons && Array.isArray(week.lessons)) {
        week.lessons.forEach(lesson => {
          lessonProgress.push({
            lessonId: lesson.id,
            weekId: week.id,
            sectionId: null,
            lessonType: lesson.type || 'video',
            status: 'not_started',
            progressPercentage: 0,
            timeSpent: 0,
            videoProgress: {
              totalDuration: lesson.duration || 0,
              watchedDuration: 0,
              watchedPercentage: 0,
              lastWatchPosition: 0
            },
            interactions: {
              notes: [],
              bookmarks: []
            }
          });
        });
      }

      // Add section lessons
      if (week.sections && Array.isArray(week.sections)) {
        week.sections.forEach(section => {
          if (section.lessons && Array.isArray(section.lessons)) {
            section.lessons.forEach(lesson => {
              lessonProgress.push({
                lessonId: lesson.id,
                weekId: week.id,
                sectionId: section.id,
                lessonType: lesson.type || 'video',
                status: 'not_started',
                progressPercentage: 0,
                timeSpent: 0,
                videoProgress: {
                  totalDuration: lesson.duration || 0,
                  watchedDuration: 0,
                  watchedPercentage: 0,
                  lastWatchPosition: 0
                },
                interactions: {
                  notes: [],
                  bookmarks: []
                }
              });
            });
          }
        });
      }
    });
  }

  return lessonProgress;
}

function updateLearningPath(progress, completedLessonId) {
  const currentLessonIndex = progress.lessonProgress.findIndex(
    lesson => lesson.lessonId === completedLessonId
  );

  if (currentLessonIndex < progress.lessonProgress.length - 1) {
    const nextLesson = progress.lessonProgress[currentLessonIndex + 1];
    progress.learningPath.currentLesson = nextLesson.lessonId;
    
    // Unlock next lesson
    if (!progress.learningPath.unlockedLessons.includes(nextLesson.lessonId)) {
      progress.learningPath.unlockedLessons.push(nextLesson.lessonId);
    }

    // Remove from blocked lessons
    progress.learningPath.blockedLessons = progress.learningPath.blockedLessons.filter(
      lessonId => lessonId !== nextLesson.lessonId
    );

    // Update current week if needed
    const nextLessonWeek = parseInt(nextLesson.weekId);
    if (nextLessonWeek > progress.learningPath.currentWeek) {
      progress.learningPath.currentWeek = nextLessonWeek;
    }
  }
}

function generateLearningInsights(progress) {
  const insights = [];

  // Completion rate insight
  const completionRate = progress.overallProgress.overallCompletionPercentage;
  if (completionRate === 100) {
    insights.push({
      type: 'success',
      title: 'Course Completed!',
      message: 'Congratulations! You have successfully completed this course.',
      icon: '🎉'
    });
  } else if (completionRate >= 80) {
    insights.push({
      type: 'positive',
      title: 'Almost There!',
      message: 'You\'re in the final stretch. Keep up the great work!',
      icon: '🔥'
    });
  } else if (completionRate >= 50) {
    insights.push({
      type: 'progress',
      title: 'Halfway Point',
      message: 'You\'ve completed half the course. Maintain your momentum!',
      icon: '📈'
    });
  }

  // Study streak insight
  const currentStreak = progress.learningAnalytics.studyStreak.current;
  if (currentStreak >= 7) {
    insights.push({
      type: 'achievement',
      title: 'Study Streak Master',
      message: `Amazing ${currentStreak}-day study streak! Consistency is key to success.`,
      icon: '⚡'
    });
  } else if (currentStreak >= 3) {
    insights.push({
      type: 'positive',
      title: 'Building Momentum',
      message: `Great ${currentStreak}-day streak! Keep building this healthy habit.`,
      icon: '📚'
    });
  }

  // Time efficiency insight
  const avgTimePerLesson = progress.overallProgress.averageTimePerLesson;
  if (avgTimePerLesson > 0 && avgTimePerLesson < 1800) { // Less than 30 minutes
    insights.push({
      type: 'tip',
      title: 'Efficient Learner',
      message: 'You\'re completing lessons efficiently. Consider taking notes for better retention.',
      icon: '💡'
    });
  }

  return insights;
}

function generatePersonalizedRecommendations(overallProgress) {
  const recommendations = [];

  // Course completion recommendations
  const inProgressCourses = overallProgress.courses.filter(
    course => course.progress.summary.overallCompletion > 0 && 
              course.progress.summary.overallCompletion < 100
  );

  if (inProgressCourses.length > 0) {
    const mostAdvanced = inProgressCourses.reduce((prev, current) => 
      prev.progress.summary.overallCompletion > current.progress.summary.overallCompletion ? prev : current
    );

    recommendations.push({
      type: 'course_focus',
      priority: 'high',
      title: 'Focus on One Course',
      message: `Continue with "${mostAdvanced.course.course_title}" - you're ${mostAdvanced.progress.summary.overallCompletion}% complete!`,
      courseId: mostAdvanced.course._id
    });
  }

  // Study consistency recommendations
  if (overallProgress.summary.currentActiveStreak === 0) {
    recommendations.push({
      type: 'consistency',
      priority: 'medium',
      title: 'Build a Study Habit',
      message: 'Start a study streak by completing at least one lesson today.',
      action: 'study_today'
    });
  }

  // Time management recommendations
  const totalHours = Math.round(overallProgress.summary.totalTimeSpent / 3600);
  if (totalHours > 50) {
    recommendations.push({
      type: 'achievement',
      priority: 'low',
      title: 'Dedicated Learner',
      message: `You've invested ${totalHours} hours in learning. That's commitment!`,
      action: 'celebrate'
    });
  }

  return recommendations;
}

function calculateProgressTrend(progress) {
  const weeklyActivity = progress.learningAnalytics.weeklyActivity || [];
  
  if (weeklyActivity.length < 2) {
    return { trend: 'neutral', message: 'Not enough data to determine trend' };
  }

  const recent = weeklyActivity.slice(-3);
  const lessonsCompleted = recent.map(week => week.lessonsCompleted);
  
  const isIncreasing = lessonsCompleted.every((val, i) => 
    i === 0 || val >= lessonsCompleted[i - 1]
  );
  
  const isDecreasing = lessonsCompleted.every((val, i) => 
    i === 0 || val <= lessonsCompleted[i - 1]
  );

  if (isIncreasing && !isDecreasing) {
    return { trend: 'increasing', message: 'Your learning pace is accelerating!' };
  } else if (isDecreasing && !isIncreasing) {
    return { trend: 'decreasing', message: 'Consider setting aside more time for learning.' };
  } else {
    return { trend: 'stable', message: 'Maintaining a steady learning pace.' };
  }
}

function predictCompletionDate(progress) {
  const completionRate = progress.overallProgress.overallCompletionPercentage;
  
  if (completionRate === 100) {
    return { message: 'Course completed!', date: progress.completedAt };
  }

  const weeklyActivity = progress.learningAnalytics.weeklyActivity || [];
  
  if (weeklyActivity.length === 0) {
    return { message: 'Start learning to get completion prediction', date: null };
  }

  // Calculate average lessons per week
  const recentWeeks = weeklyActivity.slice(-4); // Last 4 weeks
  const avgLessonsPerWeek = recentWeeks.reduce((sum, week) => sum + week.lessonsCompleted, 0) / recentWeeks.length;

  if (avgLessonsPerWeek === 0) {
    return { message: 'No recent activity to predict completion', date: null };
  }

  const remainingLessons = progress.overallProgress.lessonsNotStarted + progress.overallProgress.lessonsInProgress;
  const weeksToComplete = Math.ceil(remainingLessons / avgLessonsPerWeek);
  
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + (weeksToComplete * 7));

  return { 
    message: `Estimated completion in ${weeksToComplete} weeks`,
    date: completionDate,
    confidence: recentWeeks.length >= 3 ? 'high' : 'medium'
  };
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export default {
  initializeProgress,
  updateLessonProgress,
  getCourseProgress,
  getStudentOverallProgress,
  getLessonProgressList,
  getProgressAnalytics,
  resetLessonProgress
}; 