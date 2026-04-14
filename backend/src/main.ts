import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { initSentry } from './common/observability/sentry';

async function bootstrap() {
  // Initialize Sentry before anything else (no-op if SENTRY_DSN is not set)
  initSentry();

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

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter (consistent error shape)
  app.useGlobalFilters(new HttpExceptionFilter());

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
      .addServer('http://localhost:3001', 'Local development')
      .addServer('https://api.stellarsplit.app', 'Production')
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
    SwaggerModule.setup('api/docs', app, document, {
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

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  app.get(Logger).log(`StellarSplit API listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
