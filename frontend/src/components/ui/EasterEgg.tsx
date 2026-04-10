import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export const EasterEgg: React.FC = () => {
  const [active, setActive] = useState(false);
  const [konami, setKonami] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const next = [...konami, e.key];
      if (next.every((key, i) => key === code[i])) {
        if (next.length === code.length) {
          setActive(true);
          setKonami([]);
        } else {
          setKonami(next);
        }
      } else {
        setKonami(e.key === code[0] ? [e.key] : []);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konami]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-md"
          onClick={() => setActive(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="max-w-2xl w-full bg-[#0a0a0a] border border-green-500/30 p-6 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.2)] font-mono text-green-500"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-green-500/20 pb-4">
              <Terminal className="animate-pulse" />
              <span className="font-bold tracking-widest uppercase">Emergency Matrix Override</span>
              <div className="ml-auto flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm opacity-80 leading-relaxed">
                &gt; SYTEM STATUS: <span className="text-white">OPTIMIZED</span><br />
                &gt; NETWORK: <span className="text-white">STELLAR MAINNET READY</span><br />
                &gt; PROTOCOL: <span className="text-white">SOROBAN V21</span><br />
                &gt; SECURITY: <span className="text-white">GHOST MODE ACTIVE</span>
              </p>

              <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/10">
                <p className="text-xs italic mb-2">"True decentralization is the only way forward."</p>
                <p className="text-[10px] uppercase font-black opacity-50 tracking-tighter">
                  Encrypted keys found: [REDACTED] | User reputation: GOAT
                </p>
              </div>

              <div className="pt-4 flex justify-between items-end">
                <div className="text-[9px] opacity-40">
                  © 2026 STELLARSPLIT CORP // L00P_H0L3
                </div>
                <button
                  className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all text-xs font-bold uppercase tracking-widest"
                  onClick={() => setActive(false)}
                >
                  Close Terminal
                </button>
              </div>
            </div>
          </motion.div>

          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -500 }}
                animate={{ y: 1000 }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 10
                }}
                className="absolute text-[10px] font-mono leading-none whitespace-pre"
                style={{ left: `${i * 5}%` }}
              >
                {Array.from({ length: 50 }).map(() => String.fromCharCode(Math.floor(Math.random() * 33) + 33)).join('\n')}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
