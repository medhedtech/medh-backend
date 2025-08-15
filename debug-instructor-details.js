import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function debugInstructorDetails() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Find the specific batch from the database
    const { Batch } = await import('./models/course-model.js');
    const batch = await Batch.findById('689cb788b402a3aaed5c9799').select('+instructor_details');
    
    if (!batch) {
      console.log('❌ Batch not found');
      return;
    }
    
    console.log('📋 Batch Details:');
    console.log('Batch ID:', batch._id);
    console.log('Batch Name:', batch.batch_name);
    console.log('Assigned Instructor ID:', batch.assigned_instructor);
    console.log('Instructor Details:', JSON.stringify(batch.instructor_details, null, 2));
    
    // Check if the instructor exists
    if (batch.assigned_instructor) {
      console.log('\n🔍 Checking instructor in database...');
      const instructor = await User.findById(batch.assigned_instructor);
      
      if (instructor) {
        console.log('✅ Instructor found:');
        console.log('Instructor ID:', instructor._id);
        console.log('Full Name:', instructor.full_name);
        console.log('First Name:', instructor.first_name);
        console.log('Last Name:', instructor.last_name);
        console.log('Email:', instructor.email);
        console.log('Phone:', instructor.phone_number);
        console.log('Role:', instructor.role);
        console.log('Is Active:', instructor.is_active);
        
        // Try to manually populate instructor details
        console.log('\n🛠️ Manually populating instructor details...');
        const instructorDetails = {
          instructor_id: instructor._id,
          instructor_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          instructor_email: instructor.email,
          instructor_phone: instructor.phone_number || instructor.phone || null,
          assignment_date: new Date()
        };
        
        console.log('Generated instructor details:', JSON.stringify(instructorDetails, null, 2));
        
        // Update the batch with instructor details
        const updatedBatch = await Batch.findByIdAndUpdate(
          batch._id,
          { instructor_details: instructorDetails },
          { new: true }
        ).select('+instructor_details');
        
        console.log('\n✅ Updated batch instructor details:');
        console.log(JSON.stringify(updatedBatch.instructor_details, null, 2));
        
      } else {
        console.log('❌ Instructor not found in database');
      }
    } else {
      console.log('❌ No assigned instructor for this batch');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugInstructorDetails();
