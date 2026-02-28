import { useCallback } from 'react';

/**
 * Copy text to clipboard. Returns a function that copies and resolves to true on success.
 * Use with toast: copy(text).then(ok => { if (ok) addToast('Copied'); });
 */
export function useCopyToClipboard(): (text: string) => Promise<boolean> {
  return useCallback(async (text: string): Promise<boolean> => {
    if (!text || typeof text !== 'string') return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }, []);
}
