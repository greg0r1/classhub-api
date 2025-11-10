# 🔐 Système de Refresh Token

## Vue d'ensemble

Le système d'authentification ClassHub utilise une **double tokenisation** pour une sécurité optimale :

- **Access Token** (JWT) : Valide **15 minutes**, utilisé pour chaque requête API
- **Refresh Token** (random) : Valide **30 jours**, stocké en DB, utilisé pour renouveler l'access token

## Architecture

### Flow d'authentification

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /auth/login
       ▼
┌─────────────────┐
│  AuthService    │
└────────┬────────┘
         │
         │ 2. Valide credentials
         ▼
┌─────────────────┐
│   Generate      │
│   Tokens        │
└────────┬────────┘
         │
         ├─ 3a. Access Token (JWT, 15min)
         └─ 3b. Refresh Token (random, 30j, stored in DB)
         │
         ▼
┌─────────────────┐
│   Client        │
│   Stores both   │
└─────────────────┘
```

### Flow de rafraîchissement

```
┌─────────────┐
│   Client    │  Access token expiré (après 15min)
└──────┬──────┘
       │
       │ 1. POST /auth/refresh
       │    { refresh_token: "..." }
       ▼
┌─────────────────┐
│  AuthService    │
└────────┬────────┘
         │
         │ 2. Valide refresh token (DB lookup)
         │    - Token existe ?
         │    - Pas révoqué ?
         │    - Pas expiré ?
         ▼
┌─────────────────┐
│   Revoke old    │  3. Révoque l'ancien refresh token
│   token         │     (rotation de tokens)
└────────┬────────┘
         │
         │ 4. Génère nouveaux tokens
         ▼
┌─────────────────┐
│   New Tokens    │
│   - Access (15min)
│   - Refresh (30j)
└─────────────────┘
```

## Endpoints

### 1. POST /auth/register

Créer un compte et obtenir des tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "organization_id": "uuid",
  "role": "member"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "a1b2c3d4...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member",
    "organization_id": "uuid"
  }
}
```

### 2. POST /auth/login

Se connecter avec email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Identique à `/auth/register`

### 3. POST /auth/refresh ⭐ NOUVEAU

Rafraîchir l'access token avec un refresh token valide.

**Request:**
```json
{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "b2c3d4e5...",  // Nouveau refresh token
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "admin",
    "organization_id": "uuid"
  }
}
```

**Erreurs possibles:**
- `401 Unauthorized`: Refresh token invalide, révoqué ou expiré

### 4. POST /auth/logout ⭐ NOUVEAU

Déconnecter l'utilisateur (révoque tous ses refresh tokens).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Déconnexion réussie"
}
```

**Note:** Les access tokens restent valides jusqu'à expiration (15 min max).

### 5. GET /auth/me

Récupérer le profil de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "admin",
  "organization_id": "uuid"
}
```

## Table refresh_tokens

### Structure

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    user_agent VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
```

### Propriétés calculées (TypeORM)

```typescript
get is_expired(): boolean {
  return new Date() > this.expires_at;
}

get is_valid(): boolean {
  return !this.revoked && !this.is_expired;
}
```

## Sécurité

### 1. Rotation des tokens

**Chaque refresh génère un NOUVEAU refresh token** et révoque l'ancien.

**Avantages:**
- Détecte les tokens volés (si l'attaquant utilise un token révoqué)
- Limite la durée d'exploitation en cas de vol
- Audit trail complet

### 2. Stockage sécurisé

**Refresh tokens:**
- ✅ Générés avec `crypto.randomBytes(64)` (128 caractères hex)
- ✅ Stockés en base de données (hachage possible si ultra-critique)
- ✅ Peuvent être révoqués instantanément

**Access tokens:**
- ✅ JWT signés avec secret
- ✅ Expiration courte (15 min)
- ✅ Pas de stockage serveur (stateless)

### 3. Tracking

Chaque refresh token enregistre :
- `user_agent` : Identifier le client (browser, mobile app)
- `ip_address` : Détecter les connexions suspectes
- `created_at` : Audit
- `revoked_at` : Traçabilité des révocations

### 4. Révocation

**Révocation individuelle:**
```typescript
await authService.revokeRefreshToken(token);
```

**Révocation globale (logout all devices):**
```typescript
await authService.revokeAllUserTokens(userId);
```

### 5. Nettoyage automatique

**Méthode pour supprimer les tokens expirés:**
```typescript
await authService.cleanExpiredTokens();
// Retourne le nombre de tokens supprimés
```

**Recommandation:** Exécuter via cron job quotidien.

## Intégration Frontend

### Configuration

```typescript
// config.ts
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  ACCESS_TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
};
```

### Stockage des tokens

```typescript
// auth.service.ts
class AuthService {
  storeTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(API_CONFIG.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(API_CONFIG.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY);
  }

  clearTokens() {
    localStorage.removeItem(API_CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
  }
}
```

### Intercepteur HTTP (Axios)

```typescript
// axios.interceptor.ts
import axios from 'axios';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Requête: Ajouter access token
axios.interceptors.request.use(config => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Réponse: Gérer 401 et rafraîchir token
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Attendre que le refresh soit terminé
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        authService.storeTokens(access_token, newRefreshToken);

        processQueue(null, access_token);
        isRefreshing = false;

        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
```

### Login

```typescript
async function login(email: string, password: string) {
  const response = await axios.post('/auth/login', { email, password });
  const { access_token, refresh_token, user } = response.data;

  authService.storeTokens(access_token, refresh_token);
  return user;
}
```

### Logout

```typescript
async function logout() {
  try {
    await axios.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    authService.clearTokens();
    window.location.href = '/login';
  }
}
```

## Migration depuis ancien système

### Étape 1: Créer la table

```bash
# Exécuter la migration
docker compose exec postgres psql -U classhub_user -d classhub_dev < database/migrations/001_create_refresh_tokens_table.sql
```

### Étape 2: Mettre à jour frontend

1. Modifier le stockage des tokens (ajouter `refresh_token`)
2. Implémenter l'intercepteur Axios
3. Gérer le cas 401 avec refresh automatique

### Étape 3: Tester

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Réponse: access_token + refresh_token

# 2. Attendre 15 minutes (ou forcer expiration)

# 3. Refresh
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<votre_refresh_token>"}'

# Réponse: nouveaux tokens

# 4. Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

## FAQ

### Pourquoi 15 minutes pour l'access token ?

**Compromis sécurité/UX:**
- Plus court = plus sécurisé (limite exploitation en cas de vol)
- Plus long = moins de refreshes (meilleures perfs)
- 15 min = Standard industrie (OAuth 2.0)

### Pourquoi 30 jours pour le refresh token ?

**Balance entre sécurité et confort:**
- Évite de redemander login trop souvent
- Assez court pour limiter l'exposition en cas de vol
- Peut être ajusté selon les besoins (7, 14, 60 jours)

### Le refresh token est-il haché en DB ?

**Non, actuellement stocké en clair.**

**Raisons:**
- Lookup rapide nécessaire à chaque refresh
- Révocation individuelle requiert le token exact
- Déjà sécurisé par :
  - Génération crypto.randomBytes (128 chars)
  - Stockage DB (pas localStorage client)
  - Rotation automatique
  - Révocation sur logout

**Si ultra-critique:** Possible de hacher avec bcrypt (impact perf).

### Que se passe-t-il si on vole le refresh token ?

**Protections en place:**
1. **Rotation** : L'ancien token est révoqué après usage
2. **Tracking** : IP + User-Agent enregistrés (détection anomalies)
3. **Expiration** : 30 jours max
4. **Révocation manuelle** : Logout révoque tous les tokens

**Détection de vol:**
- Si attaquant utilise token révoqué → erreur 401
- Admin peut voir tokens actifs par user (future feature)

### Puis-je avoir plusieurs sessions actives ?

**Oui!** Chaque login génère un nouveau refresh token.

**Use case:**
- Mobile app + Desktop browser
- Plusieurs navigateurs

**Révocation:**
- `POST /auth/logout` révoque TOUS les tokens (logout all devices)
- Future: Endpoint pour révoquer token spécifique

## Monitoring & Maintenance

### Métriques à surveiller

1. **Nombre de refresh tokens actifs par user**
   ```sql
   SELECT user_id, COUNT(*)
   FROM refresh_tokens
   WHERE revoked = FALSE AND expires_at > NOW()
   GROUP BY user_id
   ORDER BY COUNT(*) DESC;
   ```

2. **Tokens expirés non nettoyés**
   ```sql
   SELECT COUNT(*)
   FROM refresh_tokens
   WHERE expires_at < NOW();
   ```

3. **Taux de révocation**
   ```sql
   SELECT
     COUNT(CASE WHEN revoked = TRUE THEN 1 END)::float / COUNT(*) * 100 AS revocation_rate
   FROM refresh_tokens;
   ```

### Cron job recommandé

```typescript
// cron.service.ts (NestJS Schedule)
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './modules/auth/auth.service';

@Injectable()
export class CronService {
  constructor(private readonly authService: AuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanExpiredTokens() {
    const count = await this.authService.cleanExpiredTokens();
    console.log(`[CRON] Cleaned ${count} expired refresh tokens`);
  }
}
```

## Références

- [OAuth 2.0 - RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT Best Practices - RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Auteur:** ClassHub API Team
**Version:** 1.0.0
**Date:** 2025-11-10
