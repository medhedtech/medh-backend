import Goal from '../models/goal-model.js';
import User from '../models/user-modal.js';
import Course from '../models/course-types/base-course.js';
import Assignment from '../models/assignment-modal.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import {
  createGoalValidation,
  updateGoalValidation,
  getGoalsQueryValidation,
  updateProgressValidation,
  addMilestoneValidation,
  updateMilestoneValidation,
  bulkUpdateValidation,
  statsQueryValidation
} from '../validations/goalValidation.js';

/**
 * Get all goals for a student with filtering, sorting, and pagination
 * GET /api/v1/goals/student/:studentId
 */
const getStudentGoals = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  
  // Validate query parameters
  const { error, value: queryParams } = getGoalsQueryValidation.validate(req.query);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  // Verify student exists
  const student = await User.findById(studentId);
  if (!student) {
    return next(new AppError('Student not found', 404));
  }
  
  // Check authorization - students can only view their own goals
  if (req.user.id !== studentId && !req.user.admin_role) {
    return next(new AppError('You can only view your own goals', 403));
  }
  
  // Build query
  const query = { studentId, isArchived: false };
  
  // Apply filters
  if (queryParams.status) query.status = queryParams.status;
  if (queryParams.category) query.category = queryParams.category;
  if (queryParams.priority) query.priority = queryParams.priority;
  
  // Handle overdue filter
  if (queryParams.overdue === true) {
    query.deadline = { $lt: new Date() };
    query.status = 'active';
  }
  
  // Handle upcoming filter
  if (queryParams.upcoming) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + queryParams.upcoming);
    query.deadline = { 
      $gte: new Date(),
      $lte: futureDate
    };
    query.status = 'active';
  }
  
  // Handle tags filter
  if (queryParams.tags) {
    const tags = Array.isArray(queryParams.tags) ? queryParams.tags : [queryParams.tags];
    query.tags = { $in: tags };
  }
  
  // Handle search
  if (queryParams.search) {
    query.$or = [
      { title: { $regex: queryParams.search, $options: 'i' } },
      { description: { $regex: queryParams.search, $options: 'i' } }
    ];
  }
  
  // Calculate pagination
  const limit = queryParams.limit;
  const skip = (queryParams.page - 1) * limit;
  
  // Build sort object
  const sortOrder = queryParams.order === 'desc' ? -1 : 1;
  const sortField = queryParams.sort;
  const sort = { [sortField]: sortOrder };
  
  // Add secondary sort for consistency
  if (sortField !== 'createdAt') {
    sort.createdAt = -1;
  }
  
  // Execute query with aggregation for better performance
  const [goals, totalCount] = await Promise.all([
    Goal.find(query)
      .populate('courseId', 'title course_type thumbnail')
      .populate('assignmentId', 'title dueDate')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Goal.countDocuments(query)
  ]);
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = queryParams.page < totalPages;
  const hasPrevPage = queryParams.page > 1;
  
  // Log the activity
  logger.info(`Student goals retrieved`, {
    studentId,
    totalGoals: totalCount,
    filters: queryParams,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Goals retrieved successfully',
    data: {
      goals,
      pagination: {
        currentPage: queryParams.page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      },
      filters: queryParams
    }
  });
});

/**
 * Get a specific goal by ID
 * GET /api/v1/goals/:goalId
 */
const getGoalById = catchAsync(async (req, res, next) => {
  const { goalId } = req.params;
  
  const goal = await Goal.findById(goalId)
    .populate('courseId', 'title course_type thumbnail description')
    .populate('assignmentId', 'title description dueDate')
    .populate('studentId', 'full_name email');
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Check authorization
  if (req.user.id !== goal.studentId.toString() && !req.user.admin_role) {
    return next(new AppError('You can only view your own goals', 403));
  }
  
  logger.info(`Goal retrieved`, {
    goalId,
    studentId: goal.studentId,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Goal retrieved successfully',
    data: { goal }
  });
});

/**
 * Create a new goal
 * POST /api/v1/goals
 */
const createGoal = catchAsync(async (req, res, next) => {
  // Validate request body
  const { error, value: validatedData } = createGoalValidation.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  // Set student ID from authenticated user
  validatedData.studentId = req.user.id;
  
  // Verify references exist
  if (validatedData.courseId) {
    const course = await Course.findById(validatedData.courseId);
    if (!course) {
      return next(new AppError('Referenced course not found', 404));
    }
  }
  
  if (validatedData.assignmentId) {
    const assignment = await Assignment.findById(validatedData.assignmentId);
    if (!assignment) {
      return next(new AppError('Referenced assignment not found', 404));
    }
  }
  
  // Create the goal
  const goal = new Goal(validatedData);
  await goal.save();
  
  // Populate for response
  await goal.populate([
    { path: 'courseId', select: 'title course_type thumbnail' },
    { path: 'assignmentId', select: 'title dueDate' }
  ]);
  
  logger.info(`Goal created`, {
    goalId: goal._id,
    studentId: goal.studentId,
    category: goal.category,
    userId: req.user.id
  });
  
  res.status(201).json({
    success: true,
    message: 'Goal created successfully',
    data: { goal }
  });
});

/**
 * Update a goal
 * PUT /api/v1/goals/:goalId
 */
const updateGoal = catchAsync(async (req, res, next) => {
  const { goalId } = req.params;
  
  // Validate request body
  const { error, value: validatedData } = updateGoalValidation.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  // Find the goal
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Check authorization
  if (req.user.id !== goal.studentId.toString() && !req.user.admin_role) {
    return next(new AppError('You can only update your own goals', 403));
  }
  
  // Verify references exist if being updated
  if (validatedData.courseId) {
    const course = await Course.findById(validatedData.courseId);
    if (!course) {
      return next(new AppError('Referenced course not found', 404));
    }
  }
  
  if (validatedData.assignmentId) {
    const assignment = await Assignment.findById(validatedData.assignmentId);
    if (!assignment) {
      return next(new AppError('Referenced assignment not found', 404));
    }
  }
  
  // Store old values for logging
  const oldStatus = goal.status;
  const oldProgress = goal.progress;
  
  // Update the goal
  Object.assign(goal, validatedData);
  await goal.save();
  
  // Populate for response
  await goal.populate([
    { path: 'courseId', select: 'title course_type thumbnail' },
    { path: 'assignmentId', select: 'title dueDate' }
  ]);
  
  logger.info(`Goal updated`, {
    goalId: goal._id,
    studentId: goal.studentId,
    changes: {
      status: { from: oldStatus, to: goal.status },
      progress: { from: oldProgress, to: goal.progress }
    },
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Goal updated successfully',
    data: { goal }
  });
});

/**
 * Update goal progress
 * PATCH /api/v1/goals/:goalId/progress
 */
const updateGoalProgress = catchAsync(async (req, res, next) => {
  const { goalId } = req.params;
  
  // Validate request body
  const { error, value: validatedData } = updateProgressValidation.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  // Find the goal
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Check authorization
  if (req.user.id !== goal.studentId.toString() && !req.user.admin_role) {
    return next(new AppError('You can only update your own goals', 403));
  }
  
  const oldProgress = goal.progress;
  
  // Update progress using the model method
  await goal.updateProgress(validatedData.progress);
  
  logger.info(`Goal progress updated`, {
    goalId: goal._id,
    studentId: goal.studentId,
    progress: { from: oldProgress, to: goal.progress },
    completed: goal.status === 'completed',
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Goal progress updated successfully',
    data: { 
      goal: {
        _id: goal._id,
        progress: goal.progress,
        status: goal.status,
        completedAt: goal.completedAt
      }
    }
  });
});

/**
 * Delete a goal (soft delete by archiving)
 * DELETE /api/v1/goals/:goalId
 */
const deleteGoal = catchAsync(async (req, res, next) => {
  const { goalId } = req.params;
  const { permanent = false } = req.query;
  
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Check authorization
  if (req.user.id !== goal.studentId.toString() && !req.user.admin_role) {
    return next(new AppError('You can only delete your own goals', 403));
  }
  
  if (permanent === 'true' && req.user.admin_role) {
    // Hard delete (admin only)
    await Goal.findByIdAndDelete(goalId);
    logger.info(`Goal permanently deleted`, {
      goalId,
      studentId: goal.studentId,
      userId: req.user.id
    });
  } else {
    // Soft delete (archive)
    goal.isArchived = true;
    await goal.save();
    logger.info(`Goal archived`, {
      goalId,
      studentId: goal.studentId,
      userId: req.user.id
    });
  }
  
  res.status(200).json({
    success: true,
    message: permanent === 'true' ? 'Goal permanently deleted' : 'Goal archived successfully'
  });
});

/**
 * Add milestone to a goal
 * POST /api/v1/goals/:goalId/milestones
 */
const addMilestone = catchAsync(async (req, res, next) => {
  const { goalId } = req.params;
  
  // Validate request body
  const { error, value: validatedData } = addMilestoneValidation.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Check authorization
  if (req.user.id !== goal.studentId.toString() && !req.user.admin_role) {
    return next(new AppError('You can only modify your own goals', 403));
  }
  
  // Add milestone using model method
  await goal.addMilestone(validatedData.milestone);
  
  logger.info(`Milestone added to goal`, {
    goalId,
    milestoneTitle: validatedData.milestone.title,
    totalMilestones: goal.milestones.length,
    userId: req.user.id
  });
  
  res.status(201).json({
    success: true,
    message: 'Milestone added successfully',
    data: { 
      milestone: goal.milestones[goal.milestones.length - 1],
      totalMilestones: goal.milestones.length,
      progress: goal.progress
    }
  });
});

/**
 * Complete a milestone
 * PATCH /api/v1/goals/:goalId/milestones/:milestoneId/complete
 */
const completeMilestone = catchAsync(async (req, res, next) => {
  const { goalId, milestoneId } = req.params;
  
  const goal = await Goal.findById(goalId);
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Check authorization
  if (req.user.id !== goal.studentId.toString() && !req.user.admin_role) {
    return next(new AppError('You can only modify your own goals', 403));
  }
  
  const milestone = goal.milestones.id(milestoneId);
  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }
  
  if (milestone.completed) {
    return next(new AppError('Milestone is already completed', 400));
  }
  
  // Complete milestone using model method
  await goal.completeMilestone(milestoneId);
  
  logger.info(`Milestone completed`, {
    goalId,
    milestoneId,
    milestoneTitle: milestone.title,
    goalProgress: goal.progress,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Milestone completed successfully',
    data: {
      milestone: goal.milestones.id(milestoneId),
      goalProgress: goal.progress,
      goalStatus: goal.status,
      completedMilestones: goal.completedMilestones,
      totalMilestones: goal.totalMilestones
    }
  });
});

/**
 * Get goal statistics for a student
 * GET /api/v1/goals/student/:studentId/stats
 */
const getGoalStats = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  
  // Validate query parameters
  const { error, value: queryParams } = statsQueryValidation.validate(req.query);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  // Check authorization
  if (req.user.id !== studentId && !req.user.admin_role) {
    return next(new AppError('You can only view your own statistics', 403));
  }
  
  // Build date filter based on period
  let dateFilter = {};
  if (queryParams.period !== 'all') {
    const now = new Date();
    const startDate = new Date();
    
    switch (queryParams.period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    dateFilter.createdAt = { $gte: startDate };
  }
  
  // Build base query
  const baseQuery = { 
    studentId, 
    isArchived: false,
    ...dateFilter
  };
  
  if (queryParams.category) {
    baseQuery.category = queryParams.category;
  }
  
  // Execute aggregation pipeline for comprehensive stats
  const stats = await Goal.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: null,
        totalGoals: { $sum: 1 },
        completedGoals: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        activeGoals: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        pausedGoals: {
          $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
        },
        overdueGoals: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'active'] },
                  { $lt: ['$deadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        averageProgress: { $avg: '$progress' },
        totalMilestones: { $sum: { $size: '$milestones' } },
        completedMilestones: {
          $sum: {
            $size: {
              $filter: {
                input: '$milestones',
                cond: { $eq: ['$$this.completed', true] }
              }
            }
          }
        }
      }
    }
  ]);
  
  // Get category breakdown
  const categoryStats = await Goal.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        averageProgress: { $avg: '$progress' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Get priority breakdown
  const priorityStats = await Goal.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);
  
  // Format response
  const result = stats[0] || {
    totalGoals: 0,
    completedGoals: 0,
    activeGoals: 0,
    pausedGoals: 0,
    overdueGoals: 0,
    averageProgress: 0,
    totalMilestones: 0,
    completedMilestones: 0
  };
  
  result.completionRate = result.totalGoals > 0 
    ? Math.round((result.completedGoals / result.totalGoals) * 100) 
    : 0;
  
  result.milestoneCompletionRate = result.totalMilestones > 0
    ? Math.round((result.completedMilestones / result.totalMilestones) * 100)
    : 0;
  
  result.averageProgress = Math.round(result.averageProgress || 0);
  
  logger.info(`Goal statistics retrieved`, {
    studentId,
    period: queryParams.period,
    category: queryParams.category,
    totalGoals: result.totalGoals,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: 'Goal statistics retrieved successfully',
    data: {
      overview: result,
      categories: categoryStats,
      priorities: priorityStats,
      period: queryParams.period
    }
  });
});

/**
 * Bulk update goals
 * PATCH /api/v1/goals/bulk-update
 */
const bulkUpdateGoals = catchAsync(async (req, res, next) => {
  // Validate request body
  const { error, value: validatedData } = bulkUpdateValidation.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  
  const { goalIds, updates } = validatedData;
  
  // Find goals and verify ownership
  const goals = await Goal.find({ 
    _id: { $in: goalIds },
    studentId: req.user.id,
    isArchived: false
  });
  
  if (goals.length !== goalIds.length) {
    return next(new AppError('Some goals not found or not owned by you', 404));
  }
  
  // Perform bulk update
  const result = await Goal.updateMany(
    { 
      _id: { $in: goalIds },
      studentId: req.user.id 
    },
    { $set: updates }
  );
  
  logger.info(`Bulk goal update`, {
    goalIds,
    updates,
    modifiedCount: result.modifiedCount,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} goals updated successfully`,
    data: {
      modifiedCount: result.modifiedCount,
      updates
    }
  });
});

export {
  getStudentGoals,
  getGoalById,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
  addMilestone,
  completeMilestone,
  getGoalStats,
  bulkUpdateGoals
}; 