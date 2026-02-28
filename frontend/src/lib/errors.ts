/**
 * Maps contract/network error messages to user-friendly TR/EN messages.
 */
export type Lang = 'tr' | 'en';

const MAP: { pattern: RegExp | string; tr: string; en: string }[] = [
  { pattern: /group is already settled/i, tr: 'Grup zaten kapatılmış (settle edilmiş).', en: 'Group is already settled.' },
  { pattern: /at least 2 members required/i, tr: 'En az 2 üye gerekli.', en: 'At least 2 members required.' },
  { pattern: /only the payer can cancel/i, tr: 'Sadece harcamayı ekleyen iptal edebilir.', en: 'Only the payer can cancel this expense.' },
  { pattern: /no expenses to cancel/i, tr: 'İptal edilecek harcama yok.', en: 'No expenses to cancel.' },
  { pattern: /only a member can add someone/i, tr: 'Sadece gruptaki bir üye yeni üye ekleyebilir.', en: 'Only a member can add someone.' },
  { pattern: /address is already a member/i, tr: 'Bu adres zaten grupta.', en: 'Address is already a member.' },
  { pattern: /cannot remove: at least 2 members/i, tr: 'En az 2 üye kalmalı; çıkarılamaz.', en: 'Cannot remove: at least 2 members required.' },
  { pattern: /address is not a member/i, tr: 'Bu adres grupta değil.', en: 'Address is not a member.' },
  { pattern: /amount must be positive/i, tr: 'Tutar pozitif olmalı.', en: 'Amount must be positive.' },
  { pattern: /payer is not a member/i, tr: 'Ödeyen grupta değil.', en: 'Payer is not a member of the group.' },
  { pattern: /split_among cannot be empty/i, tr: 'Bölünenler listesi boş olamaz.', en: 'Split list cannot be empty.' },
  { pattern: /split_among contains non-member/i, tr: 'Bölünenler arasında grupta olmayan var.', en: 'Split list contains a non-member.' },
  { pattern: /group name cannot be empty/i, tr: 'Grup adı boş olamaz.', en: 'Group name cannot be empty.' },
  { pattern: /duplicate member detected/i, tr: 'Aynı üye iki kez eklenemez.', en: 'Duplicate member detected.' },
  { pattern: /MismatchingParameterLen|UnexpectedSize|HostError/i, tr: 'Kontrat sürümü uyumsuz. Sayfayı yenileyip tekrar deneyin.', en: 'Contract version mismatch. Refresh and try again.' },
  { pattern: /Transaction failed on-chain|transaction failed/i, tr: 'İşlem zincirde başarısız oldu. Tekrar deneyin.', en: 'Transaction failed on-chain. Try again.' },
  { pattern: /timed out after \d+ seconds/i, tr: 'İşlem zaman aşımına uğradı. Tekrar deneyin.', en: 'Transaction timed out. Try again.' },
  { pattern: /İşlem gönderilemedi|gönderilemedi/i, tr: 'İşlem gönderilemedi. Lütfen tekrar deneyin.', en: 'Could not send transaction. Please try again.' },
  { pattern: /İmzalama reddedildi|User declined|rejected/i, tr: 'İmzalama reddedildi. Freighter\'da işlemi onaylayın.', en: 'Signature rejected. Approve the transaction in Freighter.' },
  { pattern: /wallet not found|not installed|requestAccess.*error|isConnected.*false|no wallet/i, tr: 'Cüzdan bulunamadı. Freighter yükleyin veya sayfayı yenileyip tekrar bağlanın.', en: 'Wallet not found. Install Freighter or refresh and connect again.' },
  { pattern: /insufficient balance|low balance|not enough.*balance|balance too low/i, tr: 'Yetersiz bakiye. Lütfen cüzdanınıza XLM yükleyin.', en: 'Insufficient balance. Please add XLM to your wallet.' },
  { pattern: /Ağ uyumsuzluğu|network|passphrase/i, tr: 'Ağ uyumsuz. Freighter\'ı Testnet\'e geçirin.', en: 'Network mismatch. Switch Freighter to Testnet.' },
  { pattern: /No result from simulation|Simulation failed/i, tr: 'Kontrat simülasyonu başarısız. Tekrar deneyin.', en: 'Contract simulation failed. Try again.' },
  { pattern: /group not found/i, tr: 'Grup bulunamadı.', en: 'Group not found.' },
  { pattern: /expense not found/i, tr: 'Harcama bulunamadı.', en: 'Expense not found.' },
  { pattern: /Failed to fetch|NetworkError|Load failed|Network request failed/i, tr: 'Çevrimdışı veya sunucu yanıt vermiyor. İşleminiz bağlantı gelince tekrar denenecek.', en: 'Offline or server not responding. Your action will retry when connected.' },
  { pattern: /invalid address|bad address|invalid public key|StrKey|invalid.*stellar/i, tr: 'Geçersiz adres. Geçerli bir Stellar adresi girin.', en: 'Invalid address. Enter a valid Stellar address.' },
  { pattern: /USDC is not configured|VITE_USDC_CONTRACT_ID/i, tr: 'USDC kullanmak için .env dosyasında VITE_USDC_CONTRACT_ID tanımlayın (testnet USDC contract id).', en: 'Set VITE_USDC_CONTRACT_ID in .env to use USDC (testnet USDC contract id).' },
];

/**
 * Returns a user-friendly error message in the given language.
 * If no mapping matches, returns the original message (e.g. already translated).
 */
export function translateError(message: string, lang: Lang): string {
  if (!message || typeof message !== 'string') return lang === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.';
  const s = message.trim();
  for (const { pattern, tr, en } of MAP) {
    const ok = typeof pattern === 'string' ? s.includes(pattern) : pattern.test(s);
    if (ok) return lang === 'tr' ? tr : en;
  }
  return s;
}
