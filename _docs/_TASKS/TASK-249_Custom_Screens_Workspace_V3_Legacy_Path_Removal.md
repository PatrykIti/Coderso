# TASK-249: Custom Screens Workspace V3 Legacy Path Removal
# FileName: TASK-249_Custom_Screens_Workspace_V3_Legacy_Path_Removal.md

**Priority:** High
**Category:** Coderso Custom Screens + Entries + Admin/UI + Builder UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-248, TASK-226, TASK-220
**Status:** To Do

---

## Overview

TASK-248 delivered useful V2 foundations, but the shipped workspace still mixes
two incompatible models:

- the new `List View` / `Editor View` workspace idea,
- the older `Builder` / `Preview` shell, `Open records`, `Classic editor`,
  `Legacy drawer`, and `collection-only` / `dashboard` runtime fallbacks.

This follow-up removes that mixed state and promotes Custom Screens to a single
admin workspace product with one canonical flow:

1. a screen shortcut in the left admin navigation opens the screen-owned records
   list for the assigned content type,
2. `New record` always opens the screen-owned record editor,
3. clicking a record always opens the same screen-owned editor,
4. the builder itself exposes only `List View` and `Editor View` as the primary
   workspace modes.

The delivered contract should be explicit enough that the implementation no
longer needs `classic-editor`, `drawer`, `collection-only`, or `dashboard`
escape hatches for active workspace screens.

## Target Workspace UX

The desired screen builder and runtime should behave as follows:

### Builder topbar

- remove `Open records` from the sticky builder header,
- replace the current `Builder / Preview` switch with `List View / Editor View`
  as the primary mode switch,
- move `Preview` into the left secondary action slot currently occupied by
  `Back to list`,
- rename `Save screen` to plain `Save`,
- remove the center-canvas `Settings` mode; screen-level settings live only in
  the right inspector.

### List View builder mode

- the left panel shows safe list-building elements for the selected content
  type, starting from column cards/templates rather than free-form page widgets,
- the center canvas renders a live admin-table preview for the screen,
- adding or selecting a column updates the right inspector,
- the right inspector owns both screen-level settings and selected-column
  options,
- the user expands the real list contract from the builder canvas instead of
  filling a separate form disconnected from the preview.

### Editor View builder mode

- the left panel shows admin-entry widgets intended for Custom Screens,
- the center canvas builds the screen-owned record editor layout,
- the right inspector shows screen settings, data/binding controls, and the
  selected widget inspector,
- the available widgets are scoped to the selected content type and selected
  entry context, not to the public page-builder surface.

### Runtime records flow

- clicking the screen shortcut in the admin sidebar opens the list for the
  screen's content type, but the list layout, columns, and visible information
  are controlled by the screen definition,
- clicking a row or row-level edit action opens the screen-owned record editor,
  not the classic Entries editor,
- the record editor is one coherent surface, rendered like a composed screen
  rather than a preview card above a separate generic form,
- title, media, galleries, scalar fields, and supported relation controls can
  be selected and edited inline through the composed screen widgets,
- entry create/edit still uses the shared internal content-entry routes and
  machine-readable error mapping; only the workspace presentation changes.

## Product Direction

This task family promotes Custom Screens to `schemaVersion: 3` for the
workspace contract:

- `schemaVersion: 1` and mixed `schemaVersion: 2` records are normalized on
  read into a complete V3 workspace definition,
- V3 active workspaces no longer persist or expose `classic-editor`,
  `drawer`, `collection-only`, or `dashboard` branches,
- V3 records remain tied to a single record-level `contentTypeId`; the content
  type is not duplicated inside the persisted definition,
- `List View` remains the owner of the records-list configuration,
- `Editor View` remains the owner of the record create/edit surface,
- legacy `blocks` / `bindings` columns remain transitional compatibility
  projections only; the runtime and admin UI consume the normalized V3
  `definition`.

## Sub-Tasks

- [ ] TASK-249-01: Workspace V3 Contract, Routes, and Legacy Path Removal
- [ ] TASK-249-01-01: Definition Schema, Read Migration, and Persistence Hard Cutover
- [ ] TASK-249-01-02: Routes, Clients, Cache, Nav, and Assistant Canonicalization
- [ ] TASK-249-02: Builder IA and List View Canvas Realignment
- [ ] TASK-249-02-01: Topbar Mode Switch, Preview Action, and Inspector Ownership
- [ ] TASK-249-02-02: List View Table Canvas and Column Inspector
- [ ] TASK-249-03: Interactive Editor View and Entry Runtime
- [ ] TASK-249-03-01: Admin Editor Widgets and Inline Editable Screen Components
- [ ] TASK-249-03-02: Entry Create/Edit Runtime, Error UX, and No-Legacy Fallback
- [ ] TASK-249-04: QA, Docs, and Closure
- [ ] TASK-249-04-01: Replay, Validation Matrix, Docs, Board, and Changelog Closure

## Implementation Order

1. Cut the contract to a V3 workspace model and remove legacy mode branches
   from schema, service, client, route, and navigation seams.
2. Realign the builder shell so the primary toolbar and right inspector match
   the actual workspace model.
3. Replace the form-like `List View` designer with a table-canvas workflow.
4. Replace the preview-plus-classic-editor record flow with a single
   interactive `Editor View` runtime.
5. Run the House Projects replay again, then sync docs, changelog, and board.

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: authenticated admin session on the existing session-cookie admin
  API. No public endpoint or API-key workflow is introduced by this family.
- RBAC:
  - screen definition reads require `content:read`,
  - screen definition writes require `content:write`,
  - record create/update/delete require `content:write` for the selected
    content type,
  - publish/unpublish controls require `content:publish`.
- CSRF:
  - all screen and entry writes continue through the CSRF-backed admin clients.
- Rate-limit bucket:
  - existing `admin_write` for screen and entry mutations.
- Reject-unknown validation:
  - V3 screen definitions reject legacy mode keys on write,
  - `contentTypeId` remains record-level state only,
  - dynamic content fields stay under `data` in entry payloads,
  - route modules remain orchestration-only and map domain errors centrally.
- Anti-abuse:
  - no public write endpoint, nonce/signature/HMAC flow, or reCAPTCHA flow is
    introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- Targeted Vitest suites for:
  - `customScreenSchemas`,
  - `customScreenService`,
  - `customScreensClient`,
  - `capabilities` replacement/removal coverage,
  - builder shell and designer flows,
  - records list and record editor runtime flows,
  - widget registry surface ownership,
  - assistant/admin context and navigation/prefetch seams touched by the cutover.
- Targeted Bun/integration suites for:
  - `customScreenRoutes`,
  - `contentEntryRoutes`,
  - any changed route registration and error-mapping coverage.
- Playwright replay of the canonical House Projects workflow before closure.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Active Custom Screens use one canonical workspace flow:
   `sidebar -> records list -> record editor`.
2. The builder topbar exposes `List View`, `Editor View`, `Preview`, and
   `Save`, without `Open records`, `Builder`, or a center-canvas `Settings`
   mode.
3. `List View` is designed from a table preview canvas with a selected-column
   inspector.
4. `Editor View` is rendered as a single interactive record surface with inline
   editing controls, not as a preview-plus-classic-editor fallback.
5. The backend, client, cache, route, and widget contracts no longer preserve
   the legacy V2 fallback paths for active workspace screens.
