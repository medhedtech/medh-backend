import Currency from "../models/currency-model.js";
import catchAsync from "../utils/catchAsync.js";
import { AppError } from "../utils/errorHandler.js";

// Create a new currency
export const createCurrency = catchAsync(async (req, res, next) => {
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
export const getAllCurrencies = catchAsync(async (req, res, _next) => {
  const currencies = await Currency.find();

  res.status(200).json({
    status: "success",
    results: currencies.length,
    data: {
      currencies,
    },
  });
});

// Get all currency country codes
export const getAllCurrencyCountryCodes = catchAsync(
  async (req, res, _next) => {
    const currencies = await Currency.find().select("countryCode -_id");

    res.status(200).json({
      status: "success",
      results: currencies.length,
      data: {
        countryCodes: currencies.map((currency) => currency.countryCode),
      },
    });
  },
);

// Get currency by ID
export const getCurrencyById = catchAsync(async (req, res, next) => {
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
export const updateCurrency = catchAsync(async (req, res, next) => {
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
export const deleteCurrency = catchAsync(async (req, res, next) => {
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
export const toggleCurrencyStatus = catchAsync(async (req, res, next) => {
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
export const getCurrencyByCountryCode = catchAsync(async (req, res, next) => {
  const currency = await Currency.findOne({
    countryCode: req.params.code.toUpperCase(),
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
