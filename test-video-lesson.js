// Test script to add video lessons to a course curriculum
// Run with: node test-video-lesson.js

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const COURSE_ID = '67e14360cd2f46d71bf0587c'; // Your blended course ID
const WEEK_ID = 'week_1'; // Adjust based on your curriculum structure

// Sample video lesson data
const videoLessonData = {
  title: "Introduction to JavaScript Fundamentals",
  description: "Learn the basics of JavaScript programming language including variables, functions, and control structures.",
  video_url: "https://www.youtube.com/watch?v=W6NZfCO5SIk", // Sample JavaScript tutorial video
  duration: "25 minutes",
  video_thumbnail: "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
  order: 1,
  isPreview: true // Make this a preview lesson
};

// Function to add video lesson using the new endpoint
async function addVideoLesson() {
  try {
    console.log('Adding video lesson to course...');
    
    const response = await axios.post(
      `${BASE_URL}/api/v1/tcourse/blended/${COURSE_ID}/curriculum/weeks/${WEEK_ID}/video-lessons`,
      videoLessonData,
      {
        headers: {
          'Content-Type': 'application/json',
          // Add authentication header if needed
          // 'Authorization': 'Bearer YOUR_JWT_TOKEN'
        }
      }
    );

    console.log('✅ Video lesson added successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error adding video lesson:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Function to get curriculum and verify the video lesson was added
async function getCurriculum() {
  try {
    console.log('\nFetching updated curriculum...');
    
    const response = await axios.get(
      `${BASE_URL}/api/v1/tcourse/blended/${COURSE_ID}/curriculum`
    );

    console.log('✅ Curriculum fetched successfully!');
    
    // Find the week and check for video lessons
    const curriculum = response.data.data.curriculum;
    const targetWeek = curriculum.find(week => week.id === WEEK_ID);
    
    if (targetWeek && targetWeek.lessons) {
      console.log(`\n📚 Lessons in ${WEEK_ID}:`);
      targetWeek.lessons.forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.title}`);
        console.log(`   Type: ${lesson.lessonType || 'text'}`);
        if (lesson.video_url) {
          console.log(`   Video URL: ${lesson.video_url}`);
          console.log(`   Duration: ${lesson.duration || 'Not specified'}`);
        }
        console.log(`   Preview: ${lesson.isPreview ? 'Yes' : 'No'}`);
        console.log(`   ID: ${lesson.id}`);
        console.log('');
      });
    } else {
      console.log(`No lessons found in ${WEEK_ID}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching curriculum:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Function to add multiple video lessons
async function addMultipleVideoLessons() {
  const videoLessons = [
    {
      title: "JavaScript Variables and Data Types",
      description: "Understanding variables, primitive data types, and basic operations in JavaScript.",
      video_url: "https://www.youtube.com/watch?v=9Q-Zn5lkpbQ",
      duration: "18 minutes",
      order: 2,
      isPreview: false
    },
    {
      title: "Functions in JavaScript",
      description: "Learn how to create and use functions, including arrow functions and parameters.",
      video_url: "https://www.youtube.com/watch?v=gigtS_5KOqo",
      duration: "22 minutes",
      order: 3,
      isPreview: false
    },
    {
      title: "JavaScript Arrays and Objects",
      description: "Working with arrays and objects, the fundamental data structures in JavaScript.",
      video_url: "https://www.youtube.com/watch?v=7q5hNF2ZRek",
      duration: "30 minutes",
      order: 4,
      isPreview: false
    }
  ];

  console.log('\n🚀 Adding multiple video lessons...');
  
  for (let i = 0; i < videoLessons.length; i++) {
    const lesson = videoLessons[i];
    try {
      console.log(`\nAdding lesson ${i + 1}: ${lesson.title}`);
      
      const response = await axios.post(
        `${BASE_URL}/api/v1/tcourse/blended/${COURSE_ID}/curriculum/weeks/${WEEK_ID}/video-lessons`,
        lesson,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log(`✅ Added: ${lesson.title}`);
    } catch (error) {
      console.error(`❌ Failed to add lesson: ${lesson.title}`);
      if (error.response) {
        console.error('Error:', error.response.data.message);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Main execution
async function main() {
  console.log('🎬 Video Lesson Test Script');
  console.log('============================');
  console.log(`Course ID: ${COURSE_ID}`);
  console.log(`Week ID: ${WEEK_ID}`);
  console.log('');

  // First, get current curriculum
  await getCurriculum();
  
  // Add a single video lesson
  await addVideoLesson();
  
  // Add multiple video lessons
  await addMultipleVideoLessons();
  
  // Get updated curriculum
  await getCurriculum();
  
  console.log('\n🎉 Test completed!');
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  addVideoLesson,
  getCurriculum,
  addMultipleVideoLessons
}; 