import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../observability/metrics';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    // Normalise route: strip UUIDs + numeric IDs to avoid high-cardinality labels
    const route = (req.route?.path as string | undefined) ?? req.url.replace(/\/[0-9a-f-]{8,}/gi, '/:id');

    return next.handle().pipe(
      tap(() => {
        const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
        const labels = { method: req.method, route, status_code: String(res.statusCode) };
        httpRequestDuration.observe(labels, durationSec);
        httpRequestTotal.inc(labels);
      }),
    );
  }
}
