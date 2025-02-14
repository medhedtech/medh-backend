const mongoose = require("mongoose");

const newletterSchema = new mongoose.Schema({
  email: { type: String, required: true },
});

module.exports = mongoose.model("Newsletter", newletterSchema);
