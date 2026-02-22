/**
 * Receipt scanning for StellarSplit.
 * Priority: 1) Wiro.ai (VITE_WIRO_API_KEY), 2) OpenAI Vision (VITE_OPENAI_API_KEY), 3) mock.
 *
 * Security note: API keys in the frontend are exposed in the bundle.
 * For production, prefer a backend proxy.
 */

export interface ScannedItem {
  description: string;
  amount: number;
  category: string;
}

export interface ScannedData {
  merchant?: string;
  currency?: string;
  items: ScannedItem[];
  totalAmount: number;
  confidence: number;
}

const WIRO_API_KEY = import.meta.env.VITE_WIRO_API_KEY as string | undefined;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

const WIRO_RUN_URL = 'https://api.wiro.ai/v1/Run/openai/gpt-5-2';
const WIRO_TASK_DETAIL_URL = 'https://api.wiro.ai/v1/Task/Detail';
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 40; // ~60s

const CATEGORIES = [
  'food',
  'transport',
  'home',
  'fun',
  'travel',
  'grocery',
  'health',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

const RECEIPT_PROMPT = `You are a receipt parser. From this receipt image, extract:
1. merchant: name of the store (e.g. "Starbucks", "Walmart")
2. currency: detected currency code (e.g. "USD", "TRY", "EUR", "XLM")
3. items: a list of items, each with:
   - description: item name
   - amount: number only
   - category: exactly one of: ${CATEGORIES.join(', ')}
4. totalAmount: the grand total as a number only.

Reply with valid JSON only, no markdown: {"merchant":"...","currency":"...","items":[{"description":"...","amount":number,"category":"..."}],"totalAmount":number}`;

function base64ToBlob(dataUrlOrBase64: string): Blob {
  const base64 = dataUrlOrBase64.replace(/^data:image\/\w+;base64,/, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/jpeg' });
}

async function wiroRunWithImage(imageBase64: string): Promise<string> {
  if (!WIRO_API_KEY) throw new Error('VITE_WIRO_API_KEY is not set');
  const blob = base64ToBlob(imageBase64);
  const form = new FormData();
  form.append('inputImage', blob, 'receipt.jpg');
  form.append('prompt', RECEIPT_PROMPT);
  form.append('reasoning', 'low');
  form.append('webSearch', 'false');
  form.append('verbosity', 'low');

  const res = await fetch(WIRO_RUN_URL, {
    method: 'POST',
    headers: { 'x-api-key': WIRO_API_KEY },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Wiro Run failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { errors?: unknown[]; taskid?: string; socketaccesstoken?: string; result?: boolean };
  if (data.errors?.length) throw new Error(`Wiro errors: ${JSON.stringify(data.errors)}`);
  const token = data.socketaccesstoken;
  if (!token) throw new Error('Wiro Run did not return socketaccesstoken');
  return token;
}

interface WiroTaskItem {
  status?: string;
  outputs?: Array<{ url?: string; contenttype?: string }>;
  debugoutput?: string;
  [key: string]: unknown;
}

async function wiroPollTaskDetail(taskToken: string): Promise<WiroTaskItem | null> {
  const res = await fetch(WIRO_TASK_DETAIL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': WIRO_API_KEY!,
    },
    body: JSON.stringify({ tasktoken: taskToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { tasklist?: WiroTaskItem[]; result?: boolean };
  const task = data.tasklist?.[0];
  if (!task) return null;
  return task;
}

async function callWiroVision(imageBase64: string): Promise<ScannedData> {
  const taskToken = await wiroRunWithImage(imageBase64);
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const task = await wiroPollTaskDetail(taskToken);
    if (!task) continue;
    const status = task.status || '';
    if (status === 'task_postprocess_end' || status === 'task_end') {
      let jsonStr: string | null = null;
      if (task.outputs?.length) {
        for (const out of task.outputs) {
          if (!out.url) continue;
          const ct = (out.contenttype || '').toLowerCase();
          if (ct.includes('json') || ct.includes('text')) {
            const r = await fetch(out.url);
            if (r.ok) jsonStr = await r.text();
            break;
          }
        }
        if (!jsonStr && task.outputs[0]?.url) {
          const r = await fetch(task.outputs[0].url);
          if (r.ok) {
            const text = await r.text();
            if (text.trim().startsWith('{') && text.includes('"merchant"')) jsonStr = text;
          }
        }
      }
      if (!jsonStr && typeof task.debugoutput === 'string' && task.debugoutput.trim()) {
        jsonStr = task.debugoutput.trim();
      }
      if (!jsonStr) {
        for (const [, v] of Object.entries(task)) {
          if (typeof v === 'string' && v.trim().startsWith('{') && v.includes('"merchant"')) {
            jsonStr = v.trim();
            break;
          }
        }
      }
      if (jsonStr) {
        const cleaned = jsonStr.replace(/^```json\s*|\s*```$/g, '').trim();
        const parsed = JSON.parse(cleaned) as {
          merchant?: string;
          currency?: string;
          items?: Array<{ description: string; amount: number; category: string }>;
          totalAmount?: number;
        };
        const items: ScannedItem[] = (parsed.items || []).map((item) => ({
          description: typeof item.description === 'string' ? item.description : 'Item',
          amount: typeof item.amount === 'number' ? item.amount : 0,
          category: (item.category && (CATEGORIES as readonly string[]).includes(item.category)) ? (item.category as Category) : 'other',
        }));
        return {
          merchant: parsed.merchant || 'Unknown',
          currency: parsed.currency || 'XLM',
          items,
          totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : 0,
          confidence: 0.9,
        };
      }
    }
  }
  throw new Error('Wiro task did not return receipt JSON in time');
}

async function callOpenAIVision(imageBase64: string): Promise<ScannedData> {
  if (!OPENAI_KEY) throw new Error('VITE_OPENAI_API_KEY is not set');

  const url = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: RECEIPT_PROMPT,
            },
            {
              type: 'image_url',
              image_url: { url },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned empty content');

  const jsonStr = content.replace(/^```json\s*|\s*```$/g, '').trim();
  const parsed = JSON.parse(jsonStr) as { 
    merchant?: string; 
    currency?: string; 
    items?: Array<{ description: string; amount: number; category: string }>; 
    totalAmount?: number 
  };

  const items: ScannedItem[] = (parsed.items || []).map(item => ({
    description: typeof item.description === 'string' ? item.description : 'Item',
    amount: typeof item.amount === 'number' ? item.amount : 0,
    category: (item.category && (CATEGORIES as readonly string[]).includes(item.category)) ? (item.category as Category) : 'other'
  }));

  return {
    merchant: parsed.merchant || 'Unknown',
    currency: parsed.currency || 'XLM',
    items,
    totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : 0,
    confidence: 0.95,
  };
}

import Tesseract from 'tesseract.js';

function parseAmountFromText(text: string): number | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const totalKeywords = ['total', 'toplam', 'amount due', 'ödenecek', 'tutar', 'sum'];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (totalKeywords.some(k => lowerLine.includes(k))) {
      const amount = extractLargestAmount(line);
      if (amount) return amount;
    }
  }

  const bottomHalfText = lines.slice(Math.floor(lines.length / 2)).join('\n');
  const amountBottom = extractLargestAmount(bottomHalfText);
  if (amountBottom) return amountBottom;
  
  return extractLargestAmount(text);
}

function extractLargestAmount(text: string): number | null {
  const regex = /\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g;
  const matches = text.match(regex);
  if (!matches) return null;

  let maxAmount = 0;
  for (const m of matches) {
    let normalized = m;
    const lastComma = m.lastIndexOf(',');
    const lastDot = m.lastIndexOf('.');
    
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        normalized = m.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = m.replace(/,/g, '');
      }
    } else if (lastComma > -1) {
      normalized = m.replace(',', '.');
    }
    
    const val = parseFloat(normalized);
    if (!isNaN(val) && val > maxAmount) {
      maxAmount = val;
    }
  }
  return maxAmount > 0 ? maxAmount : null;
}

async function runLocalOCR(imageBase64: string): Promise<ScannedData> {
  const { data: { text } } = await Tesseract.recognize(
    imageBase64,
    'eng+tur',
    { logger: () => {} }
  );

  const amount = parseAmountFromText(text) || 0;
  
  return {
    merchant: 'Manuel Onay Bekliyor',
    currency: 'XLM',
    items: [
      {
        description: 'Fiş tutarı (Otomatik Okuma)',
        amount: amount,
        category: 'other',
      }
    ],
    totalAmount: amount,
    confidence: 0.8,
  };
}

export async function scanReceiptAI(imageBase64: string): Promise<ScannedData> {
  if (WIRO_API_KEY) {
    try {
      return await callWiroVision(imageBase64);
    } catch (err) {
      console.warn('Wiro Vision failed, trying fallback:', err);
      if (OPENAI_KEY) {
        try {
          return await callOpenAIVision(imageBase64);
        } catch {
          return await runLocalOCR(imageBase64);
        }
      }
      return await runLocalOCR(imageBase64);
    }
  }
  if (OPENAI_KEY) {
    try {
      return await callOpenAIVision(imageBase64);
    } catch (err) {
      console.warn('OpenAI Vision failed, using local OCR:', err);
      return await runLocalOCR(imageBase64);
    }
  }
  return await runLocalOCR(imageBase64);
}
