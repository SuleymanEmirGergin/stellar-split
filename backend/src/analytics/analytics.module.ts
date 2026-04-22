import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LeaderboardService } from './leaderboard.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, LeaderboardService],
  exports: [AnalyticsService, LeaderboardService],
})
export class AnalyticsModule {}
