import Joi from 'joi';

// Goal categories enum
const GOAL_CATEGORIES = ['course', 'assignment', 'exam', 'quiz', 'project', 'skill', 'career', 'personal'];
const GOAL_STATUSES = ['active', 'completed', 'paused', 'cancelled'];
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'expert'];
const SOURCE_TYPES = ['self_created', 'instructor_assigned', 'system_generated'];
const REMINDER_FREQUENCIES = ['daily', 'weekly', 'monthly'];

// Milestone validation schema
const milestoneSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Milestone title is required',
      'string.max': 'Milestone title cannot exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Milestone description cannot exceed 500 characters'
    }),
  completed: Joi.boolean()
    .default(false),
  completedAt: Joi.date()
    .optional(),
  dueDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Milestone due date must be in the future'
    })
});

// Reminder settings validation schema
const reminderSettingsSchema = Joi.object({
  enabled: Joi.boolean()
    .default(false),
  frequency: Joi.string()
    .valid(...REMINDER_FREQUENCIES)
    .default('weekly'),
  lastReminder: Joi.date()
    .optional()
});

// Metadata validation schema
const metadataSchema = Joi.object({
  estimatedHours: Joi.number()
    .min(0)
    .max(1000)
    .optional()
    .messages({
      'number.min': 'Estimated hours cannot be negative',
      'number.max': 'Estimated hours cannot exceed 1000'
    }),
  actualHours: Joi.number()
    .min(0)
    .max(1000)
    .default(0)
    .messages({
      'number.min': 'Actual hours cannot be negative',
      'number.max': 'Actual hours cannot exceed 1000'
    }),
  difficulty: Joi.string()
    .valid(...DIFFICULTY_LEVELS)
    .default('medium'),
  source: Joi.string()
    .valid(...SOURCE_TYPES)
    .default('self_created')
});

// Create goal validation
const createGoalValidation = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Goal title is required',
      'string.max': 'Goal title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Goal description cannot exceed 1000 characters'
    }),
  category: Joi.string()
    .valid(...GOAL_CATEGORIES)
    .required()
    .messages({
      'any.only': `Goal category must be one of: ${GOAL_CATEGORIES.join(', ')}`,
      'any.required': 'Goal category is required'
    }),
  progress: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Progress cannot be less than 0',
      'number.max': 'Progress cannot exceed 100'
    }),
  deadline: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'Deadline must be in the future',
      'any.required': 'Goal deadline is required'
    }),
  status: Joi.string()
    .valid(...GOAL_STATUSES)
    .default('active'),
  priority: Joi.string()
    .valid(...PRIORITY_LEVELS)
    .default('medium'),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid course ID format'
    }),
  assignmentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid assignment ID format'
    }),
  milestones: Joi.array()
    .items(milestoneSchema)
    .max(20)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 20 milestones per goal'
    }),
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .max(50)
        .messages({
          'string.max': 'Tag cannot exceed 50 characters'
        })
    )
    .max(10)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 10 tags per goal'
    }),
  reminderSettings: reminderSettingsSchema
    .optional(),
  metadata: metadataSchema
    .optional()
});

// Update goal validation (all fields optional except ID)
const updateGoalValidation = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.empty': 'Goal title cannot be empty',
      'string.max': 'Goal title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Goal description cannot exceed 1000 characters'
    }),
  category: Joi.string()
    .valid(...GOAL_CATEGORIES)
    .optional()
    .messages({
      'any.only': `Goal category must be one of: ${GOAL_CATEGORIES.join(', ')}`
    }),
  progress: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Progress cannot be less than 0',
      'number.max': 'Progress cannot exceed 100'
    }),
  deadline: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Deadline must be in the future'
    }),
  status: Joi.string()
    .valid(...GOAL_STATUSES)
    .optional(),
  priority: Joi.string()
    .valid(...PRIORITY_LEVELS)
    .optional(),
  courseId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid course ID format'
    }),
  assignmentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid assignment ID format'
    }),
  milestones: Joi.array()
    .items(milestoneSchema)
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 milestones per goal'
    }),
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .max(50)
        .messages({
          'string.max': 'Tag cannot exceed 50 characters'
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags per goal'
    }),
  reminderSettings: reminderSettingsSchema
    .optional(),
  metadata: metadataSchema
    .optional(),
  isArchived: Joi.boolean()
    .optional()
});

// Query parameters validation
const getGoalsQueryValidation = Joi.object({
  status: Joi.string()
    .valid(...GOAL_STATUSES)
    .optional(),
  category: Joi.string()
    .valid(...GOAL_CATEGORIES)
    .optional(),
  priority: Joi.string()
    .valid(...PRIORITY_LEVELS)
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  sort: Joi.string()
    .valid('deadline', 'priority', 'progress', 'createdAt', 'title')
    .default('deadline')
    .optional(),
  order: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .optional(),
  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 100 characters'
    }),
  tags: Joi.alternatives()
    .try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    )
    .optional(),
  overdue: Joi.boolean()
    .optional(),
  upcoming: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.min': 'Upcoming days must be at least 1',
      'number.max': 'Upcoming days cannot exceed 365'
    })
});

// Progress update validation
const updateProgressValidation = Joi.object({
  progress: Joi.number()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.min': 'Progress cannot be less than 0',
      'number.max': 'Progress cannot exceed 100',
      'any.required': 'Progress value is required'
    })
});

// Milestone operations validation
const addMilestoneValidation = Joi.object({
  milestone: milestoneSchema.required()
});

const updateMilestoneValidation = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Milestone title cannot be empty',
      'string.max': 'Milestone title cannot exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Milestone description cannot exceed 500 characters'
    }),
  completed: Joi.boolean()
    .optional(),
  dueDate: Joi.date()
    .min('now')
    .allow(null)
    .optional()
    .messages({
      'date.min': 'Milestone due date must be in the future'
    })
});

// Bulk operations validation
const bulkUpdateValidation = Joi.object({
  goalIds: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'Invalid goal ID format'
        })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one goal ID is required',
      'array.max': 'Cannot update more than 50 goals at once'
    }),
  updates: Joi.object({
    status: Joi.string()
      .valid(...GOAL_STATUSES)
      .optional(),
    priority: Joi.string()
      .valid(...PRIORITY_LEVELS)
      .optional(),
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .optional(),
    isArchived: Joi.boolean()
      .optional()
  }).min(1).required()
});

// Statistics query validation
const statsQueryValidation = Joi.object({
  period: Joi.string()
    .valid('week', 'month', 'quarter', 'year', 'all')
    .default('month')
    .optional(),
  category: Joi.string()
    .valid(...GOAL_CATEGORIES)
    .optional()
});

export {
  createGoalValidation,
  updateGoalValidation,
  getGoalsQueryValidation,
  updateProgressValidation,
  addMilestoneValidation,
  updateMilestoneValidation,
  bulkUpdateValidation,
  statsQueryValidation,
  // Export constants for reuse
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  PRIORITY_LEVELS,
  DIFFICULTY_LEVELS,
  SOURCE_TYPES,
  REMINDER_FREQUENCIES
}; 