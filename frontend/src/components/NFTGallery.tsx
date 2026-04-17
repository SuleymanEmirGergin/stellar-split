import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  ShieldCheck, 
  ExternalLink, 
  Fingerprint, 
  Cpu, 
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type SBTMetadata } from '../lib/sbt';

interface Props {
  sbts: SBTMetadata[];
  onClose?: () => void;
}

export function NFTGallery({ sbts }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => setActiveIndex((i) => (i + 1) % sbts.length);
  const prev = () => setActiveIndex((i) => (i - 1 + sbts.length) % sbts.length);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            Soulbound Vault
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full uppercase tracking-widest font-black border border-indigo-500/20">Non-Transferable</span>
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Your immutable on-chain achievements on the Stellar network.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={prev}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={next}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[500px]">
        {/* 3D Card Area */}
        <div className="lg:col-span-7 flex justify-center perspective-1000">
          <div className="relative w-full max-w-[340px] aspect-[1/1.4]">
            {sbts.map((sbt, idx) => (
              <NFTCard 
                key={sbt.tokenId} 
                sbt={sbt} 
                isActive={idx === activeIndex} 
                offset={idx - activeIndex}
              />
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-6">
            <motion.div
              key={sbts[activeIndex]?.tokenId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 tracking-widest">Permanent Artifact</span>
                <span className="text-[10px] font-bold text-muted-foreground">ID: {sbts[activeIndex]?.tokenId}</span>
              </div>
              <h3 className="text-4xl font-black tracking-tight leading-tight uppercase underline decoration-indigo-500/30 decoration-4 underline-offset-8">
                {sbts[activeIndex]?.name}
              </h3>
              <p className="text-lg text-muted-foreground font-medium italic">
                "{sbts[activeIndex]?.description}"
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              {sbts[activeIndex]?.attributes.map((attr, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{attr.trait_type}</div>
                  <div className="text-sm font-black text-white">{attr.value}</div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-card/60 border border-white/5 rounded-3xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-3">
                <span className="flex items-center gap-2"><Cpu size={12} /> Mint Records</span>
                <button className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  Explorer <ExternalLink size={10} />
                </button>
              </div>
              <div className="space-y-3 font-mono text-[10px] text-white/60">
                <div className="flex justify-between">
                  <span>Network</span>
                  <span className="text-white font-bold">Soroban Public</span>
                </div>
                <div className="flex justify-between">
                  <span>TX Hash</span>
                  <span className="text-indigo-400 font-bold truncate ml-4">{sbts[activeIndex]?.transactionHash?.substring(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="text-white font-bold">{new Date(sbts[activeIndex]?.mintedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NFTCard({ sbt, isActive, offset }: { sbt: SBTMetadata; isActive: boolean; offset: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isActive ? 1 : 0.85 - Math.abs(offset) * 0.1,
        x: offset * 80,
        opacity: isActive ? 1 : 0.4 - Math.abs(offset) * 0.1,
        rotateY: isActive ? 0 : offset * -20,
        zIndex: isActive ? 50 : 50 - Math.abs(offset),
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isActive ? rotateX : 0,
        rotateY: isActive ? rotateY : (offset * -20),
        transformStyle: 'preserve-3d',
      }}
      className="absolute inset-0 cursor-pointer"
    >
      <div className="relative w-full h-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/20 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl group overflow-hidden">
        {/* Holographic Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        <div className="relative h-full flex flex-col justify-between items-center text-center py-10" style={{ transform: 'translateZ(100px)' }}>
          <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-8xl shadow-[0_0_50px_rgba(99,102,241,0.3)] group-hover:scale-110 transition-transform duration-500">
            {sbt.image}
          </div>
          
          <div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Stellar Soulbound Token</div>
            <h4 className="text-2xl font-black text-white tracking-widest uppercase truncate w-64">{sbt.name.replace('StellarSplit SBT: ', '')}</h4>
          </div>

          <div className="w-full flex items-center justify-between px-2 pt-8 border-t border-white/10">
            <ShieldCheck className="text-emerald-400" size={20} />
            <div className="flex gap-1">
              <Fingerprint className="text-white/20" size={16} />
              <Database className="text-white/20" size={16} />
            </div>
          </div>
        </div>

        {/* Security Corner Decor */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl-lg" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br-lg" />
      </div>
    </motion.div>
  );
}
