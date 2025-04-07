const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  }
});

const priceSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    enum: ['INR', 'USD']
  },
  individual: {
    type: Number,
    required: true
  },
  batch: {
    type: Number,
    required: true
  },
  min_batch_size: {
    type: Number,
    default: 2
  },
  max_batch_size: {
    type: Number,
    default: 10
  },
  early_bird_discount: {
    type: Number,
    default: 0
  },
  group_discount: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

const homeDisplaySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  duration_range: {
    type: String,
    required: true
  },
  effort_hours: {
    type: String,
    required: true
  },
  no_of_Sessions: {
    type: String,
    required: true
  },
  learning_points: {
    type: [String],
    required: true
  },
  prerequisites: {
    type: [String],
    required: true
  },
  highlights: {
    type: [String],
    required: true
  },
  instructor: {
    type: instructorSchema,
    required: true
  },
  prices: {
    type: [priceSchema],
    required: true
  },
  price_suffix: {
    type: String,
    default: "Onwards"
  },
  category: {
    type: String,
    required: true
  },
  classType: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  display_order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Create model
const HomeDisplay = mongoose.model('HomeDisplay', homeDisplaySchema);

module.exports = HomeDisplay; 