import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';
import { LeaderboardService } from './leaderboard.service';

class TrackEventBodyDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Public()
  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest analytics event (fire-and-forget)' })
  track(@Body() dto: TrackEventBodyDto) {
    // Intentionally not awaited — fire and forget
    void this.analyticsService.track(dto);
    return { queued: true };
  }

  @Public()
  @Get('summary')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: 'Aggregated public dashboard stats (totals, DAU/WAU/MAU, volume, 14-day trend)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cached for 60s. Counts are network-wide; volume is in XLM.',
  })
  getSummary() {
    return this.analyticsService.getSummary();
  }

  @Public()
  @Get('leaderboard')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: 'Top SPLT holders (= top settlers) with optional own-rank lookup',
  })
  @ApiQuery({
    name: 'wallet',
    required: false,
    description: 'When provided, populates yourRank for the given Stellar address.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size for the top list. Default 10, max 50.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cached for 5 minutes. Ranks based on confirmed settle_group calls × 100 SPLT.',
  })
  getLeaderboard(
    @Query('wallet') wallet?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.leaderboardService.getLeaderboard({
      wallet,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }
}
