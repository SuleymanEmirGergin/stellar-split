import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Users } from 'lucide-react'
import { useI18n } from '../lib/i18n'

const WIZARD_KEY = 'wizard_v1_done'

export function useShowWizard() {
  return !localStorage.getItem(WIZARD_KEY)
}

export default function NewUserWizard({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const STEPS = [
    {
      emoji: '🚀',
      title: t('wizard.step0_title'),
      desc: t('wizard.step0_desc'),
      cta: t('wizard.step0_cta'),
      icon: undefined as typeof Plus | undefined,
    },
    {
      icon: Plus,
      title: t('wizard.step1_title'),
      desc: t('wizard.step1_desc'),
      cta: t('wizard.step1_cta'),
      emoji: undefined as string | undefined,
    },
    {
      icon: Users,
      title: t('wizard.step2_title'),
      desc: t('wizard.step2_desc'),
      cta: t('wizard.step2_cta'),
      emoji: undefined as string | undefined,
    },
    {
      emoji: '🎉',
      title: t('wizard.step3_title'),
      desc: t('wizard.step3_desc'),
      cta: t('wizard.step3_cta'),
      icon: undefined as typeof Plus | undefined,
    },
  ]

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
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative z-10 bg-[#0e1118]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 max-w-sm w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)]"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/[0.05] rounded-full blur-3xl pointer-events-none" />
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-foreground/30 hover:text-foreground/70 hover:bg-white/[0.06] transition-colors"
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
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/25">
                  <current.icon size={28} className="text-indigo-400" />
                </div>
              ) : null}
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground mb-3">{current.title}</h2>
            <p className="text-sm text-foreground/50 mb-8 leading-relaxed">{current.desc}</p>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={handleNext}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_24px_rgba(99,102,241,0.5)] hover:-translate-y-px transition-all text-sm"
        >
          {current.cta}
        </button>

        <div className="flex justify-center gap-1.5 mt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500' : i < step ? 'w-1.5 bg-indigo-500/40' : 'w-1.5 bg-white/10'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
