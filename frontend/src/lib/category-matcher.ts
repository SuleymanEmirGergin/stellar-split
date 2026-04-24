/**
 * category-matcher — local, offline, rule-based expense category suggestion.
 *
 * Given a free-form description ("Pizza gecesi", "Uber ride"), suggests the
 * most likely category by scoring keyword matches per category. Fully local,
 * runs in <1ms, works offline, bilingual (Turkish + English).
 *
 * Categories mirror the Add Expense form in GroupDetail:
 *   food | transport | accommodation | entertainment | market | services
 *   | travel | other
 *
 * Note: the expense form currently persists six categories (food, transport,
 * accommodation, entertainment, market, other). We additionally expose
 * `services` and `travel` so suggestions feel richer; callers that only
 * accept the form's subset can coerce `services` / `travel` themselves.
 */

export type SuggestedCategory =
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'home'
  | 'services'
  | 'travel'
  | 'market'
  | 'accommodation'
  | 'other';

export interface CategorySuggestion {
  category: SuggestedCategory;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * Keyword dictionary per category. Keys are lowercase word-stems that will be
 * matched case-insensitively against whole words / hyphen/space-separated
 * tokens in the description.
 *
 * Multi-word entries (e.g. "burger king", "yurt disi") are matched as a
 * contiguous phrase.
 */
const KEYWORDS: Record<Exclude<SuggestedCategory, 'other'>, readonly string[]> = {
  food: [
    // Turkish
    'pizza', 'burger', 'yemek', 'kahvalti', 'kahvaltı', 'restoran', 'restaurant',
    'cafe', 'kafe', 'kahve', 'pub', 'bar', 'pasta', 'tatli', 'tatlı',
    'kebap', 'kebab', 'doner', 'döner', 'lahmacun', 'manti', 'mantı',
    'pide', 'borek', 'börek', 'simit', 'baklava', 'icecek', 'içecek',
    'ogle', 'öğle', 'aksam', 'akşam', 'iftar', 'sahur', 'brunch',
    'meze', 'balik', 'balık', 'et', 'tavuk', 'corba', 'çorba',
    // English
    'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'coffee', 'tea',
    'beer', 'wine', 'cocktail', 'sushi', 'ramen', 'noodle', 'noodles',
    'taco', 'burrito', 'steak', 'pasta', 'salad', 'sandwich', 'bagel',
    'donut', 'ice cream', 'icecream', 'bbq', 'grill',
    // Brands
    'starbucks', 'mcdonalds', 'mcdonald', 'kfc', 'burger king', 'subway',
    'dominos', 'pizza hut', 'popeyes', 'chipotle', 'wendys',
  ],

  transport: [
    // Turkish
    'taksi', 'otobus', 'otobüs', 'metro', 'metrobus', 'metrobüs', 'tramvay',
    'dolmus', 'dolmuş', 'vapur', 'ferry', 'tren', 'ucak', 'uçak',
    'benzin', 'yakit', 'yakıt', 'mazot', 'gaz', 'lpg', 'sarj', 'şarj',
    'otopark', 'park', 'garaj', 'araba', 'arac', 'araç', 'otoyol', 'hgs', 'ogs',
    // English
    'uber', 'lyft', 'taxi', 'cab', 'ride', 'rides', 'bus', 'train', 'subway ride',
    'flight', 'plane', 'airline', 'airfare', 'gas', 'fuel', 'petrol',
    'parking', 'toll', 'car rental', 'rental car',
    // Brands / apps
    'bitaksi', 'marti', 'martı', 'scooter', 'bolt', 'didi',
  ],

  entertainment: [
    // Turkish
    'sinema', 'film', 'konser', 'tiyatro', 'oyun', 'bowling', 'bilardo',
    'lunapark', 'luna park', 'etkinlik', 'festival', 'parti', 'gece', 'kulup', 'kulüp',
    // English
    'cinema', 'movie', 'concert', 'theater', 'theatre', 'show', 'gig',
    'game', 'gaming', 'arcade', 'club', 'party', 'festival', 'event',
    // Streaming / brands
    'netflix', 'spotify', 'disney', 'hbo', 'prime video', 'youtube premium',
    'ps5', 'ps4', 'xbox', 'nintendo', 'steam', 'playstation',
  ],

  home: [
    // Turkish
    'kira', 'fatura', 'faturalar', 'elektrik', 'su', 'dogalgaz', 'doğalgaz',
    'internet', 'wifi', 'ev', 'mobilya', 'temizlik', 'aidat',
    'beyaz esya', 'beyaz eşya', 'tamir', 'tadilat',
    // English
    'rent', 'bill', 'bills', 'utility', 'utilities', 'electric', 'electricity',
    'water', 'gas bill', 'home', 'furniture', 'cleaning', 'maintenance',
    'repair', 'hoa',
  ],

  services: [
    // Turkish
    'kargo', 'kurye', 'fiziksel', 'hizmet', 'sigorta', 'abonelik',
    'danismanlik', 'danışmanlık', 'tamirci', 'nakliye',
    // English
    'cargo', 'courier', 'shipping', 'delivery', 'service', 'insurance',
    'subscription', 'consulting', 'laundry', 'dry cleaning',
  ],

  travel: [
    // Turkish
    'otel', 'pansiyon', 'tatil', 'gezi', 'seyahat', 'vize', 'yurt disi',
    'yurt dışı', 'yurtdisi', 'yurtdışı', 'villa', 'bungalov', 'kamp',
    // English
    'hotel', 'airbnb', 'vacation', 'holiday', 'trip', 'travel', 'tour',
    'visa', 'resort', 'hostel', 'motel', 'cruise', 'excursion',
  ],

  // Retained form-legacy buckets so callers can still hit them directly.
  market: [
    'market', 'bakkal', 'supermarket', 'grocery', 'groceries', 'migros',
    'a101', 'bim', 'sok', 'şok', 'carrefour', 'metro market', 'gross',
  ],

  accommodation: [
    'konaklama', 'accommodation', 'lodging', 'stay',
  ],
};

// Escape a keyword so it can be safely embedded in a regex.
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Normalise: lowercase + collapse whitespace. We deliberately do NOT strip
// diacritics because our keyword list already contains both diacritic and
// plain variants (e.g. "doner" & "döner").
function normalise(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Build a single regex per keyword that enforces word boundaries on both
 * ends. We use lookarounds instead of \b because \b is unreliable for
 * non-ASCII characters (Turkish: ü, ö, ç, ğ, ı, ş).
 *
 * Accepted delimiters: start/end of string, whitespace, or common
 * punctuation. This means "party" does NOT match the "art" inside "party"
 * and "pizza!" still matches "pizza".
 */
const DELIM_BEFORE = '(?:^|[\\s.,;:!?()\\[\\]{}"\'/\\\\-])';
const DELIM_AFTER = '(?=$|[\\s.,;:!?()\\[\\]{}"\'/\\\\-])';

function keywordRegex(keyword: string): RegExp {
  return new RegExp(DELIM_BEFORE + escapeRegex(keyword) + DELIM_AFTER, 'i');
}

// Precompile once at module load so suggestCategory stays hot.
interface CompiledKeyword {
  keyword: string;
  regex: RegExp;
}
const COMPILED: Record<Exclude<SuggestedCategory, 'other'>, CompiledKeyword[]> = Object.fromEntries(
  (Object.keys(KEYWORDS) as Array<Exclude<SuggestedCategory, 'other'>>).map(cat => [
    cat,
    KEYWORDS[cat].map(k => ({ keyword: k, regex: keywordRegex(normalise(k)) })),
  ]),
) as Record<Exclude<SuggestedCategory, 'other'>, CompiledKeyword[]>;

/**
 * Suggest a category for a free-form expense description.
 *
 * Scoring: each matched keyword contributes 1 point to its category. Longer
 * phrases (e.g. "burger king") earn a small multi-word bonus. Confidence is
 * normalised into [0, 1] by:
 *   confidence = min(1, 0.4 + 0.3 * matches)
 * so a single-keyword match is ~0.7 and two matches saturate near 1.
 */
export function suggestCategory(description: string): CategorySuggestion {
  const empty: CategorySuggestion = { category: 'other', confidence: 0, matchedKeywords: [] };
  if (!description || typeof description !== 'string') return empty;

  const text = normalise(description);
  if (!text) return empty;

  let bestCategory: Exclude<SuggestedCategory, 'other'> | null = null;
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const cat of Object.keys(COMPILED) as Array<Exclude<SuggestedCategory, 'other'>>) {
    const matched: string[] = [];
    let score = 0;
    for (const { keyword, regex } of COMPILED[cat]) {
      if (regex.test(text)) {
        matched.push(keyword);
        // multi-word phrases are stronger signals than single tokens.
        score += keyword.includes(' ') ? 1.5 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
      bestMatched = matched;
    }
  }

  if (!bestCategory || bestScore === 0) return empty;

  // 1 hit  -> 0.7
  // 2 hits -> 1.0 (saturated)
  const confidence = Math.min(1, 0.4 + 0.3 * bestScore);

  return {
    category: bestCategory,
    confidence: Number(confidence.toFixed(2)),
    matchedKeywords: bestMatched,
  };
}

/**
 * Emoji used alongside the caption. Keeps the Add-Expense UI in sync with the
 * icon set used by ExpensesTab.
 */
export const CATEGORY_EMOJI: Record<SuggestedCategory, string> = {
  food: '🍕',
  transport: '🚗',
  entertainment: '🎬',
  home: '🏠',
  services: '📦',
  travel: '✈️',
  market: '🛍️',
  accommodation: '🏨',
  other: '💰',
};
