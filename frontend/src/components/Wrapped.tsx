import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Users, Wallet, Trophy, Share2 } from 'lucide-react';
import { calculateReputationScore } from '../lib/reputation';

interface Props {
  walletAddress: string;
  onClose: () => void;
  isDemo?: boolean;
}

export function Wrapped({ walletAddress, onClose, isDemo }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const groups = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('stellarsplit_groups') || '[]');
    } catch {
      return [];
    }
  }, []);

  const reputation = useMemo(() => calculateReputationScore(walletAddress, groups, isDemo), [walletAddress, groups, isDemo]);

  // Derived / Mocked Insights for the story
  const insights = useMemo(() => {
    const totalSpent = groups.length * (isDemo ? 1420 : 120);
    const topGroup = groups[0]?.name || 'Hackathon Squad';
    const favoriteToken = 'USDC';

    return {
      totalSpent,
      topGroup,
      favoriteToken,
      tier: reputation.tier,
      score: reputation.score
    };
  }, [groups, reputation, isDemo]);

  const slides = [
    {
      id: 'intro',
      color: 'from-fuchsia-600 to-purple-800',
      icon: <Zap size={48} className="text-purple-300" />,
      title: 'Your Year on Stellar',
      subtitle: 'Fast. Feelless. Flawless.',
      content: `Let's take a look back at your journey splitting bills on the network.`,
    },
    {
      id: 'volume',
      color: 'from-blue-600 to-indigo-800',
      icon: <Wallet size={48} className="text-blue-300" />,
      title: 'Big Spender',
      subtitle: 'Total settled this year',
      content: `$${insights.totalSpent.toLocaleString()} ${insights.favoriteToken}`,
      bigText: true,
    },
    {
      id: 'social',
      color: 'from-emerald-600 to-teal-800',
      icon: <Users size={48} className="text-emerald-300" />,
      title: 'Social Butterfly',
      subtitle: 'You split bills in several groups',
      content: `Your favorite crew was ${insights.topGroup}. You settled ${isDemo ? 42 : 5} expenses with them!`,
    },
    {
      id: 'reputation',
      color: 'from-amber-500 to-orange-700',
      icon: <Trophy size={48} className="text-amber-200" />,
      title: 'On-Chain Rep',
      subtitle: `Your identity score is ${insights.score}/1000`,
      content: `You achieved the prestige tier of ${insights.tier}. Wear it with pride!`,
    },
  ];

  // Auto-advance slides
  useEffect(() => {
    if (currentSlide < slides.length - 1) {
      const timer = setTimeout(() => setCurrentSlide(s => s + 1), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, slides.length]);

  const handleShare = () => {
    const text = `I just settled ${insights.totalSpent} ${insights.favoriteToken} with my friends on StellarSplit and unlocked ${insights.tier} status on Soroban! 🔥💳 Calculate your on-chain splitting reputation at [Demo URL] 💸 @StellarOrg`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 font-sans">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all z-20"
      >
        <X size={20} />
      </button>

      <div className="relative w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-4 left-0 right-0 px-4 flex gap-1.5 z-20">
          {slides.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              {i === currentSlide ? (
                <motion.div 
                  className="h-full bg-white"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              ) : (
                <div className={`h-full ${i < currentSlide ? 'bg-white' : 'bg-transparent'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].color} p-8 flex flex-col justify-center items-center text-center`}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                {slides[currentSlide].icon}
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black text-white mb-2 leading-tight"
              >
                {slides[currentSlide].title}
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 font-bold uppercase tracking-widest text-xs mb-8"
              >
                {slides[currentSlide].subtitle}
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={slides[currentSlide].bigText ? "text-5xl font-black text-white" : "text-lg text-white/90 font-medium"}
              >
                {slides[currentSlide].content}
              </motion.div>

              {currentSlide === slides.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  onClick={handleShare}
                  className="mt-12 flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl text-white font-bold transition-all"
                >
                  <Share2 size={18} /> Share on X
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tap areas for navigation */}
        <div 
          className="absolute inset-y-0 left-0 w-1/3 z-10" 
          onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
        />
        <div 
          className="absolute inset-y-0 right-0 w-2/3 z-10" 
          onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))}
        />
      </div>
    </div>
  );
}
