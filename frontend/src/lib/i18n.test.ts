import { renderHook, act } from '@testing-library/react';
import { i18n, useI18n } from './i18n';

beforeEach(() => {
  localStorage.clear();
  // Reset to Turkish default between tests
  i18n.setLang('tr');
});

describe('i18n.t()', () => {
  it('returns Turkish translation by default', () => {
    expect(i18n.t('common.save')).toBe('Kaydet');
  });

  it('returns English translation after setLang("en")', () => {
    i18n.setLang('en');
    expect(i18n.t('common.save')).toBe('Save');
  });

  it('returns German translation after setLang("de")', () => {
    i18n.setLang('de');
    expect(i18n.t('common.save')).toBe('Speichern');
  });

  it('returns Spanish translation after setLang("es")', () => {
    i18n.setLang('es');
    expect(i18n.t('common.save')).toBe('Guardar');
  });

  it('falls back to key when translation is missing', () => {
    // Use a key that doesn't exist in translations
    const key = 'nonexistent.key' as Parameters<typeof i18n.t>[0];
    expect(i18n.t(key)).toBe('nonexistent.key');
  });

  it('translates common.cancel', () => {
    i18n.setLang('en');
    expect(i18n.t('common.cancel')).toBe('Cancel');
  });

  it('translates nav.dashboard', () => {
    i18n.setLang('en');
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });
});

describe('i18n.setLang()', () => {
  it('persists language to localStorage', () => {
    i18n.setLang('en');
    expect(localStorage.getItem('stellarsplit_lang')).toBe('en');
  });

  it('dispatches stellarsplit:lang-updated event', () => {
    const handler = vi.fn();
    window.addEventListener('stellarsplit:lang-updated', handler);
    i18n.setLang('de');
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('stellarsplit:lang-updated', handler);
  });

  it('updates lang getter', () => {
    i18n.setLang('es');
    expect(i18n.lang).toBe('es');
  });
});

describe('useI18n hook', () => {
  beforeEach(() => {
    i18n.setLang('tr');
  });

  it('returns t function and current lang', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.lang).toBe('tr');
    expect(typeof result.current.t).toBe('function');
    expect(typeof result.current.setLang).toBe('function');
  });

  it('t() returns correct translation', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.t('common.save')).toBe('Kaydet');
  });

  it('re-renders when language changes via setLang', async () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.t('common.save')).toBe('Kaydet');

    act(() => {
      result.current.setLang('en');
    });

    expect(result.current.t('common.save')).toBe('Save');
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useI18n());
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'stellarsplit:lang-updated',
      expect.any(Function),
    );
  });
});
