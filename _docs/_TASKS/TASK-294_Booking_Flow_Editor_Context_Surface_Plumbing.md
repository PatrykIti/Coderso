# TASK-294: Booking Flow Editor Context Surface Plumbing

# FileName: TASK-294_Booking_Flow_Editor_Context_Surface_Plumbing.md

**Priority:** High
**Category:** Shared Builder + Booking Widgets + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-07, TASK-258-03, TASK-259-01
**Status:** To Do

---

## Overview

Create the shared `WidgetEditorContext` plumbing that exposes same-surface
Booking Calendar flow summaries to booking widget editors without persisting
preview-only data into widget JSON.

This task exists because Appointment Form `UX-02` and Booking Calendar preview
diagnostics both need a shared booking-aware editor context. The owner is the
page-builder surface contract, not a widget-local fallback in
`AppointmentFormEditors.tsx` or `BookingCalendarEditors.tsx`.

This task owns only the shared admin/context seam:

- typed `bookingFlows` metadata on `WidgetEditorContext`
- block-tree collection of same-surface Booking Calendar summaries
- propagation through page, widget-template, custom-screen, and detail-template
  `BlockSettings` entrypoints
- preservation of the existing `surface`, `jumpToBindingPropPath`,
  `getBindingState`, and `slotTargets` contract

It does not own:

- Appointment Form copy, labels, or local flow-feedback UI
- Booking Calendar runtime/public catalog hydration
- any public runtime or public-write behavior

## Files to Change

- `core/widgets/types.ts`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/blockUtils.ts` only if an existing traversal
  helper must be reused or extended
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/content-types/DetailTemplateEditorPage.tsx`
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `tests/vitest/ui/widget-template-editor.test.tsx`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `tests/vitest/content/detailPageBindingResolver.test.ts` or the current
  detail-template editor-context suite
- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-258-03_Flow_Pairing_Slot_Context_Locale_and_Redirect.md`
  only to point `UX-02` at this shared owner
- `_docs/_TASKS/TASK-259-01_Booking_Calendar_Admin_Preview_Runtime_Catalog_Parity.md`
  only if its context wording must reference this shared owner explicitly

## Sub-Tasks

- [ ] Extend `WidgetEditorContext` with a typed `bookingFlows` payload that is
  additive to the current context contract.
- [ ] Build a shared helper that collects same-surface Booking Calendar flow
  summaries from the current block tree.
- [ ] Pass the merged editor context through `PageEditor` desktop and mobile
  `BlockSettings` entrypoints.
- [ ] Pass the merged editor context through `WidgetTemplateEditorPage`.
- [ ] Preserve and merge existing binding-aware context in
  `CustomScreenEditorPage` and `DetailTemplateEditorPage`.
- [ ] Keep `BlockSettings` slot-target augmentation intact while forwarding the
  shared booking flow summaries to editors.

## Implementation Pseudocode

```ts
type BookingFlowSummary = {
  blockId: string;
  flowId: string;
  label: string;
};

type WidgetEditorContext = ExistingWidgetEditorContext & {
  bookingFlows?: {
    calendars: BookingFlowSummary[];
  };
};

function collectBookingFlowSummaries(blocks: Block[]): BookingFlowSummary[] {
  return flattenBlocks(blocks)
    .filter((block) => block.type === "booking-calendar")
    .map((block) => {
      const normalized = normalizeBookingCalendarData(block.data as BookingCalendarData);
      return {
        blockId: block.id,
        flowId: normalized.flowId ?? "booking-flow",
        label: normalized.title ?? "Booking Calendar",
      };
    });
}

function mergeBookingFlowEditorContext(
  base: ExistingWidgetEditorContext,
  blocks: Block[]
): WidgetEditorContext {
  return {
    ...base,
    bookingFlows: {
      calendars: collectBookingFlowSummaries(blocks),
    },
  };
}
```

Error handling:

- If a surface has no Booking Calendar blocks, expose an empty `calendars`
  array instead of omitting unrelated context fields.
- If a block has invalid or blank flow data, normalize it through the existing
  Booking Calendar normalizer before exposing the summary.
- Never replace or drop `jumpToBindingPropPath`, `getBindingState`, or
  `slotTargets` while adding booking flow data.

## Security Contract

This is internal admin/editor context only.

- Endpoint visibility: internal admin surfaces only.
- Auth model: unchanged existing admin session flow.
- RBAC: unchanged existing page/template/custom-screen/detail-template editor
  permissions.
- CSRF: unchanged because this task only threads existing editor context data.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: no persisted widget JSON schema changes are owned
  here beyond the typed in-memory context contract.
- Anti-abuse: do not expose tokens, nonce values, private diagnostics, or full
  booking payloads in editor context. The shared context is limited to widget
  block ids, labels, and normalized flow ids already visible to an editor.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/content/detailPageBindingResolver.test.ts`
  or the current detail-template editor-context suite when that surface is
  touched
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  only if consumer-facing Appointment Form copy changes in the same slice
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  only if Booking Calendar diagnostics copy changes in the same slice
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-258-03_Flow_Pairing_Slot_Context_Locale_and_Redirect.md`
  when `UX-02` depends on or defers to this shared owner
- `_docs/_TASKS/TASK-259-01_Booking_Calendar_Admin_Preview_Runtime_Catalog_Parity.md`
  when shared context ownership replaces ad hoc local wording

## Acceptance Criteria

- `WidgetEditorContext` can carry same-surface Booking Calendar summaries
  without dropping existing context fields.
- `PageEditor`, `WidgetTemplateEditorPage`, `CustomScreenEditorPage`, and
  `DetailTemplateEditorPage` all pass the merged context through
  `BlockSettings`.
- `BlockSettings` still augments `slotTargets` while preserving the merged
  booking flow summaries.
- No tokens, nonces, or private booking runtime data are exposed through the
  shared context.
