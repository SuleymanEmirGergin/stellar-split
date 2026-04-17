import * as React from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MoneyGramFlowProps {
  url: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MoneyGramFlow: React.FC<MoneyGramFlowProps> = ({ url, onClose, onSuccess }) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl shadow-blue-500/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white leading-tight">Secure Cash Pickup</h3>
                <p className="text-xs text-slate-400">Powered by MoneyGram Access</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Iframe for Interactive Flow */}
          <div className="flex-1 bg-white relative">
            <iframe 
              src={url}
              className="w-full h-full border-none"
              title="MoneyGram Transaction"
            />
          </div>

          {/* Footer Information */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Your data is handled securely by MoneyGram.</span>
            </div>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open in new tab <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
