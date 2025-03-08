// Script to list courses from the database
require('dotenv').config();
const mongoose = require('mongoose');
const { ENV_VARS } = require('./config/envVars');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(ENV_VARS.MONGO_URI);
    console.log('MongoDB connected!');
    
    // Get Course model
    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');
    
    // Find a few courses
    const courses = await Course.find().limit(5).select('_id course_title brochures');
    
    console.log('Found courses:', courses);
    
    // Disconnect
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

connectDB(); 