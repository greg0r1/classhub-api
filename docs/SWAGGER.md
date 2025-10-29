# Documentation Swagger/OpenAPI

## Accès à la documentation

Une fois l'application démarrée, la documentation interactive Swagger est accessible à :

**🔗 http://localhost:3000/api**

## Fonctionnalités

### 📖 Documentation interactive
- **Liste complète des endpoints** avec descriptions
- **Schémas de requêtes et réponses** avec exemples
- **Tester les API directement** depuis le navigateur
- **Filtrage par tags** (auth, users, courses, etc.)
- **Recherche** dans toute la documentation

### 🔐 Authentification JWT

1. **Obtenir un token** :
   - Utilisez `POST /auth/login` avec vos credentials
   - Copiez le `access_token` de la réponse

2. **Autoriser dans Swagger** :
   - Cliquez sur le bouton **"Authorize"** 🔓 en haut à droite
   - Entrez votre token dans le champ (sans préfixe "Bearer")
   - Cliquez sur "Authorize"
   - Le bouton devient 🔒 (verrouillé)

3. **Utiliser les endpoints protégés** :
   - Tous les endpoints avec 🔒 nécessitent une authentification
   - Le token est automatiquement ajouté à chaque requête

### 📋 Tags disponibles

- **auth** : Authentification (register, login, profile)
- **organizations** : Gestion des clubs sportifs
- **users** : Gestion des utilisateurs
- **courses** : Gestion des cours avec récurrence
- **attendances** : Intentions et présences effectives
- **subscriptions** : Abonnements et paiements
- **audit-logs** : Traçabilité RGPD

### 🎯 Workflow typique

```
1. POST /auth/register
   → Créer un compte dans une organisation
   → Récupérer le access_token

2. Cliquer sur "Authorize"
   → Coller le token

3. GET /auth/me
   → Vérifier que l'authentification fonctionne

4. Utiliser les autres endpoints protégés
```

## Configuration technique

### Installation

```bash
npm install --save @nestjs/swagger
```

### Configuration (déjà fait dans main.ts)

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('ClassHub API')
  .setDescription('API de gestion de clubs sportifs')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

### Décorateurs utilisés

#### Sur les controllers

```typescript
@ApiTags('auth')  // Tag pour grouper les endpoints
@Controller('auth')
export class AuthController {

  @Post('login')
  @ApiOperation({
    summary: 'Se connecter',
    description: 'Authentification avec email et mot de passe'
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: { example: { access_token: '...' } }
  })
  @ApiResponse({ status: 401, description: 'Credentials invalides' })
  login(@Body() loginDto: LoginDto) {
    // ...
  }
}
```

#### Sur les endpoints protégés

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')  // Indique que JWT est requis
@ApiOperation({ summary: 'Récupérer mon profil' })
getProfile() {
  // ...
}
```

#### Sur les DTOs (class-validator)

Les décorateurs `class-validator` sont automatiquement reconnus par Swagger :

```typescript
export class LoginDto {
  @IsEmail()  // ✅ Swagger sait que c'est un email
  email: string;

  @IsString()
  @MinLength(8)  // ✅ Swagger affiche la validation min 8 caractères
  password: string;
}
```

### Plugin CLI (automatique)

Le CLI NestJS génère automatiquement la documentation Swagger pour :
- Les DTOs avec class-validator
- Les types TypeScript
- Les propriétés optionnelles
- Les types enum

Configuration dans `nest-cli.json` :

```json
{
  "compilerOptions": {
    "plugins": ["@nestjs/swagger"]
  }
}
```

## Avantages de Swagger

### 1. Documentation toujours à jour
- ✅ Générée automatiquement depuis le code
- ✅ Impossible d'avoir une doc obsolète
- ✅ Synchronisée avec l'implémentation

### 2. Client API gratuit
- ✅ Tester sans Postman/Insomnia
- ✅ Directement dans le navigateur
- ✅ Gestion automatique de l'authentification

### 3. Génération de clients
- ✅ Générer des clients TypeScript/Angular/React
- ✅ Via `openapi-generator` ou `swagger-codegen`
- ✅ Types automatiquement synchronisés

```bash
# Générer un client TypeScript-Axios
npm install @openapitools/openapi-generator-cli
npx openapi-generator-cli generate \
  -i http://localhost:3000/api-json \
  -g typescript-axios \
  -o ./generated-client
```

### 4. Validation des contrats API
- ✅ Schéma JSON OpenAPI exportable
- ✅ Tests de contrats API automatiques
- ✅ CI/CD : validation que l'API respecte le contrat

## Export OpenAPI JSON

Le schéma OpenAPI complet est disponible en JSON :

**🔗 http://localhost:3000/api-json**

Utilisable pour :
- Générer des clients dans différents langages
- Valider des contrats API
- Importer dans des outils comme Postman
- Documentation externe

## Personnalisation

### Thème personnalisé

Déjà configuré dans `main.ts` :
- Masquage de la topbar Swagger
- Style personnalisé
- Favicon NestJS
- Titre "ClassHub API - Documentation"

### Options Swagger UI

```typescript
SwaggerModule.setup('api', app, document, {
  swaggerOptions: {
    persistAuthorization: true,  // Garde le token JWT
    docExpansion: 'none',        // Tout fermé par défaut
    filter: true,                // Barre de recherche
    tagsSorter: 'alpha',         // Trier les tags alphabétiquement
    operationsSorter: 'alpha',   // Trier les opérations
  },
});
```

## Exemples d'utilisation

### 1. Tester l'inscription

```
POST /auth/register
Content-Type: application/json

{
  "organization_id": "uuid-de-lorganisation",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "member"
}

→ 201 Created
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "user": { ... }
}
```

### 2. S'authentifier

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

→ 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "user": { ... }
}
```

### 3. Utiliser un endpoint protégé

```
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1...

→ 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "member",
  ...
}
```

## Comparaison avec test-api.rest

| Aspect | test-api.rest | Swagger UI |
|--------|---------------|------------|
| **Format** | Fichier .rest | Interface web |
| **Installation** | Extension VSCode | Inclus dans l'API |
| **Accessibilité** | Développeur uniquement | Tout le monde (navigateur) |
| **Documentation** | Commentaires manuels | Auto-générée |
| **Exemples** | Écrits manuellement | Depuis le code |
| **Authentification** | Variables manuelles | Bouton "Authorize" |
| **Maintenance** | Manuelle | Automatique |
| **Partage** | Fichier Git | URL |

**Recommandation** : Utiliser les deux !
- `test-api.rest` : Tests rapides pendant le développement
- `Swagger UI` : Documentation officielle et tests par les autres développeurs

## Prochaines étapes

### Améliorer la documentation

Pour ajouter plus de détails aux autres controllers :

```typescript
// Dans courses.controller.ts
@ApiTags('courses')
@Controller('courses')
export class CoursesController {

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Créer un cours',
    description: 'Créer un cours ponctuel ou récurrent avec génération automatique des occurrences'
  })
  @ApiResponse({ status: 201, description: 'Cours créé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Permissions insuffisantes' })
  create(@Body() dto: CreateCourseDto) {
    // ...
  }
}
```

### Exemples de réponses

```typescript
@ApiResponse({
  status: 200,
  description: 'Liste des cours',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string', example: 'Krav Maga - Technique' },
        start_datetime: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['scheduled', 'ongoing', 'completed', 'cancelled'] }
      }
    }
  }
})
```

## Ressources

- [Documentation officielle NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
- [Spécification OpenAPI 3.0](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/) - Éditeur en ligne
- [OpenAPI Generator](https://openapi-generator.tech/) - Génération de clients

## Conclusion

Swagger est maintenant configuré sur ClassHub API !

**Accédez à la documentation interactive** : http://localhost:3000/api

La documentation est générée automatiquement depuis votre code TypeScript et vos décorateurs, garantissant qu'elle reste toujours synchronisée avec l'implémentation réelle de l'API.
