# TASK-479-11: Media Library Screen Migration
# FileName: TASK-479-11-Media-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Media
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype of the Media Library into the REAL
admin Media screen. This is a **visual restyle only**: the soft & friendly
(Notion-like) design language — VIOLET accent, `rounded-2xl` cards, soft
shadows, warm neutrals, light default + dark toggle — is applied to the existing
Media surface while the real upload pipeline, cache contract, RBAC, and details
drawer logic stay exactly as they are.

- **Goal:** Make the real Media Library look like the prototype — a left folder
  nav rail, a storage-usage Progress card, a grid-first FilterBar, soft media
  cards in a responsive grid, and a polished details drawer — without changing
  any data flow, upload behavior, or endpoints.
- **Owning module/service:** `core/admin/ui/media/**`
  (`MediaLibraryPage.tsx`, `MediaCard.tsx`, `MediaGrid.tsx`, `MediaToolbar.tsx`,
  `MediaDetailsDrawer.tsx`, `types.ts`, `utils.ts`), reusing
  `core/admin/ui/shared/PageHeader.tsx` and `core/admin/components/ui/*`.
- **Source-of-truth docs:** `_docs/MEDIA_SPEC.md` (Admin UI behavior v1),
  `_docs/DESIGN_TOKENS.md`, `_docs/_PROTOTYPE/README.md`,
  `_docs/_PROTOTYPE/src/styles/theme.css`. Prototype reference screen:
  `_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx`.
- **Out of scope:** Any change to media APIs, storage adapters, the cache
  contract (`cacheKeys.mediaList`, `listMediaCached`, `cacheBus`), RBAC
  (`media:read` / `media:write`), upload/replace/delete logic, the
  `MediaSettingsDrawer` behavior, usage read-model, or dimension recovery. No new
  routes and no editor functionality. Folder counts that are not backed by real
  list data must stay presentational and clearly derived (see L01) — do NOT
  invent a new filtering API.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The screen continues to read through
`listMediaCached` (RBAC `media:read`) and write through the existing
`mediaClient` mutations (RBAC `media:write`, admin CSRF); no client cache, log,
or debug payload gains new fields.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-11-L01 | Media Library Restyle | ⏳ To Do |
| TASK-479-11-L02 | Media Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/ui-integration/media.test.tsx`
- New restyle suite added in L02 (see that leaf for the exact path), run with the
  same `NODE_ENV=test vitest run --config vitest.config.ts <suite>` form.
- All pre-existing Media Vitest suites must stay green (the restyle must not alter
  observable hydration, dirty-state protection, selection, or upload behavior).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move this subtask + leaves through the
  status buckets) and the Statistics block on every status change.
- On closure, add a `_docs/_CHANGELOG/` entry linking `TASK-479` and the closed
  leaf id(s).
- Note the new design language on the Media surface in `_docs/MEDIA_SPEC.md`
  "Admin UI behavior (v1)" if any user-visible affordance label changes; do not
  document behavior changes (there are none).
