import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAgent } from '../hooks/useAIAgent';
import { useI18n } from '../lib/i18n';

interface AIChatProps {
  groupId?: number;
}

export const AIChat: React.FC<AIChatProps> = ({ groupId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, isLoading, clearChat } = useAIAgent();
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text, groupId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const suggestions = [t('ai.suggestion_balance'), t('ai.suggestion_add_expense'), t('ai.suggestion_summarize')];

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.33, 1, 0.68, 1] }}
            className="mb-4 w-80 sm:w-96 h-[520px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <Bot size={18} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-none">Stellar Agent</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-slate-500">{t('ai.status_online')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300"
                  title={t('ai.clear_chat')}
                >
                  <Sparkles size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 pb-6">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <Bot size={28} className="text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">{t('ai.welcome_message')}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('ai.welcome_subtitle')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-xs text-left px-3 py-2 rounded-xl border border-slate-700 text-slate-400 hover:border-indigo-500/60 hover:text-indigo-300 hover:bg-indigo-500/5 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/60'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700/60 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="px-4 py-3 bg-slate-800 border-t border-slate-700/80 shrink-0"
            >
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/60 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('ai.placeholder')}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none py-1"
                />
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!input.trim() || isLoading}
                  className="p-1 text-indigo-500 hover:text-indigo-400 disabled:text-slate-700 transition-colors shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen((o) => !o)}
        className="relative bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-900/40 transition-colors"
        aria-label="AI Asistanı Aç"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isOpen ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
          </motion.div>
        </AnimatePresence>
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center">
            {messages.filter((m) => m.role === 'assistant').length}
          </span>
        )}
      </motion.button>
    </div>
  );
};
