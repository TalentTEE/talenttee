import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'https://talenttee-sepia.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[];
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });
  } else {
    // Development: allow all origins (Cloudflare tunnels, ngrok, etc.)
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
