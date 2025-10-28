import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non définies dans le DTO
      forbidNonWhitelisted: true, // Rejette la requête si des propriétés inconnues sont envoyées
      transform: true, // Transforme automatiquement les types (string -> number, etc.)
    }),
  );

  // CORS (pour votre frontend Angular)
  app.enableCors({
    origin: 'http://localhost:4200', // URL de votre app Angular
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application démarrée sur http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
