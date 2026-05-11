# 814 - TASK-190 docs status drift sync

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190

## Key Changes

### Documentation drift repair

- Synced assistant builder, architecture, LLM acceptance matrix, and TASK-190
  parent notes with the landed detail-page contract.
- Clarified that `detail-page.upsert` is executable, `setting.content-route.upsert`
  owns `detailPageId` route-linking, and `detailPageRoutes.ts` owns the internal
  `/admin/api/detail-pages*` CRUD/lifecycle/revision route family.

### Remaining scope

- Kept `TASK-190-07-02` To Do and preserved its future bounded
  `resourceCatalog.detailPages` plus existing-resource matcher contract.
- Reaffirmed that admin client/cache parity, generic detail-page resource
  packaging, workspace/editor integration, and no-duplicate DB reuse remain open
  TASK-190 follow-up leaves.

## Validation

- `rg` stale-claim checks for deferred detail-page CRUD/route-linking wording
- `rg -n '^\\*\\*Status:\\*\\* (To Do|In Progress|Done)' _docs/_TASKS/*.md`
- `bun run lint`
