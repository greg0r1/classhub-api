import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
    origin: ['http://localhost:4200', 'http://localhost:8080'], // URLs de votre app Angular (dev + docker)
    credentials: true,
  });

  // Configuration Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('ClassHub API')
    .setDescription(
      'API REST pour la gestion des présences et abonnements dans les clubs sportifs.\n\n' +
        '## Fonctionnalités\n\n' +
        '- **Multi-tenant** : Isolation complète des données par organisation\n' +
        '- **Authentification JWT** : Sécurité avec tokens expirables\n' +
        '- **RBAC** : Gestion des rôles (Admin, Coach, Membre)\n' +
        '- **Cours récurrents** : Génération automatique avec système parent/enfant\n' +
        '- **Double présence** : Intention + Présence effective\n' +
        '- **Abonnements flexibles** : Types personnalisables avec paiements\n' +
        '- **Audit trail** : Traçabilité complète RGPD\n' +
        '- **Statistiques** : Taux de présence, occupation, revenus\n\n' +
        '## Sécurité\n\n' +
        '1. JWT Authentication (Passport)\n' +
        '2. Guards (JwtAuthGuard, RolesGuard)\n' +
        '3. Multi-tenant Interceptor\n' +
        '4. Audit Interceptor\n' +
        '5. Database constraints\n\n' +
        '## Pour commencer\n\n' +
        '1. Créer une organisation\n' +
        '2. S\'inscrire avec POST /auth/register\n' +
        '3. Se connecter avec POST /auth/login pour obtenir un JWT\n' +
        '4. Ajouter le token dans Authorization: Bearer <token>\n' +
        '5. Utiliser les endpoints protégés',
    )
    .setVersion('1.0')
    .setContact(
      'Gregory DERNAUCOURT',
      'https://github.com/greg0r1/classhub-api',
      '',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('auth', 'Authentification et gestion des tokens JWT')
    .addTag('organizations', 'Gestion des clubs sportifs (multi-tenant)')
    .addTag('users', 'Gestion des utilisateurs (admins, coachs, membres)')
    .addTag('courses', 'Gestion des cours avec récurrence')
    .addTag('attendances', 'Intentions de présence et présences effectives')
    .addTag('subscriptions', 'Abonnements et paiements')
    .addTag('audit-logs', 'Traçabilité et conformité RGPD')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Entrez votre token JWT (obtenu via /auth/login)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Développement local')
    .addServer('https://api.classhub.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'ClassHub API - Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 36px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application démarrée sur http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📚 Documentation Swagger disponible sur http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
