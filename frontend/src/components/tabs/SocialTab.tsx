import { Bell, Share2 } from 'lucide-react';
import { generateTelegramShareUrl } from '../../lib/notifications';
import type { TranslationKey } from '../../lib/i18n';

interface SocialTabProps {
  groupId: number;
  groupName: string;
  webhookUrl: string;
  setWebhookUrl: (val: string) => void;
  webhookNotifyPref: string;
  setWebhookNotifyPref: (val: 'all' | 'mine' | 'off') => void;
  webhookNotifySettlement: boolean;
  setWebhookNotifySettlement: (val: boolean) => void;
  t: (key: TranslationKey) => string;
}

export default function SocialTab({
  groupId,
  groupName,
  webhookUrl,
  setWebhookUrl,
  webhookNotifyPref,
  setWebhookNotifyPref,
  webhookNotifySettlement,
  setWebhookNotifySettlement,
  t
}: SocialTabProps) {
  return (
    <div className="space-y-6">
       <div>
         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block px-1">Discord / Slack Notifications</label>
         <div className="relative">
           <Bell className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
           <input 
            className="w-full bg-secondary/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-indigo-500/50 transition-all outline-none" 
            placeholder="https://hooks.slack.com/services/... veya https://discord.com/api/webhooks/..." 
            value={webhookUrl} 
            onChange={e=>{setWebhookUrl(e.target.value); localStorage.setItem(`webhook_${groupId}`,e.target.value);}} 
           />
         </div>
         <p className="mt-2 text-[10px] text-muted-foreground font-medium">
           <strong>Slack:</strong> Kanal → Ayarlar → Uygulamalar Ekle → Incoming Webhooks → Webhook URL kopyala. <strong>Discord:</strong> Sunucu Ayarları → Entegrasyonlar → Webhooks → Yeni Webhook → URL&#39;yi kopyala.
         </p>
         <div className="mt-4 space-y-3">
           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Bildirim gönder</label>
           <div className="flex flex-wrap gap-3">
             {(['all', 'mine', 'off'] as const).map((pref) => (
               <label key={pref} className="flex items-center gap-2 cursor-pointer">
                 <input
                   type="radio"
                   name={`webhook_pref_${groupId}`}
                   checked={webhookNotifyPref === pref}
                   onChange={() => {
                     setWebhookNotifyPref(pref);
                     localStorage.setItem(`webhook_pref_${groupId}`, pref);
                   }}
                   className="rounded-full border-white/20 text-indigo-500 focus:ring-indigo-500"
                 />
                 <span className="text-xs font-bold">{t(`group.webhook_pref_${pref}`)}</span>
               </label>
             ))}
           </div>
           <label className="flex items-center gap-2 cursor-pointer mt-2">
             <input
               type="checkbox"
               checked={webhookNotifySettlement}
               onChange={(e) => {
                 const v = e.target.checked;
                 setWebhookNotifySettlement(v);
                 localStorage.setItem(`webhook_settlement_${groupId}`, String(v));
               }}
               className="rounded border-white/20 text-indigo-500 focus:ring-indigo-500"
             />
             <span className="text-xs font-bold">{t('group.webhook_pref_settlement')}</span>
           </label>
         </div>
       </div>
       
       <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[32px] flex flex-col items-center text-center gap-6">
         <div className="w-16 h-16 rounded-[24px] bg-[#24A1DE] flex items-center justify-center shadow-lg shadow-[#24A1DE]/20">
           <Share2 size={24} className="text-white" />
         </div>
         <div>
            <h4 className="font-black text-lg mb-1 tracking-tight">Community Social</h4>
            <p className="text-xs text-muted-foreground font-medium">Broadcast group updates to your Telegram channel.</p>
         </div>
         <a 
          href={generateTelegramShareUrl(groupId, groupName)} 
          className="w-full py-4 bg-[#24A1DE] text-white font-black rounded-2xl flex justify-center items-center gap-2 hover:shadow-xl hover:shadow-[#24A1DE]/20 hover:-translate-y-1 transition-all" 
          target="_blank"
          rel="noreferrer"
         >
           <Share2 size={18} /> Share on Telegram
         </a>
       </div>
    </div>
  );
}
