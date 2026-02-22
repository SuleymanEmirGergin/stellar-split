import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';

const STORAGE_KEY = 'stellarsplit_joyride_done_v2';

export default function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setTimeout(() => setRun(true), 1000); // 1s delay for initial animation
    }
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  const steps = [
    {
      target: 'body',
      content: 'StellarSplit\'e hoş geldiniz! Uygulamanın Hackathon jürisine özel hazırladığımız "Wow-Factor" özelliklerini keşfetmek için tura başlayalım.',
      placement: 'center' as const,
      disableBeacon: true,
    },
    {
      target: '[data-testid="create-group-btn"]',
      content: 'Öncelikle buradan yeni bir grup oluşturabilir (XLM veya USDC seçeneğiyle) ve arkadaşlarınızı davet edebilirsiniz.',
    },
    {
      target: '[data-testid="ai-scan-btn"]',
      content: 'Fiş/Makbuz okuma ekranımız Tesseract.js ile tamamen cihazınızda (lokal) çalışır! Gizliliğinizi korur ve tutarı otomatik çeker.',
    },
    {
      target: '#user-analytics-panel',
      content: 'Burada kazandığınız NFT Başarımlarını (Gamification), grubun bonkörü rozetlerini ve DeFi kasalarındaki pasif getiri payınızı anlık görebilirsiniz.',
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#6366f1',
          backgroundColor: '#1E1E2E',
          textColor: '#fff',
          arrowColor: '#1E1E2E',
          zIndex: 10000,
        },
        buttonNext: {
          fontWeight: 'bold',
          borderRadius: '8px',
        },
        buttonBack: {
          marginRight: 10,
        },
      }}
      locale={{
        back: 'Geri',
        close: 'Kapat',
        last: 'Bitir',
        next: 'İleri',
        skip: 'Atla'
      }}
    />
  );
}
