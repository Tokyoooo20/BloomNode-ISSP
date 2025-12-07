const express = require('express');
const axios = require('axios');

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        topP: 0.95
      }
    };

    // Add system instruction if present (v1beta supports systemInstruction)
    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    // Get available models and use the first one that supports generateContent
    let modelToUse = null;
    const availableModels = await getAvailableModels();
    
    if (availableModels.length > 0) {
      // Find the first model that supports generateContent
      const supportedModel = availableModels.find(m => 
        m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
      );
      
      if (supportedModel) {
        // Remove 'models/' prefix if present
        modelToUse = supportedModel.name.replace(/^models\//, '');
        console.log(`Using model: ${modelToUse}`);
      } else {
        // Fallback: try common model names from the list
        const fallbackModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-pro-latest', 'gemini-flash-latest'];
        for (const fallback of fallbackModels) {
          const found = availableModels.find(m => m.name && m.name.includes(fallback));
          if (found) {
            modelToUse = found.name.replace(/^models\//, '');
            console.log(`Using fallback model: ${modelToUse}`);
            break;
          }
        }
      }
    }

    // If no model found, throw error
    if (!modelToUse) {
      throw new Error('No available Gemini model found that supports generateContent. Please check your API key permissions.');
    }

    // Use the determined model
    const apiUrl = `${GEMINI_API_BASE}/models/${modelToUse}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`Calling Gemini API with model: ${modelToUse}, URL: ${apiUrl.replace(GEMINI_API_KEY, 'KEY_HIDDEN')}`);
    
    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    // Handle Gemini API response - check multiple possible structures
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
    throw new Error(errMessage);
  }
};

router.post('/item-insights', async (req, res) => {
  const { itemName } = req.body;

  if (!itemName || !itemName.trim()) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  try {
    const prompt = `
You are an ISSP procurement assistant. Provide concise purchase guidance about "${itemName.trim()}". 
Assume the request comes from a Philippine state university IT unit. 
Estimate prices in Philippine Peso (prefix with "₱") and reference common government vendors where possible.
Keep every string under 140 characters, avoid extra explanations, and do not add newlines inside values.
Respond strictly in minified JSON using this schema:
{
  "quickSummary": "<1-2 sentences>",
  "priceRange": "<PHP range or 'Information unavailable'>",
  "specs": ["bullet", "..."],
  "justification": "<brief purpose>",
  "brandSuggestion": "<concise brand/model idea>",
  "vendors": ["optional vendor list"],
  "caution": "<risks or availability notes>"
}
Do not include any text outside the JSON object.
`;

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
    });
  } catch (error) {
    console.error('Item insights error:', error);
    const message = error.message || 'Failed to fetch item insights';
    return res.status(500).json({ message });
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

