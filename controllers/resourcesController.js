import Resource from "../models/resources.js";

export const createResource = async (req, res) => {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json({
      message: "Resource created successfully",
      resource,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating resource",
      error: error.message,
    });
  }
};

export const getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.status(200).json({
      message: "Resources fetched successfully",
      resources,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching resources",
      error: error.message,
    });
  }
};

export const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        message: "Resource not found",
      });
    }
    res.status(200).json({
      message: "Resource fetched successfully",
      resource,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching resource",
      error: error.message,
    });
  }
};

export const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!resource) {
      return res.status(404).json({
        message: "Resource not found",
      });
    }
    res.status(200).json({
      message: "Resource updated successfully",
      resource,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating resource",
      error: error.message,
    });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) {
      return res.status(404).json({
        message: "Resource not found",
      });
    }
    res.status(200).json({
      message: "Resource deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting resource",
      error: error.message,
    });
  }
};
