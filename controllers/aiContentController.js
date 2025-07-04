import OpenAI from 'openai';
import aiService from '../services/aiService.js';
import logger from '../utils/logger.js';
import catchAsync from '../utils/catchAsync.js';

// Initialize OpenAI client safely
let openai = null;

const initializeOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

const checkOpenAIAvailable = () => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key is not configured. Please add your OpenAI API key to the .env file.');
  }
  return initializeOpenAI();
};

// Enhanced Content Generation with OpenAI's Built-in Web Search
class AIContentGenerator {
  
  // Generate enhanced content using OpenAI's web search capabilities
  async generateEnhancedContent(
    originalContent,
    topic,
    options = {}
  ) {
    console.log('🤖 Starting AI content generation with web search...');
    console.log('Topic:', topic);
    console.log('Options:', options);

    const {
      targetWordCount = 1500,
      includeFactsAndFigures = true,
      includeCurrentData = true,
      searchContext = ''
    } = options;

    try {
      // Create a comprehensive prompt for content generation
      const systemPrompt = `You are an expert content writer and researcher. Your task is to create high-quality, engaging, and informative blog content.

CRITICAL FORMATTING REQUIREMENTS:
- DO NOT include HTML DOCTYPE, <html>, <head>, <body>, or any HTML structure tags
- DO NOT include meta tags, title tags, or any HTML document structure
- Use ONLY content formatting: headings (##), paragraphs, bold (**text**), and lists
- Start directly with the main heading using ## format
- Keep content clean and ready for a blog editor

CONTENT REQUIREMENTS:
- Use current web search to find the latest information, statistics, and trends
- Include recent data, studies, and industry insights from 2024-2025
- Write in an engaging, professional tone
- Structure content with clear headings and subheadings
- Include specific statistics, percentages, and data points
- Target approximately ${targetWordCount} words
- Make content actionable and valuable for readers

SEARCH AND RESEARCH:
- Search for current trends, statistics, and developments related to the topic
- Include recent industry reports, surveys, and expert insights
- Cite specific sources and data points naturally within the content
- Focus on practical, actionable information

FORMAT EXAMPLE:
## Main Heading

Introduction paragraph with engaging hook and overview.

## Section Heading 1

Content with **bold emphasis** and specific data points. According to a recent 2024 study by [Source], 85% of companies are adopting new practices.

## Section Heading 2

More detailed content with current trends and insights.

### Subsection if needed

Additional details and practical information.

## Conclusion

Summary and key takeaways.`;

      const userPrompt = `Create comprehensive, well-researched content about: "${topic}"

${originalContent ? `Current content to improve/expand: ${originalContent}` : ''}

${searchContext ? `Additional context: ${searchContext}` : ''}

Requirements:
- Use web search to find the latest 2024-2025 data and trends
- Include current statistics, industry reports, and expert insights
- Write ${targetWordCount} words approximately
- Structure with clear headings using ## format
- Make content engaging and actionable
- Include specific data points and percentages
- NO HTML structure tags - just clean content formatting
- Start directly with the main heading

Focus on providing valuable, current information that readers can use immediately.`;

      console.log('🔍 Sending request to OpenAI with web search...');
      
      const client = checkOpenAIAvailable();
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      const generatedContent = completion.choices[0]?.message?.content;
      
      if (!generatedContent) {
        throw new Error('No content generated from OpenAI');
      }

      console.log('✅ Content generated successfully');
      console.log('Content length:', generatedContent.length);

      // Clean up any remaining HTML artifacts
      let cleanContent = generatedContent
        .replace(/```html\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[^>]*>/gi, '')
        .replace(/<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '')
        .replace(/<\/body>/gi, '')
        .replace(/<header[^>]*>/gi, '')
        .replace(/<\/header>/gi, '')
        .replace(/<footer[^>]*>/gi, '')
        .replace(/<\/footer>/gi, '')
        .replace(/<section[^>]*>/gi, '')
        .replace(/<\/section>/gi, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
        .trim();

      // Convert any remaining HTML headings to markdown
      cleanContent = cleanContent
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '## $1')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      return cleanContent;

    } catch (error) {
      console.error('❌ Error in AI content generation:', error);
      throw error;
    }
  }

  // Improve existing content
  async improveContent(content, improvementType = 'improve') {
    console.log('🔧 Improving existing content...');
    
    const prompts = {
      improve: 'Enhance this content by improving clarity, adding current data and insights, and making it more engaging while maintaining the original structure.',
      rewrite: 'Completely rewrite this content with fresh perspective, current data, and improved structure while covering the same topics.',
      expand: 'Significantly expand this content with additional sections, current research, statistics, and practical insights.',
      summarize: 'Create a concise, well-structured summary of this content highlighting the key points and insights.'
    };

    const systemPrompt = `You are an expert content editor. Improve the given content according to the specified improvement type.

FORMATTING RULES:
- NO HTML structure tags (DOCTYPE, html, head, body, etc.)
- Use markdown formatting: ## for headings, **bold**, bullet points
- Start directly with content - no HTML document structure
- Keep content clean and editor-ready

IMPROVEMENT FOCUS:
- Add current 2024-2025 data and trends using web search
- Include specific statistics and industry insights
- Improve readability and engagement
- Maintain professional tone
- Make content actionable and valuable`;

    try {
      const client = checkOpenAIAvailable();
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `${prompts[improvementType] || prompts.improve}

Content to improve:
${content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const improvedContent = completion.choices[0]?.message?.content;
      
      if (!improvedContent) {
        throw new Error('No improved content generated');
      }

      // Clean up any HTML artifacts
      let cleanContent = improvedContent
        .replace(/```html\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>[\s\S]*?<\/html>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '')
        .replace(/<\/body>/gi, '')
        .trim();

      return cleanContent;

    } catch (error) {
      console.error('❌ Error improving content:', error);
      throw error;
    }
  }
}

// Validation function for AI content generation requests
const validateAIContentRequest = (data) => {
  const errors = [];
  
  // Check for required fields
  if (!data.title && !data.topic) {
    errors.push('Title or topic is required for content generation');
  }
  
  // Validate improvement type
  const validImprovementTypes = ['improve', 'rewrite', 'expand', 'summarize', 'custom'];
  if (data.improvementType && !validImprovementTypes.includes(data.improvementType)) {
    errors.push(`Invalid improvement type. Must be one of: ${validImprovementTypes.join(', ')}`);
  }
  
  // Validate target word count
  if (data.targetWordCount && (data.targetWordCount < 100 || data.targetWordCount > 5000)) {
    errors.push('Target word count must be between 100 and 5000');
  }
  
  // Validate custom prompt
  if (data.improvementType === 'custom' && !data.prompt?.trim()) {
    errors.push('Custom prompt is required when improvement type is "custom"');
  }
  
  return errors;
};

// Main API endpoint for content improvement/generation
export const enhanceContent = async (req, res) => {
  try {
    console.log('📝 Content improvement API called');
    
    const {
      // New API format
      title,
      currentContent = '',
      description = '',
      categories = [],
      tags = [],
      improvementType = 'improve',
      prompt = '',
      targetWordCount = 1500,
      includeFactsAndFigures = true,
      includeCurrentData = true,
      searchContext = '',
      
      // Legacy API format (for backward compatibility)
      topic,
      content = '',
      requireHtmlStructure = true,
      ensureProperHierarchy = true
    } = req.body;

    // Use legacy fields if new fields are not provided
    const blogTitle = title || topic;
    const blogContent = currentContent || content;
    const blogCategories = categories || [];
    const blogTags = tags || [];
    const blogDescription = description || '';
    const blogSearchContext = searchContext || '';

    console.log('Request details:', {
      blogTitle,
      improvementType,
      contentLength: blogContent.length,
      targetWordCount,
      isLegacyFormat: !title && !!topic
    });

    // Validate request data
    const validationErrors = validateAIContentRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured',
        error: 'Please set OPENAI_API_KEY environment variable'
      });
    }

    const generator = new AIContentGenerator();
    let enhancedContent;

    if (improvementType === 'custom' && prompt?.trim()) {
      // Custom prompt with web search
      console.log('🎯 Using custom prompt with web search');
      
      const customPrompt = `${prompt}

Topic: ${blogTitle}
${blogDescription ? `Description: ${blogDescription}` : ''}
${blogCategories.length ? `Categories: ${blogCategories.join(', ')}` : ''}
${blogTags.length ? `Tags: ${blogTags.join(', ')}` : ''}

FORMATTING REQUIREMENTS:
- NO HTML structure tags (DOCTYPE, html, head, body, etc.)
- Use markdown: ## for headings, **bold**, bullet points
- Start directly with content
- Include current 2024-2025 data using web search
- Target ${targetWordCount} words approximately`;

      const client = checkOpenAIAvailable();
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert content writer. Create high-quality content based on the user's requirements. Use web search to include current data and trends. Format content cleanly without HTML structure tags."
          },
          {
            role: "user",
            content: customPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      enhancedContent = completion.choices[0]?.message?.content || '';
      
    } else if (blogContent?.trim()) {
      // Improve existing content
      console.log('🔧 Improving existing content');
      enhancedContent = await generator.improveContent(blogContent, improvementType);
      
    } else {
      // Generate new content
      console.log('✨ Generating new content');
      enhancedContent = await generator.generateEnhancedContent(
        blogContent,
        blogTitle,
        {
          targetWordCount,
          includeFactsAndFigures,
          includeCurrentData,
          searchContext: blogSearchContext || `${blogDescription} ${blogCategories.join(' ')} ${blogTags.join(' ')}`
        }
      );
    }

    // Final cleanup to ensure no HTML structure
    enhancedContent = enhancedContent
      .replace(/```html\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>[\s\S]*?<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '')
      .replace(/<header[^>]*>/gi, '')
      .replace(/<\/header>/gi, '')
      .replace(/<footer[^>]*>/gi, '')
      .replace(/<\/footer>/gi, '')
      .replace(/<section[^>]*>/gi, '')
      .replace(/<\/section>/gi, '')
      .trim();

    if (!enhancedContent) {
      throw new Error('Failed to generate enhanced content');
    }

    console.log('✅ Content generation completed successfully');
    console.log('Final content length:', enhancedContent.length);

    return res.status(200).json({
      success: true,
      data: {
        enhancedContent,
        originalLength: blogContent.length,
        enhancedLength: enhancedContent.length,
        improvementType,
        improvementRatio: blogContent.length > 0 ? (enhancedContent.length / blogContent.length).toFixed(2) : 'N/A',
        wordCount: enhancedContent.split(/\s+/).length,
        searchEnabled: includeCurrentData,
        webSearchUsed: includeCurrentData,
        timestamp: new Date().toISOString()
      },
      message: `Content enhanced successfully ${includeCurrentData ? 'with real-time web search data' : 'using AI knowledge'}`,
      features: [
        'Current 2024-2025 data and trends',
        'Industry statistics and insights',
        'Expert research and analysis',
        'Clean formatting without HTML structure',
        'SEO-optimized content structure',
        'Actionable and engaging content'
      ]
    });

  } catch (error) {
    console.error('❌ Content improvement API error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to enhance content',
      error: error.message || 'Unknown error occurred',
      details: 'Please try again or contact support if the issue persists'
    });
  }
};

// Generate blog content suggestions
export const generateContentSuggestions = async (req, res) => {
  try {
    const { topic, categories = [], tags = [], count = 5 } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required for content suggestions'
      });
    }

    const systemPrompt = `You are an expert content strategist. Generate creative and engaging blog post ideas based on the given topic and context.

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "title": "Blog post title",
    "description": "Brief description of the blog post",
    "outline": ["Main point 1", "Main point 2", "Main point 3"],
    "targetAudience": "Who this content is for",
    "estimatedWordCount": 1500
  }
]

Requirements:
- Generate ${count} unique blog post ideas
- Make titles engaging and SEO-friendly
- Include current trends and practical value
- Vary the content types (guides, lists, case studies, etc.)
- Return valid JSON only - no markdown formatting or extra text`;

    const userPrompt = `Generate blog post ideas for topic: "${topic}"
${categories.length ? `Categories: ${categories.join(', ')}` : ''}
${tags.length ? `Tags: ${tags.join(', ')}` : ''}

Focus on current trends, practical value, and engaging content that readers will find useful.`;

    const client = checkOpenAIAvailable();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const suggestionsText = completion.choices[0]?.message?.content;
    
    if (!suggestionsText) {
      throw new Error('No suggestions generated from OpenAI');
    }

    // Try to parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(suggestionsText);
    } catch (parseError) {
      console.error('Failed to parse suggestions JSON:', parseError);
      // Fallback: extract titles from the response
      const titleMatches = suggestionsText.match(/"title":\s*"([^"]+)"/g);
      if (titleMatches) {
        suggestions = titleMatches.slice(0, count).map((match, index) => ({
          title: match.replace(/"title":\s*"([^"]+)"/, '$1'),
          description: `AI-generated content idea ${index + 1}`,
          outline: ['Introduction', 'Main content', 'Conclusion'],
          targetAudience: 'General audience',
          estimatedWordCount: 1500
        }));
      } else {
        throw new Error('Failed to parse content suggestions');
      }
    }

    if (!Array.isArray(suggestions)) {
      throw new Error('Invalid suggestions format');
    }

    res.status(200).json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, count),
        topic,
        categories,
        tags,
        count: suggestions.length
      },
      message: 'Content suggestions generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating content suggestions:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate content suggestions',
      error: error.message
    });
  }
};

/**
 * Enhance existing blog content with improved structure and formatting
 * POST /api/v1/ai/enhance-blog-content
 */
export const enhanceBlogContent = catchAsync(async (req, res) => {
  const {
    title,
    content,
    description = '',
    targetWordCount = 1500,
    includeCodeExamples = false,
    addStatistics = true,
    improveStructure = true
  } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for enhancement'
    });
  }

  if (content.length < 100) {
    return res.status(400).json({
      success: false,
      message: 'Content must be at least 100 characters long'
    });
  }

  try {
    const enhancedData = await aiService.enhanceBlogContent({
      title,
      content,
      description,
      targetWordCount: Math.min(Math.max(targetWordCount, 500), 5000), // Limit range
      includeCodeExamples,
      addStatistics,
      improveStructure
    });

    logger.info('Blog content enhanced successfully', {
      originalWordCount: aiService.getWordCount(content),
      enhancedWordCount: enhancedData.wordCount,
      title: title.substring(0, 50)
    });

    res.status(200).json({
      success: true,
      message: 'Blog content enhanced successfully',
      data: enhancedData
    });

  } catch (error) {
    logger.error('Blog enhancement failed', {
      error: error.message,
      title: title.substring(0, 50),
      contentLength: content.length
    });

    res.status(500).json({
      success: false,
      message: 'Failed to enhance blog content',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Completely rewrite blog content with professional structure
 * POST /api/v1/ai/rewrite-blog-content
 */
export const rewriteBlogContent = catchAsync(async (req, res) => {
  const {
    title,
    content,
    description = '',
    targetWordCount = 1500,
    tone = 'professional',
    includeExamples = true,
    addStepByStep = false
  } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for rewriting'
    });
  }

  const validTones = ['professional', 'casual', 'technical', 'academic', 'conversational'];
  if (!validTones.includes(tone)) {
    return res.status(400).json({
      success: false,
      message: `Invalid tone. Must be one of: ${validTones.join(', ')}`
    });
  }

  try {
    const rewrittenData = await aiService.rewriteBlogContent({
      title,
      content,
      description,
      targetWordCount: Math.min(Math.max(targetWordCount, 500), 5000),
      tone,
      includeExamples,
      addStepByStep
    });

    logger.info('Blog content rewritten successfully', {
      originalWordCount: aiService.getWordCount(content),
      rewrittenWordCount: rewrittenData.wordCount,
      tone,
      title: title.substring(0, 50)
    });

    res.status(200).json({
      success: true,
      message: 'Blog content rewritten successfully',
      data: rewrittenData
    });

  } catch (error) {
    logger.error('Blog rewrite failed', {
      error: error.message,
      title: title.substring(0, 50),
      tone,
      contentLength: content.length
    });

    res.status(500).json({
      success: false,
      message: 'Failed to rewrite blog content',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Expand existing content with detailed explanations and examples
 * POST /api/v1/ai/expand-blog-content
 */
export const expandBlogContent = catchAsync(async (req, res) => {
  const {
    title,
    content,
    description = '',
    targetWordCount = 2000,
    addCodeExamples = false,
    addTutorials = false,
    addLatestData = true,
    focusAreas = []
  } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for expansion'
    });
  }

  if (!Array.isArray(focusAreas)) {
    return res.status(400).json({
      success: false,
      message: 'focusAreas must be an array of strings'
    });
  }

  try {
    const expandedData = await aiService.expandBlogContent({
      title,
      content,
      description,
      targetWordCount: Math.min(Math.max(targetWordCount, 1000), 8000),
      addCodeExamples,
      addTutorials,
      addLatestData,
      focusAreas: focusAreas.slice(0, 5) // Limit to 5 focus areas
    });

    logger.info('Blog content expanded successfully', {
      originalWordCount: aiService.getWordCount(content),
      expandedWordCount: expandedData.wordCount,
      focusAreas: focusAreas.length,
      title: title.substring(0, 50)
    });

    res.status(200).json({
      success: true,
      message: 'Blog content expanded successfully',
      data: expandedData
    });

  } catch (error) {
    logger.error('Blog expansion failed', {
      error: error.message,
      title: title.substring(0, 50),
      focusAreas,
      contentLength: content.length
    });

    res.status(500).json({
      success: false,
      message: 'Failed to expand blog content',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Generate fresh blog content from a prompt or topic
 * POST /api/v1/ai/generate-blog-content
 */
export const generateFreshBlogContent = catchAsync(async (req, res) => {
  const {
    prompt,
    title = '',
    targetWordCount = 1500,
    tone = 'professional',
    includeCodeExamples = false,
    includeStatistics = true,
    targetAudience = 'general'
  } = req.body;

  // Validation
  if (!prompt || prompt.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Prompt must be at least 10 characters long'
    });
  }

  const validTones = ['professional', 'casual', 'technical', 'academic', 'conversational'];
  if (!validTones.includes(tone)) {
    return res.status(400).json({
      success: false,
      message: `Invalid tone. Must be one of: ${validTones.join(', ')}`
    });
  }

  const validAudiences = ['general', 'beginners', 'professionals', 'experts', 'students'];
  if (!validAudiences.includes(targetAudience)) {
    return res.status(400).json({
      success: false,
      message: `Invalid target audience. Must be one of: ${validAudiences.join(', ')}`
    });
  }

  try {
    const generatedData = await aiService.generateFreshBlogContent({
      prompt: prompt.trim(),
      title: title.trim(),
      targetWordCount: Math.min(Math.max(targetWordCount, 500), 5000),
      tone,
      includeCodeExamples,
      includeStatistics,
      targetAudience
    });

    logger.info('Fresh blog content generated successfully', {
      promptLength: prompt.length,
      generatedWordCount: generatedData.wordCount,
      tone,
      targetAudience,
      title: generatedData.title.substring(0, 50)
    });

    res.status(201).json({
      success: true,
      message: 'Fresh blog content generated successfully',
      data: generatedData
    });

  } catch (error) {
    logger.error('Fresh blog generation failed', {
      error: error.message,
      prompt: prompt.substring(0, 100),
      tone,
      targetAudience
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate fresh blog content',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Generate comprehensive SEO elements for blog content
 * POST /api/v1/ai/generate-blog-seo
 */
export const generateBlogSEO = catchAsync(async (req, res) => {
  const { title, content, description = '' } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for SEO generation'
    });
  }

  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Title must be 200 characters or less'
    });
  }

  try {
    const seoData = await aiService.generateBlogSEO({
      title,
      content,
      description
    });

    logger.info('Blog SEO generated successfully', {
      title: title.substring(0, 50),
      metaTitleLength: seoData.meta_title.length,
      metaDescriptionLength: seoData.meta_description.length,
      tagsCount: seoData.tags.length
    });

    res.status(200).json({
      success: true,
      message: 'Blog SEO elements generated successfully',
      data: seoData
    });

  } catch (error) {
    logger.error('Blog SEO generation failed', {
      error: error.message,
      title: title.substring(0, 50),
      contentLength: content.length
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate SEO elements',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Analyze blog content quality and provide recommendations
 * POST /api/v1/ai/analyze-blog-content
 */
export const analyzeBlogContent = catchAsync(async (req, res) => {
  const { title, content, description, meta_title, meta_description } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for analysis'
    });
  }

  try {
    const analysis = await aiService.analyzeBlogContent({
      title,
      content,
      description,
      meta_title,
      meta_description
    });

    logger.info('Blog content analyzed successfully', {
      title: title.substring(0, 50),
      wordCount: analysis.wordCount,
      readabilityScore: analysis.content?.readabilityScore,
      recommendationsCount: analysis.recommendations?.length || 0
    });

    res.status(200).json({
      success: true,
      message: 'Blog content analyzed successfully',
      data: analysis
    });

  } catch (error) {
    logger.error('Blog content analysis failed', {
      error: error.message,
      title: title.substring(0, 50),
      contentLength: content.length
    });

    res.status(500).json({
      success: false,
      message: 'Failed to analyze blog content',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Generate tags for blog content
 * POST /api/v1/ai/generate-blog-tags
 */
export const generateBlogTags = catchAsync(async (req, res) => {
  const { title, content, maxTags = 8 } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for tag generation'
    });
  }

  if (maxTags < 1 || maxTags > 20) {
    return res.status(400).json({
      success: false,
      message: 'maxTags must be between 1 and 20'
    });
  }

  try {
    const tags = await aiService.generateTags(title, content, maxTags);

    logger.info('Blog tags generated successfully', {
      title: title.substring(0, 50),
      tagsCount: tags.length,
      maxTags
    });

    res.status(200).json({
      success: true,
      message: 'Blog tags generated successfully',
      data: {
        tags,
        count: tags.length
      }
    });

  } catch (error) {
    logger.error('Blog tag generation failed', {
      error: error.message,
      title: title.substring(0, 50),
      maxTags
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate blog tags',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Generate meta description for blog content
 * POST /api/v1/ai/generate-meta-description
 */
export const generateMetaDescription = catchAsync(async (req, res) => {
  const { title, content, maxLength = 160 } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for meta description generation'
    });
  }

  if (maxLength < 50 || maxLength > 300) {
    return res.status(400).json({
      success: false,
      message: 'maxLength must be between 50 and 300 characters'
    });
  }

  try {
    const metaDescription = await aiService.generateMetaDescription(title, content, maxLength);

    logger.info('Meta description generated successfully', {
      title: title.substring(0, 50),
      metaDescriptionLength: metaDescription.length,
      maxLength
    });

    res.status(200).json({
      success: true,
      message: 'Meta description generated successfully',
      data: {
        meta_description: metaDescription,
        length: metaDescription.length,
        maxLength
      }
    });

  } catch (error) {
    logger.error('Meta description generation failed', {
      error: error.message,
      title: title.substring(0, 50),
      maxLength
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate meta description',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Generate URL slug from title
 * POST /api/v1/ai/generate-slug
 */
export const generateSlug = catchAsync(async (req, res) => {
  const { title } = req.body;

  // Validation
  if (!title || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Title is required for slug generation'
    });
  }

  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Title must be 200 characters or less'
    });
  }

  try {
    const slug = aiService.generateSlug(title.trim());

    logger.info('Slug generated successfully', {
      title: title.substring(0, 50),
      slug,
      slugLength: slug.length
    });

    res.status(200).json({
      success: true,
      message: 'Slug generated successfully',
      data: {
        slug,
        original_title: title.trim(),
        length: slug.length
      }
    });

  } catch (error) {
    logger.error('Slug generation failed', {
      error: error.message,
      title: title.substring(0, 50)
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate slug',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * AI service health check
 * GET /api/v1/ai/health
 */
export const healthCheck = catchAsync(async (req, res) => {
  try {
    const healthStatus = await aiService.healthCheck();

    res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
      success: healthStatus.status === 'healthy',
      message: `AI service is ${healthStatus.status}`,
      data: healthStatus
    });

  } catch (error) {
    logger.error('AI health check failed', { error: error.message });

    res.status(503).json({
      success: false,
      message: 'AI service health check failed',
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get AI service capabilities and configuration
 * GET /api/v1/ai/capabilities
 */
export const getCapabilities = catchAsync(async (req, res) => {
  try {
    const capabilities = {
      available: aiService.isConfigured,
      models: aiService.models,
      temperatures: aiService.temperatures,
      blogPresets: aiService.blogPresets,
      features: [
        'Blog content enhancement',
        'Professional content rewriting',
        'Content expansion with examples',
        'Fresh content generation',
        'SEO optimization',
        'Content quality analysis',
        'Tag generation',
        'Meta description generation',
        'URL slug generation',
        'Readability analysis'
      ],
      limits: {
        maxWordCount: 8000,
        maxTags: 20,
        maxMetaDescriptionLength: 300,
        maxSlugLength: 100
      }
    };

    res.status(200).json({
      success: true,
      message: 'AI service capabilities retrieved successfully',
      data: capabilities
    });

  } catch (error) {
    logger.error('Failed to get AI capabilities', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI capabilities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}); 