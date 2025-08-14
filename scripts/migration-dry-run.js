import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user-modal.js';
import Instructor from '../models/instructor-model.js';
import Student from '../models/student-model.js';

dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medh');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Dry run statistics
const dryRunStats = {
  instructors: { found: 0, wouldMigrate: 0, wouldSkip: 0, conflicts: [] },
  students: { found: 0, wouldMigrate: 0, wouldSkip: 0, conflicts: [] },
  otherUsers: { found: 0, wouldPreserve: 0 }
};

// Dry run instructor migration
const dryRunInstructors = async () => {
  console.log('\n🔄 DRY RUN: Analyzing instructor migration...');
  
  try {
    const instructorUsers = await User.find({
      role: { $in: ['instructor', ['instructor']] }
    });
    
    dryRunStats.instructors.found = instructorUsers.length;
    console.log(`📊 Found ${instructorUsers.length} instructor users to analyze`);
    
    if (instructorUsers.length === 0) {
      console.log('ℹ️ No instructor users found');
      return;
    }
    
    for (const user of instructorUsers) {
      try {
        const existingInstructor = await Instructor.findOne({ email: user.email });
        if (existingInstructor) {
          dryRunStats.instructors.wouldSkip++;
          dryRunStats.instructors.conflicts.push({
            email: user.email,
            full_name: user.full_name,
            reason: 'Already exists in instructors collection'
          });
          console.log(`⚠️ Would skip: ${user.full_name} (${user.email}) - already exists`);
        } else {
          dryRunStats.instructors.wouldMigrate++;
          console.log(`✅ Would migrate: ${user.full_name} (${user.email})`);
        }
      } catch (error) {
        console.error(`❌ Error analyzing instructor ${user.email}:`, error.message);
      }
    }
    
    console.log(`📊 Instructor analysis: ${dryRunStats.instructors.wouldMigrate} would migrate, ${dryRunStats.instructors.wouldSkip} would skip`);
    
  } catch (error) {
    console.error('❌ Error during instructor analysis:', error);
    throw error;
  }
};

// Dry run student migration
const dryRunStudents = async () => {
  console.log('\n🔄 DRY RUN: Analyzing student migration...');
  
  try {
    const studentUsers = await User.find({
      role: { $in: ['student', ['student'], 'corporate-student', ['corporate-student']] }
    });
    
    dryRunStats.students.found = studentUsers.length;
    console.log(`📊 Found ${studentUsers.length} student users to analyze`);
    
    if (studentUsers.length === 0) {
      console.log('ℹ️ No student users found');
      return;
    }
    
    for (const user of studentUsers) {
      try {
        const existingStudent = await Student.findOne({ email: user.email });
        if (existingStudent) {
          dryRunStats.students.wouldSkip++;
          dryRunStats.students.conflicts.push({
            email: user.email,
            full_name: user.full_name,
            reason: 'Already exists in students collection'
          });
          console.log(`⚠️ Would skip: ${user.full_name} (${user.email}) - already exists`);
        } else {
          dryRunStats.students.wouldMigrate++;
          console.log(`✅ Would migrate: ${user.full_name} (${user.email})`);
        }
      } catch (error) {
        console.error(`❌ Error analyzing student ${user.email}:`, error.message);
      }
    }
    
    console.log(`📊 Student analysis: ${dryRunStats.students.wouldMigrate} would migrate, ${dryRunStats.students.wouldSkip} would skip`);
    
  } catch (error) {
    console.error('❌ Error during student analysis:', error);
    throw error;
  }
};

// Dry run other users count
const dryRunOtherUsers = async () => {
  console.log('\n📊 DRY RUN: Analyzing other users...');
  
  try {
    const otherUsers = await User.find({
      role: { 
        $nin: ['instructor', ['instructor'], 'student', ['student'], 'corporate-student', ['corporate-student']] 
      }
    });
    
    dryRunStats.otherUsers.found = otherUsers.length;
    dryRunStats.otherUsers.wouldPreserve = otherUsers.length;
    
    console.log(`📊 Found ${otherUsers.length} other users (would be preserved)`);
    
    const userTypes = {};
    otherUsers.forEach(user => {
      const role = Array.isArray(user.role) ? user.role[0] : user.role;
      userTypes[role] = (userTypes[role] || 0) + 1;
    });
    
    console.log('📋 Other user types found:');
    Object.entries(userTypes).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing other users:', error);
    throw error;
  }
};

// Show current collection counts
const showCurrentCounts = async () => {
  console.log('\n📊 Current collection counts:');
  
  try {
    const userCount = await User.countDocuments();
    const instructorCount = await Instructor.countDocuments();
    const studentCount = await Student.countDocuments();
    
    console.log(`   - users: ${userCount}`);
    console.log(`   - instructors: ${instructorCount}`);
    console.log(`   - students: ${studentCount}`);
    
  } catch (error) {
    console.error('❌ Error getting collection counts:', error);
  }
};

// Show projected counts after migration
const showProjectedCounts = async () => {
  console.log('\n📊 Projected counts after migration:');
  
  try {
    const currentUserCount = await User.countDocuments();
    const currentInstructorCount = await Instructor.countDocuments();
    const currentStudentCount = await Student.countDocuments();
    
    const projectedUserCount = currentUserCount - dryRunStats.instructors.wouldMigrate - dryRunStats.students.wouldMigrate;
    const projectedInstructorCount = currentInstructorCount + dryRunStats.instructors.wouldMigrate;
    const projectedStudentCount = currentStudentCount + dryRunStats.students.wouldMigrate;
    
    console.log(`   - users: ${currentUserCount} → ${projectedUserCount} (-${dryRunStats.instructors.wouldMigrate + dryRunStats.students.wouldMigrate})`);
    console.log(`   - instructors: ${currentInstructorCount} → ${projectedInstructorCount} (+${dryRunStats.instructors.wouldMigrate})`);
    console.log(`   - students: ${currentStudentCount} → ${projectedStudentCount} (+${dryRunStats.students.wouldMigrate})`);
    
  } catch (error) {
    console.error('❌ Error calculating projected counts:', error);
  }
};

// Main dry run function
const runDryRun = async () => {
  console.log('🧪 Starting Migration DRY RUN...');
  console.log('='.repeat(60));
  console.log('⚠️ This is a DRY RUN - no changes will be made to the database');
  console.log('='.repeat(60));
  
  try {
    await connectDB();
    
    await showCurrentCounts();
    await dryRunOtherUsers();
    await dryRunInstructors();
    await dryRunStudents();
    await showProjectedCounts();
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 DRY RUN SUMMARY');
    console.log('='.repeat(60));
    console.log(`Instructors: ${dryRunStats.instructors.wouldMigrate}/${dryRunStats.instructors.found} would migrate (${dryRunStats.instructors.wouldSkip} would skip)`);
    console.log(`Students: ${dryRunStats.students.wouldMigrate}/${dryRunStats.students.found} would migrate (${dryRunStats.students.wouldSkip} would skip)`);
    console.log(`Other Users: ${dryRunStats.otherUsers.wouldPreserve} would be preserved`);
    
    if (dryRunStats.instructors.conflicts.length > 0 || dryRunStats.students.conflicts.length > 0) {
      console.log('\n⚠️ Conflicts found:');
      [...dryRunStats.instructors.conflicts, ...dryRunStats.students.conflicts].forEach(conflict => {
        console.log(`   - ${conflict.full_name} (${conflict.email}): ${conflict.reason}`);
      });
    }
    
    const totalWouldMigrate = dryRunStats.instructors.wouldMigrate + dryRunStats.students.wouldMigrate;
    if (totalWouldMigrate > 0) {
      console.log(`\n✅ DRY RUN completed! ${totalWouldMigrate} records would be migrated.`);
      console.log('💡 Run the actual migration script when ready: node scripts/migrate-users-data.js');
    } else {
      console.log('\nℹ️ No records would be migrated. All data already exists in target collections.');
    }
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run dry run
runDryRun();
