import { Course, Batch } from "../models/course-model.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";

/**
 * Create a new batch for a course
 * @route POST /api/courses/:courseId/batches
 * @access Admin only
 */
export const createBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const batchData = req.body;
    const adminId = req.user.id;

    // Create the batch using the Course static method
    const newBatch = await Course.createBatch(courseId, batchData, adminId);

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: newBatch,
    });
  } catch (error) {
    console.error("Error creating batch:", error.message);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Assign an instructor to a batch
 * @route PUT /api/batches/:batchId/assign-instructor/:instructorId
 * @access Admin only
 */
export const assignInstructorToBatch = async (req, res) => {
  try {
    const { batchId, instructorId } = req.params;
    const adminId = req.user.id;

    // Assign instructor using the Course static method
    const updatedBatch = await Course.assignInstructorToBatch(
      batchId,
      instructorId,
      adminId
    );

    res.status(200).json({
      success: true,
      message: "Instructor assigned to batch successfully",
      data: updatedBatch,
    });
  } catch (error) {
    console.error("Error assigning instructor:", error.message);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all batches for a course
 * @route GET /api/courses/:courseId/batches
 * @access Admin, Instructor
 */
export const getBatchesForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const courseExists = await Course.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const batches = await Course.getBatchesForCourse(courseId);

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batches",
    });
  }
};

/**
 * Get details of a specific batch
 * @route GET /api/batches/:batchId
 * @access Admin, Instructor, Enrolled Students
 */
export const getBatchDetails = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Find batch with populated instructor and course details
    const batch = await Batch.findById(batchId)
      .populate("assigned_instructor")
      .populate("course", "course_title course_image slug");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error("Error fetching batch details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batch details",
    });
  }
};

/**
 * Update a batch
 * @route PUT /api/batches/:batchId
 * @access Admin only
 */
export const updateBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const updateData = req.body;
    const adminId = req.user.id;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Update the batch with the provided data
    Object.keys(updateData).forEach(key => {
      if (key !== 'course' && key !== 'batch_code') { // Prevent changing course reference or batch code
        batch[key] = updateData[key];
      }
    });
    
    // Track who updated the batch
    batch.updated_by = adminId;

    const updatedBatch = await batch.save();

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: updatedBatch,
    });
  } catch (error) {
    console.error("Error updating batch:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a batch
 * @route DELETE /api/batches/:batchId
 * @access Admin only
 */
export const deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check if batch has enrolled students
    if (batch.enrolled_students > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete batch with enrolled students",
      });
    }

    // Delete the batch
    await Batch.findByIdAndDelete(batchId);

    res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting batch:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while deleting batch",
    });
  }
}; 