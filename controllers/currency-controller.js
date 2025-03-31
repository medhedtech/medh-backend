const Currency = require("../models/currency-model");
const catchAsync = require("../utils/catchAsync");
const { AppError } = require("../utils/errorHandler");

// Create a new currency
exports.createCurrency = catchAsync(async (req, res, next) => {
  const { country, countryCode, valueWrtUSD, symbol } = req.body;

  const newCurrency = await Currency.create({
    country,
    countryCode,
    valueWrtUSD,
    symbol,
  });

  res.status(201).json({
    status: "success",
    data: {
      currency: newCurrency,
    },
  });
});

// Get all currencies
exports.getAllCurrencies = catchAsync(async (req, res, next) => {
  const currencies = await Currency.find();

  res.status(200).json({
    status: "success",
    results: currencies.length,
    data: {
      currencies,
    },
  });
});

// Get currency by ID
exports.getCurrencyById = catchAsync(async (req, res, next) => {
  const currency = await Currency.findById(req.params.id);

  if (!currency) {
    return next(new AppError("No currency found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      currency,
    },
  });
});

// Update currency
exports.updateCurrency = catchAsync(async (req, res, next) => {
  const currency = await Currency.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!currency) {
    return next(new AppError("No currency found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      currency,
    },
  });
});

// Delete currency
exports.deleteCurrency = catchAsync(async (req, res, next) => {
  const currency = await Currency.findByIdAndDelete(req.params.id);

  if (!currency) {
    return next(new AppError("No currency found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Toggle currency active status
exports.toggleCurrencyStatus = catchAsync(async (req, res, next) => {
  const currency = await Currency.findById(req.params.id);

  if (!currency) {
    return next(new AppError("No currency found with that ID", 404));
  }

  currency.isActive = !currency.isActive;
  await currency.save();

  res.status(200).json({
    status: "success",
    data: {
      currency,
    },
  });
});

// Get currency by country code
exports.getCurrencyByCountryCode = catchAsync(async (req, res, next) => {
  const currency = await Currency.findOne({ 
    countryCode: req.params.code.toUpperCase() 
  });

  if (!currency) {
    return next(new AppError("No currency found with that country code", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      currency,
    },
  });
}); 