# TASK-482-06-L01: `starterContentService` over the kit installer (dry-run/apply/rollback + shell wiring)
# FileName: TASK-482-06-L01-Starter-Content-Service.md

**Parent Subtask:** TASK-482-06
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-05-L01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** A thin onboarding service that seeds starter content by delegating to
  the existing kit installer, then wires the result into the public site shell.
  It supports a dry-run preview (note: the installer still persists a `dry_run`
  run + item + audit record — only content/template writes are skipped, see
  pseudocode), an apply (with `actorId` for audit), and a rollback that reverses
  the apply **and restores the prior `site.*` shell settings** (the underlying
  `rollbackKitInstall` reverses content/template seeds only and never touches
  settings). The blueprint is **server-chosen** — a
  catalog kit id from `solutionKitsCatalog.ts`, or a trusted in-repo
  `SolutionKitDefinition` override — never accepted from the client.
- **Owning module(s) to create:** `core/services/setup/starterContentService.ts`
  exporting `previewStarterContent`, `applyStarterContent`,
  `rollbackStarterContent`. It calls:
  - `applyKitInstall` / `rollbackKitInstall` from
    `core/services/kits/kitInstaller.ts` (the wrappers that add manifest +
    template seeds; **these** are the right entrypoints, not the lower-level
    `applySolutionKitInstall` in `solutionKitsInstallService.ts`).
  - `getSolutionKitFromCatalog` (`solutionKitsCatalog.ts`) to resolve a known
    `kitId`, or a curated `SolutionKitDefinition` constant for the default
    starter blueprint.
  - `setSettings` (`settingsService.ts`) to point
    `site.homepageId` / `site.navigationMenuId` / `site.footerTemplateId` at the
    seeded records (the same keys validated by `assertSiteShellReferencesExist`
    in `settingsRoutes.ts`).
- **Source-of-truth docs:** `_docs/SOLUTION_KITS.md`, `_docs/BLUEPRINT_COMPOSER.md`,
  `_docs/CMS_SPEC.md`, `_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md`.
- **Out-of-scope:** the HTTP route (06-L02); designing new kits (reuse catalog).

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this leaf never touches them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Security Contract

- **Endpoint visibility:** none (service); 06-L02 owns the internal route.
- **Auth model:** the service trusts its caller (the authenticated route) for the
  `actorId`; it must **reject** any attempt to pass a raw client blueprint —
  callers may pass a `kitId: string` (looked up in the catalog) or select a named
  server blueprint by key, but never arbitrary `SolutionKitDefinition` JSON from
  request input.
- **RBAC permission(s):** enforced by the route (06-L02):
  `solution-kits:write` + `settings:write` for apply, and **`solution-kits:write`
  for preview too** (NOT `solution-kits:read`) — `previewStarterContent` calls
  `applyKitInstall({ dryRun: true })` → `applySolutionKitInstall`, which
  unconditionally persists a `dry_run` run + items + `logAudit` row (see the NOTE
  in the pseudocode), so preview carries the same DB-write side-effects as the
  only real dry-run-that-writes precedent, `POST /solution-kits/:id/apply`
  (`:write`-gated). `POST /solution-kits/plan` is `:read` only because it calls
  the pure in-memory `previewSolutionKitPlan` and writes nothing — that is NOT a
  valid precedent for this preview. (Real hyphenated names from `RBAC_SPEC.md` /
  `solutionKitsRoutes.ts`.) The service performs the privileged install.
- **CSRF:** N/A (service); the route enforces it.
- **Rate-limit bucket:** N/A here.
- **Validation schema-owner module:** the service validates `{ kitId?, blueprintKey?, actorId, dryRun }`
  — exactly one of `kitId`/`blueprintKey`, resolved against the catalog / a
  fixed registry; unknown ids ⇒ `starter_kit_unknown`.
- **Anti-abuse:** server-side blueprint only is the core control — a malicious
  client must not be able to install arbitrary blocks/pages. The default blueprint
  is curated in-repo.
- **Secret/PII handling:** none — kits seed content/templates. The audit record
  for the apply must not include block payloads, only the kit id + run id.

## Implementation Pseudocode

```ts
type StarterChoice = { kitId: string } | { blueprintKey: keyof typeof STARTER_BLUEPRINTS };

// Curated, in-repo. DEFAULT_STARTER_KIT_DEFINITION is a `SolutionKitDefinition`
// constant owned by THIS module (core/services/setup/starterContentService.ts).
// It MUST declare its footer template in `resourceBlueprint.templates` under
// the fixed key STARTER_FOOTER_TEMPLATE_KEY = "starter-footer" so
// extractShellRefs can locate it (see below) — core install items carry no
// template resource type.
//
// CLOSED-UNION CONSTRAINT (SolutionKitId): `solutionKitIds` in
// solutionKitTypes.ts is a CLOSED 6-value string-literal union, and both
// `SolutionKitDefinition.id` (:127-128) and `ApplySolutionKitInstallInput.kitId`
// (solutionKitsInstallService.ts:268) are typed to it. A brand-new bespoke
// starter-kit id will NOT typecheck. Two allowed resolutions:
//   (A) PREFERRED / shipped default — make `DEFAULT_STARTER_KIT_DEFINITION.id`
//       reuse an EXISTING catalog SolutionKitId (e.g. "local-service-business")
//       so `applyKitInstall({ kitId: def.id, kitDefinitionOverride: def })`
//       compiles. Because its id then COLLIDES with the catalog kit for any
//       rollback-by-kitId lookup, rollbackStarterContent MUST rollback by
//       `sourceRunId` (see rollbackStarterContent below), never by kitId.
//   (B) Extend the `solutionKitIds` tuple in solutionKitTypes.ts (an allowed,
//       non-schema file — NOT core/db/schema.ts) with a dedicated starter id.
//       Only then may rollback safely key off kitId.
// Ship (A). Do NOT invent an id string outside the union.
const STARTER_BLUEPRINTS = { default: DEFAULT_STARTER_KIT_DEFINITION } as const;

function resolveDefinition(choice: StarterChoice): SolutionKitDefinition {
  if ("blueprintKey" in choice) {
    const def = STARTER_BLUEPRINTS[choice.blueprintKey];
    if (!def) throw new Error("starter_kit_unknown");
    return def;
  }
  const def = getSolutionKitFromCatalog(choice.kitId as SolutionKitId);
  if (!def) throw new Error("starter_kit_unknown");
  return def;
}

export async function previewStarterContent(choice: StarterChoice) {
  const def = resolveDefinition(choice);
  const result = await applyKitInstall({ kitId: def.id, kitDefinitionOverride: def, dryRun: true });
  // NOTE: dry-run is NOT write-free. applySolutionKitInstall unconditionally
  // persists a solution_kit_install_runs row (mode "dry_run"), one
  // solution_kit_install_items row per operation and a
  // logAudit("solution_kits.apply") record (solutionKitsInstallService.ts,
  // createInstallRun/appendInstallItem/finalizeInstallRun/logAudit); dry-run
  // only skips content/template mutations and the kitInstaller
  // persistRunMetadata update. No content/template rows are written.
  return result.summary;
}

export async function applyStarterContent(choice: StarterChoice, actorId: string) {
  const def = resolveDefinition(choice);
  // Snapshot the prior shell refs BEFORE installing so rollback can restore
  // them; persist the snapshot on the run itself via runOptions so it survives
  // process restarts (ApplySolutionKitInstallInput.runOptions → run.options).
  const priorShellRefs = {
    homepageId: await getSetting("site.homepageId"),
    navigationMenuId: await getSetting("site.navigationMenuId"),
    footerTemplateId: await getSetting("site.footerTemplateId"),
  };
  const result = await applyKitInstall({
    kitId: def.id,
    kitDefinitionOverride: def,
    actorId,
    dryRun: false,
    runOptions: { starterContent: { priorShellRefs } },
  });
  // Wire the seeded shell into settings (ids come from the install result/run).
  const refs = extractShellRefs(result);
  if (refs) {
    await setSettings({
      ...(refs.homepageId ? { "site.homepageId": refs.homepageId } : {}),
      ...(refs.navigationMenuId ? { "site.navigationMenuId": refs.navigationMenuId } : {}),
      ...(refs.footerTemplateId ? { "site.footerTemplateId": refs.footerTemplateId } : {}),
    });
  }
  return { runId: result.run.id, summary: result.summary };
}

// SolutionKitInstallResourceType is only "content_type" | "form" | "page" |
// "menu" (solutionKitsInstallService.ts:44) — there is NO template variant, so
// footerTemplateId MUST come from result.templateInstall.items, never the core
// items.
function extractShellRefs(result: ApplyKitInstallResult) {
  // Homepage: normalizePageSlug maps "" and "/" to "/", so the homepage is the
  // core install item with resourceType "page" and resourceKey "/" (catalog
  // kits declare it with `slug: ""`); its page id is afterSnapshot.id.
  const homepageId =
    (result.items.find((i) => i.resourceType === "page" && i.resourceKey === "/")
      ?.afterSnapshot?.id as string | undefined) ?? null;
  // Navigation menu: menu install items are keyed `location:${location}`
  // (falling back to `name:${name}`); catalog navigation menus use
  // location "primary".
  const navigationMenuId =
    (result.items.find((i) => i.resourceType === "menu" && i.resourceKey === "location:primary")
      ?.afterSnapshot?.id as string | undefined) ?? null;
  // Footer template: the templateInstall item whose key matches the curated
  // definition's declared footer template key (TemplateInstallItem has
  // key/templateId/afterSnapshot — templateInstaller.ts).
  const footerItem = result.templateInstall?.items.find(
    (i) => i.key === STARTER_FOOTER_TEMPLATE_KEY
  );
  const footerTemplateId = footerItem?.afterSnapshot?.id ?? footerItem?.templateId ?? null;
  return { homepageId, navigationMenuId, footerTemplateId };
}

export async function rollbackStarterContent(input: { sourceRunId?: string; kitId?: string }) {
  // Read the prior shell refs off the SOURCE run before rolling back
  // (getSolutionKitInstallRun(sourceRunId).options.starterContent.priorShellRefs).
  const prior = await readPriorShellRefs(input);
  const result = await rollbackKitInstall(input); // reverses content + template seeds ONLY
  // rollbackKitInstall (kitInstaller.ts) never touches settings — without this
  // step site.homepageId/navigationMenuId/footerTemplateId would keep pointing
  // at deleted records (broken site shell).
  await setSettings({
    "site.homepageId": prior?.homepageId ?? null,
    "site.navigationMenuId": prior?.navigationMenuId ?? null,
    "site.footerTemplateId": prior?.footerTemplateId ?? null,
  });
  return result;
}
```

- **Data flow:** choice → resolve definition (server side) → snapshot prior
  `site.*` refs → kit install (dry-run|apply, prior refs persisted in
  `runOptions`) → on apply, wire `site.*` shell refs → return run id/summary;
  rollback → read prior refs from the source run → `rollbackKitInstall` →
  restore (or null) the `site.*` keys.
- **Error handling (domain codes for `map*Error`):** `starter_kit_unknown` (400),
  surface `solution_kit_not_found` / install failures as
  `starter_content_install_failed` (500); rollback maps
  `solution_kit_install_run_not_found` → 404.
- **Regression-test shape:** dry-run returns a non-empty plan and performs no
  content/template writes — assert `countRows(pages)`/`countRows(menus)`
  unchanged (do NOT assert "no DB writes at all": dry-run legitimately persists
  a `dry_run` run + items + audit record, which the teardown must delete); apply
  increases content counts and sets the three `site.*` keys; rollback restores
  prior counts AND restores the pre-apply `site.*` values; a client-style
  blueprint object is impossible to pass (type + runtime guard).

## Testing Requirements

- **Lane:** Bun — kit install/rollback is plugin/lifecycle work, **must** be Bun.
  `tests/integration/routes/starterContent.test.ts` (service-level via a real DB)
  or a dedicated kit lifecycle integration test.
- **Shared remote test DB (pinned):** all TASK-482/483/484 streams and the owner
  share ONE Postgres (render.com, `DATABASE_URL` in `.env`). Tests that run a
  real install MUST be self-restoring: in `beforeAll`, snapshot the prior
  `site.homepageId`/`site.navigationMenuId`/`site.footerTemplateId` values; in
  `afterAll` (guaranteed even on test failure), restore those exact values,
  delete every content/template record the test seeded, and delete the
  `solution_kit_install_runs`/`solution_kit_install_items` (and audit) rows the
  test created — including the rows every dry-run persists. Never truncate
  shared tables or leave `site.*` pointing at test records. Alternatively, test
  via service-level seams with a stubbed installer (precedent:
  `tests/integration/routes/solutionKitsRoutes.test.ts` is a registration/
  error-mapping test that never runs a real install).
- Cases: dry-run produces plan + no content/template writes (content-table
  counts unchanged; run/items/audit rows are expected and cleaned up); apply
  seeds content + sets
  `site.homepageId`/`navigationMenuId`/`footerTemplateId`; rollback reverses
  the seeds AND restores the pre-apply `site.*` values (assert against the
  `beforeAll` snapshot); unknown kit id ⇒ `starter_kit_unknown`; apply records
  an audit entry with the run id only.
- No migration artifacts (kit installer + settings reuse existing tables;
  `solutionKitInstallRuns` already exists).
