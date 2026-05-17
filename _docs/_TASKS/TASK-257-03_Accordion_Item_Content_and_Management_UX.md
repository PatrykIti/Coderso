# TASK-257-03: Accordion Item Content and Management UX

# FileName: TASK-257-03_Accordion_Item_Content_and_Management_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-256-03, TASK-257-01, TASK-257
**Status:** Done (2026-05-17)

---

## Overview

Improve Accordion item authoring without violating the page-builder repeatable
slot contract.

This leaf covers Accordion-specific product/editor findings from
`REPORT_ACCORDION_WIDGET.md`:

- W2: optional icon or emoji per item;
- U3: clearer "Allow all closed" copy;
- U5: item reorder affordance, but only if a shared repeatable-slot reorder
  owner keeps nested slot content aligned;
- U6: explicit add-item affordance, but only if a shared slot+data sync owner
  can create the slot and expose editable metadata for the new item.

The current checkout already exposes shared repeatable-slot add/remove controls
through `BlockSettings` and `VisualPanel`, but those shared controls only mutate
slot IDs. They do not create or reorder matching `block.data.items[]` metadata
for slot-backed widgets. In this checkout, TASK-257-03 is execution-ready for
the Accordion-only icon/copy slice and for routing U5/U6 to TASK-293.

## Scope Boundary

Accordion item order is not just an `items[]` array concern. Each item owns a
repeatable slot (`item:<id>`) that can contain nested widgets. A data-only
reorder would desynchronize titles from slot contents and is not acceptable.

This leaf may only implement item add when it delegates to the existing
page-builder repeatable-slot owner and a shared data-sync path that keeps
`block.slots["item:<id>"]` and `block.data.items[]` aligned. It must not
implement item reorder unless a shared repeatable-slot reorder contract already
exists before this leaf starts. In the current checkout, that shared owner is
missing and the follow-up is now tracked explicitly as TASK-293. TASK-257-03
must not hide U5/U6 inside Accordion-local mutations.

Live owner constraint:

- `AccordionEditors.tsx` already receives `onBlockPatch` and `context`, but its
  current item-management path still mutates `items[]` alone and does not
  consume the shared slot-control seam.
- `AccordionBlock` renders concrete panels from repeatable `slots` via
  `resolveWidgetSlotTargets()`, then resolves copy by item ID.
- `BlockSettings` currently adds/removes repeatable slot IDs but does not update
  `block.data.items[]`.
- The existing Accordion item count selector in `AccordionEditors.tsx` is a
  data-only mutation path. TASK-257-03 must not extend that selector for U6. If
  U6 is implemented in a later task, replace/remove the data-only count selector
  with the shared slot+data owner and tests. In this checkout, leave U6
  deferred to TASK-293.

## Sub-Tasks

- [x] Add optional `icon` or `leadingIcon` to Accordion item schema/defaults and
  normalizer.
- [x] Render item icons in `<summary>` as decorative by default, with no
  user-authored HTML.
- [x] Add Wizard/Visual controls for per-item icon text that accept short emoji
  or icon labels and normalize overlong values.
- [x] Replace the current technical collapsible helper copy with editor-facing
  language after TASK-256 fixes behavior truthfulness.
- [x] Link U6 to TASK-293 in the current checkout because `BlockSettings` can
  create `item:<id>` slots but no shared owner syncs `block.data.items[]`
  metadata for the editor.
- [x] Link U5 reorder to TASK-293 in the current checkout because no shared
  repeatable-slot reorder owner currently rebuilds slot order and matching
  widget metadata together.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add item icon schema/defaults/normalizer/rendering. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add item icon controls and clearer behavior copy; document that U5/U6 stay deferred behind TASK-293. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add item icon render/normalizer coverage. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add item icon and copy regression coverage. |
| `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` | Route U5/U6 to TASK-293 in the Accordion report. |

## Implementation Pseudocode

```ts
type AccordionItem = {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
};

function normalizeAccordionItem(raw: AccordionItem, index: number) {
  return {
    id: normalizeItemId(raw.id, index, used),
    title: toTrimmedString(raw.title) ?? `Section ${index + 1}`,
    description: toTrimmedString(raw.description) ?? undefined,
    icon: normalizeShortPlainText(raw.icon, { maxLength: 24 }),
  };
}
```

Current-checkout blocker map:

```ts
function resolveAccordionItemManagementPlan() {
  return {
    implementNow: ["icon", "copy"],
    defer: [
      {
        finding: "U6",
        taskId: "TASK-293",
        blocker:
          "shared repeatable-slot add currently creates slot IDs without matching Accordion item metadata",
      },
      {
        finding: "U5",
        taskId: "TASK-293",
        blocker:
          "shared repeatable-slot reorder helper and generic move controls do not exist yet",
      },
    ],
  };
}
```

Error handling:

- Icons are plain text only; trim empty values to `undefined`.
- `AccordionEditors.tsx` must not render Accordion-local add/reorder controls in
  this checkout because the shared builder seam still lacks slot/data sync and
  repeatable-slot reorder ownership.
- Copy-only `BlockSettings` changes are not enough for U6 because they would add
  a slot without giving the Accordion editor editable metadata for that item.
- If the shared slot owner lands later, it should replace the data-only count
  selector instead of duplicating cardinality controls.
- U5/U6 must be deferred to TASK-293 and recorded in TASK-257-05 unless that
  shared task lands first.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must reject unknown item keys.
- Anti-abuse: item icons are plain text and must not be rendered as HTML.
- Secret handling: no secrets in item labels, icons, slot IDs, or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md` with item icon behavior and final
  item-management status.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` rows W2, U3, U5, and U6
  with fixed/deferred evidence.
- Document the exact TASK-293 blocker for U5/U6 in the report and closure leaf.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion supports safe plain-text item icons when configured.
- Editor copy for all-closed behavior is understandable to content editors.
- U6 is deferred to TASK-293 with the shared slot+data blocker documented.
- U5 is deferred to TASK-293 with the shared repeatable-slot reorder blocker
  documented.
