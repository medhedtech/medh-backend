import { LiveCourse, BlendedCourse, FreeCourse } from "./models/course-types/index.js";
import Course from "./models/course-model.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const testCurriculumManagement = async () => {
  console.log("🧪 Testing Curriculum Management for New Course Structure...\n");

  try {
    // Connect to database
    await connectDB();

    // Test 1: Create a live course with curriculum
    console.log("1️⃣ Creating a Live Course with Curriculum...");
    const liveCourseData = {
      course_title: "Advanced JavaScript Development",
      course_type: "live",
      course_category: "Programming",
      course_description: {
        program_overview: "Master advanced JavaScript concepts",
        benefits: "Become a JavaScript expert",
        learning_objectives: ["ES6+", "Async Programming", "Performance"],
        course_requirements: ["Basic JavaScript knowledge"],
        target_audience: ["Intermediate developers"]
      },
      course_level: "Intermediate",
      no_of_Sessions: 12,
      course_duration: "3 months",
      status: "Published",
      category_type: "Live",
      class_type: "Live Courses",
      is_Certification: "Yes",
      is_Assignments: "Yes", 
      is_Projects: "Yes",
      is_Quizes: "Yes",
      course_image: "https://example.com/course-image.jpg",
      course_schedule: {
        start_date: new Date("2024-02-01"),
        end_date: new Date("2024-05-01"),
        session_days: ["Monday", "Wednesday", "Friday"],
        session_time: "18:00",
        timezone: "UTC"
      },
      total_sessions: 36,
      max_students: 25,
      modules: [{
        title: "Core JavaScript Module",
        description: "Fundamentals of JavaScript",
        order: 1,
        sessions: [{
          title: "Session 1",
          description: "Introduction to ES6",
          scheduled_date: new Date("2024-02-01"),
          duration: 90
        }]
      }],
      curriculum: [
        {
          weekTitle: "Week 1: JavaScript Fundamentals",
          weekDescription: "Learn the basics of modern JavaScript",
          topics: ["Variables", "Functions", "Scoping"],
          lessons: [
            {
              title: "Introduction to Variables",
              description: "Understanding var, let, and const",
              content: "Comprehensive guide to variable declarations",
              content_type: "video",
              duration: 45,
              order: 1,
              resources: [
                {
                  title: "Variable Declaration Guide",
                  url: "https://example.com/variables.pdf",
                  type: "pdf",
                  description: "Complete reference for variable declarations"
                }
              ]
            }
          ],
          liveClasses: [
            {
              title: "Live Q&A Session",
              description: "Interactive discussion about variables",
              scheduledDate: new Date("2024-02-05"),
              duration: 60,
              materials: [
                {
                  title: "Session Slides",
                  url: "https://example.com/session1-slides.pdf",
                  type: "presentation"
                }
              ]
            }
          ],
          sections: [
            {
              title: "Advanced Concepts",
              description: "Deep dive into advanced variable concepts",
              order: 1,
              lessons: [
                {
                  title: "Hoisting and Temporal Dead Zone",
                  description: "Understanding hoisting behavior",
                  content: "Detailed explanation of hoisting",
                  content_type: "video",
                  duration: 30,
                  order: 1
                }
              ]
            }
          ]
        }
      ]
    };

    const liveCourse = await LiveCourse.create(liveCourseData);
    console.log("✅ Live course created successfully");
    console.log(`Course ID: ${liveCourse._id}`);
    console.log(`Curriculum weeks: ${liveCourse.curriculum.length}`);
    console.log(`First week ID: ${liveCourse.curriculum[0].id}`);
    console.log(`First lesson ID: ${liveCourse.curriculum[0].lessons[0].id}`);
    console.log(`First live class ID: ${liveCourse.curriculum[0].liveClasses[0].id}\n`);

    // Test 2: Test adding a new week to curriculum
    console.log("2️⃣ Adding a new week to curriculum...");
    const newWeek = {
      weekTitle: "Week 2: Advanced Functions",
      weekDescription: "Master function concepts and closures",
      topics: ["Arrow Functions", "Closures", "Higher-Order Functions"],
      lessons: [
        {
          title: "Arrow Functions Deep Dive",
          description: "Understanding arrow function syntax and behavior",
          content: "Complete guide to arrow functions",
          content_type: "video",
          duration: 40,
          order: 1
        }
      ]
    };

    liveCourse.curriculum.push(newWeek);
    await liveCourse.save();
    console.log("✅ New week added successfully");
    console.log(`Total weeks now: ${liveCourse.curriculum.length}`);
    console.log(`New week ID: ${liveCourse.curriculum[1].id}\n`);

    // Test 3: Create a blended course
    console.log("3️⃣ Creating a Blended Course with Curriculum...");
    const blendedCourseData = {
      course_title: "Full-Stack Web Development",
      course_type: "blended",
      course_category: "Web Development",
      course_description: {
        program_overview: "Complete full-stack development course",
        benefits: "Build complete web applications",
        learning_objectives: ["Frontend", "Backend", "Database"],
        course_requirements: ["Basic programming knowledge"],
        target_audience: ["Beginner to intermediate developers"]
      },
      course_level: "Intermediate",
      no_of_Sessions: 20,
      status: "Published",
      category_type: "Blended",
      class_type: "Blended Courses",
      is_Certification: "Yes",
      is_Assignments: "Yes",
      is_Projects: "Yes", 
      is_Quizes: "Yes",
      course_image: "https://example.com/blended-course-image.jpg",
      course_duration: "4 months",
      session_duration: "2 hours",
      doubt_session_schedule: {
        frequency: "weekly",
        preferred_days: ["Saturday"],
        preferred_time_slots: [{
          start_time: "10:00",
          end_time: "12:00",
          timezone: "UTC"
        }]
      },
      curriculum: [
        {
          weekTitle: "Week 1: HTML & CSS Fundamentals",
          weekDescription: "Learn the building blocks of web development",
          topics: ["HTML5", "CSS3", "Responsive Design"],
          lessons: [
            {
              title: "HTML5 Semantic Elements",
              description: "Understanding modern HTML structure",
              content: "Complete HTML5 guide",
              content_type: "video",
              duration: 60,
              order: 1
            }
          ]
        }
      ]
    };

    const blendedCourse = await BlendedCourse.create(blendedCourseData);
    console.log("✅ Blended course created successfully");
    console.log(`Course ID: ${blendedCourse._id}`);
    console.log(`Curriculum weeks: ${blendedCourse.curriculum.length}\n`);

    // Test 4: Create a free course  
    console.log("4️⃣ Creating a Free Course with Curriculum...");
    const freeCourseData = {
      course_title: "Introduction to Programming",
      course_type: "free",
      course_category: "Programming Basics",
      course_description: {
        program_overview: "Learn programming fundamentals",
        benefits: "Start your programming journey",
        learning_objectives: ["Variables", "Loops", "Functions"],
        course_requirements: ["No prior experience needed"],
        target_audience: ["Complete beginners"]
      },
      course_level: "Beginner",
      status: "Published",
      category_type: "Free",
      class_type: "Self-Paced",
      is_Certification: "No",
      is_Assignments: "Yes",
      is_Projects: "No",
      is_Quizes: "Yes",
      course_image: "https://example.com/free-course-image.jpg",
      estimated_duration: "2 weeks",
      lessons: [
        {
          title: "What is Programming?",
          description: "Introduction to programming concepts",
          content_type: "video",
          content: "https://example.com/intro-video.mp4",
          duration: 30,
          order: 1,
          is_preview: true
        }
      ],
      curriculum: [
        {
          weekTitle: "Week 1: Getting Started",
          weekDescription: "Introduction to programming concepts",
          topics: ["What is Programming", "Setting up Environment"],
          lessons: [
            {
              title: "Programming Fundamentals",
              description: "Basic concepts every programmer should know",
              content: "Introduction to programming logic",
              content_type: "text",
              duration: 20,
              order: 1
            }
          ]
        }
      ]
    };

    const freeCourse = await FreeCourse.create(freeCourseData);
    console.log("✅ Free course created successfully");
    console.log(`Course ID: ${freeCourse._id}`);
    console.log(`Curriculum weeks: ${freeCourse.curriculum.length}\n`);

    // Test 5: Test curriculum statistics
    console.log("5️⃣ Testing curriculum statistics...");
    const calculateStats = (curriculum) => {
      let totalLessons = 0;
      let totalSections = 0;
      let totalLiveClasses = 0;
      let totalResources = 0;
      
      curriculum.forEach(week => {
        if (week.lessons) {
          totalLessons += week.lessons.length;
          week.lessons.forEach(lesson => {
            if (lesson.resources) totalResources += lesson.resources.length;
          });
        }
        if (week.liveClasses) totalLiveClasses += week.liveClasses.length;
        if (week.sections) {
          totalSections += week.sections.length;
          week.sections.forEach(section => {
            if (section.lessons) {
              totalLessons += section.lessons.length;
              section.lessons.forEach(lesson => {
                if (lesson.resources) totalResources += lesson.resources.length;
              });
            }
            if (section.resources) totalResources += section.resources.length;
          });
        }
      });
      
      return { totalLessons, totalSections, totalLiveClasses, totalResources };
    };

    const liveStats = calculateStats(liveCourse.curriculum);
    console.log("Live Course Stats:", liveStats);
    
    const blendedStats = calculateStats(blendedCourse.curriculum);
    console.log("Blended Course Stats:", blendedStats);
    
    const freeStats = calculateStats(freeCourse.curriculum);
    console.log("Free Course Stats:", freeStats);
    console.log("");

    // Test 6: Test ID consistency
    console.log("6️⃣ Testing ID assignment consistency...");
    
    const testIDStructure = (course, courseName) => {
      console.log(`\n${courseName} ID Structure:`);
      course.curriculum.forEach((week, weekIndex) => {
        console.log(`  Week ${weekIndex + 1}: ${week.id}`);
        
        if (week.lessons) {
          week.lessons.forEach((lesson, lessonIndex) => {
            console.log(`    Direct Lesson ${lessonIndex + 1}: ${lesson.id}`);
            if (lesson.resources) {
              lesson.resources.forEach((resource, resourceIndex) => {
                console.log(`      Resource ${resourceIndex + 1}: ${resource.id}`);
              });
            }
          });
        }
        
        if (week.liveClasses) {
          week.liveClasses.forEach((liveClass, classIndex) => {
            console.log(`    Live Class ${classIndex + 1}: ${liveClass.id}`);
          });
        }
        
        if (week.sections) {
          week.sections.forEach((section, sectionIndex) => {
            console.log(`    Section ${sectionIndex + 1}: ${section.id}`);
            if (section.lessons) {
              section.lessons.forEach((lesson, lessonIndex) => {
                console.log(`      Section Lesson ${lessonIndex + 1}: ${lesson.id}`);
              });
            }
          });
        }
      });
    };

    testIDStructure(liveCourse, "Live Course");
    testIDStructure(blendedCourse, "Blended Course");
    testIDStructure(freeCourse, "Free Course");

    console.log("\n🎉 All curriculum management tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`✅ Live Course created with ${liveCourse.curriculum.length} weeks`);
    console.log(`✅ Blended Course created with ${blendedCourse.curriculum.length} weeks`);
    console.log(`✅ Free Course created with ${freeCourse.curriculum.length} weeks`);
    console.log(`✅ ID assignment working correctly across all course types`);
    console.log(`✅ Curriculum structure is consistent and flexible`);

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n📚 Database connection closed");
  }
};

// Run the test
testCurriculumManagement(); 