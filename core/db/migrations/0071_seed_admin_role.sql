-- TASK-518: Seed the default admin role (permissions: ["*"]) with a stable,
-- fixed id (DEFAULT_ADMIN_ROLE_ID from core/db/seedConstants.ts).
--
-- Idempotent + non-destructive:
-- - if a role with the stable id already exists, `ON CONFLICT (id) DO NOTHING`
--   makes the re-run a no-op;
-- - if a legacy 'admin' role with a random id already exists (created ad-hoc by
--   createFirstAdmin / seedAdmin before this migration), the `WHERE NOT EXISTS`
--   guard prevents inserting a duplicate and never renumbers the existing row.
INSERT INTO roles (id, name, permissions, created_at)
SELECT 'a0000000-0000-4000-8000-000000000001', 'admin', '["*"]', now()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
ON CONFLICT (id) DO NOTHING;
