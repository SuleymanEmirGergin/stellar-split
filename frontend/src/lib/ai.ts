/**
 * Receipt scanning for Birik.
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

/** Returns true when a receipt AI backend (Wiro or OpenAI) is configured. */
export function hasReceiptAI(): boolean {
  return !!(WIRO_API_KEY || OPENAI_KEY);
}

/** Demo/sample receipt data for when no API key is set. Use in UI as "Demo fiş" button. */
export function getMockScannedData(): ScannedData {
  return {
    merchant: 'Demo Kafe',
    currency: 'XLM',
    items: [
      { description: 'Kahve', amount: 2.5, category: 'food' },
      { description: 'Sandviç', amount: 4.0, category: 'food' },
      { description: 'Kurabiye', amount: 1.5, category: 'food' },
    ],
    totalAmount: 8,
    confidence: 0.9,
  };
}

export async function scanReceiptAI(
  imageBase64: string
): Promise<ScannedData> {
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

/**
 * Innovation #7: Financial Intelligence (RAG Advisor)
 */
export interface FinancialAdvice {
  summary: string;
  tips: string[];
  savingPlan?: string;
}

export async function adviseFinancial(
  walletAddress: string,
  context: { groups: { name: string; memberCount: number }[], balances: Record<string, number> },
  userQuery?: string
): Promise<FinancialAdvice> {
  // If OpenAI key exists use it, else return a mock local response for demo
  if (!OPENAI_KEY) {
    return {
      summary: "Your group expenses are well-managed. You have idle XLM liquidity that could be optimized via Yield strategies.",
      tips: [
        "Stake your remaining 500 XLM into AQUA.",
        "Settle all dust debts to improve your Soroban reputation.",
        "Use 3D virtual cards for higher cash-backs."
      ],
      savingPlan: "We suggest moving 40% of settled stablecoins to a yield-bearing pool."
    };
  }

  const ragContext = `
    User Wallet: ${walletAddress}
    Managed Groups: ${context.groups.length}
    Group Details: ${JSON.stringify(context.groups.map(g => ({ name: g.name, members: g.memberCount })))}
    Current Balances (Stroops): ${JSON.stringify(context.balances)}
  `;

  const prompt = `
    You are Birik Advanced Financial Advisor. 
    Analyze this user's group spending and balances on the Stellar network:
    ${ragContext}

    User Question (if any): ${userQuery || "Provide a general monthly savings and optimization report."}

    Focus on:
    1. Reducing debt in groups.
    2. Optimizing XLM/USDC holdings.
    3. Suggesting DeFi yield strategies available on Stellar.
    4. Providing 3 actionable saving tips.

    Reply with valid JSON only:
    {
      "summary": "...",
      "tips": ["tip1", "tip2", "tip3"],
      "savingPlan": "..."
    }
  `;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      }),
    });
    
    if (!res.ok) throw new Error("OpenAI fetch failed");
    const data = await res.json();
    const jsonStr = data.choices[0].message.content.replace(/^```json\s*|\s*```$/g, '').trim();
    return JSON.parse(jsonStr) as FinancialAdvice;
  } catch (err) {
    console.error(err);
    return {
      summary: "AI Analysis unavailable (network error).",
      tips: ["Check connection."]
    };
  }
}

