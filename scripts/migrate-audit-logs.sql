-- Migration pour audit_logs: ajouter old_values et new_values
-- Date: 2025-11-09

BEGIN;

-- Ajouter les nouvelles colonnes old_values et new_values
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS old_values jsonb,
ADD COLUMN IF NOT EXISTS new_values jsonb,
ADD COLUMN IF NOT EXISTS http_method varchar(10),
ADD COLUMN IF NOT EXISTS request_url varchar(255),
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS success boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message text;

-- Migrer les données existantes: copier changes vers new_values
UPDATE audit_logs
SET new_values = changes
WHERE changes IS NOT NULL AND new_values IS NULL;

-- Supprimer l'ancienne colonne changes si besoin
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS changes;

COMMIT;

-- Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
