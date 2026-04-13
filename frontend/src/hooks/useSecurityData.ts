import { useState, useCallback, useEffect } from 'react';
import { getRecovery, getGuardians, isDemoMode, type RecoveryRequest, type GuardianConfig } from '../lib/contract';
import { loadAllGuardians, loadRecoveryRequest } from '../lib/recovery';

export function useSecurityData(walletAddress: string, groupId: number) {
  const [activeRecovery, setActiveRecovery] = useState<RecoveryRequest | null>(null);
  const [guardianConfig, setGuardianConfig] = useState<GuardianConfig | null>(null);

  const loadSecurityData = useCallback(async () => {
    if (!walletAddress) return;
    try {
      if (isDemoMode()) {
        const local = loadAllGuardians(groupId)[walletAddress];
        if (local) {
          setGuardianConfig({
            user: local.userAddress,
            guardians: local.guardians,
            threshold: local.threshold,
          });
        } else {
          setGuardianConfig(null);
        }
        const req = loadRecoveryRequest(groupId);
        if (req && req.status === 'pending' && req.targetAddress === walletAddress) {
          setActiveRecovery({
            target: req.targetAddress,
            new_address: req.newAddress,
            approvals: req.approvals,
            status: 0,
          });
        } else {
          setActiveRecovery(null);
        }
      } else {
        const [req, config] = await Promise.all([
          getRecovery(walletAddress, walletAddress),
          getGuardians(walletAddress, walletAddress),
        ]);
        setActiveRecovery(req ?? null);
        setGuardianConfig(config ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch security data:', err);
    }
  }, [walletAddress, groupId]);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  return { activeRecovery, guardianConfig, loadSecurityData };
}
