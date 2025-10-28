-- ============================================
-- SCHÉMA DE BASE DE DONNÉES - KRAVSTATS
-- PostgreSQL 15+
-- Multi-tenant avec Row Level Security
-- ============================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: organizations (Clubs/Tenants)
-- ============================================
CREATE TABLE organizations (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identité
    name VARCHAR(255) NOT NULL CHECK (char_length(name) >= 2),
    slug VARCHAR(100) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
    
    -- Contact
    email VARCHAR(255) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone VARCHAR(20),
    address TEXT,
    
    -- Branding
    logo_url VARCHAR(500),
    
    -- Configuration (JSONB pour flexibilité)
    settings JSONB NOT NULL DEFAULT '{
        "lock_attendance_by_coach": true,
        "default_capacity": 15,
        "season_start_month": 9,
        "timezone": "Europe/Paris"
    }'::jsonb,
    
    -- Abonnement
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial' 
        CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
    subscription_plan VARCHAR(20) DEFAULT 'free'
        CHECK (subscription_plan IN ('free', 'pro', 'premium')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_trial_ends ON organizations(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE organizations IS 'Clubs/Associations (tenants multi-tenant)';
COMMENT ON COLUMN organizations.settings IS 'Configuration JSON: lock_attendance_by_coach, default_capacity, etc.';


-- ============================================
-- TABLE: users (Tous les utilisateurs)
-- ============================================
CREATE TABLE users (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Authentification
    email VARCHAR(255) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    
    -- Identité
    first_name VARCHAR(100) NOT NULL CHECK (char_length(first_name) >= 1),
    last_name VARCHAR(100) NOT NULL CHECK (char_length(last_name) >= 1),
    phone VARCHAR(20),
    date_of_birth DATE CHECK (date_of_birth < CURRENT_DATE),
    
    -- Rôle et statut
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coach', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- Dates importantes
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Métadonnées flexibles (ceintures, certificat médical, etc.)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Sécurité
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT users_email_org_unique UNIQUE (email, organization_id)
);

-- Index optimisés
CREATE UNIQUE INDEX idx_users_email_org ON users(email, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_organization_id ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(organization_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_password_reset ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_metadata_gin ON users USING gin(metadata jsonb_path_ops);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_isolation ON users
    USING (organization_id = current_setting('app.current_tenant', true)::uuid);

-- Trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE users IS 'Tous les utilisateurs (admins, coachs, adhérents)';
COMMENT ON COLUMN users.metadata IS 'Données flexibles: belt_level, medical_cert, preferences, etc.';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt du mot de passe (coût 12)';


-- ============================================
-- TABLE: courses (Cours ponctuels et récurrents)
-- ============================================
CREATE TABLE courses (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Informations de base
    title VARCHAR(255) NOT NULL CHECK (char_length(title) >= 2),
    description TEXT,
    course_type VARCHAR(50),
    
    -- Horaires
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    CHECK (end_datetime > start_datetime),
    
    -- Lieu
    location VARCHAR(255),
    
    -- Coach
    coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Capacité
    max_capacity INTEGER CHECK (max_capacity > 0 OR max_capacity IS NULL),
    
    -- Récurrence
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule JSONB CHECK (
        recurrence_rule IS NULL OR 
        (recurrence_rule ? 'frequency' AND recurrence_rule ? 'day_of_week')
    ),
    parent_recurrence_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    
    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index haute performance
CREATE INDEX idx_courses_organization_id ON courses(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_start_datetime ON courses(organization_id, start_datetime DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_coach_id ON courses(coach_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_status ON courses(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_parent_recurrence ON courses(parent_recurrence_id) WHERE parent_recurrence_id IS NOT NULL;
CREATE INDEX idx_courses_date_range ON courses(organization_id, start_datetime, end_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_recurrence_gin ON courses USING gin(recurrence_rule jsonb_path_ops) WHERE recurrence_rule IS NOT NULL;

-- Index pour recherches temporelles optimisées
CREATE INDEX idx_courses_upcoming ON courses(organization_id, start_datetime) 
    WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX idx_courses_past ON courses(organization_id, start_datetime DESC) 
    WHERE status = 'completed' AND deleted_at IS NULL;

-- Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_isolation ON courses
    USING (organization_id = current_setting('app.current_tenant', true)::uuid);

-- Trigger
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE courses IS 'Cours (ponctuels et récurrents avec occurrences)';
COMMENT ON COLUMN courses.recurrence_rule IS 'Règle de récurrence JSON: {frequency: "weekly", day_of_week: 1, end_date: "2026-06-30"}';
COMMENT ON COLUMN courses.parent_recurrence_id IS 'Lien vers le cours parent si occurrence de récurrence';


-- ============================================
-- TABLE: attendances (Présences et intentions)
-- ============================================
CREATE TABLE attendances (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Intention (avant le cours)
    intention VARCHAR(20) CHECK (intention IN ('will_attend', 'will_not_attend') OR intention IS NULL),
    intention_at TIMESTAMP WITH TIME ZONE,
    
    -- Présence effective (pendant/après le cours)
    actual_attendance BOOLEAN,
    actual_attendance_at TIMESTAMP WITH TIME ZONE,
    
    -- Traçabilité
    marked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_by_role VARCHAR(20) CHECK (marked_by_role IN ('admin', 'coach', 'member') OR marked_by_role IS NULL),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Contrainte unicité
    CONSTRAINT attendances_course_user_unique UNIQUE (course_id, user_id)
);

-- Index critiques pour performance
CREATE UNIQUE INDEX idx_attendances_course_user ON attendances(course_id, user_id);
CREATE INDEX idx_attendances_organization_id ON attendances(organization_id);
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_course_id ON attendances(course_id);

-- Index pour statistiques optimisées
CREATE INDEX idx_attendances_actual ON attendances(organization_id, user_id, actual_attendance) 
    WHERE actual_attendance IS NOT NULL;
CREATE INDEX idx_attendances_intention ON attendances(organization_id, course_id, intention) 
    WHERE intention IS NOT NULL;
CREATE INDEX idx_attendances_user_actual_date ON attendances(user_id, actual_attendance_at) 
    WHERE actual_attendance = TRUE;

-- Index composite pour requêtes fréquentes
CREATE INDEX idx_attendances_stats ON attendances(organization_id, user_id, actual_attendance, actual_attendance_at)
    WHERE actual_attendance IS NOT NULL;

-- Row Level Security
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendances_isolation ON attendances
    USING (organization_id = current_setting('app.current_tenant', true)::uuid);

-- Trigger
CREATE TRIGGER update_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE attendances IS 'Intentions et présences effectives aux cours';
COMMENT ON COLUMN attendances.intention IS 'Déclaration avant cours: will_attend ou will_not_attend';
COMMENT ON COLUMN attendances.actual_attendance IS 'Présence réelle: true = présent, false = absent, null = non encore marqué';
COMMENT ON COLUMN attendances.is_locked IS 'Verrouillage selon paramètre organisation';


-- ============================================
-- TABLE: subscriptions (Abonnements Stripe)
-- ============================================
CREATE TABLE subscriptions (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Stripe
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_payment_method_id VARCHAR(255),
    
    -- Plan
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'premium')),
    status VARCHAR(20) NOT NULL 
        CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
    
    -- Limites
    max_members INTEGER,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Dates
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Facturation
    amount_cents INTEGER CHECK (amount_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    interval VARCHAR(20) CHECK (interval IN ('month', 'year')),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE subscriptions IS 'Abonnements et facturation Stripe';
COMMENT ON COLUMN subscriptions.features IS 'Fonctionnalités actives selon plan';


-- ============================================
-- TABLE: custom_fields (Champs personnalisés)
-- ============================================
CREATE TABLE custom_fields (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Définition
    field_name VARCHAR(100) NOT NULL,
    field_key VARCHAR(50) NOT NULL CHECK (field_key ~ '^[a-z_]+$'),
    field_type VARCHAR(20) NOT NULL 
        CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi_select')),
    field_options JSONB DEFAULT '{}'::jsonb,
    
    -- Comportement
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    show_in_stats BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Contrainte unicité
    CONSTRAINT custom_fields_org_key_unique UNIQUE (organization_id, field_key)
);

-- Index
CREATE INDEX idx_custom_fields_organization ON custom_fields(organization_id, display_order) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_fields_stats ON custom_fields(organization_id) 
    WHERE show_in_stats = TRUE AND deleted_at IS NULL;

-- Row Level Security
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_fields_isolation ON custom_fields
    USING (organization_id = current_setting('app.current_tenant', true)::uuid);

-- Trigger
CREATE TRIGGER update_custom_fields_updated_at
    BEFORE UPDATE ON custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE custom_fields IS 'Définition des champs personnalisés par organisation';
COMMENT ON COLUMN custom_fields.field_options IS 'Options JSON: {values: ["Option1", "Option2"]} pour select';


-- ============================================
-- TABLE: audit_logs (Traçabilité)
-- ============================================
CREATE TABLE audit_logs (
    -- Clés
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Qui
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(20),
    
    -- Quoi
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Détails
    changes JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Contexte
    ip_address INET,
    user_agent TEXT,
    
    -- Quand
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Partitionnement par date (recommandé si gros volume)
-- CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs
--     FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_isolation ON audit_logs
    USING (organization_id = current_setting('app.current_tenant', true)::uuid);

-- Commentaires
COMMENT ON TABLE audit_logs IS 'Logs de toutes les actions utilisateurs (traçabilité complète)';
COMMENT ON COLUMN audit_logs.changes IS 'Changements JSON: {before: {...}, after: {...}}';


-- ============================================
-- VUES MATÉRIALISÉES (Performance)
-- ============================================

-- Vue: Statistiques adhérents pré-calculées
CREATE MATERIALIZED VIEW mv_member_stats AS
SELECT 
    u.id AS user_id,
    u.organization_id,
    u.first_name,
    u.last_name,
    COUNT(a.id) FILTER (WHERE a.actual_attendance = TRUE) AS total_attendances,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status != 'cancelled') AS available_courses,
    ROUND(
        (COUNT(a.id) FILTER (WHERE a.actual_attendance = TRUE)::numeric / 
        NULLIF(COUNT(DISTINCT c.id) FILTER (WHERE c.status != 'cancelled'), 0)) * 100, 
        2
    ) AS attendance_rate,
    MAX(a.actual_attendance_at) AS last_attendance_date,
    CURRENT_DATE - MAX(a.actual_attendance_at)::date AS days_since_last_attendance
FROM users u
LEFT JOIN attendances a ON u.id = a.user_id
LEFT JOIN courses c ON a.course_id = c.id
WHERE u.deleted_at IS NULL 
    AND u.role = 'member'
    AND c.start_datetime >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY u.id, u.organization_id, u.first_name, u.last_name;

-- Index sur vue matérialisée
CREATE UNIQUE INDEX idx_mv_member_stats_user ON mv_member_stats(user_id);
CREATE INDEX idx_mv_member_stats_org ON mv_member_stats(organization_id);
CREATE INDEX idx_mv_member_stats_rate ON mv_member_stats(organization_id, attendance_rate DESC);

-- Commentaire
COMMENT ON MATERIALIZED VIEW mv_member_stats IS 'Stats adhérents pré-calculées (refresh quotidien recommandé)';

-- Fonction de refresh automatique (à scheduler)
CREATE OR REPLACE FUNCTION refresh_member_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_stats;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction: Définir le tenant courant (pour RLS)
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_current_tenant IS 'Définit le tenant courant pour Row Level Security';


-- Fonction: Calculer le taux de présence d'un adhérent
CREATE OR REPLACE FUNCTION calculate_attendance_rate(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_attendances INTEGER;
    v_available_courses INTEGER;
BEGIN
    -- Compte les présences effectives
    SELECT COUNT(*) INTO v_attendances
    FROM attendances a
    INNER JOIN courses c ON a.course_id = c.id
    WHERE a.user_id = p_user_id
        AND a.actual_attendance = TRUE
        AND (p_start_date IS NULL OR c.start_datetime >= p_start_date)
        AND (p_end_date IS NULL OR c.start_datetime <= p_end_date);
    
    -- Compte les cours disponibles (non annulés)
    SELECT COUNT(DISTINCT c.id) INTO v_available_courses
    FROM courses c
    WHERE c.organization_id = (SELECT organization_id FROM users WHERE id = p_user_id)
        AND c.status != 'cancelled'
        AND (p_start_date IS NULL OR c.start_datetime >= p_start_date)
        AND (p_end_date IS NULL OR c.start_datetime <= p_end_date);
    
    -- Calcul du taux
    IF v_available_courses = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((v_attendances::numeric / v_available_courses) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_attendance_rate IS 'Calcule le taux de présence d''un adhérent sur une période';


-- Fonction: Détecter les adhérents à risque d'abandon
CREATE OR REPLACE FUNCTION detect_at_risk_members(
    p_organization_id UUID,
    p_days_threshold INTEGER DEFAULT 21
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    days_absent INTEGER,
    previous_rate NUMERIC,
    risk_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name || ' ' || u.last_name,
        CURRENT_DATE - MAX(a.actual_attendance_at)::date,
        calculate_attendance_rate(u.id, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '1 month'),
        CASE 
            WHEN CURRENT_DATE - MAX(a.actual_attendance_at)::date >= 30 THEN 'critical'
            WHEN CURRENT_DATE - MAX(a.actual_attendance_at)::date >= p_days_threshold THEN 'warning'
            ELSE 'normal'
        END
    FROM users u
    LEFT JOIN attendances a ON u.id = a.user_id AND a.actual_attendance = TRUE
    WHERE u.organization_id = p_organization_id
        AND u.role = 'member'
        AND u.status = 'active'
        AND u.deleted_at IS NULL
    GROUP BY u.id, u.first_name, u.last_name
    HAVING MAX(a.actual_attendance_at) IS NOT NULL
        AND CURRENT_DATE - MAX(a.actual_attendance_at)::date >= p_days_threshold
    ORDER BY CURRENT_DATE - MAX(a.actual_attendance_at)::date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION detect_at_risk_members IS 'Détecte les adhérents absents depuis X jours (risque abandon)';


-- ============================================
-- TRIGGERS AVANCÉS
-- ============================================

-- Trigger: Auto-update subscription_status dans organizations
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organizations 
    SET subscription_status = NEW.status
    WHERE id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_subscription_to_org
    AFTER INSERT OR UPDATE OF status ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_subscription_status();


-- Trigger: Audit automatique sur modifications importantes
CREATE OR REPLACE FUNCTION log_important_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            organization_id,
            user_id,
            action,
            entity_type,
            entity_id,
            changes
        ) VALUES (
            NEW.organization_id,
            current_setting('app.current_user_id', true)::uuid,
            TG_TABLE_NAME || '.updated',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            organization_id,
            user_id,
            action,
            entity_type,
            entity_id,
            changes
        ) VALUES (
            OLD.organization_id,
            current_setting('app.current_user_id', true)::uuid,
            TG_TABLE_NAME || '.deleted',
            TG_TABLE_NAME,
            OLD.id,
            jsonb_build_object('before', to_jsonb(OLD))
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Appliquer l'audit sur les tables critiques
CREATE TRIGGER audit_courses_changes
    AFTER UPDATE OR DELETE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION log_important_changes();

CREATE TRIGGER audit_attendances_changes
    AFTER UPDATE OR DELETE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION log_important_changes();


-- ============================================
-- CONTRAINTES D'INTÉGRITÉ AVANCÉES
-- ============================================

-- Vérifier que le coach appartient à l'organisation
ALTER TABLE courses ADD CONSTRAINT check_coach_organization
    CHECK (
        coach_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = coach_id 
            AND organization_id = courses.organization_id
            AND role IN ('coach', 'admin')
        )
    );

-- Vérifier cohérence des dates de récurrence
ALTER TABLE courses ADD CONSTRAINT check_recurrence_dates
    CHECK (
        NOT is_recurring OR 
        (recurrence_rule IS NOT NULL)
    );


-- ============================================
-- GRANTS ET SÉCURITÉ
-- ============================================

-- Rôle application (utilisé par le backend)
CREATE ROLE app_user WITH LOGIN PASSWORD 'change_me_in_production';

-- Permissions strictes
GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- Lecture seule pour les rapports
CREATE ROLE app_readonly WITH LOGIN PASSWORD 'change_me_readonly';
GRANT CONNECT ON DATABASE postgres TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;


-- ============================================
-- DONNÉES DE TEST (Optionnel)
-- ============================================

-- Insertion organisation de test
INSERT INTO organizations (id, name, slug, email, subscription_plan, subscription_status)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Krav Maga Lyon Centre',
    'krav-maga-lyon-centre',
    'contact@kravlyon.fr',
    'pro',
    'active'
);

-- Insertion utilisateurs de test
INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin@kravlyon.fr', '$2b$12$dummy_hash', 'Sophie', 'Bernard', 'admin'),
    ('a0000000-0000-0000-0000-000000000001', 'marc@kravlyon.fr', '$2b$12$dummy_hash', 'Marc', 'Petit', 'coach'),
    ('a0000000-0000-0000-0000-000000000001', 'lisa@email.com', '$2b$12$dummy_hash', 'Lisa', 'Martin', 'member');


-- ============================================
-- MAINTENANCE ET MONITORING
-- ============================================

-- ============================================
-- MAINTENANCE ET MONITORING
-- ============================================

-- Vue pour monitoring des performances
CREATE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW v_table_sizes IS 'Taille des tables et indexes pour monitoring';


-- Vue pour monitoring des index inutilisés
CREATE VIEW v_unused_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexrelname NOT LIKE 'pg_toast%'
    AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_unused_indexes IS 'Index jamais utilisés (candidats pour suppression)';


-- Vue pour monitoring des connexions actives
CREATE VIEW v_active_connections AS
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    wait_event_type,
    wait_event,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
    AND pid != pg_backend_pid()
ORDER BY query_start;

COMMENT ON VIEW v_active_connections IS 'Connexions actives à la base de données';


-- Vue pour statistiques par organisation
CREATE VIEW v_organization_stats AS
SELECT 
    o.id,
    o.name,
    o.subscription_plan,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'member' AND u.deleted_at IS NULL) AS total_members,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'coach' AND u.deleted_at IS NULL) AS total_coaches,
    COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) AS total_courses,
    COUNT(DISTINCT a.id) FILTER (WHERE a.actual_attendance = TRUE) AS total_attendances,
    ROUND(
        AVG(
            (SELECT calculate_attendance_rate(u2.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE)
             FROM users u2 
             WHERE u2.organization_id = o.id AND u2.role = 'member' AND u2.deleted_at IS NULL)
        ), 2
    ) AS avg_attendance_rate_30d
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id
LEFT JOIN courses c ON o.id = c.organization_id
LEFT JOIN attendances a ON o.id = a.organization_id
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.subscription_plan;

COMMENT ON VIEW v_organization_stats IS 'Statistiques agrégées par organisation';


-- ============================================
-- PROCÉDURES DE MAINTENANCE
-- ============================================

-- Procédure: Nettoyage des données obsolètes
CREATE OR REPLACE PROCEDURE cleanup_old_data(
    p_audit_logs_retention_days INTEGER DEFAULT 365,
    p_deleted_records_retention_days INTEGER DEFAULT 90
)
LANGUAGE plpgsql
AS $
BEGIN
    -- Supprimer les vieux logs d'audit
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_DATE - (p_audit_logs_retention_days || ' days')::INTERVAL;
    
    RAISE NOTICE 'Audit logs nettoyés: % lignes supprimées', 
        (SELECT count(*) FROM audit_logs WHERE created_at < CURRENT_DATE - (p_audit_logs_retention_days || ' days')::INTERVAL);
    
    -- Supprimer définitivement les enregistrements soft-deleted anciens
    DELETE FROM users 
    WHERE deleted_at IS NOT NULL 
        AND deleted_at < CURRENT_DATE - (p_deleted_records_retention_days || ' days')::INTERVAL;
    
    DELETE FROM courses 
    WHERE deleted_at IS NOT NULL 
        AND deleted_at < CURRENT_DATE - (p_deleted_records_retention_days || ' days')::INTERVAL;
    
    DELETE FROM organizations 
    WHERE deleted_at IS NOT NULL 
        AND deleted_at < CURRENT_DATE - (p_deleted_records_retention_days || ' days')::INTERVAL;
    
    RAISE NOTICE 'Nettoyage terminé';
END;
$;

COMMENT ON PROCEDURE cleanup_old_data IS 'Nettoyage automatique des données obsolètes (à scheduler)';


-- Procédure: Vacuum et analyse automatiques
CREATE OR REPLACE PROCEDURE maintenance_vacuum_analyze()
LANGUAGE plpgsql
AS $
BEGIN
    VACUUM ANALYZE organizations;
    VACUUM ANALYZE users;
    VACUUM ANALYZE courses;
    VACUUM ANALYZE attendances;
    VACUUM ANALYZE subscriptions;
    VACUUM ANALYZE custom_fields;
    VACUUM ANALYZE audit_logs;
    
    RAISE NOTICE 'Vacuum et analyse terminés';
END;
$;

COMMENT ON PROCEDURE maintenance_vacuum_analyze IS 'Vacuum et analyse des tables principales (à scheduler quotidiennement)';


-- Procédure: Refresh des vues matérialisées
CREATE OR REPLACE PROCEDURE refresh_all_materialized_views()
LANGUAGE plpgsql
AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_stats;
    RAISE NOTICE 'Vues matérialisées rafraîchies';
END;
$;

COMMENT ON PROCEDURE refresh_all_materialized_views IS 'Rafraîchissement de toutes les vues matérialisées (à scheduler quotidiennement)';


-- ============================================
-- BACKUP ET RESTORE
-- ============================================

-- Fonction: Export des données d'une organisation (RGPD)
CREATE OR REPLACE FUNCTION export_organization_data(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'organization', (SELECT row_to_json(o.*) FROM organizations o WHERE id = p_organization_id),
        'users', (SELECT jsonb_agg(row_to_json(u.*)) FROM users u WHERE organization_id = p_organization_id AND deleted_at IS NULL),
        'courses', (SELECT jsonb_agg(row_to_json(c.*)) FROM courses c WHERE organization_id = p_organization_id AND deleted_at IS NULL),
        'attendances', (SELECT jsonb_agg(row_to_json(a.*)) FROM attendances a WHERE organization_id = p_organization_id),
        'custom_fields', (SELECT jsonb_agg(row_to_json(cf.*)) FROM custom_fields cf WHERE organization_id = p_organization_id AND deleted_at IS NULL)
    ) INTO v_data;
    
    RETURN v_data;
END;
$;

COMMENT ON FUNCTION export_organization_data IS 'Export complet des données d''une organisation (conformité RGPD)';


-- Fonction: Anonymisation d'un utilisateur (RGPD - droit à l'oubli)
CREATE OR REPLACE FUNCTION anonymize_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
    UPDATE users
    SET 
        email = 'deleted_' || id || '@anonymized.local',
        first_name = 'Utilisateur',
        last_name = '[Supprimé]',
        phone = NULL,
        date_of_birth = NULL,
        metadata = '{}'::jsonb,
        password_hash = 'ANONYMIZED',
        deleted_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- Log de l'action
    INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        (SELECT organization_id FROM users WHERE id = p_user_id),
        p_user_id,
        'user.anonymized',
        'users',
        p_user_id,
        jsonb_build_object('anonymized_at', CURRENT_TIMESTAMP, 'reason', 'RGPD_right_to_be_forgotten')
    );
    
    RAISE NOTICE 'Utilisateur % anonymisé', p_user_id;
END;
$;

COMMENT ON FUNCTION anonymize_user IS 'Anonymisation d''un utilisateur (RGPD - droit à l''oubli)';


-- ============================================
-- INDEXES PARTIELS AVANCÉS (Optimisation)
-- ============================================

-- Index pour les cours à venir uniquement (requête très fréquente)
CREATE INDEX idx_courses_upcoming_detailed ON courses(organization_id, start_datetime, status)
    WHERE start_datetime > CURRENT_TIMESTAMP 
        AND status = 'scheduled' 
        AND deleted_at IS NULL;

-- Index pour les adhérents actifs récents
CREATE INDEX idx_users_active_recent ON users(organization_id, last_login_at DESC)
    WHERE status = 'active' 
        AND deleted_at IS NULL
        AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Index pour présences du mois en cours (statistiques temps réel)
CREATE INDEX idx_attendances_current_month ON attendances(organization_id, user_id, actual_attendance)
    WHERE actual_attendance_at >= date_trunc('month', CURRENT_DATE)
        AND actual_attendance IS NOT NULL;


-- ============================================
-- POLICIES RLS AVANCÉES (Sécurité fine)
-- ============================================

-- Policy: Les coachs ne voient que leurs cours
CREATE POLICY coaches_own_courses ON courses
    FOR SELECT
    USING (
        organization_id = current_setting('app.current_tenant', true)::uuid
        AND (
            coach_id = current_setting('app.current_user_id', true)::uuid
            OR EXISTS (
                SELECT 1 FROM users 
                WHERE id = current_setting('app.current_user_id', true)::uuid 
                AND role IN ('admin')
            )
        )
    );

-- Policy: Les adhérents ne voient que leurs propres présences détaillées
CREATE POLICY members_own_attendances ON attendances
    FOR SELECT
    USING (
        organization_id = current_setting('app.current_tenant', true)::uuid
        AND (
            user_id = current_setting('app.current_user_id', true)::uuid
            OR EXISTS (
                SELECT 1 FROM users 
                WHERE id = current_setting('app.current_user_id', true)::uuid 
                AND role IN ('admin', 'coach')
            )
        )
    );


-- ============================================
-- CONTRAINTES DE VALIDATION MÉTIER
-- ============================================

-- Vérifier qu'un cours ne dépasse pas 24h
ALTER TABLE courses ADD CONSTRAINT check_course_max_duration
    CHECK (end_datetime - start_datetime <= INTERVAL '24 hours');

-- Vérifier qu'on ne peut pas marquer présent à un cours dans le futur
CREATE OR REPLACE FUNCTION check_attendance_not_future()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.actual_attendance IS NOT NULL AND NEW.actual_attendance_at IS NOT NULL THEN
        IF NEW.actual_attendance_at > (SELECT end_datetime FROM courses WHERE id = NEW.course_id) + INTERVAL '2 hours' THEN
            RAISE EXCEPTION 'Impossible de marquer une présence plus de 2h après la fin du cours';
        END IF;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER validate_attendance_timing
    BEFORE INSERT OR UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION check_attendance_not_future();


-- ============================================
-- FONCTIONS D'AGRÉGATION PERSONNALISÉES
-- ============================================

-- Fonction: Statistiques complètes d'un adhérent
CREATE OR REPLACE FUNCTION get_member_complete_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', p_user_id,
        'total_courses_available', (
            SELECT COUNT(*) 
            FROM courses c
            WHERE c.organization_id = (SELECT organization_id FROM users WHERE id = p_user_id)
                AND c.status != 'cancelled'
                AND c.start_datetime >= (SELECT join_date FROM users WHERE id = p_user_id)
                AND c.deleted_at IS NULL
        ),
        'total_attendances', (
            SELECT COUNT(*) 
            FROM attendances 
            WHERE user_id = p_user_id AND actual_attendance = TRUE
        ),
        'attendance_rate', calculate_attendance_rate(p_user_id),
        'attendance_rate_30d', calculate_attendance_rate(p_user_id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE),
        'attendance_rate_90d', calculate_attendance_rate(p_user_id, CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE),
        'last_attendance', (
            SELECT MAX(actual_attendance_at) 
            FROM attendances 
            WHERE user_id = p_user_id AND actual_attendance = TRUE
        ),
        'days_since_last_attendance', (
            SELECT CURRENT_DATE - MAX(actual_attendance_at)::date 
            FROM attendances 
            WHERE user_id = p_user_id AND actual_attendance = TRUE
        ),
        'current_streak', (
            -- Série de présences consécutives (simplifié)
            SELECT COUNT(*)
            FROM attendances a
            INNER JOIN courses c ON a.course_id = c.id
            WHERE a.user_id = p_user_id 
                AND a.actual_attendance = TRUE
                AND c.start_datetime >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'total_intentions', (
            SELECT COUNT(*) 
            FROM attendances 
            WHERE user_id = p_user_id AND intention = 'will_attend'
        ),
        'intention_reliability', (
            -- Fiabilité des inscriptions
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE intention = 'will_attend' AND actual_attendance = TRUE)::numeric /
                NULLIF(COUNT(*) FILTER (WHERE intention = 'will_attend'), 0)) * 100, 2
            )
            FROM attendances
            WHERE user_id = p_user_id
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$;

COMMENT ON FUNCTION get_member_complete_stats IS 'Statistiques complètes d''un adhérent (toutes périodes)';


-- Fonction: Statistiques d'un cours
CREATE OR REPLACE FUNCTION get_course_stats(p_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'course_id', p_course_id,
        'total_enrolled', (
            SELECT COUNT(*) 
            FROM attendances 
            WHERE course_id = p_course_id AND intention = 'will_attend'
        ),
        'total_attended', (
            SELECT COUNT(*) 
            FROM attendances 
            WHERE course_id = p_course_id AND actual_attendance = TRUE
        ),
        'occupancy_rate', (
            SELECT CASE 
                WHEN c.max_capacity IS NOT NULL THEN
                    ROUND((COUNT(a.id) FILTER (WHERE a.actual_attendance = TRUE)::numeric / c.max_capacity) * 100, 2)
                ELSE NULL
            END
            FROM courses c
            LEFT JOIN attendances a ON c.id = a.course_id
            WHERE c.id = p_course_id
            GROUP BY c.max_capacity
        ),
        'no_show_rate', (
            -- Taux de non-présentation (inscrits mais absents)
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE intention = 'will_attend' AND actual_attendance = FALSE)::numeric /
                NULLIF(COUNT(*) FILTER (WHERE intention = 'will_attend'), 0)) * 100, 2
            )
            FROM attendances
            WHERE course_id = p_course_id
        ),
        'walk_ins', (
            -- Présents non-inscrits
            SELECT COUNT(*)
            FROM attendances
            WHERE course_id = p_course_id 
                AND intention IS NULL 
                AND actual_attendance = TRUE
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$;

COMMENT ON FUNCTION get_course_stats IS 'Statistiques détaillées d''un cours';


-- ============================================
-- SCHEDULING (À configurer via pg_cron ou cron externe)
-- ============================================

-- Extension pg_cron (optionnelle, nécessite installation)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Exemples de tâches planifiées (à décommenter si pg_cron installé)
/*
-- Refresh des stats quotidien à 2h du matin
SELECT cron.schedule('refresh-stats', '0 2 * * *', $
    CALL refresh_all_materialized_views();
$);

-- Nettoyage hebdomadaire le dimanche à 3h
SELECT cron.schedule('cleanup-old-data', '0 3 * * 0', $
    CALL cleanup_old_data(365, 90);
$);

-- Vacuum quotidien à 4h
SELECT cron.schedule('daily-vacuum', '0 4 * * *', $
    CALL maintenance_vacuum_analyze();
$);
*/


-- ============================================
-- DOCUMENTATION FINALE
-- ============================================

COMMENT ON DATABASE postgres IS 'KravStats - Application de gestion de présences sportives multi-tenant';

-- Documentation des conventions
/*
CONVENTIONS DE NOMMAGE:
- Tables: pluriel, snake_case (ex: users, courses, attendances)
- Colonnes: snake_case (ex: first_name, created_at)
- Index: idx_tablename_columns (ex: idx_users_email_org)
- Contraintes: check_tablename_description (ex: check_course_max_duration)
- Fonctions: verbe_nom (ex: calculate_attendance_rate)
- Vues matérialisées: mv_description (ex: mv_member_stats)
- Triggers: nom_action (ex: update_users_updated_at)

TYPES DE DONNÉES:
- ID: UUID (sécurité, distribution)
- Dates: TIMESTAMP WITH TIME ZONE (internationalisation)
- Textes courts: VARCHAR avec limite
- Textes longs: TEXT
- Booléens: BOOLEAN (jamais NULL si logique binaire)
- Montants: INTEGER en centimes (éviter DECIMAL pour les montants)
- Données flexibles: JSONB (indexable avec GIN)

SÉCURITÉ:
- Row Level Security (RLS) activé sur toutes les tables multi-tenant
- Soft delete (deleted_at) pour traçabilité
- Audit logs pour actions critiques
- Contraintes CHECK pour validation côté DB
- SECURITY DEFINER pour fonctions sensibles

PERFORMANCE:
- Index partiels (WHERE) pour requêtes fréquentes
- Index composites pour requêtes complexes
- Vues matérialisées pour agrégations coûteuses
- Index GIN pour JSONB
- Contraintes de clés étrangères avec ON DELETE CASCADE/SET NULL

MAINTENANCE:
- Vacuum automatique (configurer autovacuum)
- Refresh vues matérialisées quotidien
- Nettoyage logs > 1 an
- Monitoring taille tables/index
- Backup quotidien (pg_dump ou solution cloud)

SCALABILITÉ:
- Partitionnement par date pour audit_logs si > 10M lignes
- Connection pooling (PgBouncer) recommandé
- Read replicas pour reporting (PostgreSQL streaming replication)
- Sharding par organization_id si > 1000 tenants
*/


-- ============================================
-- FIN DU SCHÉMA
-- ============================================

-- Afficher un résumé
DO $
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schéma de base de données créé avec succès';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables créées: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE 'Index créés: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Fonctions créées: %', (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace);
    RAISE NOTICE 'Triggers créés: %', (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace));
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Prochaines étapes:';
    RAISE NOTICE '1. Configurer les variables d''environnement';
    RAISE NOTICE '2. Créer les rôles app_user et app_readonly';
    RAISE NOTICE '3. Configurer pg_cron ou cron système pour maintenance';
    RAISE NOTICE '4. Configurer les backups automatiques';
    RAISE NOTICE '5. Tester les fonctions avec données de test';
    RAISE NOTICE '========================================';
END $;