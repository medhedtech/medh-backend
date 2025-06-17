import aiService from './aiService.js';
import BlogsModel from '../models/blog-model.js';
import logger from '../utils/logger.js';
import slugify from 'slugify';

/**
 * Specialized AI service for blog-related operations
 * Integrates with the blog model and provides comprehensive blog generation
 */
class BlogAIService {
  constructor() {
    this.aiService = aiService;
  }

  /**
   * Generate a complete blog from a simple prompt
   * @param {Object} options - Blog generation options
   * @returns {Promise<Object>} Complete blog data
   */
  async generateBlogFromPrompt({
    prompt,
    approach = 'comprehensive',
    authorId,
    categories = [],
    status = 'draft',
    featured = false
  }) {
    try {
      logger.info('Starting blog generation from prompt', { 
        prompt: prompt.substring(0, 100) + '...', 
        approach,
        authorId 
      });

      // Define approach-specific configurations
      const approachConfigs = {
        comprehensive: {
          model: 'professional',
          temperature: 'balanced',
          wordTarget: '1200-1800'
        },
        creative: {
          model: 'creative',
          temperature: 'creative',
          wordTarget: '800-1200'
        },
        professional: {
          model: 'professional',
          temperature: 'professional',
          wordTarget: '1000-1500'
        },
        technical: {
          model: 'technical',
          temperature: 'technical',
          wordTarget: '1500-2500'
        }
      };

      const config = approachConfigs[approach] || approachConfigs.comprehensive;

      // System prompt for comprehensive blog generation
      const systemPrompt = `You are an expert blog writer and content strategist. Generate a complete blog post with all necessary metadata based on the user's prompt.

You must respond with a valid JSON object containing these exact fields:
{
  "title": "An engaging, SEO-friendly blog title (50-60 characters)",
  "description": "A compelling description that summarizes the blog (150-250 characters)",
  "excerpt": "A brief excerpt for blog listings (100-150 characters)",
  "content": "Full HTML-formatted blog content (${config.wordTarget} words) with proper headings, paragraphs, lists, and formatting",
  "blog_link": "https://example.com/related-resource-or-empty-string", // Optional external link or empty string
  "tags": ["array", "of", "relevant", "tags", "max", "10"],
  "meta_title": "SEO-optimized meta title (50-60 characters)",
  "meta_description": "SEO meta description (150-160 characters)",
  "seo_keywords": ["primary", "secondary", "keywords", "for", "seo"],
  "featured_image_alt": "Descriptive alt text for featured image",
  "featured_image_caption": "Caption for featured image",
  "content_type": "guide|tutorial|article|review|analysis|news|opinion",
  "target_audience": "beginners|intermediate|advanced|general",
  "call_to_action": "Compelling call-to-action text for readers"
}

Content Requirements:
- Write in clean HTML format suitable for a rich text editor
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <code>
- Structure with compelling introduction, detailed body sections, and strong conclusion
- Include actionable insights and practical value
- Make content engaging, informative, and SEO-friendly
- Target ${config.wordTarget} words for the content field
- Generate 5-10 relevant, specific tags and 3-5 SEO keywords
- Ensure meta fields are optimized for search engines
- Include current trends and data where relevant
- Create compelling excerpt different from description
- Suggest appropriate content type and target audience
- Provide meaningful alt text and caption for featured image
- End with a strong call-to-action

Approach: ${this.getApproachDescription(approach)}

CRITICAL: Respond ONLY with the JSON object, no additional text, markdown formatting, or explanations.`;

      const userPrompt = `Generate a comprehensive blog post based on this prompt: "${prompt.trim()}"

Create valuable, engaging content that readers will find useful and informative. Focus on providing actionable insights and practical value.`;

      // Generate blog data
      const blogData = await this.aiService.generateStructuredResponse({
        systemPrompt,
        userPrompt,
        model: config.model,
        temperature: config.temperature,
        maxTokens: 4000,
        retryCount: 3
      });

      // Validate and process the generated data
      const processedBlogData = await this.processBlogData(blogData, {
        authorId,
        categories,
        status,
        featured,
        approach
      });

      logger.info('Blog generated successfully from prompt', {
        title: processedBlogData.title,
        contentLength: processedBlogData.content.length,
        tagCount: processedBlogData.tags.length
      });

      return processedBlogData;

    } catch (error) {
      logger.error('Blog generation from prompt failed', {
        error: error.message,
        prompt: prompt.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Generate blog content from title and description
   * @param {Object} options - Blog generation options
   * @returns {Promise<Object>} Generated blog data
   */
  async generateBlogContent({
    title,
    description = '',
    categories = [],
    tags = [],
    approach = 'professional',
    authorId,
    blog_link = null,
    status = 'draft',
    featured = false,
    regenerate = false
  }) {
    try {
      logger.info('Generating blog content', { 
        title, 
        approach, 
        regenerate,
        authorId 
      });

      const config = this.getApproachConfig(approach);
      
      // Build context for content generation
      const contextParts = [
        `Title: ${title.trim()}`,
        description?.trim() ? `Description: ${description.trim()}` : '',
        categories?.length ? `Categories: ${categories.join(', ')}` : '',
        tags?.length ? `Existing Tags: ${tags.join(', ')}` : ''
      ].filter(Boolean);

      const context = contextParts.join('\n');

      // System prompt for content generation
      const systemPrompt = `You are an expert blog content writer. Generate comprehensive, high-quality blog content based on the provided information.

Requirements:
- Generate content in clean HTML format suitable for a rich text editor
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>
- Create ${config.wordTarget} words of engaging, valuable content
- Structure with compelling introduction, detailed sections, and strong conclusion
- Include actionable insights and practical information
- Make content SEO-friendly with natural keyword usage
- Ensure content is original and plagiarism-free

Approach: ${this.getApproachDescription(approach)}

${regenerate ? 'Generate a completely different version with fresh perspectives and new angles on the same topic.' : ''}

Return only the HTML content, no additional formatting or explanations.`;

      const userPrompt = `Generate comprehensive blog content based on:

${context}

Create valuable, engaging content that provides real insights and practical value to readers interested in this topic.`;

      // Generate content
      const content = await this.aiService.generateCompletion({
        systemPrompt,
        userPrompt,
        model: config.model,
        temperature: config.temperature,
        maxTokens: 3000
      });

      // Generate additional blog metadata
      const [generatedTags, metaDescription] = await Promise.all([
        tags.length === 0 ? this.aiService.generateTags(title, content, 10) : Promise.resolve(tags),
        this.aiService.generateMetaDescription(title, content, 160)
      ]);

      // Calculate reading time
      const reading_time = this.aiService.calculateReadingTime(content);

      // Process and return blog data
      const blogData = {
        title: title.trim(),
        description: description || this.extractDescription(content),
        content,
        blog_link,
        tags: generatedTags,
        meta_title: title.length <= 60 ? title : title.substring(0, 57) + '...',
        meta_description: metaDescription,
        reading_time,
        author: authorId,
        categories,
        status,
        featured
      };

      const processedBlogData = await this.processBlogData(blogData, {
        authorId,
        categories,
        status,
        featured,
        approach
      });

      logger.info('Blog content generated successfully', {
        title: processedBlogData.title,
        contentLength: processedBlogData.content.length,
        readingTime: processedBlogData.reading_time
      });

      return processedBlogData;

    } catch (error) {
      logger.error('Blog content generation failed', {
        error: error.message,
        title
      });
      throw error;
    }
  }

  /**
   * Create and save a blog post to the database
   * @param {Object} blogData - Blog data to save
   * @returns {Promise<Object>} Saved blog document
   */
  async createBlogPost(blogData) {
    try {
      // Validate required fields
      if (!blogData.title || !blogData.content || !blogData.author) {
        throw new Error('Missing required fields: title, content, and author are required');
      }

      // Create new blog document
      const blog = new BlogsModel(blogData);
      
      // Save to database
      const savedBlog = await blog.save();
      
      // Populate references
      await savedBlog.populate(['categories', 'author']);

      logger.info('Blog post created and saved to database', {
        id: savedBlog._id,
        title: savedBlog.title,
        author: savedBlog.author._id
      });

      return savedBlog;

    } catch (error) {
      logger.error('Failed to create blog post', {
        error: error.message,
        title: blogData.title
      });
      throw error;
    }
  }

  /**
   * Generate blog ideas/suggestions
   * @param {Object} options - Suggestion options
   * @returns {Promise<Array>} Array of blog suggestions
   */
  async generateBlogSuggestions({
    topic,
    categories = [],
    tags = [],
    count = 5,
    approach = 'professional'
  }) {
    try {
      const systemPrompt = `You are an expert content strategist. Generate creative and engaging blog post ideas based on the given topic and context.

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "title": "Engaging blog post title (50-60 characters)",
    "description": "Brief description of the blog post (150-200 characters)",
    "outline": ["Main section 1", "Main section 2", "Main section 3", "Conclusion"],
    "targetAudience": "Who this content is for",
    "estimatedWordCount": 1500,
    "suggestedTags": ["tag1", "tag2", "tag3"],
    "contentType": "guide|tutorial|analysis|opinion|news|case-study",
    "difficulty": "beginner|intermediate|advanced"
  }
]

Requirements:
- Generate exactly ${count} unique blog post ideas
- Make titles engaging and SEO-friendly
- Include current trends and practical value
- Vary the content types and difficulty levels
- Ensure each idea offers unique value
- Focus on actionable, useful content

Return valid JSON only - no markdown formatting or extra text.`;

      const userPrompt = `Generate ${count} blog post ideas for topic: "${topic}"
${categories.length ? `Categories: ${categories.join(', ')}` : ''}
${tags.length ? `Related Tags: ${tags.join(', ')}` : ''}

Focus on current trends, practical value, and engaging content that readers will find genuinely useful.`;

      const suggestions = await this.aiService.generateStructuredResponse({
        systemPrompt,
        userPrompt,
        model: 'creative',
        temperature: 'creative',
        maxTokens: 2500,
        retryCount: 2
      });

      if (!Array.isArray(suggestions)) {
        throw new Error('Invalid suggestions format received');
      }

      logger.info('Blog suggestions generated successfully', {
        topic,
        count: suggestions.length
      });

      return suggestions.slice(0, count);

    } catch (error) {
      logger.error('Blog suggestions generation failed', {
        error: error.message,
        topic
      });
      throw error;
    }
  }

  /**
   * Enhance existing blog content
   * @param {Object} options - Enhancement options
   * @returns {Promise<Object>} Enhanced blog data
   */
  async enhanceExistingBlog({
    blogId,
    enhancementType = 'improve', // improve|rewrite|expand|summarize
    customPrompt = null,
    targetWordCount = null
  }) {
    try {
      // Fetch existing blog
      const existingBlog = await BlogsModel.findById(blogId);
      
      if (!existingBlog) {
        throw new Error('Blog not found');
      }

      logger.info('Enhancing existing blog', {
        blogId,
        title: existingBlog.title,
        enhancementType
      });

      // Define enhancement prompts
      const enhancementPrompts = {
        improve: 'Enhance this content by improving clarity, adding current data and insights, making it more engaging while maintaining the original structure and key points.',
        rewrite: 'Completely rewrite this content with a fresh perspective, improved structure, and enhanced readability while covering the same core topics.',
        expand: 'Significantly expand this content with additional sections, more detailed explanations, current research, statistics, and practical insights.',
        summarize: 'Create a concise, well-structured summary of this content highlighting the key points, main insights, and actionable takeaways.'
      };

      const systemPrompt = `You are an expert content editor and writer. ${enhancementPrompts[enhancementType] || enhancementPrompts.improve}

${customPrompt ? `Additional Instructions: ${customPrompt}` : ''}

Requirements:
- Maintain HTML formatting with proper tags
- ${targetWordCount ? `Target approximately ${targetWordCount} words` : 'Adjust length appropriately for the enhancement type'}
- Keep content engaging and valuable
- Ensure SEO-friendly structure
- Maintain or improve readability

Return only the enhanced HTML content, no additional formatting.`;

      const userPrompt = `${enhancementType.charAt(0).toUpperCase() + enhancementType.slice(1)} this blog content:

Title: ${existingBlog.title}
Current Content: ${existingBlog.content}

${existingBlog.description ? `Description: ${existingBlog.description}` : ''}`;

      // Generate enhanced content
      const enhancedContent = await this.aiService.generateCompletion({
        systemPrompt,
        userPrompt,
        model: 'professional',
        temperature: enhancementType === 'creative' ? 'creative' : 'professional',
        maxTokens: 3500
      });

      // Generate updated metadata
      const [updatedTags, updatedMetaDescription] = await Promise.all([
        this.aiService.generateTags(existingBlog.title, enhancedContent, 10),
        this.aiService.generateMetaDescription(existingBlog.title, enhancedContent, 160)
      ]);

      // Calculate new reading time
      const reading_time = this.aiService.calculateReadingTime(enhancedContent);

      const enhancedBlogData = {
        ...existingBlog.toObject(),
        content: enhancedContent,
        tags: updatedTags,
        meta_description: updatedMetaDescription,
        reading_time,
        // Update timestamp to reflect enhancement
        updatedAt: new Date()
      };

      logger.info('Blog enhancement completed', {
        blogId,
        originalLength: existingBlog.content.length,
        enhancedLength: enhancedContent.length,
        enhancementType
      });

      return enhancedBlogData;

    } catch (error) {
      logger.error('Blog enhancement failed', {
        error: error.message,
        blogId,
        enhancementType
      });
      throw error;
    }
  }

  /**
   * Process and validate blog data
   * @param {Object} blogData - Raw blog data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed blog data
   */
  async processBlogData(blogData, options = {}) {
    try {
      // Validate required fields
      if (!blogData.title || !blogData.content) {
        throw new Error('Missing required fields: title and content');
      }

      // Generate slug if not provided
      if (!blogData.slug) {
        blogData.slug = slugify(blogData.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }

      // Ensure tags are properly formatted
      if (blogData.tags && Array.isArray(blogData.tags)) {
        blogData.tags = blogData.tags
          .map(tag => tag.toLowerCase().trim())
          .filter(tag => tag.length > 0)
          .slice(0, 10); // Limit to 10 tags
      }

      // Process SEO keywords
      if (blogData.seo_keywords && Array.isArray(blogData.seo_keywords)) {
        blogData.seo_keywords = blogData.seo_keywords
          .map(keyword => keyword.toLowerCase().trim())
          .filter(keyword => keyword.length > 0)
          .slice(0, 5); // Limit to 5 SEO keywords
      }

      // Calculate reading time if not provided
      if (!blogData.reading_time) {
        blogData.reading_time = this.aiService.calculateReadingTime(blogData.content);
      }

      // Generate excerpt if not provided
      if (!blogData.excerpt && blogData.content) {
        blogData.excerpt = this.extractDescription(blogData.content).substring(0, 150);
        if (blogData.excerpt.length === 150) {
          blogData.excerpt += '...';
        }
      }

      // Ensure meta fields are within limits
      if (blogData.meta_title && blogData.meta_title.length > 60) {
        blogData.meta_title = blogData.meta_title.substring(0, 57) + '...';
      }

      if (blogData.meta_description && blogData.meta_description.length > 160) {
        blogData.meta_description = blogData.meta_description.substring(0, 157) + '...';
      }

      // Ensure description is within limits
      if (blogData.description && blogData.description.length > 250) {
        blogData.description = blogData.description.substring(0, 247) + '...';
      }

      // Ensure excerpt is within limits
      if (blogData.excerpt && blogData.excerpt.length > 153) { // 150 + "..."
        blogData.excerpt = blogData.excerpt.substring(0, 150) + '...';
      }

      // Generate topic-relevant featured image URL if not provided
      if (!blogData.upload_image) {
        const imageKeywords = blogData.seo_keywords?.slice(0, 2).join('-') || 
                             blogData.tags?.slice(0, 2).join('-') || 
                             'blog-post';
        
        // Create a more relevant image URL based on content topic
        const searchQuery = encodeURIComponent(imageKeywords.replace(/-/g, ' '));
        blogData.upload_image = `https://images.unsplash.com/search/photos?query=${searchQuery}&featured=true&orientation=landscape&size=small&color=any`;
        
        // Fallback to a professional-looking default
        if (!blogData.upload_image || blogData.upload_image.includes('undefined')) {
          blogData.upload_image = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=400&fit=crop&crop=center&auto=format&q=80";
        }
      }

      // Set default values from options
      if (options.authorId) {
        blogData.author = options.authorId;
      } else {
        // Set default author to "Medh Team" for AI-generated content
        blogData.author = "Medh Team";
        blogData.author_name = "Medh Team";
        blogData.author_type = "team";
      }
      
      if (options.categories && options.categories.length > 0) {
        blogData.categories = options.categories;
      }
      if (options.status) blogData.status = options.status;
      if (options.featured !== undefined) blogData.featured = options.featured;

      // Set default values for new fields
      blogData.likes = blogData.likes || 0;
      blogData.views = blogData.views || 0;
      blogData.comments = blogData.comments || [];
      
      // Content metadata
      blogData.content_type = blogData.content_type || 'article';
      blogData.target_audience = blogData.target_audience || 'general';
      
      // Featured image metadata
      if (!blogData.featured_image_alt && blogData.title) {
        blogData.featured_image_alt = `Featured image for "${blogData.title}"`;
      }
      
      if (!blogData.featured_image_caption && blogData.title) {
        blogData.featured_image_caption = `Illustration for ${blogData.title}`;
      }

      // Default call to action if not provided
      if (!blogData.call_to_action) {
        blogData.call_to_action = "What are your thoughts on this topic? Share your experience in the comments below!";
      }

      // Clean up blog_link
      if (blogData.blog_link === "https://example.com/related-resource-or-empty-string" || 
          blogData.blog_link === "https://example.com/related-resource") {
        blogData.blog_link = null;
      }

      // Add generation metadata
      blogData.ai_generated = true;
      blogData.generation_approach = options.approach || 'comprehensive';
      blogData.generation_timestamp = new Date();

      // Format timestamps
      if (!blogData.createdAt) blogData.createdAt = new Date();
      if (!blogData.updatedAt) blogData.updatedAt = new Date();

      logger.info('Blog data processed successfully', {
        title: blogData.title,
        slug: blogData.slug,
        contentLength: blogData.content.length,
        tagCount: blogData.tags?.length || 0,
        seoKeywordCount: blogData.seo_keywords?.length || 0,
        readingTime: blogData.reading_time
      });

      return blogData;

    } catch (error) {
      logger.error('Blog data processing failed', {
        error: error.message,
        title: blogData?.title || 'Unknown'
      });
      throw error;
    }
  }

  /**
   * Get approach configuration
   * @param {string} approach - Approach type
   * @returns {Object} Configuration object
   */
  getApproachConfig(approach) {
    const configs = {
      comprehensive: {
        model: 'professional',
        temperature: 'balanced',
        wordTarget: '1200-1800'
      },
      creative: {
        model: 'creative',
        temperature: 'creative',
        wordTarget: '800-1200'
      },
      professional: {
        model: 'professional',
        temperature: 'professional',
        wordTarget: '1000-1500'
      },
      technical: {
        model: 'technical',
        temperature: 'technical',
        wordTarget: '1500-2500'
      }
    };

    return configs[approach] || configs.comprehensive;
  }

  /**
   * Get approach description
   * @param {string} approach - Approach type
   * @returns {string} Description
   */
  getApproachDescription(approach) {
    const descriptions = {
      comprehensive: 'Create thorough, well-researched content with balanced coverage of all key aspects',
      creative: 'Write engaging content with storytelling, vivid examples, and conversational tone',
      professional: 'Develop formal, informative content suitable for business and professional audiences',
      technical: 'Produce detailed technical content with step-by-step instructions and in-depth analysis'
    };

    return descriptions[approach] || descriptions.comprehensive;
  }

  /**
   * Extract description from content
   * @param {string} content - HTML content
   * @returns {string} Extracted description
   */
  extractDescription(content) {
    const plainText = this.aiService.extractTextFromHTML(content);
    const sentences = plainText.split('.').filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return '';
    
    // Take first 2-3 sentences or up to 200 characters
    let description = sentences[0];
    if (description.length < 100 && sentences.length > 1) {
      description += '. ' + sentences[1];
    }
    
    return description.length > 200 ? 
      description.substring(0, 197) + '...' : 
      description + '.';
  }

  /**
   * Get AI service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const aiHealth = await this.aiService.healthCheck();
      
      return {
        blogAIService: 'healthy',
        aiService: aiHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        blogAIService: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const blogAIService = new BlogAIService();

export default blogAIService; 