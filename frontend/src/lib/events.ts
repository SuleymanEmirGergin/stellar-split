import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
type Server = rpc.Server;

const POLL_INTERVAL_MS = 8000;
const RELEVANT_TOPICS = ['expense_added', 'expense_cancelled', 'group_settled', 'member_added'];

/**
 * Polls Soroban contract events for a group and calls onUpdate when expense_added,
 * expense_cancelled, group_settled, or member_added is seen for the given groupId.
 * Returns a cleanup function to stop polling.
 */
export function subscribeGroupEvents(
  server: Server,
  contractId: string,
  groupId: number,
  onUpdate: () => void
): () => void {
  let lastLedger = 0;
  let cancelled = false;

  const poll = async () => {
    if (cancelled) return;
    try {
      const ledgerRes = await server.getLatestLedger();
      const currentLedger = (ledgerRes as { sequence: number }).sequence;
      if (currentLedger == null) return;

      const startLedger = lastLedger > 0 ? lastLedger + 1 : Math.max(1, currentLedger - 10);
      if (startLedger > currentLedger) {
        lastLedger = currentLedger;
        return;
      }

      const res = await server.getEvents({
        filters: [{ type: 'contract', contractIds: [contractId] }],
        startLedger,
        endLedger: currentLedger + 1,
        limit: 50,
      });

      const events = (res as { events: { topic: StellarSdk.xdr.ScVal[] }[] }).events ?? [];
      for (const ev of events) {
        if (cancelled) return;
        const topic = ev.topic;
        if (!topic || topic.length < 2) continue;
        try {
          const name = StellarSdk.scValToNative(topic[0]);
          const evGroupId = StellarSdk.scValToNative(topic[1]);
          if (RELEVANT_TOPICS.includes(String(name)) && Number(evGroupId) === groupId) {
            onUpdate();
            break;
          }
        } catch {
          // ignore parse errors
        }
      }

      lastLedger = currentLedger;
    } catch {
      // ignore RPC errors (e.g. offline)
    }
  };

  const interval = setInterval(poll, POLL_INTERVAL_MS);
  poll();

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}
