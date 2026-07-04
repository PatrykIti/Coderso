# TASK-482-06-L02: Internal starter-content route (dry-run + apply)
# FileName: TASK-482-06-L02-Starter-Content-Route.md

**Parent Subtask:** TASK-482-06
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-06-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

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
- **Out-of-scope:** the service logic (06-L01); UI selection (part of 05/04 step
  rendering).

## Security Contract

- **Endpoint visibility:** **internal** (`/admin/api/*`) — authenticated admin
  only; this is a privileged content-seeding write.
- **Auth model:** session-bound admin (`requireAuth` via the router deps + RBAC).
- **RBAC permission(s):** `settings:write` (it mutates `site.*` shell refs) — and
  it performs a kit install, so additionally require the kit/solution install
  permission if one exists in `RBAC_SPEC.md` (e.g. `solutionKits:write`); use
  `requirePermission` with the strictest applicable. Preview requires at least
  `settings:read`.
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

  router.post("/setup/starter-content/preview", requirePermission("settings:read"), async (ctx) => {
    validate(starterContentSchema, ctx.body);
    try {
      return { summary: await previewStarterContent(toChoice(ctx.body)) };
    } catch (e) { throw mapSetupRouteError(e); }
  });

  router.post("/setup/starter-content/apply", requirePermission("settings:write"), async (ctx) => {
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
- **Regression-test shape:** preview returns a plan, writes nothing; apply seeds
  + sets shell settings + audits; both-or-neither selector ⇒ 400; missing CSRF ⇒
  rejected; non-admin ⇒ 403.

## Testing Requirements

- **Lane:** Bun — route + kit lifecycle ⇒ Bun.
  `tests/integration/routes/setupStarterContent.test.ts` and a Bun security case
  in `tests/security/` for CSRF-required + RBAC + blueprint-injection rejection.
- Cases: preview (no writes), apply (writes + audit + settings), invalid
  selector, missing CSRF, missing permission, unknown kit id.
- Update `tests/security/codersoSecurityGate.test.ts` to include the new internal
  POSTs as CSRF-required, RBAC-guarded routes.
- No migration artifacts.
