# TASK-226: Coderso Rebrand and Advanced Admin IA
# FileName: TASK-226_Coderso_Rebrand_and_Advanced_Admin_IA.md

**Priority:** High
**Category:** Branding + Admin/UI + Routing + Assistant Context
**Estimated Effort:** Very Large
**Dependencies:** TASK-054, TASK-220
**Status:** Done - 2026-04-28

---

## Overview

Rebrand the product from `Nextless` to `Coderso` and separate the product brand
from the advanced/admin module IA. `Coderso` becomes the public product name and
brand story. The advanced internal module group that currently appears as
`Coderso` in the admin sidebar and canonical paths becomes `Advanced`.

Target brand contract:

- Product name: `Coderso`
- Primary tagline: `Coderso - The modular CMS platform`
- Secondary copy variants allowed in product docs: `Build your system` and
  `Modular web platform`
- Primary storytelling: `Coderso = Code + Orchestrator`
- Secondary technical expansion: `Coderso = Code Resources System`

Target IA contract:

- Top-level `Main` remains beginner-friendly: `Pages`, `Posts`, `Menus`,
  `Media`, and other common surfaces stay outside the advanced group.
- The technical module group label becomes `Advanced`.
- Canonical admin paths become `/admin/advanced/*`.
- Existing `/admin/coderso/*` links remain accepted as compatibility aliases
  for bookmarks, tests, assistant outputs, and installed-site history.
- Product-level `Coderso` names can remain where they mean the platform
  itself, such as release gates, plugin manifests, product docs, and public
  brand copy.

## Update Inventory

Inventory captured on 2026-04-27 and expanded on 2026-04-28 after the user
confirmed the repo-wide scale of about 306 files and 640 findings for the
`Nextless` name. Re-run the matching `rg` scans before editing because line
numbers can drift after concurrent work.

The table below is the high-risk implementation seed. TASK-226-00 is a blocking
scope-lock task and must convert the full current scan into a complete
file/line coverage table before any rename wave starts. The implementation
cannot treat docs, changelogs, task files, fixture copy, browser storage keys,
DOM selectors, package names, or historical evidence as out of scope unless the
row is explicitly classified with owner, reason, and removal condition.

## Exhaustive Scope Lock

The full scan is part of the product contract, not a best-effort cleanup.

Prepared inventory:

- User baseline before this task expansion: about 306 files and 640 findings.
- `TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md` contains the prepared
  file/line inventory, with every current matched file classified by category,
  owner leaf, and disposition.
- The inventory file is excluded from future residual scans because it repeats
  the legacy token as evidence.

TASK-226-00 must verify the current scan against that prepared table before
implementation starts and update only drifted/new rows. Required
classifications:

- product/package identity,
- runtime defaults and integration metadata,
- browser persistence and DOM identifiers,
- admin visible copy and starter content,
- Advanced IA and route namespace,
- assistant context and schemas,
- tests and fixtures,
- source docs and prototypes,
- changelog and historical task evidence,
- TASK-226 planning docs.

Residual `Nextless`/`nextless` matches are allowed only when TASK-226-03-02
lists them in the temporary compatibility or historical allowlist with an owner,
reason, and removal condition.

| Owner | File | Current line(s) | Section / place | Required change |
|-------|------|-----------------|-----------------|-----------------|
| TASK-226-01-01 | `package.json` | 2 | package identity | Rename package from `nextless` to the chosen Coderso package id, or document why the package name remains technical-only. |
| TASK-226-01-01 | `core/package.json` | 2 | workspace package identity | Rename `@nextless/core` to the selected Coderso workspace scope with repo-wide import/build compatibility checked. |
| TASK-226-01-01 | `README.md` | 1 | repo title | Replace product title with `Coderso` and add the product tagline. |
| TASK-226-01-01 | `docs/README.md` | 1 | public docs title | Rename assistant docs index from Nextless to Coderso. |
| TASK-226-01-01 | `docs/getting-started/admin-orientation.md` | 16, 18, 25, 32, 41, 45, 49 | getting-started copy | Replace product mentions with Coderso and change advanced module references from Coderso group to Advanced group. |
| TASK-226-01-01 | `core/admin/index.html` | 6 | browser title | Rename `Nextless Admin` to `Coderso Admin`. |
| TASK-226-01-01 | `core/services/settings/settingsService.ts` | 50 | default `site.name` | Change default site name to `Coderso`; update DB/default tests. |
| TASK-226-01-01 | `core/services/email/emailSettingsService.ts` | 394, 406, 411 | fallback sender + SMTP test | Replace default email sender/test subject/body with Coderso copy. |
| TASK-226-01-01 | `core/services/forms/formAutomationRunnerCore.ts` | 235 | form automation sender fallback | Replace fallback product name with Coderso. |
| TASK-226-01-01 | `core/services/webhooks/deliveryService.ts` | 52-60 | webhook delivery headers | Add Coderso header names while preserving `X-Nextless-*` as documented compatibility aliases until a migration window closes. |
| TASK-226-01-01 | `core/admin/ui/layouts/AdminShell.tsx` | 45 | localStorage key | Introduce Coderso/Advanced storage keys with legacy read fallback from `nextless.admin.navGroupState`. |
| TASK-226-01-01 | `core/admin/ui/shared/SidebarNav.tsx` | 11, 20 | storage key + brand default | Replace visible brand with Coderso and migrate sidebar scroll storage key with legacy fallback. |
| TASK-226-01-01 | `core/admin/app/AdminApp.tsx` | 404, 697, 825, 835, 851 | theme storage/style ids | Rename visible/id keys only through a compatibility migration that still reads existing `nextless.adminThemeTokens`. |
| TASK-226-01-02 | `core/admin/ui/auth/AuthBrandPanel.tsx` | 15, 43 | auth brand fallback | Replace default title/footer with Coderso. |
| TASK-226-01-02 | `core/admin/ui/auth/LoginPage.tsx` | 97 | login brand text | Replace visible brand with Coderso. |
| TASK-226-01-02 | `core/admin/ui/auth/ResetPasswordPage.tsx` | 90, 112 | reset page copy | Replace `Nextless CMS` and recovery copy with Coderso. |
| TASK-226-01-02 | `core/admin/ui/auth/SetPasswordPage.tsx` | 91, 98 | set-password copy | Replace `Nextless CMS` title/footer with Coderso. |
| TASK-226-01-02 | `core/admin/ui/setup/setupWizardValidation.ts` | 10 | setup defaults | Replace default `siteName` with Coderso. |
| TASK-226-01-02 | `core/admin/ui/setup/SetupWizard.tsx` | 158 | setup placeholder | Replace placeholder with Coderso. |
| TASK-226-01-02 | `core/admin/ui/settings/BrandingCard.tsx` | 43 | settings default | Replace visible fallback with Coderso. |
| TASK-226-01-02 | `core/admin/ui/settings/GeneralSettingsPage.tsx` | 28 | settings default | Replace visible fallback with Coderso. |
| TASK-226-01-02 | `core/admin/ui/pages/PageEditor.tsx` | 74 | default hero content | Replace starter hero headline with Coderso-aligned copy. |
| TASK-226-01-02 | `core/admin/ui/pages/CanvasFrame.tsx` | 23 | page canvas placeholder | Replace starter hero copy with Coderso-aligned copy. |
| TASK-226-01-02 | `core/admin/ui/pages/InspectorPanel.tsx` | 38 | inspector default | Replace starter headline with Coderso-aligned copy. |
| TASK-226-01-02 | `core/widgets/core/hero.tsx` | 199 | hero widget defaults | Replace default headline with Coderso-aligned copy. |
| TASK-226-01-02 | `core/widgets/core/navigation.tsx` | 211 | navigation widget logo default | Replace default text logo with Coderso. |
| TASK-226-01-02 | `core/widgets/core/footer.tsx` | 167 | footer widget default | Replace copyright with Coderso. |
| TASK-226-01-02 | `core/services/assistant/assistantService.ts` | 48 | system prompt | Rename `Nextless Assistant` to `Coderso Assistant`. |
| TASK-226-01-02 | `core/services/assistant/operationPolicy/providerGuidance.ts` | 331 | provider guidance | Rename guide assistant copy to Coderso. |
| TASK-226-02-01 | `core/admin/ui/navigation/codersoModules.ts` | 20-83, 93-352, 362-392 | advanced module registry | Rename IA-owned types/exports to Advanced naming and move nav hrefs to `/admin/advanced/*`; keep product-level Coderso only where intentional. |
| TASK-226-02-01 | `core/admin/ui/navigation/sidebarConfig.ts` | 27-29, 56, 63, 70, 73, 121, 145-146 | sidebar group + links | Replace group id/label with `advanced`/`Advanced`, keep Posts in Main, update footer URLs to Coderso docs/support. |
| TASK-226-02-01 | `core/admin/ui/layouts/AdminShell.tsx` | 34, 100, 107, 131-159 | solution-kit gating + group checks | Rename `CodersoFeatureFlags` group behavior to Advanced semantics and preserve active kit narrowing. |
| TASK-226-02-01 | `core/admin/services/solutionKitSelection.ts` | 7-31, 87-120 | feature flag service | Rename IA-owned feature flag types/functions to Advanced naming, with compatibility exports only if needed by external code. |
| TASK-226-02-02 | `core/admin/utils/adminPaths.ts` | 65-77 | canonical route aliases | Make legacy `/content-types`, `/entries`, and `/coderso/*` resolve to `/advanced/*`; keep existing base-path behavior. |
| TASK-226-02-02 | `core/admin/app/AdminApp.tsx` | 546-587 | SPA route table | Move canonical route patterns from `/coderso/*` to `/advanced/*`; rely on path resolver for legacy aliases. |
| TASK-226-02-02 | `core/admin/utils/adminPrefetch.ts` | 171-246 | cache warmup paths | Change prefetch match keys to `/advanced/*` and prove `/admin/coderso/*` aliases still warm the same caches. |
| TASK-226-02-02 | `core/services/media/mediaUsageService.ts` | 105, 131, 160 | admin hrefs from media usage | Emit canonical Advanced admin hrefs for entries, posts, and commerce. |
| TASK-226-02-02 | `_docs/ADMIN_NAVIGATION.md` | 7-42 | IA and route docs | Rewrite Coderso IA docs as Advanced IA and document `/admin/coderso/*` as legacy aliases. |
| TASK-226-02-02 | `_docs/ADMIN_CACHE.md` | 87, 91, 301-348 | cache docs | Update prefetch/cache docs to canonical `/advanced/*` routes and legacy alias behavior. |
| TASK-226-02-02 | `_docs/ADMIN_CACHE_MAP.md` | 108, 196-206 | cache map | Update route-to-cache map to `/advanced/*`. |
| TASK-226-02-03 | `core/admin/ui/assistant/useAssistantAdminContext.ts` | 22, 79-95, 197-274 | frontend assistant runtime surface | Rename surface area/module fields to Advanced in schema v2 while accepting legacy `codersoModule` during migration. |
| TASK-226-02-03 | `core/services/assistant/adminContextService.ts` | 49-64, 171, 177, 363 | backend assistant context | Resolve `/admin/advanced/*` as `advanced`, accept `/admin/coderso/*` alias, and preserve action safety policies. |
| TASK-226-02-03 | `core/services/assistant/actionPlanTypes.ts` | 116, 198-199 | assistant context types | Add `advancedModule`; keep `codersoModule` only as deprecated compatibility field if wire payloads require it. |
| TASK-226-02-03 | `core/server/validation/assistantActionSchemas.ts` | 104, 120-122 | schema validation | Add `advancedModule`, keep strict reject-unknown behavior, and define the legacy field migration explicitly. |
| TASK-226-02-03 | `_docs/CMS_API.md` | 2844, 2895-2910, 2958-2959, 2988 | assistant examples | Update routes/surface examples and user-facing "Coderso > ..." breadcrumbs to "Advanced > ...". |
| TASK-226-03-01 | `tests/vitest/admin/adminPaths.test.ts` | 39-125 | route helper tests | Update canonical expectations to `/advanced/*` and add legacy `/coderso/*` alias coverage. |
| TASK-226-03-01 | `tests/vitest/admin/adminPrefetch.test.ts` | 80, 93, 214, 248, 304 | prefetch tests | Update canonical paths and assert legacy Coderso paths still hit Advanced cache warmups. |
| TASK-226-03-01 | `tests/vitest/admin/coderso-modules.test.ts` | 4-207 | module registry tests | Rename test file or expectations to Advanced module registry and route contract. |
| TASK-226-03-01 | `tests/vitest/ui/admin-shell-nav.test.tsx` | 76-175 | sidebar nav tests | Replace Coderso group expectations with Advanced and add no unauthorized-group regression. |
| TASK-226-03-01 | `tests/vitest/ui/use-assistant-admin-context.test.tsx` | 68-377 | assistant snapshot tests | Update canonical Advanced routes and legacy Coderso snapshot behavior. |
| TASK-226-03-01 | `tests/integration/routes/assistant.test.ts` | 340-948 | Bun route assistant tests | Update assistant route examples and schema field expectations. |
| TASK-226-03-01 | `tests/perf/codersoPerformanceGate.test.ts` | 136-142 | release-gate route matrix | Keep product-level Coderso gate name if desired, but update tested routes to `/admin/advanced/*`. |
| TASK-226-03-02 | `_docs/ARCHITECTURE.md` | 41, 80-89, 221-227, 624-688, 728-812, 1250 | architecture source of truth | Rename product references to Coderso and IA/module group references to Advanced. |
| TASK-226-03-02 | `_docs/CODERSO_MODULES.md` | 1-17, 52, 145-173, 221-226 | module catalog | Rename file or title to Advanced Modules Catalog; keep Coderso product brand context. |
| TASK-226-03-02 | `_docs/CMS_API.md` | 414, 433, 454, 733-734, 2152, 2362, 2574, 2778 | API examples/defaults | Replace Nextless examples and update storage key docs with compatibility notes. |
| TASK-226-03-02 | `_docs/SECURITY_SPEC.md` | 442-445 | webhook header docs | Document Coderso headers and legacy Nextless header compatibility. |
| TASK-226-03-02 | `_docs/TESTING_STRATEGY.md` | 5 | testing architecture intro | Rename product reference to Coderso. |
| TASK-226-03-02 | `_docs/WIDGETS.md` | 139-149 | widget surface docs | Replace `Coderso/Widgets` and route examples with `Advanced/Widgets` and `/admin/advanced/widgets`. |

## Sub-Tasks

- [x] TASK-226-00: Exhaustive Nextless Occurrence Inventory and Scope Lock
- [x] TASK-226-00-01: Rebrand Occurrence Coverage Table
- [x] TASK-226-01: Product Brand Rename Inventory
- [x] TASK-226-02: Advanced Admin IA and Route Compatibility
- [x] TASK-226-03: Validation, Docs, and Closure

## Implementation Order

1. Complete TASK-226-00 and lock the exhaustive file/line inventory.
2. Lock the naming taxonomy and residual allowlist.
3. Rename product-facing `Nextless` defaults/copy to Coderso.
4. Rename the admin group/registry to Advanced without changing behavior.
5. Move canonical SPA routes/prefetch paths to `/advanced/*`.
6. Add `/coderso/*` compatibility aliases and prove route/cache/assistant parity.
7. Update docs, tests, changelog, and final residual scans.

## Security Contract

- Visibility: internal admin UI, internal assistant context, docs, and product
  defaults. No new public write endpoint is introduced.
- Auth model: existing authenticated admin session / admin API key path for all
  admin routes.
- RBAC: unchanged per module (`content:*`, `forms:*`, `widgets:*`,
  `commerce:*`, `solution-kits:*`, etc.).
- CSRF: unchanged for existing admin/internal writes.
- Rate-limit bucket: unchanged; admin reads stay in the existing admin read
  bucket, writes stay in their current admin write buckets.
- Reject-unknown validation: assistant/admin schema changes must remain strict;
  any legacy `codersoModule` field must be explicitly accepted or rejected by a
  versioned adapter, not by loosening schemas.
- Anti-abuse:
  - do not introduce public redirects for admin paths,
  - do not expose secrets in renamed cache/localStorage/debug payloads,
  - preserve webhook signature verification and add Coderso header names without
    silently dropping legacy `X-Nextless-*` consumers.

## Testing Requirements

- Full TASK-226-00 scan evidence:
  - `rg -l -i "nextless" --glob '!node_modules/**' --glob '!core/node_modules/**' --glob '!dist/**' --glob '!core/dist/**' --glob '!coverage/**' --glob '!*.lockb' --glob '!bun.lock' --glob '!package-lock.json' --glob '!_docs/_TASKS/TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md' .`
  - `rg -n -i "nextless" --glob '!node_modules/**' --glob '!core/node_modules/**' --glob '!dist/**' --glob '!core/dist/**' --glob '!coverage/**' --glob '!*.lockb' --glob '!bun.lock' --glob '!package-lock.json' --glob '!_docs/_TASKS/TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md' .`
  - `rg --count-matches -i "nextless" --glob '!node_modules/**' --glob '!core/node_modules/**' --glob '!dist/**' --glob '!core/dist/**' --glob '!coverage/**' --glob '!*.lockb' --glob '!bun.lock' --glob '!package-lock.json' --glob '!_docs/_TASKS/TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md' .`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `bun run test:vitest -- tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/admin-router.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/coderso-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts`
- `bun run test:vitest -- tests/vitest/ui/admin-shell.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/admin-link.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/navigation.test.tsx`
- `bun test tests/unit/settings/settingsService.test.ts tests/unit/email/emailSettingsService.test.ts tests/unit/webhooks/deliveryService.test.ts tests/unit/tools/importExport.test.ts tests/unit/integrations/integrationsService.test.ts`
- `bun test tests/integration/routes/assistant.test.ts tests/integration/routes/webhooks.test.ts`
- `bun test tests/perf/admin-prefetch-budget.test.ts tests/perf/admin-request-baseline.test.ts tests/perf/codersoPerformanceGate.test.ts`
- `bun run gates:coderso` after the gate route matrix is updated, or document the
  known stale-gate blocker if it still targets removed paths.
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md` or renamed Advanced module catalog equivalent.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/WIDGETS.md`
- `TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md`
- `_docs/_CHANGELOG/{N}-2026-04-27-task-226-coderso-rebrand-advanced-ia.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. User-facing product branding says Coderso, not Nextless.
2. The admin sidebar group label is Advanced.
3. Canonical advanced admin paths use `/admin/advanced/*`.
4. Existing `/admin/coderso/*` links remain functional aliases and are covered
   by route, prefetch, assistant, and navigation tests.
5. Product-level Coderso terms remain where intentional; IA/module group terms
   use Advanced.
6. The full repo scan inventory covers every `Nextless`/`nextless` match across
   source, tests, docs, changelog, task files, fixture copy, package metadata,
   browser keys, and public selectors.
7. Residual `Nextless`, `nextless`, `X-Nextless-*`, and `/coderso/*` occurrences
   are either removed or listed in a temporary compatibility allowlist with an
   owner, reason, and removal condition.
8. Docs, changelog, task board, and test evidence are synchronized.
