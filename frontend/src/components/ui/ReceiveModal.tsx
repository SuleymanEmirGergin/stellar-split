import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { maskAddress } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { MOTION_DURATION_MODAL } from '@/lib/motion';
interface ReceiveModalProps {
  address: string;
  onClose: () => void;
}

export function ReceiveModal({ address, onClose }: ReceiveModalProps) {
  const { addToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      addToast('Copied', 'success');
    } catch {
      const el = document.createElement('textarea');
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      addToast('Copied', 'success');
    }
  };

  const handleShare = async () => {
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'My Stellar address',
        text: address,
      });
      addToast('Shared', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') addToast('Share failed', 'error');
    }
  };

  const canShare = typeof navigator.share === 'function';

  const duration = MOTION_DURATION_MODAL / 1000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration * 0.6 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
        className="bg-card border border-border rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground">Receive</h3>
        <p className="text-xs text-muted-foreground">Scan or share your wallet address</p>
        <div className="p-4 bg-white rounded-2xl">
          <QRCodeSVG
            value={address}
            size={200}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            level="H"
            includeMargin={false}
          />
        </div>
        <code className="font-mono text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          {maskAddress(address, 4, 4)}
        </code>
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Copy address
          </button>
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted/50 transition-colors"
            >
              Share
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
