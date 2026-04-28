# 360 - TASK-053-06 page settings autosave and history

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-053, TASK-053-06

## Key Changes

### Page revisions
- Added `page_revisions.kind` with `publish | autosave` semantics.
- Page revision snapshots now preserve `title`, `slug`, and `data`, so Page Settings autosaves can be restored accurately.
- Added autosave replace/dedupe flow and autosave-only discard handling in the page revision service.

### Page editor
- Added Page Settings autosave on drawer close when settings are dirty.
- Added a Page History drawer in the page editor top bar with restore and autosave discard actions.
- Added page client and route support for autosave, revision listing, revision restore, and autosave discard.

### Validation
- Ran `bun --cwd core lint`
- Ran `bun --cwd core lint:types`
- Ran targeted page UI/client/route tests
- Ran DB-backed page revision/autosave tests against the configured PostgreSQL database
