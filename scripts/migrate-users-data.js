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

// Migration statistics
const migrationStats = {
  instructors: { found: 0, migrated: 0, failed: 0, errors: [] },
  students: { found: 0, migrated: 0, failed: 0, errors: [] },
  otherUsers: { found: 0, preserved: 0 }
};

// Migrate instructor data
const migrateInstructors = async () => {
  console.log('\n🔄 Starting instructor migration...');
  
  try {
    const instructorUsers = await User.find({
      role: { $in: ['instructor', ['instructor']] }
    });
    
    migrationStats.instructors.found = instructorUsers.length;
    console.log(`📊 Found ${instructorUsers.length} instructor users to migrate`);
    
    if (instructorUsers.length === 0) {
      console.log('ℹ️ No instructor users found to migrate');
      return;
    }
    
    for (const user of instructorUsers) {
      try {
        const existingInstructor = await Instructor.findOne({ email: user.email });
        if (existingInstructor) {
          console.log(`⚠️ Instructor with email ${user.email} already exists, skipping...`);
          migrationStats.instructors.failed++;
          continue;
        }
        
        const instructorData = {
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number || user.phone_numbers?.[0] || null,
          password: user.password || 'defaultpassword123',
          domain: user.domain || user.meta?.domain || null,
          meta: {
            course_name: user.meta?.course_name || null,
            age: user.meta?.age || user.age || null
          },
          status: user.is_active ? 'Active' : 'Inactive',
          email_verified: user.email_verified || false,
          is_active: user.is_active !== false
        };
        
        if (user.experience) instructorData.experience = user.experience;
        if (user.qualifications) instructorData.qualifications = user.qualifications;
        
        const newInstructor = new Instructor(instructorData);
        await newInstructor.save();
        
        migrationStats.instructors.migrated++;
        console.log(`✅ Migrated instructor: ${user.full_name} (${user.email})`);
        
      } catch (error) {
        migrationStats.instructors.failed++;
        migrationStats.instructors.errors.push({
          documentId: user._id,
          email: user.email,
          error: error.message
        });
        console.error(`❌ Failed to migrate instructor ${user.email}:`, error.message);
      }
    }
    
    console.log(`📊 Instructor migration completed: ${migrationStats.instructors.migrated}/${migrationStats.instructors.found} migrated`);
    
  } catch (error) {
    console.error('❌ Error during instructor migration:', error);
    throw error;
  }
};

// Migrate student data
const migrateStudents = async () => {
  console.log('\n🔄 Starting student migration...');
  
  try {
    const studentUsers = await User.find({
      role: { $in: ['student', ['student'], 'corporate-student', ['corporate-student']] }
    });
    
    migrationStats.students.found = studentUsers.length;
    console.log(`📊 Found ${studentUsers.length} student users to migrate`);
    
    if (studentUsers.length === 0) {
      console.log('ℹ️ No student users found to migrate');
      return;
    }
    
    for (const user of studentUsers) {
      try {
        const existingStudent = await Student.findOne({ email: user.email });
        if (existingStudent) {
          console.log(`⚠️ Student with email ${user.email} already exists, skipping...`);
          migrationStats.students.failed++;
          continue;
        }
        
        const studentData = {
          full_name: user.full_name,
          email: user.email,
          age: user.age || user.meta?.age || null,
          phone_numbers: user.phone_numbers || [user.phone_number].filter(Boolean),
          course_name: user.course_name || user.meta?.course_name || null,
          status: user.is_active ? 'Active' : 'Inactive',
          meta: {
            createdBy: user.meta?.createdBy || 'migration',
            updatedBy: user.meta?.updatedBy || 'migration',
            originalUserId: user._id.toString()
          }
        };
        
        const newStudent = new Student(studentData);
        await newStudent.save();
        
        migrationStats.students.migrated++;
        console.log(`✅ Migrated student: ${user.full_name} (${user.email})`);
        
      } catch (error) {
        migrationStats.students.failed++;
        migrationStats.students.errors.push({
          documentId: user._id,
          email: user.email,
          error: error.message
        });
        console.error(`❌ Failed to migrate student ${user.email}:`, error.message);
      }
    }
    
    console.log(`📊 Student migration completed: ${migrationStats.students.migrated}/${migrationStats.students.found} migrated`);
    
  } catch (error) {
    console.error('❌ Error during student migration:', error);
    throw error;
  }
};

// Count other users
const countOtherUsers = async () => {
  console.log('\n📊 Counting other users...');
  
  try {
    const otherUsers = await User.find({
      role: { 
        $nin: ['instructor', ['instructor'], 'student', ['student'], 'corporate-student', ['corporate-student']] 
      }
    });
    
    migrationStats.otherUsers.found = otherUsers.length;
    migrationStats.otherUsers.preserved = otherUsers.length;
    
    console.log(`📊 Found ${otherUsers.length} other users (will be preserved)`);
    
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
    console.error('❌ Error counting other users:', error);
    throw error;
  }
};

// Remove migrated documents from users collection
const removeMigratedUsers = async () => {
  console.log('\n🗑️ Removing migrated users from users collection...');
  
  try {
    const instructorRemovalResult = await User.deleteMany({
      role: { $in: ['instructor', ['instructor']] }
    });
    
    const studentRemovalResult = await User.deleteMany({
      role: { $in: ['student', ['student'], 'corporate-student', ['corporate-student']] }
    });
    
    console.log(`✅ Removed ${instructorRemovalResult.deletedCount} instructor users`);
    console.log(`✅ Removed ${studentRemovalResult.deletedCount} student users`);
    
    return {
      instructorsRemoved: instructorRemovalResult.deletedCount,
      studentsRemoved: studentRemovalResult.deletedCount
    };
    
  } catch (error) {
    console.error('❌ Error removing migrated users:', error);
    throw error;
  }
};

// Verify migration results
const verifyMigration = async () => {
  console.log('\n🔍 Verifying migration results...');
  
  try {
    const userCount = await User.countDocuments();
    const instructorCount = await Instructor.countDocuments();
    const studentCount = await Student.countDocuments();
    
    console.log('📊 Final collection counts:');
    console.log(`   - users: ${userCount}`);
    console.log(`   - instructors: ${instructorCount}`);
    console.log(`   - students: ${studentCount}`);
    
    const expectedInstructors = migrationStats.instructors.migrated;
    const expectedStudents = migrationStats.students.migrated;
    
    if (instructorCount >= expectedInstructors) {
      console.log(`✅ Instructor migration verified: ${expectedInstructors} migrated, ${instructorCount} total`);
    } else {
      console.log(`⚠️ Instructor count mismatch: expected ${expectedInstructors}, found ${instructorCount}`);
    }
    
    if (studentCount >= expectedStudents) {
      console.log(`✅ Student migration verified: ${expectedStudents} migrated, ${studentCount} total`);
    } else {
      console.log(`⚠️ Student count mismatch: expected ${expectedStudents}, found ${studentCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    throw error;
  }
};

// Main migration function
const runMigration = async () => {
  console.log('🚀 Starting User Data Migration...');
  console.log('='.repeat(60));
  
  try {
    await connectDB();
    
    await countOtherUsers();
    await migrateInstructors();
    await migrateStudents();
    
    const removalResults = await removeMigratedUsers();
    await verifyMigration();
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Instructors: ${migrationStats.instructors.migrated}/${migrationStats.instructors.found} migrated (${migrationStats.instructors.failed} failed)`);
    console.log(`Students: ${migrationStats.students.migrated}/${migrationStats.students.found} migrated (${migrationStats.students.failed} failed)`);
    console.log(`Other Users: ${migrationStats.otherUsers.preserved} preserved`);
    console.log(`Removed from users: ${removalResults.instructorsRemoved + removalResults.studentsRemoved} documents`);
    
    if (migrationStats.instructors.errors.length > 0 || migrationStats.students.errors.length > 0) {
      console.log('\n⚠️ Migration Errors:');
      [...migrationStats.instructors.errors, ...migrationStats.students.errors].forEach(error => {
        console.log(`   - ${error.email}: ${error.error}`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration
runMigration();
