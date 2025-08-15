import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testBatchModel() {
  console.log('🧪 Testing Batch Model Access');
  console.log('============================');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Try to get the Batch model
    const Batch = mongoose.model('Batch');
    console.log('✅ Batch model accessed successfully');
    
    // Try to find a batch
    const batches = await Batch.find().limit(1);
    console.log('✅ Batch query successful');
    console.log('📦 Found batches:', batches.length);
    
    if (batches.length > 0) {
      console.log('📋 Sample batch:', {
        id: batches[0]._id,
        name: batches[0].batch_name,
        code: batches[0].batch_code
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testBatchModel().catch(console.error);


