const express = require('express');
const axios = require('axios');

const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'http://localhost:3000';
const OPENROUTER_APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'BloomNode';

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

const callOpenRouter = async (messages) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env file.');
  }

  try {
    const response = await axios.post(
      OPENROUTER_CHAT_URL,
      {
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 700,
        top_p: 0.95,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': OPENROUTER_SITE_URL,
          'X-Title': OPENROUTER_APP_TITLE,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const message = response.data?.choices?.[0]?.message?.content;
    return message || '';
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
      (error.response?.data?.error?.code === 'insufficient_quota' ? 'OpenRouter free-tier limit reached.' : '') ||
      'Failed to fetch insights from OpenRouter';
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

    const rawText = await callOpenRouter([
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

    const reply = await callOpenRouter(chatMessages);

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

