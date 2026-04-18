import { motion } from 'framer-motion';
import { Image } from 'lucide-react';
import { type Expense } from '../../lib/contract';
import { formatStroopsWithUsd } from '../../lib/xlmPrice';
import EmptyState from '../EmptyState';
import type { TranslationKey } from '../../lib/i18n';

interface GalleryTabProps {
  expenses: Expense[];
  currencyLabel: string;
  xlmUsd: number | null;
  t: (key: TranslationKey) => string;
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

export default function GalleryTab({
  expenses,
  currencyLabel,
  xlmUsd,
  t
}: GalleryTabProps) {
  const images = expenses.filter(e => e.attachment_url);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Image className="text-indigo-400" size={20} /> {t('group.gallery_title')}
        </h3>
      </div>

      {images.length === 0 ? (
        <EmptyState
          icon={Image}
          title={t('group.gallery_empty')}
          description={t('group.gallery_empty_hint')}
          tone="indigo"
          variant="float"
        />
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
                <div className="text-[10px] font-bold text-indigo-300 mt-1 tabular-nums">
                  {currencyLabel === 'XLM'
                    ? formatStroopsWithUsd(exp.amount, xlmUsd)
                    : `${(exp.amount / 10_000_000).toFixed(2)} ${currencyLabel}`}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
