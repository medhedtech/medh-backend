import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import countryService from "./countryService.js";
import logger from "./logger.js";

/**
 * Enhanced Phone Number Validator
 * Handles all edge cases including multiple formats, invalid inputs, and country-specific validation
 */
export class PhoneValidator {
  /**
   * Normalize phone number from various input formats
   * @param {string|object} phoneInput - Phone input in various formats
   * @returns {string|null} Normalized phone number or null if invalid
   */
  static normalizePhoneNumber(phoneInput) {
    if (!phoneInput) return null;

    try {
      // Handle object format { country: "91", number: "9876543210" }
      if (
        typeof phoneInput === "object" &&
        phoneInput.country &&
        phoneInput.number
      ) {
        const countryCode = phoneInput.country.toString().replace(/^\+/, "");
        const number = phoneInput.number.toString().replace(/\D/g, ""); // Remove non-digits

        if (!countryCode || !number) return null;

        return `+${countryCode}${number}`;
      }

      // Handle string format
      if (typeof phoneInput === "string") {
        let cleaned = phoneInput.trim();

        // Handle empty string
        if (!cleaned) return null;

        // Remove all non-digit characters except +
        cleaned = cleaned.replace(/[^\d+]/g, "");

        // Handle double plus (++91...)
        cleaned = cleaned.replace(/^\+\+/, "+");

        // Handle missing + prefix for international numbers
        if (!cleaned.startsWith("+") && cleaned.length > 10) {
          cleaned = `+${cleaned}`;
        }

        // Handle leading zero instead of + (0919876543210 -> +919876543210)
        if (cleaned.startsWith("0") && cleaned.length > 11) {
          cleaned = `+${cleaned.substring(1)}`;
        }

        // Validate length (international format should be 7-15 digits + country code)
        const digitsOnly = cleaned.replace(/^\+/, "");
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          return null;
        }

        return cleaned;
      }

      return null;
    } catch (error) {
      logger.warn("Phone number normalization failed", {
        phoneInput,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Validate phone number with comprehensive checks
   * @param {string|object} phoneInput - Phone input to validate
   * @param {string} defaultCountry - Default country code (ISO 2-letter)
   * @returns {object} Validation result with details
   */
  static validatePhoneNumber(phoneInput, defaultCountry = "IN") {
    try {
      // Step 1: Normalize the input
      const normalized = this.normalizePhoneNumber(phoneInput);
      if (!normalized) {
        return {
          isValid: false,
          error: "Invalid phone number format",
          errorCode: "INVALID_FORMAT",
          raw: phoneInput,
        };
      }

      // Step 2: Parse with libphonenumber-js
      const phoneNumber = parsePhoneNumber(normalized, defaultCountry);

      if (!phoneNumber) {
        return {
          isValid: false,
          error: "Unable to parse phone number",
          errorCode: "PARSE_ERROR",
          raw: phoneInput,
          normalized,
        };
      }

      // Step 3: Validate the parsed number
      if (!phoneNumber.isValid()) {
        return {
          isValid: false,
          error: "Invalid phone number for the detected country",
          errorCode: "INVALID_NUMBER",
          raw: phoneInput,
          normalized,
          country: phoneNumber.country,
          countryCode: phoneNumber.countryCallingCode,
        };
      }

      // Step 4: Additional country-specific validations
      const countrySpecificValidation =
        this.validateCountrySpecific(phoneNumber);
      if (!countrySpecificValidation.isValid) {
        return {
          ...countrySpecificValidation,
          raw: phoneInput,
          normalized,
        };
      }

      // Step 5: Return successful validation
      return {
        isValid: true,
        formatted: phoneNumber.formatInternational(),
        national: phoneNumber.formatNational(),
        e164: phoneNumber.format("E.164"),
        countryCode: phoneNumber.countryCallingCode,
        country: phoneNumber.country,
        type: phoneNumber.getType(),
        possibleCountries: phoneNumber.getPossibleCountries(),
        raw: phoneInput,
        normalized,
      };
    } catch (error) {
      logger.error("Phone number validation error", {
        phoneInput,
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
   * Country-specific validation rules
   * @param {PhoneNumber} phoneNumber - Parsed phone number object
   * @returns {object} Country-specific validation result
   */
  static validateCountrySpecific(phoneNumber) {
    const country = phoneNumber.country;
    const nationalNumber = phoneNumber.nationalNumber;

    try {
      switch (country) {
        case "IN": // India
          // Indian mobile numbers should be 10 digits
          if (nationalNumber.length !== 10) {
            return {
              isValid: false,
              error: "Indian phone numbers must be exactly 10 digits",
              errorCode: "INVALID_LENGTH_IN",
            };
          }

          // Indian mobile numbers start with 6, 7, 8, or 9
          const firstDigit = nationalNumber.charAt(0);
          if (!["6", "7", "8", "9"].includes(firstDigit)) {
            return {
              isValid: false,
              error: "Indian mobile numbers must start with 6, 7, 8, or 9",
              errorCode: "INVALID_PREFIX_IN",
            };
          }
          break;

        case "US": // United States
        case "CA": // Canada (same format as US)
          // North American numbers should be 10 digits
          if (nationalNumber.length !== 10) {
            return {
              isValid: false,
              error: "US/Canadian phone numbers must be exactly 10 digits",
              errorCode: "INVALID_LENGTH_US",
            };
          }

          // Area code cannot start with 0 or 1
          const areaCode = nationalNumber.substring(0, 3);
          if (areaCode.startsWith("0") || areaCode.startsWith("1")) {
            return {
              isValid: false,
              error: "US/Canadian area codes cannot start with 0 or 1",
              errorCode: "INVALID_AREA_CODE_US",
            };
          }
          break;

        case "GB": // United Kingdom
          // UK mobile numbers are typically 11 digits (including leading 0)
          if (nationalNumber.length < 10 || nationalNumber.length > 11) {
            return {
              isValid: false,
              error: "UK phone numbers must be 10-11 digits",
              errorCode: "INVALID_LENGTH_GB",
            };
          }
          break;

        case "AU": // Australia
          // Australian mobile numbers are 9 digits (after country code)
          if (nationalNumber.length !== 9) {
            return {
              isValid: false,
              error: "Australian mobile numbers must be exactly 9 digits",
              errorCode: "INVALID_LENGTH_AU",
            };
          }

          // Australian mobiles start with 4
          if (!nationalNumber.startsWith("4")) {
            return {
              isValid: false,
              error: "Australian mobile numbers must start with 4",
              errorCode: "INVALID_PREFIX_AU",
            };
          }
          break;

        default:
          // For other countries, rely on libphonenumber-js validation
          break;
      }

      return { isValid: true };
    } catch (error) {
      logger.warn("Country-specific validation failed", {
        country,
        nationalNumber,
        error: error.message,
      });

      // Don't fail validation for country-specific rules if there's an error
      return { isValid: true };
    }
  }

  /**
   * Validate phone number for form submission
   * @param {string|object} phoneInput - Phone input from form
   * @param {string} country - User's selected country
   * @returns {object} Validation result suitable for form validation
   */
  static validateForForm(phoneInput, country = "IN") {
    const result = this.validatePhoneNumber(phoneInput, country);

    if (!result.isValid) {
      return {
        valid: false,
        message: this.getHumanReadableError(result.errorCode, result.error),
        errorCode: result.errorCode,
      };
    }

    return {
      valid: true,
      formatted: result.formatted,
      e164: result.e164,
      country: result.country,
      countryCode: result.countryCode,
    };
  }

  /**
   * Get human-readable error messages
   * @param {string} errorCode - Error code from validation
   * @param {string} defaultMessage - Default error message
   * @returns {string} Human-readable error message
   */
  static getHumanReadableError(errorCode, defaultMessage) {
    const errorMessages = {
      INVALID_FORMAT: "Please enter a valid phone number format",
      PARSE_ERROR: "Unable to recognize this phone number format",
      INVALID_NUMBER: "This phone number is not valid for the selected country",
      INVALID_LENGTH_IN: "Indian mobile numbers must be exactly 10 digits",
      INVALID_PREFIX_IN: "Indian mobile numbers must start with 6, 7, 8, or 9",
      INVALID_LENGTH_US: "US phone numbers must be exactly 10 digits",
      INVALID_AREA_CODE_US: "Invalid US area code",
      INVALID_LENGTH_GB: "UK phone numbers must be 10-11 digits",
      INVALID_LENGTH_AU: "Australian mobile numbers must be exactly 9 digits",
      INVALID_PREFIX_AU: "Australian mobile numbers must start with 4",
      VALIDATION_ERROR: "Phone number validation failed",
    };

    return errorMessages[errorCode] || defaultMessage || "Invalid phone number";
  }

  /**
   * Check if two phone numbers are equivalent
   * @param {string|object} phone1 - First phone number
   * @param {string|object} phone2 - Second phone number
   * @returns {boolean} Whether the phone numbers are equivalent
   */
  static areEquivalent(phone1, phone2) {
    try {
      const result1 = this.validatePhoneNumber(phone1);
      const result2 = this.validatePhoneNumber(phone2);

      if (!result1.isValid || !result2.isValid) {
        return false;
      }

      return result1.e164 === result2.e164;
    } catch (error) {
      logger.warn("Phone number comparison failed", {
        phone1,
        phone2,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Extract country code from phone number
   * @param {string|object} phoneInput - Phone input
   * @returns {string|null} Country code or null if not found
   */
  static extractCountryCode(phoneInput) {
    try {
      const result = this.validatePhoneNumber(phoneInput);
      return result.isValid ? result.countryCode : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Format phone number for display
   * @param {string|object} phoneInput - Phone input
   * @param {string} format - Format type ('international', 'national', 'e164')
   * @returns {string|null} Formatted phone number or null if invalid
   */
  static format(phoneInput, format = "international") {
    try {
      const result = this.validatePhoneNumber(phoneInput);
      if (!result.isValid) return null;

      switch (format) {
        case "national":
          return result.national;
        case "e164":
          return result.e164;
        case "international":
        default:
          return result.formatted;
      }
    } catch (error) {
      return null;
    }
  }
}

export default PhoneValidator;
