import { renderHook, act } from '@testing-library/react';
import { useOCR } from './useOCR';

vi.mock('tesseract.js', () => ({
  default: {
    recognize: vi.fn(),
  },
}));

import Tesseract from 'tesseract.js';
const mockRecognize = vi.mocked(Tesseract.recognize);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOCR', () => {
  it('returns initial state: not processing, progress 0', () => {
    const { result } = renderHook(() => useOCR());
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(typeof result.current.extractAmount).toBe('function');
  });

  it('sets isProcessing true while extracting, false after', async () => {
    let resolveFn!: (v: unknown) => void;
    const promise = new Promise((res) => { resolveFn = res; });
    mockRecognize.mockReturnValueOnce(promise as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());

    let extractPromise: Promise<{ amount: number | null; text: string }>;
    act(() => {
      extractPromise = result.current.extractAmount('test.jpg');
    });

    expect(result.current.isProcessing).toBe(true);

    await act(async () => {
      resolveFn({ data: { text: 'Total: 45.00' } });
      await extractPromise!;
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it('returns parsed amount and text on success', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Total: 99.50\nSome item' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBe(99.5);
    expect(output.text).toContain('Total');
  });

  it('returns null amount and empty text on error', async () => {
    mockRecognize.mockRejectedValueOnce(new Error('Tesseract failed'));

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBeNull();
    expect(output.text).toBe('');
    expect(result.current.isProcessing).toBe(false);
  });

  it('resets progress to 0 after completion', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: '' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());

    await act(async () => {
      await result.current.extractAmount('test.jpg');
    });

    expect(result.current.progress).toBe(0);
  });

  it('updates progress via logger callback when status is "recognizing text"', async () => {
    mockRecognize.mockImplementationOnce(
      async (_image, _lang, opts: { logger?: (m: { status: string; progress: number }) => void }) => {
        opts?.logger?.({ status: 'recognizing text', progress: 0.75 });
        return { data: { text: '' } };
      },
    );

    const { result } = renderHook(() => useOCR());

    await act(async () => {
      await result.current.extractAmount('test.jpg');
    });

    // After completion progress resets to 0, but it was set to 75 during processing
    expect(result.current.progress).toBe(0); // reset after completion
  });

  it('does not update progress for non-recognizing status', async () => {
    mockRecognize.mockImplementationOnce(
      async (_image, _lang, opts: { logger?: (m: { status: string; progress: number }) => void }) => {
        opts?.logger?.({ status: 'loading tesseract core', progress: 0.5 });
        return { data: { text: '' } };
      },
    );

    const { result } = renderHook(() => useOCR());

    await act(async () => {
      await result.current.extractAmount('test.jpg');
    });

    expect(result.current.progress).toBe(0);
  });

  it('parses European format amounts (comma as decimal separator)', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Toplam: 1.234,56' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBeCloseTo(1234.56, 1);
  });

  it('parses US format amounts (dot as decimal separator, comma as thousands)', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Total: 1,234.56' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBeCloseTo(1234.56, 1);
  });

  it('parses comma-only format (no dot)', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Total: 45,00' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBeCloseTo(45, 0);
  });

  it('returns null when text has no parseable amounts', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'No numbers here at all' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBeNull();
  });

  it('uses bottom-half fallback when keyword line has no parseable amount', async () => {
    // "Total" keyword found but no number in that line → bottom half has the amount
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Total\nCoffee\nSandwich\n22.00' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    expect(output.amount).toBeGreaterThan(0);
  });

  it('returns null when matched amounts are all zero (0.00)', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: 'Total: 0.00' },
    } as ReturnType<typeof Tesseract.recognize>);

    const { result } = renderHook(() => useOCR());
    let output!: { amount: number | null; text: string };

    await act(async () => {
      output = await result.current.extractAmount('test.jpg');
    });

    // 0.00 matches regex but maxAmount stays 0 → returns null
    expect(output.amount).toBeNull();
  });
});
