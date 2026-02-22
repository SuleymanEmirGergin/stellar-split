import { motion } from 'framer-motion';
import { Image } from 'lucide-react';
import { type Expense } from '../../lib/contract';
import { formatStroopsWithUsd } from '../../lib/xlmPrice';

interface GalleryTabProps {
  expenses: Expense[];
  currencyLabel: string;
  xlmUsd: number | null;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

export default function GalleryTab({
  expenses,
  currencyLabel,
  xlmUsd
}: GalleryTabProps) {
  const images = expenses.filter(e => e.attachment_url);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Image className="text-indigo-400" size={20} /> Fiş/Makbuz Galerisi
        </h3>
      </div>
      
      {images.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="py-20 text-center bg-secondary/20 rounded-[32px] border border-dashed border-white/5 overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image className="w-16 h-16 mx-auto text-indigo-500/20 mb-6 drop-shadow-2xl" />
          </motion.div>
          <p className="text-lg font-black text-white/90 tracking-tight">Görsel Bulunamadı</p>
          <p className="text-sm font-bold text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed">Bu gruba henüz hiç fiş veya makbuz yüklenmemiş.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.reverse().map((exp) => (
            <motion.div 
              key={exp.id} 
              variants={itemVars} 
              initial="hidden" 
              animate="visible"
              className="aspect-square relative rounded-[24px] overflow-hidden group cursor-pointer border border-white/5"
              onClick={() => window.open(exp.attachment_url, '_blank')}
            >
              <img 
                src={exp.attachment_url!} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                alt={exp.description}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <div className="text-xs font-black text-white truncate">{exp.description}</div>
                <div className="text-[10px] font-bold text-indigo-300 mt-1 tabular-nums">{currencyLabel === 'XLM' ? formatStroopsWithUsd(exp.amount, xlmUsd) : `${(exp.amount / 10_000_000).toFixed(2)} ${currencyLabel}`}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
