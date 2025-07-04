import OpenAI from 'openai';
import logger from '../utils/logger.js';

/**
 * Comprehensive AI Service for various AI-powered features
 * Designed to be extensible for future AI capabilities
 * Enhanced with blog content generation and optimization
 */
class AIService {
  constructor() {
    // Configuration for different AI models
    this.models = {
      creative: 'gpt-4o-mini',
      professional: 'gpt-4o',
      technical: 'gpt-4o',
      fast: 'gpt-4o-mini',
      premium: 'gpt-4o'
    };
    
    // Temperature settings for different approaches
    this.temperatures = {
      creative: 0.9,
      professional: 0.7,
      technical: 0.3,
      analytical: 0.2,
      balanced: 0.5
    };

    // Blog content generation presets
    this.blogPresets = {
      enhance: {
        model: 'professional',
        temperature: 'balanced',
        maxTokens: 3000
      },
      rewrite: {
        model: 'professional', 
        temperature: 'professional',
        maxTokens: 4000
      },
      expand: {
        model: 'creative',
        temperature: 'creative',
        maxTokens: 4500
      },
      seo: {
        model: 'technical',
        temperature: 'analytical',
        maxTokens: 2000
      }
    };
    
    // Initialize OpenAI client if API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      logger.warn('OpenAI API key is not configured. AI features will be disabled.');
      this.client = null;
      this.isConfigured = false;
    } else {
      try {
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isConfigured = true;
        logger.info('AI Service initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize OpenAI client', { error: error.message });
        this.client = null;
        this.isConfigured = false;
      }
    }
  }

  /**
   * Generate text completion with configurable parameters
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateCompletion({
    systemPrompt,
    userPrompt,
    model = 'professional',
    temperature = 'balanced',
    maxTokens = 2048,
    topP = 1,
    frequencyPenalty = 0,
    presencePenalty = 0
  }) {
    if (!this.isConfigured) {
      throw new Error('OpenAI API key is not configured. Please add your OpenAI API key to the .env file.');
    }
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.models[model] || this.models.professional,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: this.temperatures[temperature] || this.temperatures.balanced,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content generated from AI model');
      }

      logger.info('AI completion generated successfully', {
        model: this.models[model],
        temperature: this.temperatures[temperature],
        tokenCount: content.length
      });

      return content;

    } catch (error) {
      logger.error('AI completion generation failed', {
        error: error.message,
        model,
        temperature
      });
      throw this.handleAIError(error);
    }
  }

  /**
   * Generate structured JSON response
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Parsed JSON object
   */
  async generateStructuredResponse({
    systemPrompt,
    userPrompt,
    model = 'professional',
    temperature = 'balanced',
    maxTokens = 3000,
    retryCount = 2
  }) {
    let lastError;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const content = await this.generateCompletion({
          systemPrompt,
          userPrompt,
          model,
          temperature,
          maxTokens
        });

        // Clean and parse JSON response
        const cleanedContent = this.cleanJSONResponse(content);
        const parsedData = JSON.parse(cleanedContent);

        logger.info('Structured AI response generated successfully', {
          attempt: attempt + 1,
          hasData: !!parsedData
        });

        return parsedData;

      } catch (error) {
        lastError = error;
        logger.warn(`Structured response attempt ${attempt + 1} failed`, {
          error: error.message,
          attempt: attempt + 1,
          maxRetries: retryCount + 1
        });
        
        if (attempt === retryCount) {
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw new Error(`Failed to generate structured response after ${retryCount + 1} attempts: ${lastError.message}`);
  }

  /**
   * Enhance existing blog content with better structure and formatting
   * @param {Object} options - Enhancement options
   * @returns {Promise<Object>} Enhanced blog data
   */
  async enhanceBlogContent({
    title,
    content,
    description = '',
    targetWordCount = 1500,
    includeCodeExamples = false,
    addStatistics = true,
    improveStructure = true
  }) {
    try {
      const systemPrompt = `You are an expert content writer and SEO specialist. Enhance the provided blog content by:

${improveStructure ? '- Improving HTML structure with proper h2, h3, h4 headings hierarchy' : ''}
${addStatistics ? '- Adding relevant industry statistics and data points' : ''}
${includeCodeExamples ? '- Including practical code examples with proper <pre><code> formatting' : ''}
- Enhancing readability and engagement
- Maintaining the original tone and message
- Using semantic HTML tags (strong, em, blockquote, ul, ol)
- Creating scannable content with bullet points and numbered lists
- Adding relevant examples and case studies

Target word count: ~${targetWordCount} words
Return only clean HTML content without markdown formatting.
Ensure all HTML tags are properly closed and formatted.`;

      const userPrompt = `Title: ${title}

Current Description: ${description}

Current Content: ${content}

Please enhance this content to be more comprehensive, well-structured, and engaging while maintaining the core message and adding valuable information.`;

      const enhancedContent = await this.generateCompletion({
        systemPrompt,
        userPrompt,
        ...this.blogPresets.enhance,
        maxTokens: Math.max(3000, Math.floor(targetWordCount * 2.5))
      });

      // Generate enhanced SEO elements
      const seoData = await this.generateBlogSEO({
        title,
        content: enhancedContent,
        description
      });

      const wordCount = this.getWordCount(enhancedContent);
      const readingTime = this.calculateReadingTime(enhancedContent);

      return {
        content: enhancedContent.trim(),
        meta_title: seoData.meta_title,
        meta_description: seoData.meta_description,
        tags: seoData.tags,
        wordCount,
        readingTime,
        enhancement_applied: true,
        enhancement_type: 'structure_and_content'
      };

    } catch (error) {
      logger.error('Blog content enhancement failed', { error: error.message, title });
      throw new Error(`Failed to enhance blog content: ${error.message}`);
    }
  }

  /**
   * Completely rewrite blog content with professional structure
   * @param {Object} options - Rewrite options
   * @returns {Promise<Object>} Rewritten blog data
   */
  async rewriteBlogContent({
    title,
    content,
    description = '',
    targetWordCount = 1500,
    tone = 'professional',
    includeExamples = true,
    addStepByStep = false
  }) {
    try {
      const systemPrompt = `You are a professional content writer specializing in creating high-quality, engaging blog content. 

Completely rewrite the provided content with:
- Professional ${tone} tone
- Clear, logical structure with proper HTML hierarchy (h2, h3, h4)
- Engaging introduction that hooks the reader
- Well-organized sections with descriptive headings
- ${includeExamples ? 'Relevant examples and real-world applications' : ''}
- ${addStepByStep ? 'Step-by-step instructions where applicable' : ''}
- Strong conclusion with actionable takeaways
- Proper HTML formatting with semantic tags
- Bullet points and numbered lists for better readability
- Industry insights and best practices

Target: ${targetWordCount} words
Return clean HTML content only, no markdown.
Make it comprehensive, authoritative, and valuable to readers.`;

      const userPrompt = `Original Title: ${title}
Original Description: ${description}
Original Content: ${content}

Please create a completely new version that covers the same topics but with better structure, more depth, and professional presentation.`;

      const rewrittenContent = await this.generateCompletion({
        systemPrompt,
        userPrompt,
        ...this.blogPresets.rewrite,
        maxTokens: Math.max(4000, Math.floor(targetWordCount * 3))
      });

      // Generate new SEO elements for rewritten content
      const seoData = await this.generateBlogSEO({
        title,
        content: rewrittenContent,
        description
      });

      const wordCount = this.getWordCount(rewrittenContent);
      const readingTime = this.calculateReadingTime(rewrittenContent);

      return {
        content: rewrittenContent.trim(),
        meta_title: seoData.meta_title,
        meta_description: seoData.meta_description,
        tags: seoData.tags,
        wordCount,
        readingTime,
        enhancement_applied: true,
        enhancement_type: 'complete_rewrite'
      };

    } catch (error) {
      logger.error('Blog content rewrite failed', { error: error.message, title });
      throw new Error(`Failed to rewrite blog content: ${error.message}`);
    }
  }

  /**
   * Expand existing content with detailed explanations and examples
   * @param {Object} options - Expansion options
   * @returns {Promise<Object>} Expanded blog data
   */
  async expandBlogContent({
    title,
    content,
    description = '',
    targetWordCount = 2000,
    addCodeExamples = false,
    addTutorials = false,
    addLatestData = true,
    focusAreas = []
  }) {
    try {
      const systemPrompt = `You are an expert content creator specializing in comprehensive, in-depth articles. 

Significantly expand the provided content by:
- Adding detailed explanations for each major point
- ${addCodeExamples ? 'Including practical code examples with syntax highlighting' : ''}
- ${addTutorials ? 'Adding step-by-step tutorials and how-to sections' : ''}
- ${addLatestData ? 'Incorporating recent industry data and statistics' : ''}
- Expanding on concepts with real-world examples
- Adding subsections with proper HTML hierarchy
- Including best practices and expert tips
- Adding FAQ sections where relevant
- Using proper HTML formatting (pre, code, blockquote, etc.)
${focusAreas.length > 0 ? `- Pay special attention to: ${focusAreas.join(', ')}` : ''}

Target: ${targetWordCount} words
Return comprehensive HTML content that provides exceptional value.
Maintain logical flow and readability despite the increased length.`;

      const userPrompt = `Title: ${title}
Description: ${description}
Current Content: ${content}

Please expand this content significantly while maintaining quality and relevance. Make it the most comprehensive resource on this topic.`;

      const expandedContent = await this.generateCompletion({
        systemPrompt,
        userPrompt,
        ...this.blogPresets.expand,
        maxTokens: Math.max(4500, Math.floor(targetWordCount * 3.5))
      });

      // Generate updated SEO for expanded content
      const seoData = await this.generateBlogSEO({
        title,
        content: expandedContent,
        description
      });

      const wordCount = this.getWordCount(expandedContent);
      const readingTime = this.calculateReadingTime(expandedContent);

      return {
        content: expandedContent.trim(),
        meta_title: seoData.meta_title,
        meta_description: seoData.meta_description,
        tags: seoData.tags,
        wordCount,
        readingTime,
        enhancement_applied: true,
        enhancement_type: 'detailed_expansion'
      };

    } catch (error) {
      logger.error('Blog content expansion failed', { error: error.message, title });
      throw new Error(`Failed to expand blog content: ${error.message}`);
    }
  }

  /**
   * Generate fresh blog content from a prompt or topic
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated blog data
   */
  async generateFreshBlogContent({
    prompt,
    title = '',
    targetWordCount = 1500,
    tone = 'professional',
    includeCodeExamples = false,
    includeStatistics = true,
    targetAudience = 'general'
  }) {
    try {
      const systemPrompt = `You are a professional blog writer creating high-quality, original content.

Create comprehensive blog content based on the provided prompt with:
- Engaging, SEO-optimized title if not provided
- Compelling introduction that hooks readers
- Well-structured content with proper HTML hierarchy (h2, h3, h4)
- ${tone} tone appropriate for ${targetAudience} audience
- ${includeCodeExamples ? 'Practical code examples with proper formatting' : ''}
- ${includeStatistics ? 'Relevant industry statistics and data' : ''}
- Real-world examples and case studies
- Actionable insights and takeaways
- Strong conclusion with clear next steps
- Proper HTML formatting with semantic tags

Target: ${targetWordCount} words
Return clean HTML content only.
Make it comprehensive, valuable, and engaging.`;

      const userPrompt = `${title ? `Title: ${title}\n\n` : ''}Topic/Prompt: ${prompt}

Please create original, high-quality blog content on this topic that provides exceptional value to readers.`;

      const generatedContent = await this.generateCompletion({
        systemPrompt,
        userPrompt,
        ...this.blogPresets.expand,
        maxTokens: Math.max(4000, Math.floor(targetWordCount * 3))
      });

      // Extract title if not provided
      let finalTitle = title;
      if (!title) {
        const titleMatch = generatedContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
          finalTitle = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        } else {
          finalTitle = prompt.substring(0, 100) + '...';
        }
      }

      // Generate SEO elements
      const seoData = await this.generateBlogSEO({
        title: finalTitle,
        content: generatedContent,
        description: ''
      });

      const wordCount = this.getWordCount(generatedContent);
      const readingTime = this.calculateReadingTime(generatedContent);

      return {
        title: finalTitle,
        content: generatedContent.trim(),
        description: seoData.meta_description,
        meta_title: seoData.meta_title,
        meta_description: seoData.meta_description,
        tags: seoData.tags,
        slug: this.generateSlug(finalTitle),
        wordCount,
        readingTime,
        enhancement_applied: true,
        enhancement_type: 'fresh_generation'
      };

    } catch (error) {
      logger.error('Fresh blog content generation failed', { error: error.message, prompt });
      throw new Error(`Failed to generate fresh blog content: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive SEO elements for blog content
   * @param {Object} options - SEO generation options
   * @returns {Promise<Object>} SEO data
   */
  async generateBlogSEO({ title, content, description = '' }) {
    try {
      const systemPrompt = `You are an SEO expert. Generate optimized SEO elements for the blog content.

Requirements:
- meta_title: 50-60 characters, include main keyword, compelling and click-worthy
- meta_description: 150-160 characters, include main keyword, compelling summary with CTA
- tags: 5-8 relevant tags, lowercase with hyphens, specific and searchable

Return JSON format:
{
  "meta_title": "SEO optimized title",
  "meta_description": "Compelling meta description with CTA",
  "tags": ["tag-one", "tag-two", "tag-three"]
}`;

      const plainContent = this.extractTextFromHTML(content).substring(0, 1000);
      const userPrompt = `Title: ${title}
Description: ${description}
Content Preview: ${plainContent}...

Generate SEO elements for this blog content.`;

      const seoResponse = await this.generateStructuredResponse({
        systemPrompt,
        userPrompt,
        ...this.blogPresets.seo
      });

      // Validate and clean SEO data
      return {
        meta_title: (seoResponse.meta_title || title).substring(0, 60),
        meta_description: (seoResponse.meta_description || description).substring(0, 160),
        tags: Array.isArray(seoResponse.tags) ? seoResponse.tags.slice(0, 8) : []
      };

    } catch (error) {
      logger.error('SEO generation failed', { error: error.message });
      // Return fallback SEO data
      return {
        meta_title: title.substring(0, 60),
        meta_description: description.substring(0, 160) || this.generateFallbackMetaDescription(title, content, 160),
        tags: this.generateFallbackTags(title, 5)
      };
    }
  }

  /**
   * Generate URL-friendly slug from title
   * @param {string} title - Blog title
   * @returns {string} URL slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
      .substring(0, 100);
  }

  /**
   * Get word count from HTML content
   * @param {string} content - HTML content
   * @returns {number} Word count
   */
  getWordCount(content) {
    const plainText = this.extractTextFromHTML(content);
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Analyze content quality and provide recommendations
   * @param {Object} blogData - Blog data to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeBlogContent({ title, content, description, meta_title, meta_description }) {
    try {
      const wordCount = this.getWordCount(content);
      const readingTime = this.calculateReadingTime(content);
      const plainText = this.extractTextFromHTML(content);

      // Basic analysis
      const analysis = {
        wordCount,
        readingTime,
        characterCount: content.length,
        
        // SEO Analysis
        seo: {
          titleLength: title.length,
          titleOptimal: title.length >= 30 && title.length <= 60,
          metaTitleLength: meta_title?.length || 0,
          metaTitleOptimal: meta_title && meta_title.length >= 50 && meta_title.length <= 60,
          metaDescriptionLength: meta_description?.length || 0,
          metaDescriptionOptimal: meta_description && meta_description.length >= 150 && meta_description.length <= 160,
          hasH2Tags: /<h2[^>]*>/i.test(content),
          hasH3Tags: /<h3[^>]*>/i.test(content),
          hasLists: /<(ul|ol)[^>]*>/i.test(content),
          hasImages: /<img[^>]*>/i.test(content)
        },

        // Content Analysis
        content: {
          wordCountOptimal: wordCount >= 1000 && wordCount <= 3000,
          readabilityScore: this.calculateReadabilityScore(plainText),
          paragraphCount: content.split(/<\/p>/i).length - 1,
          hasCodeExamples: /<pre[^>]*>|<code[^>]*>/i.test(content),
          hasBlockquotes: /<blockquote[^>]*>/i.test(content)
        },

        // Recommendations
        recommendations: []
      };

      // Generate recommendations
      if (!analysis.seo.titleOptimal) {
        analysis.recommendations.push('Optimize title length (30-60 characters)');
      }
      if (!analysis.seo.metaTitleOptimal) {
        analysis.recommendations.push('Add or optimize meta title (50-60 characters)');
      }
      if (!analysis.seo.metaDescriptionOptimal) {
        analysis.recommendations.push('Add or optimize meta description (150-160 characters)');
      }
      if (!analysis.seo.hasH2Tags) {
        analysis.recommendations.push('Add H2 headings for better structure');
      }
      if (!analysis.content.wordCountOptimal) {
        analysis.recommendations.push(`Adjust content length (current: ${wordCount} words, optimal: 1000-3000)`);
      }
      if (analysis.content.readabilityScore < 60) {
        analysis.recommendations.push('Improve readability with shorter sentences and paragraphs');
      }

      return analysis;

    } catch (error) {
      logger.error('Content analysis failed', { error: error.message });
      return {
        error: 'Analysis failed',
        message: error.message
      };
    }
  }

  /**
   * Calculate basic readability score
   * @param {string} text - Plain text content
   * @returns {number} Readability score (0-100)
   */
  calculateReadabilityScore(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => {
      return count + this.countSyllables(word);
    }, 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (approximation)
   * @param {string} word - Word to count syllables
   * @returns {number} Syllable count
   */
  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    
    return matches ? matches.length : 1;
  }

  /**
   * Clean JSON response from AI model
   * @param {string} content - Raw AI response
   * @returns {string} Cleaned JSON string
   */
  cleanJSONResponse(content) {
    return content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^\s*[\r\n]/gm, '')
      .trim();
  }

  /**
   * Handle AI-specific errors
   * @param {Error} error - Original error
   * @returns {Error} Handled error
   */
  handleAIError(error) {
    if (error.message.includes('API key')) {
      return new Error('Invalid OpenAI API key configuration');
    }
    
    if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
      return new Error('OpenAI API quota exceeded. Please try again later.');
    }
    
    if (error.message.includes('rate_limit')) {
      return new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    
    if (error.message.includes('timeout')) {
      return new Error('AI service timeout. Please try again.');
    }
    
    return error;
  }

  /**
   * Calculate estimated reading time
   * @param {string} content - Text content
   * @param {number} wordsPerMinute - Reading speed (default: 200)
   * @returns {number} Reading time in minutes
   */
  calculateReadingTime(content, wordsPerMinute = 200) {
    if (!content) return 0;
    
    // Remove HTML tags for word count
    const plainText = content.replace(/<[^>]*>/g, ' ');
    const words = plainText.trim().split(/\s+/).filter(word => word.length > 0);
    
    return Math.ceil(words.length / wordsPerMinute);
  }

  /**
   * Extract text from HTML content
   * @param {string} htmlContent - HTML content
   * @returns {string} Plain text
   */
  extractTextFromHTML(htmlContent) {
    if (!htmlContent) return '';
    
    return htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate tags from content
   * @param {string} title - Content title
   * @param {string} content - Content body
   * @param {number} maxTags - Maximum number of tags
   * @returns {Promise<string[]>} Generated tags
   */
  async generateTags(title, content, maxTags = 10) {
    try {
      const systemPrompt = `You are an expert content tagger. Generate relevant, SEO-friendly tags for the given content.

Requirements:
- Generate ${maxTags} or fewer tags
- Make tags relevant and specific
- Use lowercase, hyphen-separated format (e.g., "machine-learning", "web-development")
- Focus on key topics, technologies, and concepts
- Avoid generic tags like "tips" or "guide"
- Return only a JSON array of strings

Example: ["artificial-intelligence", "machine-learning", "deep-learning", "neural-networks"]`;

      const userPrompt = `Generate tags for this content:

Title: ${title}
Content: ${this.extractTextFromHTML(content).substring(0, 1000)}...`;

      const response = await this.generateCompletion({
        systemPrompt,
        userPrompt,
        model: 'fast',
        temperature: 'analytical',
        maxTokens: 200
      });

      const tags = JSON.parse(this.cleanJSONResponse(response));
      
      if (!Array.isArray(tags)) {
        throw new Error('Invalid tags format received');
      }

      return tags.slice(0, maxTags).map(tag => 
        tag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
      );

    } catch (error) {
      logger.error('Tag generation failed', { error: error.message });
      // Return fallback tags based on title
      return this.generateFallbackTags(title, maxTags);
    }
  }

  /**
   * Generate fallback tags from title
   * @param {string} title - Content title
   * @param {number} maxTags - Maximum number of tags
   * @returns {string[]} Fallback tags
   */
  generateFallbackTags(title, maxTags = 5) {
    if (!title) return [];
    
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return words.slice(0, maxTags);
  }

  /**
   * Generate SEO-optimized meta description
   * @param {string} title - Content title
   * @param {string} content - Content body
   * @param {number} maxLength - Maximum character length
   * @returns {Promise<string>} Meta description
   */
  async generateMetaDescription(title, content, maxLength = 160) {
    try {
      const systemPrompt = `You are an SEO expert. Create compelling meta descriptions that:
- Are exactly ${maxLength} characters or less
- Include the main keyword from the title
- Are engaging and encourage clicks
- Accurately describe the content
- End with a call-to-action when appropriate

Return only the meta description text, nothing else.`;

      const userPrompt = `Create a meta description for:
Title: ${title}
Content: ${this.extractTextFromHTML(content).substring(0, 500)}...

Requirements:
- Maximum ${maxLength} characters
- Include main keywords from title
- Be compelling and click-worthy`;

      const metaDescription = await this.generateCompletion({
        systemPrompt,
        userPrompt,
        model: 'fast',
        temperature: 'professional',
        maxTokens: 100
      });

      return metaDescription.trim().substring(0, maxLength);

    } catch (error) {
      logger.error('Meta description generation failed', { error: error.message });
      // Return fallback meta description
      return this.generateFallbackMetaDescription(title, content, maxLength);
    }
  }

  /**
   * Generate fallback meta description
   * @param {string} title - Content title
   * @param {string} content - Content body
   * @param {number} maxLength - Maximum character length
   * @returns {string} Fallback meta description
   */
  generateFallbackMetaDescription(title, content, maxLength = 160) {
    if (!title) return '';
    
    const plainContent = this.extractTextFromHTML(content);
    const firstSentence = plainContent.split('.')[0];
    
    if (firstSentence && firstSentence.length <= maxLength) {
      return firstSentence + '.';
    }
    
    return title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Validate AI service health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const testResponse = await this.generateCompletion({
        systemPrompt: 'You are a health check service. Respond with "OK" only.',
        userPrompt: 'Health check',
        model: 'fast',
        temperature: 'analytical',
        maxTokens: 10
      });

      return {
        status: 'healthy',
        response: testResponse.trim(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService; 