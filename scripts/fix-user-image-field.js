// fix-user-image-field.js
// Usage: node scripts/fix-user-image-field.js
// This script normalizes user_image and cover_image fields in the users collection.

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URL =
  process.env.MONGODB_URL ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/medh";

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema, "users");

async function fixUserImages() {
  await mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const query = {
    $or: [
      { user_image: { $type: "string" } },
      { cover_image: { $type: "string" } },
    ],
  };
  const users = await User.find(query);
  console.log(`Found ${users.length} users to update.`);
  for (const user of users) {
    const update = {};
    if (typeof user.user_image === "string") {
      update.user_image = { url: user.user_image };
    }
    if (typeof user.cover_image === "string") {
      update.cover_image = { url: user.cover_image };
    }
    await User.updateOne({ _id: user._id }, { $set: update });
    console.log(`Updated user ${user._id}`);
  }
  await mongoose.disconnect();
  console.log("All done!");
}

fixUserImages().catch((err) => {
  console.error("Error fixing user images:", err);
  process.exit(1);
});
