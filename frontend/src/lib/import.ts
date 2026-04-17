/**
 * Import utilities for migrating expenses from other apps.
 * Supports: Splitwise CSV, Tricount CSV, Generic CSV.
 */
import Papa from 'papaparse';

export interface ImportedExpense {
  description: string;
  amount: number; // in XLM (decimal)
  payer: string;  // name or address (raw from file)
  participants: string[]; // names or addresses
  date?: string;
  category?: string;
  originalCurrency?: string;
}

export interface ImportResult {
  expenses: ImportedExpense[];
  participants: string[];
  errors: string[];
  source: 'splitwise' | 'tricount' | 'generic' | 'ynab' | 'garanti' | 'akbank' | 'ziraat' | 'isbank';
}

export type BankFormat = 'auto' | 'splitwise' | 'tricount' | 'generic' | 'ynab' | 'garanti' | 'akbank' | 'ziraat' | 'isbank';

export interface BankOption {
  id: BankFormat;
  name: string;
  description: string;
  flag?: string;
}

// ─── Splitwise CSV format ─────────────────────────────────────────────────────
// Headers: Date,Description,Category,Cost,Currency,<member1>,<member2>,...
export function parseSplitwise(csvText: string): ImportResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const participantSet = new Set<string>();
  const expenses: ImportedExpense[] = [];

  for (const row of result.data) {
    try {
      const description = row['Description'] ?? row['description'] ?? '';
      const costStr = row['Cost'] ?? row['cost'] ?? '0';
      const currency = row['Currency'] ?? row['currency'] ?? 'XLM';
      const date = row['Date'] ?? row['date'] ?? '';

      const amount = parseFloat(costStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount <= 0) continue;
      if (!description) continue;

      // Find the payer: first column with non-zero value as payer heuristic
      const memberKeys = Object.keys(row).filter(
        (k) => !['Date', 'Description', 'Category', 'Cost', 'Currency'].includes(k) && k !== '',
      );

      // Splitwise marks the payer with a negative value (they "receive" money)
      let payer = memberKeys[0] ?? 'Unknown';
      const participants: string[] = [];
      for (const m of memberKeys) {
        const val = parseFloat((row[m] ?? '0').replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val < 0) payer = m; // negative = payer
        if (!isNaN(val) && val !== 0) {
          participants.push(m);
          participantSet.add(m);
        }
      }

      expenses.push({
        description,
        amount,
        payer,
        participants: participants.length > 0 ? participants : memberKeys,
        date,
        category: (row['Category'] ?? row['category'] ?? '').toLowerCase() || 'other',
        originalCurrency: currency,
      });
    } catch {
      errors.push(`Row parse error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: [...participantSet], errors, source: 'splitwise' };
}

// ─── Tricount CSV format ───────────────────────────────────────────────────────
// Headers: Title,Amount,Currency,Paid by,Date,Participants
export function parseTricount(csvText: string): ImportResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const participantSet = new Set<string>();
  const expenses: ImportedExpense[] = [];

  for (const row of result.data) {
    try {
      const description = row['Title'] ?? row['title'] ?? row['Description'] ?? '';
      const amountStr = row['Amount'] ?? row['amount'] ?? '0';
      const currency = row['Currency'] ?? row['currency'] ?? 'XLM';
      const payer = row['Paid by'] ?? row['paid_by'] ?? row['Payer'] ?? '';
      const date = row['Date'] ?? row['date'] ?? '';
      const participantsStr = row['Participants'] ?? row['participants'] ?? '';

      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount <= 0) continue;
      if (!description) continue;

      const participants = participantsStr
        .split(/[,;|]/)
        .map((p) => p.trim())
        .filter(Boolean);

      participants.forEach((p) => participantSet.add(p));
      if (payer) participantSet.add(payer);

      expenses.push({
        description,
        amount,
        payer: payer || (participants[0] ?? 'Unknown'),
        participants: participants.length > 0 ? participants : [payer],
        date,
        originalCurrency: currency,
        category: 'other',
      });
    } catch {
      errors.push(`Row parse error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: [...participantSet], errors, source: 'tricount' };
}

// ─── Generic CSV (auto-detect columns) ───────────────────────────────────────
// Tries to find: description/title, amount/cost, payer/paid_by, date
export function parseGenericCSV(csvText: string): ImportResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const participantSet = new Set<string>();
  const expenses: ImportedExpense[] = [];

  const headers = result.meta.fields ?? [];
  const find = (...candidates: string[]) =>
    candidates.find((c) => headers.some((h) => h.toLowerCase() === c.toLowerCase())) ?? candidates[0];

  const descKey = find('description', 'title', 'name', 'expense', 'item');
  const amountKey = find('amount', 'cost', 'price', 'total', 'sum');
  const payerKey = find('payer', 'paid_by', 'paid by', 'who paid', 'paid');
  const dateKey = find('date', 'created', 'when');
  const categoryKey = find('category', 'type', 'tag');

  for (const row of result.data) {
    try {
      const description = row[descKey] ?? '';
      const amountStr = row[amountKey] ?? '0';
      const payer = row[payerKey] ?? '';
      const date = row[dateKey] ?? '';
      const category = (row[categoryKey] ?? '').toLowerCase() || 'other';

      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount <= 0 || !description) continue;

      if (payer) participantSet.add(payer);

      expenses.push({
        description,
        amount,
        payer: payer || 'Unknown',
        participants: payer ? [payer] : [],
        date,
        category,
      });
    } catch {
      errors.push(`Row parse error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: [...participantSet], errors, source: 'generic' };
}

// ─── YNAB CSV format ──────────────────────────────────────────────────────────
// Headers: Account,Flag,Date,Payee,Category Group/Category,Category Group,Category,Memo,Outflow,Inflow,Cleared
export function parseYNAB(csvText: string): ImportResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const expenses: ImportedExpense[] = [];

  for (const row of result.data) {
    try {
      const description = row['Payee'] ?? row['Memo'] ?? '';
      const outflowStr = (row['Outflow'] ?? '0').replace(/[^0-9.-]/g, '');
      const date = row['Date'] ?? '';
      const category = (row['Category'] ?? row['Category Group'] ?? 'other').toLowerCase();

      const amount = parseFloat(outflowStr);
      if (isNaN(amount) || amount <= 0 || !description) continue;

      expenses.push({ description, amount, payer: 'Me', participants: ['Me'], date, category });
    } catch {
      errors.push(`YNAB row error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: ['Me'], errors, source: 'ynab' };
}

// ─── Garanti BBVA CSV ─────────────────────────────────────────────────────────
// Format: Date;Description;Amount;Balance  (semicolon-separated, Turkish locale)
export function parseGaranti(csvText: string): ImportResult {
  // Garanti exports use semicolon and TR decimal comma: "1.234,56" → 1234.56
  const normText = csvText
    .split('\n')
    .map((line) => line.replace(/\./g, '').replace(',', '.'))
    .join('\n');

  const result = Papa.parse<string[]>(normText.trim(), {
    header: false,
    delimiter: ';',
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const expenses: ImportedExpense[] = [];

  // Skip header row
  const rows = result.data.slice(1);
  for (const row of rows) {
    try {
      const [date, description, amountStr] = row as string[];
      const amount = parseFloat((amountStr ?? '0').replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount >= 0 || !description) continue; // only debits (negative)

      expenses.push({
        description: description.trim(),
        amount: Math.abs(amount),
        payer: 'Me',
        participants: ['Me'],
        date: (date ?? '').trim(),
        category: 'other',
        originalCurrency: 'TRY',
      });
    } catch {
      errors.push(`Garanti row error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: ['Me'], errors, source: 'garanti' };
}

// ─── Akbank CSV ───────────────────────────────────────────────────────────────
// Format: Tarih,Açıklama,Tutar,Bakiye  (comma-separated, TR decimal comma)
export function parseAkbank(csvText: string): ImportResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const expenses: ImportedExpense[] = [];

  for (const row of result.data) {
    try {
      const description = row['Açıklama'] ?? row['Aciklama'] ?? row['Description'] ?? '';
      const rawAmount = (row['Tutar'] ?? row['Miktar'] ?? row['Amount'] ?? '0')
        .replace(/\./g, '')
        .replace(',', '.');
      const date = row['Tarih'] ?? row['Date'] ?? '';
      const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount >= 0 || !description) continue;

      expenses.push({
        description: description.trim(),
        amount: Math.abs(amount),
        payer: 'Me',
        participants: ['Me'],
        date: date.trim(),
        category: 'other',
        originalCurrency: 'TRY',
      });
    } catch {
      errors.push(`Akbank row error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: ['Me'], errors, source: 'akbank' };
}

// ─── Ziraat Bankası CSV ───────────────────────────────────────────────────────
// Format: similar to Akbank but with different headers: Tarih;Açıklama;Borç;Alacak;Bakiye
export function parseZiraat(csvText: string): ImportResult {
  const normText = csvText
    .split('\n')
    .map((line) => line.replace(/\./g, '').replace(',', '.'))
    .join('\n');

  const result = Papa.parse<string[]>(normText.trim(), {
    header: false,
    delimiter: ';',
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const expenses: ImportedExpense[] = [];

  const rows = result.data.slice(1);
  for (const row of rows) {
    try {
      const [date, description, debitStr] = row as string[];
      const amount = parseFloat((debitStr ?? '0').replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount <= 0 || !description) continue;

      expenses.push({
        description: description.trim(),
        amount,
        payer: 'Me',
        participants: ['Me'],
        date: (date ?? '').trim(),
        category: 'other',
        originalCurrency: 'TRY',
      });
    } catch {
      errors.push(`Ziraat row error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: ['Me'], errors, source: 'ziraat' };
}

// ─── İş Bankası CSV ───────────────────────────────────────────────────────────
// Format: Tarih,İşlem Açıklaması,Tutar,Para Birimi,Bakiye
export function parseIsbank(csvText: string): ImportResult {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  const expenses: ImportedExpense[] = [];

  for (const row of result.data) {
    try {
      const description = row['İşlem Açıklaması'] ?? row['Islem Aciklamasi'] ?? row['Description'] ?? '';
      const rawAmount = (row['Tutar'] ?? '0').replace(/\./g, '').replace(',', '.');
      const date = row['Tarih'] ?? row['Date'] ?? '';
      const currency = row['Para Birimi'] ?? 'TRY';
      const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount >= 0 || !description) continue;

      expenses.push({
        description: description.trim(),
        amount: Math.abs(amount),
        payer: 'Me',
        participants: ['Me'],
        date: date.trim(),
        category: 'other',
        originalCurrency: currency,
      });
    } catch {
      errors.push(`İşbank row error: ${JSON.stringify(row)}`);
    }
  }

  return { expenses, participants: ['Me'], errors, source: 'isbank' };
}

// ─── Available bank options ────────────────────────────────────────────────────
export const BANK_OPTIONS: BankOption[] = [
  { id: 'auto',      name: 'Auto-detect',       description: 'Splitwise / Tricount / Generic' },
  { id: 'splitwise', name: 'Splitwise',          description: 'Export from Splitwise app' },
  { id: 'tricount',  name: 'Tricount',           description: 'Export from Tricount app' },
  { id: 'ynab',      name: 'YNAB',               description: 'You Need A Budget export' },
  { id: 'garanti',   name: 'Garanti BBVA',       description: 'TR — Hesap Hareketleri CSV', flag: '🇹🇷' },
  { id: 'akbank',    name: 'Akbank',             description: 'TR — Hesap Ekstrem CSV', flag: '🇹🇷' },
  { id: 'ziraat',    name: 'Ziraat Bankası',     description: 'TR — Hesap Hareketleri CSV', flag: '🇹🇷' },
  { id: 'isbank',    name: 'İş Bankası',         description: 'TR — Hesap Dökümü CSV', flag: '🇹🇷' },
  { id: 'generic',   name: 'Generic CSV',        description: 'Any CSV with amount + description' },
];

// ─── Auto-detect format ───────────────────────────────────────────────────────
export function parseCSVAutoDetect(csvText: string): ImportResult {
  const firstLine = csvText.split('\n')[0]?.toLowerCase() ?? '';

  if (firstLine.includes('outflow') || firstLine.includes('inflow')) {
    return parseYNAB(csvText);
  }
  if (firstLine.includes('cost') && firstLine.includes('currency')) {
    return parseSplitwise(csvText);
  }
  if (firstLine.includes('paid by') || firstLine.includes('participants')) {
    return parseTricount(csvText);
  }
  // Turkish bank detection
  if (firstLine.includes('açıklama') || firstLine.includes('aciklama') || firstLine.includes('borç')) {
    if (firstLine.includes('borç')) return parseZiraat(csvText);
    if (firstLine.includes('akbank') || firstLine.includes('miktar')) return parseAkbank(csvText);
    return parseGaranti(csvText);
  }
  return parseGenericCSV(csvText);
}

export function parseWithFormat(csvText: string, format: BankFormat): ImportResult {
  switch (format) {
    case 'splitwise': return parseSplitwise(csvText);
    case 'tricount':  return parseTricount(csvText);
    case 'ynab':      return parseYNAB(csvText);
    case 'garanti':   return parseGaranti(csvText);
    case 'akbank':    return parseAkbank(csvText);
    case 'ziraat':    return parseZiraat(csvText);
    case 'isbank':    return parseIsbank(csvText);
    case 'generic':   return parseGenericCSV(csvText);
    default:          return parseCSVAutoDetect(csvText);
  }
}
