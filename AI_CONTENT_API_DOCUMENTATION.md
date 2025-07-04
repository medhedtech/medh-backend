# AI Content Generation API Documentation

## Overview

The AI Content Generation API provides powerful content enhancement and generation capabilities using OpenAI's GPT-4 model with web search capabilities. This API is designed to help create, improve, and optimize blog content with current data and industry insights.

## Authentication

All AI content endpoints require authentication using a valid JWT token.

```
Authorization: Bearer <your_jwt_token>
```

## Base URL

```
/api/ai-content
```

## Environment Variables Required

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Endpoints

### 1. Content Enhancement/Generation

**POST** `/api/ai-content/enhance`

Enhance existing content or generate new content using AI with web search capabilities.

#### Request Body

```json
{
  "title": "Blog Title or Topic",                 // Required
  "currentContent": "Existing content...",        // Optional
  "description": "Brief description",             // Optional
  "categories": ["Technology", "AI"],             // Optional
  "tags": ["machine-learning", "automation"],     // Optional
  "improvementType": "improve",                   // Optional: improve|rewrite|expand|summarize|custom
  "prompt": "Custom instructions...",             // Required if improvementType is 'custom'
  "targetWordCount": 1500,                        // Optional: 100-5000
  "includeFactsAndFigures": true,                 // Optional: default true
  "includeCurrentData": true,                     // Optional: default true
  "searchContext": "Additional context..."        // Optional
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "enhancedContent": "Enhanced blog content...",
    "originalLength": 500,
    "enhancedLength": 1500,
    "improvementType": "improve",
    "improvementRatio": "3.00",
    "wordCount": 1500,
    "searchEnabled": true,
    "webSearchUsed": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "message": "Content enhanced successfully with real-time web search data",
  "features": [
    "Current 2024-2025 data and trends",
    "Industry statistics and insights",
    "Expert research and analysis",
    "Clean formatting without HTML structure",
    "SEO-optimized content structure",
    "Actionable and engaging content"
  ]
}
```

#### Improvement Types

- **improve**: Enhance clarity, add current data, and make more engaging
- **rewrite**: Complete rewrite with fresh perspective and improved structure
- **expand**: Significantly expand with additional sections and insights
- **summarize**: Create concise, well-structured summary
- **custom**: Use custom prompt for specific requirements

### 2. Content Suggestions

**POST** `/api/ai-content/suggestions`

Generate creative blog post ideas based on a topic.

#### Request Body

```json
{
  "topic": "Artificial Intelligence",             // Required
  "categories": ["Technology", "Future"],         // Optional
  "tags": ["ai", "machine-learning"],            // Optional
  "count": 5                                     // Optional: default 5
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "title": "The Future of AI in Healthcare: 2025 Trends",
        "description": "Explore how AI is revolutionizing healthcare...",
        "outline": [
          "Current AI applications in healthcare",
          "Emerging trends for 2025",
          "Case studies and success stories",
          "Challenges and ethical considerations",
          "Future predictions"
        ],
        "targetAudience": "Healthcare professionals and tech enthusiasts",
        "estimatedWordCount": 1500
      }
    ],
    "topic": "Artificial Intelligence",
    "categories": ["Technology", "Future"],
    "tags": ["ai", "machine-learning"],
    "count": 5
  },
  "message": "Content suggestions generated successfully"
}
```

### 3. Meta Description Generation

**POST** `/api/ai-content/meta-description`

Generate SEO-optimized meta descriptions for blog posts.

#### Request Body

```json
{
  "title": "Blog Post Title",                    // Required
  "content": "Blog content preview...",          // Optional
  "targetLength": 160                           // Optional: default 160
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "metaDescription": "Discover how AI is transforming content creation with advanced algorithms and real-time data insights. Learn practical applications and future trends.",
    "length": 158,
    "isOptimal": true
  },
  "message": "Meta description generated successfully"
}
```

## Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Title or topic is required for content generation"
  ]
}
```

### Authentication Error (401)

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Failed to enhance content",
  "error": "OpenAI API error message",
  "details": "Please try again or contact support if the issue persists"
}
```

## Usage Examples

### Example 1: Enhance Existing Blog Content

```javascript
const response = await fetch('/api/ai-content/enhance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "The Future of Web Development",
    currentContent: "Web development is evolving rapidly...",
    improvementType: "expand",
    targetWordCount: 2000,
    includeCurrentData: true
  })
});

const result = await response.json();
console.log(result.data.enhancedContent);
```

### Example 2: Generate New Content from Scratch

```javascript
const response = await fetch('/api/ai-content/enhance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "Best Practices for Remote Work in 2025",
    description: "A comprehensive guide for remote work productivity",
    categories: ["Business", "Productivity"],
    tags: ["remote-work", "productivity", "2025-trends"],
    targetWordCount: 1800
  })
});
```

### Example 3: Custom Content Generation

```javascript
const response = await fetch('/api/ai-content/enhance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    title: "Machine Learning for Beginners",
    improvementType: "custom",
    prompt: "Create a beginner-friendly guide that explains machine learning concepts using simple analogies and real-world examples. Include practical exercises and resources for further learning.",
    targetWordCount: 2500
  })
});
```

## Features

- **Current Data Integration**: Uses web search to include 2024-2025 data and trends
- **Multiple Content Types**: Supports various improvement and generation modes
- **SEO Optimization**: Generates SEO-friendly content with proper structure
- **Clean Formatting**: Outputs clean markdown content without HTML artifacts
- **Flexible Input**: Supports both content improvement and new content generation
- **Industry Insights**: Includes current statistics, studies, and expert opinions
- **Custom Prompts**: Allows custom instructions for specific requirements

## Rate Limits

The API follows standard rate limiting based on your OpenAI API usage limits. Monitor your usage through the OpenAI dashboard.

## Best Practices

1. **Provide Context**: Include relevant categories, tags, and descriptions for better results
2. **Set Appropriate Word Counts**: Use realistic target word counts (1000-3000 words work best)
3. **Use Current Data**: Enable `includeCurrentData` for the most up-to-date information
4. **Custom Prompts**: For specific requirements, use the custom improvement type with detailed prompts
5. **Error Handling**: Always implement proper error handling for API calls

## Support

For issues or questions about the AI Content API, please contact the development team or create an issue in the project repository. 