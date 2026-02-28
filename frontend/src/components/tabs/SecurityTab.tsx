import { useState } from 'react';
import { Shield, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { type Group } from '../../lib/contract';
import { setGuardians } from '../../lib/contract';
import { saveGuardians } from '../../lib/recovery';
import type { TranslationKey } from '../../lib/i18n';

interface SecurityTabProps {
  group: Group;
  walletAddress: string;
  activeRecovery: { new_address: string; approvals: string[] } | null;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function SecurityTab({
  group,
  walletAddress,
  activeRecovery,
  t,
  addToast
}: SecurityTabProps) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-10 bg-secondary/30 border border-white/5 rounded-[40px] text-center relative overflow-hidden">
       <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full" />
       <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 text-emerald-400">
         <Shield size={32} />
       </div>
       <h3 className="font-black text-xl mb-2 tracking-tight">{t('group.security_center')}</h3>
       <p className="text-xs text-muted-foreground mb-8 font-medium max-w-[300px] mx-auto leading-relaxed">{t('group.recovery_desc')}</p>
       
       {activeRecovery && (
         <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left">
           <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-1">
             <AlertTriangle size={14} /> {t('group.recovery_active_request')}
           </div>
           <p className="text-[10px] text-muted-foreground">{t('group.recovery_new_address')}: {activeRecovery.new_address}</p>
           <p className="text-[10px] text-muted-foreground">{t('group.recovery_approvals')}: {activeRecovery.approvals.length} / threshold</p>
         </div>
       )}

       <button 
          onClick={async () => { 
            const guardians = (group?.members || []).filter(m => m !== walletAddress).slice(0, 2);
            if (guardians.length === 0) {
              addToast(t('group.recovery_guardians_failed'), 'error');
              return;
            }
            try {
              setAdding(true);
              await setGuardians(walletAddress, guardians, 2);
              addToast(t('group.recovery_guardians_updated'), 'success');
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              const contractUnsupported = /non-existent|MissingValue|set_guardians/i.test(msg);
              if (contractUnsupported) {
                saveGuardians(group.id, walletAddress, guardians);
                addToast(t('group.recovery_guardians_saved_local'), 'success');
              } else {
                console.error(err);
                addToast(t('group.recovery_guardians_failed'), 'error');
              }
            } finally {
              setAdding(false);
            }
          }} 
          className="w-full py-4 bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 font-black rounded-2xl hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-2"
       >
         {adding ? <Zap className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
         {t('group.recovery_update_guardians')}
       </button>

       <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
         <Shield size={12} /> {t('group.recovery_shielded')}
       </div>
    </div>
  );
}
