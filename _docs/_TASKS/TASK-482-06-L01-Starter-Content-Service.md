# TASK-482-06-L01: `starterContentService` over the kit installer (dry-run/apply/rollback + shell wiring)
# FileName: TASK-482-06-L01-Starter-Content-Service.md

**Parent Subtask:** TASK-482-06
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-05-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A thin onboarding service that seeds starter content by delegating to
  the existing kit installer, then wires the result into the public site shell.
  It supports a dry-run preview (no writes), an apply (with `actorId` for audit),
  and a rollback that reverses the apply. The blueprint is **server-chosen** — a
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

## Security Contract

- **Endpoint visibility:** none (service); 06-L02 owns the internal route.
- **Auth model:** the service trusts its caller (the authenticated route) for the
  `actorId`; it must **reject** any attempt to pass a raw client blueprint —
  callers may pass a `kitId: string` (looked up in the catalog) or select a named
  server blueprint by key, but never arbitrary `SolutionKitDefinition` JSON from
  request input.
- **RBAC permission(s):** enforced by the route (06-L02), conceptually
  `settings:write` + content/kit install rights. The service performs the privileged
  install.
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

const STARTER_BLUEPRINTS = { default: DEFAULT_STARTER_KIT_DEFINITION } as const; // curated, in-repo

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
  return result.summary; // plan only, no writes persisted
}

export async function applyStarterContent(choice: StarterChoice, actorId: string) {
  const def = resolveDefinition(choice);
  const result = await applyKitInstall({ kitId: def.id, kitDefinitionOverride: def, actorId, dryRun: false });
  // Wire the seeded shell into settings (ids come from the install result/run).
  const refs = extractShellRefs(result); // homepageId / navigationMenuId / footerTemplateId
  if (refs) {
    await setSettings({
      ...(refs.homepageId ? { "site.homepageId": refs.homepageId } : {}),
      ...(refs.navigationMenuId ? { "site.navigationMenuId": refs.navigationMenuId } : {}),
      ...(refs.footerTemplateId ? { "site.footerTemplateId": refs.footerTemplateId } : {}),
    });
  }
  return { runId: result.run.id, summary: result.summary };
}

export async function rollbackStarterContent(input: { sourceRunId?: string; kitId?: string }) {
  return rollbackKitInstall(input); // reverses content + template seeds
}
```

- **Data flow:** choice → resolve definition (server side) → kit install
  (dry-run|apply) → on apply, wire `site.*` shell refs → return run id/summary.
- **Error handling (domain codes for `map*Error`):** `starter_kit_unknown` (400),
  surface `solution_kit_not_found` / install failures as
  `starter_content_install_failed` (500); rollback maps
  `solution_kit_install_run_not_found` → 404.
- **Regression-test shape:** dry-run returns a non-empty plan and writes nothing
  (`countRows(pages)` unchanged); apply increases content counts and sets the
  three `site.*` keys; rollback restores prior counts; a client-style blueprint
  object is impossible to pass (type + runtime guard).

## Testing Requirements

- **Lane:** Bun — kit install/rollback is plugin/lifecycle work, **must** be Bun.
  `tests/integration/routes/starterContent.test.ts` (service-level via a real DB)
  or a dedicated kit lifecycle integration test.
- Cases: dry-run produces plan + no DB writes; apply seeds content + sets
  `site.homepageId`/`navigationMenuId`/`footerTemplateId`; rollback reverses;
  unknown kit id ⇒ `starter_kit_unknown`; apply records an audit entry with the
  run id only.
- No migration artifacts (kit installer + settings reuse existing tables;
  `solutionKitInstallRuns` already exists).
