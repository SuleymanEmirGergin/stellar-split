import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BurnAnimationProps {
  isBurning: boolean;
  onBurnComplete: () => void;
  children: React.ReactNode;
}

export function BurnAnimation({ isBurning, onBurnComplete, children }: BurnAnimationProps) {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (isBurning) {
      setParticles(Array.from({ length: 20 }, (_, i) => i));
      const timer = setTimeout(() => {
        onBurnComplete();
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [isBurning, onBurnComplete]);

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {!isBurning && (
          <motion.div
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)', translateY: 20 }}
            transition={{ duration: 0.8, ease: "anticipate" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {isBurning && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-visible">
          {particles.map((i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 1, 
                scale: Math.random() * 1.5 + 0.5,
                x: 0,
                y: 0
              }}
              animate={{ 
                opacity: 0, 
                scale: 0,
                x: (Math.random() - 0.5) * 200,
                y: -100 - Math.random() * 100,
                rotate: Math.random() * 360
              }}
              transition={{ 
                duration: 1 + Math.random(), 
                ease: "easeOut",
                delay: Math.random() * 0.2
              }}
              className="absolute text-orange-500"
            >
              <Flame size={16 + Math.random() * 24} />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 3] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute font-black text-2xl tracking-widest text-orange-400 bg-orange-500/20 px-4 py-1 rounded w-full text-center mix-blend-screen"
          >
            BORÇ SİLİNDİ
          </motion.div>
        </div>
      )}
    </div>
  );
}
