// IMPORTANT: `./instrument` must be the VERY FIRST import — it calls
// Sentry.init() at module-load time, before NestJS patches Node internals.
// Per https://docs.sentry.io/platforms/javascript/guides/nestjs/
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

async function bootstrap() {

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured logging via Pino
  app.useLogger(app.get(Logger));

  // Cookie parser for refresh-token HttpOnly cookie
  app.use(cookieParser());

  // Security headers
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      // Strict CSP for production: API serves JSON only, no embedded resources needed.
      // Dev relaxes CSP so Swagger UI (inline scripts/styles) can load.
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
              formAction: ["'none'"],
            },
          }
        : false,
      // Never allow this API to be embedded in a frame
      frameguard: { action: 'deny' },
      // Hide Express fingerprint
      hidePoweredBy: true,
      // Strict referrer policy
      referrerPolicy: { policy: 'no-referrer' },
      // HSTS: 1 year, include subdomains (prod only — avoids breaking local HTTP)
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // Echo X-Request-ID back in every response for log correlation
  app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    res.setHeader('X-Request-ID', id);
    next();
  });

  // CORS — allow frontend origin only
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // API versioning — URI-based: /api/v1/groups, /api/v2/groups …
  // Health (/health/live, /health/ready) and Metrics (/metrics) are excluded
  // from the global prefix so Railway healthchecks and Prometheus scraping
  // can hit them without config changes.
  //
  // We list every health route explicitly because path-to-regexp v6+
  // (shipped with the latest NestJS) no longer accepts the legacy
  // unnamed-wildcard syntax `health/(.*)`. Listing each path is more
  // verbose but unambiguous — and the auto-convert NestJS prints to
  // stderr produced a regex Railway's healthcheck proxy couldn't reach,
  // taking the whole deployment down with "Application not found" 404s
  // even though /health/live was technically wired in the Nest router.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/live', method: RequestMethod.ALL },
      { path: 'health/ready', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
    ],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filters — Prisma errors FIRST (specific), then HTTP catch-all
  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());

  // Global response interceptor (consistent success shape)
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Prometheus request duration + counter metrics
  app.useGlobalInterceptors(new MetricsInterceptor());

  // Swagger API docs — enabled in development, or when SWAGGER_ENABLED=true (e.g. staging)
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('StellarSplit API')
      .setDescription(
        `## Overview
Decentralized group expense splitting on the Stellar blockchain.

## Authentication flow
1. \`GET /auth/challenge\` — receive a one-time nonce
2. Sign the nonce with Freighter wallet (Sign-In With Stellar)
3. \`POST /auth/verify\` — receive \`accessToken\` (JWT Bearer) + \`refresh_token\` (HttpOnly cookie)
4. Use \`Authorization: Bearer <accessToken>\` on all protected endpoints
5. \`POST /auth/refresh\` — silently renew using the HttpOnly cookie

## Response envelope
Every response is wrapped:
\`\`\`json
{ "success": true,  "data": { ... }, "error": null }
{ "success": false, "data": null,   "error": { "statusCode": 403, "message": "...", "timestamp": "...", "path": "..." } }
\`\`\`

## Rate limits
Auth endpoints are throttled to **10 requests / 60 s** per IP.`,
      )
      .setVersion('1.0')
      .setContact('StellarSplit', 'https://github.com/SuleymanEmirGergin/stellar-split', '')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3001/api/v1', 'Local development')
      .addServer('https://api.stellarsplit.app/api/v1', 'Production')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /auth/verify (expires in 15 min)',
        },
        'access-token',
      )
      .addCookieAuth(
        'refresh_token',
        {
          type: 'apiKey',
          in: 'cookie',
          description: 'HttpOnly refresh token — set automatically by POST /auth/verify',
        },
        'refresh-cookie',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    // With setGlobalPrefix('api'), NestJS serves Swagger at /api/docs automatically
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
      },
      customSiteTitle: 'StellarSplit API Docs',
    });
  }

  // Bind to 0.0.0.0 so the container's reverse proxy (Railway, Fly, Docker
  // Compose, K8s ingress, etc.) can reach the app from outside. Default
  // Nest/Express bind is localhost only — the process is up but the Railway
  // healthcheck against /health/live gets "service unavailable" because the
  // listener isn't reachable from the container's external network.
  // Default to 8080 — matches Railway's auto-domain routing convention.
  // The Dockerfile also sets ENV PORT=8080 as a belt-and-braces guard for
  // older Railway projects that don't auto-inject the variable. If Railway
  // (or any other host) does inject PORT, that value wins because the env
  // takes precedence over the JS fallback.
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  await app.listen(port, '0.0.0.0');
  // Plain console.log instead of nestjs-pino's Logger so this line shows
  // up in Railway logs even if the LoggerModule has been pruned during
  // bootstrap. The previous "Mapped { … }" lines stop short of confirming
  // the actual `listen` call returned, which made it impossible to tell
  // from logs alone whether the deploy was healthcheck-bound or stuck.
  // eslint-disable-next-line no-console
  console.log(`[Bootstrap] StellarSplit API listening on 0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
