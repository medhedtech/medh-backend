import Handlebars from "handlebars";

/**
 * Register template helpers for use with Handlebars templates
 */
export const registerTemplateHelpers = () => {
  // Current year helper
  Handlebars.registerHelper("currentYear", () => {
    return new Date().getFullYear();
  });

  // Format date helper
  Handlebars.registerHelper("formatDate", (date, format) => {
    if (!date) return "";

    const d = new Date(date);

    if (format === "short") {
      return d.toLocaleDateString();
    } else if (format === "long") {
      return d.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (format === "time") {
      return d.toLocaleTimeString();
    } else if (format === "full") {
      return d.toLocaleString();
    }

    return d.toISOString();
  });

  // Conditional helper
  Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  });

  // List formatter helper
  Handlebars.registerHelper("joinList", (list, separator = ", ") => {
    if (!Array.isArray(list)) return list;
    return list.join(separator);
  });

  // Equality helper for comparisons
  Handlebars.registerHelper("eq", (a, b) => {
    return a === b;
  });

  // Not equal helper
  Handlebars.registerHelper("neq", (a, b) => {
    return a !== b;
  });

  // Greater than helper
  Handlebars.registerHelper("gt", (a, b) => {
    return a > b;
  });

  // Less than helper
  Handlebars.registerHelper("lt", (a, b) => {
    return a < b;
  });

  // And helper
  Handlebars.registerHelper("and", (a, b) => {
    return a && b;
  });

  // Or helper
  Handlebars.registerHelper("or", (a, b) => {
    return a || b;
  });

  // Capitalize helper
  Handlebars.registerHelper("capitalize", (str) => {
    if (!str || typeof str !== "string") return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  });

  // Currency formatter helper
  Handlebars.registerHelper("currency", (amount, currency = "USD") => {
    if (!amount || isNaN(amount)) return "0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  });

  // Truncate helper
  Handlebars.registerHelper("truncate", (str, length = 100) => {
    if (!str || typeof str !== "string") return str;
    return str.length > length ? str.substring(0, length) + "..." : str;
  });

  // Array length helper
  Handlebars.registerHelper("length", (array) => {
    if (!Array.isArray(array)) return 0;
    return array.length;
  });

  // Math helpers
  Handlebars.registerHelper("add", (a, b) => {
    return (parseFloat(a) || 0) + (parseFloat(b) || 0);
  });

  Handlebars.registerHelper("subtract", (a, b) => {
    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  });

  Handlebars.registerHelper("multiply", (a, b) => {
    return (parseFloat(a) || 0) * (parseFloat(b) || 0);
  });

  // URL helper
  Handlebars.registerHelper("url", (path, baseUrl) => {
    const base = baseUrl || process.env.FRONTEND_URL || "https://app.medh.co";
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  });

  // Date helpers
  Handlebars.registerHelper("dateAdd", (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + parseInt(days));
    return d.toISOString();
  });

  Handlebars.registerHelper("timeAgo", (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  });
};

export default registerTemplateHelpers;
