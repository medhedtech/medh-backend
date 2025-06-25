import CourseMaterial from "../models/course-material.model.js";
import Enrollment from "../models/enrollment-model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import mongoose from "mongoose";

// Get all materials for a course
export const getCourseMaterials = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { type } = req.query;

  let query = { course: courseId, isPublished: true };
  if (type) {
    query.type = type;
  }

  const materials = await CourseMaterial.find(query)
    .sort({ order: 1, createdAt: -1 })
    .populate("lesson", "title")
    .populate("createdBy", "name");

  res.status(200).json({
    status: "success",
    data: {
      materials,
    },
  });
});

// Search materials
export const searchMaterials = catchAsync(async (req, res) => {
  const { query, type, courseId } = req.query;
  
  let filters = {};
  if (type) filters.type = type;
  if (courseId) filters.course = courseId;

  const materials = await CourseMaterial.searchMaterials(query, filters);

  res.status(200).json({
    status: "success",
    data: {
      materials,
    },
  });
});

// Get material by ID
export const getMaterialById = catchAsync(async (req, res, next) => {
  const material = await CourseMaterial.findById(req.params.id)
    .populate("lesson", "title")
    .populate("createdBy", "name");

  if (!material) {
    return next(new AppError("Material not found", 404));
  }

  // Increment views
  await material.incrementViews();

  res.status(200).json({
    status: "success",
    data: {
      material,
    },
  });
});

// Create new material
export const createMaterial = catchAsync(async (req, res) => {
  const material = await CourseMaterial.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: "success",
    data: {
      material,
    },
  });
});

// Update material
export const updateMaterial = catchAsync(async (req, res, next) => {
  const material = await CourseMaterial.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!material) {
    return next(new AppError("Material not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      material,
    },
  });
});

// Delete material
export const deleteMaterial = catchAsync(async (req, res, next) => {
  const material = await CourseMaterial.findByIdAndDelete(req.params.id);

  if (!material) {
    return next(new AppError("Material not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Record material download
export const recordDownload = catchAsync(async (req, res, next) => {
  const material = await CourseMaterial.findById(req.params.id);

  if (!material) {
    return next(new AppError("Material not found", 404));
  }

  await material.incrementDownloads();

  res.status(200).json({
    status: "success",
    message: "Download recorded successfully",
  });
});

// Get materials statistics
export const getMaterialsStats = catchAsync(async (req, res) => {
  const { courseId } = req.params;

  const stats = await CourseMaterial.aggregate([
    {
      $match: { course: mongoose.Types.ObjectId(courseId) }
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalViews: { $sum: "$meta.views" },
        totalDownloads: { $sum: "$meta.downloads" }
      }
    }
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

// Get materials from enrolled courses
export const getMaterialsFromEnrolledCourses = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { type, search } = req.query;

  // Get all courses the user is enrolled in
  const enrollments = await Enrollment.find({
    student: userId,
    status: "active" // Only get active enrollments
  }).select('course');

  const enrolledCourseIds = enrollments.map(enrollment => enrollment.course);

  // Base query for materials from enrolled courses
  let query = {
    course: { $in: enrolledCourseIds },
    isPublished: true
  };

  // Add type filter if specified
  if (type && ["document", "video", "assignment", "other"].includes(type)) {
    query.type = type;
  }

  // Add text search if specified
  if (search) {
    query.$text = { $search: search };
  }

  // Get materials with populated course and lesson info
  const materials = await CourseMaterial.find(query)
    .sort({ course: 1, order: 1, createdAt: -1 })
    .populate({
      path: "course",
      select: "title courseCode thumbnail"
    })
    .populate({
      path: "lesson",
      select: "title order"
    })
    .populate({
      path: "createdBy",
      select: "name"
    });

  // Group materials by course
  const materialsByType = {
    documents: materials.filter(m => m.type === "document"),
    videos: materials.filter(m => m.type === "video"),
    assignments: materials.filter(m => m.type === "assignment"),
    other: materials.filter(m => m.type === "other")
  };

  // Get statistics
  const stats = {
    total: materials.length,
    byType: {
      documents: materialsByType.documents.length,
      videos: materialsByType.videos.length,
      assignments: materialsByType.assignments.length,
      other: materialsByType.other.length
    }
  };

  res.status(200).json({
    status: "success",
    data: {
      stats,
      materialsByType,
      materials // Include flat list as well
    }
  });
});

// Get recent materials from enrolled courses
export const getRecentMaterials = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { limit = 5 } = req.query;

  // Get active enrollments
  const enrollments = await Enrollment.find({
    student: userId,
    status: "active"
  }).select('course');

  const enrolledCourseIds = enrollments.map(enrollment => enrollment.course);

  // Get recent materials
  const recentMaterials = await CourseMaterial.find({
    course: { $in: enrolledCourseIds },
    isPublished: true
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate({
      path: "course",
      select: "title courseCode thumbnail"
    })
    .populate({
      path: "lesson",
      select: "title"
    });

  res.status(200).json({
    status: "success",
    data: {
      materials: recentMaterials
    }
  });
}); 