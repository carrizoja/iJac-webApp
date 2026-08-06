import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ApiEnvironment } from './config/env';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { Reflector } from '@nestjs/core';

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService<ApiEnvironment>);
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new FirebaseAuthGuard(reflector, config));
  const corsOrigin = config.getOrThrow('CORS_ORIGIN');

  // Support both configured origin and localhost on any port for development
  const corsOriginValue =
    process.env.NODE_ENV === 'development'
      ? /^http:\/\/localhost:\d+$/
      : corsOrigin;

  app.enableCors({
    origin: corsOriginValue,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.use((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['requestId'] = crypto.randomUUID();
    next();
  });

  const port = config.get('PORT', 3001);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
  console.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
