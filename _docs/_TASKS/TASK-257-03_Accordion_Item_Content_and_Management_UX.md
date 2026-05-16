# TASK-257-03: Accordion Item Content and Management UX

# FileName: TASK-257-03_Accordion_Item_Content_and_Management_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-256-03, TASK-257-01, TASK-257
**Status:** To Do

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

## Scope Boundary

Accordion item order is not just an `items[]` array concern. Each item owns a
repeatable slot (`item:<id>`) that can contain nested widgets. A data-only
reorder would desynchronize titles from slot contents and is not acceptable.

This leaf may only implement item add when it delegates to the existing
page-builder repeatable-slot owner and a shared data-sync path that keeps
`block.slots["item:<id>"]` and `block.data.items[]` aligned. It must not
implement item reorder unless a shared repeatable-slot reorder contract already
exists before this leaf starts. If add/reorder still requires a new shared
helper in `BlockSettings`, `VisualPanel`, or `blockUtils`, create a separate
shared slot task and mark U5/U6 deferred from TASK-257.

Live owner constraint:

- `AccordionEditors.tsx` receives only `block.data` through `VisualPanel`, so it
  must not implement item add/reorder by mutating `items[]` alone.
- `AccordionBlock` renders concrete panels from repeatable `slots` via
  `resolveWidgetSlotTargets()`, then resolves copy by item ID.
- `BlockSettings` currently adds/removes repeatable slot IDs but does not update
  `block.data.items[]`.
- The existing Accordion item count selector in `AccordionEditors.tsx` is a
  data-only mutation path. TASK-257-03 must not extend that selector for U6. If
  U6 is implemented, replace/remove the data-only count selector with the shared
  slot+data owner and tests; otherwise leave U6 deferred.

## Sub-Tasks

- [ ] Add optional `icon` or `leadingIcon` to Accordion item schema/defaults and
  normalizer.
- [ ] Render item icons in `<summary>` as decorative by default, with no
  user-authored HTML.
- [ ] Add Wizard/Visual controls for per-item icon text that accept short emoji
  or icon labels and normalize overlong values.
- [ ] Replace the current technical collapsible helper copy with editor-facing
  language after TASK-256 fixes behavior truthfulness.
- [ ] Classify U6 during implementation. In the current checkout, mark U6
  deferred because `BlockSettings` can create `item:<id>` slots but no shared
  owner syncs `block.data.items[]` metadata for the editor. Implement U6 only if
  a shared slot+data sync owner lands first.
- [ ] Classify U5 reorder during implementation. If a shared repeatable-slot
  reorder owner already exists, use it with Accordion metadata sync tests. If it
  does not exist, create/link a separate shared slot follow-up and do not ship
  reorder in TASK-257.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add item icon schema/defaults/normalizer/rendering. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add item icon controls and clearer behavior copy; if U6 is implemented through a shared owner, remove/replace the data-only item count selector. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Touch only if a shared slot+data sync owner already exists; do not ship copy-only add-item polish that creates slots without editable metadata. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add item icon render/normalizer coverage. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add item icon and copy regression coverage. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Add only if page-builder slot controls change. |

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

Slot-safe add/reorder decision gates:

```ts
function resolveAccordionAddItemPlan(capabilities: PageBuilderSlotCapabilities) {
  if (!capabilities.canAddRepeatableSlotWithDataSync) {
    return {
      action: "defer",
      followUp:
        "Create shared repeatable-slot data-sync task before fixing Accordion U6.",
    };
  }

  return {
    action: "use-shared-owner",
    requirements: [
      "create block.slots['item:<instanceId>']",
      "create or align block.data.items[] metadata for the same instance id",
      "replace/remove AccordionEditors data-only item count selector",
      "expose title/description/icon controls for the new item",
    ],
  };
}

function handleAccordionAddItemFromSharedOwner(block: WidgetBlock, slot: WidgetSlotDefinition) {
  return addRepeatableSlotWithDataSync(block, slot, {
    getDefaultItem(instanceId) {
      return { id: instanceId, title: `Section ${instanceId}` };
    },
  });
}

function resolveAccordionReorderPlan(capabilities: PageBuilderSlotCapabilities) {
  if (!capabilities.canReorderRepeatableSlots) {
    return {
      action: "defer",
      followUp: "Create shared repeatable-slot reorder task before fixing U5.",
    };
  }

  return {
    action: "use-shared-owner",
    requirements: [
      "move repeatable slot content",
      "sync Accordion item metadata by slot instance id",
      "cover BlockSettings and Accordion editor regressions",
    ],
  };
}
```

Error handling:

- Icons are plain text only; trim empty values to `undefined`.
- Add-item controls must respect `accordionItemMax`, create the repeatable slot,
  and create editable Accordion metadata for the same instance ID in one shared
  mutation.
- Copy-only `BlockSettings` changes are not enough for U6 because they would add
  a slot without giving the Accordion editor editable metadata for that item.
- `AccordionEditors.tsx` must not render an add-item button or keep a data-only
  count selector for implemented U6 unless it receives a shared page-builder
  slot+data mutation callback in a future task.
- Reorder controls are not rendered from TASK-257 unless a shared repeatable-slot
  reorder owner already exists.
- If no shared add/reorder owner exists, U5/U6 must be deferred to a separate
  shared repeatable-slot task and recorded in TASK-257-05.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must reject unknown item keys.
- Anti-abuse: item icons are plain text and must not be rendered as HTML.
- Secret handling: no secrets in item labels, icons, slot IDs, or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  if a shared slot+data owner exists and U6 is implemented
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if
  page-builder slot-control rendering changes
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
- If add or reorder is deferred because it needs a shared slot-contract task,
  document the exact blocker and follow-up task ID in the report.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion supports safe plain-text item icons when configured.
- Editor copy for all-closed behavior is understandable to content editors.
- U6 is either deferred with a shared slot+data blocker, or the add-item
  affordance creates the repeatable slot, preserves nested slot content, and
  exposes editable title/description/icon metadata for the new item.
- Reorder affordances either work with nested slot content preserved through an
  existing shared owner or are explicitly deferred with a shared slot-contract
  blocker.
