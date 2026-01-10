const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini AI with new SDK
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Default model - Gemini 2.5 Flash
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Sleep helper for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate content using Gemini with retry logic
 * @param {string} prompt - The prompt to send to Gemini
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The generated content
 */
const generateContent = async (prompt, options = {}) => {
  const maxRetries = options.maxRetries || 5;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Trying Gemini (attempt ${attempt}/${maxRetries})`);
      
      const response = await ai.models.generateContent({
        model: options.model || DEFAULT_MODEL,
        contents: prompt,
        config: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxTokens || 8192,
        }
      });

      console.log('Gemini response received successfully');
      return response.text;
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate')) {
        let retryDelay = 60000; // Default 60 seconds
        
        // Try to extract retry delay from error
        if (error.errorDetails) {
          const retryInfo = error.errorDetails.find(d => d['@type']?.includes('RetryInfo'));
          if (retryInfo?.retryDelay) {
            const seconds = parseInt(retryInfo.retryDelay);
            if (!isNaN(seconds)) retryDelay = (seconds + 5) * 1000;
          }
        }
        
        if (attempt < maxRetries) {
          console.log(`Rate limited. Waiting ${retryDelay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
          await sleep(retryDelay);
          continue;
        }
      }
      
      console.error('Gemini API Error:', error.message || error);
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Gemini API failed after all retries');
};

/**
 * Generate JSON content using Gemini
 * @param {string} prompt - The prompt expecting JSON response
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Parsed JSON object
 */
const generateJSON = async (prompt, options = {}) => {
  try {
    const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Keep responses concise to avoid truncation.`;
    
    const text = await generateContent(fullPrompt, { ...options, maxTokens: options.maxTokens || 8192 });
    
    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();
    
    // Try to parse JSON, if truncated try to repair it
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.log('JSON parse failed, attempting repair...');
      
      // Try to repair truncated JSON by closing open structures
      let repairedText = cleanedText;
      
      // Count open brackets and braces
      const openBraces = (repairedText.match(/{/g) || []).length;
      const closeBraces = (repairedText.match(/}/g) || []).length;
      const openBrackets = (repairedText.match(/\[/g) || []).length;
      const closeBrackets = (repairedText.match(/]/g) || []).length;
      
      // Remove trailing incomplete string/value
      repairedText = repairedText.replace(/,\s*"[^"]*$/, '');
      repairedText = repairedText.replace(/,\s*$/, '');
      repairedText = repairedText.replace(/:\s*"[^"]*$/, ': ""');
      
      // Close arrays and objects
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repairedText += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repairedText += '}';
      }
      
      return JSON.parse(repairedText);
    }
  } catch (error) {
    console.error('Gemini JSON Parse Error:', error);
    throw error;
  }
};

/**
 * Chat with Gemini (maintains conversation context)
 * @param {Array} messages - Array of message objects with role and content
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The AI response
 */
const chat = async (messages, options = {}) => {
  try {
    // Convert messages to a single prompt for simplicity
    const conversationPrompt = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'Assistant' : 'User';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: options.model || DEFAULT_MODEL,
      contents: conversationPrompt + '\n\nAssistant:',
      config: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    throw error;
  }
};

// For backward compatibility
const getModel = () => {
  console.log('Note: getModel() is deprecated with new SDK');
  return null;
};

/**
 * Generate content with image using Gemini Vision
 * @param {string} prompt - The text prompt
 * @param {string} imageData - Base64 encoded image data
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The generated content
 */
const generateWithImage = async (prompt, imageData, options = {}) => {
  const maxRetries = options.maxRetries || 5;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Trying Gemini Vision (attempt ${attempt}/${maxRetries})`);
      
      // Clean base64 data
      let base64Data = imageData;
      if (imageData.includes('base64,')) {
        base64Data = imageData.split('base64,')[1];
      }
      
      // Get MIME type
      let mimeType = 'image/jpeg';
      if (imageData.includes('data:')) {
        const match = imageData.match(/data:([^;]+);/);
        if (match) mimeType = match[1];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',  // Vision-capable model
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 4096,
        }
      });

      console.log('Gemini Vision response received successfully');
      return response.text;
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate')) {
        const retryDelay = 60000;
        if (attempt < maxRetries) {
          console.log(`Rate limited. Waiting ${retryDelay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
          await sleep(retryDelay);
          continue;
        }
      }
      
      console.error('Gemini Vision Error:', error.message || error);
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Gemini Vision API failed after all retries');
};

module.exports = {
  generateContent,
  generateJSON,
  chat,
  getModel,
  generateWithImage,
};
