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
**Repair Started:** 2026-07-16
**Fix Started:** 2026-07-18
**Implementation Complete:** 2026-07-18 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Revalidation Passed:** generation 901f3d0de7774955ba401e69e85ddd31 / token 239a28062f734c28a6927f1cc49b5bd9 / gate green
**Repair Reason:** R01 centralized binding-ID generation in `buildScreenFieldBindingId`; this leaf consumes that domain helper from its existing Inspector binding factory and proves maximum-length tuples stay distinct and bounded. The current repair also restores invalid Tab-label drafts, preserves focus on the same commit-stable input after Enter while using `baseLabel` for stale-draft invalidation, restores the committed value when the host rejects the patch, creates collision-free default labels, clears bindings for every nested block removed with a Tab slot, invalidates stale Image URL drafts, and gives every Inspector select/number control a distinct accessible name. The unbound trigger exposes the named `Not bound` placeholder instead of falling through to an unauthored first option.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Current Repair State:** The historical 33/33 modularity receipt remains truthful pre-current-repair evidence. The current production graph is facade 564, model 209, controls 238, Tabs 214, and Section 80 lines; the two tests are 974 and 443, plus a cohesive 194-line shared Inspector test harness. The current repair uses a 19+18 targeted gate; the exact active metadata receipt above is the sole authority for its gate state, and no clean family post-audit, smoke, changelog, or closure is claimed.
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- the stable `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` facade plus
  `screenBlockInspectorModel.ts`, `ScreenBlockInspectorControls.tsx`,
  `ScreenBlockInspectorTabs.tsx`, and `ScreenBlockInspectorSection.tsx`
- compatibility updates required by this source gate in
  `tests/vitest/ui/custom-screen-binding-panel.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx`, and the cohesive
  shared mount/interaction helpers in
  `tests/vitest/ui/support/screenBlockInspectorTestHarness.tsx`

Do not edit the palette/factory, schema, renderer, shared controls, or the parent editor
page. Update the named behavior test before this leaf's gate; TASK-540-06 owns only
later aggregate additions.

`customScreenSchemas.ts`, `screenDocumentOps.ts`, and
`tests/vitest/customScreens/screenDocumentOps.test.ts` remain R01-owned. This leaf owns
only the Inspector import/call sites that consume `buildScreenFieldBindingId` and
`collectScreenBlockIds`; it must not duplicate, alter, or re-export either domain
helper.

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
| `ScreenBlockInspectorControls.tsx` | reusable `InspectorRow`, bound-field/enum/box-spacing rows, clear affordance, accessible trigger names, and block/commit-aware Image URL draft; no Tabs draft or section state | `<=320` |
| `ScreenBlockInspectorTabs.tsx` | `nextTabId`, Unicode code-point length, `ScreenTabLabelDraft`, `TabLabelInput`, and `TabsEditor`, including add/remove/arm/commit/restore behavior plus recursive removed-slot traversal through the read-only `collectScreenBlockIds` domain helper | `<=280` |
| `ScreenBlockInspectorSection.tsx` | section-column options and the exported `ScreenSectionInspector`; consumes model patch helpers and shared controls | `<=360` |
| `ScreenBlockInspector.tsx` | block-kind orchestration and explicit compatibility re-exports only; imports the focused owners and retains the exported `ScreenBlockInspector` component | `<=700` |

The acyclic import graph is:

```text
customScreenSchemas -> screenBlockInspectorModel
screenDocumentOps -> ScreenBlockInspectorTabs
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
image URL fail-closed behavior, exported reference identity, and distinct non-empty
accessible names for every Inspector enum/select trigger and numeric input.

The current repair makes `ScreenTabLabelDraft.baseLabel` behavior-owning state in
`ScreenBlockInspectorTabs.tsx`. Keep the input keyed only by `block.id:tab.id` so an
Enter commit does not remount or drop keyboard focus, then compare
`draft.baseLabel !== tab.label` to reset a stale draft when a later committed value
arrives. This new read disproves the deferred cleanup premise: TASK-9999-01-L02 is
re-triaged on 2026-07-18 and `⏭️ Superseded` by this active leaf. Do not implement
that historical removal contract; doing so would regress visible focus and stale-draft
behavior.

No modularity blocker is eligible for TASK-9999: leaving a touched source above 1,000
would violate a hard verification gate. Any behavior/assertion drift discovered during
the split is likewise repaired here according to its actual impact, never hidden as a
line-limit LOW.

Land in this exact order: `screenBlockInspectorModel.ts`,
`ScreenBlockInspectorControls.tsx`, `ScreenBlockInspectorTabs.tsx`,
`ScreenBlockInspectorSection.tsx`, then the stable `ScreenBlockInspector.tsx` facade.
After the source gate, run the two test files independently and combined, verify the
TASK-9999 supersession records, then run the targeted static/test/line gate before
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
// Its value precedence is exact binding -> authored block.data.field -> empty string.
// Empty renders the named "Not bound" placeholder; it never falls through to the first
// eligible option, which creates a binding only when the user selects it.

// EnumRow defaults accessibleName to its visible label. Callers with repeated visible
// labels, such as Heading Align and block-layout Align, pass distinct domain names.

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
// Import collectScreenBlockIds from screenDocumentOps; do not mirror or re-export it.
// Each tab row has a real "Edit content" button which arms that exact slot.
// Add uses nextTabId() plus a collision scan over existing labels, creates
// slots[nextId]=[], and arms it.
// Disable Add at SCREEN_TABS_MAX and keep the draft unchanged at the cap.
// Rename keeps local draft text keyed by block+tab plus the committed label on which
// that draft was based. Do NOT use native maxLength=SCREEN_TAB_LABEL_MAX: HTML counts
// raw UTF-16 units while the schema counts post-trim Unicode code points. Blur/Enter
// commits only draft.trim() when non-empty and Array.from(trimmed).length is <= the
// shared SCREEN_TAB_LABEL_MAX. On blur or Enter, invalid transient text immediately
// restores the visible input to the latest committed label and never calls onPatchBlock.
// Keep the input key commit-stable at block+tab identity so a valid Enter commit retains
// focus. Read draft.baseLabel during render: a parent prop refresh invalidates a draft
// based on an older committed label, and Escape restores that same latest value.
// Immediately restore the current committed value after dispatching onCommit so a host
// that drops/rejects the patch cannot leave phantom optimistic text behind.
// ID/slot identity stays stable.
// Remove is disabled/hidden when tabs.length <= SCREEN_TABS_MIN. Its event handler
// also returns the original draft at that boundary. Otherwise it deletes exactly its
// slot, clears bindings for every nested block in the deleted slot subtree through the
// existing empty-field sentinel, leaves surviving-slot bindings untouched, and arms the
// nearest remaining tab.

// ImageSrcRow buffers {blockId, baseSrc, acceptedSrc, value}. Retain that draft only
// while the same block still exposes baseSrc or acknowledges acceptedSrc; otherwise
// reset to the newly committed source. It completes TASK-540-01's compatibility handoff:
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

1. Inspector calls the existing `onPatchBinding`; the editor owns draft state. An
   unbound row has the programmatic name `Bound field` and the visible `Not bound`
   placeholder. Selecting its first eligible option emits the normal binding patch;
   merely rendering the row emits nothing.
2. Save sends the same V4 definition; TASK-540-01 validates it.
3. The visible `Use static link` affordance emits `{field:""}` for only the matching
   `href` binding. TASK-540-04-L04 owns the parent handler that consumes this sentinel
   by removing exactly that binding; the sentinel is never stored. Static href data and
   every other binding are preserved. The Button branch is the only caller that passes
   the optional clear affordance; header, field, heading, image, and related-list rows
   omit it and therefore gain neither link-specific copy nor a clear action.
4. Invalid legacy data is never fabricated in UI. An Image draft is retained only for
   its originating block and either its base committed source or acknowledgement of its
   own sanitized write; a block switch or unrelated committed-source refresh restores
   current data. Server errors remain visible through the existing editor save surface.
5. The armed tab identity is host-owned: “Edit content”, add, and remove call
   `onArmSlotInsert(block.id, tabId)`. The Inspector never keeps a second active-tab
   state. TASK-540-03 derives the builder's visible active panel from this same
   `insertPoint` and tab activation writes the same slot-end target.
6. A successful Tab removal calls R01's read-only `collectScreenBlockIds` helper for
   the deleted slot, then emits the existing `{field:""}` sentinel for bindings
   targeting that recursive subtree only. The same gesture preserves bindings from
   surviving slots; the minimum-tab guard performs no document or binding mutation.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `custom-screen-binding-panel.test.tsx`: eligible-field filtering and Link-only
  action UI; pass the real `block` prop and assert the named clear affordance emits the
  exact empty-field sentinel only for an existing href binding, and assert unrelated
  binding-row consumers do not render `Use static link`. Assert the exact
  binding → authored `data.field` → empty-placeholder precedence, the `Bound field`
  accessible name, visible `Not bound` placeholder, and selection of the first eligible
  option from the empty state. Enumerate the rendered combobox names and prove both
  visible `Align` rows have distinct names, while `Insert into` and section gap remain
  programmatically named. The same suite owns
  deterministic tab ID, buffered valid rename/invalid transient rejection, Escape,
  and a stateful parent rerender that proves the 120-code-point Unicode boundary,
  surrounding-whitespace trim, blank/over-120 blur and Enter restoring the visible
  latest committed value with no patch, Escape restore, and stale-draft invalidation,
  focus preservation after a valid Enter commit, immediate committed-value restoration
  when a host drops that patch, collision-free generated labels after remove→add,
  remove-slot cleanup plus nested binding GC, exact active slot arm, and shared
  minimum/maximum UI: the last
  tab cannot be removed or lose its slot, and no 25th tab or orphan slot can be
  created. The same suite pins the Inspector's builder handoff: two valid maximum-
  length block/prop-path tuples produce distinct canonical IDs of at most 120
  characters through `createScreenFieldBinding`.
- `custom-screen-image-inspector.test.tsx`: the image control imports/uses the
  canonical Screen wrapper and rejects protocol-relative and backslash-confused UI
  input before patching the document. Its stateful regression proves a draft may survive
  acknowledgement of its own sanitized write but resets across block identity and
  unrelated committed-source changes; the suite also pins non-empty distinct combobox
  names for the image surface.

`core/services/customScreens/screenDocumentOps.ts` and
`tests/vitest/customScreens/screenDocumentOps.test.ts` remain read-only in this leaf.
The Inspector is the physical UI owner; R01 alone owns the corrective document-op
builder handoff and its regression.

The end-to-end palette bind→clear→rebind flow runs after TASK-540-04-L04 wires the
sentinel in the parent editor; TASK-540-06 owns that aggregate addition. This leaf must
update and pass its named tests before its source gate, including
`the unbound Button binding row stays named and selectable from its first option`.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/custom-screen-binding-panel.test.tsx \
  tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx
node _docs/_workflows/task-540-implement.mjs --check-screen-tab-label-draft-contract
node _docs/_workflows/task-540-implement.mjs --check-task-family-line-limit
```

Run each Vitest file independently first (19 binding-panel and 18 image-inspector tests),
then together for 37. Rerun any named failure once in isolation. Count complete
physical files from the family baseline, including both modified test files and the
shared Inspector harness, blanks/comments, and a final unterminated line; every result
must be at most 1,000. No route,
DB, or runtime Bun change. The orchestrator's `runLeafGate` performs the same byte-based
check over this leaf's exact `allowedFiles` before and after commands; the displayed
global command is the final cross-family assertion and is expected to pass only after
all parallel modularity owners land.

## Completion

Implemented Button `href` binding and its exact clear sentinel, Link-only action
authoring, deterministic slot-locked Tabs controls, buffered Unicode-aware label
editing, exact slot arming, and the canonical Screen media-URL wrapper. The historical
Unicode/React-state correction and its 31/31 gate remain valid evidence. The 2026-07-16
domain-builder consumer and visible invalid-label restore corrections remain intact.
The historical modular split passed its then-current 15/15 and 18/18 tests, combined
33/33, additional consumer 16/16, exact line/export/import checks, and static gates. The
current focus-preserving, rejected-commit, collision-free-label, nested-binding-GC,
Image-draft, and accessible-name repair keeps the targeted matrix at 19+18 tests while
moving cohesive mount/interaction helpers into a 194-line support module. The exact
active metadata receipt above is the sole authority for its gate state.
TASK-9999-01-L02 is superseded by this active behavior owner; no family post-audit or
smoke is claimed.
Aggregate persistence and live browser flows remain closure-owned.
