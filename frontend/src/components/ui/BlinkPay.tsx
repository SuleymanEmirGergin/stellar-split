import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ScanLine, CheckCircle2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '../../lib/i18n';

interface BlinkPayProps {
  amount: number;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BlinkPay({ amount, currency, onClose, onSuccess }: BlinkPayProps) {
  const [step, setStep] = useState<'searching' | 'found' | 'paying' | 'success'>('searching');
  const { t } = useI18n();

  useEffect(() => {
    if (step === 'searching') {
      const timer = setTimeout(() => setStep('found'), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
    >
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/20 transition-all active:scale-90"
      >
        <X size={24} />
      </button>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 2, 3],
            opacity: [0.5, 0.2, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-500 rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 2.5, 4],
            opacity: [0.3, 0.1, 0]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.5
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-400 rounded-full"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        
        <AnimatePresence mode="wait">
          {step === 'searching' && (
            <motion.div
              key="searching"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-32 h-32 bg-indigo-500/20 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 border-2 border-indigo-500 rounded-full animate-ping opacity-30" />
                <Network size={48} className="text-indigo-400 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tighter">Blink</h2>
              <p className="text-muted-foreground font-medium">{t('blink.searching')}</p>
              <p className="text-sm font-bold text-white mt-6 bg-white/5 py-2 px-6 rounded-full border border-white/10">
                {t('blink.to_pay')}: {amount} {currency}
              </p>
            </motion.div>
          )}

          {step === 'found' && (
            <motion.div
              key="found"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center w-full"
            >
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl mb-8 transform transition-transform hover:scale-105">
                <QRCodeSVG 
                  value={`stellarsplit://pay?amount=${amount}&currency=${currency}`}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tighter">{t('blink.ready')}</h2>
              <p className="text-muted-foreground font-medium mb-8 text-center">
                {t('blink.waiting_scan')}
              </p>
              
              <button
                onClick={() => setStep('paying')}
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
              >
                <ScanLine size={24} />
                {t('blink.pay_btn')}
              </button>
            </motion.div>
          )}

          {step === 'paying' && (
            <motion.div
              key="paying"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 bg-indigo-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(79,70,229,0.6)] animate-pulse">
                <Network size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-black mb-2 animate-pulse">{t('blink.confirming')}</h2>
              <p className="text-indigo-400 font-mono">{t('blink.transferring')}</p>
              
              {/* Auto proceed after mock delay */}
              {setTimeout(() => {
                setStep('success');
                setTimeout(() => {
                  onSuccess();
                  onClose();
                }, 1500);
              }, 2000) && null}
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-40 h-40 bg-emerald-500 rounded-[3rem] flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(16,185,129,0.6)] rotate-12">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <CheckCircle2 size={72} className="text-white" />
                </motion.div>
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tighter text-emerald-400">{t('blink.success')}</h2>
              <p className="text-muted-foreground text-lg">{t('blink.instant_payment')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
