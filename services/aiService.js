import OpenAI from 'openai';
import logger from '../utils/logger.js';

/**
 * Comprehensive AI Service for various AI-powered features
 * Designed to be extensible for future AI capabilities
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