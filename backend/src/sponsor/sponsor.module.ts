import { Module } from '@nestjs/common';
import { SponsorController } from './sponsor.controller';
import { SponsorService } from './sponsor.service';

/**
 * SponsorModule — fee-bump ("gasless") transaction sponsorship.
 *
 * Exposes POST /sponsor/fee-bump. The sponsor account's secret key lives in
 * env (SPONSOR_SECRET_KEY). If unset, the service degrades gracefully —
 * callers get a 503 with a clear message; the rest of the API is unaffected.
 */
@Module({
  controllers: [SponsorController],
  providers: [SponsorService],
  exports: [SponsorService],
})
export class SponsorModule {}
