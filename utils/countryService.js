import { countries } from "countries-list";
import worldCountries from "world-countries";
import countryCodesListPkg from "country-codes-list";

/**
 * Comprehensive Country Service
 * Combines multiple libraries for rich country data
 */
class CountryService {
  constructor() {
    this.countriesListData = countries;
    this.worldCountriesData = worldCountries;
    this.countryCodesData = countryCodesListPkg.all();
    this.countryCache = null;
  }

  /**
   * Get comprehensive country list with all data
   */
  getAllCountries() {
    if (this.countryCache) {
      return this.countryCache;
    }

    const countryList = [];
    const processedCodes = new Set();

    // Process countries-list data first (most reliable for basic info)
    Object.entries(this.countriesListData).forEach(([code, country]) => {
      if (processedCodes.has(code)) return;

      // Find additional data from world-countries
      const worldCountry = this.worldCountriesData.find(
        (c) => c.cca2 === code || c.cca3 === country.code || c.cioc === code,
      );

      // Find phone code data
      const phoneData = this.countryCodesData.find(
        (c) => c.countryCode === code || c.countryNameEn === country.name,
      );

      const countryInfo = {
        // Basic identifiers
        code: code, // ISO 2-letter code
        code3: country.code || worldCountry?.cca3, // ISO 3-letter code
        name: country.name,
        nativeName: country.native || worldCountry?.name?.nativeName,

        // Phone information
        phone: country.phone
          ? `+${country.phone}`
          : phoneData?.countryCallingCode || null,
        phoneCode:
          country.phone || phoneData?.countryCallingCode?.replace("+", ""),

        // Geographic information
        continent: country.continent || worldCountry?.continents?.[0],
        region: worldCountry?.region || country.continent,
        subregion: worldCountry?.subregion,

        // Visual elements
        emoji: country.emoji || worldCountry?.flag,
        flag: worldCountry?.flag || country.emoji,

        // Currency information
        currency:
          country.currency || Object.keys(worldCountry?.currencies || {})[0],
        currencies: worldCountries?.currencies || {
          [country.currency]: { name: country.currency },
        },

        // Language information
        languages:
          country.languages || worldCountry?.languages
            ? Object.values(worldCountry.languages)
            : [country.languages],

        // Additional metadata
        capital: country.capital || worldCountry?.capital?.[0],
        timezone: worldCountry?.timezones?.[0] || null,
        tld: worldCountry?.tld?.[0] || null,

        // Popularity/Priority (for sorting)
        priority: this.getCountryPriority(code, country.name),

        // Search terms for better matching
        searchTerms: [
          country.name.toLowerCase(),
          country.native?.toLowerCase(),
          code.toLowerCase(),
          country.code?.toLowerCase(),
          worldCountry?.name?.common?.toLowerCase(),
          ...Object.values(worldCountry?.name?.nativeName || {}).map((n) =>
            n.common?.toLowerCase(),
          ),
        ].filter(Boolean),
      };

      countryList.push(countryInfo);
      processedCodes.add(code);
    });

    // Add any missing countries from world-countries that weren't in countries-list
    this.worldCountriesData.forEach((worldCountry) => {
      if (!processedCodes.has(worldCountry.cca2) && worldCountry.cca2) {
        const phoneData = this.countryCodesData.find(
          (c) =>
            c.countryCode === worldCountry.cca2 ||
            c.countryNameEn === worldCountry.name.common,
        );

        const countryInfo = {
          code: worldCountry.cca2,
          code3: worldCountry.cca3,
          name: worldCountry.name.common,
          nativeName: Object.values(worldCountry.name.nativeName || {})[0]
            ?.common,

          phone:
            phoneData?.countryCallingCode ||
            worldCountry.idd?.root + (worldCountry.idd?.suffixes?.[0] || ""),
          phoneCode:
            phoneData?.countryCallingCode?.replace("+", "") ||
            (
              worldCountry.idd?.root + (worldCountry.idd?.suffixes?.[0] || "")
            ).replace("+", ""),

          continent: worldCountry.continents?.[0],
          region: worldCountry.region,
          subregion: worldCountry.subregion,

          emoji: worldCountry.flag,
          flag: worldCountry.flag,

          currency: Object.keys(worldCountry.currencies || {})[0],
          currencies: worldCountry.currencies,

          languages: Object.values(worldCountry.languages || {}),

          capital: worldCountry.capital?.[0],
          timezone: worldCountry.timezones?.[0],
          tld: worldCountry.tld?.[0],

          priority: this.getCountryPriority(
            worldCountry.cca2,
            worldCountry.name.common,
          ),

          searchTerms: [
            worldCountry.name.common.toLowerCase(),
            worldCountry.cca2.toLowerCase(),
            worldCountry.cca3.toLowerCase(),
            ...Object.values(worldCountry.name.nativeName || {}).map((n) =>
              n.common?.toLowerCase(),
            ),
          ].filter(Boolean),
        };

        countryList.push(countryInfo);
        processedCodes.add(worldCountry.cca2);
      }
    });

    // Sort by priority and name
    countryList.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.name.localeCompare(b.name);
    });

    this.countryCache = countryList;
    return countryList;
  }

  /**
   * Get priority score for a country (for sorting popular countries first)
   */
  getCountryPriority(code, name) {
    const highPriority = [
      "IN",
      "US",
      "GB",
      "CA",
      "AU",
      "SG",
      "AE",
      "DE",
      "FR",
      "JP",
    ];
    const mediumPriority = [
      "CN",
      "BR",
      "RU",
      "IT",
      "ES",
      "NL",
      "SE",
      "NO",
      "DK",
      "FI",
    ];

    if (highPriority.includes(code)) return 100;
    if (mediumPriority.includes(code)) return 50;

    // Give some priority to English-speaking countries
    const englishSpeaking = ["NZ", "IE", "ZA", "MY", "PH", "PK", "BD", "LK"];
    if (englishSpeaking.includes(code)) return 25;

    return 1;
  }

  /**
   * Get countries formatted for frontend dropdown
   */
  getCountriesForDropdown() {
    return this.getAllCountries().map((country) => ({
      value: country.code,
      label: `${country.flag} ${country.name}`,
      phone: country.phone,
      searchText:
        `${country.name} ${country.code} ${country.code3}`.toLowerCase(),
    }));
  }

  /**
   * Get countries with phone codes for phone number input
   */
  getCountriesWithPhoneCodes() {
    return this.getAllCountries()
      .filter((country) => country.phone) // Only countries with phone codes
      .map((country) => ({
        code: country.code,
        name: country.name,
        phone: country.phone,
        phoneCode: country.phoneCode,
        flag: country.emoji || country.flag,
        priority: country.priority,
      }))
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Search countries by name, code, or other criteria
   */
  searchCountries(query) {
    if (!query || query.length < 2) {
      return this.getAllCountries().slice(0, 20); // Return top 20 for empty search
    }

    const searchTerm = query.toLowerCase();
    return this.getAllCountries().filter(
      (country) =>
        country.searchTerms.some((term) => term && term.includes(searchTerm)) ||
        country.phone?.includes(searchTerm),
    );
  }

  /**
   * Get country by code (2 or 3 letter)
   */
  getCountryByCode(code) {
    if (!code) return null;
    const upperCode = code.toUpperCase();
    return this.getAllCountries().find(
      (country) => country.code === upperCode || country.code3 === upperCode,
    );
  }

  /**
   * Get country by phone code
   */
  getCountryByPhoneCode(phoneCode) {
    if (!phoneCode) return null;
    const cleanCode = phoneCode.toString().replace("+", "");
    return this.getAllCountries().find(
      (country) =>
        country.phoneCode === cleanCode || country.phone === `+${cleanCode}`,
    );
  }

  /**
   * Validate country code
   */
  isValidCountryCode(code) {
    return !!this.getCountryByCode(code);
  }

  /**
   * Validate country name
   */
  isValidCountryName(name) {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return this.getAllCountries().some(
      (country) =>
        country.name.toLowerCase() === lowerName ||
        country.nativeName?.toLowerCase() === lowerName ||
        country.searchTerms.includes(lowerName),
    );
  }

  /**
   * Get country name by code
   */
  getCountryName(code) {
    const country = this.getCountryByCode(code);
    return country ? country.name : null;
  }

  /**
   * Get popular countries (for quick selection)
   */
  getPopularCountries() {
    return this.getAllCountries()
      .filter((country) => country.priority >= 25)
      .slice(0, 10);
  }

  /**
   * Get countries by continent
   */
  getCountriesByContinent(continent) {
    return this.getAllCountries().filter(
      (country) => country.continent?.toLowerCase() === continent.toLowerCase(),
    );
  }

  /**
   * Get timezone information for a country
   */
  getCountryTimezone(code) {
    const country = this.getCountryByCode(code);
    return country ? country.timezone : null;
  }

  /**
   * Clear cache (useful for testing or updates)
   */
  clearCache() {
    this.countryCache = null;
  }
}

// Create singleton instance
const countryService = new CountryService();

export default countryService;

// Export individual methods for convenience
export const {
  getAllCountries,
  getCountriesForDropdown,
  getCountriesWithPhoneCodes,
  searchCountries,
  getCountryByCode,
  getCountryByPhoneCode,
  isValidCountryCode,
  isValidCountryName,
  getCountryName,
  getPopularCountries,
  getCountriesByContinent,
  getCountryTimezone,
} = countryService;
