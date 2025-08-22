import User from "../models/user-modal.js";
import logger from "../utils/logger.js";

/**
 * @desc Get user profile completion details with field-by-field breakdown
 * @route GET /api/v1/profile/completion
 * @access Private
 */
export const getProfileCompletion = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with all profile fields
    const user = await User.findById(userId).select(
      "-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth.google.access_token -oauth.google.refresh_token -oauth.facebook.access_token -oauth.facebook.refresh_token -oauth.github.access_token -oauth.github.refresh_token -oauth.linkedin.access_token -oauth.linkedin.refresh_token -oauth.microsoft.access_token -oauth.microsoft.refresh_token -oauth.apple.access_token -oauth.apple.refresh_token"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Define field categories and their weights
    const fieldCategories = {
      basic_info: {
        weight: 60, // 60% weight for basic info
        fields: {
          full_name: { required: true, completed: !!user.full_name },
          email: { required: true, completed: !!user.email },
          phone_numbers: { required: true, completed: user.phone_numbers && user.phone_numbers.length > 0 },
          user_image: { required: true, completed: !!(user.user_image && user.user_image.url) },
          address: { required: true, completed: !!user.address },
          organization: { required: true, completed: !!user.organization },
          bio: { required: true, completed: !!user.bio },
          country: { required: true, completed: !!user.country },
          timezone: { required: true, completed: !!user.timezone },
        }
      },
      personal_details: {
        weight: 30, // 30% weight for personal details
        fields: {
          date_of_birth: { required: true, completed: !!(user.meta && user.meta.date_of_birth) },
          gender: { required: true, completed: !!(user.meta && user.meta.gender) },
          education_level: { required: true, completed: !!(user.meta && user.meta.education_level) },
          institution_name: { required: false, completed: !!(user.meta && user.meta.institution_name) },
          field_of_study: { required: false, completed: !!(user.meta && user.meta.field_of_study) },
          skills: { required: true, completed: !!(user.meta && user.meta.skills && user.meta.skills.length > 0) },
          experience_level: { required: false, completed: !!(user.meta && user.meta.experience_level) },
          annual_income_range: { required: false, completed: !!(user.meta && user.meta.annual_income_range) },
        }
      },
      social_links: {
        weight: 10, // 10% weight for social links (optional but adds value)
        fields: {
          facebook_link: { required: false, completed: !!user.facebook_link },
          instagram_link: { required: false, completed: !!user.instagram_link },
          linkedin_link: { required: false, completed: !!user.linkedin_link },
          twitter_link: { required: false, completed: !!user.twitter_link },
          youtube_link: { required: false, completed: !!user.youtube_link },
          github_link: { required: false, completed: !!user.github_link },
          portfolio_link: { required: false, completed: !!user.portfolio_link },
        }
      }
    };

    // Calculate completion for each category
    const categoryCompletion = {};
    let overallCompletion = 0;

    Object.entries(fieldCategories).forEach(([categoryName, categoryData]) => {
      const fields = categoryData.fields;
      const requiredFields = Object.entries(fields).filter(([, fieldData]) => fieldData.required);
      const optionalFields = Object.entries(fields).filter(([, fieldData]) => !fieldData.required);
      
      // Calculate required fields completion
      const completedRequired = requiredFields.filter(([, fieldData]) => fieldData.completed).length;
      const totalRequired = requiredFields.length;
      const requiredCompletion = totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 100;
      
      // Calculate optional fields completion (bonus points)
      const completedOptional = optionalFields.filter(([, fieldData]) => fieldData.completed).length;
      const totalOptional = optionalFields.length;
      const optionalCompletion = totalOptional > 0 ? (completedOptional / totalOptional) * 100 : 0;
      
      // Category completion is primarily based on required fields, with bonus from optional
      const categoryCompletionPercentage = Math.min(100, requiredCompletion + (optionalCompletion * 0.2)); // 20% bonus from optional fields
      
      categoryCompletion[categoryName] = {
        completion_percentage: Math.round(categoryCompletionPercentage),
        required_fields: {
          completed: completedRequired,
          total: totalRequired,
          completion_percentage: Math.round(requiredCompletion)
        },
        optional_fields: {
          completed: completedOptional,
          total: totalOptional,
          completion_percentage: Math.round(optionalCompletion)
        },
        fields: Object.entries(fields).map(([fieldName, fieldData]) => ({
          field_name: fieldName,
          required: fieldData.required,
          completed: fieldData.completed,
          display_name: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
      };
      
      // Add to overall completion based on category weight
      overallCompletion += (categoryCompletionPercentage * categoryData.weight) / 100;
    });

    // Get the virtual profile_completion from the user model for comparison
    const modelCompletion = user.profile_completion || 0;

    // Calculate next steps - suggest fields to complete
    const nextSteps = [];
    Object.entries(fieldCategories).forEach(([categoryName, categoryData]) => {
      const incompleteRequired = Object.entries(categoryData.fields)
        .filter(([, fieldData]) => fieldData.required && !fieldData.completed)
        .map(([fieldName]) => ({
          field_name: fieldName,
          category: categoryName,
          display_name: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          priority: categoryName === 'basic_info' ? 'high' : categoryName === 'personal_details' ? 'medium' : 'low'
        }));
      
      nextSteps.push(...incompleteRequired);
    });

    // Sort next steps by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    nextSteps.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Calculate completion level and message
    let completionLevel = 'getting_started';
    let completionMessage = 'Just getting started! Complete your basic information to unlock more features.';
    let completionColor = '#ef4444'; // red

    if (overallCompletion >= 90) {
      completionLevel = 'excellent';
      completionMessage = 'Excellent! Your profile is nearly complete. You\'re making the most of the platform!';
      completionColor = '#10b981'; // green
    } else if (overallCompletion >= 70) {
      completionLevel = 'good';
      completionMessage = 'Good progress! A few more details will help personalize your experience.';
      completionColor = '#3b82f6'; // blue
    } else if (overallCompletion >= 50) {
      completionLevel = 'fair';
      completionMessage = 'You\'re halfway there! Adding more information will improve your learning experience.';
      completionColor = '#f59e0b'; // yellow
    } else if (overallCompletion >= 25) {
      completionLevel = 'basic';
      completionMessage = 'Basic profile setup complete. Add more details to get personalized recommendations.';
      completionColor = '#f97316'; // orange
    }

    // Log profile completion view
    user.logActivity("profile_completion_view", userId, {
      completion_percentage: Math.round(overallCompletion),
      completion_level: completionLevel,
      timestamp: new Date(),
    });

    logger.info("Profile completion data retrieved", {
      userId,
      overallCompletion: Math.round(overallCompletion),
      completionLevel,
      nextStepsCount: nextSteps.length,
    });

    res.status(200).json({
      success: true,
      message: "Profile completion data retrieved successfully",
      data: {
        overall_completion: {
          percentage: Math.round(overallCompletion),
          level: completionLevel,
          message: completionMessage,
          color: completionColor,
          model_calculation: modelCompletion // For comparison/debugging
        },
        category_completion: categoryCompletion,
        next_steps: nextSteps.slice(0, 5), // Top 5 recommendations
        profile_strength: {
          basic_info_complete: categoryCompletion.basic_info.completion_percentage >= 80,
          personal_details_complete: categoryCompletion.personal_details.completion_percentage >= 70,
          has_social_presence: categoryCompletion.social_links.completion_percentage >= 30,
          is_verified: user.email_verified && user.phone_verified,
          has_profile_image: !!(user.user_image && user.user_image.url),
        },
        completion_benefits: {
          current_level: completionLevel,
          next_level: overallCompletion >= 90 ? 'excellent' : 
                     overallCompletion >= 70 ? 'excellent' :
                     overallCompletion >= 50 ? 'good' :
                     overallCompletion >= 25 ? 'fair' : 'basic',
          benefits_unlocked: getBenefitsForLevel(completionLevel),
          next_benefits: getBenefitsForLevel(overallCompletion >= 90 ? 'excellent' : 
                                           overallCompletion >= 70 ? 'excellent' :
                                           overallCompletion >= 50 ? 'good' :
                                           overallCompletion >= 25 ? 'fair' : 'basic'),
        },
        last_updated: user.last_profile_update || user.updated_at,
        user_info: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          user_image: user.user_image,
        }
      },
    });
  } catch (error) {
    logger.error("Error retrieving profile completion data", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving profile completion data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Helper function to get benefits for completion level
 */
function getBenefitsForLevel(level) {
  const benefits = {
    getting_started: [
      "Access to basic courses",
      "Community forum access"
    ],
    basic: [
      "Personalized course recommendations",
      "Progress tracking",
      "Basic certificates"
    ],
    fair: [
      "Advanced course suggestions",
      "Skill assessments",
      "Networking opportunities",
      "Priority support"
    ],
    good: [
      "Premium course access",
      "Mentorship programs",
      "Career guidance",
      "Industry connections",
      "Advanced analytics"
    ],
    excellent: [
      "VIP support",
      "Exclusive events",
      "Beta feature access",
      "Personal learning advisor",
      "Custom learning paths",
      "Industry partnerships"
    ]
  };

  return benefits[level] || benefits.getting_started;
}

export default {
  getProfileCompletion,
};

