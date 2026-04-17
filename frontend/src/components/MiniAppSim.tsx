import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, MoreVertical, Bot, Paperclip, Smile, ArrowLeft, Link as LinkIcon } from 'lucide-react';

interface Props {
  onClose: () => void;
  walletAddress: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  isLink?: boolean;
}

export function MiniAppSim({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! I am the Birik bot. 🤖\n\nSend me a command like "Split 120 XLM for Dinner" to instantly generate a tracking group!',
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (preset?: string) => {
    const text = preset || inputMsg;
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputMsg('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      
      const inviteId = Math.floor(Math.random() * 1000);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Got it! I created a new group for "${text}".\n\nShare this link with your friends to collect the funds via Soroban:`,
        isLink: true
      };
      
      setMessages(prev => [...prev, botMsg]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-0 md:p-6 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="w-full h-full max-h-full md:max-h-[850px] max-w-[400px] bg-[#1c1c1d] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative"
      >
        {/* Telegram Header */}
        <div className="bg-[#2c2c2e] p-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 text-[#fff] hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shrink-0">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-white font-bold leading-tight">Birik Bot</h3>
              <p className="text-[#8e8e93] text-xs">bot • online</p>
            </div>
          </div>
          <button aria-label="More options" className="p-2 text-[#fff] hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-cover bg-center scroll-smooth"
          style={{ backgroundImage: 'url("https://web.telegram.org/a/chat-bg-pattern-dark.png")', backgroundColor: '#1c1c1d' }}
        >
          {messages.map(msg => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl p-3 shadow-sm relative ${
                  msg.sender === 'user' 
                    ? 'bg-[#007aff] text-white rounded-tr-sm' 
                    : 'bg-[#2c2c2e] text-white rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {msg.text}
                </div>
                {msg.isLink && (
                  <div className="mt-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-colors flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                      <LinkIcon size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">Split Invitation</div>
                      <div className="text-blue-400 text-xs truncate">stellarsplit.app/join/...</div>
                    </div>
                  </div>
                )}
                <div className={`text-[10px] text-right mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-[#8e8e93]'}`}>
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#2c2c2e] rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-[#8e8e93] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#8e8e93] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#8e8e93] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick Actions / Suggestions */}
        <div className="bg-[#1c1c1d] px-2 py-2 flex gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar shrink-0 border-t border-white/5">
          {["Split 120 XLM Dinner", "Monthly Rent 400 XLM", "Weekend Trip fund"].map(preset => (
            <button
              key={preset}
              onClick={() => handleSend(preset)}
              className="px-4 py-1.5 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-full text-sm font-medium transition-colors shrink-0"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-[#1c1c1d] p-3 flex items-end gap-2 shrink-0">
          <button aria-label="Attach file" className="p-2.5 text-[#8e8e93] hover:text-white transition-colors">
            <Paperclip size={24} />
          </button>
          <div className="flex-1 bg-[#2c2c2e] rounded-[24px] flex items-center px-4 py-1">
            <input 
              type="text"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Message"
              className="flex-1 bg-transparent py-3 outline-none text-white text-[16px] placeholder:text-[#8e8e93]"
            />
            <button aria-label="Emoji picker" className="p-2 text-[#8e8e93] hover:text-white transition-colors">
              <Smile size={24} aria-hidden="true" />
            </button>
          </div>
          {inputMsg.trim() ? (
            <button
              onClick={() => handleSend()}
              aria-label="Send message"
              className="w-12 h-12 rounded-full bg-[#007aff] text-white flex items-center justify-center hover:bg-blue-600 transition-colors shrink-0"
            >
              <Send size={20} className="ml-1" aria-hidden="true" />
            </button>
          ) : (
            <button aria-label="Voice input" disabled aria-disabled="true" className="w-12 h-12 rounded-full bg-[#2c2c2e] text-[#8e8e93] flex items-center justify-center shrink-0">
              <div className="w-6 h-6 border-2 border-current rounded-full" aria-hidden="true" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
