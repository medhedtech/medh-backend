const Resource = require('../models/resources');

exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createResource = async (req, res) => {
  const { title, description, fileUrl, courseId } = req.body;
  try {
    const newResource = new Resource({ title, description, fileUrl, courseId });
    await newResource.save();
    res.status(201).json(newResource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};