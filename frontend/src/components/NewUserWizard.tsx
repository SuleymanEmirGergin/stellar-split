import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Users } from 'lucide-react'

const WIZARD_KEY = 'wizard_v1_done'

export function useShowWizard() {
  return !localStorage.getItem(WIZARD_KEY)
}

const STEPS = [
  {
    emoji: '🚀',
    title: "StellarSplit'e Hoş Geldiniz!",
    desc: 'Arkadaşlarınızla harcamaları kolayca bölüşün ve Stellar blockchain üzerinde anında hesaplaşın.',
    cta: 'Başlayalım →',
    icon: undefined as typeof Plus | undefined,
  },
  {
    icon: Plus,
    title: 'Grup Oluşturun',
    desc: 'Sol alttaki + butonuna tıklayarak ilk grubunuzu oluşturun. XLM veya USDC seçebilirsiniz.',
    cta: 'Anladım →',
    emoji: undefined as string | undefined,
  },
  {
    icon: Users,
    title: 'Arkadaşlarınızı Davet Edin',
    desc: 'Grup oluşturduktan sonra davet bağlantısını paylaşarak üyeleri ekleyebilirsiniz.',
    cta: 'Devam →',
    emoji: undefined as string | undefined,
  },
  {
    emoji: '🎉',
    title: 'Hazırsınız!',
    desc: 'Artık harcamalarınızı ekleyip, bakiyelerinizi takip edip, tek tıkla hesaplaşabilirsiniz.',
    cta: 'Hadi Başlayalım',
    icon: undefined as typeof Plus | undefined,
  },
]

export default function NewUserWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)

  const handleClose = () => {
    localStorage.setItem(WIZARD_KEY, 'true')
    onClose()
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleClose()
  }

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative z-10 bg-card border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-foreground/40 hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <div className="text-5xl mb-5">
              {current.emoji ? (
                <span>{current.emoji}</span>
              ) : current.icon ? (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <current.icon size={28} className="text-indigo-400" />
                </div>
              ) : null}
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">{current.title}</h2>
            <p className="text-sm text-foreground/60 mb-8 leading-relaxed">{current.desc}</p>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={handleNext}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-2xl transition-colors text-sm"
        >
          {current.cta}
        </button>

        <div className="flex justify-center gap-1.5 mt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
