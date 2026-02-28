import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, CONTRACT_ID, getNativeTokenContractId, USDC_CONTRACT_ID } from './stellar';

const contract = new StellarSdk.Contract(CONTRACT_ID);

// Reward Token ID (in production, this would be in .env)
export const SPLT_CONTRACT_ID = 'CDA7...REWARD'; 

/**
 * Demo Mode Check: If 'stellarsplit_demo_mode' is 'true' in localStorage, 
 * we bypass the blockchain and return mock data.
 */
export function isDemoMode(): boolean {
  return localStorage.getItem('stellarsplit_demo_mode') === 'true';
}

/** Helper for demo delays */
const demoDelay = (ms = 1000) => new Promise(r => setTimeout(r, ms));

// ── Types ──
export interface Group {
  id: number;
  name: string;
  creator: string;
  members: string[];
  owner: string;
  expense_count: number;
  currency?: 'XLM' | 'USDC';
}

export interface Expense {
  id: number;
  payer: string;
  amount: number;
  split_among: string[];
  description: string;
  category?: string;
  currency?: 'XLM' | 'USDC';
  attachment_url?: string; // New field for receipts
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// ── Helper: Build and simulate a transaction ──
async function buildTx(
  sourceAddress: string,
  method: string,
  ...args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.Transaction> {
  const account = await server.getAccount(sourceAddress);
  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  txBuilder.addOperation(contract.call(method, ...args));
  txBuilder.setTimeout(30);

  const tx = txBuilder.build();

  // Simulate to get resource estimates
  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    // Extract meaningful error from simulation
    const errMsg = extractSimulationError(simulated);
    throw new Error(errMsg);
  }

  return rpc.assembleTransaction(tx, simulated).build();
}

const CLASSIC_FEE_STROOPS = 100;

/** Result of fee estimation (stroops and XLM string for display). */
export interface EstimatedFee {
  stroops: number;
  xlm: string;
}

// ── Helper: Simulate only and return estimated fee (no submit) ──
async function estimateTxFee(
  sourceAddress: string,
  method: string,
  ...args: StellarSdk.xdr.ScVal[]
): Promise<EstimatedFee> {
  const account = await server.getAccount(sourceAddress);
  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  txBuilder.addOperation(contract.call(method, ...args));
  txBuilder.setTimeout(30);
  const tx = txBuilder.build();
  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(extractSimulationError(simulated));
  }
  const minResourceFee = Number((simulated as rpc.Api.SimulateTransactionSuccessResponse).minResourceFee || 0);
  const stroops = CLASSIC_FEE_STROOPS + minResourceFee;
  const xlm = (stroops / 10_000_000).toFixed(7);
  return { stroops, xlm };
}

/** Estimated network fee for create_group (for display before submit). */
export async function estimateCreateGroupFee(
  creator: string,
  name: string,
  members: string[],
  currency: 'XLM' | 'USDC'
): Promise<EstimatedFee> {
  if (isDemoMode()) return { stroops: 100000, xlm: '0.0100000' };
  const tokenContractId = currency === 'USDC' ? USDC_CONTRACT_ID : getNativeTokenContractId();
  if (currency === 'USDC' && !tokenContractId) throw new Error('USDC is not configured.');
  const membersScVal = StellarSdk.xdr.ScVal.scvVec(
    members.map((m) => StellarSdk.Address.fromString(m).toScVal())
  );
  const creatorScVal = StellarSdk.Address.fromString(creator).toScVal();
  const nameScVal = StellarSdk.nativeToScVal((name || '').trim().slice(0, 64), { type: 'string' });
  try {
    return await estimateTxFee(
      creator,
      'create_group',
      creatorScVal,
      nameScVal,
      membersScVal,
      StellarSdk.Address.fromString(tokenContractId!).toScVal()
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('MismatchingParameterLen')) throw err;
    // Fallback: older deployed contract may have create_group(creator, name, members) without token
    return estimateTxFee(creator, 'create_group', creatorScVal, nameScVal, membersScVal);
  }
}

/** Estimated network fee for add_expense. */
export async function estimateAddExpenseFee(
  callerAddress: string,
  groupId: number,
  payer: string,
  amount: number,
  splitAmong: string[],
  description: string,
  category: string = ''
): Promise<EstimatedFee> {
  if (isDemoMode()) return { stroops: 80000, xlm: '0.0080000' };
  const args6 = [
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(payer).toScVal(),
    StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    StellarSdk.nativeToScVal(splitAmong.map(m => StellarSdk.Address.fromString(m)), { type: 'vec' }),
    StellarSdk.nativeToScVal(description, { type: 'string' }),
    StellarSdk.nativeToScVal(category || '', { type: 'string' }),
  ];
  try {
    return await estimateTxFee(callerAddress, 'add_expense', ...args6);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('MismatchingParameterLen')) throw err;
    return estimateTxFee(callerAddress, 'add_expense', ...args6.slice(0, 5));
  }
}

/** Estimated network fee for settle_group. */
export async function estimateSettleGroupFee(callerAddress: string, groupId: number): Promise<EstimatedFee> {
  if (isDemoMode()) return { stroops: 120000, xlm: '0.0120000' };
  return estimateTxFee(
    callerAddress,
    'settle_group',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal()
  );
}

// ── Helper: Extract readable error from simulation ──
function extractSimulationError(simulated: rpc.Api.SimulateTransactionErrorResponse): string {
  const raw = simulated.error || 'Unknown simulation error';
  // Try to extract contract panic message
  if (raw.includes('HostError')) {
    const panicMatch = raw.match(/panic message: "([^"]+)"/);
    if (panicMatch) return panicMatch[1];
    const dataMatch = raw.match(/data:\\"([^"]+)\\"/);
    if (dataMatch) return dataMatch[1];
  }
  return `Simulation failed: ${raw}`;
}

/** True when the deployed contract doesn't have this function (older deploy). */
function isNonExistentFunctionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('MissingValue') ||
    msg.includes('non-existent contract function') ||
    msg.includes('trying to invoke non-existent')
  );
}

// ── Helper: Sign with Freighter and submit ──
async function signAndSubmit(tx: StellarSdk.Transaction): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const { signTransaction, getNetworkDetails } = await import('@stellar/freighter-api');

  // ── Ağ uyumsuzluğu kontrolü ──
  try {
    const networkDetails = await getNetworkDetails();
    if (networkDetails.networkPassphrase && networkDetails.networkPassphrase !== NETWORK_PASSPHRASE) {
      throw new Error(
        `Freighter cüzdanınız "${networkDetails.network || 'Main Net'}" ağında. ` +
        `Lütfen Freighter ayarlarından "Testnet" ağına geçin ve tekrar deneyin.`
      );
    }
  } catch (err) {
    // Eğer hata bizim fırlattığımız ağ uyumsuzluğu hatasıysa, tekrar fırlat
    if (err instanceof Error && err.message.includes('Freighter cüzdanınız')) {
      throw err;
    }
    // Diğer durumda devam et (eski Freighter versiyonları getNetworkDetails desteklemeyebilir)
  }

  // Hackathon Wow-Factor: Gasless Tx (Sponsorlu İşlem) Simülasyonu
  // Kullanıcıya işlem ücretinin protokol tarafından karşılandığı hissini vermek için event fırlatıyoruz.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stellarsplit:tx-sponsored'));
  }

  const signResult = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult.error) {
    // Freighter hata mesajını düzgün çıkar (string, object veya Error olabilir)
    let errorMsg: string;
    if (typeof signResult.error === 'string') {
      errorMsg = signResult.error;
    } else if (signResult.error instanceof Error) {
      errorMsg = signResult.error.message;
    } else if (typeof signResult.error === 'object' && signResult.error !== null) {
      errorMsg = JSON.stringify(signResult.error);
    } else {
      errorMsg = String(signResult.error);
    }

    // Yaygın hataları Türkçeye çevir
    if (errorMsg.includes('User declined') || errorMsg.includes('rejected')) {
      throw new Error('İmzalama reddedildi — Freighter\'da işlemi onaylamanız gerekiyor.');
    }
    if (errorMsg.includes('network') || errorMsg.includes('passphrase')) {
      throw new Error('Ağ uyumsuzluğu — Freighter\'ı Testnet\'e geçirin.');
    }
    throw new Error(`İmzalama başarısız: ${errorMsg}`);
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE
  ) as StellarSdk.Transaction;

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('İşlem gönderilemedi — lütfen tekrar deneyin.');
  }

  // Poll for result with timeout
  let getResult: rpc.Api.GetTransactionResponse;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max

  do {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  } while (
    getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < maxAttempts
  );

  if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return getResult as rpc.Api.GetSuccessfulTransactionResponse;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Transaction timed out after 30 seconds');
  }

  throw new Error('Transaction failed on-chain');
}

// ── Helper: Read-only call (simulate only, no submission) ──
async function readOnly(
  sourceAddress: string,
  method: string,
  ...args: StellarSdk.xdr.ScVal[]
): Promise<StellarSdk.xdr.ScVal> {
  const account = await server.getAccount(sourceAddress);
  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  txBuilder.addOperation(contract.call(method, ...args));
  txBuilder.setTimeout(30);

  const tx = txBuilder.build();
  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    const errMsg = extractSimulationError(simulated);
    throw new Error(errMsg);
  }

  if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result) {
    throw new Error('No result from simulation');
  }

  return simulated.result.retval;
}

// ═════════════════════════════════════════════════
//  CONTRACT CALLS
// ═════════════════════════════════════════════════

export async function createGroup(creator: string, name: string, members: string[], currency: 'XLM' | 'USDC' = 'XLM'): Promise<number> {

  if (isDemoMode()) {
    await demoDelay(1500);
    const id = Math.floor(Math.random() * 1000) + 100;
    const groups = JSON.parse(localStorage.getItem('stellarsplit_groups') || '[]');
    groups.push({ id, name, creator, members, owner: creator, currency });
    localStorage.setItem('stellarsplit_groups', JSON.stringify(groups));
    return id;
  }

  const tokenContractId = currency === 'USDC'
    ? USDC_CONTRACT_ID
    : getNativeTokenContractId();
  if (currency === 'USDC' && !tokenContractId) {
    throw new Error('USDC is not configured. Set VITE_USDC_CONTRACT_ID in .env for testnet USDC.');
  }

  // Contract requires at least 2 members (creator + 1 other or 2 distinct)
  const uniqueMembers = [...new Set(members)];
  if (uniqueMembers.length < 2) {
    throw new Error('En az 2 üye gerekli. Katılımcılar alanına kendinizden başka en az bir Stellar adresi girin.');
  }

  // Build Vec<Address> explicitly so the contract receives exactly one ScVal (avoids MismatchingParameterLen)
  const membersScVal = StellarSdk.xdr.ScVal.scvVec(
    uniqueMembers.map((m) => StellarSdk.Address.fromString(m).toScVal())
  );

  const nameTrimmed = name.trim().slice(0, 64);
  const creatorScVal = StellarSdk.Address.fromString(creator).toScVal();
  const nameScVal = StellarSdk.nativeToScVal(nameTrimmed, { type: 'string' });

  let tx: StellarSdk.Transaction;
  try {
    // Current contract: create_group(creator, name, members, token)
    tx = await buildTx(
      creator,
      'create_group',
      creatorScVal,
      nameScVal,
      membersScVal,
      StellarSdk.Address.fromString(tokenContractId).toScVal()
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (currency !== 'XLM' || !msg.includes('MismatchingParameterLen')) throw err;
    // Fallback: older deployed contract may have create_group(creator, name, members) without token
    tx = await buildTx(creator, 'create_group', creatorScVal, nameScVal, membersScVal);
  }

  const result = await signAndSubmit(tx);
  const returnVal = result.returnValue;
  if (!returnVal) throw new Error('No return value');
  return Number(StellarSdk.scValToNative(returnVal));
}

export async function addExpense(
  callerAddress: string,
  groupId: number,
  payer: string,
  amount: number,
  splitAmong: string[],
  description: string,
  category: string = ''
): Promise<number> {

  if (isDemoMode()) {
    await demoDelay(1200);
    return Math.floor(Math.random() * 100000);
  }

  const groupIdSc = StellarSdk.nativeToScVal(groupId, { type: 'u64' });
  const payerSc = StellarSdk.Address.fromString(payer).toScVal();
  const amountSc = StellarSdk.nativeToScVal(amount, { type: 'i128' });
  const splitAmongSc = StellarSdk.nativeToScVal(splitAmong.map(m => StellarSdk.Address.fromString(m)), { type: 'vec' });
  const descriptionSc = StellarSdk.nativeToScVal(description, { type: 'string' });
  const categorySc = StellarSdk.nativeToScVal(category || '', { type: 'string' });

  let tx: StellarSdk.Transaction;
  try {
    tx = await buildTx(
      callerAddress,
      'add_expense',
      groupIdSc,
      payerSc,
      amountSc,
      splitAmongSc,
      descriptionSc,
      categorySc
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('MismatchingParameterLen')) throw err;
    // Older contract may have add_expense without category (5 args)
    tx = await buildTx(
      callerAddress,
      'add_expense',
      groupIdSc,
      payerSc,
      amountSc,
      splitAmongSc,
      descriptionSc
    );
  }

  const result = await signAndSubmit(tx);
  const returnVal = result.returnValue;
  if (!returnVal) throw new Error('No return value');
  return Number(StellarSdk.scValToNative(returnVal));
}

/** Son eklenen harcamayı iptal eder. Sadece o harcamayı ekleyen çağırabilir; grup settle edilmemiş olmalı. */
export async function cancelLastExpense(callerAddress: string, groupId: number): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(800);
    return;
  }

  const tx = await buildTx(
    callerAddress,
    'cancel_last_expense',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal()
  );
  await signAndSubmit(tx);
}

/** Gruba üye ekler. Sadece mevcut üyeler çağırabilir. */
export async function addMember(callerAddress: string, groupId: number, newMemberAddress: string): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(800);
    return;
  }
  const tx = await buildTx(
    callerAddress,
    'add_member',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal(),
    StellarSdk.Address.fromString(newMemberAddress).toScVal()
  );
  await signAndSubmit(tx);
}

/** Gruptan üye çıkarır. En az 2 üye kalmalı. */
export async function removeMember(callerAddress: string, groupId: number, memberAddress: string): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(800);
    return;
  }
  const tx = await buildTx(
    callerAddress,
    'remove_member',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal(),
    StellarSdk.Address.fromString(memberAddress).toScVal()
  );
  await signAndSubmit(tx);
}

export async function getBalances(
  callerAddress: string,
  groupId: number
): Promise<Map<string, number>> {
  if (isDemoMode()) {
    const mock = new Map<string, number>();
    mock.set(callerAddress, -150);
    mock.set('GBR3...DEMO1', 250);
    mock.set('GAV2...DEMO2', -100);
    return mock;
  }

  const result = await readOnly(
    callerAddress,
    'get_balances',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' })
  );

  const native = StellarSdk.scValToNative(result);
  const map = new Map<string, number>();
  if (native instanceof Map) {
    for (const [key, val] of native.entries()) {
      map.set(String(key), Number(val));
    }
  } else if (native && typeof native === 'object') {
    for (const [key, val] of Object.entries(native)) {
      map.set(String(key), Number(val));
    }
  }
  return map;
}

export async function computeSettlements(
  callerAddress: string,
  groupId: number
): Promise<Settlement[]> {
  if (isDemoMode()) {
    return [
      { from: callerAddress, to: 'GBR3...DEMO1', amount: 150 },
      { from: 'GAV2...DEMO2', to: 'GBR3...DEMO1', amount: 100 },
    ];
  }

  const result = await readOnly(
    callerAddress,
    'compute_settlements',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' })
  );

  const native = StellarSdk.scValToNative(result);
  if (!Array.isArray(native)) return [];

  return native.map((s: Record<string, unknown>) => ({
    from: String(s.from),
    to: String(s.to),
    amount: Number(s.amount),
  }));
}

export async function getGroup(
  callerAddress: string,
  groupId: number
): Promise<Group> {
  if (isDemoMode()) {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('stellarsplit_groups');
    const list = saved ? (JSON.parse(saved) as { id: number; name?: string; currency?: 'XLM' | 'USDC' }[]) : [];
    const found = list.find((g: { id: number }) => g.id === groupId);
    return {
      id: groupId,
      name: found?.name ?? `Grup #${groupId} (Demo)`,
      creator: callerAddress,
      owner: callerAddress,
      members: [callerAddress, 'GBR3...DEMO1', 'GAV2...DEMO2'],
      expense_count: 5,
      currency: found?.currency ?? 'XLM',
    };
  }

  const result = await readOnly(
    callerAddress,
    'get_group',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' })
  );

  const native = StellarSdk.scValToNative(result) as Record<string, unknown>;
  const tokenAddr = String(native.token || '');
  const currency: 'XLM' | 'USDC' = tokenAddr && USDC_CONTRACT_ID && tokenAddr === USDC_CONTRACT_ID ? 'USDC' : 'XLM';
  return {
    id: Number(native.id),
    name: String(native.name),
    creator: String(native.creator || ''),
    owner: String(native.owner || ''),
    members: (native.members as string[]).map(String),
    expense_count: Number(native.expense_count),
    currency,
  };
}

export async function getExpense(
  callerAddress: string,
  groupId: number,
  expenseId: number
): Promise<Expense> {
  if (isDemoMode()) {
    // 1 XLM = 10_000_000 stroops; demo'da anlamlı miktar göster (10, 20, 30, 40, 50 XLM)
    const stroopsPerXlm = 10_000_000;
    const xlmAmount = (expenseId + 1) * 10;
    return {
      id: expenseId,
      payer: expenseId % 2 === 0 ? callerAddress : 'GBR3...DEMO1',
      amount: xlmAmount * stroopsPerXlm,
      split_among: [callerAddress, 'GBR3...DEMO1', 'GAV2...DEMO2'],
      description: `Demo Harcaması #${expenseId}`,
      category: '',
      currency: 'XLM',
    };
  }

  const result = await readOnly(
    callerAddress,
    'get_expense',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.nativeToScVal(expenseId, { type: 'u64' })
  );

  const native = StellarSdk.scValToNative(result) as Record<string, unknown>;
  return {
    id: Number(native.id),
    payer: String(native.payer),
    amount: Number(native.amount),
    split_among: (native.split_among as string[]).map(String),
    description: String(native.description),
    category: String(native.category ?? ''),
    currency: (native.currency as 'XLM' | 'USDC') || 'XLM',
  };
}

// ═════════════════════════════════════════════════
//  SETTLEMENT (REAL XLM TRANSFER)
// ═════════════════════════════════════════════════

/**
 * Settle a group — executes real XLM transfers via SAC.
 * Requires all debtors to have sufficient XLM and approve the transaction.
 * @param tokenAddress - The XLM SAC address on testnet
 */
export interface SettleGroupResult {
  settlements: Settlement[];
  txHash: string;
}

export async function settleGroup(
  callerAddress: string,
  groupId: number
): Promise<SettleGroupResult> {
  if (isDemoMode()) {
    await demoDelay(2000);
    return {
      settlements: [
        { from: callerAddress, to: 'GBR3...DEMO1', amount: 150 },
        { from: 'GAV2...DEMO2', to: 'GBR3...DEMO1', amount: 100 },
      ],
      txHash: 'demo-tx-hash-' + Date.now(),
    };
  }

  const tx = await buildTx(
    callerAddress,
    'settle_group',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal()
  );

  const result = await signAndSubmit(tx);
  const returnVal = result.returnValue;
  if (!returnVal) throw new Error('No return value');

  const native = StellarSdk.scValToNative(returnVal);
  if (!Array.isArray(native)) return { settlements: [], txHash: (result as any).id || (result as any).hash || '' };

  return {
    settlements: native.map((s: Record<string, unknown>) => ({
      from: String(s.from),
      to: String(s.to),
      amount: Number(s.amount),
    })),
    txHash: (result as any).id || (result as any).hash || '',
  };
}

/**
 * Check if a group is already settled.
 * Returns false if the contract doesn't have is_settled (older deploy).
 */
export async function isGroupSettled(
  callerAddress: string,
  groupId: number
): Promise<boolean> {
  if (isDemoMode()) return false;
  try {
    const result = await readOnly(
      callerAddress,
      'is_settled',
      StellarSdk.nativeToScVal(groupId, { type: 'u64' })
    );
    return Boolean(StellarSdk.scValToNative(result));
  } catch (err) {
    if (isNonExistentFunctionError(err)) return false;
    throw err;
  }
}

// ─────────────────────────────────────────────
//  GUARDIAN & RECOVERY
// ─────────────────────────────────────────────

export interface GuardianConfig {
  user: string;
  guardians: string[];
  threshold: number;
}

export interface RecoveryRequest {
  target: string;
  new_address: string;
  approvals: string[];
  status: number;
}

export async function setGuardians(
  userAddress: string,
  guardians: string[],
  threshold: number
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(1000);
    return;
  }

  const tx = await buildTx(
    userAddress,
    'set_guardians',
    StellarSdk.Address.fromString(userAddress).toScVal(),
    StellarSdk.nativeToScVal(guardians.map(g => StellarSdk.Address.fromString(g)), { type: 'vec' }),
    StellarSdk.nativeToScVal(threshold, { type: 'u32' })
  );
  await signAndSubmit(tx);
}

export async function initiateRecovery(
  guardianAddress: string,
  targetAddress: string,
  newAddress: string
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(1000);
    return;
  }

  const tx = await buildTx(
    guardianAddress,
    'initiate_recovery',
    StellarSdk.Address.fromString(guardianAddress).toScVal(),
    StellarSdk.Address.fromString(targetAddress).toScVal(),
    StellarSdk.Address.fromString(newAddress).toScVal()
  );
  await signAndSubmit(tx);
}

export async function approveRecovery(
  guardianAddress: string,
  targetAddress: string
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(1000);
    return;
  }

  const tx = await buildTx(
    guardianAddress,
    'approve_recovery',
    StellarSdk.Address.fromString(guardianAddress).toScVal(),
    StellarSdk.Address.fromString(targetAddress).toScVal()
  );
  await signAndSubmit(tx);
}

export async function getGuardians(
  callerAddress: string,
  userAddress: string
): Promise<GuardianConfig | null> {
  if (isDemoMode()) return null;

  try {
    const result = await readOnly(
      callerAddress,
      'get_guardians',
      StellarSdk.Address.fromString(userAddress).toScVal()
    );
    const native = StellarSdk.scValToNative(result);
    if (!native) return null;
    return {
      user: String(native.user),
      guardians: (native.guardians as string[]).map(String),
      threshold: Number(native.threshold),
    };
  } catch (err) {
    console.error('getGuardians failed:', err);
    return null;
  }
}

export async function getRecovery(
  callerAddress: string,
  userAddress: string
): Promise<RecoveryRequest | null> {
  if (isDemoMode()) return null;

  try {
    const result = await readOnly(
      callerAddress,
      'get_recovery',
      StellarSdk.Address.fromString(userAddress).toScVal()
    );
    const native = StellarSdk.scValToNative(result);
    if (!native) return null;
    return {
      target: String(native.target),
      new_address: String(native.new_address),
      approvals: (native.approvals as string[]).map(String),
      status: Number(native.status),
    };
  } catch (err) {
    if (!isNonExistentFunctionError(err)) console.warn('getRecovery failed:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
//  DEFI (VAULT)
// ─────────────────────────────────────────────

export interface VaultStateSC {
  total_staked: number;
  yield_earned: number;
  total_donated: number;
  last_update: number;
  active: boolean;
}

export async function stakeVault(
  callerAddress: string,
  groupId: number,
  amountXlm: number
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(1000);
    return;
  }

  const amountStroops = Math.round(amountXlm * 10_000_000);
  const tx = await buildTx(
    callerAddress,
    'stake',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal(),
    StellarSdk.nativeToScVal(amountStroops, { type: 'i128' })
  );
  await signAndSubmit(tx);
}

export async function withdrawVault(
  callerAddress: string,
  groupId: number,
  amountXlm: number
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(1000);
    return;
  }

  const amountStroops = Math.round(amountXlm * 10_000_000);
  const tx = await buildTx(
    callerAddress,
    'withdraw',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal(),
    StellarSdk.nativeToScVal(amountStroops, { type: 'i128' })
  );
  await signAndSubmit(tx);
}

export async function getVault(
  callerAddress: string,
  groupId: number
): Promise<VaultStateSC | null> {
  if (isDemoMode()) {
    return {
      total_staked: 0,
      yield_earned: 0,
      total_donated: 0,
      last_update: Date.now(),
      active: false,
    };
  }

  try {
    const result = await readOnly(
      callerAddress,
      'get_vault',
      StellarSdk.nativeToScVal(groupId, { type: 'u64' })
    );
    const native = StellarSdk.scValToNative(result) as Record<string, unknown>;
    if (!native) return null;
    
    return {
      total_staked: Number(native.total_staked) / 10_000_000,
      yield_earned: Number(native.yield_earned) / 10_000_000,
      total_donated: Number(native.total_donated || 0) / 10_000_000,
      last_update: Number(native.last_update) * 1000, // s -> ms
      active: Boolean(native.active),
    };
  } catch (err) {
    if (!isNonExistentFunctionError(err)) console.warn('Failed to get vault:', err);
    return null;
  }
}

export async function donateVaultYield(
  callerAddress: string,
  groupId: number,
  amountXlm: number,
  donationAddress: string
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(1000);
    return;
  }

  const amountStroops = Math.round(amountXlm * 10_000_000);
  const tx = await buildTx(
    callerAddress,
    'donate_yield',
    StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
    StellarSdk.Address.fromString(callerAddress).toScVal(),
    StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
    StellarSdk.Address.fromString(donationAddress).toScVal()
  );
  await signAndSubmit(tx);
}

// ─────────────────────────────────────────────
//  GAMIFICATION (BADGES)
// ─────────────────────────────────────────────

export async function getBadges(
  callerAddress: string,
  userAddress: string
): Promise<number[]> {
  if (isDemoMode()) {
    // Demo mode: Random badges
    const allBadges = [1, 2, 3];
    return [allBadges[Math.floor(Math.random() * allBadges.length)]];
  }

  try {
    const result = await readOnly(
      callerAddress,
      'get_badges',
      StellarSdk.Address.fromString(userAddress).toScVal()
    );

    const native = StellarSdk.scValToNative(result);
    if (!Array.isArray(native)) return [];
    
    return native.map(Number);
  } catch (err) {
    // Deployed contract may not have get_badges (older deploy); fail silently
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('non-existent contract function') && !msg.includes('MissingValue')) {
      console.warn('getBadges:', msg);
    }
    return [];
  }
}

export async function awardBadge(
  callerAddress: string,
  userAddress: string,
  badgeId: number
): Promise<void> {
  if (isDemoMode()) {
    await demoDelay(500);
    return;
  }

  const tx = await buildTx(
    callerAddress,
    'award_badge',
    StellarSdk.Address.fromString(userAddress).toScVal(),
    StellarSdk.nativeToScVal(badgeId, { type: 'u32' })
  );
  await signAndSubmit(tx);
}

// ─────────────────────────────────────────────
//  REWARD TOKEN (SPLT)
// ─────────────────────────────────────────────

/** Fetch SPLT (StellarSplit Reward Token) balance for a user. */
export async function getSPLTBalance(userAddress: string): Promise<number> {
  if (isDemoMode()) return 1200; // Mock SPLT
  
  try {
    const spltContract = new StellarSdk.Contract(SPLT_CONTRACT_ID);
    const account = await server.getAccount(userAddress);
    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    txBuilder.addOperation(spltContract.call('balance', StellarSdk.Address.fromString(userAddress).toScVal()));
    const tx = txBuilder.build();
    const simulated = await server.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
      return Number(StellarSdk.scValToNative(simulated.result.retval));
    }
  } catch (err) {
    console.warn('SPLT balance fetch failed:', err);
  }
  return 0;
}
