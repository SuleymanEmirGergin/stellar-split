import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';

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
  constructor(private readonly analyticsService: AnalyticsService) {}

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
}
