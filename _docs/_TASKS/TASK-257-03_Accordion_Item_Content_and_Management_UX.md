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
- U5: item reorder affordance, but only if it keeps nested slot content aligned;
- U6: explicit add-item affordance in the Accordion editing flow.

## Scope Boundary

Accordion item order is not just an `items[]` array concern. Each item owns a
repeatable slot (`item:<id>`) that can contain nested widgets. A data-only
reorder would desynchronize titles from slot contents and is not acceptable.

This leaf may only implement item add when it delegates to the existing
page-builder repeatable-slot owner. It must not implement item reorder unless a
shared repeatable-slot reorder contract already exists before this leaf starts.
If reorder still requires a new shared helper in `BlockSettings`, `VisualPanel`,
or `blockUtils`, create a separate shared slot task and mark U5 deferred from
TASK-257.

Live owner constraint:

- `AccordionEditors.tsx` receives only `block.data` through `VisualPanel`, so it
  must not implement item add/reorder by mutating `items[]` alone.
- `AccordionBlock` renders concrete panels from repeatable `slots` via
  `resolveWidgetSlotTargets()`, then resolves copy by item ID.
- `BlockSettings` currently owns add/remove repeatable slot mutations. Any
  inline Accordion add/reorder UX must delegate to that page-builder owner or
  introduce a shared page-builder helper first.

## Sub-Tasks

- [ ] Add optional `icon` or `leadingIcon` to Accordion item schema/defaults and
  normalizer.
- [ ] Render item icons in `<summary>` as decorative by default, with no
  user-authored HTML.
- [ ] Add Wizard/Visual controls for per-item icon text that accept short emoji
  or icon labels and normalize overlong values.
- [ ] Replace the current technical collapsible helper copy with editor-facing
  language after TASK-256 fixes behavior truthfulness.
- [ ] Verify current page-builder slot controls already expose a discoverable
  "Add item" action for Accordion; if not, improve the page-builder-owned slot
  control labels for Accordion instead of adding a data-only editor button.
- [ ] Classify U5 reorder during implementation. If a shared repeatable-slot
  reorder owner already exists, use it with Accordion metadata sync tests. If it
  does not exist, create/link a separate shared slot follow-up and do not ship
  reorder in TASK-257.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add item icon schema/defaults/normalizer/rendering. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add item icon controls and clearer behavior copy. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Touch only for Accordion-specific add-item label/discovery polish that uses existing repeatable slot callbacks. |
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

Slot-safe reorder decision gate:

```ts
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
- Add-item controls must respect `accordionItemMax` and preserve existing nested
  slot contents.
- Reorder controls are not rendered from TASK-257 unless a shared repeatable-slot
  reorder owner already exists.
- If no shared reorder owner exists, U5 must be deferred to a separate shared
  repeatable-slot task and recorded in TASK-257-05.

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
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if
  page-builder slot-control rendering changes
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md` with item icon and item-management
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` rows W2, U3, U5, and U6
  with fixed/deferred evidence.
- If reorder is deferred because it needs a shared slot-contract task, document
  the exact blocker and follow-up task ID in the report.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion supports safe plain-text item icons when configured.
- Editor copy for all-closed behavior is understandable to content editors.
- Add/reorder affordances either work with nested slot content preserved or are
  explicitly deferred with a shared slot-contract blocker.
