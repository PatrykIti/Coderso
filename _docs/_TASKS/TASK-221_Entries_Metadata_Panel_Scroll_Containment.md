# TASK-221: Entries Metadata Panel Scroll Containment
# FileName: TASK-221_Entries_Metadata_Panel_Scroll_Containment.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Small
**Dependencies:** TASK-203
**Status:** Done (2026-04-27)

---

## Overview

Fix the Entries editor details panel so long metadata/taxonomy content scrolls
inside the right panel instead of expanding the editor shell.

The repair stays on the existing Entries owner seams:

- `core/admin/ui/entries/EntryEditor.tsx` owns the desktop aside and mobile
  details sheet placement.
- `core/admin/ui/entries/EntryMetadataPanel.tsx` owns metadata panel scroll
  containment and the fixed author footer.
- No route, storage, cache, or preview contract changes are introduced.

## Sub-Tasks

- [x] Remove the nested right-panel `ScrollArea` wrappers from `EntryEditor`.
- [x] Give `EntryMetadataPanel` one bounded internal scroll container with
  `min-h-0` and keep the author footer outside the scrollable region.
- [x] Add UI regression coverage for right-panel scroll ownership.
- [x] Run targeted Vitest coverage plus required lint/typecheck validation.

## Security Contract

- Visibility: internal admin Entries UI only.
- Auth model: unchanged existing admin session/API-key access through the
  Entries admin route.
- RBAC: unchanged; this task does not add or widen read/write actions.
- CSRF: unchanged; no admin write route is changed.
- Rate-limit bucket: unchanged; no API endpoint is added or modified.
- Reject-unknown validation: unchanged; no payload schema changes.
- Anti-abuse: unchanged; no public write endpoint or browser-exposed secret is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/content-entry-editor.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/entry-metadata.test.tsx`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/752-2026-04-27-task-221-entries-metadata-panel-scroll-containment.md`

## Closure Notes

- Desktop Entries details now render `EntryMetadataPanel` directly inside the
  bounded right aside, avoiding nested Radix scroll areas.
- Mobile details sheet gives the same panel a bounded `flex-1/min-h-0` host.
- The metadata content scrolls independently while the author footer remains
  pinned at the bottom of the panel.
