# TASK-540-02-L01: Expose Link Binding and Complete Tab-Slot Editing

# FileName: TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-02
**Priority:** High
**Category:** Custom Screens / Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-540-01-L01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/ScreenBlockInspector.tsx`
- compatibility updates required by this source gate in
  `tests/vitest/ui/custom-screen-binding-panel.test.tsx` and
  `tests/vitest/customScreens/screenDocumentOps.test.ts`

Do not edit the palette/factory, schema, renderer, shared controls, or the parent editor
page. Update the two named behavior tests before this leaf's gate; TASK-540-06 owns only
later aggregate additions.

## Grounded anchors

- Reusable `BoundFieldRow`: `ScreenBlockInspector.tsx:134-175`.
- Tabs editor: `:494-573`.
- Existing bound-field consumers: `:652-907`.
- Button controls with unsupported options and no binding row: `:960-992`.
- Generic slot arm UI: `:994+`.

## Implementation Pseudocode

```tsx
// Import ScreenTabItem, SCREEN_TABS_MIN, and SCREEN_TABS_MAX from
// customScreenSchemas; no local mirror.
function nextTabId(tabs: ScreenTabItem[]): string {
  let n = tabs.length + 1;
  while (tabs.some((tab) => tab.id === `tab-${n}`)) n += 1;
  return `tab-${n}`;
}

// Button branch
<BoundFieldRow
  block={selectedBlock}
  propPath="href"
  bindings={bindings}
  fields={fields}
  bindMode="read"
  onPatchBinding={onPatchBinding}
/>
// BoundFieldRow renders a named `Use static link` button only when this exact
// block/propPath binding exists. Its click is the existing callback's removal sentinel:
onPatchBinding(selectedBlock.id, "href", { field: "" });
<EnumRow
  label="Action"
  value="link"
  options={[{ value: "link", label: "Link" }]}
  onChange={() => patchData({ action: "link" })}
/>

// TabsEditor receives armedInsertSlotId/onArmSlotInsert.
// Each tab row has a real "Edit content" button which arms that exact slot.
// Add uses nextTabId(), creates slots[nextId]=[], and arms it.
// Disable Add at SCREEN_TABS_MAX and keep the draft unchanged at the cap.
// Rename changes label only; ID/slot identity stays stable.
// Remove is disabled/hidden when tabs.length <= SCREEN_TABS_MIN. Its event handler
// also returns the original draft at that boundary. Otherwise it deletes exactly its
// slot and arms the nearest remaining tab.
```

Filter Button-bound fields through the same existing eligible-field policy used
by other string/read bindings; do not create a local field-type mirror. Keep the
existing binding shape `{blockId,propPath:"href",field,mode:"read"}`.

Stop event propagation on tab authoring buttons so selecting/arming a tab does
not trigger block-wrapper selection twice. Keep all labels keyboard reachable
and named.

## Data/error flow

1. Inspector calls the existing `onPatchBinding`; the editor owns draft state.
2. Save sends the same V4 definition; TASK-540-01 validates it.
3. The visible `Use static link` affordance emits `{field:""}` for only the matching
   `href` binding. TASK-540-04-L04 owns the parent handler that consumes this sentinel
   by removing exactly that binding; the sentinel is never stored. Static href data and
   every other binding are preserved.
4. Invalid legacy data is never fabricated in UI. Server errors remain visible
   through the existing editor save error surface.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `custom-screen-binding-panel.test.tsx`: eligible-field filtering and Link-only
  action UI; pass the real `block` prop and assert the named clear affordance emits the
  exact empty-field sentinel only for an existing href binding.
- `screenDocumentOps.test.ts`/authoring operations: deterministic tab ID,
  rename identity stability, remove-slot cleanup, active slot arm, and the shared
  minimum/maximum UI: the last tab cannot be removed or lose its slot, and no 25th tab
  or orphan slot can be created.

The end-to-end palette bind→clear→rebind flow runs after TASK-540-04-L04 wires the
sentinel in the parent editor; TASK-540-06 owns that aggregate addition. This leaf must
update and pass its two named tests before its source gate.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/custom-screen-binding-panel.test.tsx \
  tests/vitest/customScreens/screenDocumentOps.test.ts
```

Rerun any named failure once in isolation. No route, DB, or runtime Bun change.
