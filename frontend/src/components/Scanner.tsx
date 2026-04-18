import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanLine, X, Camera, Image as ImageIcon } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface Props {
  onScan: (groupId: number) => void;
  onClose: () => void;
}

/**
 * Scanner — Birik-branded QR code scanner over html5-qrcode.
 *
 * The html5-qrcode lib renders its own UI (permission request button, file
 * picker, camera select) inside `#qr-reader`. We can't restyle it cleanly via
 * props, so we:
 *   1. Wrap the lib container in a Birik-styled modal frame.
 *   2. Use :global CSS overrides (see src/index.css) to theme the lib's
 *      buttons + selects to match the dark/indigo palette.
 *   3. Overlay animated corner brackets + scanning line on top of the video
 *      once the camera starts, to guide the user visually.
 */
export default function Scanner({ onScan, onClose }: Props) {
  const { t } = useI18n();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let mounted = true;

    // Dynamic import: html5-qrcode (camera API + worker) is only loaded when
    // the Scanner modal is actually opened.
    import('html5-qrcode').then(({ Html5QrcodeScanner: ScannerCtor }) => {
      if (!mounted) return;

      scannerRef.current = new ScannerCtor(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false,
      );

      scannerRef.current.render(
        (decodedText) => {
          // Look for pattern: stellarsplit:join:<id>
          if (decodedText.startsWith('stellarsplit:join:')) {
            const groupId = parseInt(decodedText.split(':')[2]);
            if (!isNaN(groupId)) {
              scannerRef.current?.clear();
              onScan(groupId);
            }
          }
        },
        () => {
          // silent fail for most frames (error callback)
        },
      );
    });

    return () => {
      mounted = false;
      scannerRef.current?.clear().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[400] p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label="QR Scanner"
        className="bg-card border border-white/[0.08] rounded-[28px] w-full max-w-[480px] overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-white/[0.06] bg-gradient-to-br from-indigo-500/8 via-transparent to-purple-500/6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                <ScanLine size={17} className="text-indigo-300" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">QR Tarayıcı</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Scan to join</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.cancel')}
              className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scan area */}
        <div className="p-5 bg-ink/30">
          <div className="relative">
            {/* html5-qrcode mounts into this div. Styled via global overrides. */}
            <div
              id="qr-reader"
              className="birik-qr-reader relative rounded-[20px] overflow-hidden border border-white/[0.08] bg-black min-h-[240px]"
            />

            {/* Decorative corner brackets — visual guide for the scan area */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="relative w-[250px] h-[250px] max-w-[70%] max-h-[70%]">
                {/* TL */}
                <span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-2 border-l-2 border-indigo-400/70 rounded-tl-lg" />
                {/* TR */}
                <span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-2 border-r-2 border-indigo-400/70 rounded-tr-lg" />
                {/* BL */}
                <span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-2 border-l-2 border-indigo-400/70 rounded-bl-lg" />
                {/* BR */}
                <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-2 border-r-2 border-indigo-400/70 rounded-br-lg" />
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div className="mt-4 flex items-start gap-3 px-2">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mt-0.5">
              <Camera size={13} className="text-indigo-400" />
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Gruba katılmak için davet <span className="text-indigo-300 font-bold">QR kodunu</span> kameranıza yaklaştırın.
              Kamera açılmazsa{' '}
              <ImageIcon size={10} className="inline-block align-text-bottom mx-0.5 text-indigo-400" />
              <span className="text-foreground/80 font-semibold">Scan an Image File</span> ile
              galeriden de yükleyebilirsin.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
