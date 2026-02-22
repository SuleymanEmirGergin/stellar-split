/**
 * Social Recovery & Guardians Logic for StellarSplit.
 * Simulates Account Abstraction / Social Recovery features.
 */

export interface GuardianConfig {
  userAddress: string;
  guardians: string[]; // List of guardian addresses
  threshold: number;  // Required number of approvals
}

export interface RecoveryRequest {
  targetAddress: string;
  newAddress: string;
  approvals: string[]; // List of guardian addresses who approved
  status: 'pending' | 'completed' | 'expired';
}

const GUARDIANS_KEY = (groupId: number) => `stellarsplit_guardians_${groupId}`;
const RECOVERY_KEY = (groupId: number) => `stellarsplit_recovery_${groupId}`;

export function saveGuardians(groupId: number, userAddress: string, guardians: string[]) {
  const all = loadAllGuardians(groupId);
  all[userAddress] = {
    userAddress,
    guardians,
    threshold: Math.ceil(guardians.length / 2) || 1
  };
  localStorage.setItem(GUARDIANS_KEY(groupId), JSON.stringify(all));
}

export function loadAllGuardians(groupId: number): Record<string, GuardianConfig> {
  const raw = localStorage.getItem(GUARDIANS_KEY(groupId));
  return raw ? JSON.parse(raw) : {};
}

export function getGuardiansForUser(groupId: number, userAddress: string): string[] {
  return loadAllGuardians(groupId)[userAddress]?.guardians || [];
}

export function initiateRecovery(groupId: number, targetAddress: string, newAddress: string) {
  const request: RecoveryRequest = {
    targetAddress,
    newAddress,
    approvals: [],
    status: 'pending'
  };
  localStorage.setItem(RECOVERY_KEY(groupId), JSON.stringify(request));
  return request;
}

export function loadRecoveryRequest(groupId: number): RecoveryRequest | null {
  const raw = localStorage.getItem(RECOVERY_KEY(groupId));
  return raw ? JSON.parse(raw) : null;
}

export function approveRecovery(groupId: number, recoveryAddress: string, guardianAddress: string): RecoveryRequest | null {
  const req = loadRecoveryRequest(groupId);
  if (!req || req.status !== 'pending' || req.targetAddress !== recoveryAddress) return null;
  
  if (!req.approvals.includes(guardianAddress)) {
    req.approvals.push(guardianAddress);
  }
  
  const config = loadAllGuardians(groupId)[recoveryAddress];
  if (req.approvals.length >= config.threshold) {
    req.status = 'completed';
  }
  
  localStorage.setItem(RECOVERY_KEY(groupId), JSON.stringify(req));
  return req;
}
