# 357 - TASK-054-22 custom screens bindings and record workflow

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-054-22, TASK-054-22-04, TASK-054-22-05, TASK-054-22-06

## Key Changes

### Custom screens builder
- Added a dedicated binding resolver for `widgetId + propPath -> field` mappings with safe dot-path reads/writes.
- Added a binding management panel for the selected widget block in the custom screen builder.
- Added a bound preview mode that materializes widget blocks with content-type sample data before rendering.

### Record workflow
- Added dedicated custom-screen record routes for listing and editing entries without going through the classic Entries screen first.
- Reused the existing entries domain and APIs by resolving `custom_screens.contentTypeId -> content_types.slug`.
- Added a scoped record editor that renders the custom screen preview and exposes only fields mapped by writable bindings.
- Kept a classic Entries fallback link for metadata/publish operations outside the scoped editor.

### Quality and docs
- Added unit coverage for binding resolution plus UI coverage for binding and record screens.
- Ran `bun --cwd core lint`, `bun --cwd core lint:types`, targeted custom-screens tests, and final `bun test:full` successfully.
- Updated architecture, CMS API, Coderso module docs, changelog index, and task board/task statuses to reflect the completed rollout.
