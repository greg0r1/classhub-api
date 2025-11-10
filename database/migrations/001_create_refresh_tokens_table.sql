-- Migration: Create refresh_tokens table
-- Date: 2025-11-10
-- Description: Ajout de la table refresh_tokens pour gérer l'authentification avec refresh token

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    user_agent VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Index pour améliorer les performances de recherche
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, revoked);

-- Commentaires
COMMENT ON TABLE refresh_tokens IS 'Stockage des refresh tokens pour l''authentification JWT';
COMMENT ON COLUMN refresh_tokens.id IS 'Identifiant unique du refresh token';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Référence à l''utilisateur';
COMMENT ON COLUMN refresh_tokens.token IS 'Token aléatoire sécurisé (128 caractères hex)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Date d''expiration (30 jours après création)';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Indique si le token a été révoqué (logout, rotation)';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User-Agent du client pour tracking';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'Adresse IP du client pour sécurité';
COMMENT ON COLUMN refresh_tokens.created_at IS 'Date de création du token';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Date de révocation du token';
