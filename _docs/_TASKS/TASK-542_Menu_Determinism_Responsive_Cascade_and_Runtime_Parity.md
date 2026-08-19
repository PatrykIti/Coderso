# TASK-542: Menu Determinism, Responsive Cascade, and Runtime Parity

# FileName: TASK-542_Menu_Determinism_Responsive_Cascade_and_Runtime_Parity.md

**Priority:** High
**Category:** Menus / Validation / Responsive CSS / Public Runtime / Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-541, TASK-539
**Status:** ⏳ To Do
**Changelog:** 1319 (pinned; closure only)

---

## Overview

The audit confirmed that menu writes accept ambiguous topology and missing or
duplicate IDs, while stored reads generate random replacements. Responsive
device overrides do not fully neutralize desktop/submenu styling, responsive
brand icon color and responsive-only scrolled behavior diverge from the front,
and canvas/front use different public projections. The design editor can also
hold a five-minute stale snapshot or overwrite a dirty draft.

This family makes the existing MenuDocumentV2 deterministic and strict, defines
a complete responsive reset matrix, and shares public projection/active identity
between authoring and runtime. It adds no endpoint or migration. Legacy reads are
deterministic and non-destructive; new writes are canonical and reject unknowns.

## Fixed contracts

- New writes require non-empty globally unique IDs and exact top-level/nested
  keys. Topology contains exactly one first `menu-bar` section plus at most the
  supported drawer; ambiguous shapes fail closed.
- Stored legacy reads derive stable IDs from structural paths, suffix collisions
  deterministically, and never persist an adapter rewrite automatically.
- Responsive OFF/none values emit explicit neutralizers at the exact depth,
  including L1-to-L2 reset, both divider axes, indicator/caret/flyout state,
  transitions/transforms, padding fallback, and responsive `brand.iconColor`.
- A shared recursive anonymous projection runs before active resolution in both
  design canvas and front. Active resolution returns one structural identity/path;
  ties choose the first deterministic DFS candidate, so only one item is current.
- Menu design hydrates cache-first, forces background revalidation, subscribes
  to the relevant cache bus keys, and never replaces a dirty local document.
- Responsive-only scrolled behavior gates the runtime from the effective device
  section, not only desktop. The design canvas remains usable at narrow widths.

## Security Contract

- **Visibility:** existing internal `/admin/api/menus*` endpoints only; public
  menu projection remains read-only.
- **Auth/RBAC:** session/API-key authentication and `menus:read`/`menus:write`
  remain required as today.
- **CSRF/rate limit:** session writes retain CSRF and the admin write bucket;
  reads retain the admin read bucket. No public nonce/captcha applies.
- **Validation:** write envelopes and MenuDocumentV2 nested records reject
  unknown keys. Safe URL and canonical TASK-541 color policy are reapplied at
  write and public projection/render boundaries.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-542-01 | Strict deterministic menu documents | TASK-542-01-L01 | ⏳ To Do |
| TASK-542-02 | Responsive neutralizers, scrolled, and brand parity | TASK-542-02-L01 | ⏳ To Do |
| TASK-542-03 | Public projection, active identity, and cache safety | TASK-542-03-L01..L03 | ⏳ To Do |
| TASK-542-04 | Tests, smoke, and closure | TASK-542-04-L01 | ⏳ To Do |

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| II-M-08 random IDs/loose topology | 542-01/L01 | strict rejects plus repeated legacy read produces byte-identical IDs |
| II-H-05, II-M-13/14 incomplete cascade/resets/defaults | 542-02/L01 | ON→OFF and L1→L2 computed-style matrix across devices |
| II-H-06 missing responsive icon color; M-05 inert responsive scrolled | 542-02/L01 + 542-03/L02 | effective-device front behavior and icon computed color |
| II-M-10 canvas/front projection split | 542-03/L01..L03 | identical anonymous tree before/after publish |
| II-M-11 duplicate href marks several items | 542-03/L02 | exactly one `aria-current` identity under duplicate hrefs |
| II-M-09 stale cache/dirty overwrite; narrow canvas/Structure exit | 542-03/L03 | cache-first revalidation without clobber and dirty-navigation geometry flow |

## Ownership, order, and collision guards

Land `542-01 → 542-02 → 542-03 → 542-04`, after TASK-539 and TASK-541.
TASK-539 and TASK-542 never run in parallel because runtime shell behavior/tests
overlap. The MenuDocumentV2, CSS emitter, shared projection, `siteShell.tsx`, and
MenuDesignEditor writers are separate leaves. Each consumer imports the exact
owner helper/type rather than duplicating it.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after every source leaf.
- Targeted MenuDocumentV2, CSS, menu service/client/editor, site shell, route,
  and runtime suites in their current Vitest/Bun lanes.
- The new public projection helper lands only after its own pure direct suite passes;
  closure reruns that file read-only and adds front/editor parity in consumer suites.
- `bun --cwd core build:admin`, admin boundary/bundle checks, and targeted menu
  route registration/error-mapper coverage.
- At least six publish-to-front flows: strict/legacy model, desktop→tablet OFF,
  L1→L2 reset, padding fallback, responsive icon/scrolled state, projection/
  duplicate-href identity, and narrow dirty canvas. Assert visible effects,
  light/dark, devices, zero console errors, and screenshots.

## Documentation Updates Required

Update menu model/runtime docs and `_docs/ADMIN_CACHE.md` plus
`_docs/ADMIN_CACHE_MAP.md`. At closure create changelog 1319 and close all
descendants.
