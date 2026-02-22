import { useState } from 'react';

/**
 * OnRampGuide — A simple education component to help users acquire Stellar assets (XLM/USDC).
 */
export default function OnRampGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      title: '1. Cüzdanınızı Hazırlayın',
      desc: 'Freighter veya Loberstr gibi bir Stellar cüzdanı edinin.',
      icon: '🔐'
    },
    {
      title: '2. Varlık Yükleyin',
      desc: 'Kredi kartı veya banka havalesi ile XLM veya USDC satın alın (MoonPay, MoneyGram).',
      icon: '💳'
    },
    {
      title: '3. Güvenli Saklayın',
      desc: 'Varlıklarınızı cüzdanınıza transfer edin ve StellarSplit ile settle işlemlerine başlayın!',
      icon: '🚀'
    }
  ];

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold text-primary/80 hover:text-primary transition-colors flex items-center gap-1 py-4"
      >
        💡 Stellar'da nasıl XLM/USDC bakiyesi yüklenir?
      </button>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 my-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-sm text-primary uppercase tracking-tight">🚀 Stellar On-Ramp Rehberi</h4>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold px-2 py-1 bg-muted/50 rounded-md transition-all">Kapat</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col gap-2 p-3 bg-card border border-border/50 rounded-lg shadow-sm">
            <span className="text-2xl">{s.icon}</span>
            <div className="font-bold text-xs">{s.title}</div>
            <div className="text-[11px] leading-relaxed text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-primary/10 flex flex-wrap gap-2">
        <a 
          href="https://moneygram.com/mgo/us/en/m/crypto/stellar" 
          target="_blank" 
          rel="noreferrer"
          className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg hover:shadow-lg transition-all"
        >
          MoneyGram ile Nakit → Crypto
        </a>
        <a 
          href="https://www.stellar.org/ecosystem/directory" 
          target="_blank" 
          rel="noreferrer"
          className="px-3 py-1.5 bg-muted text-foreground text-[10px] font-bold rounded-lg border border-border hover:bg-muted/80 transition-all"
        >
          Ecosystem Directory
        </a>
      </div>
    </div>
  );
}
