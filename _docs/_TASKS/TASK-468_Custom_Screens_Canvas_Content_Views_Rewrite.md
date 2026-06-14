# TASK-468: Custom Screens Canvas Content Views Rewrite
# FileName: TASK-468_Custom_Screens_Canvas_Content_Views_Rewrite.md

**Priority:** High
**Category:** Admin UI / Custom Screens / Content Modeling / Architecture
**Estimated Effort:** Very Large
**Dependencies:** TASK-464, TASK-467
**Status:** ⏳ To Do

---

## Overview

Rewrite Custom Screens from the current legacy widget-block builder into a
screen-owned canvas contract for custom content data. The new authoring model
must feel like the modern Page Editor, with flexible sections and blocks, but it
must not store or accept Page v2 `sections[]` directly. Screens get their own
`ScreenDocumentV1` contract that is correlated with one selected custom content
type and its entries.

Current state to replace:

- Custom Screen definitions are `schemaVersion: 3`.
- `editorView.blocks` is legacy `WidgetBlock[]`.
- Field presentation is driven by screen-specific widgets such as
  `screen-field-value`, `screen-field-group`, and `screen-two-column`.
- `custom_screens.blocks` and `custom_screens.bindings` duplicate projections of
  the definition for legacy compatibility.
- Admin entry editing uses `WidgetRenderer`/screen widget bridges and swaps
  bound widgets into field controls.

Target state:

- `custom_screens.definition` is the source of truth.
- `schemaVersion: 4` owns `ScreenDocumentV1`.
- `ScreenDocumentV1.sections[]`, `ScreenSectionV1`, and `ScreenBlockV1` are screen-specific data
  structures, not Page v2 objects.
- Screen blocks bind to custom content fields through explicit
  `ScreenBlockBinding` records.
- List, record preview, and entry editing views render through a screen runtime,
  not through the generic widget runtime.
- The old `custom-screen-builder` widget surface is fully removed after
  migration and validation.

## Sub-Tasks

- [ ] TASK-468-01: Contract freeze, drift audit, and migration decision record.
  - [ ] TASK-468-01-L01: Current State Inventory And Drift Freeze.
  - [ ] TASK-468-01-L02: V4 Contract Decision Record And Validation Plan.
- [ ] TASK-468-02: Screen document V4 service contract and migration adapters.
  - [ ] TASK-468-02-L01: Screen Document Domain Owner.
  - [ ] TASK-468-02-L02: Legacy V1-V3 Read Migration Adapters.
  - [ ] TASK-468-02-L03: V4 Service Mapping And Route Validation.
  - [ ] TASK-468-02-L04: V4 Write Transition And Compatibility Guards.
- [ ] TASK-468-03: Neutral authoring shell extraction for screen canvas reuse.
  - [ ] TASK-468-03-L01: Authoring Inventory And Boundary Guards.
  - [ ] TASK-468-03-L02: Neutral Canvas Frame And Selection Primitives.
  - [ ] TASK-468-03-L03: Neutral Toolbar Layers And Command Shell.
  - [ ] TASK-468-03-L04: Page Adapter Parity Validation.
- [ ] TASK-468-04: Custom Screen canvas editor cutover.
  - [ ] TASK-468-04-L01: V4 Editor Client And Local Model.
  - [ ] TASK-468-04-L02: Screen Canvas Shell And Section Block Operations.
  - [ ] TASK-468-04-L03: Field Palette Binding Inspector And Missing Field States.
  - [ ] TASK-468-04-L04: Save Dirty State Cache And Preview Flow.
  - [ ] TASK-468-04-L05: Editor Cutover Tests And Legacy Builder Guard.
- [ ] TASK-468-05: Screen runtime, records list, and entry editing cutover.
  - [ ] TASK-468-05-L01: Screen Runtime Renderer.
  - [ ] TASK-468-05-L02: Entry Field Controls And Draft Bridge.
  - [ ] TASK-468-05-L03: Records List Presentation Modes.
  - [ ] TASK-468-05-L04: Record Workspace Routing Cache And Active Context.
  - [ ] TASK-468-05-L05: Runtime Entry Tests And Legacy Bridge Guard.
- [ ] TASK-468-06: Assistant active-surface and cache cutover.
  - [ ] TASK-468-06-L01: Assistant V4 Action Schemas Registry And Mapper.
  - [ ] TASK-468-06-L02: V4 Active Surface Context Hydration.
  - [ ] TASK-468-06-L03: Assistant Executor Policy Dry Run And Undo.
  - [ ] TASK-468-06-L04: Assistant Client Cache And Regression Coverage.
- [ ] TASK-468-07: Legacy removal, DB cleanup, docs, and closure validation.
  - [ ] TASK-468-07-L01: V4 Backfill Verification Migration.
  - [ ] TASK-468-07-L02: Legacy Widget Surface And Bridge Removal.
  - [ ] TASK-468-07-L03: Drop Legacy Blocks Bindings Columns.
  - [ ] TASK-468-07-L04: Docs Changelog Board And Final Validation.

## Architecture

Target ownership:

```text
core/services/customScreens/screenDocument.ts
  -> screen section/block/binding types
  -> defaults, schema validation, normalizers, migration helpers

core/services/customScreens/customScreenService.ts
  -> DB row mapping
  -> V1/V2/V3 read migration into V4
  -> V4 persistence

core/admin/ui/authoring/*
  -> neutral authoring chrome extracted from Page Editor modules
  -> no PageDocumentV2-specific state

core/admin/ui/pages/editor/*
  -> Page-specific adapters over neutral authoring chrome

core/admin/ui/custom-screens/*
  -> screen-specific editor host, content-type field palette, inspector,
     record preview, list view, and entry edit flow
```

Forbidden closure criteria:

- Do not pass Page v2 `sections[]` directly to Custom Screen APIs.
- Do not keep arbitrary `WidgetBlock[]` rendering in the new screen runtime.
- Do not leave `screen-field-*` widgets as the active editor foundation.
- Do not add public write endpoints for Screens in this family.
- Do not leak record payloads, secrets, or privileged settings into assistant
  active-surface context or browser cache.

## Security Contract

- **Endpoint visibility:** internal admin endpoints only. Existing clients may
  call `apiRequest("/custom-screens")`; `apiRequest` owns the `/admin/api`
  prefix.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for screen/list/detail metadata reads;
  `content:write` for screen definition mutations and record writes; preserve
  any existing stronger entry publish/delete checks.
- **CSRF expectations:** required on all admin writes.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** strict reject-unknown at definition, view,
  section, block, binding, block-prop, and action payload levels.
- **Anti-abuse controls:** no public write path. If public submissions are later
  added, split a separate task with nonce plus signature/HMAC and optional
  reCAPTCHA policy.
- **Secret handling:** no provider keys, storage credentials, cookies, CSRF
  tokens, protected settings, or raw privileged entry values in browser cache,
  assistant payloads, previews, debug logs, or bundle reports.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- Targeted Vitest suites for custom screen schemas/service, screen document
  normalizers, admin custom screen clients, screen editor UI, Page Editor reuse
  regressions, and assistant action mapping.
- Bun route/runtime tests for Custom Screen routes and content entry writes.
- DB-backed migration/backfill tests when `DATABASE_URL` is available. Load env
  first with `set -a && source .env && set +a`.
- Security scanner lanes from `_docs/SECURITY_SPEC.md` if sanitizer, auth,
  secret-handling, public-write, or scanner config behavior changes.
- `git diff --check`
- `bun run precommit` before a manual commit.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/DATA_MODEL.md`
- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` if assistant action or active-surface
  docs change.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys or owners
  change.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when the family closes.

## Acceptance Criteria

1. Custom Screens persist and read `schemaVersion: 4` definitions with
   `ScreenDocumentV1`.
2. Screens expose a flexible section/block canvas for custom content data without
   accepting Page v2 `sections[]`.
3. Screen editor, record list, and entry editing no longer depend on arbitrary
   widget runtime rendering.
4. Existing V1/V2/V3 screen rows migrate deterministically or render safe
   placeholders for unsupported legacy widgets until final cleanup.
5. Legacy `custom-screen-builder` widgets, active fallback paths, and duplicated
   `custom_screens.blocks` / `custom_screens.bindings` storage are removed by
   the closure task.
6. Assistant actions and active-surface summaries use screen sections, blocks,
   bindings, and writable field names instead of widget-block patch semantics.
