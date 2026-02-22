import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useI18n } from '../lib/i18n';

interface Props {
  onScan: (groupId: number) => void;
  onClose: () => void;
}

/**
 * Scanner — A built-in QR code scanner component using the device camera.
 */
export default function Scanner({ onScan, onClose }: Props) {
  const { t } = useI18n();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
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
        // silent fail for most frames
      }
    );

    return () => {
      scannerRef.current?.clear();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[400] p-6">
      <div className="bg-card border border-border rounded-xl w-full max-w-[480px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            📸 QR Tarayıcı
          </h3>
          <button 
            onClick={onClose}
            className="p-1 px-3 bg-muted hover:bg-muted/80 rounded-md text-xs font-bold transition-all"
          >
            {t('common.cancel')}
          </button>
        </div>
        
        <div className="p-6">
          <div id="qr-reader" className="overflow-hidden rounded-lg border border-border bg-black" />
          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            Gruba katılmak için davet QR kodunu kameranıza yaklaştırın.
          </p>
        </div>
      </div>
    </div>
  );
}
