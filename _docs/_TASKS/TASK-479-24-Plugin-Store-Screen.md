# TASK-479-24: Plugin Store Screen Migration
# FileName: TASK-479-24-Plugin-Store-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Store
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype for the **Plugin Store** experience into
the real admin. This covers the store **gallery** screen (browse/featured/category/
install) and the plugin **details** screen so both adopt the soft & friendly
(Notion-like) language: warm neutral canvas, white `rounded-2xl` cards, soft
shadows, **violet** accent, light default + dark toggle. Only the presentation layer
changes — the store catalog data, the master-detail selection + install/update/
policy state machine, RBAC (`store:browse`), routing, and the cache contract (if/
when a real `storeClient` is wired) are preserved exactly.

- **Goal:** Make `core/admin/ui/store/PluginStorePage.tsx` (and its
  `StoreList`/`StoreDetail`/`PluginList`/`PluginDetail` children) plus
  `core/admin/ui/store/PluginDetailsPage.tsx` (and `PluginDetailsTabs.tsx`) match the
  prototype look while keeping every behavior, so a user sees a redesigned store
  gallery with a featured banner, category tabs, and soft plugin cards, and a calmer
  details screen with a hero header, `line`-variant tabs, and a SectionCard info sidebar —
  with no functional regressions.
- **Owning module/service:** `core/admin/ui/store/**` (PluginStorePage, StoreList,
  StoreDetail, PluginStore types; PluginDetailsPage, PluginDetailsTabs) plus the
  installed-plugins children under `core/admin/ui/plugins/**` (PluginList,
  PluginDetail). NOTE: `PluginCard.tsx`, `PluginFilters.tsx`, and
  `PluginDetailsDialog.tsx` are DEAD CODE — no routed page imports them
  (`PluginStorePage`/`PluginDetailsPage` never render them; `PluginDetailsDialog` is
  referenced only by the already-dead `PluginCard`), so they are OUT OF SCOPE for this
  restyle and must NOT be reskinned. Shared primitives + shell from TASK-479-05/06
  (`core/admin/styles/globals.css` tokens, `@/ui/layouts/AdminShell`,
  `@/ui/shared/PageHeader`, and the shared pattern library — e.g. `SectionCard`,
  `StatusBadge` — delivered by TASK-479-06-L02).
- **Source-of-truth docs:** `_docs/STORE_SPEC.md` (store domain),
  `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`, `_docs/TESTING_STRATEGY.md`,
  and the parent `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`. Prototype source
  screens: `_docs/_PROTOTYPE/src/pages/store/PluginStorePage.tsx` and
  `_docs/_PROTOTYPE/src/pages/store/PluginDetailsPage.tsx`; prototype primitives under
  `_docs/_PROTOTYPE/src/components/{ui,patterns}` and tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No changes to the store API surface or `_docs/STORE_API.md`
  contract, the publish/verify/revocation pipeline, the install/update/policy
  semantics, RBAC (`store:browse`), the `/admin/store` route, or any cache keys/TTL
  that a real `storeClient` would use. The global token + shell redesign land in
  TASK-479-05 and TASK-479-06 respectively and are consumed here, not re-implemented.
  The category-tab strip is a presentational addition layered over existing filtering
  — it does NOT introduce a new data source or a new fetch.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-24-L01 | Plugin Store Gallery Restyle | ⏳ To Do |
| TASK-479-24-L02 | Plugin Details Restyle | ⏳ To Do |
| TASK-479-24-L03 | Plugin Store Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/plugin-store-restyle.test.tsx tests/vitest/ui-integration/plugin-details-restyle.test.tsx`
  (new suites added in L03).

The pre-existing store/plugin suites must stay green — the restyle must not break a
single behavioral test:
`tests/vitest/ui/plugin-store.test.tsx`, `tests/vitest/ui/plugin-details.test.tsx`,
`tests/vitest/ui/plugin-card.test.tsx`, `tests/vitest/ui/plugin-filters.test.tsx`,
`tests/vitest/storeUi/storeList.test.tsx`, and
`tests/vitest/ui-integration/plugins.test.tsx`. Update the minimal selector only if
the restyle genuinely moved a node; never weaken assertion intent. Do NOT migrate
runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- If any shared restyle primitive (e.g. `SectionCard`, a token-driven `StatusBadge`,
  or a plugin-icon tile helper) is added/changed for the store, note it alongside the
  TASK-479-06 shell/pattern notes so other gallery/detail screens reuse it
  consistently. If a store-facing label or affordance changes, reflect it in
  `_docs/STORE_SPEC.md` only if the user-facing contract actually changed (a pure
  restyle should not).
