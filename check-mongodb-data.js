import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function checkMongoDBData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('✅ MongoDB campus database से connect हो गया');
    
    const { Batch } = await import('./models/course-model.js');
    
    console.log('\n🔍 MongoDB में data check कर रहा हूँ...\n');
    
    // 1. सभी databases check करें
    console.log('📋 Step 1: सभी databases check कर रहा हूँ...');
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    
    console.log('Available databases:');
    dbList.databases.forEach(db => {
      console.log(`- ${db.name} (${db.sizeOnDisk} bytes)`);
    });
    
    // 2. campus database में collections check करें
    console.log('\n📋 Step 2: campus database में collections check कर रहा हूँ...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('Available collections in campus database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // 3. batches collection में data check करें
    console.log('\n📋 Step 3: batches collection में data check कर रहा हूँ...');
    const batchCount = await Batch.countDocuments();
    console.log(`Total batches in database: ${batchCount}`);
    
    if (batchCount > 0) {
      const batches = await Batch.find({}).select('+instructor_details').limit(5);
      console.log('\nFirst 5 batches:');
      batches.forEach((batch, index) => {
        console.log(`\n${index + 1}. Batch: ${batch.batch_name}`);
        console.log(`   ID: ${batch._id}`);
        console.log(`   Instructor ID: ${batch.assigned_instructor}`);
        if (batch.instructor_details) {
          console.log(`   Instructor Name: ${batch.instructor_details.full_name}`);
          console.log(`   Instructor Email: ${batch.instructor_details.email}`);
        } else {
          console.log(`   ❌ No instructor details`);
        }
      });
    } else {
      console.log('❌ कोई batch नहीं मिला');
    }
    
    // 4. users collection में data check करें
    console.log('\n📋 Step 4: users collection में data check कर रहा हूँ...');
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const instructors = await User.find({ role: 'instructor' }).limit(3);
      console.log('\nInstructors:');
      instructors.forEach((instructor, index) => {
        console.log(`${index + 1}. ${instructor.full_name} (${instructor.email})`);
      });
    }
    
    // 5. courses collection में data check करें
    console.log('\n📋 Step 5: courses collection में data check कर रहा हूँ...');
    const courseCount = await Course.countDocuments();
    console.log(`Total courses in database: ${courseCount}`);
    
    if (courseCount > 0) {
      const courses = await Course.find({}).limit(3);
      console.log('\nCourses:');
      courses.forEach((course, index) => {
        console.log(`${index + 1}. ${course.course_title}`);
      });
    }
    
    // 6. Raw MongoDB query करें
    console.log('\n📋 Step 6: Raw MongoDB query कर रहा हूँ...');
    const rawBatches = await mongoose.connection.db.collection('batches').find({}).limit(3).toArray();
    console.log(`Raw batches found: ${rawBatches.length}`);
    
    if (rawBatches.length > 0) {
      console.log('\nRaw batch data:');
      console.log(JSON.stringify(rawBatches[0], null, 2));
    }
    
    // 7. Database connection info
    console.log('\n📋 Step 7: Database connection info:');
    console.log(`Database name: ${mongoose.connection.name}`);
    console.log(`Database host: ${mongoose.connection.host}`);
    console.log(`Database port: ${mongoose.connection.port}`);
    
    await mongoose.disconnect();
    console.log('\n✅ MongoDB data check पूरा हुआ!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMongoDBData();
