import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SettlementsModule } from './settlements/settlements.module';
import { RecurringModule } from './recurring/recurring.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReputationModule } from './reputation/reputation.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';
import { StellarModule } from './stellar/stellar.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { GuardiansModule } from './guardians/guardians.module';
import { WorkersModule } from './workers/workers.module';
import { EventsModule } from './events/events.module';
import { AuditModule } from './audit/audit.module';
import { buildRedisConnectionOptions, parseRedisUrl } from './common/config/redis-config';
import { MetricsModule } from './metrics/metrics.module';
import { UsersModule } from './users/users.module';
import { GovernanceModule } from './governance/governance.module';
import { PaymentRequestsModule } from './payment-requests/payment-requests.module';
import { ReferralModule } from './referral/referral.module';
import { SavingsModule } from './savings/savings.module';
import { SponsorModule } from './sponsor/sponsor.module';

@Module({
  imports: [
    // Config — load .env and validate required variables at startup
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      validate: (config) => require('./common/config/env.validation').validateEnv(config),
    }),

    // Pino structured logging
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          transport:
            config.get<string>('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          genReqId: (req) =>
            (req.headers['x-request-id'] as string) || crypto.randomUUID(),
          customProps: () => ({
            service: config.get<string>('SERVICE_NAME', 'stellarsplit-api'),
          }),
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 60),
          },
        ],
      }),
    }),

    // Redis cache — global, TTL 60s default (key-level TTL overrides this).
    // Reads REDIS_URL via parseRedisUrl so it picks up Railway's reference
    // variable (which only injects REDIS_URL, not the legacy REDIS_HOST /
    // REDIS_PORT pair). When the connection ever fails on bootstrap we
    // fall back to in-memory caching so a missing Redis can't take the
    // whole app offline.
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const rawUrl = config.get<string>('REDIS_URL', '');
        if (!rawUrl) {
          // Memory store — no socket. Cache still works, just isn't shared
          // across replicas. Better than crashing on bootstrap.
          return { ttl: 60 * 1000 };
        }
        try {
          const parsed = parseRedisUrl(rawUrl);
          return {
            store: await redisStore({
              socket: {
                host: parsed.host,
                port: parsed.port,
                // Stop reconnecting after 5 failed attempts — same cap as
                // the BullMQ + soroban-event-poller paths use, so a missing
                // Redis doesn't generate three independent retry storms.
                reconnectStrategy: (retries: number) =>
                  retries > 5 ? false : Math.min(retries * 200, 2000),
              },
              ...(parsed.password ? { password: parsed.password } : {}),
              ...(parsed.username ? { username: parsed.username } : {}),
            }),
            ttl: 60 * 1000,
          };
        } catch {
          // URL parse failed or redisStore handshake threw — degrade to
          // in-memory rather than aborting bootstrap.
          return { ttl: 60 * 1000 };
        }
      },
    }),

    // BullMQ
    // NOTE: BullMQ 5.x (ioredis 5.x) ConnectionOptions does not accept
    // `{ url }` — we must parse the URL into host/port/auth fields.
    // Using a tiny helper so the factory stays a pure function without
    // importing `new URL()` awkwardly inside the class decorator.
    // BullMQ root config. The connection options now come from the shared
    // Redis helper (common/config/redis-config) so the resilience tweaks
    // (capped retryStrategy, lazyConnect, enableOfflineQueue=false) apply
    // here too — without them a missing Redis was floor-flooding the event
    // loop hard enough to time out Railway's healthcheck proxy.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return {
          connection: buildRedisConnectionOptions(rawUrl, 'bullmq'),
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            // Keep failed jobs longer for DLQ inspection
            removeOnFail: false,
          },
        };
      },
    }),

    // Feature modules
    PrismaModule,
    AuthModule,
    GroupsModule,
    ExpensesModule,
    SettlementsModule,
    RecurringModule,
    NotificationsModule,
    ReputationModule,
    UploadsModule,
    HealthModule,
    StellarModule,
    AnalyticsModule,
    GuardiansModule,
    WorkersModule,
    EventsModule,
    AuditModule,
    MetricsModule,
    UsersModule,
    GovernanceModule,
    PaymentRequestsModule,
    ReferralModule,
    SavingsModule,
    SponsorModule,
  ],
  providers: [
    // Apply JWT auth globally — @Public() bypasses it
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply throttler globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
