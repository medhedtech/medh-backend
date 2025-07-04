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
};

export default registerTemplateHelpers;
