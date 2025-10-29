# ClassHub API

API REST pour la gestion des présences et abonnements dans les clubs sportifs, construite avec NestJS, TypeORM et PostgreSQL.

## Description

ClassHub est une API complète conçue pour la gestion de clubs sportifs. Elle permet de gérer les organisations, les utilisateurs, les cours avec système de récurrence, les présences, et les abonnements dans une architecture multi-tenant sécurisée.

## Fonctionnalités

### Modules implémentés

#### 1. Organizations (Organisations)
- Gestion des clubs sportifs
- Configuration personnalisée (logo, couleurs, langue, fuseau horaire)
- Paramètres de notification et communication
- Soft delete pour préserver l'historique

#### 2. Users (Utilisateurs)
- Gestion des membres, coachs et administrateurs
- Authentification sécurisée avec bcrypt
- Rôles: `admin`, `coach`, `member`
- Profil complet avec contact et préférences
- Isolation par organisation (multi-tenant)

#### 3. Auth (Authentification)
- Authentification JWT avec Passport
- Endpoints: register, login, profile
- Guards pour la protection des routes
- Role-based access control (RBAC)
- Tokens avec expiration configurable (7 jours par défaut)

#### 4. Courses (Cours)
- Gestion des cours et activités
- **Système de récurrence avancé**:
  - Fréquences: daily, weekly, monthly
  - Intervalle personnalisable
  - Génération automatique de 90 jours d'occurrences
  - Relation parent/enfant pour les occurrences
- Annulation simple ou de toutes les occurrences futures
- Filtrage par date, statut, coach
- Propriétés calculées: durée, is_past, is_upcoming, is_today

### Modules à venir
- **Attendances**: Intention de présence + présence réelle avec check-in/check-out
- **Subscriptions**: Abonnements avec types, paiements et renouvellements
- **CustomFields**: Champs personnalisables en JSONB
- **AuditLogs**: Traçabilité des modifications pour conformité RGPD

## Technologies

- **Framework**: NestJS 11
- **Base de données**: PostgreSQL 17
- **ORM**: TypeORM
- **Authentification**: JWT + Passport
- **Validation**: class-validator + class-transformer
- **Sécurité**: bcryptjs pour le hashing des mots de passe
- **Environnement**: Docker + Docker Compose

## Prérequis

- Node.js 18+
- Docker et Docker Compose
- npm ou yarn

## Installation

### 1. Cloner le repository

```bash
git clone https://github.com/greg0r1/classhub-api.git
cd classhub-api
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Créer un fichier `.env` à la racine du projet:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=classhub_user
DB_PASSWORD=classhub_password
DB_DATABASE=classhub_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Application
PORT=3000
NODE_ENV=development
```

### 4. Démarrer la base de données

```bash
docker-compose up -d
```

Cela démarre:
- PostgreSQL sur le port 5432
- pgAdmin sur le port 5050 (http://localhost:5050)
  - Email: admin@classhub.com
  - Password: admin

### 5. Démarrer l'application

```bash
# Mode développement avec hot-reload
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

L'API sera disponible sur `http://localhost:3000`

## Structure du projet

```
src/
├── common/                    # Code partagé
│   ├── decorators/           # @CurrentUser, @Roles
│   └── guards/               # JwtAuthGuard, RolesGuard
├── config/                   # Configuration
├── database/
│   └── entities/             # Entités TypeORM
│       ├── organization.entity.ts
│       ├── user.entity.ts
│       └── course.entity.ts
├── modules/
│   ├── auth/                 # Authentification JWT
│   │   ├── dto/
│   │   ├── strategies/       # JwtStrategy
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── organizations/
│   ├── users/
│   └── courses/              # Gestion des cours avec récurrence
└── app.module.ts
```

## API Endpoints

### Auth
```http
POST   /auth/register          # Créer un compte
POST   /auth/login             # Se connecter
GET    /auth/me                # Profil (protégé)
```

### Organizations
```http
POST   /organizations          # Créer une organisation
GET    /organizations          # Lister toutes les organisations
GET    /organizations/:id      # Détails d'une organisation
PATCH  /organizations/:id      # Modifier une organisation
DELETE /organizations/:id      # Supprimer (soft delete)
```

### Users
```http
POST   /users                  # Créer un utilisateur
GET    /users                  # Lister tous les utilisateurs
GET    /users/:id              # Détails d'un utilisateur
PATCH  /users/:id              # Modifier un utilisateur
DELETE /users/:id              # Supprimer (soft delete)
GET    /users/organization/:orgId         # Utilisateurs d'une org
GET    /users/organization/:orgId/role/:role  # Filtrer par rôle
```

### Courses
```http
POST   /courses                # Créer un cours (+ récurrence)
GET    /courses                # Lister tous les cours
GET    /courses/:id            # Détails d'un cours
PATCH  /courses/:id            # Modifier un cours
DELETE /courses/:id            # Supprimer (soft delete)
GET    /courses/organization/:orgId       # Cours d'une org
GET    /courses/organization/:orgId/date-range  # Filtrer par dates
GET    /courses/upcoming/:orgId           # Cours à venir
POST   /courses/:id/cancel     # Annuler un cours
```

## Tests de l'API

Un fichier [test-api.rest](test-api.rest) est fourni avec 41 tests d'API. Utilisez l'extension REST Client pour VSCode pour les exécuter.

Variables à remplacer:
- `@orgId`: ID d'une organisation créée
- `@userId`: ID d'un utilisateur créé
- `@courseId`: ID d'un cours créé
- `@accessToken`: Token JWT obtenu via /auth/login

## Architecture

### Multi-tenant
Chaque ressource est isolée par `organization_id`. Les utilisateurs ne peuvent accéder qu'aux données de leur organisation.

### Système de récurrence des cours
Les cours récurrents utilisent un système parent/enfant:
- Le cours parent (`is_recurring = true`) sert de template
- Les occurrences enfants référencent le parent via `parent_recurrence_id`
- Génération automatique de 90 jours d'occurrences à la création
- Possibilité d'annuler une occurrence unique ou toutes les futures

### Sécurité
- Mots de passe hashés avec bcrypt (10 rounds)
- JWT avec expiration configurable
- Guards NestJS pour protection des routes
- Role-based access control (RBAC)
- Validation stricte des DTOs avec class-validator

### Soft Delete
Toutes les entités principales utilisent le soft delete (`deleted_at`) pour préserver l'historique et permettre la restauration.

## Base de données

### Schéma PostgreSQL

```sql
-- Organizations (clubs sportifs)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  settings JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Users (membres, coachs, admins)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) CHECK (role IN ('admin', 'coach', 'member')),
  phone VARCHAR(50),
  preferences JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Courses (cours avec récurrence)
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  coach_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  location VARCHAR(255),
  max_participants INT,
  status VARCHAR(20) CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  parent_recurrence_id UUID REFERENCES courses(id),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### pgAdmin
Accédez à pgAdmin sur http://localhost:5050
- Créez une nouvelle connexion au serveur:
  - Host: postgres (nom du service Docker)
  - Port: 5432
  - Database: classhub_db
  - Username: classhub_user
  - Password: classhub_password

## Développement

### Scripts disponibles

```bash
# Développement
npm run start:dev              # Hot-reload

# Production
npm run build                  # Build TypeScript
npm run start:prod             # Démarrer en production

# Formatage et linting
npm run format                 # Prettier
npm run lint                   # ESLint

# Tests
npm run test                   # Tests unitaires
npm run test:e2e              # Tests e2e
npm run test:cov              # Coverage
```

### Conventions de code

- **Commits**: Format Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Langue**: Français pour les noms métier, anglais pour le code
- **TypeScript**: Strict mode activé
- **ESLint + Prettier**: Configuration incluse

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_USERNAME` | Utilisateur DB | `classhub_user` |
| `DB_PASSWORD` | Mot de passe DB | `classhub_password` |
| `DB_DATABASE` | Nom de la DB | `classhub_db` |
| `JWT_SECRET` | Clé secrète JWT | **À changer en prod!** |
| `JWT_EXPIRES_IN` | Durée de validité JWT | `7d` |
| `PORT` | Port de l'application | `3000` |
| `NODE_ENV` | Environnement | `development` |

## Roadmap

- [ ] Module Attendances (intention + présence réelle)
- [ ] Module Subscriptions (abonnements et paiements)
- [ ] Middleware multi-tenant automatique
- [ ] Module CustomFields (champs personnalisés)
- [ ] Module AuditLogs (traçabilité RGPD)
- [ ] Statistiques et analytics
- [ ] Notifications push et email
- [ ] API de webhooks
- [ ] Documentation Swagger/OpenAPI
- [ ] Tests e2e complets

## Contribution

Les contributions sont les bienvenues! Merci de:
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'feat: Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Licence

MIT

## Auteur

Gregory DERNAUCOURT ([@greg0r1](https://github.com/greg0r1))

---

Construit avec [NestJS](https://nestjs.com/) et [TypeORM](https://typeorm.io/)
