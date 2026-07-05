# TASK-482-06-L02: Internal starter-content route (dry-run + apply)
# FileName: TASK-482-06-L02-Starter-Content-Route.md

**Parent Subtask:** TASK-482-06
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-06-L01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Expose the starter-content service to the Phase-2 wizard via internal
  endpoints: a dry-run preview and an apply. The client may select only a known
  `kitId` or a named `blueprintKey`; the server resolves the actual definition.
- **Owning module(s) to create/extend:**
  - `core/server/routes/setupRoutes.ts` (new) exporting `registerSetupRoutes`,
    registered in `core/server/routes/index.ts`.
  - `core/server/validation/setupSchemas.ts` (new) — `starterContentSchema`
    (`{ kitId?: string; blueprintKey?: string; dryRun?: boolean }`,
    `additionalProperties: false`, exactly one selector required).
  - Reuse `requirePermission`, `validate` deps (same shape as
    `SettingsRouteDeps`); reuse `logAudit`.
  - Endpoints:
    - `POST /setup/starter-content/preview` → `previewStarterContent`.
    - `POST /setup/starter-content/apply` → `applyStarterContent(choice, ctx.user.id)`.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SOLUTION_KITS.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/RBAC_SPEC.md`, `_docs/AUDIT_SPEC.md`.
- **Out-of-scope:** the service logic (06-L01); the wizard step UI — the
  starter-content step body (`StarterContentStep.tsx`, which calls these
  preview/apply endpoints) is owned solely by **05-L02** (the Basic-track step
  bodies leaf), NOT by 04-L02's generic placeholder. This leaf ships only the
  two internal endpoints; 05-L02 is the single UI caller.
  **Provider-after-consumer note:** these endpoints land in 06 (after 05 per the
  04→05→06→07→08 order), so 05-L02's `StarterContentStep.tsx` is non-functional
  at runtime until this leaf lands. Ownership is disjoint (no writer collision);
  the wrinkle is only ordering, and it is safe because the 05 step is skippable
  and 05-L02's tests mock the client. See 05-L02's temporal-inversion note.

## Cross-Stream Coordination (pinned)

- **Parallel streams:** TASK-483 (analytics) and TASK-484 (backups) run
  concurrently on sibling branches and touch the same shared surfaces. All
  shared-surface edits from this task must be **additive and scoped to their
  own lines** — never restructure, reorder or reformat these files:
  - `core/server/routes/index.ts` (the single route aggregator): this task adds
    exactly **one** appended `import { registerSetupRoutes } from
    "./setupRoutes";` line plus **one** `registerSetupRoutes(router, { ... })`
    call block inside `registerAllRoutes` — nothing else changes.
  - `tests/security/`: additive only — a **new** test file (or new cases);
    never rewrite `codersoSecurityGate.test.ts` (see Testing Requirements).
  - Spec docs (`_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`,
    `_docs/AUDIT_SPEC.md`) are written solely by TASK-482-09-L02 (single
    482-stream writer per doc) — this leaf does **NOT** edit them; it only cites
    them as source-of-truth and 09-L02 documents the setup endpoints/audit
    action there.
- **Changelog/board:** changelog number **1220** is pinned for the TASK-482
  closure (TASK-482-09); 1219 (TASK-510), 1221 (TASK-483) and 1222 (TASK-484)
  are reserved by parallel streams. This implementation subtask never edits
  `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*`.
- **Forbidden paths for TASK-482:** `core/services/analytics/**`,
  `core/services/backups/**`, analytics/backups route modules,
  `core/db/schema.ts`, `core/db/migrations/**`.

## Security Contract

- **Endpoint visibility:** **internal** (`/admin/api/*`) — authenticated admin
  only; this is a privileged content-seeding write.
- **Auth model:** session-bound admin (`requireAuth` via the router deps + RBAC).
- **RBAC permission(s):** apply requires **`solution-kits:write`** (the real
  hyphenated permission guarding the existing `POST /solution-kits/:id/apply`
  and `/rollback` in `solutionKitsRoutes.ts`; listed as high-risk in
  `RBAC_SPEC.md`) **and** `settings:write` (it also mutates the `site.*` shell
  refs) — enforce both; a `settings:write`-only admin must NOT be able to run a
  kit install through this route. Preview also requires **`solution-kits:write`**
  (NOT `solution-kits:read`): unlike `POST /solution-kits/plan` (which calls the
  pure in-memory `previewSolutionKitPlan` = `buildSiteBuilderPlan`, writing
  nothing), the starter-content preview routes through `previewStarterContent` →
  `applyKitInstall({ dryRun: true })` → `applySolutionKitInstall`, which
  UNCONDITIONALLY persists a `solution_kit_install_runs` row (mode `dry_run`),
  one `solution_kit_install_items` row per operation and a
  `logAudit("solution_kits.apply")` record even in dry-run
  (`solutionKitsInstallService.ts` `applySolutionKitInstall`:
  `createInstallRun`/`appendInstallItem`/`finalizeInstallRun`/`logAudit`). The
  ONLY real dry-run-that-writes precedent — `POST /solution-kits/:id/apply` with
  `dryRun` — is gated by `solution-kits:write` in `solutionKitsRoutes.ts`, so
  preview must match it; granting these DB-write side-effects to a
  `solution-kits:read` principal would be an RBAC downgrade and a repeatable
  run/audit-row-growth abuse vector against the SHARED remote Postgres. Preview
  does NOT mutate `site.*` shell refs, so it does not require `settings:write`.
- **CSRF on internal writes:** **required** — both POSTs are state-changing
  internal mutations; `enforceCsrf` (`httpServer.ts` line 358) applies (these are
  NOT under the `/auth` exemption).
- **Rate-limit bucket:** `admin_write` (default for internal POST). No public
  bucket.
- **Validation schema-owner module:** `setupSchemas.ts` →
  `starterContentSchema`, `.strict` (`additionalProperties: false`). Reject a
  payload with both `kitId` and `blueprintKey`, or neither, with
  `starter_choice_invalid`.
- **Anti-abuse:** the schema permits only an id/key (string), never a blueprint
  body — the server maps it to a curated definition (06-L01). This is the primary
  control against arbitrary content injection.
- **Secret/PII handling:** none; audit `setup.starter_content.applied` records
  only `{ kitId|blueprintKey, runId, dryRun }`.

## Implementation Pseudocode

```ts
export function registerSetupRoutes(router: Router, deps: SetupRouteDeps) {
  const { requirePermission, validate } = deps;

  // Compose guards: apply is both a kit install (solution-kits:write — same
  // permission as POST /solution-kits/:id/apply) and a site-shell settings
  // mutation (settings:write).
  const requireAll =
    (...guards: Array<(ctx: RouteContext) => Promise<void> | void>) =>
    async (ctx: RouteContext) => {
      for (const guard of guards) await guard(ctx);
    };

  // Preview requires solution-kits:write, NOT :read — previewStarterContent
  // → applyKitInstall({dryRun:true}) → applySolutionKitInstall persists a
  // dry_run run + items + audit row (see Security Contract); matches the only
  // real dry-run-that-writes precedent, POST /solution-kits/:id/apply (:write).
  router.post("/setup/starter-content/preview", requirePermission("solution-kits:write"), async (ctx) => {
    validate(starterContentSchema, ctx.body);
    try {
      return { summary: await previewStarterContent(toChoice(ctx.body)) };
    } catch (e) { throw mapSetupRouteError(e); }
  });

  router.post("/setup/starter-content/apply",
    requireAll(requirePermission("solution-kits:write"), requirePermission("settings:write")),
    async (ctx) => {
    validate(starterContentSchema, ctx.body);
    try {
      const result = await applyStarterContent(toChoice(ctx.body), ctx.user!.id);
      await logAudit({ actorId: ctx.user!.id, action: "setup.starter_content.applied",
        targetType: "settings", targetId: "starter_content",
        metadata: { runId: result.runId } });
      return result;
    } catch (e) { throw mapSetupRouteError(e); }
  });
}

const mapSetupRouteError = (e: unknown) => {
  if (e instanceof ApiError) return e;
  if (e instanceof Error && e.message === "starter_kit_unknown")
    return new ApiError("starter_kit_unknown", "Unknown starter kit", 400);
  if (e instanceof Error && e.message === "starter_choice_invalid")
    return new ApiError("starter_choice_invalid", "Provide exactly one of kitId/blueprintKey", 400);
  return new ApiError("setup_error", "Could not complete starter-content request.", 500);
};
```

- **Data flow:** validated `{ kitId|blueprintKey, dryRun }` → service → summary /
  `{ runId, summary }`.
- **Error handling:** domain codes mapped at the boundary via `mapSetupRouteError`.
- **Regression-test shape:** preview returns a plan with no content/template
  writes (the dry-run still persists a `dry_run` run/items/audit record — see
  06-L01); apply seeds + sets shell settings + audits; both-or-neither selector
  ⇒ 400; missing CSRF ⇒ rejected; non-admin / missing `solution-kits:write` ⇒
  403.

## Testing Requirements

- **Lane:** Bun — route + kit lifecycle ⇒ Bun.
  `tests/integration/routes/setupStarterContent.test.ts` and a **new** Bun
  security test — `tests/security/setupStarterContent.security.test.ts` (or
  dedicated cases inside the route integration test) — asserting CSRF-required
  + RBAC (`solution-kits:write` + `settings:write` for apply,
  `solution-kits:write` for preview — because dry-run persists run/items/audit
  rows; assert a `solution-kits:read`-only principal is rejected 403 on preview)
  + blueprint-injection rejection (a
  `SolutionKitDefinition`-shaped body ⇒ 400 via the `.strict` schema).
- Do **not** modify `tests/security/codersoSecurityGate.test.ts` for this: it is
  a forms/booking captcha + nonce **service** gate (imports
  `evaluateSubmissionAccess`/`assert*SubmissionNonce` only) with no per-route
  CSRF/RBAC expectation inventory to extend — and it is a shared surface with
  the parallel TASK-483/484 streams. Only touch it if a route-expectation
  inventory is first introduced there by an explicit cross-stream decision.
- Cases: preview (no content writes; dry-run run/audit rows cleaned up), apply
  (writes + audit + settings), invalid selector, missing CSRF, missing
  permission (assert `settings:write` alone is rejected for apply), unknown kit
  id. Follow the shared-remote-DB rules from 06-L01 (self-restoring
  setup/teardown; prefer a stubbed service for pure route-guard cases —
  precedent: `tests/integration/routes/solutionKitsRoutes.test.ts` never runs a
  real install).
- No migration artifacts.
