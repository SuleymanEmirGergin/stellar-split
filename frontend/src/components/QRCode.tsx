import { useI18n } from '../lib/i18n';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  groupId?: number;
  groupName?: string;
  destination?: string;
  amount?: string;
  memo?: string;
  type?: 'share' | 'pay';
}

export default function QRCode({ groupId, groupName, destination, amount, memo, type = 'share' }: Props) {
  const { t } = useI18n();
  let data = '';
  let label = '';
  let subText = '';

  if (type === 'pay' && destination && amount) {
    data = `web+stellar:pay?destination=${encodeURIComponent(destination)}&amount=${encodeURIComponent(amount)}&memo=${encodeURIComponent(memo || 'StellarSplit')}`;
    label = `${amount} XLM ${t('group.qr_pay').split(' ')[1]}`;
    subText = `Dest: ${destination.slice(0, 4)}...${destination.slice(-4)}`;
  } else {
    // Standard URL + internal protocol for scanner
    data = `stellarsplit:join:${groupId}`; 
    label = `Grup #${groupId} — ${groupName}`;
    subText = t('dash.empty'); // Placeholder for scan text
  }



  return (
    <div className="text-center">
      <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
        <QRCodeSVG
          value={data}
          size={180}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={false}
          className="rounded-lg"
        />
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{subText}</p>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => { navigator.clipboard.writeText(data).catch(() => {}); }}
          >
            🔗 {type === 'pay' ? 'Ödeme Linkini Kopyala' : 'Grup Linkini Kopyala'}
          </button>
          {type === 'pay' && (
            <a
              href={data}
              className="text-xs text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              📱 Cüzdanda Aç
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

