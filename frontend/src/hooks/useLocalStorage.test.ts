import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('useLocalStorage — string', () => {
  it('returns initialValue when key is absent', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns stored string without JSON-parsing', () => {
    localStorage.setItem('key', 'hello');
    const { result } = renderHook(() => useLocalStorage('key', ''));
    expect(result.current[0]).toBe('hello');
  });

  it('persists string value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', ''));
    act(() => { result.current[1]('new value'); });
    expect(localStorage.getItem('key')).toBe('new value');
    expect(result.current[0]).toBe('new value');
  });
});

describe('useLocalStorage — boolean', () => {
  it('returns initialValue false when key is absent', () => {
    const { result } = renderHook(() => useLocalStorage('flag', false));
    expect(result.current[0]).toBe(false);
  });

  it('returns true when stored value is "true"', () => {
    localStorage.setItem('flag', 'true');
    const { result } = renderHook(() => useLocalStorage('flag', false));
    expect(result.current[0]).toBe(true);
  });

  it('returns false when stored value is "false"', () => {
    localStorage.setItem('flag', 'false');
    const { result } = renderHook(() => useLocalStorage('flag', true));
    expect(result.current[0]).toBe(false);
  });

  it('persists boolean as string', () => {
    const { result } = renderHook(() => useLocalStorage('flag', false));
    act(() => { result.current[1](true); });
    expect(localStorage.getItem('flag')).toBe('true');
  });
});

describe('useLocalStorage — object / JSON', () => {
  it('returns initialValue when key is absent', () => {
    const { result } = renderHook(() => useLocalStorage('obj', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('parses stored JSON', () => {
    localStorage.setItem('obj', JSON.stringify({ a: 42 }));
    const { result } = renderHook(() => useLocalStorage('obj', { a: 0 }));
    expect(result.current[0]).toEqual({ a: 42 });
  });

  it('persists object as JSON', () => {
    const { result } = renderHook(() => useLocalStorage('obj', {}));
    act(() => { result.current[1]({ x: 99 }); });
    expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({ x: 99 });
  });

  it('falls back to initialValue on invalid JSON', () => {
    localStorage.setItem('obj', 'not-json');
    const { result } = renderHook(() => useLocalStorage('obj', { default: true }));
    expect(result.current[0]).toEqual({ default: true });
  });
});

describe('useLocalStorage — storage errors', () => {
  it('does not throw when setItem throws (quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useLocalStorage('key', 'val'));
    expect(() => act(() => { result.current[1]('new'); })).not.toThrow();
    vi.restoreAllMocks();
  });
});
