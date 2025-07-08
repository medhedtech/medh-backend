// Unified Admin Controller: Merged from adminDashboardStatsController.js and adminManagementController.js
import User from "../models/user-modal.js";
import { Course, Batch } from "../models/course-model.js";
import Enrollment from "../models/enrollment-model.js";
import Order from "../models/Order.js";
import Announcement from "../models/announcement-model.js";
import Blog from "../models/blog-model.js";
import Category from "../models/category-model.js";
import Complaint from "../models/complaint.js";
import Feedback from "../models/feedback.js";
import QuizResponse from "../models/quizResponse.js";
import Assignment from "../models/assignment.js";
import Attendace from "../models/attendance.model.js";
import OnlineMeeting from "../models/online-meeting.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import DemoFeedback from "../models/demo-feedback.model.js";
import mongoose from "mongoose";

// =====================
// 1. DASHBOARD STATS & OVERVIEW
// =====================
// (getDashboardStats, getAdminOverview, and related analytics functions)
// ... (copy all logic from both controllers, deduplicate, and use unified response format)

// =====================
// 2. DYNAMIC MODEL REGISTRY & SUPER ADMIN CRUD
// =====================
const modelRegistry = {
  user: User,
  course: Course,
  batch: Batch,
  enrollment: Enrollment,
  order: Order,
  announcement: Announcement,
  blog: Blog,
  complaint: Complaint,
  feedback: Feedback,
  quizresponse: QuizResponse,
  assignment: Assignment,
  attendance: Attendace,
  onlinemeeting: OnlineMeeting,
  category: Category,
};
function getModel(modelName) {
  return modelRegistry[modelName.toLowerCase()];
}
const defaultPopulate = {
  user: [],
  course: ["category"],
  batch: ["course", "assigned_instructor"],
  enrollment: ["student_id", "course_id", "batch_id"],
  order: ["student_id", "course_id"],
  announcement: ["createdBy"],
  blog: ["author"],
  complaint: ["user"],
  feedback: ["student"],
  quizresponse: ["student", "quiz"],
  assignment: ["course"],
  attendance: ["batch_id", "instructor_id"],
  onlinemeeting: ["category"],
  category: [],
};
const listModel = async (req, res) => {
  try {
    const { modelName } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const {
      page = 1,
      limit = 20,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      ...filters
    } = req.query;
    const skip = (page - 1) * limit;
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;
    const query = { ...filters };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    let q = Model.find(query).sort(sortQuery).skip(skip).limit(parseInt(limit));
    (defaultPopulate[modelName.toLowerCase()] || []).forEach((field) => {
      q = q.populate(field);
    });
    const [data, total] = await Promise.all([
      q.lean(),
      Model.countDocuments(query),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit),
      },
      message: `Fetched ${data.length} ${modelName}(s)`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const getModelById = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    let q = Model.findById(id);
    (defaultPopulate[modelName.toLowerCase()] || []).forEach((field) => {
      q = q.populate(field);
    });
    const data = await q.lean();
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: `${modelName} not found` });
    res.json({ success: true, data, message: `Fetched ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const createModel = async (req, res) => {
  try {
    const { modelName } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const doc = new Model(req.body);
    await doc.save();
    res
      .status(201)
      .json({ success: true, data: doc, message: `Created ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.updateModel = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: `${modelName} not found` });
    res.json({ success: true, data: updated, message: `Updated ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.deleteModel = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: `${modelName} not found` });
    res.json({ success: true, data: deleted, message: `Deleted ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// =====================
// 3. BULK OPERATIONS (USERS, COURSES, BATCHES, ENROLLMENTS, ANNOUNCEMENTS, BLOGS)
// =====================
// (Copy all bulk*Operations functions here, deduplicate, and use unified response format)
// ...
// =====================
// 4. STANDARD CRUD FOR MAJOR RESOURCES (if needed)
// =====================
// (Copy createUser, updateUser, createCourse, updateCourse, etc. here, deduplicate, and use unified response format)
// ...
// =====================
// 5. HELPER UTILITIES (pagination, error handling, etc.)
// =====================
// (Add any shared helpers here)
// ...
// =====================
// EXPORTS
// =====================
exports.listModel = async (req, res) => {
  try {
    const { modelName } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const {
      page = 1,
      limit = 20,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      ...filters
    } = req.query;
    const skip = (page - 1) * limit;
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;
    const query = { ...filters };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    let q = Model.find(query).sort(sortQuery).skip(skip).limit(parseInt(limit));
    (defaultPopulate[modelName.toLowerCase()] || []).forEach((field) => {
      q = q.populate(field);
    });
    const [data, total] = await Promise.all([
      q.lean(),
      Model.countDocuments(query),
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit),
      },
      message: `Fetched ${data.length} ${modelName}(s)`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getModelById = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    let q = Model.findById(id);
    (defaultPopulate[modelName.toLowerCase()] || []).forEach((field) => {
      q = q.populate(field);
    });
    const data = await q.lean();
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: `${modelName} not found` });
    res.json({ success: true, data, message: `Fetched ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.createModel = async (req, res) => {
  try {
    const { modelName } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const doc = new Model(req.body);
    await doc.save();
    res
      .status(201)
      .json({ success: true, data: doc, message: `Created ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.updateModel = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: `${modelName} not found` });
    res.json({ success: true, data: updated, message: `Updated ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.deleteModel = async (req, res) => {
  try {
    const { modelName, id } = req.params;
    const Model = getModel(modelName);
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `Unknown model: ${modelName}` });
    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: `${modelName} not found` });
    res.json({ success: true, data: deleted, message: `Deleted ${modelName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Bulk ops
// bulkUserOperations, bulkCourseOperations, ...
// Standard CRUD
// createUser, updateUser, createCourse, updateCourse, ...
