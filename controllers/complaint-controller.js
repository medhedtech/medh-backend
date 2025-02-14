const Complaint = require("../models/complaint");

exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId")
      .sort({ dateFiled: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createComplaint = async (req, res) => {
  const { userId, name, description } = req.body;
  try {
    const newComplaint = new Complaint({
      userId,
      name,
      description,
      role: ["student"],
    });
    await newComplaint.save();
    res.status(201).json(newComplaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateComplaint = async (req, res) => {
  const { status, resolutionDate } = req.body;
  try {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, resolutionDate },
      { new: true }
    );
    res.status(200).json(updatedComplaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete complaint by ID
exports.deleteComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);
    if (!deletedComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    res.status(200).json({ message: "Complaint deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete complaint", error: error.message });
  }
};

exports.getComplaintsByStatus = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      status: req.params.status,
    }).populate("userId");
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate the input status
  const validStatuses = ["open", "in-progress", "resolved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.status(200).json(updatedComplaint);
  } catch (error) {
    res.status(500).json({
      message: "Error updating complaint status",
      error: error.message,
    });
  }
};

exports.getAllInstructorComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId")
      .sort({ dateFiled: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createInstructorComplaints = async (req, res) => {
  const { userId, name, description } = req.body;
  try {
    const newComplaint = new Complaint({
      userId,
      name,
      description,
      role: ["instructor"],
    });
    await newComplaint.save();
    res.status(201).json(newComplaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllEmployeeComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId")
      .sort({ dateFiled: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createEmployeeComplaints = async (req, res) => {
  const { userId, name, description } = req.body;
  try {
    const newComplaint = new Complaint({
      userId,
      name,
      description,
      role: ["coorporate-student"],
    });
    await newComplaint.save();
    res.status(201).json(newComplaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
