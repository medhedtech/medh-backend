import Joi from 'joi';
import logger from '../utils/logger.js';

const assignmentSchema = {
  create: Joi.object({
    courseId: Joi.string().required().messages({
      'string.empty': 'Course ID is required',
      'any.required': 'Course ID is required'
    }),
    title: Joi.string().required().trim().min(3).max(100).messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),
    description: Joi.string().required().trim().min(10).messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long'
    }),
    deadline: Joi.date().greater('now').required().messages({
      'date.greater': 'Deadline must be in the future',
      'any.required': 'Deadline is required'
    }),
    instructor_id: Joi.string().required().messages({
      'string.empty': 'Instructor ID is required',
      'any.required': 'Instructor ID is required'
    }),
    assignment_resources: Joi.array().items(Joi.string()).default([])
  }),

  submission: Joi.object({
    assignmentId: Joi.string().required().messages({
      'string.empty': 'Assignment ID is required',
      'any.required': 'Assignment ID is required'
    }),
    studentId: Joi.string().required().messages({
      'string.empty': 'Student ID is required',
      'any.required': 'Student ID is required'
    }),
    submissionFile: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.min': 'At least one submission file is required',
      'any.required': 'Submission file is required'
    })
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(5),
    filter: Joi.string().valid('History', 'Today').optional()
  })
};

// Automatically tracked for all requests
logger.info('Custom API Event', {
  action: 'someAction',
  data: someData
});

export default assignmentSchema; 