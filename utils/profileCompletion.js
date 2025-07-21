/**
 * Calculate profile completion percentage for a user
 * @param {Object} user - User object
 * @returns {number} Profile completion percentage (0-100)
 */
function calculateProfileCompletion(user) {
  const requiredFields = [
    "full_name",
    "email",
    "phone_numbers",
    "user_image",
    "address",
    "organization",
    "bio",
    "meta.date_of_birth",
    "meta.education_level",
    "meta.institution_name",
    "meta.field_of_study",
    "meta.gender",
    "meta.skills",
    "country",
    "timezone",
  ];

  // Social profile fields (bonus points)
  const socialFields = [
    "facebook_link",
    "instagram_link",
    "linkedin_link",
    "twitter_link",
    "youtube_link",
    "github_link",
    "portfolio_link",
  ];

  const totalFields = requiredFields.length + socialFields.length;

  let completedFields = 0;

  // Check required fields
  requiredFields.forEach((field) => {
    const fieldParts = field.split(".");
    let value = user;

    for (const part of fieldParts) {
      value = value?.[part];
    }

    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      completedFields++;
    }
  });

  // Check social profile fields (bonus points)
  socialFields.forEach((field) => {
    if (user[field] && user[field].trim() !== "") {
      completedFields++;
    }
  });

  return Math.round((completedFields / totalFields) * 100);
}

export { calculateProfileCompletion };
