import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

interface VoiceAssistantProps {
  onResult: (text: string) => void;
  className?: string;
}

export function VoiceAssistant({ onResult, className = '' }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize SpeechRecognition on the client
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'tr-TR';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsProcessing(true);
          // Simulate some processing time for dramatic AI effect
          setTimeout(() => {
            onResult(transcript);
            setIsProcessing(false);
            setIsRecording(false);
          }, 800);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          setIsProcessing(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording((prev) => {
            // If processing, don't update recording state here
            return prev;
          });
        };
      }
    }
  }, [onResult]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert(t('voice.not_supported'));
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {(isRecording || isProcessing) && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={12} className="animate-spin" /> {t('voice.processing')}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> {t('voice.listening')}
              </>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-t-4 border-l-4 border-r-4 border-transparent border-t-indigo-500 w-0 h-0" />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={toggleRecording}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all relative ${
          isRecording ? 'bg-indigo-500 text-white' : 'bg-secondary border border-white/10 text-indigo-400 hover:bg-white/10'
        }`}
        aria-label={t('voice.add_expense_title')}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-75" />
        )}
        <Mic size={24} className={isRecording ? "animate-pulse" : ""} />
      </button>
    </div>
  );
}
