import mongoose from "mongoose";

const newletterSchema = new mongoose.Schema({
  email: { type: String, required: true },
});

export default mongoose.model("Newsletter", newletterSchema);
