import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CreditCard, Wifi } from 'lucide-react';
import { truncateAddress } from '../../lib/stellar';
import { sounds } from '../../lib/sound';
import { useI18n } from '../../lib/i18n';

interface VirtualCardProps {
  walletAddress: string;
}

export function VirtualCard({ walletAddress }: VirtualCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Animate the rotation values
  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  // Adjust glare position based on pointer
  const glareX = useTransform(x, [-100, 100], [0, 100]);
  const glareY = useTransform(y, [-100, 100], [0, 100]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseEnter = () => {
    sounds.playSwoosh();
  };

  const handleMouseLeave = () => {
    // Smooth return to center
    x.set(0);
    y.set(0);
  };

  return (
    <div className="w-full flex flex-col items-center mb-10 perspective-1000">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: useSpring(rotateX, { stiffness: 400, damping: 30 }),
          rotateY: useSpring(rotateY, { stiffness: 400, damping: 30 }),
          transformStyle: "preserve-3d",
        }}
        className="relative w-full max-w-sm h-56 rounded-3xl p-6 cursor-pointer drop-shadow-2xl group"
      >
        {/* Glow behind card */}
        <div className="absolute -inset-1 blur-2xl opacity-40 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl group-hover:opacity-75 transition-opacity" />

        {/* Physical Card Body */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-black/80 to-secondary/80 backdrop-blur-2xl border border-white/10 overflow-hidden">
          
          {/* Holographic Glare Overlay */}
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.4) 0%, transparent 60%)',
              left: useTransform(glareX, (x) => `${x}%`),
              top: useTransform(glareY, (y) => `${y}%`),
              transform: 'translate(-50%, -50%)',
              width: '200%',
              height: '200%'
            }}
          />

          {/* Card Details */}
          <div className="relative h-full flex flex-col justify-between p-6 z-10" style={{ transform: 'translateZ(30px)' }}>
            <div className="flex justify-between items-start">
              <div className="text-xl font-bold tracking-widest text-indigo-100 flex items-center gap-2">
                StellarSplit <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-[10px] text-indigo-400">BLACK</span>
              </div>
              <Wifi size={24} className="text-white/40 rotate-90" />
            </div>

            <div className="space-y-4">
              <div className="font-mono text-2xl tracking-widest">
                •••• •••• •••• 1928
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">{t('card.wallet_address')}</span>
                  <span className="font-bold text-sm tracking-wide">{truncateAddress(walletAddress)}</span>
                </div>
                <div className="h-10 w-16 bg-gradient-to-r from-gray-400 to-white/60 rounded-md relative overflow-hidden">
                  <div className="absolute inset-0 border border-white/20 rounded-md" />
                  <div className="absolute inset-y-0 left-2 right-2 border-x border-black/10" />
                  <div className="absolute inset-x-0 top-3 bottom-3 border-y border-black/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Wallet Actions Action */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-6 flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full font-bold text-sm hover:bg-white/10 hover:border-indigo-500/50 hover:text-indigo-400 transition-all shadow-lg backdrop-blur-xl"
      >
        <CreditCard size={18} /> {t('card.add_to_wallet')}
      </motion.button>
    </div>
  );
}
