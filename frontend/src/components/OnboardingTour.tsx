import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';
import { useI18n } from '../lib/i18n';

const STORAGE_KEY = 'stellarsplit_joyride_done_v2';

export default function OnboardingTour() {
  const { t, lang } = useI18n();
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

  // Note: step content is re-evaluated on every render (which happens when
  // `lang` changes because `useI18n()` subscribes to `stellarsplit:lang-updated`).
  // So mid-tour language switches flip step text naturally.
  const steps = [
    {
      target: 'body',
      content: t('tour.welcome'),
      placement: 'center' as const,
      disableBeacon: true,
    },
    {
      target: '[data-testid="create-group-btn"]',
      content: t('tour.create_group'),
    },
    {
      target: '[data-testid="ai-scan-btn"]',
      content: t('tour.ai_scan'),
    },
    {
      target: '#user-analytics-panel',
      content: t('tour.analytics_panel'),
    }
  ];

  return (
    <Joyride
      key={lang}  // force remount on language change so react-joyride picks up new locale
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
        back: t('tour.back'),
        close: t('tour.close'),
        last: t('tour.last'),
        next: t('tour.next'),
        skip: t('tour.skip'),
      }}
    />
  );
}
