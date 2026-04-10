import { Controller, Get, Res, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { metricsRegistry } from '../common/observability/metrics';
import { Public } from '../common/decorators/public.decorator';

/**
 * GET /metrics — Prometheus scrape endpoint.
 *
 * Protected by a shared scrape secret (METRICS_SECRET env var).
 * Set this secret in your Prometheus scrape_configs as a Bearer token or
 * query param: GET /metrics?token=<METRICS_SECRET>
 *
 * If METRICS_SECRET is not set, the endpoint is open (dev convenience only).
 */
@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  @ApiExcludeEndpoint() // Don't expose in Swagger UI
  @ApiOperation({ summary: 'Prometheus metrics scrape endpoint' })
  async getMetrics(@Res() res: Response): Promise<void> {
    const secret = process.env.METRICS_SECRET;
    if (secret) {
      const provided =
        (res.req.headers['authorization'] as string | undefined)?.replace('Bearer ', '') ??
        (res.req.query?.['token'] as string | undefined);
      if (provided !== secret) throw new ForbiddenException('Invalid metrics secret');
    }

    const metrics = await metricsRegistry.metrics();
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(metrics);
  }
}
