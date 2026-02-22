import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const extractAmount = useCallback(async (image: File | string): Promise<{ amount: number | null; text: string }> => {
    setIsProcessing(true);
    setProgress(0);
    try {
      const { data: { text } } = await Tesseract.recognize(
        image,
        'eng+tur',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const parsedAmount = parseAmountFromText(text);
      return { amount: parsedAmount, text };
    } catch (err) {
      console.error("OCR Error:", err);
      return { amount: null, text: '' };
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  return { extractAmount, isProcessing, progress };
}

function parseAmountFromText(text: string): number | null {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const totalKeywords = ['total', 'toplam', 'amount due', 'ödenecek', 'tutar', 'sum'];
  
  // 1. Arama Önceliği: "Total" / "Toplam" anahtar kelimesi geçen satırlar
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (totalKeywords.some(k => lowerLine.includes(k))) {
      const amount = extractLargestAmount(line);
      if (amount) return amount;
    }
  }

  // 2. Arama: Fişin alt yarısında yer alan en yüksek tutar
  const bottomHalfText = lines.slice(Math.floor(lines.length / 2)).join('\n');
  const amountBottom = extractLargestAmount(bottomHalfText);
  if (amountBottom) return amountBottom;
  
  // 3. Arama: Tüm metindeki en yüksek tutar
  return extractLargestAmount(text);
}

function extractLargestAmount(text: string): number | null {
  // Regex: 1.234,56 | 1,234.56 | 1234.56 | 1234,56 | 50.00
  // Mümkün olduğunca tarihleri dışlamak için \b ve sınırlandırmalar
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
    // Genelde fişlerde 10.000, 100.000 gibi anormal tarihler çıkabilir ama biz basitçe en büyük değeri alıyoruz
    if (!isNaN(val) && val > maxAmount) {
      maxAmount = val;
    }
  }
  return maxAmount > 0 ? maxAmount : null;
}
