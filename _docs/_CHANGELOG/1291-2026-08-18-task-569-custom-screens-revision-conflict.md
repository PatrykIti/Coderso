# 1291 - TASK-569 Custom Screens Optimistic Concurrency Revision And Conflict

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-569, TASK-569-01

## Key Changes

### Custom Screens
- Monotonic `custom_screens.revision` column (migration `0073_smiling_ser_duncan`)
  with an `expectedRevision` precondition on definition-bearing PATCHes:
  conditional `UPDATE ... WHERE id AND revision` maps zero affected rows to
  `custom_screen_conflict` (409) instead of silent last-writer-wins
  (H-540-01 + N2).
- Admin client stores and round-trips the loaded revision; the editor keeps the
  local draft on a real 409. Assistant path keeps revision-free non-definition
  metadata PATCHes.
- `mapCustomScreenError` covers conflict (409) and revision-required (400);
  two-concurrent-PATCH DB race regression included.
- Migration 0073 full artifacts (SQL + snapshot + journal) landed atomically.

### Action Executor Service Modularity (TASK-569-01)
- Split the 6771-line `core/services/assistant/actionExecutorService.ts` into 14
  cohesive modules (registry, types, cache, catalog reads, content, forms,
  listings, media/pages, menus/seo, pages, resource ids, screen ops, screens,
  widgets/site-kit) by domain responsibility. Pure relocation: no behavior
  changes, finder/registry placements audited, all 14 files < 1000 lines.

## Validation
- `bun --cwd core lint` + `lint:types` green; targeted assistant lane 103 tests
  green (81 targeted + full lane); diff-check clean.
- Split verified by name-set diff (29/29 test names preserved, 0 missing/0
  extra); all split files under the 1000-line gate.
- Runtime smoke (`wf569smoke`): created a custom screen from the Screens Beta
  list (drawer validation → name + content type), added a Heading block, edited
  the static heading text (visible H2 effect), saved, and reloaded the editor —
  block persisted with no unsaved-changes flag; screenshot
  `_docs/_workflows/_smoke/evidence/task-569/wf569smoke/task569-custom-screens-editor.png`.
