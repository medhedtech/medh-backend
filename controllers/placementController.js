import Placement from "../models/placement.js";

export const getAllPlacements = async (req, res) => {
  try {
    const placements = await Placement.find().populate("studentId");
    res.status(200).json(placements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addPlacement = async (req, res) => {
  const {
    studentId,
    full_name,
    area_of_interest,
    message,
    course_completed_year,
    completed_course,
    email,
    city,
    phone_number,
  } = req.body;
  try {
    const newPlacement = new Placement({
      studentId,
      full_name,
      area_of_interest,
      message,
      course_completed_year,
      completed_course,
      email,
      city,
      phone_number,
    });
    await newPlacement.save();
    res.status(201).json(newPlacement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
