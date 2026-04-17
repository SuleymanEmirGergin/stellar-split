import { describe, it, expect } from 'vitest';
import { getLangKey, translateError } from './errors';

describe('getLangKey', () => {
  it('returns "tr" for "tr"', () => {
    expect(getLangKey('tr')).toBe('tr');
  });

  it('returns "en" for "en"', () => {
    expect(getLangKey('en')).toBe('en');
  });

  it('returns "en" for unsupported language "de"', () => {
    expect(getLangKey('de')).toBe('en');
  });

  it('returns "en" for unsupported language "es"', () => {
    expect(getLangKey('es')).toBe('en');
  });

  it('returns "en" for empty string', () => {
    expect(getLangKey('')).toBe('en');
  });
});

describe('translateError', () => {
  it('maps "group is already settled" to Turkish', () => {
    expect(translateError('group is already settled', 'tr')).toContain('Grup zaten kapatılmış');
  });

  it('maps "group is already settled" to English', () => {
    expect(translateError('group is already settled', 'en')).toContain('already settled');
  });

  it('passes through unknown message unchanged', () => {
    expect(translateError('some random error', 'tr')).toBe('some random error');
  });

  it('returns Turkish generic error for empty string', () => {
    expect(translateError('', 'tr')).toBe('Bir hata oluştu.');
  });

  it('returns English generic error for null input', () => {
    expect(translateError(null as unknown as string, 'en')).toBe('An error occurred.');
  });

  it('maps "Failed to fetch" to Turkish offline message', () => {
    expect(translateError('Failed to fetch', 'tr')).toContain('Çevrimdışı');
  });

  it('maps "User declined" to Turkish rejection message', () => {
    expect(translateError('User declined', 'tr')).toContain('İmzalama reddedildi');
  });

  it('maps "insufficient balance" to English balance message', () => {
    expect(translateError('insufficient balance', 'en')).toContain('Insufficient balance');
  });
});
