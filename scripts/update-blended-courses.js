require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/course-model');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function updateBlendedCourses() {
  try {
    const result = await Course.updateMany(
      { class_type: 'Blended Courses' },
      { $set: { course_grade: 'All Grades' } }
    );

    console.log(`Updated ${result.modifiedCount} blended courses`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating blended courses:', error);
    process.exit(1);
  }
}

updateBlendedCourses();