import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ShieldCheck, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { registerPasskey, isPasskeySupported, getPasskeyVirtualAddress } from '../lib/passkey';


interface Props {
  onComplete: (address: string, passkeyId: string) => void;
  onCancel: () => void;
}

export function PasskeyOnboarding({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<'info' | 'registering' | 'success'>('info');
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    isPasskeySupported().then(setSupported);
  }, []);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("Please enter a name for your device");
      return;
    }
    setError(null);
    setStep('registering');
    try {
      const identity = await registerPasskey(name);
      setStep('success');
      // Briefly show success before completing
      setTimeout(() => {
        onComplete(getPasskeyVirtualAddress(identity.id), identity.id);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
      setStep('info');
    }
  };

  if (supported === false) {
    return (
      <div className="p-8 text-center bg-card rounded-3xl border border-white/10 max-w-md mx-auto">
        <ShieldCheck className="mx-auto text-amber-500 mb-4" size={48} />
        <h3 className="text-xl font-black mb-2">Passkey Not Supported</h3>
        <p className="text-muted-foreground text-sm">
          Your browser or device doesn't support biometric passkeys. Please use Freighter wallet instead.
        </p>
        <button 
          onClick={onCancel}
          className="mt-6 w-full py-3 bg-secondary text-primary font-bold rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card w-full max-w-md border border-white/10 rounded-3xl p-8 relative shadow-2xl overflow-hidden">
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] mb-4">
              <Fingerprint className="text-white" size={32} />
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Walletless Entry</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Create a secure account using your device's biometrics. No passwords, no seed phrases, just you.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="mt-1 p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <Shield size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Enterprise Security</div>
                  <div className="text-[11px] text-muted-foreground">Encrypted by your device's Secure Enclave.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="mt-1 p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">One-Click Setup</div>
                  <div className="text-[11px] text-muted-foreground">Ready to split expenses in less than 30 seconds.</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">Device Name</label>
                <input 
                  autoFocus
                  className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all font-medium" 
                  placeholder="e.g. My Phone, Work Laptop" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>

              {error && (
                <div className="text-[11px] text-red-400 font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20 animate-shake">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={onCancel}
                  className="flex-1 py-3.5 bg-secondary text-primary font-bold rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRegister}
                  className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group"
                >
                  Get Started <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'registering' && (
          <motion.div
            key="registering"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-2 border-indigo-500/20 flex items-center justify-center">
                <Fingerprint className="text-indigo-500 animate-pulse" size={48} />
              </div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-24 h-24 rounded-full border-t-2 border-indigo-500"
              />
            </div>
            <h3 className="text-xl font-black mb-2 tracking-tight">Authenticating...</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Please check your device for the biometric prompt.
            </p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-6"
            >
              <ShieldCheck className="text-white" size={40} />
            </motion.div>
            <h3 className="text-2xl font-black mb-2 tracking-tight text-green-400">Account Ready</h3>
            <p className="text-sm text-muted-foreground">
              Your biometric account has been successfully linked.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
