import { Capacitor } from '@capacitor/core';

export interface AIServiceOptions {
  temperature?: number;
  responseFormatJson?: boolean;
  systemInstruction?: string;
  signal?: AbortSignal;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_PRIMARY_AI_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const IS_DEV = import.meta.env.DEV;
const IS_NATIVE = Capacitor.isNativePlatform();

// Use the local/Vercel proxy path for web (to avoid CORS issues), use direct absolute URL for native apps
const OPENROUTER_BASE_URL = (IS_DEV || !IS_NATIVE)
  ? '/openrouter-api/api/v1/chat/completions'
  : 'https://openrouter.ai/api/v1/chat/completions';

const OPENROUTER_TEXT_MODEL = 'google/gemini-2.5-flash';
const OPENROUTER_VISION_MODEL = 'google/gemini-2.5-flash';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

async function callOpenRouterText(prompt: string, options?: AIServiceOptions): Promise<string> {
  const messages: any[] = [];
  if (options?.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://msfamily.app',
      'X-Title': 'MS Family'
    },
    body: JSON.stringify({
      model: OPENROUTER_TEXT_MODEL,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: 1024,
      response_format: options?.responseFormatJson ? { type: 'json_object' } : undefined
    }),
    signal: options?.signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter API status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (text === undefined || text === null) {
    throw new Error('OpenRouter API returned empty text');
  }
  return text;
}

async function callGeminiText(prompt: string, options?: AIServiceOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const requestBody = {
    system_instruction: options?.systemInstruction ? {
      parts: [{ text: options.systemInstruction }]
    } : undefined,
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      response_mime_type: options?.responseFormatJson ? 'application/json' : undefined,
      temperature: options?.temperature ?? 0.1
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: options?.signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini API status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text === undefined || text === null) {
    throw new Error('Gemini API returned empty text');
  }
  return text;
}

async function callOpenRouterVision(
  prompt: string,
  base64Image: string,
  mimeType: string,
  options?: AIServiceOptions
): Promise<string> {
  const messages: any[] = [];
  if (options?.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType || 'image/jpeg'};base64,${base64Image}`
        }
      }
    ]
  });

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://msfamily.app',
      'X-Title': 'MS Family'
    },
    body: JSON.stringify({
      model: OPENROUTER_VISION_MODEL,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: 1024,
      response_format: options?.responseFormatJson ? { type: 'json_object' } : undefined
    }),
    signal: options?.signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter API status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (text === undefined || text === null) {
    throw new Error('OpenRouter API returned empty text');
  }
  return text;
}

async function callGeminiVision(
  prompt: string,
  base64Image: string,
  mimeType: string,
  options?: AIServiceOptions
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const requestBody = {
    system_instruction: options?.systemInstruction ? {
      parts: [{ text: options.systemInstruction }]
    } : undefined,
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Image } }
      ]
    }],
    generationConfig: {
      response_mime_type: options?.responseFormatJson ? 'application/json' : undefined,
      temperature: options?.temperature ?? 0.1
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: options?.signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini API status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text === undefined || text === null) {
    throw new Error('Gemini API returned empty text');
  }
  return text;
}

export async function generateText(prompt: string, options?: AIServiceOptions): Promise<string> {
  if (OPENROUTER_API_KEY) {
    try {
      console.log('[AIService] Attempting text generation with OpenRouter (Primary)...');
      const result = await callOpenRouterText(prompt, options);
      console.log('[AIService] OpenRouter text generation successful.');
      return result;
    } catch (err) {
      console.warn('[AIService] OpenRouter text generation failed, falling back to Gemini (Secondary)...', err);
    }
  }

  if (GEMINI_API_KEY) {
    console.log('[AIService] Using Gemini (Secondary) for text generation...');
    return await callGeminiText(prompt, options);
  }

  throw new Error('No active AI API keys configured (both OpenRouter and Gemini keys are missing)');
}

export async function generateVision(
  prompt: string,
  base64Image: string,
  mimeType: string,
  options?: AIServiceOptions
): Promise<string> {
  if (OPENROUTER_API_KEY) {
    try {
      console.log('[AIService] Attempting vision analysis with OpenRouter (Primary)...');
      const result = await callOpenRouterVision(prompt, base64Image, mimeType, options);
      console.log('[AIService] OpenRouter vision analysis successful.');
      return result;
    } catch (err) {
      console.warn('[AIService] OpenRouter vision analysis failed, falling back to Gemini (Secondary)...', err);
    }
  }

  if (GEMINI_API_KEY) {
    console.log('[AIService] Using Gemini (Secondary) for vision analysis...');
    return await callGeminiVision(prompt, base64Image, mimeType, options);
  }

  throw new Error('No active AI API keys configured (both OpenRouter and Gemini keys are missing)');
}
