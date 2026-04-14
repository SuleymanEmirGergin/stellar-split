import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as StellarSdk from '@stellar/stellar-sdk';
import Redis from 'ioredis';
import { EventsService } from '../events/events.service';

const LAST_LEDGER_KEY = 'soroban:last_ledger';

const TOPIC_TO_EVENT: Record<string, string> = {
  add_expense: 'expense:added',
  settle_group: 'settlement:confirmed',
  add_member: 'member:joined',
  mint: 'token:minted',
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
        } catch {
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
          } catch { /* ignore */ }
        }

        let payload: Record<string, unknown> = {};
        try {
          payload = StellarSdk.scValToNative(event.value) as Record<string, unknown>;
        } catch { /* ignore */ }

        await this.eventsService.publish({
          type: eventType as import('../events/events.service').GroupEvent['type'],
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
