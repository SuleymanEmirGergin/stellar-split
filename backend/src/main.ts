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
  app.use(helmet());

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

  // Swagger API docs
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('StellarSplit API')
      .setDescription('Decentralized group expense splitting — backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  app.get(Logger).log(`StellarSplit API listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
