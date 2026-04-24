import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as StellarSdk from '@stellar/stellar-sdk';
import Redis from 'ioredis';
import { EventsService } from '../events/events.service';

const LAST_LEDGER_KEY = 'soroban:last_ledger';

/**
 * Maps Soroban contract event topic[0] (Symbol string) → GroupEvent.type.
 *
 * Keys are the exact Symbol strings the contracts publish (verified against
 * contracts/stellar_split/src/lib.rs env.events().publish() call-sites).
 * Values are the GroupEvent union members declared in events.service.ts.
 *
 * Unmapped topics are silently skipped — the poller stays forward-compatible
 * with future contract upgrades without requiring a deploy.
 */
const TOPIC_TO_EVENT: Record<string, import('../events/events.service').GroupEvent['type']> = {
  // ── Core group lifecycle (lib.rs: create_group, settle_group) ──────────
  group_created:        'group:created',
  group_settled:        'group:settled',

  // ── Expenses (lib.rs: add_expense, cancel_last_expense) ───────────────
  expense_added:        'expense:added',
  expense_cancelled:    'expense:cancelled',

  // ── Members (lib.rs: add_member, remove_member) ───────────────────────
  member_added:         'member:joined',
  member_removed:       'member:left',

  // ── Tokens & rewards (lib.rs: settle_group reward + register_referral) ─
  reward_minted:        'reward:minted',
  referral_rewarded:    'referral:rewarded',

  // ── Admin / config (lib.rs: init_admin, set_reward_token, set_swap_*) ──
  admin_initialised:    'admin:initialised',
  reward_token_set:     'admin:reward_token_set',
  swap_router_set:      'admin:swap_router_set',
  swap_factory_set:     'admin:swap_factory_set',

  // ── Multi-currency settle (lib.rs: settle_group_flex) ─────────────────
  multi_currency_settle:'settle:multi_currency',

  // ── Social recovery (lib.rs: set_guardians / initiate / approve) ──────
  guardians_set:        'recovery:guardians_set',
  recovery_initiated:   'recovery:initiated',
  recovery_approved:    'recovery:approved',

  // ── DeFi vault (lib.rs: stake, withdraw, donate_yield) ────────────────
  vault_staked:         'vault:staked',
  vault_withdrawn:      'vault:withdrawn',
  yield_donated:        'vault:yield_donated',

  // ── Savings pool (lib.rs: create_savings_pool, contribute_pool, …) ────
  pool_created:         'pool:created',
  pool_contributed:     'pool:contributed',
  pool_goal_reached:    'pool:goal_reached',
  pool_released:        'pool:released',

  // ── Gamification (lib.rs: award_badge) ────────────────────────────────
  badge_awarded:        'badge:awarded',

  // ── SPLT token contract (stellar_split_token/src/lib.rs: mint) ────────
  mint:                 'token:minted',
};

@Injectable()
export class SorobanEventPollerService {
  private readonly logger = new Logger(SorobanEventPollerService.name);
  private readonly rpcServer: StellarSdk.rpc.Server;
  private readonly redis: Redis;
  private readonly contractIds: string[];

  constructor(
    private readonly config: ConfigService,
    private readonly eventsService: EventsService,
  ) {
    const rpcUrl = config.get<string>('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');
    this.rpcServer = new StellarSdk.rpc.Server(rpcUrl);

    const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl);

    const ids = [
      config.get<string>('SOROBAN_CONTRACT_ID'),
      config.get<string>('SOROBAN_TOKEN_CONTRACT_ID'),
    ].filter(Boolean) as string[];
    this.contractIds = ids;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async pollContractEvents(): Promise<void> {
    if (this.contractIds.length === 0) return;

    try {
      const lastLedgerStr = await this.redis.get(LAST_LEDGER_KEY);
      const startLedger = lastLedgerStr ? parseInt(lastLedgerStr, 10) + 1 : undefined;

      const response = await this.rpcServer.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: this.contractIds,
          },
        ],
        limit: 100,
      });

      if (!response.events || response.events.length === 0) return;

      let maxLedger = startLedger ?? 0;

      for (const event of response.events) {
        const ledger = event.ledger;
        if (ledger > maxLedger) maxLedger = ledger;

        const topic0 = event.topic[0];
        if (!topic0) continue;

        let topicStr: string;
        try {
          topicStr = StellarSdk.scValToNative(topic0) as string;
        } catch (err) {
          this.logger.warn({ ledger, txHash: event.txHash, err: String(err) }, 'Soroban: failed to decode topic[0] — skipping event');
          continue;
        }

        const eventType = TOPIC_TO_EVENT[topicStr];
        if (!eventType) continue;

        // Extract groupId from topic[1] (Symbol) if present, else use contract id
        let groupId: string = (event.contractId as unknown as string) ?? 'unknown';
        if (event.topic[1]) {
          try {
            const t1 = StellarSdk.scValToNative(event.topic[1]);
            if (typeof t1 === 'string') groupId = t1;
          } catch (err) {
            this.logger.warn({ ledger, txHash: event.txHash, err: String(err) }, 'Soroban: failed to decode topic[1] — using contractId as groupId');
          }
        }

        let payload: Record<string, unknown> = {};
        try {
          payload = StellarSdk.scValToNative(event.value) as Record<string, unknown>;
        } catch (err) {
          this.logger.warn({ ledger, txHash: event.txHash, eventType, err: String(err) }, 'Soroban: failed to decode event value — publishing with empty payload');
        }

        await this.eventsService.publish({
          type: eventType,
          groupId,
          payload: { ...payload, _ledger: ledger, _txHash: event.txHash },
          ts: Date.now(),
        });

        this.logger.debug({ eventType, groupId, ledger }, 'Soroban event forwarded to SSE');
      }

      if (maxLedger > 0) {
        await this.redis.set(LAST_LEDGER_KEY, String(maxLedger));
      }
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'Soroban event poll failed');
    }
  }
}
