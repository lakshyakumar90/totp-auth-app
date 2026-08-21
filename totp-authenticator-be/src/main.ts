import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Safety net: Express JSON.stringify throws on BigInt. Serialize as string
  // instead of crashing the response (e.g. Prisma BigInt fields).
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON =
    function () {
      return this.toString();
    };

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  // Bind explicitly to all IPv4 interfaces so phones on the LAN can reach the
  // API (a bare listen(port) can end up IPv6-only on some Windows setups).
  await app.listen(port, '0.0.0.0');
  console.log(`TOTP authenticator API running on http://localhost:${port}/api`);
}
void bootstrap();