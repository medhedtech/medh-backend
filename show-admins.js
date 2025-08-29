// Utility: Show admins collection summary and sample docs
import mongoose from 'mongoose';

async function main() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB';
  await mongoose.connect(mongoUrl);
  console.log('✅ Connected to MongoDB');
  console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

  const admins = mongoose.connection.db.collection('admins');
  const count = await admins.countDocuments();
  console.log(`📦 admins count: ${count}`);

  const sample = await admins
    .find({}, { projection: { email: 1, full_name: 1, admin_role: 1, created_at: 1 } })
    .limit(20)
    .toArray();

  console.log('\n🔎 Sample admins (up to 20):');
  for (const doc of sample) {
    console.log(`- ${doc.email} | ${doc.admin_role} | ${doc.full_name || ''} | ${doc.created_at || ''}`);
  }

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('❌ Failed to read admins:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});


