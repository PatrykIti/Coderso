# TASK-248-04-01: Admin Widget Registry Surface Split
# FileName: TASK-248-04-01_Admin_Widget_Registry_Surface_Split.md

**Priority:** High
**Category:** Coderso Widgets + Admin Registry
**Estimated Effort:** Medium
**Dependencies:** TASK-248-03-03
**Status:** To Do

---

## Overview

Split widget availability by surface so Custom Screens can reuse builder
mechanics without exposing every public page widget as an admin-entry control.

This leaf owns registry behavior only. Playwright replay and docs/changelog
closure are owned by TASK-248-04-02.

## Sub-Tasks

No child task files.

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
- new admin widget files if field-aware widgets live outside existing screen
  widget files.
- `core/widgets/modulePackMatrix.ts` only if any new or changed widget affects a
  public/module-facing pack readiness contract.
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/customScreens/bindingResolver.test.ts`

## Registry Contract

Use explicit surfaces:

```ts
type WidgetSurface =
  | "page-builder"
  | "widget-library"
  | "custom-screen-builder"
  | "admin-list-view"
  | "admin-editor-view"
  | "admin-readonly-preview";

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

The exact structure may adapt to the current registry, but the output must be
deterministic by surface and content type. This is an additive split: preserve
the current `page-builder`, `widget-library`, and legacy
`custom-screen-builder` surfaces, then add the admin V2 surfaces. Do not rename
the existing public/widget-library surfaces in this leaf.

Admin widget contract rule:

- Any new admin widget/control that is registered as a widget must ship its
  `schema`, `defaults`, `normalize*` helper, render contract, and
  `wizard`/`visual`/`advanced` editor-mode behavior in code.
- If a field/control is an internal Custom Screens form control rather than a
  registered widget, document that explicitly in the implementation notes and
  keep it out of the public widget registry.
- Admin-only `admin-list-view`, `admin-editor-view`, and `admin-readonly-preview`
  controls are not module-pack widgets by default. If implementation makes one
  module-facing or changes pack completeness/readiness, update
  `core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md`, and the
  relevant `_docs/_WIDGETS/*` docs in the same leaf.

## Implementation Pseudocode

```ts
export function listRegisteredWidgetsForSurface(input: {
  surface: WidgetSurface;
  contentType?: ContentTypeSummary;
}) {
  return listRegisteredWidgets()
    .filter((widget) => widget.surfaces.includes(input.surface))
    .filter((widget) => {
      if (widget.dataAccess?.source === "selected-content-type") {
        return Boolean(input.contentType);
      }
      if (widget.dataAccess?.source === "selected-entry") {
        return input.surface === "admin-editor-view" && Boolean(input.contentType);
      }
      return true;
    });
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

Compatibility rule: existing V1 screen widget types remain renderable. If a V1
screen uses a legacy widget or the legacy `custom-screen-builder` surface, load
it for legacy rendering/editing but do not offer it as a new V2 widget unless it
is marked admin-safe. If a compatibility adapter maps `custom-screen-builder` to
`admin-editor-view`, keep the adapter local, deterministic, and covered by
tests; do not perform a broad registry rename.

## Security Contract

- Visibility: internal admin UI metadata and existing widget runtime only.
- Auth model: unchanged; registry listing is local UI metadata.
- RBAC: data-aware admin widgets may read/write only through existing entry
  clients gated by `content:read`, `content:write`, or `content:publish`.
- CSRF: registry changes do not create mutations; data-aware widgets use
  existing CSRF-backed clients when they save entries.
- Rate-limit bucket: unchanged existing admin buckets for downstream mutations.
- Reject-unknown validation:
  - registry metadata must not loosen widget schema validation,
  - data-aware widgets declare source/mode explicitly,
  - public-only widgets are hidden from admin workspace builders.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - registry returns only widgets allowed for `admin-list-view`,
  - registry returns only widgets allowed for `admin-editor-view`,
  - existing `page-builder`, `widget-library`, and legacy
    `custom-screen-builder` availability remains unchanged,
  - public-only widgets are hidden from Custom Screen builder,
  - legacy V1 widgets still render for existing screens,
  - field-aware admin widgets require a selected content type,
  - registered admin widgets expose schema/defaults/normalizer/render/editor
    contracts or are explicitly documented as internal controls outside the
    widget registry,
  - module pack matrix assertions stay unchanged for admin-only controls, or are
    updated with matching docs when a control becomes module-facing,
  - alternate aliases such as `admin-list` and `admin-record` are not accepted
    unless the full registry contract is deliberately renamed.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*` docs for new/admin-scoped widgets.
- `_docs/WIDGET_PACK_MATRIX.md` when the implementation changes module-facing
  widget readiness; otherwise record that admin-only controls do not alter the
  pack matrix.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Widget availability is deterministic by surface.
2. Public page widgets are not offered in admin workspaces unless marked
   admin-safe.
3. Admin field widgets can access only the selected content type and entry.
4. Existing V1 Custom Screens still render legacy widgets.
5. Any registered admin widget has a complete schema/defaults/normalizer/render
   and editor-mode contract, or is explicitly kept as an internal control.
