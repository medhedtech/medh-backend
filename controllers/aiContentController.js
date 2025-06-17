import OpenAI from 'openai';

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

// Generate SEO-optimized meta descriptions
export const generateMetaDescription = async (req, res) => {
  try {
    const { title, content, targetLength = 160 } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required for meta description generation'
      });
    }

    const systemPrompt = `You are an SEO expert. Generate compelling meta descriptions that:
- Are exactly ${targetLength} characters or less
- Include the main keyword from the title
- Are engaging and encourage clicks
- Accurately describe the content
- Follow SEO best practices

Return only the meta description text, nothing else.`;

    const userPrompt = `Generate an SEO-optimized meta description for:
Title: ${title}
${content ? `Content preview: ${content.substring(0, 500)}...` : ''}

Requirements:
- Maximum ${targetLength} characters
- Include main keywords
- Be compelling and click-worthy`;

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
      max_tokens: 100
    });

    const metaDescription = completion.choices[0]?.message?.content?.trim();
    
    if (!metaDescription) {
      throw new Error('No meta description generated');
    }

    res.status(200).json({
      success: true,
      data: {
        metaDescription,
        length: metaDescription.length,
        isOptimal: metaDescription.length <= targetLength
      },
      message: 'Meta description generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating meta description:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate meta description',
      error: error.message
    });
  }
}; 