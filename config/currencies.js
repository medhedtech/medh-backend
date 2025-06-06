/**
 * Supported currencies configuration
 * ISO 4217 currency codes organized by region
 */

export const SUPPORTED_CURRENCIES = [
  // Major world currencies
  "USD", // United States Dollar
  "EUR", // Euro
  "GBP", // British Pound Sterling
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
  "AUD", // Australian Dollar
  "CAD", // Canadian Dollar
  "CHF", // Swiss Franc
  "SEK", // Swedish Krona
  "NOK", // Norwegian Krone
  "DKK", // Danish Krone
  "PLN", // Polish Zloty
  "CZK", // Czech Koruna
  "HUF", // Hungarian Forint
  "RON", // Romanian Leu
  "BGN", // Bulgarian Lev
  "HRK", // Croatian Kuna
  
  // Asia-Pacific
  "INR", // Indian Rupee
  "SGD", // Singapore Dollar
  "HKD", // Hong Kong Dollar
  "KRW", // South Korean Won
  "THB", // Thai Baht
  "MYR", // Malaysian Ringgit
  "IDR", // Indonesian Rupiah
  "PHP", // Philippine Peso
  "TWD", // Taiwan Dollar
  "VND", // Vietnamese Dong
  "NZD", // New Zealand Dollar
  
  // Middle East & Africa
  "AED", // UAE Dirham
  "SAR", // Saudi Riyal
  "QAR", // Qatari Riyal
  "KWD", // Kuwaiti Dinar
  "BHD", // Bahraini Dinar
  "OMR", // Omani Rial
  "JOD", // Jordanian Dinar
  "ILS", // Israeli Shekel
  "TRY", // Turkish Lira
  "EGP", // Egyptian Pound
  "ZAR", // South African Rand
  "NGN", // Nigerian Naira
  "KES", // Kenyan Shilling
  "MAD", // Moroccan Dirham
  "TND", // Tunisian Dinar
  
  // Americas
  "BRL", // Brazilian Real
  "MXN", // Mexican Peso
  "ARS", // Argentine Peso
  "CLP", // Chilean Peso
  "COP", // Colombian Peso
  "PEN", // Peruvian Sol
  "UYU", // Uruguayan Peso
  "BOB", // Bolivian Boliviano
  "PYG", // Paraguayan Guarani
  "VES", // Venezuelan Bolivar
  
  // Europe (additional)
  "RUB", // Russian Ruble
  "UAH", // Ukrainian Hryvnia
  "BYN", // Belarusian Ruble
  "ISK", // Icelandic Krona
  "ALL", // Albanian Lek
  "MKD", // Macedonian Denar
  "RSD", // Serbian Dinar
  "BAM", // Bosnia and Herzegovina Convertible Mark
  "GEL", // Georgian Lari
  "AMD", // Armenian Dram
  "AZN", // Azerbaijani Manat
  
  // Others
  "PKR", // Pakistani Rupee
  "BDT", // Bangladeshi Taka
  "LKR", // Sri Lankan Rupee
  "NPR", // Nepalese Rupee
  "BTN", // Bhutanese Ngultrum
  "MVR", // Maldivian Rufiyaa
  "AFN", // Afghan Afghani
  "IRR", // Iranian Rial
  "IQD", // Iraqi Dinar
  "LBP", // Lebanese Pound
  "SYP", // Syrian Pound
  "YER"  // Yemeni Rial
];

/**
 * Currency groups by region for easier organization
 */
export const CURRENCY_GROUPS = {
  MAJOR: ["USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD"],
  ASIA_PACIFIC: ["INR", "SGD", "HKD", "KRW", "THB", "MYR", "IDR", "PHP", "TWD", "VND", "NZD"],
  MIDDLE_EAST_AFRICA: ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "TRY", "EGP", "ZAR", "NGN", "KES", "MAD", "TND"],
  AMERICAS: ["BRL", "MXN", "ARS", "CLP", "COP", "PEN", "UYU", "BOB", "PYG", "VES"],
  EUROPE: ["CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "UAH", "BYN", "ISK", "ALL", "MKD", "RSD", "BAM", "GEL", "AMD", "AZN"],
  OTHERS: ["PKR", "BDT", "LKR", "NPR", "BTN", "MVR", "AFN", "IRR", "IQD", "LBP", "SYP", "YER"]
};

/**
 * Currency symbols for display purposes
 */
export const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", AUD: "A$", CAD: "C$", CHF: "Fr",
  INR: "₹", SGD: "S$", HKD: "HK$", KRW: "₩", THB: "฿", AED: "د.إ", SAR: "﷼",
  BRL: "R$", MXN: "MX$", ZAR: "R", RUB: "₽", TRY: "₺", ILS: "₪",
  // Add more as needed
};

/**
 * Currency display names
 */
export const CURRENCY_NAMES = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", JPY: "Japanese Yen",
  CNY: "Chinese Yuan", AUD: "Australian Dollar", CAD: "Canadian Dollar",
  INR: "Indian Rupee", AED: "UAE Dirham", SAR: "Saudi Riyal", GBP: "British Pound",
  // Add more as needed
};

/**
 * Popular currencies for quick selection
 */
export const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SAR", "AUD", "CAD", "SGD"];

/**
 * Validate if a currency is supported
 * @param {string} currency - Currency code to validate
 * @returns {boolean} - True if supported
 */
export const isSupportedCurrency = (currency) => {
  return SUPPORTED_CURRENCIES.includes(currency?.toUpperCase());
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} - Currency symbol or code if symbol not found
 */
export const getCurrencySymbol = (currency) => {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] || currency?.toUpperCase();
};

/**
 * Get currency name
 * @param {string} currency - Currency code
 * @returns {string} - Currency name or code if name not found
 */
export const getCurrencyName = (currency) => {
  return CURRENCY_NAMES[currency?.toUpperCase()] || currency?.toUpperCase();
};

export default {
  SUPPORTED_CURRENCIES,
  CURRENCY_GROUPS,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES,
  POPULAR_CURRENCIES,
  isSupportedCurrency,
  getCurrencySymbol,
  getCurrencyName
}; 