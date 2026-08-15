# 1277 - TASK-487 Entries: Revision History & Restore

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-487, TASK-487-01, TASK-487-01-L01, TASK-487-01-L02, TASK-487-02, TASK-487-02-L01, TASK-487-02-L02, TASK-487-03, TASK-487-03-L01, TASK-487-03-L02

## Key Changes

### Entries (revisions + restore)
- Entry revisions are now viewable and restorable: `GET /content/:type/entries/:id/revisions` (author-joined, PII-redacted via resolveEmailValue) + `POST /content/:type/entries/:id/revisions/:revisionId/restore` (content:read/content:write, snapshot-equality no-op, pre-restore snapshot write, cache-aware post-commit invalidation) in `entryReadService.ts` / `entryService.ts` + `contentEntryRoutes.ts`.
- Admin client: `listEntryRevisionsCached` + `restoreEntryRevision` with the versioned-authority cache pattern + cache-bus events.
- Entry editor: History button now opens the `EntryRevisionDrawer` (fills the TASK-514-03 seam) with version list, preview, and confirm-gated restore that re-hydrates the editor.
- Riders: EntryCreateDrawer Tags input wired; entry SEO fields (title/description/canonical/robots) surfaced in the metadata panel.

## Validation
- `bun --cwd core lint` + `lint:types` green; Bun route/service suites + Vitest UI/client suites green.
- Runtime smoke (wf487smoke, 6 scenarios): login, editor navigation, History drawer with 2 revisions, confirm-gated restore (POST 200, data restored, drawer closes), SEO fields visible, dark-mode parity; 0 feature-related console errors. Screenshots `_docs/_workflows/_smoke/487-*`.
