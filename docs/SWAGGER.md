# Documentation Swagger/OpenAPI - Guide Complet

## Accès à la documentation

Une fois l'application démarrée, la documentation interactive Swagger est accessible à :

**🔗 Interface Swagger UI** : [http://localhost:3000/api](http://localhost:3000/api)

**📄 JSON OpenAPI** : [http://localhost:3000/api-json](http://localhost:3000/api-json)

> **Note** : Si vous utilisez Docker, assurez-vous que le conteneur `classhub-api` est bien démarré et en état "healthy" (`docker-compose ps`). Le lien JSON OpenAPI est utilisé pour générer des clients API automatiquement.

---

## 🚀 Démarrage Rapide

### 🔐 Workflow d'Authentification

```
1. POST /auth/register ou POST /auth/login
   → Créer un compte ou se connecter
   → Récupérer le access_token de la réponse

2. Cliquer sur "Authorize" 🔓 en haut à droite
   → Coller le token (SANS le préfixe "Bearer")
   → Cliquer sur "Authorize"
   → Le bouton devient 🔒

3. GET /auth/me
   → Vérifier que l'authentification fonctionne

4. Utiliser tous les endpoints protégés 🔒
```

---

## 📋 Organisation de l'API

### Tags disponibles

- **auth** : Authentification et gestion des tokens JWT
- **organizations** : Gestion des clubs sportifs (multi-tenant)
- **users** : Gestion des utilisateurs (admins, coachs, membres)
- **courses** : Gestion des cours avec système de récurrence
- **attendances** : Intentions de présence et présences effectives
- **subscriptions** : Abonnements et gestion des paiements
- **audit-logs** : Traçabilité complète et conformité RGPD

---

## 🏢 Architecture Multi-Tenant

L'API ClassHub est **multi-tenant** : chaque organisation a ses données isolées.

### Comment ça fonctionne ?

1. **Lors du login** : Le token JWT contient automatiquement votre `organization_id`
2. **À chaque requête** : L'API extrait l'organization_id du token
3. **Filtrage automatique** : Toutes les données retournées sont filtrées par votre organisation
4. **Isolation garantie** : Impossible d'accéder aux données d'une autre organisation

**Vous n'avez rien à faire** : le système est transparent et automatique ! 🎉

---

## 📝 Documentation Détaillée des DTOs

### Enrichir les DTOs avec @ApiProperty

Tous les DTOs de ClassHub utilisent `@ApiProperty` pour une documentation complète :

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsISO8601, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Titre du cours',
    example: 'Krav Maga - Techniques avancées',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Description détaillée du cours',
    example: 'Focus sur les défenses contre armes blanches et situations de stress',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Date et heure de début du cours',
    example: '2025-11-05T19:00:00Z',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  start_datetime: string;

  @ApiPropertyOptional({
    description: 'Capacité maximale du cours',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_capacity?: number;

  @ApiProperty({
    description: 'Cours récurrent ou ponctuel',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_recurring: boolean = false;

  @ApiPropertyOptional({
    description: 'Règle de récurrence pour les cours répétés',
    type: 'object',
    example: {
      frequency: 'weekly',
      day_of_week: 1,
      interval: 1,
      end_date: '2026-06-30'
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrence_rule?: RecurrenceRuleDto;
}
```

### Avantages

- ✅ **Descriptions claires** en français
- ✅ **Exemples réalistes** pour chaque propriété
- ✅ **Contraintes de validation** documentées (min, max, format)
- ✅ **Types précis** (uuid, date-time, email, etc.)
- ✅ **Valeurs par défaut** visibles

---

## 🔴 Gestion Complète des Erreurs

Tous les endpoints documentent les codes d'erreur standardisés :

### Codes HTTP Documentés

| Code | Description | Exemple |
|------|-------------|---------|
| **200** | Succès (GET, PATCH) | Ressource trouvée et retournée |
| **201** | Créé (POST) | Ressource créée avec succès |
| **204** | Pas de contenu (DELETE) | Suppression réussie |
| **400** | Requête invalide | Validation échouée, données manquantes |
| **401** | Non authentifié | Token manquant ou invalide |
| **403** | Accès interdit | Permissions insuffisantes |
| **404** | Non trouvé | Ressource inexistante |
| **500** | Erreur serveur | Erreur interne inattendue |

### Exemples de Réponses d'Erreur

#### 400 - Validation Échouée

```json
{
  "statusCode": 400,
  "message": [
    "title must be longer than 2 characters",
    "start_datetime must be a valid ISO 8601 date string",
    "max_capacity must be a positive number"
  ],
  "error": "Bad Request"
}
```

#### 401 - Non Authentifié

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 - Permissions Insuffisantes

```json
{
  "statusCode": 403,
  "message": "Forbidden - Seuls les coachs et admins peuvent créer des cours",
  "error": "Forbidden"
}
```

#### 404 - Ressource Non Trouvée

```json
{
  "statusCode": 404,
  "message": "Course not found",
  "error": "Not Found"
}
```

---

## 🔍 Query Parameters et Filtres

### Exemple : Liste des Cours avec Filtres

Les endpoints de liste supportent filtrage, tri et pagination :

```typescript
@Get()
@ApiOperation({ summary: 'Liste des cours avec filtres' })
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Numéro de page (commence à 1)',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Nombre d\'éléments par page',
  example: 20,
})
@ApiQuery({
  name: 'status',
  required: false,
  enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
  description: 'Filtrer par statut',
})
@ApiQuery({
  name: 'coach_id',
  required: false,
  type: String,
  format: 'uuid',
  description: 'Filtrer par ID du coach',
})
@ApiQuery({
  name: 'start_date',
  required: false,
  type: String,
  format: 'date',
  description: 'Date de début pour filtrer (YYYY-MM-DD)',
  example: '2025-11-01',
})
@ApiResponse({
  status: 200,
  description: 'Liste paginée des cours',
  schema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/Course' }
      },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 156 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 20 },
          totalPages: { type: 'number', example: 8 }
        }
      }
    }
  }
})
```

---

## 🎯 Path Parameters

Documentation des paramètres de route :

```typescript
@Get(':id')
@ApiParam({
  name: 'id',
  type: String,
  format: 'uuid',
  description: 'ID unique du cours',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
@ApiResponse({
  status: 200,
  description: 'Cours trouvé',
  schema: {
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Krav Maga - Techniques avancées',
      // ... autres propriétés
    }
  }
})
@ApiResponse({
  status: 404,
  description: 'Cours introuvable',
  schema: {
    example: {
      statusCode: 404,
      message: 'Course not found',
      error: 'Not Found'
    }
  }
})
async findOne(@Param('id') id: string) {
  // ...
}
```

---

## 🛡️ Rôles et Permissions

### Endpoints par Rôle

| Endpoint | Admin | Coach | Member |
|----------|-------|-------|--------|
| **POST /courses** | ✅ | ✅ | ❌ |
| **PATCH /courses/:id** | ✅ | ✅ (ses cours) | ❌ |
| **DELETE /users/:id** | ✅ | ❌ | ❌ |
| **GET /audit-logs** | ✅ | ❌ | ❌ |
| **POST /attendances/intention** | ✅ | ✅ | ✅ |

### Documentation des Permissions

Les endpoints protégés par rôle sont documentés avec `@ApiBearerAuth` et des réponses 403 explicites :

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'coach')
@ApiBearerAuth('JWT-auth')
@ApiOperation({
  summary: 'Créer un cours (Admin/Coach uniquement)',
  description: 'Seuls les administrateurs et coachs peuvent créer des cours.'
})
@ApiResponse({ status: 201, description: 'Cours créé avec succès' })
@ApiResponse({
  status: 403,
  description: 'Accès refusé - Rôle admin ou coach requis',
  schema: {
    example: {
      statusCode: 403,
      message: 'Forbidden - Insufficient permissions',
      error: 'Forbidden'
    }
  }
})
create(@Body() dto: CreateCourseDto) {
  // ...
}
```

---

## 📊 Exemples de Réponses Complètes

### Statistiques d'un Adhérent

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Marc Dupont",
  "email": "marc.dupont@example.com",
  "total_courses_available": 48,
  "total_attended": 37,
  "attendance_rate": 77.08,
  "attendance_rate_30d": 80.00,
  "last_attendance": "2025-10-25T19:30:00Z",
  "days_since_last_attendance": 1,
  "current_streak": 4,
  "longest_streak": 12,
  "intention_reliability": 92.5,
  "no_shows": 2,
  "belt_level": "Orange",
  "status": "active",
  "metadata": {
    "medical_certificate_expiry": "2026-03-15",
    "preferred_schedule": ["monday_19h", "wednesday_19h"]
  }
}
```

### Cours avec Récurrence

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "organization_id": "org-123",
  "title": "Krav Maga - Techniques avancées",
  "description": "Focus sur défense contre armes",
  "course_type": "krav-maga",
  "start_datetime": "2025-11-05T19:00:00Z",
  "end_datetime": "2025-11-05T20:30:00Z",
  "duration_minutes": 90,
  "location": "Salle 2",
  "coach_id": "coach-456",
  "coach": {
    "id": "coach-456",
    "first_name": "Sophie",
    "last_name": "Martin",
    "email": "sophie.martin@classhub.fr"
  },
  "max_capacity": 15,
  "is_recurring": true,
  "recurrence_rule": {
    "frequency": "weekly",
    "day_of_week": 2,
    "interval": 1,
    "end_date": "2026-06-30",
    "count": null
  },
  "parent_recurrence_id": null,
  "status": "scheduled",
  "created_at": "2025-10-26T10:00:00Z",
  "updated_at": "2025-10-26T10:00:00Z",
  "deleted_at": null
}
```

---

## ❌ Problèmes Courants et Solutions

### Le bouton "Authorize" ne fonctionne pas

**Symptômes** :
- Les requêtes retournent toujours 401
- Le cadenas 🔒 n'apparaît pas

**Solutions** :
1. ✅ Vérifiez que votre token est valide (pas expiré - durée de vie : 24h)
2. ✅ **N'ajoutez PAS** "Bearer" devant le token dans Swagger (il l'ajoute automatiquement)
3. ✅ Rechargez la page Swagger si nécessaire
4. ✅ Vérifiez la console du navigateur pour les erreurs

### "401 Unauthorized" sur tous les endpoints

**Causes** :
- Token absent ou invalide
- Token expiré
- Pas authentifié

**Solutions** :
1. Cliquez sur **"Authorize"** 🔓 en haut à droite
2. Collez votre token obtenu via `/auth/login`
3. Le cadenas doit apparaître 🔒
4. Si problème persiste, reconnectez-vous pour obtenir un nouveau token

### "403 Forbidden" sur certains endpoints

**Causes** :
- Permissions insuffisantes
- Rôle inadéquat

**Solutions** :
1. Vérifiez votre rôle via `GET /auth/me`
2. Certains endpoints nécessitent le rôle **admin** ou **coach**
3. Contactez un admin pour modifier votre rôle si nécessaire

### Les exemples ne correspondent pas à mes données

**C'est normal !**
- Les exemples Swagger sont **fictifs** pour la documentation
- Utilisez vos vraies données de test
- Les UUIDs, emails, dates sont des exemples génériques

### Erreur CORS lors des tests

**Solutions** :
1. Utilisez Swagger UI directement (pas de CORS)
2. Si vous utilisez un client externe, vérifiez la configuration CORS dans `main.ts`
3. L'API autorise `http://localhost:4200` par défaut (frontend Angular)

---

## 🔧 Configuration Technique

### Installation

```bash
npm install --save @nestjs/swagger
```

### Configuration dans main.ts

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('ClassHub API')
  .setDescription('API REST pour la gestion des présences et abonnements')
  .setVersion('1.0')
  .setContact('Gregory DERNAUCOURT', 'https://github.com/greg0r1/classhub-api', '')
  .setLicense('MIT', '')
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
  swaggerOptions: {
    persistAuthorization: true,  // Garde le token JWT entre les rafraîchissements
    docExpansion: 'none',        // Tout fermé par défaut
    filter: true,                // Barre de recherche activée
    tagsSorter: 'alpha',         // Trier les tags alphabétiquement
    operationsSorter: 'alpha',   // Trier les opérations
  },
});
```

### Plugin CLI Automatique

Le plugin NestJS CLI génère automatiquement la documentation pour :
- Les DTOs avec class-validator
- Les types TypeScript
- Les propriétés optionnelles
- Les enums

Configuration dans `nest-cli.json` :

```json
{
  "compilerOptions": {
    "plugins": ["@nestjs/swagger"]
  }
}
```

---

## 🎨 Décorateurs Disponibles

### Sur les Controllers

```typescript
@ApiTags('courses')  // Tag pour grouper les endpoints
@Controller('courses')
@ApiBearerAuth('JWT-auth')  // Tous les endpoints nécessitent JWT
export class CoursesController { }
```

### Sur les Endpoints

```typescript
@Post()
@ApiOperation({
  summary: 'Créer un cours',
  description: 'Description détaillée du comportement'
})
@ApiBody({ type: CreateCourseDto })
@ApiResponse({ status: 201, description: 'Cours créé' })
@ApiResponse({ status: 400, description: 'Validation échouée' })
@ApiResponse({ status: 401, description: 'Non authentifié' })
@ApiResponse({ status: 403, description: 'Permissions insuffisantes' })
create(@Body() dto: CreateCourseDto) { }
```

### Sur les DTOs

```typescript
export class CreateCourseDto {
  @ApiProperty({
    description: 'Titre du cours',
    example: 'Krav Maga - Avancé',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Description optionnelle',
    example: 'Focus sur techniques avancées',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Sur les Paramètres

```typescript
@Get(':id')
@ApiParam({
  name: 'id',
  type: String,
  format: 'uuid',
  description: 'ID unique',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
findOne(@Param('id') id: string) { }
```

```typescript
@Get()
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Numéro de page',
  example: 1,
})
findAll(@Query('page') page: number) { }
```

---

## 📦 Génération de Clients

### TypeScript/Axios

```bash
npm install @openapitools/openapi-generator-cli

npx openapi-generator-cli generate \
  -i http://localhost:3000/api-json \
  -g typescript-axios \
  -o ./generated-client
```

### Angular

```bash
npx openapi-generator-cli generate \
  -i http://localhost:3000/api-json \
  -g typescript-angular \
  -o ./src/app/api-client
```

### Autres Langages

- **React (TypeScript)** : `-g typescript-fetch`
- **Python** : `-g python`
- **Java** : `-g java`
- **C#** : `-g csharp-netcore`
- **Go** : `-g go`

[Liste complète des générateurs](https://openapi-generator.tech/docs/generators)

---

## 📚 Exemples d'Utilisation

### 1. Créer une Organisation

```http
POST /organizations
Content-Type: application/json

{
  "name": "CrossFit Lyon",
  "slug": "crossfit-lyon",
  "email": "contact@crossfit-lyon.fr",
  "phone": "0612345678",
  "address": "123 Rue de la République, 69001 Lyon",
  "logo_url": "https://example.com/logo.png"
}

→ 201 Created
{
  "id": "org-123",
  "name": "CrossFit Lyon",
  "slug": "crossfit-lyon",
  ...
}
```

### 2. S'Inscrire

```http
POST /auth/register
Content-Type: application/json

{
  "organization_id": "org-123",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "member"
}

→ 201 Created
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "user": { "id": "user-456", ... }
}
```

### 3. Créer un Cours Récurrent

```http
POST /courses
Authorization: Bearer eyJhbGciOiJIUzI1...
Content-Type: application/json

{
  "organization_id": "org-123",
  "title": "Krav Maga - Techniques avancées",
  "course_type": "krav-maga",
  "start_datetime": "2025-11-05T19:00:00Z",
  "end_datetime": "2025-11-05T20:30:00Z",
  "location": "Salle 2",
  "coach_id": "coach-789",
  "max_capacity": 15,
  "is_recurring": true,
  "recurrence_rule": {
    "frequency": "weekly",
    "day_of_week": 2,
    "interval": 1,
    "end_date": "2026-06-30"
  }
}

→ 201 Created
{
  "id": "course-123",
  "title": "Krav Maga - Techniques avancées",
  "generated_occurrences": 90,
  ...
}
```

### 4. Enregistrer une Intention de Présence

```http
POST /attendances/intention
Authorization: Bearer eyJhbGciOiJIUzI1...
Content-Type: application/json

{
  "course_id": "course-occurrence-456",
  "user_id": "user-456",
  "intention": "will_attend",
  "notes": "Présent pour le cours de demain"
}

→ 201 Created
{
  "id": "attendance-789",
  "intention": "will_attend",
  ...
}
```

---

## 🔄 Comparaison avec test-api.rest

| Aspect | test-api.rest | Swagger UI |
|--------|---------------|------------|
| **Format** | Fichier .rest (VSCode) | Interface web interactive |
| **Installation** | Extension REST Client | Inclus dans l'API |
| **Accessibilité** | Développeur uniquement | Tout le monde (navigateur) |
| **Documentation** | Commentaires manuels | Auto-générée depuis le code |
| **Exemples** | Écrits manuellement | Extraits des @ApiProperty |
| **Authentification** | Variables manuelles | Bouton "Authorize" |
| **Maintenance** | Manuelle (risque d'obsolescence) | Automatique (toujours à jour) |
| **Partage** | Fichier Git | URL publique |
| **Tests automatisés** | Non | Oui (via clients générés) |

**Recommandation** : **Utilisez les deux** ! 🎯
- `test-api.rest` : Tests rapides pendant le développement local
- `Swagger UI` : Documentation officielle pour toute l'équipe

---

## ✅ Checklist Swagger Pro

- [x] @ApiProperty() sur tous les DTOs avec exemples
- [x] @ApiQuery() pour tous les query parameters
- [x] @ApiParam() pour tous les path parameters
- [x] @ApiResponse() pour 200, 201, 204, 400, 401, 403, 404, 500
- [x] @ApiBody() pour tous les POST/PATCH/PUT
- [x] @ApiBearerAuth() pour les endpoints protégés
- [x] Documentation des rôles et permissions
- [x] Exemples de réponses complètes et réalistes
- [x] Section Multi-Tenant expliquée
- [x] Section Troubleshooting
- [x] Guide de génération de clients
- [ ] Documentation des webhooks (si applicable - futur)
- [ ] Upload de fichiers avec @ApiConsumes() (si nécessaire - futur)

---

## ⚠️ Limites et Rate Limiting

### Limites de l'API

Pour garantir la stabilité et la performance de l'API, les limites suivantes sont appliquées :

| Limite | Valeur | Description |
|--------|--------|-------------|
| **Rate Limiting** | 100 req/min | Nombre maximum de requêtes par minute et par utilisateur |
| **Pagination max** | 100 éléments | Limite maximale d'éléments retournés par page |
| **Taille fichiers** | 5 MB | Taille maximale pour les uploads (logos, certificats) |
| **Timeout requêtes** | 30 secondes | Durée maximale d'exécution d'une requête |
| **Token JWT** | 24 heures | Durée de validité du token d'authentification |
| **Connexions simultanées** | 10 | Nombre maximum de connexions simultanées par utilisateur |

### Réponses en cas de dépassement

#### 429 - Too Many Requests

```json
{
  "statusCode": 429,
  "message": "Too Many Requests - Rate limit exceeded. Try again in 60 seconds.",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

**Headers de réponse** :
- `X-RateLimit-Limit`: Limite totale
- `X-RateLimit-Remaining`: Requêtes restantes
- `X-RateLimit-Reset`: Timestamp de réinitialisation
- `Retry-After`: Secondes avant nouvelle tentative

### Bonnes Pratiques

1. **Implémenter un retry avec backoff exponentiel**
   ```typescript
   async function apiCallWithRetry(url: string, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await fetch(url);
       } catch (error) {
         if (error.status === 429) {
           const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
           await new Promise(resolve => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **Vérifier les headers de rate limiting**
3. **Utiliser la pagination pour les grandes listes**
4. **Mettre en cache les données peu changeantes**

---

## 📝 Changelog API

### v1.0.0 (2025-10-30)

**🎉 Initial Release**

**Modules Implémentés** :
- ✅ **Organizations** : Gestion multi-tenant des clubs sportifs
- ✅ **Users** : Gestion des utilisateurs (Admin, Coach, Member)
- ✅ **Auth** : Authentification JWT avec guards et décorateurs
- ✅ **Courses** : Système de cours avec récurrence automatique
- ✅ **Attendances** : Double présence (intention + présence effective)
- ✅ **Subscriptions** : Gestion des abonnements et paiements
- ✅ **AuditLogs** : Traçabilité complète RGPD

**Fonctionnalités** :
- 🔐 Authentification JWT (24h)
- 🏢 Architecture multi-tenant avec isolation des données
- 🔁 Système de récurrence pour cours répétés (daily, weekly, monthly)
- 📊 Statistiques avancées (présences, taux d'occupation, revenus)
- 🛡️ RBAC (Role-Based Access Control)
- 📋 Audit trail complet pour conformité RGPD
- 📚 Documentation Swagger complète (49 endpoints)

**Endpoints** :
- 7 endpoints Organizations
- 8 endpoints Users
- 3 endpoints Auth
- 9 endpoints Courses
- 10 endpoints Attendances
- 15 endpoints Subscriptions
- 9 endpoints AuditLogs

**Total** : 49 endpoints REST documentés

**Base de données** :
- PostgreSQL 15 avec TypeORM
- 7 entités principales
- Soft delete sur toutes les entités
- Timestamps automatiques (created_at, updated_at, deleted_at)
- JSONB pour metadata et règles de récurrence

**Sécurité** :
- JWT avec secret configurable
- Guards (JwtAuthGuard, RolesGuard)
- Interceptors (MultiTenant, Audit)
- Validation des DTOs avec class-validator
- CORS configuré pour localhost:4200

---

## 🔮 Roadmap et Fonctionnalités Futures

### v1.1.0 (Prévu Q1 2026)

**Fonctionnalités Prévues** :

#### 🔔 Webhooks
- Notifications en temps réel pour événements importants
- Intégrations avec services externes (Stripe, Zapier)
- Retry automatique en cas d'échec

**Exemples d'événements** :
- `course.created` : Nouveau cours créé
- `attendance.registered` : Nouvelle inscription
- `subscription.expired` : Abonnement expiré
- `subscription.renewed` : Renouvellement d'abonnement
- `payment.succeeded` : Paiement réussi
- `payment.failed` : Échec de paiement

**Documentation Swagger pour Webhooks** :
```typescript
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {

  @Post('stripe')
  @ApiOperation({
    summary: 'Webhook Stripe pour événements de paiement',
    description: 'Endpoint appelé par Stripe lors d\'événements de paiement (payment_intent.succeeded, payment_intent.failed, etc.)'
  })
  @ApiBody({
    description: 'Payload Stripe avec signature',
    schema: {
      example: {
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1234567890',
            amount: 7999,
            currency: 'eur',
            status: 'succeeded'
          }
        }
      }
    }
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Signature HMAC SHA256 de Stripe',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook traité avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Signature invalide ou payload malformé'
  })
  handleStripeWebhook(@Body() payload: any, @Headers('stripe-signature') signature: string) {
    // Vérifier la signature
    // Traiter l'événement
  }
}
```

#### 📤 Upload de Fichiers
- Upload de logos pour organisations
- Certificats médicaux pour adhérents
- Photos de profil utilisateurs
- Validation de type et taille

**Documentation Swagger pour Upload** :
```typescript
@Post('organization/:id/logo')
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiOperation({
  summary: 'Upload du logo d\'une organisation',
  description: 'Upload d\'un fichier image pour le logo (PNG, JPG, max 5MB)'
})
@ApiParam({
  name: 'id',
  type: String,
  format: 'uuid',
  description: 'ID de l\'organisation',
})
@ApiBody({
  description: 'Fichier image',
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Fichier image (PNG, JPG, max 5MB)',
      },
    },
  },
})
@ApiResponse({
  status: 200,
  description: 'Logo uploadé avec succès',
  schema: {
    example: {
      url: 'https://storage.classhub.com/logos/org-123-abc456.png',
      size: 245678,
      mimeType: 'image/png'
    }
  }
})
@ApiResponse({
  status: 400,
  description: 'Fichier invalide (type ou taille)',
  schema: {
    example: {
      statusCode: 400,
      message: 'File too large. Maximum size is 5MB',
      error: 'Bad Request'
    }
  }
})
uploadLogo(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File
) {
  // Valider et sauvegarder le fichier
}
```

#### 📊 Analytics Avancées
- Dashboard avec métriques en temps réel
- Export de données (CSV, Excel, PDF)
- Graphiques de tendances

#### 🔧 Autres Améliorations
- Notifications email (SendGrid/Mailgun)
- Notifications push (Firebase)
- Support i18n (multi-langues)
- Export OpenAPI pour Postman
- SDK TypeScript officiel

### v1.2.0 (Prévu Q2 2026)

- Intégration calendrier (Google Calendar, iCal)
- Système de réservation avec paiement en ligne
- Application mobile (React Native)
- Mode hors-ligne avec synchronisation

---

## 📖 Ressources

- [Documentation officielle NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
- [Spécification OpenAPI 3.0](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/) - Éditeur en ligne
- [OpenAPI Generator](https://openapi-generator.tech/) - Génération de clients
- [Repository ClassHub API](https://github.com/greg0r1/classhub-api)

---

## 🎉 Conclusion

La documentation Swagger de ClassHub API est **complète et professionnelle** !

**✨ Fonctionnalités** :
- 49 endpoints documentés
- 17 schémas DTOs complets
- Tous les codes d'erreur documentés
- Exemples réalistes pour tous les cas
- Multi-tenant transparent
- Authentification JWT intégrée

**🔗 Accès** :
- **Interface interactive** : http://localhost:3000/api
- **JSON OpenAPI** : http://localhost:3000/api-json

La documentation est générée automatiquement depuis le code TypeScript, garantissant qu'elle reste **toujours synchronisée** avec l'implémentation réelle ! 🚀
