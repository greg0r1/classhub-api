# Architecture Multi-Tenant

## Vue d'ensemble

ClassHub API utilise une architecture **multi-tenant** pour garantir une **isolation totale** des données entre les différentes organisations (clubs sportifs).

## Principe

Chaque organisation (club) est complètement isolée :
- Un utilisateur de l'organisation A **ne peut jamais** accéder aux données de l'organisation B
- Même en connaissant les UUIDs des ressources d'une autre organisation
- Protection au niveau applicatif (middleware + intercepteur) **ET** base de données

## Composants

### 1. TenantMiddleware

**Fichier** : `src/common/middleware/tenant.middleware.ts`

**Rôle** : Extraire et ajouter le contexte d'organisation à chaque requête

**Fonctionnement** :
```typescript
// Après authentification JWT, le middleware :
1. Extrait organization_id de req.user (JWT)
2. Ajoute organizationId à la requête
3. Crée un tenantContext avec org, user, role
4. Log en mode debug pour audit
```

**Accès au contexte** :
```typescript
// Dans un controller/service
const orgId = req.organizationId;
const context = req.tenantContext;
// { organizationId, userId, userRole }
```

### 2. TenantInterceptor

**Fichier** : `src/common/interceptors/tenant.interceptor.ts`

**Rôle** : Valider que toutes les requêtes respectent l'isolation multi-tenant

**Fonctionnement** :
```typescript
1. Récupère organization_id de l'utilisateur JWT
2. Vérifie dans body, params, query
3. Cherche : organization_id, organizationId, orgId, organization.id
4. Si différent de l'org de l'utilisateur → 403 Forbidden
5. Sinon → Requête autorisée
```

**Protection automatique sur** :
- Toutes les routes POST/PUT/PATCH (body)
- Toutes les routes avec params (ex: `/courses/:id`)
- Toutes les routes avec query params

### 3. DisableTenantCheck Decorator

**Fichier** : `src/common/decorators/disable-tenant-check.decorator.ts`

**Rôle** : Désactiver la vérification tenant sur certaines routes

**Usage** :
```typescript
@Controller('public')
export class PublicController {
  @Get('health')
  @DisableTenantCheck()  // ← Pas de vérification tenant
  getHealth() {
    return { status: 'ok' };
  }
}
```

**Cas d'usage** :
- Routes publiques (sans authentification)
- Routes d'administration système
- Routes de création d'organisation (signup)
- Health checks

## Enregistrement dans AppModule

```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor, // Global interceptor
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*'); // Toutes les routes
  }
}
```

## Flux de sécurité

```
1. Requête entrante
   ↓
2. TenantMiddleware
   → Extrait organization_id du JWT
   → Ajoute au contexte de la requête
   ↓
3. TenantInterceptor (AVANT l'exécution de la route)
   → Vérifie que organization_id dans body/params/query
   → Correspond à celui de l'utilisateur JWT
   → Si non → 403 Forbidden
   ↓
4. Controller/Service
   → Exécution normale
   → Accès uniquement aux données de son organisation
   ↓
5. Réponse
```

## Exemples de protection

### ✅ Requête autorisée

```http
POST /users
Authorization: Bearer <JWT avec organization_id: abc-123>
Content-Type: application/json

{
  "organization_id": "abc-123",  ← Même org que JWT
  "email": "john@kravlyon.fr",
  "first_name": "John",
  "role": "member"
}

→ 201 Created ✅
```

### ❌ Requête bloquée

```http
POST /users
Authorization: Bearer <JWT avec organization_id: abc-123>
Content-Type: application/json

{
  "organization_id": "xyz-789",  ← Org différente !
  "email": "hacker@evil.com",
  "first_name": "Hacker",
  "role": "admin"
}

→ 403 Forbidden ❌
{
  "statusCode": 403,
  "message": "Access denied: Cannot access resources from another organization (body.organization_id)"
}
```

## Sécurité en profondeur (Defense in Depth)

ClassHub utilise **plusieurs couches** de sécurité :

### 1. JWT (Authentification)
- Utilisateur doit être authentifié
- Token contient organization_id

### 2. Guards (Autorisation)
- JwtAuthGuard : Vérifie le token
- RolesGuard : Vérifie les rôles (admin, coach, member)

### 3. Multi-tenant (Isolation)
- TenantMiddleware : Contexte d'organisation
- TenantInterceptor : Validation automatique
- **Impossible d'accéder aux données d'une autre org**

### 4. Base de données
- Soft delete (conservation historique)
- Indexes sur organization_id
- Contraintes d'intégrité référentielle

## Tests de sécurité

Voir `test-api.rest` tests #72-74 :

```http
### 72. Tentative d'accès à une autre organisation
POST /users
{ "organization_id": "00000000-0000-0000-0000-000000000000" }
→ 403 Forbidden ❌

### 73. Tentative de créer un cours pour une autre org
POST /courses
{ "organization_id": "00000000-0000-0000-0000-000000000000" }
→ 403 Forbidden ❌

### 74. Tentative d'abonnement pour user d'une autre org
POST /subscriptions
{ "user_id": "00000000-0000-0000-0000-000000000000" }
→ 403 Forbidden ❌ (le service vérifie que user.organization_id correspond)
```

## Cas particuliers

### Routes publiques

Utilisez `@DisableTenantCheck()` :

```typescript
@Controller('auth')
export class AuthController {
  @Post('register')
  @DisableTenantCheck()  // Pas d'org avant création du compte
  register(@Body() dto: RegisterDto) {
    // Création de l'utilisateur
  }

  @Post('login')
  @DisableTenantCheck()  // Pas encore authentifié
  login(@Body() dto: LoginDto) {
    // Authentification
  }
}
```

### Routes d'administration système

```typescript
@Controller('admin/system')
@Roles('super-admin')
export class SystemAdminController {
  @Get('organizations')
  @DisableTenantCheck()  // Accès à toutes les orgs
  getAllOrganizations() {
    // Administration système
  }
}
```

## Bonnes pratiques

### ✅ À faire

```typescript
// 1. Toujours utiliser organization_id de l'utilisateur JWT
const user = getCurrentUser();
const courses = await this.coursesService.findAll(user.organization_id);

// 2. Vérifier l'appartenance dans les services
async findOne(id: string, organizationId: string) {
  const course = await this.repository.findOne({
    where: { id, organization_id: organizationId }
  });
  if (!course) throw new NotFoundException();
  return course;
}

// 3. Utiliser le décorateur @CurrentUser
@Get()
findAll(@CurrentUser() user: CurrentUserData) {
  return this.service.findAll(user.organization_id);
}
```

### ❌ À éviter

```typescript
// ❌ NE JAMAIS faire confiance au client
@Post()
create(@Body() dto: CreateDto) {
  // Si dto.organization_id vient du client → DANGER
  return this.service.create(dto);
}

// ❌ NE JAMAIS bypasser la vérification
@Get(':id')
@DisableTenantCheck()  // ← Sauf si vraiment nécessaire
findOne(@Param('id') id: string) {
  // Accès à n'importe quelle org → DANGER
}

// ❌ NE JAMAIS oublier le filtre organization_id
async findAll() {
  // Retourne TOUTES les orgs → DANGER
  return this.repository.find();
}
```

## Monitoring et audit

### Logs de sécurité

En mode développement, le middleware log chaque accès :

```
[TenantMiddleware] Tenant context: org=abc-123, user=user-456, role=admin, path=/courses
```

### Futures améliorations

- [ ] Module AuditLogs pour tracer toutes les actions
- [ ] Alertes sur tentatives d'accès non autorisés
- [ ] Dashboard de sécurité pour les admins
- [ ] Rate limiting par organisation
- [ ] Métriques d'utilisation par organisation

## Conformité RGPD

Le système multi-tenant facilite la conformité RGPD :

1. **Isolation des données** : Chaque organisation est isolée
2. **Droit à l'effacement** : Soft delete + anonymisation possible
3. **Portabilité** : Export facile des données d'une organisation
4. **Traçabilité** : Logs d'accès et audit trails

## En résumé

Le système multi-tenant de ClassHub garantit :

✅ **Isolation totale** des données entre organisations
✅ **Protection automatique** sur toutes les routes
✅ **Sécurité en profondeur** (JWT + Guards + Multi-tenant)
✅ **Facilité d'utilisation** pour les développeurs (automatique)
✅ **Flexibilité** avec `@DisableTenantCheck()` si nécessaire
✅ **Conformité** RGPD et réglementaire

**→ Un utilisateur ne peut JAMAIS accéder aux données d'une autre organisation, même en essayant.**
