import express from 'express';
import {
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
} from '../controllers/goalController.js';
import { authenticateToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/v1/goals/student/:studentId
 * @desc    Get all goals for a specific student
 * @access  Private (Own goals or Admin)
 * @query   status, category, priority, limit, page, sort, order, search, tags, overdue, upcoming
 */
router.get('/student/:studentId', getStudentGoals);

/**
 * @route   GET /api/v1/goals/student/:studentId/stats
 * @desc    Get goal statistics for a student
 * @access  Private (Own stats or Admin)
 * @query   period, category
 */
router.get('/student/:studentId/stats', getGoalStats);

/**
 * @route   POST /api/v1/goals
 * @desc    Create a new goal
 * @access  Private
 * @body    title, description, category, deadline, priority, courseId, assignmentId, milestones, tags, reminderSettings, metadata
 */
router.post('/', createGoal);

/**
 * @route   PATCH /api/v1/goals/bulk-update
 * @desc    Bulk update multiple goals
 * @access  Private
 * @body    goalIds, updates
 */
router.patch('/bulk-update', bulkUpdateGoals);

/**
 * @route   GET /api/v1/goals/:goalId
 * @desc    Get a specific goal by ID
 * @access  Private (Own goal or Admin)
 */
router.get('/:goalId', getGoalById);

/**
 * @route   PUT /api/v1/goals/:goalId
 * @desc    Update a goal
 * @access  Private (Own goal or Admin)
 * @body    title, description, category, progress, deadline, status, priority, courseId, assignmentId, milestones, tags, reminderSettings, metadata, isArchived
 */
router.put('/:goalId', updateGoal);

/**
 * @route   PATCH /api/v1/goals/:goalId/progress
 * @desc    Update goal progress
 * @access  Private (Own goal or Admin)
 * @body    progress
 */
router.patch('/:goalId/progress', updateGoalProgress);

/**
 * @route   DELETE /api/v1/goals/:goalId
 * @desc    Delete (archive) a goal
 * @access  Private (Own goal or Admin)
 * @query   permanent (admin only)
 */
router.delete('/:goalId', deleteGoal);

/**
 * @route   POST /api/v1/goals/:goalId/milestones
 * @desc    Add a milestone to a goal
 * @access  Private (Own goal or Admin)
 * @body    milestone
 */
router.post('/:goalId/milestones', addMilestone);

/**
 * @route   PATCH /api/v1/goals/:goalId/milestones/:milestoneId/complete
 * @desc    Mark a milestone as completed
 * @access  Private (Own goal or Admin)
 */
router.patch('/:goalId/milestones/:milestoneId/complete', completeMilestone);

export default router; 