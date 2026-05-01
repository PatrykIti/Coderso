# TASK-248-04: Admin Widget Registry, QA, Docs, and Closure
# FileName: TASK-248-04_Admin_Widget_Registry_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + Widgets + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-248-01, TASK-248-02; TASK-248-04-02 depends on TASK-248-03-03
**Status:** Done
**Completed:** 2026-05-01

---

## Overview

Close the Custom Screens Workspace Builder V2 work by separating admin widget
registry behavior from public page-builder widgets, validating the end-to-end
House Projects workflow with Playwright CLI, and updating docs/changelog/board
state.

The product decision is reuse-first, not copy-everything:

- Reuse Pages editor builder mechanics where they are general UI mechanics.
- Reuse layout widgets only when they are explicitly safe for admin surfaces.
- Do not expose public/front widgets in Custom Screens simply because they
  exist in the page builder.
- Add admin-specific widgets for `Editor View` where the data source is the
  selected content type and entry.
- Keep `List View` configuration-first. Its columns, filters, bulk actions, and
  row actions remain `definition.listView` config objects, not arbitrary widgets.

Dependency note: TASK-248-04 is split intentionally. TASK-248-04-01 is executed
before TASK-248-03-01 so the `admin-editor-view` surface exists before the
editor designer consumes it. TASK-248-04-02 must not start until TASK-248-03-03
is implemented and remains the final closure/replay leaf.

## Sub-Tasks

- [x] TASK-248-04-01: Admin Widget Registry Surface Split
- [x] TASK-248-04-02: Playwright Replay, Docs, Changelog, and Board Closure

## Files to Change

- `core/admin/ui/widgets/registry.ts`
- `core/admin/ui/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/types.ts`
- `core/widgets/runtime.tsx`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- new admin widget files if field-aware widgets are introduced outside the
  existing screen widget files.
- `core/widgets/modulePackMatrix.ts` only if implementation makes an admin
  widget module-facing or changes pack readiness.
- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*` files if widget surface contracts are documented
  per widget.
- `_docs/WIDGET_PACK_MATRIX.md` only if implementation changes module-facing
  widget readiness; otherwise record that admin-only controls do not alter the
  pack matrix.
- `_docs/PLAYWRIGHT/SUMMARY-SCREENS-2026-04-30.md` or a dated V2 follow-up
  summary.
- `_docs/_TASKS/TASK-248*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

## Registry Contract

Introduce explicit widget surfaces instead of relying on separate ad hoc lists
that can drift:

Naming decision: use `admin-list-view` and `admin-editor-view` consistently in
code and tests. These are the technical names for the product-facing `List View`
and `Editor View` tabs. Do not introduce parallel aliases such as `admin-list`
or `admin-record` unless the whole registry, docs, and tests are renamed in one
change.

```ts
type WidgetSurface =
  | "page-builder"
  | "widget-library"
  | "custom-screen-builder"
  | "admin-list-view"
  | "admin-editor-view";

type RegisteredWidget = {
  type: string;
  title: string;
  category: string;
  surfaces: WidgetSurface[];
  dataAccess?: {
    source: "none" | "selected-content-type" | "selected-entry";
    modes: Array<"read" | "write">;
  };
  schema: WidgetSchema;
  defaults: WidgetDefaults;
};
```

The exact type can be smaller if the existing registry shape already has an
equivalent extension point. The required outcome is that widget availability is
deterministic by surface and content type. This split is additive: preserve the
current `page-builder`, `widget-library`, and legacy `custom-screen-builder`
surfaces, then add the admin V2 surfaces. Do not rename current public/widget
library surfaces as part of this task.

Registered admin widgets must follow the same product-surface rule as other
widgets: `schema`, `defaults`, `normalize*`, render contract,
`wizard`/`visual`/`advanced` editor behavior, and focused tests. If a field
control is not a registered widget, keep it as an internal Custom Screens
control and document that it does not participate in the public widget registry
or module pack matrix. The `admin-list-view` surface is optional and list-scoped:
it may expose safe list chrome or display helpers, but it must not replace
`definition.listView.columns`, filters, row actions, or bulk-action config.

## Implementation Pseudocode

```ts
export function listRegisteredWidgetsForSurface(input: {
  surface: WidgetSurface;
  contentType?: ContentTypeSummary;
}) {
  return listRegisteredWidgets()
    .filter((widget) => widget.surfaces.includes(input.surface))
    .filter((widget) =>
      widget.dataAccess?.source === "selected-content-type"
        ? Boolean(input.contentType)
        : true
    );
}
```

```ts
export function registerAdminEntryWidgets() {
  registerWidget({
    type: "admin-entry-field",
    title: "Field input",
    category: "Entry",
    surfaces: ["admin-editor-view"],
    dataAccess: {
      source: "selected-entry",
      modes: ["read", "write"],
    },
    schema: adminEntryFieldWidgetSchema,
    defaults: adminEntryFieldDefaults,
  });
}
```

```tsx
const editorWidgets = listRegisteredWidgetsForSurface({
  surface: "admin-editor-view",
  contentType,
});

const listWidgets = listRegisteredWidgetsForSurface({
  surface: "admin-list-view",
  contentType,
});
```

List widgets are allowed to be empty in V2. The list table is still rendered from
`definition.listView`; `admin-list-view` must not introduce a second free-form
table builder.

Compatibility rule: existing V1 screen widget types must remain renderable.
If a V1 screen uses a legacy widget or the legacy `custom-screen-builder`
surface, load it as a legacy block for rendering/editing the old screen. Do not
offer it as a new `Editor View` widget unless it is explicitly marked
admin-safe. If a compatibility adapter maps `custom-screen-builder` to
`admin-editor-view`, keep that adapter local and covered by tests; do not make it
a broad registry rename.

## Playwright CLI Replay

Run the replay after TASK-248-01 through TASK-248-03 are implemented:

1. Open `/admin/advanced/engine`.
2. Create or reuse a House Projects content type with required fields:
   `title`, `summary`, `areaM2`, `rooms`, `bathrooms`, `floors`,
   `priceFrom`, `location`, `projectStatus`, `featured`.
3. Open `/admin/advanced/custom-screens`.
4. Create a Custom Screen for that content type.
5. Configure `List View`:
   - columns for title, location, area, rooms, price, status,
   - default sort by updated date descending,
   - status filter if the schema has `projectStatus`,
   - row click to `Editor View`,
   - create mode to `Editor View`.
6. Configure `Editor View`:
   - header/summary section,
   - project basics group,
   - pricing/location group,
   - status/featured controls.
7. Save and activate the screen.
8. Open the screen from admin navigation.
9. Add a new house project through `Editor View` create mode.
10. Edit `areaM2` and `location` for an existing project.
11. Reload and verify the list columns show the saved values.
12. Check browser console and network:
    - no `entry_validation_failed` for valid create,
    - no `Invalid widget data` messages,
    - no unexpected 500 responses.

## Security Contract

- Visibility: internal admin UI and docs/QA only.
- Auth model: authenticated admin session.
- RBAC:
  - registry listing is local UI metadata,
  - entry reads/writes during replay use `content:read` and `content:write`,
  - entry publish/unpublish uses `content:publish` when publish routes are
    exercised,
  - Custom Screen saves use the existing `content:write` permission.
- CSRF:
  - replay must confirm writes go through existing CSRF-backed clients.
- Rate-limit bucket:
  - existing admin buckets.
- Reject-unknown validation:
  - widget registry metadata must not loosen widget schema validation,
  - invalid V2 screen definitions remain rejected before persistence,
  - invalid entry payloads remain rejected by entry routes.
- Anti-abuse:
  - no public write surface,
  - no nonce/signature/HMAC/reCAPTCHA requirement.

## Testing Requirements

- Run the focused test suites required by TASK-248-04-01 and TASK-248-04-02.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI/service:
  - list columns/filters/row actions are not read from widget blocks,
  - public-only widgets are hidden from Custom Screen builder,
  - legacy V1 widgets still render for existing screens,
  - field-aware admin widgets require a selected content type,
  - registered admin widgets expose schema/defaults/normalizer/render/editor
    contracts or are documented as internal controls outside the registry,
  - module pack matrix expectations stay unchanged for admin-only controls or
    are updated with docs when a control becomes module-facing.
- Bun widget registry tests:
  - update and run `tests/unit/widgets/registry.test.ts` for the core
    `WidgetSurface` union, surface normalization, `listWidgetsForSurface`, and
    rejection of alternate aliases such as `admin-list` or `admin-record`,
  - registry returns only widgets allowed for `admin-list-view`,
  - registry returns only widgets allowed for `admin-editor-view`,
  - an empty `admin-list-view` registry is valid when List View is implemented as
    configuration objects only,
  - preserve existing `page-builder`, `widget-library`, and legacy
    `custom-screen-builder` behavior while adding `admin-list-view` and
    `admin-editor-view`.
- Run all targeted tests from TASK-248-01, TASK-248-02, and TASK-248-03.
- Playwright CLI replay with screenshots for:
  - `List View` builder,
  - `Editor View` builder,
  - rendered records table,
  - successful create/edit entry flow.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*` docs for new/admin-scoped widgets.
- `_docs/WIDGET_PACK_MATRIX.md` if module-facing widget readiness changes.
- `_docs/PLAYWRIGHT/*`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache contracts
  changed in earlier leaves.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

## Acceptance Criteria

1. Custom Screen widget availability is surface-scoped and deterministic.
2. Public page widgets are not offered in admin workspaces unless explicitly
   marked admin-safe.
3. Admin entry widgets can read/write only the selected content type and entry.
4. The House Projects V2 replay succeeds through Playwright CLI.
5. Registered admin widgets either satisfy the full widget contract or remain
   documented internal controls outside the registry.
6. Docs, task board rows, changelog, and skipped-check notes are synchronized
   at closure.
