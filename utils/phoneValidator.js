import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import countryService from "./countryService.js";
import logger from "./logger.js";

/**
 * Enhanced Phone Number Validator with Comprehensive Country Support
 * Handles normalization and validation for major countries worldwide
 */
export class PhoneValidator {
  /**
   * Comprehensive country-specific phone number configurations
   */
  static COUNTRY_CONFIGS = {
    // Asia Pacific
    IN: {
      code: "91",
      length: 10,
      pattern: /^[6-9]\d{9}$/,
      name: "India",
      format: (num) => num.replace(/(\d{5})(\d{5})/, "$1 $2"),
    },
    CN: {
      code: "86",
      length: 11,
      pattern: /^1[3-9]\d{9}$/,
      name: "China",
      format: (num) => num.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3"),
    },
    JP: {
      code: "81",
      length: [10, 11],
      pattern: /^[7-9]\d{9,10}$/,
      name: "Japan",
      format: (num) =>
        num.length === 10
          ? num.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
          : num.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3"),
    },
    KR: {
      code: "82",
      length: [10, 11],
      pattern: /^1[0-9]\d{8,9}$/,
      name: "South Korea",
      format: (num) => num.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3"),
    },
    SG: {
      code: "65",
      length: 8,
      pattern: /^[89]\d{7}$/,
      name: "Singapore",
      format: (num) => num.replace(/(\d{4})(\d{4})/, "$1 $2"),
    },
    AU: {
      code: "61",
      length: 9,
      pattern: /^4\d{8}$/,
      name: "Australia",
      format: (num) => num.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    MY: {
      code: "60",
      length: [9, 10],
      pattern: /^1[1-9]\d{7,8}$/,
      name: "Malaysia",
      format: (num) => num.replace(/(\d{2})(\d{3,4})(\d{4})/, "$1-$2-$3"),
    },
    TH: {
      code: "66",
      length: 9,
      pattern: /^[689]\d{8}$/,
      name: "Thailand",
      format: (num) => num.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3"),
    },
    ID: {
      code: "62",
      length: [10, 11, 12],
      pattern: /^8\d{9,11}$/,
      name: "Indonesia",
      format: (num) => num.replace(/(\d{3})(\d{3,4})(\d{4,5})/, "$1-$2-$3"),
    },
    PH: {
      code: "63",
      length: 10,
      pattern: /^9\d{9}$/,
      name: "Philippines",
      format: (num) => num.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    VN: {
      code: "84",
      length: [9, 10],
      pattern: /^[3-9]\d{8,9}$/,
      name: "Vietnam",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3,4})/, "$1 $2 $3"),
    },

    // North America
    US: {
      code: "1",
      length: 10,
      pattern: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/,
      name: "United States",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3"),
    },
    CA: {
      code: "1",
      length: 10,
      pattern: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/,
      name: "Canada",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3"),
    },
    MX: {
      code: "52",
      length: 10,
      pattern: /^[1-9]\d{9}$/,
      name: "Mexico",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    },

    // Europe
    GB: {
      code: "44",
      length: [10, 11],
      pattern: /^[1-9]\d{8,9}$/,
      name: "United Kingdom",
      format: (num) =>
        num.length === 10
          ? num.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3")
          : num.replace(/(\d{5})(\d{6})/, "$1 $2"),
    },
    DE: {
      code: "49",
      length: [10, 11, 12],
      pattern: /^1[5-7]\d{9,11}$/,
      name: "Germany",
      format: (num) => num.replace(/(\d{3})(\d{3,4})(\d{4,5})/, "$1 $2 $3"),
    },
    FR: {
      code: "33",
      length: 9,
      pattern: /^[67]\d{8}$/,
      name: "France",
      format: (num) =>
        num.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{1})/, "$1 $2 $3 $4 $5"),
    },
    IT: {
      code: "39",
      length: [9, 10],
      pattern: /^3\d{8,9}$/,
      name: "Italy",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3,4})/, "$1 $2 $3"),
    },
    ES: {
      code: "34",
      length: 9,
      pattern: /^[67]\d{8}$/,
      name: "Spain",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    NL: {
      code: "31",
      length: 9,
      pattern: /^6\d{8}$/,
      name: "Netherlands",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    BE: {
      code: "32",
      length: 9,
      pattern: /^4\d{8}$/,
      name: "Belgium",
      format: (num) =>
        num.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
    },
    CH: {
      code: "41",
      length: 9,
      pattern: /^7[5-9]\d{7}$/,
      name: "Switzerland",
      format: (num) =>
        num.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
    },
    AT: {
      code: "43",
      length: [10, 11],
      pattern: /^6\d{9,10}$/,
      name: "Austria",
      format: (num) => num.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1 $2 $3"),
    },
    SE: {
      code: "46",
      length: 9,
      pattern: /^7[0-9]\d{7}$/,
      name: "Sweden",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1-$2-$3"),
    },
    NO: {
      code: "47",
      length: 8,
      pattern: /^[49]\d{7}$/,
      name: "Norway",
      format: (num) => num.replace(/(\d{3})(\d{2})(\d{3})/, "$1 $2 $3"),
    },
    DK: {
      code: "45",
      length: 8,
      pattern: /^[2-9]\d{7}$/,
      name: "Denmark",
      format: (num) =>
        num.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
    },
    FI: {
      code: "358",
      length: 9,
      pattern: /^4\d{8}$/,
      name: "Finland",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    PL: {
      code: "48",
      length: 9,
      pattern: /^[5-8]\d{8}$/,
      name: "Poland",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    RU: {
      code: "7",
      length: 10,
      pattern: /^9\d{9}$/,
      name: "Russia",
      format: (num) =>
        num.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2-$3-$4"),
    },

    // Middle East & Africa
    AE: {
      code: "971",
      length: 9,
      pattern: /^5[0-9]\d{7}$/,
      name: "United Arab Emirates",
      format: (num) => num.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3"),
    },
    SA: {
      code: "966",
      length: 9,
      pattern: /^5[0-9]\d{7}$/,
      name: "Saudi Arabia",
      format: (num) => num.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3"),
    },
    QA: {
      code: "974",
      length: 8,
      pattern: /^[3567]\d{7}$/,
      name: "Qatar",
      format: (num) => num.replace(/(\d{4})(\d{4})/, "$1 $2"),
    },
    KW: {
      code: "965",
      length: 8,
      pattern: /^[569]\d{7}$/,
      name: "Kuwait",
      format: (num) => num.replace(/(\d{4})(\d{4})/, "$1 $2"),
    },
    OM: {
      code: "968",
      length: 8,
      pattern: /^[79]\d{7}$/,
      name: "Oman",
      format: (num) => num.replace(/(\d{4})(\d{4})/, "$1 $2"),
    },
    BH: {
      code: "973",
      length: 8,
      pattern: /^[36]\d{7}$/,
      name: "Bahrain",
      format: (num) => num.replace(/(\d{4})(\d{4})/, "$1 $2"),
    },
    IL: {
      code: "972",
      length: 9,
      pattern: /^5[0-9]\d{7}$/,
      name: "Israel",
      format: (num) => num.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3"),
    },
    TR: {
      code: "90",
      length: 10,
      pattern: /^5\d{9}$/,
      name: "Turkey",
      format: (num) =>
        num.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
    },
    ZA: {
      code: "27",
      length: 9,
      pattern: /^[67]\d{8}$/,
      name: "South Africa",
      format: (num) => num.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3"),
    },
    NG: {
      code: "234",
      length: 10,
      pattern: /^[78]\d{9}$/,
      name: "Nigeria",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    },
    KE: {
      code: "254",
      length: 9,
      pattern: /^7\d{8}$/,
      name: "Kenya",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
    EG: {
      code: "20",
      length: 10,
      pattern: /^1[0-5]\d{8}$/,
      name: "Egypt",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    },

    // South America
    BR: {
      code: "55",
      length: 11,
      pattern: /^[1-9]\d{10}$/,
      name: "Brazil",
      format: (num) => num.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3"),
    },
    AR: {
      code: "54",
      length: [10, 11],
      pattern: /^9\d{9,10}$/,
      name: "Argentina",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4,5})/, "$1 $2 $3"),
    },
    CL: {
      code: "56",
      length: 8,
      pattern: /^[89]\d{7}$/,
      name: "Chile",
      format: (num) => num.replace(/(\d{1})(\d{4})(\d{3})/, "$1 $2 $3"),
    },
    CO: {
      code: "57",
      length: 10,
      pattern: /^3\d{9}$/,
      name: "Colombia",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    },
    PE: {
      code: "51",
      length: 9,
      pattern: /^9\d{8}$/,
      name: "Peru",
      format: (num) => num.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    },
  };

  /**
   * Get country ISO code from country calling code
   * @param {string} countryDigits - Country code digits (91, 1, 44, etc.)
   * @returns {string} ISO country code or 'GENERIC'
   */
  static getCountryISOFromCode(countryDigits) {
    // Find country by matching code
    for (const [iso, config] of Object.entries(this.COUNTRY_CONFIGS)) {
      if (config.code === countryDigits) {
        return iso;
      }
    }
    return "GENERIC";
  }

  /**
   * Normalize phone number with country-specific logic
   * @param {string|object} phoneInput - Phone input in various formats
   * @param {string} countryCode - Country code (+91, +1, +44, etc.)
   * @returns {object} Normalized result with country code and number
   */
  static normalizePhoneNumber(phoneInput, countryCode = "+91") {
    if (!phoneInput) return { error: "Phone number is required" };

    try {
      let rawNumber = "";
      let detectedCountryCode = countryCode;

      // Handle object format { country_code: "+91", number: "9876543210" }
      if (typeof phoneInput === "object") {
        if (phoneInput.country_code && phoneInput.number) {
          detectedCountryCode = phoneInput.country_code.startsWith("+")
            ? phoneInput.country_code
            : `+${phoneInput.country_code}`;
          rawNumber = phoneInput.number.toString();
        } else {
          return { error: "Invalid phone object format" };
        }
      }
      // Handle string format
      else if (typeof phoneInput === "string") {
        rawNumber = phoneInput.trim();
      } else {
        return { error: "Invalid phone number format" };
      }

      // Clean the number - remove all non-digits
      const cleanNumber = rawNumber.replace(/\D/g, "");

      if (!cleanNumber) {
        return { error: "Phone number cannot be empty" };
      }

      // Get country code without the "+" for processing
      const countryDigits = detectedCountryCode.replace(/^\+/, "");
      const countryISO = this.getCountryISOFromCode(countryDigits);

      // Apply country-specific normalization
      const normalized = this.applyCountrySpecificNormalization(
        cleanNumber,
        countryISO,
        countryDigits,
      );

      if (normalized.error) {
        return normalized;
      }

      return {
        country_code: detectedCountryCode,
        number: normalized.number,
        country_iso: countryISO,
        original: phoneInput,
      };
    } catch (error) {
      logger.warn("Phone number normalization failed", {
        phoneInput,
        error: error.message,
      });
      return { error: "Failed to normalize phone number" };
    }
  }

  /**
   * Apply country-specific normalization rules
   * @param {string} cleanNumber - Clean digits-only number
   * @param {string} countryISO - Country ISO code
   * @param {string} countryDigits - Country code digits
   * @returns {object} Normalized number or error
   */
  static applyCountrySpecificNormalization(
    cleanNumber,
    countryISO,
    countryDigits,
  ) {
    const config = this.COUNTRY_CONFIGS[countryISO];
    if (!config) {
      // Generic handling for other countries - just validate length
      if (cleanNumber.length >= 7 && cleanNumber.length <= 15) {
        return { number: cleanNumber };
      }
      return { error: "Phone number must be 7-15 digits" };
    }

    // Get expected length(s)
    const expectedLengths = Array.isArray(config.length)
      ? config.length
      : [config.length];

    // Remove country code if it appears at the beginning
    let processedNumber = cleanNumber;
    if (cleanNumber.startsWith(countryDigits)) {
      const withoutCountryCode = cleanNumber.substring(countryDigits.length);
      // Only remove if the remaining length makes sense
      if (expectedLengths.some((len) => withoutCountryCode.length === len)) {
        processedNumber = withoutCountryCode;
      }
    }

    // Handle leading zeros (common in many countries)
    if (
      processedNumber.startsWith("0") &&
      processedNumber.length > expectedLengths[0]
    ) {
      const withoutZero = processedNumber.substring(1);
      if (expectedLengths.includes(withoutZero.length)) {
        processedNumber = withoutZero;
      }
    }

    // Validate length
    if (!expectedLengths.includes(processedNumber.length)) {
      const lengthStr =
        expectedLengths.length === 1
          ? `${expectedLengths[0]} digits`
          : `${expectedLengths.join(" or ")} digits`;
      return {
        error: `${config.name} phone numbers must be ${lengthStr}. Received ${processedNumber.length} digits.`,
      };
    }

    // Validate pattern
    if (config.pattern && !config.pattern.test(processedNumber)) {
      return {
        error: `Invalid ${config.name} phone number format`,
      };
    }

    return { number: processedNumber };
  }

  /**
   * Validate phone number with comprehensive checks
   * @param {string|object} phoneInput - Phone input to validate
   * @param {string} countryCode - Country code (+91, +1, +44, etc.)
   * @returns {object} Validation result with normalized data
   */
  static validatePhoneNumber(phoneInput, countryCode = "+91") {
    try {
      // Step 1: Normalize the input
      const normalized = this.normalizePhoneNumber(phoneInput, countryCode);
      if (normalized.error) {
        return {
          isValid: false,
          error: normalized.error,
          errorCode: "NORMALIZATION_ERROR",
          raw: phoneInput,
        };
      }

      // Step 2: Create full international number
      const fullNumber = `${normalized.country_code}${normalized.number}`;

      // Step 3: Parse with libphonenumber-js for additional validation
      try {
        const phoneNumber = parsePhoneNumber(fullNumber);

        if (!phoneNumber || !phoneNumber.isValid()) {
          return {
            isValid: false,
            error: `Invalid ${this.COUNTRY_CONFIGS[normalized.country_iso]?.name || "phone"} number`,
            errorCode: "INVALID_NUMBER",
            raw: phoneInput,
            normalized: normalized.number,
            country: normalized.country_iso,
            countryCode: normalized.country_code,
          };
        }

        // Step 4: Return successful validation
        return {
          isValid: true,
          formatted: phoneNumber.formatInternational(),
          national: phoneNumber.formatNational(),
          e164: phoneNumber.format("E.164"),
          countryCode: phoneNumber.countryCallingCode,
          country: phoneNumber.country,
          type: phoneNumber.getType(),
          raw: phoneInput,
          normalized: normalized.number,
          fullNumber: fullNumber,
        };
      } catch (libPhoneError) {
        // If libphonenumber-js fails, use our basic validation
        logger.warn(
          "libphonenumber-js validation failed, using basic validation",
          {
            phoneInput,
            error: libPhoneError.message,
          },
        );

        return {
          isValid: true,
          formatted: `${normalized.country_code} ${this.formatNumber(normalized.number, normalized.country_iso)}`,
          national: this.formatNumber(
            normalized.number,
            normalized.country_iso,
          ),
          e164: fullNumber.startsWith("+") ? fullNumber : `+${fullNumber}`,
          countryCode: normalized.country_code.replace("+", ""),
          country: normalized.country_iso,
          type: "MOBILE",
          raw: phoneInput,
          normalized: normalized.number,
          fullNumber: fullNumber,
          basicValidation: true,
        };
      }
    } catch (error) {
      logger.error("Phone number validation error", {
        phoneInput,
        countryCode,
        error: error.message,
        stack: error.stack,
      });

      return {
        isValid: false,
        error: `Validation error: ${error.message}`,
        errorCode: "VALIDATION_ERROR",
        raw: phoneInput,
      };
    }
  }

  /**
   * Format number for display based on country
   * @param {string} number - Clean phone number
   * @param {string} countryISO - Country ISO code
   * @returns {string} Formatted number
   */
  static formatNumber(number, countryISO) {
    const config = this.COUNTRY_CONFIGS[countryISO];
    if (config && config.format) {
      try {
        return config.format(number);
      } catch (error) {
        logger.warn("Custom formatting failed, using default", {
          countryISO,
          number,
          error: error.message,
        });
      }
    }

    // Default formatting for unknown countries
    if (number.length === 10) {
      return number.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
    } else if (number.length === 11) {
      return number.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3");
    } else if (number.length === 8) {
      return number.replace(/(\d{4})(\d{4})/, "$1 $2");
    } else if (number.length === 9) {
      return number.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
    }

    return number;
  }

  /**
   * Validate phone number for form submission with user-friendly messages
   * @param {string|object} phoneInput - Phone input from form
   * @param {string} countryCode - Country code (+91, +1, +44, etc.)
   * @returns {object} Validation result suitable for form validation
   */
  static validateForForm(phoneInput, countryCode = "+91") {
    const result = this.validatePhoneNumber(phoneInput, countryCode);

    if (!result.isValid) {
      return {
        valid: false,
        message: this.getHumanReadableError(
          result.errorCode,
          result.error,
          countryCode,
        ),
        errorCode: result.errorCode,
        field: "mobile_number",
      };
    }

    return {
      valid: true,
      formatted: result.formatted,
      e164: result.e164,
      country: result.country,
      countryCode: result.countryCode,
      normalized: result.normalized,
    };
  }

  /**
   * Get human-readable error messages
   * @param {string} errorCode - Error code
   * @param {string} originalError - Original error message
   * @param {string} countryCode - Country code for context
   * @returns {string} Human-readable error message
   */
  static getHumanReadableError(errorCode, originalError, countryCode = "+91") {
    const countryDigits = countryCode.replace("+", "");
    const countryISO = this.getCountryISOFromCode(countryDigits);
    const config = this.COUNTRY_CONFIGS[countryISO];
    const countryName = config?.name || "phone";

    switch (errorCode) {
      case "NORMALIZATION_ERROR":
        return originalError;
      case "INVALID_NUMBER":
        if (config) {
          const lengthStr = Array.isArray(config.length)
            ? `${config.length.join(" or ")} digits`
            : `${config.length} digits`;
          return `Please enter a valid ${lengthStr} ${countryName} phone number`;
        }
        return `Please enter a valid ${countryName.toLowerCase()} number`;
      case "VALIDATION_ERROR":
        return "Unable to validate phone number. Please check the format and try again.";
      default:
        return originalError || "Invalid phone number format";
    }
  }

  /**
   * Quick validation check for common use cases
   * @param {string|object} phoneInput - Phone input
   * @param {string} countryCode - Country code
   * @returns {boolean} True if valid
   */
  static isValid(phoneInput, countryCode = "+91") {
    const result = this.validatePhoneNumber(phoneInput, countryCode);
    return result.isValid;
  }

  /**
   * Extract country code from international phone number
   * @param {string} phoneNumber - International phone number
   * @returns {string|null} Country code or null
   */
  static extractCountryCode(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== "string") return null;

    const cleaned = phoneNumber.replace(/\D/g, "");

    // Check all configured country codes (sorted by length desc to match longer codes first)
    const codes = Object.values(this.COUNTRY_CONFIGS)
      .map((config) => config.code)
      .sort((a, b) => b.length - a.length);

    for (const code of codes) {
      if (cleaned.startsWith(code)) {
        const withoutCode = cleaned.substring(code.length);
        const countryISO = this.getCountryISOFromCode(code);
        const config = this.COUNTRY_CONFIGS[countryISO];

        if (config) {
          const expectedLengths = Array.isArray(config.length)
            ? config.length
            : [config.length];
          if (expectedLengths.includes(withoutCode.length)) {
            return `+${code}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get list of supported countries
   * @returns {Array} Array of supported countries with their details
   */
  static getSupportedCountries() {
    return Object.entries(this.COUNTRY_CONFIGS).map(([iso, config]) => ({
      iso,
      name: config.name,
      code: `+${config.code}`,
      expectedLength: config.length,
      pattern: config.pattern.toString(),
    }));
  }

  /**
   * Detect country from phone number
   * @param {string|object} phoneInput - Phone input
   * @returns {object|null} Country information or null
   */
  static detectCountry(phoneInput) {
    const countryCode = this.extractCountryCode(phoneInput);
    if (!countryCode) return null;

    const countryDigits = countryCode.replace("+", "");
    const countryISO = this.getCountryISOFromCode(countryDigits);
    const config = this.COUNTRY_CONFIGS[countryISO];

    return config
      ? {
          iso: countryISO,
          name: config.name,
          code: countryCode,
          expectedLength: config.length,
        }
      : null;
  }
}

// Export for backward compatibility
export default PhoneValidator;
