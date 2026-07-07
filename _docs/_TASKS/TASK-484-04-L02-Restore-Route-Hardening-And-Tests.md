# TASK-484-04-L02: Restore route confirm-gate + security tests
# FileName: TASK-484-04-L02-Restore-Route-Hardening-And-Tests.md

**Parent Subtask:** TASK-484-04
**Priority:** High
**Category:** `backups` / `route-security`
**Estimated Effort:** Small
**Dependencies:** TASK-484-04-L01 (`restoreBackup(id, { confirm })` + new domain
codes).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Harden the existing `POST /backups/:id/restore` route
  (`backupRoutes.ts` 148-162) to require an explicit `{ confirm: true }` body,
  pass it through to `restoreBackup`, keep RBAC/CSRF/audit, and add Bun route +
  security tests. Restore is now a real, destructive op, so the route must make
  intent explicit and reject unknown body fields.
- **Owning module(s) to create-or-extend:**
  `core/server/routes/backupRoutes.ts` (restore handler + validate),
  `core/server/validation/backupSchemas.ts` (new `restoreBackupSchema`),
  `tests/integration/routes/backups.test.ts` (the existing route
  registration + RBAC matrix — `POST /backups/:id/restore` is already asserted
  at :47 via the `makeRouter` stub-router with injected
  `requirePermission`/`validate` deps; extend it additively with the
  confirm-gate, reject-unknown and error-mapping cases). The additive claim
  holds because L01 **keeps** the `backup_restore_unsupported` branch in
  `mapBackupError` mapped for back-compat — so the pre-existing assertion at
  :148-151 ("mapBackupError returns stable API errors" →
  `backup_restore_unsupported` 409) stays green unmodified; do not delete or
  rewrite it.
  **Not** `tests/security/codersoSecurityGate.test.ts`: verified it contains no
  route/RBAC/CSRF/rate-limit matrix and zero backups coverage (it tests
  `evaluateSubmissionAccess`/`evaluateBookingAccess` + form-nonce tampering
  only). `tests/security/` is a **pinned shared surface** edited additively by
  the parallel TASK-482/483 streams — this leaf does not touch it or invent a
  new route-bucket structure there.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`.
- **Out of scope:** the restore algorithm (L01).

---

## Security Contract

Internal destructive write — full contract:

- **Endpoint visibility:** `internal` — `POST /backups/:id/restore` under
  `/admin/api/*`. No public surface.
- **Auth model:** admin session cookie.
- **RBAC:** `requirePermission("backups:write")` (unchanged — restore is a
  destructive write).
- **CSRF:** required (non-safe + session) via central `enforceCsrf`.
- **Rate-limit bucket:** `admin_write`.
- **Validation:** body validated by `restoreBackupSchema`
  (`additionalProperties: false`, `required: ["confirm"]`,
  `confirm: { const: true }` or `{ type: "boolean", enum: [true] }`) — restore
  cannot proceed without an explicit confirmation, and unknown keys are rejected.
  The path `:id` is the only identifier; no client-supplied artifact data is
  accepted (the artifact is the stored backup, not request input).
- **Anti-abuse:** confirmation flag + `admin_write` bucket; restore refuses
  non-complete backups (`backup_not_ready`) and malformed artifacts
  (`backup_restore_invalid_artifact`) from L01.
- **Secret/PII handling:** response is the (redacted) backup record via
  `mapBackup`; audit metadata records `{ status }` only — no artifact contents,
  paths, or secrets. Restore's settings path keeps secrets encrypted (L01).

---

## Implementation Pseudocode

### Route (`backupRoutes.ts`)

```ts
router.post("/backups/:id/restore", requirePermission("backups:write"), async (ctx) => {
  return withBackupErrors(async () => {
    validate(restoreBackupSchema, ctx.body ?? {});                 // requires { confirm: true }
    const body = (ctx.body ?? {}) as { confirm?: boolean };
    const backup = await restoreBackup(ctx.params.id, { confirm: body.confirm === true });
    await logAudit({
      actorId: ctx.user?.id ?? null,
      action: "backups.restore",
      targetType: "backup",
      targetId: backup.id,
      metadata: { status: backup.status },
      ip: ctx.ip, userAgent: ctx.userAgent,
    });
    return backup;
  });
});
```

### Schema (`backupSchemas.ts`)

```ts
export const restoreBackupSchema = {
  type: "object",
  additionalProperties: false,
  required: ["confirm"],
  properties: { confirm: { type: "boolean", enum: [true] } },
};
```

**Data flow:** request → RBAC → CSRF → validate `confirm` → `restoreBackup` →
audit → record.

**Error handling:** `withBackupErrors` + `mapBackupError` map the new L01 codes
(`backup_restore_confirmation_required` 400, `backup_restore_invalid_artifact`
422, `backup_artifact_unreadable` 502, plus existing `backup_not_found`/
`backup_not_ready`).

**Regression-test shape (Bun):** `POST /backups/:id/restore` requires
`backups:write`; missing/`false` `confirm` → validation/`confirmation_required`;
unknown body key → `additionalProperties` 400; happy path returns the record and
audits; the restore handler no longer **emits** `backup_restore_unsupported`
(the `mapBackupError` back-compat mapping and its existing assertion at
:148-151 remain untouched — per L01, the service just never throws it).

> **Shared-DB pin (mandatory):** the Bun suite shares ONE remote Postgres
> (`DATABASE_URL` in `.env`) with TASK-482/483 and the owner, and `restoreBackup`
> is a full delete+re-insert of all snapshot tables. The happy-path test
> exercises the confirm-gate / audit / error-mapping with a **stubbed or
> injected `restoreBackup`** (or a dry-run/rollback-scoped seam from L01) —
> matching the existing `makeRouter` stub-router pattern in
> `tests/integration/routes/backups.test.ts` :17-53, where deps are injected and
> validation tests short-circuit before service access. The route suite must
> **never** invoke a real destructive restore against the shared DB.

---

## Testing Requirements

Bun lane (route + security). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/routes/backups.test.ts` — confirm-gate, RBAC
  (`requirePermission("backups:write")` wiring), reject-unknown, error mapping,
  and route registration (restore path already asserted at :47). Happy path uses
  a stubbed/injected `restoreBackup` per the shared-DB pin above — never a real
  destructive restore. The internal visibility + CSRF (`enforceCsrf`) +
  `admin_write` bucket are enforced centrally by the `/admin/api/*` middleware
  chain; this leaf asserts the route-level RBAC + validation here and does
  **not** add a new matrix to the shared `tests/security/` surface (see Owning
  modules — `codersoSecurityGate.test.ts` has no route/backups coverage).
