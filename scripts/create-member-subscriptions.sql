-- Migration pour créer la table des abonnements des membres (différente de la table subscriptions pour les orgs)
-- Date: 2025-11-10

BEGIN;

-- Créer la table pour les abonnements des membres aux cours
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type d'abonnement (JSONB pour flexibilité)
  subscription_type JSONB NOT NULL,

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  last_renewed_at DATE,

  -- Paiement
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_date TIMESTAMP,
  payment_method VARCHAR(50),
  payment_transaction_id VARCHAR(255),

  -- Métadonnées
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index pour les recherches
CREATE INDEX idx_member_subscriptions_org ON member_subscriptions(organization_id);
CREATE INDEX idx_member_subscriptions_user ON member_subscriptions(user_id);
CREATE INDEX idx_member_subscriptions_status ON member_subscriptions(status);
CREATE INDEX idx_member_subscriptions_dates ON member_subscriptions(start_date, end_date);

-- Trigger pour updated_at
CREATE TRIGGER update_member_subscriptions_updated_at
  BEFORE UPDATE ON member_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policy pour multi-tenant
ALTER TABLE member_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_subscriptions_isolation ON member_subscriptions
  USING (organization_id = current_setting('app.current_tenant', true)::uuid);

COMMIT;

-- Vérification
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'member_subscriptions'
ORDER BY ordinal_position;
