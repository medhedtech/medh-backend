import Grievance from "../models/grievance.js";

export const getAllGrievances = async (req, res) => {
  try {
    const grievances = await Grievance.find();
    res.status(200).json({
      message: "Grievances fetched successfully",
      grievances,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching grievances",
      error: error.message,
    });
  }
};

export const createGrievance = async (req, res) => {
  try {
    const grievance = await Grievance.create(req.body);
    res.status(201).json({
      message: "Grievance created successfully",
      grievance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating grievance",
      error: error.message,
    });
  }
};

export const updateGrievance = async (req, res) => {
  try {
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!grievance) {
      return res.status(404).json({
        message: "Grievance not found",
      });
    }
    res.status(200).json({
      message: "Grievance updated successfully",
      grievance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating grievance",
      error: error.message,
    });
  }
};

export const deleteGrievance = async (req, res) => {
  try {
    const grievance = await Grievance.findByIdAndDelete(req.params.id);
    if (!grievance) {
      return res.status(404).json({
        message: "Grievance not found",
      });
    }
    res.status(200).json({
      message: "Grievance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting grievance",
      error: error.message,
    });
  }
};

export const getGrievancesByStatus = async (req, res) => {
  try {
    const grievances = await Grievance.find({
      status: req.params.status,
    }).populate("userId");
    res.status(200).json(grievances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGrievanceById = async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) {
      return res.status(404).json({
        message: "Grievance not found",
      });
    }
    res.status(200).json({
      message: "Grievance fetched successfully",
      grievance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching grievance",
      error: error.message,
    });
  }
};

export const getGrievancesByUser = async (req, res) => {
  try {
    const grievances = await Grievance.find({ userId: req.params.userId });
    res.status(200).json({
      message: "Grievances fetched successfully",
      grievances,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching grievances",
      error: error.message,
    });
  }
};
