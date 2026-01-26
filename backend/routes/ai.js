const express = require('express');
const axios = require('axios');

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Fallback models in order of preference (free tier friendly)
// Using only free tier models - try different naming conventions
let FALLBACK_MODELS = [
  'gemini-1.5-flash',        // Standard free tier flash model
  'gemini-1.5-flash-latest', // Latest version
  'gemini-1.5-flash-002',    // Specific version
  'gemini-1.5-flash-8b'      // Smaller version
];

// Cache for model selection to avoid fetching on every request
let cachedModel = null;
let modelCacheTime = null;
const MODEL_CACHE_DURATION = 3600000; // 1 hour in milliseconds

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const safeJsonParse = (text) => {
  if (!text) return {};
  const cleaned = text
    .trim()
    .replace(/^```json/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return {};
  }
};

// Helper function to get available models
const getAvailableModels = async () => {
  try {
    const response = await axios.get(
      `${GEMINI_API_BASE}/models?key=${GEMINI_API_KEY}`,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    const models = response.data?.models || [];
    console.log('Fetched models:', models.length, 'total');
    if (models.length > 0) {
      console.log('First few models:', models.slice(0, 5).map(m => ({ name: m.name, methods: m.supportedGenerationMethods })));
    }
    return models;
  } catch (error) {
    console.error('Error fetching available models:', error.message);
    return [];
  }
};

const callGemini = async (messages) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Add GEMINI_API_KEY to your .env file.');
  }

  try {
    // Try to get available models first to find a working one
    let availableModels = [];
    try {
      availableModels = await getAvailableModels();
      if (availableModels.length > 0) {
        console.log('Available models found:', availableModels.length);
        // Filter for models that support generateContent
        const workingModels = availableModels
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', '')); // Remove 'models/' prefix if present
        if (workingModels.length > 0) {
          console.log('Working models:', workingModels.slice(0, 5));
          // Update fallback models with actually available ones
          FALLBACK_MODELS.length = 0;
          FALLBACK_MODELS.push(...workingModels.slice(0, 4));
        }
      }
    } catch (modelError) {
      console.warn('Could not fetch available models, using defaults:', modelError.message);
    }
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role !== 'system');

    // Convert messages format from OpenAI-style to Gemini format
    const contents = [];
    
    // Build conversation history
    for (const msg of userMessages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }

    // Base request body (will be modified per API version)
    const baseRequestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000, // Increased for full specifications
        topP: 0.85
      }
    };

    // Helper function to build request body for specific API version
    const buildRequestBody = (apiVersion) => {
      const body = JSON.parse(JSON.stringify(baseRequestBody)); // Deep copy
      
      if (systemMessage) {
        if (apiVersion === 'v1beta') {
          // v1beta supports systemInstruction as separate field
          body.systemInstruction = {
            parts: [{ text: systemMessage.content }]
          };
        } else {
          // v1 API: include system instruction in the first user message
          // Create a new contents array with system instruction prepended
          if (body.contents.length > 0 && body.contents[0].role === 'user') {
            // Prepend system instruction to first user message
            body.contents[0] = {
              role: 'user',
              parts: [{ text: `${systemMessage.content}\n\n${body.contents[0].parts[0].text}` }]
            };
          } else {
            // Insert system instruction as first user message
            body.contents = [
              {
                role: 'user',
                parts: [{ text: systemMessage.content }]
              },
              ...body.contents
            ];
          }
        }
      }
      
      return body;
    };

    // Use free tier friendly models with fallback
    // Start with the configured model or default to gemini-1.5-flash-latest
    let modelToUse = GEMINI_MODEL || 'gemini-1.5-flash-latest';
    
    // Check cache, but reset if cache is too old or if we had previous failures
    const now = Date.now();
    if (cachedModel && modelCacheTime && (now - modelCacheTime) < MODEL_CACHE_DURATION) {
      modelToUse = cachedModel;
    } else {
      // Reset cache if expired
      cachedModel = null;
      modelCacheTime = null;
      modelToUse = GEMINI_MODEL || 'gemini-1.5-flash-latest';
    }

    // Try models with fallback for quota errors
    let lastError = null;
    const modelsToTry = [modelToUse, ...FALLBACK_MODELS.filter(m => m !== modelToUse)];
    
    for (const model of modelsToTry) {
      try {
        // Use v1beta API for all free tier models (most reliable)
        // Free tier models work best with v1beta API
        const apiVersions = ['v1beta'];
        
        let response;
        let lastApiError = null;
        
        for (const apiVersion of apiVersions) {
          try {
            const apiBase = `https://generativelanguage.googleapis.com/${apiVersion}`;
            const apiUrl = `${apiBase}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            
            // Build request body for this specific API version
            const versionSpecificBody = buildRequestBody(apiVersion);
            
            console.log(`Calling Gemini API with model: ${model}, version: ${apiVersion}, URL: ${apiUrl.replace(GEMINI_API_KEY, 'KEY_HIDDEN')}`);
            
            response = await axios.post(
              apiUrl,
              versionSpecificBody,
              {
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            );
            
            // Success - break out of API version loop
            break;
          } catch (apiError) {
            lastApiError = apiError;
            const errorMessage = apiError.response?.data?.error?.message || 
                                apiError.response?.data?.message || 
                                apiError.message || 
                                '';
            const errorLower = errorMessage.toLowerCase();
            
            // If model not found or not supported, try next API version
            // Also catch JSON payload errors (like systemInstruction not supported)
            if (apiError.response?.status === 404 || 
                errorLower.includes('not found') ||
                errorLower.includes('not supported') ||
                errorLower.includes('is not found for api version') ||
                errorLower.includes('invalid json payload') ||
                errorLower.includes('unknown name') ||
                errorLower.includes('cannot find field')) {
              console.log(`Model ${model} error in ${apiVersion} (${errorMessage}), trying next API version...`);
              continue; // Try next API version
            } else {
              // For other errors (quota, etc.), throw immediately
              throw apiError;
            }
          }
        }
        
        // If we get here and no response, all API versions failed
        if (!response) {
          throw lastApiError || new Error(`Model ${model} not found in any API version`);
        }
        
        // Success - update cache and return
        cachedModel = model;
        modelCacheTime = now;
        
        // Process response (moved outside try-catch for this model)
        const candidate = response.data?.candidates?.[0];
        if (!candidate) {
          console.error('No candidates in Gemini response:', JSON.stringify(response.data, null, 2));
          throw new Error('No candidates in Gemini API response');
        }

        // Check for finish reason
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('Warning: Response hit MAX_TOKENS limit. Consider increasing maxOutputTokens.');
        }

        // Get text from response - check if parts array exists and has content
        let message = null;
        if (candidate.content?.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          // Standard format: parts array
          const textPart = candidate.content.parts.find(part => part && part.text);
          message = textPart?.text;
        } else if (candidate.content?.text) {
          // Alternative format: direct text property
          message = candidate.content.text;
        } else if (candidate.text) {
          // Another alternative format
          message = candidate.text;
        }

        if (!message || !message.trim()) {
          console.error('Gemini API response structure:', JSON.stringify(response.data, null, 2));
          console.error('Candidate content:', JSON.stringify(candidate.content, null, 2));
          if (candidate.finishReason === 'MAX_TOKENS') {
            throw new Error('Response was truncated due to token limit. The model response exceeded the maximum output tokens. Try reducing the prompt length or increasing maxOutputTokens.');
          }
          throw new Error(`No response text found in Gemini API response. Finish reason: ${candidate.finishReason || 'unknown'}`);
        }
        
        return message.trim();
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const errPayload = error.response?.data;
        const errMessage = 
          (typeof errPayload === 'string' && errPayload) ||
          errPayload?.error?.message ||
          errPayload?.error ||
          errPayload?.message ||
          error.message ||
          'Unknown error';
        
        // Check if it's a quota error or model not found - if so, try next model
        const isQuotaError = 
          status === 429 ||
          errMessage.toLowerCase().includes('quota') ||
          errMessage.toLowerCase().includes('rate limit') ||
          errMessage.toLowerCase().includes('exceeded');
        
        const isModelNotFound = 
          status === 404 ||
          errMessage.toLowerCase().includes('not found') ||
          errMessage.toLowerCase().includes('is not found for api version') ||
          errMessage.toLowerCase().includes('not supported');
        
        // If quota error or model not found, and there are more models to try, continue to next model
        if ((isQuotaError || isModelNotFound) && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          const errorType = isQuotaError ? 'Quota' : 'Model not found';
          console.warn(`${errorType} error with model ${model}, trying next model...`);
          // Clear cache when model fails so we don't retry the same bad model
          if (isModelNotFound && cachedModel === model) {
            cachedModel = null;
            modelCacheTime = null;
          }
          continue; // Try next model
        }
        
        // If not quota/model error or last model, throw
        throw error;
      }
    }
    
    // If we get here, all models failed
    throw lastError || new Error('All model attempts failed');
  } catch (error) {
    const status = error.response?.status;
    const errPayload = error.response?.data;
    const errMessage =
      (typeof errPayload === 'string' && errPayload) ||
      errPayload?.error?.message ||
      errPayload?.error ||
      errPayload?.message ||
      (errPayload ? JSON.stringify(errPayload) : '') ||
      error.message ||
      'Failed to fetch insights from Gemini';
    
    // Provide user-friendly error message for quota errors
    if (status === 429 || errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exceeded')) {
      throw new Error('AI service quota exceeded. Please try again later or contact support.');
    }
    
    throw new Error(errMessage);
  }
};

router.post('/item-insights', async (req, res) => {
  const { itemName } = req.body;

  if (!itemName || !itemName.trim()) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  // Check if API key is configured
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ 
      message: 'Unable to fetch AI insights right now.',
      error: 'Gemini API key not configured. Add GEMINI_API_KEY to your environment variables in Render.com.',
      requiresConfiguration: true
    });
  }

  try {
    const prompt = `Procurement guidance for "${itemName.trim()}" (Philippine state university IT). JSON only:
{"quickSummary":"<1-2 sentences>","priceRange":"<₱PHP>","specs":["spec1","spec2","spec3",...],"justification":"<purpose>","brandSuggestion":"<brand>","vendors":["v1","v2"],"caution":"<notes>","sources":["Store1","Store2","Store3"]}
Rules: 
- specs: Provide COMPLETE and DETAILED technical specifications. Include ALL relevant specs such as: processor/CPU, RAM, storage, display, ports, connectivity, dimensions, weight, operating system, power requirements, and any other technical details. Each spec should be clear and specific (e.g., "Intel Core i5-12400 2.5GHz", "16GB DDR4 RAM", "512GB NVMe SSD"). Provide 8-15 comprehensive specs.
- quickSummary, justification, caution: Keep these concise (<100 chars each).
- priceRange: Format as "₱X,XXX - ₱X,XXX" or "₱X,XXX" if single price.
- sources: 3 Philippine IT stores (e.g., "Accent Micro", "PC Express", "Octagon").
- All other fields: Keep concise but informative.`;

    const rawText = await callGemini([
      {
        role: 'system',
        content: 'You are an ISSP procurement assistant that responds ONLY with JSON matching the provided schema.'
      },
      { role: 'user', content: prompt }
    ]);
    const parsed = safeJsonParse(rawText);

    return res.json({
      itemName: itemName.trim(),
      quickSummary: parsed.quickSummary || parsed.summary || '',
      priceRange: parsed.priceRange || parsed.price || 'Information unavailable',
      specs: normalizeArray(parsed.specs || parsed.keySpecs),
      justification: parsed.justification || parsed.justifyText || '',
      brandSuggestion: parsed.brandSuggestion || parsed.brand || '',
      vendors: normalizeArray(parsed.vendors || parsed.suppliers),
      caution: parsed.caution || parsed.disclaimer || parsed.notes || '',
      sources: normalizeArray(parsed.sources || parsed.references || []),
    });
  } catch (error) {
    console.error('Item insights error:', error);
    const message = error.message || 'Failed to fetch item insights';
    
    // Check if it's a quota error
    const isQuotaError = 
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('exceeded') ||
      message.toLowerCase().includes('rate limit');
    
    return res.status(isQuotaError ? 429 : 500).json({ 
      message,
      quotaExceeded: isQuotaError
    });
  }
});

router.post('/check-it-related', async (req, res) => {
  const { itemName } = req.body;

  if (!itemName || !itemName.trim()) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  // Check if API key is configured
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ 
      message: 'Unable to check item classification right now.',
      error: 'Gemini API key not configured.',
      requiresConfiguration: true
    });
  }

  try {
    const prompt = `Is "${itemName.trim()}" an IT-related equipment or technology item that would be appropriate for an Information Systems Strategic Plan (ISSP) procurement request?

IT-related items include: computers, laptops, servers, networking equipment, printers, monitors, software, storage devices, security equipment, cables, peripherals (keyboards, mice, webcams), tablets, smartphones, projectors, UPS systems, firewalls, and similar technology equipment.

Non-IT items include: furniture, office supplies, vehicles, building materials, food, beverages, medical equipment, laboratory equipment (non-IT), sports equipment, uniforms, and similar non-technology items.

Respond with ONLY a JSON object in this exact format:
{"isITRelated": true or false, "reason": "brief explanation"}

Be strict - only items that are clearly IT/technology equipment should be marked as IT-related.`;

    const rawText = await callGemini([
      {
        role: 'system',
        content: 'You are an ISSP procurement assistant. Respond ONLY with valid JSON matching the provided schema. Do not include any text outside the JSON object.'
      },
      { role: 'user', content: prompt }
    ]);

    const parsed = safeJsonParse(rawText);
    const isITRelated = parsed.isITRelated === true || parsed.isITRelated === 'true';
    const reason = parsed.reason || (isITRelated 
      ? 'This item appears to be IT-related.' 
      : 'This item does not appear to be IT-related. ISSP requests are only for IT equipment and technology items.');

    return res.json({
      isValid: isITRelated,
      reason: reason,
      itemName: itemName.trim()
    });
  } catch (error) {
    console.error('IT classification error:', error);
    const message = error.message || 'Failed to check item classification';
    
    // Check if it's a quota error
    const isQuotaError = 
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('exceeded') ||
      message.toLowerCase().includes('rate limit');
    
    return res.status(isQuotaError ? 429 : 500).json({ 
      message,
      quotaExceeded: isQuotaError,
      isValid: false,
      reason: 'Unable to verify if this item is IT-related. Please try again.'
    });
  }
});

router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Messages array with at least one entry is required.' });
  }

  const sanitizedMessages = messages
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: typeof msg.content === 'string' ? msg.content.trim() : ''
    }))
    .filter((msg) => !!msg.content);

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({ message: 'Messages must include text content.' });
  }

  if (sanitizedMessages[sanitizedMessages.length - 1].role !== 'user') {
    return res.status(400).json({ message: 'Last message must come from the user.' });
  }

  try {
    const chatMessages = [
      {
        role: 'system',
        content:
          'You are BloomNode, an ISSP procurement assistant for Philippine state universities. Provide concise, actionable answers with peso estimates or supplier context when relevant.'
      },
      ...sanitizedMessages
    ];

    const reply = await callGemini(chatMessages);

    return res.json({
      reply: (reply || '').trim() || 'I was unable to generate a response just now.'
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    const message = error.message || 'Failed to fetch chatbot response';
    return res.status(500).json({ message });
  }
});

module.exports = router;

