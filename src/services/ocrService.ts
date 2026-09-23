import * as FileSystem from 'expo-file-system/legacy';

// ─────────────────────────────────────────────────────────────────────────────
// Choose which provider to use: 'groq' or 'gemini'
// - Groq API Key: https://console.groq.com/keys (Free, super fast Llama 3.2 Vision)
// - Gemini API Key: https://aistudio.google.com/app/apikey
// ─────────────────────────────────────────────────────────────────────────────
const PROVIDER: 'groq' | 'gemini' = 'groq'; // 👈 Change to 'gemini' if you prefer Google

const GROQ_API_KEY: string = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GEMINI_API_KEY: string = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface OcrBlock {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface OcrResult {
  rawText: string;
  blocks: OcrBlock[];
  trackingId?: string;
  customerName?: string;
  mobileNumber?: string;
  address?: string;
  error?: string;
}

const PROMPT = `You are a parcel label reader. Analyze this parcel/shipping label image and extract the following fields.

Return ONLY a valid JSON object with exactly these keys:
{
  "trackingId": "the tracking number, AWB, or parcel ID",
  "customerName": "the recipient full name",
  "mobileNumber": "the recipient phone number with country code if visible",
  "address": "the full delivery address on one line",
  "rawText": "all visible text from the label exactly as seen"
}

Rules:
- If a field is not clearly visible, use an empty string ""
- Do NOT guess or invent data
- Do NOT include sender details, only recipient/delivery details
- Return ONLY the JSON object, no explanation, no markdown, no code blocks`;

export async function runOcr(imageUri: string): Promise<OcrResult> {
  // 1. Check if chosen provider API key is missing
  if (PROVIDER === 'groq' && (GROQ_API_KEY === 'YOUR_GROQ_API_KEY' || !GROQ_API_KEY.trim())) {
    return { rawText: '', blocks: [], error: 'GROQ_KEY_MISSING' };
  }
  if (PROVIDER === 'gemini' && (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY' || !GEMINI_API_KEY.trim())) {
    return { rawText: '', blocks: [], error: 'OCR_KEY_MISSING' };
  }

  // 2. Read image as base64
  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return { rawText: '', blocks: [], error: 'Failed to read image file.' };
  }

  const mimeType = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';

  if (PROVIDER === 'groq') {
    return runGroqOcr(base64, mimeType);
  } else {
    return runGeminiOcr(base64, mimeType);
  }
}

async function runGroqOcr(base64: string, mimeType: string): Promise<OcrResult> {
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => '');
      console.error('Groq API Error Response:', response.status, msg);
      if (response.status === 401) {
        return { rawText: '', blocks: [], error: 'Invalid Groq API Key. Please update it in ocrService.ts' };
      }
      return { rawText: '', blocks: [], error: `Groq API Error (${response.status}): ${msg.slice(0, 120)}` };
    }

    const json = await response.json();
    const rawContent = json?.choices?.[0]?.message?.content;

    if (!rawContent) {
      return { rawText: '', blocks: [], error: 'No response content from Groq API.' };
    }

    console.log('Groq raw response:', rawContent);

    const extracted = JSON.parse(rawContent);
    return parseExtractedOcr(extracted, rawContent);
  } catch (err: any) {
    console.error('Groq OCR Error:', err);
    return { rawText: '', blocks: [], error: `Groq execution error: ${err?.message || err}` };
  }
}

async function runGeminiOcr(base64: string, mimeType: string): Promise<OcrResult> {
  const MAX_RETRIES = 3;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      });
    } catch {
      return { rawText: '', blocks: [], error: 'Network error — check your internet connection.' };
    }

    // If server is busy (503) or rate limited (429), wait and retry
    if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
      let waitTime = 5000; // default 5 seconds
      try {
        const errBody = await response.clone().json();
        const retryInfo = errBody?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay);
          if (seconds > 0) waitTime = Math.min(seconds * 1000, 45000); // max 45s wait
        }
      } catch {}
      console.log(`Gemini ${response.status}, retrying in ${waitTime/1000}s... (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
    break;
  }

  if (!response) {
    return { rawText: '', blocks: [], error: 'Network error — no response received.' };
  }

  if (!response.ok) {
    const msg = await response.text().catch(() => '');
    console.error('Gemini API Error Response:', response.status, msg);
    if (response.status === 400) {
      return { rawText: '', blocks: [], error: `Gemini API error: ${msg.slice(0, 120)}` };
    }
    if (response.status === 403) {
      return { rawText: '', blocks: [], error: 'Invalid API key. Check your Gemini API key in ocrService.ts' };
    }
    if (response.status === 429) {
      return { rawText: '', blocks: [], error: 'Too many scans — please wait 1 minute and try again.' };
    }
    if (response.status === 503) {
      return { rawText: '', blocks: [], error: 'Gemini is busy right now. Please wait a moment and try again.' };
    }
    return { rawText: '', blocks: [], error: `API error ${response.status}: ${msg.slice(0, 120)}` };
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    return { rawText: '', blocks: [], error: 'Failed to parse Gemini API response.' };
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  let rawContent = '';
  for (const part of parts) {
    if (part.text) {
      rawContent = part.text;
    }
  }

  if (!rawContent) {
    return { rawText: '', blocks: [], error: 'NO_TEXT' };
  }

  console.log('Gemini raw response:', rawContent.slice(0, 500));

  let extracted: any;
  try {
    const cleaned = rawContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    extracted = JSON.parse(cleaned);
  } catch {
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found');
      }
    } catch {
      return {
        rawText: rawContent,
        blocks: [],
        error: 'Could not parse structured data. Raw text captured.',
      };
    }
  }

  return parseExtractedOcr(extracted, rawContent);
}

function normalizeKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return {};
  
  const normalized: any = {};
  
  const findValue = (possibleKeys: string[]): string => {
    for (const key of Object.keys(obj)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const pk of possibleKeys) {
        if (cleanKey === pk.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          return String(obj[key] ?? '');
        }
      }
    }
    return '';
  };

  normalized.trackingId = findValue(['trackingId', 'tracking_id', 'trackingNumber', 'tracking_number', 'parcelId', 'parcel_id', 'id']);
  normalized.customerName = findValue(['customerName', 'customer_name', 'name', 'recipientName', 'recipient_name', 'recipient']);
  normalized.mobileNumber = findValue(['mobileNumber', 'mobile_number', 'phone', 'phoneNumber', 'phone_number', 'mobile']);
  normalized.address = findValue(['address', 'deliveryAddress', 'delivery_address', 'shippingAddress', 'shipping_address', 'fullAddress']);
  normalized.rawText = findValue(['rawText', 'raw_text', 'text', 'label_text', 'labelText']) || obj.rawText || '';

  return normalized;
}

function parseExtractedOcr(extracted: any, rawContent: string): OcrResult {
  const normalized = normalizeKeys(extracted);
  const rawText: string = normalized.rawText || rawContent;

  if (!rawText && !normalized.trackingId && !normalized.customerName && !normalized.address) {
    return { rawText: '', blocks: [], error: 'NO_TEXT' };
  }

  const fields = [
    { key: 'trackingId',   value: normalized.trackingId },
    { key: 'customerName', value: normalized.customerName },
    { key: 'mobileNumber', value: normalized.mobileNumber },
    { key: 'address',      value: normalized.address },
  ].filter(f => f.value);

  const blocks: OcrBlock[] = fields.map((f, i) => ({
    text:       f.value,
    confidence: 0.95,
    boundingBox: {
      x:      0.04,
      y:      0.06 + i * 0.22,
      width:  f.key === 'address' ? 0.88 : 0.60,
      height: f.key === 'address' ? 0.16 : 0.10,
    },
  }));

  return {
    rawText,
    blocks,
    ...normalized,
  };
}
