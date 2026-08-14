/**
 * Stable identity constants for built-in database seeds (TASK-518).
 *
 * `DEFAULT_ADMIN_ROLE_ID` is the ONE fixed UUID of the default `admin` role
 * (`permissions: ["*"]`). It is migration-guaranteed (see
 * `core/db/migrations/0071_seed_admin_role.sql`) and consumed by
 * `createFirstAdmin` / `seedAdmin()` in a follow-up leaf (TASK-518-02).
 *
 * This literal must NEVER change: existing installs reference the role by id
 * (`user_roles.role_id`), and the RBAC backup/restore contract (TASK-511-04)
 * depends on the id being identical across installs.
 */
export const DEFAULT_ADMIN_ROLE_ID = "a0000000-0000-4000-8000-000000000001";
