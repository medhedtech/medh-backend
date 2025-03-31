const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: [true, "Country name is required"],
      trim: true,
    },
    countryCode: {
      type: String,
      required: [true, "Country code is required"],
      trim: true,
      uppercase: true,
    },
    valueWrtUSD: {
      type: Number,
      required: [true, "Value with respect to USD is required"],
      min: [0, "Value must be positive"],
    },
    symbol: {
      type: String,
      required: [true, "Currency symbol is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Currency = mongoose.model("Currency", currencySchema);

module.exports = Currency; 