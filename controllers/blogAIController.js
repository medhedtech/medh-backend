import blogAIService from '../services/blogAIService.js';
import BlogsModel from '../models/blog-model.js';
import { validateBlog } from '../utils/validators.js';
import logger from '../utils/logger.js';

/**
 * Blog AI Controller
 * Handles all AI-powered blog generation and enhancement operations
 */

// Helper function to calculate SEO score
const calculateSEOScore = (blogData) => {
  let score = 0;
  let maxScore = 10;
  
  // Title optimization (20%)
  if (blogData.title) {
    if (blogData.title.length >= 50 && blogData.title.length <= 60) score += 2;
    else if (blogData.title.length >= 30 && blogData.title.length <= 70) score += 1;
  }
  
  // Meta title optimization (10%)
  if (blogData.meta_title && blogData.meta_title.length >= 50 && blogData.meta_title.length <= 60) {
    score += 1;
  }
  
  // Meta description optimization (20%)
  if (blogData.meta_description) {
    if (blogData.meta_description.length >= 150 && blogData.meta_description.length <= 160) score += 2;
    else if (blogData.meta_description.length >= 120 && blogData.meta_description.length <= 170) score += 1;
  }
  
  // Content length optimization (10%)
  const wordCount = blogData.content ? blogData.content.split(/\s+/).length : 0;
  if (wordCount >= 800) score += 1;
  
  // Tags optimization (10%)
  if (blogData.tags && blogData.tags.length >= 5 && blogData.tags.length <= 10) {
    score += 1;
  }
  
  // SEO keywords optimization (10%)
  if (blogData.seo_keywords && blogData.seo_keywords.length >= 3 && blogData.seo_keywords.length <= 5) {
    score += 1;
  }
  
  // Featured image optimization (10%)
  if (blogData.upload_image && blogData.featured_image_alt) {
    score += 1;
  }
  
  // Description/excerpt optimization (10%)
  if (blogData.description && blogData.description.length >= 150 && blogData.description.length <= 250) {
    score += 1;
  }
  
  return Math.round((score / maxScore) * 100);
};

// Validation schemas for AI blog operations
const validateBlogAIRequest = (data, type) => {
  const errors = [];
  
  switch (type) {
    case 'generateFromPrompt':
      if (!data.prompt?.trim()) {
        errors.push('Prompt is required for blog generation');
      }
      if (data.approach && !['comprehensive', 'creative', 'professional', 'technical'].includes(data.approach)) {
        errors.push('Invalid approach. Must be one of: comprehensive, creative, professional, technical');
      }
      break;
      
    case 'generateContent':
      if (!data.title?.trim()) {
        errors.push('Title is required for content generation');
      }
      if (data.approach && !['comprehensive', 'creative', 'professional', 'technical'].includes(data.approach)) {
        errors.push('Invalid approach. Must be one of: comprehensive, creative, professional, technical');
      }
      break;
      
    case 'suggestions':
      if (!data.topic?.trim()) {
        errors.push('Topic is required for suggestions');
      }
      if (data.count && (data.count < 1 || data.count > 20)) {
        errors.push('Count must be between 1 and 20');
      }
      break;
      
    case 'enhance':
      if (!data.blogId?.trim()) {
        errors.push('Blog ID is required for enhancement');
      }
      if (data.enhancementType && !['improve', 'rewrite', 'expand', 'summarize'].includes(data.enhancementType)) {
        errors.push('Invalid enhancement type. Must be one of: improve, rewrite, expand, summarize');
      }
      break;
  }
  
  return errors;
};

/**
 * Generate a complete blog from a simple prompt
 * POST /api/ai/blog/generate-from-prompt
 */
export const generateBlogFromPrompt = async (req, res) => {
  try {
    logger.info('Blog generation from prompt requested', {
      userId: req.user?._id,
      hasPrompt: !!req.body.prompt
    });

    // Validate request
    const validationErrors = validateBlogAIRequest(req.body, 'generateFromPrompt');
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const {
      prompt,
      approach = 'comprehensive',
      categories = [],
      status = 'draft',
      featured = false,
      saveToDatabase = false
    } = req.body;

    // Extract author ID (fallback to null for default "Medh Team")
    const authorId = req.user?._id || req.user?.id || null;

    // Generate blog from prompt
    const blogData = await blogAIService.generateBlogFromPrompt({
      prompt,
      approach,
      authorId,
      categories,
      status,
      featured
    });

    // Save to database if requested
    let savedBlog = null;
    if (saveToDatabase) {
      try {
        savedBlog = await blogAIService.createBlogPost(blogData);
      } catch (saveError) {
        logger.warn('Failed to save generated blog to database', {
          error: saveError.message,
          title: blogData.title
        });
        // Continue without saving - return the generated data
      }
    }

    // Calculate word count for response
    const wordCount = blogData.content.split(/\s+/).filter(word => word.length > 0).length;

    // Prepare comprehensive form data
    const formData = savedBlog || blogData;
    const comprehensiveResponse = {
      // Core blog fields
      title: formData.title,
      description: formData.description,
      excerpt: formData.excerpt,
      content: formData.content,
      slug: formData.slug,
      
      // SEO fields
      meta_title: formData.meta_title,
      meta_description: formData.meta_description,
      seo_keywords: formData.seo_keywords || [],
      
      // Media fields
      upload_image: formData.upload_image,
      featured_image_alt: formData.featured_image_alt,
      featured_image_caption: formData.featured_image_caption,
      
      // Taxonomy
      tags: formData.tags || [],
      categories: formData.categories || categories,
      
      // Settings
      status: formData.status,
      featured: formData.featured,
      blog_link: formData.blog_link,
      
      // Content metadata
      content_type: formData.content_type,
      target_audience: formData.target_audience,
      call_to_action: formData.call_to_action,
      
      // Analytics
      reading_time: formData.reading_time,
      likes: formData.likes || 0,
      views: formData.views || 0,
      comments: formData.comments || [],
      
      // Author and timestamps
      author: formData.author || authorId || "Medh Team",
      author_name: formData.author_name || "Medh Team",
      author_type: formData.author_type || "team",
      createdAt: formData.createdAt,
      updatedAt: formData.updatedAt,
      
      // AI metadata
      ai_generated: formData.ai_generated,
      generation_approach: formData.generation_approach,
      generation_timestamp: formData.generation_timestamp,
      
      // Database info
      ...(savedBlog && { _id: savedBlog._id, id: savedBlog._id })
    };

    res.status(200).json({
      success: true,
      data: {
        // Main form data - ready to populate any blog form
        formData: comprehensiveResponse,
        
        // Additional metadata
        metadata: {
          generated: true,
          approach,
          wordCount,
          readingTime: blogData.reading_time,
          tagCount: formData.tags?.length || 0,
          seoKeywordCount: formData.seo_keywords?.length || 0,
          saved: !!savedBlog,
          ...(savedBlog && { databaseId: savedBlog._id })
        },
        
        // Form helper data
        formHelpers: {
          titleLength: formData.title?.length || 0,
          descriptionLength: formData.description?.length || 0,
          excerptLength: formData.excerpt?.length || 0,
          metaTitleLength: formData.meta_title?.length || 0,
          metaDescriptionLength: formData.meta_description?.length || 0,
          contentWordCount: wordCount,
          estimatedReadTime: `${Math.ceil(wordCount / 200)} min read`,
                     seoScore: calculateSEOScore(formData),
          hasRequiredFields: !!(formData.title && formData.content && formData.description),
          publishReady: !!(formData.title && formData.content && formData.description && 
                          formData.meta_title && formData.meta_description && formData.tags?.length)
        }
      },
      message: `Complete blog generated successfully with ${approach} approach${savedBlog ? ' and saved to database' : ''}. Ready for form population!`
    });

  } catch (error) {
    logger.error('Blog generation from prompt failed', {
      error: error.message,
      userId: req.user?._id,
      prompt: req.body.prompt?.substring(0, 100)
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate blog from prompt',
      error: error.message,
      details: 'Please try again with a different prompt or contact support if the issue persists'
    });
  }
};

/**
 * Generate blog content from title and description
 * POST /api/ai/blog/generate-content
 */
export const generateBlogContent = async (req, res) => {
  try {
    logger.info('Blog content generation requested', {
      userId: req.user?._id,
      title: req.body.title?.substring(0, 50)
    });

    // Validate request
    const validationErrors = validateBlogAIRequest(req.body, 'generateContent');
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const {
      title,
      description = '',
      categories = [],
      tags = [],
      approach = 'professional',
      blog_link = null,
      status = 'draft',
      featured = false,
      regenerate = false,
      saveToDatabase = false
    } = req.body;

    // Extract author ID (fallback to null for default "Medh Team")
    const authorId = req.user?._id || req.user?.id || null;

    // Generate blog content
    const blogData = await blogAIService.generateBlogContent({
      title,
      description,
      categories,
      tags,
      approach,
      authorId,
      blog_link,
      status,
      featured,
      regenerate
    });

    // Save to database if requested
    let savedBlog = null;
    if (saveToDatabase) {
      try {
        savedBlog = await blogAIService.createBlogPost(blogData);
      } catch (saveError) {
        logger.warn('Failed to save generated blog to database', {
          error: saveError.message,
          title: blogData.title
        });
      }
    }

    // Calculate word count for response
    const wordCount = blogData.content.split(/\s+/).filter(word => word.length > 0).length;

    res.status(200).json({
      success: true,
      data: {
        blogData: savedBlog || blogData,
        generated: true,
        approach,
        wordCount,
        readingTime: blogData.reading_time,
        regenerated: regenerate,
        saved: !!savedBlog,
        ...(savedBlog && { databaseId: savedBlog._id })
      },
      message: `Blog content generated successfully with ${approach} approach${savedBlog ? ' and saved to database' : ''}`
    });

  } catch (error) {
    logger.error('Blog content generation failed', {
      error: error.message,
      userId: req.user?._id,
      title: req.body.title
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate blog content',
      error: error.message,
      details: 'Please try again or contact support if the issue persists'
    });
  }
};

/**
 * Generate blog post suggestions
 * POST /api/ai/blog/suggestions
 */
export const generateBlogSuggestions = async (req, res) => {
  try {
    logger.info('Blog suggestions requested', {
      userId: req.user?._id,
      topic: req.body.topic?.substring(0, 50)
    });

    // Validate request
    const validationErrors = validateBlogAIRequest(req.body, 'suggestions');
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const {
      topic,
      categories = [],
      tags = [],
      count = 5,
      approach = 'professional'
    } = req.body;

    // Generate suggestions
    const suggestions = await blogAIService.generateBlogSuggestions({
      topic,
      categories,
      tags,
      count,
      approach
    });

    res.status(200).json({
      success: true,
      data: {
        suggestions,
        topic,
        categories,
        tags,
        count: suggestions.length,
        approach
      },
      message: 'Blog suggestions generated successfully'
    });

  } catch (error) {
    logger.error('Blog suggestions generation failed', {
      error: error.message,
      userId: req.user?._id,
      topic: req.body.topic
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate blog suggestions',
      error: error.message
    });
  }
};

/**
 * Enhance existing blog content
 * POST /api/ai/blog/enhance
 */
export const enhanceExistingBlog = async (req, res) => {
  try {
    logger.info('Blog enhancement requested', {
      userId: req.user?._id,
      blogId: req.body.blogId,
      enhancementType: req.body.enhancementType
    });

    // Validate request
    const validationErrors = validateBlogAIRequest(req.body, 'enhance');
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const {
      blogId,
      enhancementType = 'improve',
      customPrompt = null,
      targetWordCount = null,
      updateInDatabase = false
    } = req.body;

    // Check if blog exists and user has permission
    const existingBlog = await BlogsModel.findById(blogId);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Check ownership (author or admin)
    const userId = req.user?._id || req.user?.id;
    const isOwner = existingBlog.author.toString() === userId.toString();
    const isAdmin = req.user?.role?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to enhance this blog'
      });
    }

    // Enhance the blog
    const enhancedBlogData = await blogAIService.enhanceExistingBlog({
      blogId,
      enhancementType,
      customPrompt,
      targetWordCount
    });

    // Update in database if requested
    let updatedBlog = null;
    if (updateInDatabase) {
      try {
        updatedBlog = await BlogsModel.findByIdAndUpdate(
          blogId,
          {
            content: enhancedBlogData.content,
            tags: enhancedBlogData.tags,
            meta_description: enhancedBlogData.meta_description,
            reading_time: enhancedBlogData.reading_time,
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        ).populate(['categories', 'author']);

      } catch (updateError) {
        logger.warn('Failed to update enhanced blog in database', {
          error: updateError.message,
          blogId
        });
      }
    }

    // Calculate enhancement metrics
    const originalWordCount = existingBlog.content.split(/\s+/).filter(word => word.length > 0).length;
    const enhancedWordCount = enhancedBlogData.content.split(/\s+/).filter(word => word.length > 0).length;

    res.status(200).json({
      success: true,
      data: {
        blogData: updatedBlog || enhancedBlogData,
        enhanced: true,
        enhancementType,
        originalWordCount,
        enhancedWordCount,
        improvementRatio: originalWordCount > 0 ? (enhancedWordCount / originalWordCount).toFixed(2) : 'N/A',
        updated: !!updatedBlog,
        ...(updatedBlog && { databaseId: updatedBlog._id })
      },
      message: `Blog content enhanced successfully using ${enhancementType} approach${updatedBlog ? ' and updated in database' : ''}`
    });

  } catch (error) {
    logger.error('Blog enhancement failed', {
      error: error.message,
      userId: req.user?._id,
      blogId: req.body.blogId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to enhance blog content',
      error: error.message
    });
  }
};

/**
 * Generate SEO-optimized meta description
 * POST /api/ai/blog/meta-description
 */
export const generateMetaDescription = async (req, res) => {
  try {
    const { title, content, targetLength = 160 } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required for meta description generation'
      });
    }

    // Generate meta description
    const metaDescription = await blogAIService.aiService.generateMetaDescription(
      title, 
      content || '', 
      targetLength
    );

    res.status(200).json({
      success: true,
      data: {
        metaDescription,
        length: metaDescription.length,
        isOptimal: metaDescription.length <= targetLength,
        title,
        targetLength
      },
      message: 'Meta description generated successfully'
    });

  } catch (error) {
    logger.error('Meta description generation failed', {
      error: error.message,
      title: req.body.title
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate meta description',
      error: error.message
    });
  }
};

/**
 * Generate tags for content
 * POST /api/ai/blog/tags
 */
export const generateTags = async (req, res) => {
  try {
    const { title, content, maxTags = 10 } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required for tag generation'
      });
    }

    // Generate tags
    const tags = await blogAIService.aiService.generateTags(
      title, 
      content || '', 
      maxTags
    );

    res.status(200).json({
      success: true,
      data: {
        tags,
        count: tags.length,
        title,
        maxTags
      },
      message: 'Tags generated successfully'
    });

  } catch (error) {
    logger.error('Tag generation failed', {
      error: error.message,
      title: req.body.title
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate tags',
      error: error.message
    });
  }
};

/**
 * Get AI service health status
 * GET /api/ai/blog/health
 */
export const getAIHealthStatus = async (req, res) => {
  try {
    const healthStatus = await blogAIService.getHealthStatus();

    const statusCode = healthStatus.blogAIService === 'healthy' && 
                      healthStatus.aiService.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: healthStatus.blogAIService === 'healthy',
      data: healthStatus,
      message: healthStatus.blogAIService === 'healthy' ? 
        'AI Blog service is healthy' : 
        'AI Blog service is experiencing issues'
    });

  } catch (error) {
    logger.error('AI health check failed', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};

/**
 * Get blog generation statistics for the user
 * GET /api/ai/blog/stats
 */
export const getBlogGenerationStats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Get user's AI-generated blogs
    const aiGeneratedBlogs = await BlogsModel.find({
      author: userId,
      ai_generated: true
    }).select('title createdAt generation_approach reading_time status featured');

    // Calculate statistics
    const stats = {
      totalAIBlogs: aiGeneratedBlogs.length,
      published: aiGeneratedBlogs.filter(blog => blog.status === 'published').length,
      drafts: aiGeneratedBlogs.filter(blog => blog.status === 'draft').length,
      featured: aiGeneratedBlogs.filter(blog => blog.featured).length,
      totalReadingTime: aiGeneratedBlogs.reduce((sum, blog) => sum + (blog.reading_time || 0), 0),
      approachBreakdown: {
        comprehensive: aiGeneratedBlogs.filter(blog => blog.generation_approach === 'comprehensive').length,
        creative: aiGeneratedBlogs.filter(blog => blog.generation_approach === 'creative').length,
        professional: aiGeneratedBlogs.filter(blog => blog.generation_approach === 'professional').length,
        technical: aiGeneratedBlogs.filter(blog => blog.generation_approach === 'technical').length
      },
      recentBlogs: aiGeneratedBlogs
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(blog => ({
          id: blog._id,
          title: blog.title,
          approach: blog.generation_approach,
          status: blog.status,
          createdAt: blog.createdAt
        }))
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Blog generation statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get blog generation stats', {
      error: error.message,
      userId: req.user?._id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blog generation statistics',
      error: error.message
    });
  }
}; 