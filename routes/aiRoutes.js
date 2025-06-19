import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

// Import all AI controllers
import {
  generateBlogFromPrompt,
  generateBlogContent,
  generateBlogSuggestions,
  enhanceExistingBlog,
  generateMetaDescription,
  generateTags,
  getAIHealthStatus,
  getBlogGenerationStats
} from '../controllers/blogAIController.js';

// Import the original AI content controller for backward compatibility
import {
  enhanceContent,
  generateContentSuggestions,
  enhanceBlogContent,
  rewriteBlogContent,
  expandBlogContent,
  generateFreshBlogContent,
  generateBlogSEO,
  analyzeBlogContent,
  generateBlogTags,
  generateSlug,
  healthCheck,
  getCapabilities
} from '../controllers/aiContentController.js';

const router = express.Router();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: 'Too many AI requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Premium AI features rate limiting (more restrictive)
const premiumAIRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for expensive operations
  message: {
    success: false,
    message: 'Too many premium AI requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// BLOG AI ROUTES - Complete blog generation and management
// ============================================================================

/**
 * @route POST /api/ai/blog/generate-from-prompt
 * @desc Generate a complete blog from a simple prompt
 * @access Private
 * @body {
 *   prompt: string (required) - The main prompt for blog generation
 *   approach?: 'comprehensive' | 'creative' | 'professional' | 'technical'
 *   categories?: string[] - Array of category IDs
 *   status?: 'draft' | 'published' | 'archived'
 *   featured?: boolean - Whether to mark as featured
 *   saveToDatabase?: boolean - Whether to save directly to database
 * }
 */
router.post('/blog/generate-from-prompt', authenticateToken, generateBlogFromPrompt);

/**
 * @route POST /api/ai/blog/generate-content
 * @desc Generate blog content from title and description
 * @access Private
 * @body {
 *   title: string (required) - Blog title
 *   description?: string - Blog description
 *   categories?: string[] - Array of category IDs
 *   tags?: string[] - Existing tags
 *   approach?: 'comprehensive' | 'creative' | 'professional' | 'technical'
 *   blog_link?: string - Optional external link
 *   status?: 'draft' | 'published' | 'archived'
 *   featured?: boolean - Whether to mark as featured
 *   regenerate?: boolean - Generate different version
 *   saveToDatabase?: boolean - Whether to save directly to database
 * }
 */
router.post('/blog/generate-content', authenticateToken, generateBlogContent);

/**
 * @route POST /api/ai/blog/suggestions
 * @desc Generate blog post ideas and suggestions
 * @access Private
 * @body {
 *   topic: string (required) - Main topic for suggestions
 *   categories?: string[] - Content categories
 *   tags?: string[] - Related tags
 *   count?: number - Number of suggestions (1-20, default: 5)
 *   approach?: 'comprehensive' | 'creative' | 'professional' | 'technical'
 * }
 */
router.post('/blog/suggestions', authenticateToken, generateBlogSuggestions);

/**
 * @route POST /api/ai/blog/enhance
 * @desc Enhance existing blog content
 * @access Private
 * @body {
 *   blogId: string (required) - ID of blog to enhance
 *   enhancementType?: 'improve' | 'rewrite' | 'expand' | 'summarize'
 *   customPrompt?: string - Custom enhancement instructions
 *   targetWordCount?: number - Target word count for enhancement
 *   updateInDatabase?: boolean - Whether to update the original blog
 * }
 */
router.post('/blog/enhance', authenticateToken, enhanceExistingBlog);

/**
 * @route POST /api/ai/blog/meta-description
 * @desc Generate SEO-optimized meta descriptions
 * @access Private
 * @body {
 *   title: string (required) - Blog title
 *   content?: string - Blog content preview
 *   targetLength?: number - Max character length (default: 160)
 * }
 */
router.post('/blog/meta-description', authenticateToken, generateMetaDescription);

/**
 * @route POST /api/ai/blog/tags
 * @desc Generate relevant tags for content
 * @access Private
 * @body {
 *   title: string (required) - Content title
 *   content?: string - Content body
 *   maxTags?: number - Maximum number of tags (default: 10)
 * }
 */
router.post('/blog/tags', authenticateToken, generateTags);

/**
 * @route GET /api/ai/blog/stats
 * @desc Get user's blog generation statistics
 * @access Private
 */
router.get('/blog/stats', authenticateToken, getBlogGenerationStats);

/**
 * @route GET /api/ai/blog/health
 * @desc Check AI blog service health
 * @access Private
 */
router.get('/blog/health', authenticateToken, getAIHealthStatus);

// ============================================================================
// CONTENT AI ROUTES - Content enhancement and optimization (Legacy Support)
// ============================================================================

/**
 * @route POST /api/ai/content/enhance
 * @desc Legacy content enhancement endpoint
 * @access Private
 * @deprecated Use /blog/generate-content or /blog/enhance instead
 */
router.post('/content/enhance', authenticateToken, enhanceContent);

/**
 * @route POST /api/ai/content/suggestions
 * @desc Legacy content suggestions endpoint
 * @access Private
 * @deprecated Use /blog/suggestions instead
 */
router.post('/content/suggestions', authenticateToken, generateContentSuggestions);

/**
 * @route POST /api/ai/content/meta-description
 * @desc Legacy meta description generation
 * @access Private
 * @deprecated Use /blog/meta-description instead
 */
router.post('/content/meta-description', authenticateToken, generateMetaDescription);

// ============================================================================
// FUTURE AI FEATURES - Planned endpoints for expansion
// ============================================================================

// TODO: Image AI Routes
// router.post('/image/generate', authenticateToken, generateImage);
// router.post('/image/edit', authenticateToken, editImage);
// router.post('/image/optimize', authenticateToken, optimizeImage);

// TODO: SEO AI Routes  
// router.post('/seo/analyze', authenticateToken, analyzeSEO);
// router.post('/seo/keywords', authenticateToken, generateKeywords);
// router.post('/seo/optimize', authenticateToken, optimizeForSEO);

// TODO: Social Media AI Routes
// router.post('/social/posts', authenticateToken, generateSocialPosts);
// router.post('/social/hashtags', authenticateToken, generateHashtags);
// router.post('/social/captions', authenticateToken, generateCaptions);

// TODO: Course Content AI Routes
// router.post('/course/outline', authenticateToken, generateCourseOutline);
// router.post('/course/content', authenticateToken, generateCourseContent);
// router.post('/course/quiz', authenticateToken, generateQuiz);

// TODO: Marketing AI Routes
// router.post('/marketing/emails', authenticateToken, generateEmailContent);
// router.post('/marketing/ads', authenticateToken, generateAdContent);
// router.post('/marketing/landing-page', authenticateToken, generateLandingPage);

// TODO: Analytics AI Routes
// router.post('/analytics/insights', authenticateToken, generateInsights);
// router.post('/analytics/reports', authenticateToken, generateReports);
// router.post('/analytics/predictions', authenticateToken, makePredictions);

// TODO: Translation AI Routes
// router.post('/translate/content', authenticateToken, translateContent);
// router.post('/translate/batch', authenticateToken, batchTranslate);

// TODO: Voice/Audio AI Routes
// router.post('/audio/transcribe', authenticateToken, transcribeAudio);
// router.post('/audio/generate', authenticateToken, generateAudio);

// ============================================================================
// AI SYSTEM ROUTES - System-level AI operations
// ============================================================================

/**
 * @route GET /api/ai/health
 * @desc Check overall AI system health
 * @access Private
 */
router.get('/health', healthCheck);

/**
 * @route GET /api/ai/capabilities
 * @desc Get available AI capabilities and features
 * @access Private
 */
router.get('/capabilities', getCapabilities);

/**
 * @route GET /api/ai/usage
 * @desc Get user's AI usage statistics
 * @access Private
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    // Get blog generation stats (reuse existing function)
    const blogStatsResponse = await getBlogGenerationStats(req, {
      status: () => ({ json: (data) => data }),
      json: (data) => data
    });
    
    const usage = {
      blog: blogStatsResponse.success ? blogStatsResponse.data : { totalAIBlogs: 0 },
      // TODO: Add other service usage statistics
      // image: { totalGenerations: 0 },
      // seo: { totalAnalyses: 0 },
      // social: { totalPosts: 0 }
      totalAIOperations: blogStatsResponse.success ? blogStatsResponse.data.totalAIBlogs : 0,
      currentPeriod: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        end: new Date().toISOString()
      }
    };
    
    res.status(200).json({
      success: true,
      data: usage,
      message: 'AI usage statistics retrieved successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI usage statistics',
      error: error.message
    });
  }
});

// Authentication required for all AI content generation endpoints
router.use(authenticateToken);

// Blog Content Enhancement Endpoints
router.post('/enhance-blog-content', aiRateLimit, enhanceBlogContent);
router.post('/rewrite-blog-content', premiumAIRateLimit, rewriteBlogContent);
router.post('/expand-blog-content', premiumAIRateLimit, expandBlogContent);
router.post('/generate-blog-content', premiumAIRateLimit, generateFreshBlogContent);

// SEO and Optimization Endpoints
router.post('/generate-blog-seo', aiRateLimit, generateBlogSEO);
router.post('/generate-blog-tags', aiRateLimit, generateBlogTags);
router.post('/generate-meta-description', aiRateLimit, generateMetaDescription);
router.post('/generate-slug', aiRateLimit, generateSlug);

// Analysis Endpoints
router.post('/analyze-blog-content', aiRateLimit, analyzeBlogContent);

export default router; 