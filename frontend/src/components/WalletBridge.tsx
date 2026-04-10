import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Wifi, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface WalletBridgeProps {
  uri: string;
  onClose: () => void;
}

export const WalletBridge: React.FC<WalletBridgeProps> = ({ uri, onClose }) => {
  const [status, setStatus] = useState<'pending' | 'connecting' | 'success'>('pending');

  useEffect(() => {
    // Simulate connection flow
    const timer1 = setTimeout(() => setStatus('connecting'), 2000);
    const timer2 = setTimeout(() => setStatus('success'), 5000);
    const timer3 = setTimeout(() => onClose(), 7000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-sm w-full bg-card border border-white/10 p-8 rounded-3xl shadow-2xl text-center overflow-hidden"
      >
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          {status === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="relative mx-auto w-48 h-48 bg-white p-4 rounded-3xl shadow-inner">
                <QRCodeSVG value={uri} size={160} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white">
                    <Sparkles size={16} className="text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Blink Pay Bridge</h3>
                <p className="text-sm text-muted-foreground">Scan with your mobile wallet or hold your device near for "Blink" NFC settlement.</p>
              </div>
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <Phone size={20} className="text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-50">Local</span>
                </div>
                <div className="w-8 h-px bg-white/5" />
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center animate-pulse">
                    <Wifi size={20} className="text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-50">Syncing</span>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-12 space-y-6"
            >
              <div className="relative mx-auto w-24 h-24">
                <Loader2 size={96} className="text-indigo-500 animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Phone size={40} className="text-indigo-400 animate-bounce" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Handshaking...</h3>
                <p className="text-sm text-muted-foreground italic">Establishing encrypted P2P tunnel via Stellar Peer Node.</p>
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 space-y-6"
            >
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={56} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-400">Linked!</h3>
                <p className="text-sm text-muted-foreground">Transaction broadcasted successfully to Stellar network.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
