# TASK-540-02-L01: Expose Link Binding and Complete Tab-Slot Editing

# FileName: TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-02
**Priority:** High
**Category:** Custom Screens / Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-540-01-L01
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-13 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Started:** 2026-07-16
**Repair Reason:** R01 centralized binding-ID generation in `buildScreenFieldBindingId`; L02 must consume that domain helper from its existing Inspector binding factory and prove maximum-length tuples stay distinct and bounded. L02 also owns the visible behavior correction that restores a blank or over-120 Tab-label draft to the latest committed label on blur or Enter without calling `onPatchBlock`.
**Modularity Repair Pending:** 2026-07-17 — measured from family baseline `e5f15a567`, the touched `ScreenBlockInspector.tsx` grew from 1,078 to 1,194 physical lines and therefore blocks closure under the hard 1,000-line gate. The exact stable-facade split below must land without changing Inspector behavior or public imports.
**Current Repair State:** The behavior repair is implemented and its recorded `Revalidation Passed` remains historical pre-split evidence only. After all five production paths pass the exact static, two-file 33/33 Vitest, line-count, and drift gates, remove the single `Modularity Repair Pending` field and replace it with one `Modularity Repair Revalidated` receipt; the two fields must never coexist.
**Revalidation Passed:** 2026-07-16 — historical pre-modularity evidence: `core lint:types` and `core lint` passed; the exact two-file L02 Vitest gate passed 33/33 on the final shared schema state, including the domain-builder consumer and invalid blur/Enter restore regressions; and `git diff --check` passed. This receipt cannot validate the extracted modules and claims no full-suite, post-audit, smoke, changelog, or closure result.
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- the stable `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` facade plus
  `screenBlockInspectorModel.ts`, `ScreenBlockInspectorControls.tsx`,
  `ScreenBlockInspectorTabs.tsx`, and `ScreenBlockInspectorSection.tsx`
- compatibility updates required by this source gate in
  `tests/vitest/ui/custom-screen-binding-panel.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx`

Do not edit the palette/factory, schema, renderer, shared controls, or the parent editor
page. Update the named behavior test before this leaf's gate; TASK-540-06 owns only
later aggregate additions.

`customScreenSchemas.ts`, `screenDocumentOps.ts`, and
`tests/vitest/customScreens/screenDocumentOps.test.ts` remain R01-owned. This leaf owns
only the Inspector import/call site that consumes `buildScreenFieldBindingId`; it must
not duplicate, alter, or re-export the domain builder.

## Mandatory Inspector module split

The split is measured from verified family baseline `e5f15a567` through the final
working tree; staging or intermediate commits do not reset touched-file scope. Verified
baseline→pre-split counts are Inspector 1,078→1,194, binding-panel suite 286→787, and
image-inspector suite 423→454. All three original paths plus every new owner remain in
the byte-based final gate. Preserve the existing import seam and exact public surface:
seven runtime exports
`createScreenFieldBinding`, `SCREEN_ALIGN_DEFAULT_OPTION`, `buildStylePatch`,
`SCREEN_SECTION_COLUMNS_DEFAULT_OPTION`, `buildSectionLayoutPatch`,
`ScreenSectionInspector`, and `ScreenBlockInspector`, plus type exports
`ScreenBlockStyleEdit` and `ScreenSectionStyleEdit`. The facade must explicitly
re-export the same references; `export *`, wrappers, duplicate constants, and local
schema mirrors are forbidden.

| Owner | Sole responsibility | Post-format budget |
|---|---|---:|
| `screenBlockInspectorModel.ts` | Inspector prop/value types, field-option de-duplication, `createScreenFieldBinding`, alignment/section-column sentinel constants, clamps, and the two pure style/layout patch builders | `<=320` |
| `ScreenBlockInspectorControls.tsx` | reusable `InspectorRow`, bound-field/enum/box-spacing rows, clear affordance, and Image URL row; no Tabs draft or section state | `<=320` |
| `ScreenBlockInspectorTabs.tsx` | `nextTabId`, Unicode code-point length, `ScreenTabLabelDraft`, `TabLabelInput`, and `TabsEditor`, including add/remove/arm/commit/restore behavior | `<=280` |
| `ScreenBlockInspectorSection.tsx` | section-column options and the exported `ScreenSectionInspector`; consumes model patch helpers and shared controls | `<=360` |
| `ScreenBlockInspector.tsx` | block-kind orchestration and explicit compatibility re-exports only; imports the focused owners and retains the exported `ScreenBlockInspector` component | `<=700` |

The acyclic import graph is:

```text
customScreenSchemas -> screenBlockInspectorModel
screenBlockInspectorModel -> ScreenBlockInspectorControls
screenBlockInspectorModel + ScreenBlockInspectorControls
  -> {ScreenBlockInspectorTabs, ScreenBlockInspectorSection}
model + controls + tabs + section -> explicit ScreenBlockInspector facade
```

The model is Bun-free and has no React state. Controls never import Tabs, Section, or
the facade. Tabs and Section are siblings and never import one another. Preserve the
single binding-ID builder call, eligible-field policy, exact clear sentinel, Unicode
trim/code-point validation, latest-committed draft restoration, Escape semantics,
parent-rerender invalidation, tab/slot identity, min/max guards, event propagation,
image URL fail-closed behavior, exported reference identity, and every existing
accessible name.

The split must carry `ScreenTabLabelDraft.baseLabel` unchanged into
`ScreenBlockInspectorTabs.tsx`. It must not opportunistically execute deferred
`TASK-9999-01-L02`. Once extraction makes the old path/line evidence stale, the
TASK-540 closure/docs owner must re-anchor TASK-9999-01 and TASK-9999-01-L02 to the new
symbol path and exact final lines while preserving their `⏳ To Do` states and
behavior-neutral rationale. This is an evidence follow-up only, not a new LOW and not
permission to close or widen the deferred leaf.

No modularity blocker is eligible for TASK-9999: leaving a touched source above 1,000
would violate a hard verification gate. Any behavior/assertion drift discovered during
the split is likewise repaired here according to its actual impact, never hidden as a
line-limit LOW.

Land in this exact order: `screenBlockInspectorModel.ts`,
`ScreenBlockInspectorControls.tsx`, `ScreenBlockInspectorTabs.tsx`,
`ScreenBlockInspectorSection.tsx`, then the stable `ScreenBlockInspector.tsx` facade.
After the source gate, run the two test files independently and combined, perform the
TASK-9999 evidence-path follow-up, then run the targeted static/test/line gate before
writing `Modularity Repair Revalidated`. That receipt does not claim the later mandatory
family post-audit or runtime smoke. A downstream
module may consume only already-landed owners and must never import the facade back into
an internal owner.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named symbols and regression suites in this contract rather than mutable line numbers.

- Reusable `BoundFieldRow`: `ScreenBlockInspector.tsx:134-175`.
- Tabs editor: `:494-573`.
- Existing bound-field consumers: `:652-907`.
- Button controls with unsupported options and no binding row: `:960-992`.
- Generic slot arm UI: `:994+`.
- Image URL control importing the transitional alias: `:1-30,463-492`.

## Implementation Pseudocode

```tsx
// ScreenBlockInspector.tsx — stable seam and block orchestration
export { createScreenFieldBinding, buildStylePatch, buildSectionLayoutPatch } from
  "./screenBlockInspectorModel";
export type { ScreenBlockStyleEdit, ScreenSectionStyleEdit } from
  "./screenBlockInspectorModel";
export { ScreenSectionInspector } from "./ScreenBlockInspectorSection";

// Import ScreenTabItem, SCREEN_TABS_MIN, SCREEN_TABS_MAX, and
// SCREEN_TAB_LABEL_MAX from customScreenSchemas; no local mirror.
function nextTabId(tabs: ScreenTabItem[]): string {
  let n = tabs.length + 1;
  while (tabs.some((tab) => tab.id === `tab-${n}`)) n += 1;
  return `tab-${n}`;
}

type BoundFieldClearAffordance = Readonly<{
  label: string;
  onClear: () => void;
}>;

// The Inspector remains the UI owner, while R01's schema domain owns ID semantics.
export const createScreenFieldBinding = (input): ScreenFieldBinding => ({
  id: buildScreenFieldBindingId(input.blockId, input.propPath),
  blockId: input.blockId,
  propPath: input.propPath,
  source: "entry",
  field: input.field,
  mode: input.mode ?? "readwrite",
});

// BoundFieldRow accepts clearAffordance?: BoundFieldClearAffordance and renders it
// only when this exact block/propPath binding exists. All unrelated callers omit it.

// Button branch
<BoundFieldRow
  block={selectedBlock}
  propPath="href"
  bindings={bindings}
  fields={fields}
  bindMode="read"
  onPatchBinding={onPatchBinding}
  clearAffordance={{
    label: "Use static link",
    onClear: () =>
      onPatchBinding(selectedBlock.id, "href", { field: "" }),
  }}
/>
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
// Rename keeps local draft text keyed by block+tab plus the committed label on which
// that draft was based. Do NOT use native maxLength=SCREEN_TAB_LABEL_MAX: HTML counts
// raw UTF-16 units while the schema counts post-trim Unicode code points. Blur/Enter
// commits only draft.trim() when non-empty and Array.from(trimmed).length is <= the
// shared SCREEN_TAB_LABEL_MAX. On blur or Enter, invalid transient text immediately
// restores the visible input to the latest committed label and never calls onPatchBlock.
// A parent prop refresh invalidates a draft based on an older label, and Escape restores
// that same latest committed value. ID/slot identity stays stable.
// Remove is disabled/hidden when tabs.length <= SCREEN_TABS_MIN. Its event handler
// also returns the original draft at that boundary. Otherwise it deletes exactly its
// slot and arms the nearest remaining tab.

// ImageSrcRow completes the handoff from TASK-540-01's compatibility alias:
const safe = sanitizeScreenAuthoringUrl(raw, "media");
onPatchBlockData(block.id, { src: safe ?? "" });
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
   every other binding are preserved. The Button branch is the only caller that passes
   the optional clear affordance; header, field, heading, image, and related-list rows
   omit it and therefore gain neither link-specific copy nor a clear action.
4. Invalid legacy data is never fabricated in UI. Server errors remain visible
   through the existing editor save error surface.
5. The armed tab identity is host-owned: “Edit content”, add, and remove call
   `onArmSlotInsert(block.id, tabId)`. The Inspector never keeps a second active-tab
   state. TASK-540-03 derives the builder's visible active panel from this same
   `insertPoint` and tab activation writes the same slot-end target.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `custom-screen-binding-panel.test.tsx`: eligible-field filtering and Link-only
  action UI; pass the real `block` prop and assert the named clear affordance emits the
  exact empty-field sentinel only for an existing href binding, and assert unrelated
  binding-row consumers do not render `Use static link`. The same suite owns
  deterministic tab ID, buffered valid rename/invalid transient rejection, Escape,
  and a stateful parent rerender that proves the 120-code-point Unicode boundary,
  surrounding-whitespace trim, blank/over-120 blur and Enter restoring the visible
  latest committed value with no patch, Escape restore, and stale-draft invalidation,
  remove-slot cleanup, exact active slot arm, and shared minimum/maximum UI: the last
  tab cannot be removed or lose its slot, and no 25th tab or orphan slot can be
  created. The same suite pins the Inspector's builder handoff: two valid maximum-
  length block/prop-path tuples produce distinct canonical IDs of at most 120
  characters through `createScreenFieldBinding`.
- `custom-screen-image-inspector.test.tsx`: the image control imports/uses the
  canonical Screen wrapper and rejects protocol-relative and backslash-confused UI
  input before patching the document.

`core/services/customScreens/screenDocumentOps.ts` and
`tests/vitest/customScreens/screenDocumentOps.test.ts` remain read-only in this leaf.
The Inspector is the physical UI owner; R01 alone owns the corrective document-op
builder handoff and its regression.

The end-to-end palette bind→clear→rebind flow runs after TASK-540-04-L04 wires the
sentinel in the parent editor; TASK-540-06 owns that aggregate addition. This leaf must
update and pass its named test before its source gate.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/custom-screen-binding-panel.test.tsx \
  tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx
node _docs/_workflows/task-540-implement.mjs --check-task-family-line-limit
```

Run each Vitest file independently first (15/15 binding-panel and 18/18 image-inspector),
then together for 33/33. Rerun any named failure once in isolation. Count complete
physical files from the family baseline, including both modified test files, blanks/
comments, and a final unterminated line; every result must be at most 1,000. No route,
DB, or runtime Bun change. The orchestrator's `runLeafGate` performs the same byte-based
check over this leaf's exact `allowedFiles` before and after commands; the displayed
global command is the final cross-family assertion and is expected to pass only after
all parallel modularity owners land.

## Completion

Implemented Button `href` binding and its exact clear sentinel, Link-only action
authoring, deterministic slot-locked Tabs controls, buffered Unicode-aware label
editing, exact slot arming, and the canonical Screen media-URL wrapper. The historical
Unicode/React-state correction and its 31/31 gate remain valid evidence. The current
2026-07-16 domain-builder consumer and visible invalid-label restore corrections were
revalidated by the historical exact 33/33 gate above; the modular split still requires
the fresh independent/combined 33/33 gate, line counts, and replacement
`Modularity Repair Revalidated` receipt. No new post-audit or smoke is claimed.
Aggregate persistence and live browser flows remain closure-owned.
