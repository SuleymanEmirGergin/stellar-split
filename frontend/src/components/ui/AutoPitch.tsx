import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, MousePointer2, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sounds } from '../../lib/sound';

const steps = [
  { target: '/', text: 'Welcome to StellarSplit. The future of social finance.', duration: 3000 },
  { target: '/dashboard', text: 'Manage all your groups and expenses in one sleek dashboard.', duration: 4000 },
  { target: '/reputation', text: 'Build your on-chain splitting reputation and unlock perks.', duration: 4000 },
  { target: '/dashboard', text: 'Ready to split? Let our AI handle the math on-chain.', duration: 3000 },
];

export const AutoPitch: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const startPitch = () => {
    setIsPlaying(true);
    setStep(0);
    navigate('/');
    sounds.playSwoosh();
  };

  const stopPitch = () => {
    setIsPlaying(false);
    setStep(0);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const currentStep = steps[step];
    if (!currentStep) {
      stopPitch();
      return;
    }

    const timer = setTimeout(() => {
      if (step < steps.length - 1) {
        const nextStep = steps[step + 1];
        navigate(nextStep.target);
        setStep(step + 1);
        sounds.playSwoosh();
      } else {
        stopPitch();
      }
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [step, isPlaying, navigate]);

  return (
    <>
      <button
        onClick={startPitch}
        className="fixed bottom-6 left-6 z-[100] flex items-center gap-2 px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 group"
      >
        <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
        {isPlaying ? 'Tour Active...' : 'PITCH'}
      </button>

      <AnimatePresence>
        {isPlaying && (
          <>
            {/* Fake Cursor */}
            <motion.div
              initial={{ x: '50vw', y: '50vh' }}
              animate={{
                x: step % 2 === 0 ? '20vw' : '80vw',
                y: step % 2 === 0 ? '30vh' : '70vh'
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="fixed inset-0 z-[1000] pointer-events-none"
            >
              <MousePointer2 className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" fill="currentColor" size={24} />
            </motion.div>

            {/* Narration Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1001] px-8 py-4 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center max-w-lg w-[90%]"
            >
              <button
                onClick={stopPitch}
                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Play size={16} className="text-indigo-500 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Live Presentation</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{steps[step].text}</p>
              
              <div className="mt-4 flex gap-1 justify-center">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${i === step ? 'w-8 bg-indigo-500' : 'w-2 bg-indigo-500/20'}`}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
