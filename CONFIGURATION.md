# 🔧 Configuration ClassHub API

## 📋 Récapitulatif des accès et identifiants

### 🗄️ Base de données PostgreSQL

**Informations de connexion** (définies dans [docker-compose.yml](docker-compose.yml)) :

```yaml
Host: postgres (depuis les containers Docker) / localhost (depuis votre machine)
Port: 5432
Database: classhub_dev
Username: classhub_admin
Password: dev_password_123
```

### 🖥️ Adminer (Interface de gestion PostgreSQL)

**URL** : http://localhost:8081

**Connexion** :
- **Système** : PostgreSQL
- **Serveur** : `postgres`
- **Utilisateur** : `classhub_admin`
- **Mot de passe** : `dev_password_123`
- **Base de données** : `classhub_dev`

### 🚀 API NestJS

**URL** : http://localhost:3000

**Swagger/Documentation** : http://localhost:3000/api

**Variables d'environnement** (fichier `.env`) :
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=classhub_admin
DB_PASSWORD=dev_password_123
DB_DATABASE=classhub_dev

JWT_SECRET=votre_secret_super_securise_a_changer_en_production
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

### 🎨 Frontend Angular

**URL** : http://localhost:8080

**Container** : classhub-frontend

## 🐳 Services Docker

### Démarrer tous les services

```bash
docker-compose up -d
```

### Vérifier l'état des services

```bash
docker-compose ps
```

**Services en cours d'exécution** :

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `postgres` | classhub-db | 5432 | Base de données PostgreSQL |
| `api` | classhub-api | 3000 | API NestJS |
| `adminer` | classhub-adminer | 8081 | Interface de gestion BDD |
| `frontend` | classhub-frontend | 8080 | Application Angular |

### Redémarrer un service spécifique

```bash
# Redémarrer l'API
docker-compose restart api

# Redémarrer la base de données
docker-compose restart postgres

# Redémarrer Adminer
docker-compose restart adminer

# Redémarrer le frontend
docker-compose restart frontend
```

### Voir les logs

```bash
# Logs de l'API
docker-compose logs -f api

# Logs de PostgreSQL
docker-compose logs -f postgres

# Logs d'Adminer
docker-compose logs -f adminer

# Tous les logs
docker-compose logs -f
```

### Arrêter tous les services

```bash
docker-compose down
```

## 📁 Fichiers de configuration

### Fichiers principaux

| Fichier | Description | Localisation |
|---------|-------------|--------------|
| `docker-compose.yml` | Configuration Docker | Racine du projet |
| `.env` | Variables d'environnement | Racine (à créer depuis `.env.example`) |
| `.env.example` | Template des variables | Racine du projet |
| `README.md` | Documentation principale | Racine du projet |

### Configuration Docker

Les identifiants PostgreSQL sont définis dans `docker-compose.yml` :

```yaml
postgres:
  environment:
    POSTGRES_DB: classhub_dev
    POSTGRES_USER: classhub_admin
    POSTGRES_PASSWORD: dev_password_123
```

### Adminer

Configuration simple dans `docker-compose.yml` :

```yaml
adminer:
  image: adminer:latest
  ports:
    - "8081:8080"
  environment:
    ADMINER_DEFAULT_SERVER: postgres
```

## 🔐 Sécurité

### ⚠️ IMPORTANT - Environnement de développement

Les identifiants actuels sont prévus **uniquement pour le développement local**.

### Pour la production

1. **Changer tous les mots de passe** :
   - `DB_PASSWORD` : Utiliser un mot de passe fort (16+ caractères)
   - `JWT_SECRET` : Générer un secret aléatoire de 64+ caractères

2. **Générer un JWT_SECRET sécurisé** :
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Utiliser des secrets managers** :
   - AWS Secrets Manager
   - Kubernetes Secrets
   - HashiCorp Vault

4. **Ne jamais commiter** :
   - Le fichier `.env`
   - Les mots de passe en clair
   - Les tokens JWT

## 🔄 Commandes utiles

### Base de données

```bash
# Se connecter à PostgreSQL en ligne de commande
docker exec -it classhub-db psql -U classhub_admin -d classhub_dev

# Lister les tables
docker exec -it classhub-db psql -U classhub_admin -d classhub_dev -c "\dt"

# Dump de la base de données
docker exec classhub-db pg_dump -U classhub_admin classhub_dev > backup.sql

# Restaurer un dump
docker exec -i classhub-db psql -U classhub_admin classhub_dev < backup.sql
```

### Volumes Docker

```bash
# Lister les volumes
docker volume ls

# Supprimer le volume de la base de données (⚠️ EFFACE TOUTES LES DONNÉES)
docker volume rm classhub-api_postgres_data
```

## 📚 Documentation complète

- **README principal** : [README.md](README.md)
- **Documentation Swagger** : Consultez la doc de l'API sur http://localhost:3000/api
- **Guide Swagger** : [docs/SWAGGER.md](docs/SWAGGER.md)
- **Refresh Token** : [docs/REFRESH_TOKEN.md](docs/REFRESH_TOKEN.md)
- **Tests API** : [test-api.rest](test-api.rest)

## 🆘 Dépannage

### Adminer ne se connecte pas

1. Vérifiez que vous avez sélectionné **PostgreSQL** (pas MySQL)
2. Vérifiez les identifiants :
   - Serveur : `postgres` (pas `localhost`)
   - Utilisateur : `classhub_admin`
   - Password : `dev_password_123`
   - Base : `classhub_dev`

### L'API ne démarre pas

1. Vérifiez le fichier `.env` :
   ```bash
   cat .env
   ```

2. Vérifiez les logs :
   ```bash
   docker-compose logs -f api
   ```

3. Redémarrez les services :
   ```bash
   docker-compose restart
   ```

### La base de données ne répond pas

```bash
# Vérifier l'état
docker-compose ps postgres

# Voir les logs
docker-compose logs postgres

# Redémarrer PostgreSQL
docker-compose restart postgres
```

---

📅 **Dernière mise à jour** : 2025-11-15
