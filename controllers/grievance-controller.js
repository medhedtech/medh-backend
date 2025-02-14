const Grievance = require("../models/grievance")

exports.getAllGrievances = async (req, res) => {
  try {
    const grievances = await Grievance.find().populate("userId");
    res.status(200).json(grievances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createGrievance = async (req, res) => {
  const { userId, name, description } = req.body;
  console.log("HGKHBJKNML:", req.body)
  try {
    const newGrievance = new Grievance({
      userId,
      name,
      description,
      role: ["student"],
    });
    await newGrievance.save();
    res.status(201).json(newGrievance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateGrievance = async (req, res) => {
  const { status, resolutionDate } = req.body;
  try {
    const updatedGrievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      { status, resolutionDate },
      { new: true }
    );
    res.status(200).json(updatedGrievance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteGrievance = async (req, res) => {
  try {
    await Grievance.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Grievance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGrievancesByStatus = async (req, res) => {
  try {
    const grievances = await Grievance.find({
      status: req.params.status,
    }).populate("userId");
    res.status(200).json(grievances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
