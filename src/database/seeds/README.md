# 🌱 Database Seeding

## Vue d'ensemble

Le script de seeding génère des données de test pour faciliter le développement et les démonstrations de l'API ClassHub.

## Données générées

### 📊 Statistiques

- **3 organisations** (clubs sportifs différents)
- **20 utilisateurs** (répartis par rôle et organisation)
- **15 abonnements** (tous les membres)
- **50 cours** (répartis sur 20 jours)

### 🏢 Organisations

| Organisation | Slug | Activité | Statut | Utilisateurs |
|--------------|------|----------|--------|--------------|
| **Dojo Karaté Paris** | dojo-karate-paris | Karaté | Active | 8 (1 admin, 2 coaches, 5 members) |
| **Yoga Studio Lyon** | yoga-studio-lyon | Yoga | Active | 7 (1 admin, 2 coaches, 4 members) |
| **CrossFit Marseille** | crossfit-marseille | CrossFit | Trial | 5 (1 admin, 1 coach, 3 members) |

### 👥 Utilisateurs de test

**Mot de passe pour tous:** `password123`

#### Karaté Paris
```
Admin:  admin.karate@test.com
Coach:  coach1.karate@test.com / coach2.karate@test.com
Member: member1.karate@test.com → member5.karate@test.com
```

#### Yoga Lyon
```
Admin:  admin.yoga@test.com
Coach:  coach1.yoga@test.com / coach2.yoga@test.com
Member: member1.yoga@test.com → member4.yoga@test.com
```

#### CrossFit Marseille
```
Admin:  admin.crossfit@test.com
Coach:  coach1.crossfit@test.com
Member: member1.crossfit@test.com → member3.crossfit@test.com
```

### 📅 Cours

**Karaté Paris** (20 cours):
- Karaté Débutant
- Karaté Intermédiaire
- Karaté Avancé
- Kata
- Kumité

**Yoga Lyon** (20 cours):
- Hatha Yoga
- Vinyasa Flow
- Yin Yoga
- Yoga Restoratif
- Power Yoga

**CrossFit Marseille** (10 cours):
- WOD: Fran
- WOD: Helen
- WOD: Cindy
- WOD: Murph
- WOD: Grace
- WOD du jour

## Utilisation

### 1. Démarrer la base de données

```bash
npm run db:start
```

### 2. Exécuter la migration refresh_tokens

```bash
docker compose exec postgres psql -U classhub_user -d classhub_dev < database/migrations/001_create_refresh_tokens_table.sql
```

### 3. Exécuter le seeding

```bash
npm run seed
```

### 4. Vérifier les données

```bash
# Se connecter à PostgreSQL
docker compose exec postgres psql -U classhub_user -d classhub_dev

# Compter les enregistrements
SELECT 'organizations' as table, COUNT(*) FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'courses', COUNT(*) FROM courses;
```

## Test de l'API

### Login

```bash
# Admin Karaté
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.karate@test.com",
    "password": "password123"
  }'
```

**Réponse attendue:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "a1b2c3...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "admin.karate@test.com",
    "first_name": "Sophie",
    "last_name": "Martin",
    "role": "admin",
    "organization_id": "uuid"
  }
}
```

### Récupérer les cours

```bash
# Utiliser le access_token obtenu
curl -X GET http://localhost:3000/courses \
  -H "Authorization: Bearer <access_token>"
```

### Récupérer les utilisateurs

```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <access_token>"
```

## Nettoyage

Le script de seeding **nettoie automatiquement** les données existantes avant d'insérer les nouvelles données.

Pour réinitialiser complètement la base de données :

```bash
# Arrêter et supprimer les volumes Docker
npm run db:reset

# Re-exécuter le seeding
npm run seed
```

## Personnalisation

Pour modifier les données générées, éditez le fichier `src/database/seeds/seed.ts` :

```typescript
// Modifier le nombre d'utilisateurs
for (let i = 0; i < 10; i++) { // Au lieu de 20
  // ...
}

// Modifier les types de cours
const courseTypes = [
  { name: 'Mon cours custom', level: 'beginner' },
  // ...
];

// Modifier les mots de passe
const hashedPassword = await bcrypt.hash('mypassword', 10);
```

## Structure des données

### Métadonnées par sport

**Karaté:**
```json
{
  "belt_level": "ceinture_noire_4dan",
  "years_experience": 25,
  "medical_cert_date": "2024-09-01"
}
```

**Yoga:**
```json
{
  "certification": "RYT-500",
  "specialization": "Vinyasa",
  "level": "intermediate"
}
```

**CrossFit:**
```json
{
  "certification": "CrossFit Level 3",
  "level": "RX",
  "medical_cert_date": "2024-08-01"
}
```

## Dépannage

### Erreur: "relation does not exist"

**Cause:** La table n'existe pas encore.

**Solution:**
```bash
# Vérifier que le schema.sql est chargé
docker compose exec postgres psql -U classhub_user -d classhub_dev -c "\dt"

# Si tables manquantes, recharger le schema
docker compose down -v
docker compose up -d
npm run seed
```

### Erreur: "connection refused"

**Cause:** PostgreSQL n'est pas démarré.

**Solution:**
```bash
npm run db:start
# Attendre 10 secondes
npm run seed
```

### Erreur: "duplicate key value"

**Cause:** Données déjà présentes.

**Solution:** Le script nettoie automatiquement, mais si l'erreur persiste :
```bash
docker compose exec postgres psql -U classhub_user -d classhub_dev -c "
DELETE FROM attendances;
DELETE FROM subscriptions;
DELETE FROM courses;
DELETE FROM users;
DELETE FROM organizations;
"
npm run seed
```

## Variables d'environnement

Le script utilise les mêmes variables que l'application :

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=classhub_user
DB_PASSWORD=classhub_password_dev
DB_DATABASE=classhub_dev
```

Si vous utilisez un fichier `.env`, assurez-vous qu'il est bien configuré.

## CI/CD

Pour utiliser le seeding dans un pipeline CI/CD :

```yaml
# .github/workflows/test.yml
- name: Seed database
  run: npm run seed
  env:
    DB_HOST: localhost
    DB_PORT: 5432
    DB_USERNAME: postgres
    DB_PASSWORD: postgres
    DB_DATABASE: test_db
```

## Contribution

Pour ajouter de nouvelles données de seed :

1. Éditer `src/database/seeds/seed.ts`
2. Tester localement avec `npm run seed`
3. Documenter les nouvelles données dans ce README
4. Créer une PR

---

**Auteur:** ClassHub API Team
**Version:** 1.0.0
**Dernière mise à jour:** 2025-11-10
