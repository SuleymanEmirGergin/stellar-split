import { describe, it, expect } from 'vitest';
import { suggestCategory } from './category-matcher';

describe('suggestCategory — basic matching', () => {
  it('matches Turkish food keyword "pizza"', () => {
    const res = suggestCategory('Pizza gecesi');
    expect(res.category).toBe('food');
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.matchedKeywords).toContain('pizza');
  });

  it('matches Turkish transport keyword "benzin"', () => {
    const res = suggestCategory('benzin dolumu');
    expect(res.category).toBe('transport');
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.matchedKeywords).toContain('benzin');
  });

  it('matches Turkish home keyword "kira"', () => {
    const res = suggestCategory('Mart ayı kira');
    expect(res.category).toBe('home');
    expect(res.matchedKeywords).toContain('kira');
  });

  it('matches English transport keyword "uber"', () => {
    const res = suggestCategory('Uber ride home');
    expect(res.category).toBe('transport');
    expect(res.matchedKeywords).toContain('uber');
  });

  it('matches English travel keyword "hotel"', () => {
    const res = suggestCategory('Hotel booking for weekend');
    expect(res.category).toBe('travel');
    expect(res.matchedKeywords).toContain('hotel');
  });

  it('matches English entertainment keyword "netflix"', () => {
    const res = suggestCategory('Netflix subscription');
    expect(res.category).toBe('entertainment');
    expect(res.matchedKeywords).toContain('netflix');
  });
});

describe('suggestCategory — no match', () => {
  it('returns "other" with confidence 0 when nothing matches', () => {
    const res = suggestCategory('qwertyuiop asdfghjkl');
    expect(res.category).toBe('other');
    expect(res.confidence).toBe(0);
    expect(res.matchedKeywords).toEqual([]);
  });

  it('returns "other" for empty string', () => {
    expect(suggestCategory('')).toEqual({ category: 'other', confidence: 0, matchedKeywords: [] });
  });

  it('returns "other" for whitespace-only string', () => {
    expect(suggestCategory('   ').category).toBe('other');
  });

  it('returns "other" for non-string inputs defensively', () => {
    // @ts-expect-error — runtime safety guard
    expect(suggestCategory(null).category).toBe('other');
    // @ts-expect-error — runtime safety guard
    expect(suggestCategory(undefined).category).toBe('other');
  });
});

describe('suggestCategory — case insensitive', () => {
  it('matches "PIZZA" (upper)', () => {
    expect(suggestCategory('PIZZA gecesi').category).toBe('food');
  });

  it('matches "Pizza" (title case)', () => {
    expect(suggestCategory('Pizza').category).toBe('food');
  });

  it('matches "pizza" (lower)', () => {
    expect(suggestCategory('pizza').category).toBe('food');
  });

  it('matches "uBeR" (mixed)', () => {
    expect(suggestCategory('uBeR home').category).toBe('transport');
  });
});

describe('suggestCategory — word boundaries', () => {
  it('does NOT match "art" inside "party" as entertainment-art', () => {
    // "art" is not a keyword, but "party" is — ensure "party" matches but
    // arbitrary substrings do not give false positives.
    const res = suggestCategory('yeah party');
    expect(res.category).toBe('entertainment');
    expect(res.matchedKeywords).toContain('party');
    // explicitly: if someone wrote only "artisanal" we should not match.
    const res2 = suggestCategory('artisanal craft');
    expect(res2.category).toBe('other');
    expect(res2.confidence).toBe(0);
  });

  it('does NOT match "bar" inside "barber"', () => {
    const res = suggestCategory('barber shop visit');
    // "bar" is a food keyword; "barber" must not trigger it. No other keyword
    // should fire here either, so we expect "other".
    expect(res.matchedKeywords).not.toContain('bar');
    expect(res.category).toBe('other');
  });

  it('does NOT match "cart" inside "cartoon"', () => {
    const res = suggestCategory('cartoon night');
    expect(res.matchedKeywords).not.toContain('cart');
  });

  it('DOES match "pizza" with punctuation around it ("Pizza!")', () => {
    expect(suggestCategory('Pizza!').category).toBe('food');
  });
});

describe('suggestCategory — multi-keyword boost', () => {
  it('has higher confidence when two keywords match', () => {
    const single = suggestCategory('pizza');
    const double = suggestCategory('pizza and burger');
    expect(double.confidence).toBeGreaterThan(single.confidence);
    expect(double.matchedKeywords.length).toBeGreaterThanOrEqual(2);
  });

  it('boosts multi-word phrases ("burger king")', () => {
    const res = suggestCategory('burger king dinner');
    expect(res.category).toBe('food');
    // "burger", "king" phrase + "dinner" => multiple hits
    expect(res.confidence).toBeGreaterThan(0.7);
  });

  it('picks the category with more keyword hits when mixed', () => {
    // "uber" is transport, "pizza" and "dinner" are food → food wins.
    const res = suggestCategory('uber to pizza dinner');
    expect(res.category).toBe('food');
  });

  it('saturates confidence at 1.0', () => {
    const res = suggestCategory('pizza burger kebap dinner lunch dessert');
    expect(res.confidence).toBeLessThanOrEqual(1);
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe('suggestCategory — performance', () => {
  it('returns a suggestion in well under 50ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      suggestCategory('Pizza gecesi with friends at burger king, Uber ride back');
    }
    const elapsed = performance.now() - start;
    // 100 calls should be comfortably under 50ms total on any modern runtime.
    expect(elapsed).toBeLessThan(50);
  });
});
