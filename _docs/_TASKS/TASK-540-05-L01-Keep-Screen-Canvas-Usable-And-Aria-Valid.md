# TASK-540-05-L01: Keep Screen Canvas Usable and ARIA-Valid

# FileName: TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** Custom Screens / Responsive UI / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-540-04-L04
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Fix Started:** 2026-07-18
**Implementation Complete:** 2026-07-19 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Historical Boundary Revalidation:** generation eeb29960e5784a47ad38fb056c30d9a8 / token cabb94f2a2894d9fa5130e6256ae6442 / gate green
**Revalidation Passed:** 2026-07-19 — evidence-backed manual checkpoint receipt for the current L01 compatibility owner gate after L04: core lint/types and root TypeScript checks; authoring-boundary isolation 7/7; insertion-targeting isolation 10/10; exact four-file owner matrix 29/29; full-family physical-line, prepared-resume, and diff checks. This is not a transition-generated generation/token or hash receipt and claims no clean family post-audit, full validation, smoke, changelog, or closure result.
**Current Insertion Compatibility Evidence:** 2026-07-19 — commit `7a393dcc7aaf454fee582ce7745073768e0e131b` reopens the one-shot Insert palette before the existing second insertion assertion after `ScreenAuthoringCanvas` begins inspecting a newly inserted block. The insertion target and ordering assertions remain unchanged, and commit `204fd1de0f129f73976f577f420acbdac5316dea` assigns the test exclusively to this leaf.
**Current Insertion Receipt State:** The exact L01 compatibility owner gate passed on 2026-07-19 after L04 and commit `7a393dcc7aaf454fee582ce7745073768e0e131b`; the current `Revalidation Passed` field above is the sole active owner-gate receipt. It claims no clean family post-audit, full validation, smoke, changelog, or closure result.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Repair Reason:** Final post-audit confirmed every production caller supplies a panel label but the shared prop remained optional, allowing an unnamed `region` landmark for future callers. The semantic shell now requires `panelAriaLabel: string`. A later post-audit also proved caller-supplied `panelDataProps` could override the shell's canonical `role` and accessible name because the spread came last; the semantic attributes now take final precedence while caller `data-*` hooks and refs remain intact. The same re-gate corrected a stale boundary-test edge: `CustomScreenEntryRouteSession` consumes presentation media through `useScreenEntryPresentationMedia`, while only that hook imports the pure media owner, exactly as TASK-540-04-L03 specifies.
**Historical Under-Load Gate:** 2026-07-17 — two 64-file TASK-540 runs established that the Entry Editor AST/import boundary needed its local bounded 15-second timeout under load. This receipt is not current final-byte evidence: a later isolated rerun exposed a stale direct Session→media-owner edge expectation (6/7 isolated, 18/19 owner matrix) even though the production graph correctly followed TASK-540-04-L03 through the media hook. The expectation is now corrected without adding a dummy production import; the fresh exact `Revalidation Passed` receipt after the current repair is the sole owner-gate authority. No assertion weakening, production import change, or timeout widening belongs to this repair.
**Historical Targeted Gate:** 2026-07-14 — `core lint:types`, `core lint`, root `tsc`, and the exact three-file Vitest matrix (16/16)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx`
- `core/admin/ui/shared/CanvasEditor.tsx` only for the semantic panel role
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx`,
  `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`, and, only for the shared
  role assertion, `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`
- `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` only for the
  compatibility step that reopens the Insert panel before its second one-shot insertion
  assertion after `ScreenAuthoringCanvas` began selecting and inspecting newly inserted
  blocks; the insertion target and ordering assertions remain unchanged

The boundary suite must inspect the stable wrapper plus
`CustomScreenEntryRouteSession.tsx`, `CustomScreenEntryEditorLayout.tsx`,
`CustomScreenEntryPresentationPanel.tsx`, `customScreenEntryRuntime.ts`,
`customScreenEntryPresentation.ts`, `customScreenEntryPresentationMedia.ts`,
`hooks/useScreenEntryHydration.ts`, and `hooks/useScreenEntryPresentationMedia.ts`.
It keeps the same forbidden Page-builder and retained-widget import rules for every
path. This is an additive ownership handoff only; L01 must not edit L03 production files.
For those paths it preserves the existing Page-builder/retained-widget exclusions and
adds split-specific checks: the wrapper may import only the route session and owning
pure modules for route-key construction and compatibility re-exports, plus the existing
external React/admin-router/route-parameter helpers; no extracted module imports the wrapper;
hooks do not import view/session modules; views do not import hooks/clients; and the
three pure modules import neither React nor `customScreensClient.ts`, `mediaClient.ts`,
or `SchemaBuilder.tsx`. The structural suite also source-pins the wrapper's exact 18
pre-split value/type exports named in TASK-540-04-L03, so moving direct tests to the
owners cannot conceal a missing compatibility export.
The exact Entry graph keeps `CustomScreenEntryRouteSession ->
hooks/useScreenEntryPresentationMedia -> customScreenEntryPresentationMedia`; requiring
a second direct Session-to-media-owner edge is stale test drift and must not be satisfied
with a dummy production import.

It must also inspect the stable `CustomScreenEditorPage.tsx` facade plus
`customScreenEditorModel.ts`, `hooks/useCustomScreenEditorPersistence.ts`,
`hooks/useCustomScreenDocumentActions.ts`, `CustomScreenEditorPreviewOwner.tsx`,
`CustomScreenEditorSettingsPanel.tsx`, `CustomScreenEditorLayout.tsx`, and
`CustomScreenEditorRouteSession.tsx`. Preserve the same forbidden Page-builder and
retained-widget exclusions on all eight paths. Enforce L04's exact facade→session/model,
session→model/hooks/views, hooks→model, and layout→settings direction; forbid reverse
edges, hook-to-hook imports, settings/layout→hook/client imports, and every import of the
facade by an extracted module. `CustomScreenEditorPreviewOwner.tsx` may import only its
existing `useCustomScreenPreviewRecordState` read hook at the view boundary; it may not
import mutation/cache clients or either new persistence/action hook.
`customScreenEditorModel.ts` must import neither React, admin
clients/cache bus, DB/server/runtime code, UI components, nor `Bun.*`. Source-pin the
facade's exact five compatibility helper re-exports named in TASK-540-04-L04; `export *`
or an accidentally widened surface fails.

Together the boundary matrix contains exactly 17 production paths: nine Entry modules
and eight Screen Builder modules. The touched-history baseline is `e5f15a567`; staging
or committing intermediate work cannot narrow the set. A path omitted because it is
thin, pure, a facade, or already committed is a failed boundary gate, not a LOW or
TASK-9999 deferral. L01 may edit only its boundary test, never either source family.
This additive update creates no test target; the reconciled family total remains exactly
64 Vitest + 18 Bun = 82 files (81 source-owner/read-only dependency targets plus one
closure-owned aggregate target), with pinned changelog 1252 unchanged.

TASK-542 separately owns Menu host clearance. Do not add Menu/Page special cases
to the shared shell and do not edit Page-owned TASK-478/481/539 files.

## Historical pre-implementation grounded anchors

These 2026-07-14 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named symbols and regression suites in this contract rather than mutable line numbers.

- Screen canvas fixed reserve: `ScreenAuthoringCanvas.tsx:491-523`; the shipped
  responsive scroller is `ScreenAuthoringCanvas.tsx:528-536`, with the base
  `p-6 lg:p-8` gutters at `:530` and the conditional `lg:pr-[332px]` at `:531`.
- Responsive panel width already exists:
  `CanvasEditor.tsx:88-97` (`w-[min(280px,calc(100%-2rem))]`).
- Label without role: `CanvasEditor.tsx:143-153`; the shipped named-region panel is
  `CanvasEditor.tsx:146-152`, where `{...panelDataProps}` at `:147` precedes the
  shell-owned `ref` at `:148`, `role="region"` at `:149`, `PANEL_POSITION_CLASS` at
  `:150`, and `aria-label={panelAriaLabel}` at `:151`. That spread-then-semantics
  ordering is the fail-closed guarantee, so pin it by those symbols, not by prose.

## Implementation Pseudocode

```tsx
// ScreenAuthoringCanvas: replace inline paddingRight:300.
<div
  data-screen-canvas-panel-open={panelOpen ? "true" : undefined}
  className={cn(
    // Preserve the existing p-6 lg:p-8 base gutters.
    "min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8",
    panelOpen && "lg:pr-[332px]" // 32 px base + 300 px wide-only reserve
  )}
/>

// CanvasEditor panel container
<div
  {...panelDataProps}
  ref={panelRef}
  role="region"
  aria-label={panelAriaLabel}
  className={PANEL_POSITION_CLASS[...]}
/>
```

```ts
// custom-screen-authoring-boundary.test.ts — additive after L03 then L04 gates.
const entryModules = [
  "CustomScreenEntryEditor.tsx",
  "CustomScreenEntryRouteSession.tsx",
  "CustomScreenEntryEditorLayout.tsx",
  "CustomScreenEntryPresentationPanel.tsx",
  "customScreenEntryRuntime.ts",
  "customScreenEntryPresentation.ts",
  "customScreenEntryPresentationMedia.ts",
  "hooks/useScreenEntryHydration.ts",
  "hooks/useScreenEntryPresentationMedia.ts",
] as const;
const builderModules = [
  "CustomScreenEditorPage.tsx",
  "customScreenEditorModel.ts",
  "hooks/useCustomScreenEditorPersistence.ts",
  "hooks/useCustomScreenDocumentActions.ts",
  "CustomScreenEditorPreviewOwner.tsx",
  "CustomScreenEditorSettingsPanel.tsx",
  "CustomScreenEditorLayout.tsx",
  "CustomScreenEditorRouteSession.tsx",
] as const;

expect(new Set([...entryModules, ...builderModules])).toHaveLength(17);
for (const file of [...entryModules, ...builderModules]) {
  const source = readAuthoringSource(file);
  expect(source).toRejectForbiddenPageBuilderAndWidgetImports();
}
expect(relativeImportGraph([...entryModules, ...builderModules])).toBeAcyclic();
expectEntryEdgesToMatchL03Contract();
expectBuilderEdgesToMatchL04Contract();
expectPureOwnersToRejectReactClientsUiRuntimeAndBun();
expectEntryFacadeToExposeExactly18CompatibilityNamesWithoutExportStar();
expectBuilderFacadeToExposeExactly5CompatibilityNamesWithoutExportStar();
```

The import parser resolves `./x`, `../x`, alias imports, extensionless TS/TSX paths, and
`index` candidates to canonical repo-relative files before checking edges/cycles. Text
search alone is insufficient: comments and type-only imports cannot hide an actual
forbidden dependency, and an empty parse result for one of the 17 files is a failure.

The `lg` breakpoint is final and the existing base padding is part of the contract:

- at 320/390/480 CSS px, both open and closed scrollers have computed
  `padding-left:24px` and `padding-right:24px`;
- at 1024 CSS px and above, both states retain `padding-left:32px`, the closed
  scroller has `padding-right:32px`, and the open scroller has
  `padding-right:332px`;
- the scroller border-box width and left edge do not change when the panel opens;
  therefore the wide content-box width decreases by exactly 300 CSS px (within
  1 CSS px), while narrow content-box geometry is unchanged;
- at 320/390/480 the scroller border-box equals its host width within 1 CSS px,
  its content box remains wider than 0 px, and the panel bounding box stays
  inside the viewport; at 1024 and 1280 the panel also stays inside the viewport.

Evidence split for the two `padding-left` clauses: the browser geometry sample carries
only `paddingRight`
(`_docs/_workflows/task-540-smoke/contract/visible-assertion-schemas.mjs:56-66`,
`_docs/_workflows/task-540-smoke/contract/metadata.mjs:419-427`), so
`narrow-padding-and-positive-geometry` asserts the computed `24px` right padding and
positive narrow content width
(`_docs/_workflows/task-540-smoke/contract/visible-assertion-predicates.mjs:523-570`),
`wide-padding-delta-300` asserts `32px`/`332px` plus the 300 ± 1 CSS px content-box delta
(`:571-616`), and `panel-inside-viewport` covers all five open widths (`:617-627`). Both
`padding-left` halves stay pinned structurally by the exact base-class assertion in
`tests/vitest/ui/custom-screen-authoring-boundary.test.ts:483-486`.

Do not replace the base `p-6 lg:p-8`, change the breakpoint after smoke, add a
resize listener, or use effect-driven viewport state. Keep panel width/max-height
and reopen control unchanged.

## Error/compatibility flow

No async/error path. Closed and narrow computed gutters remain equivalent to the
current `p-6 lg:p-8` layout; only the wide open state gains the 300 px reserve.
Caller `panelDataProps` are spread before the shell-owned ref, `role="region"`, class,
and `aria-label`, so hostile or accidental semantic overrides fail closed while
existing panel `data-*` hooks, forwarded ref behavior, and drag/drop behavior stay.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- Structural test rejects inline `paddingRight:300`, preserves `p-6 lg:p-8`, and
  pins the conditional `lg:pr-[332px]` class.
- UI render supplies hostile `role`/`aria-label` values through `panelDataProps` and
  asserts the shell still exposes its canonical named `region`, retains the caller's
  `data-*` hook, and assigns the forwarded panel ref.
- Boundary coverage enumerates all 17 Entry Editor and Screen Builder production files
  after the sequential L03 then L04 splits, rejects every forbidden
  Page-builder/widget/import-direction/cycle edge, enforces pure-owner restrictions, and
  pins both exact wrapper compatibility surfaces; checking only either thin public
  facade is a failed handoff.
- Browser smoke asserts computed padding plus border/content/panel geometry for
  open and closed states at 320/390/480/1024/1280.

Update the named structural/component expectations before this source gate.
TASK-540-06 owns real-browser aggregation but must not re-baseline these assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx
bunx vitest run tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx \
  tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx
./node_modules/.bin/tsc -p tsconfig.json --noEmit
lines="$(awk 'END { print NR }' tests/vitest/ui/custom-screen-authoring-boundary.test.ts)"
if [ "$lines" -gt 1000 ]; then
  echo "custom-screen-authoring-boundary.test.ts exceeds 1000 physical lines: $lines" >&2
  exit 1
fi
```

The insertion-targeting isolation must pass exactly 10/10 tests before the exact
four-file combined matrix passes 29/29 tests.
The semantic role belongs to the shared shell, so the adjacent component suite is part
of the same mandatory source gate above.
Run this additive boundary update only after the L03 and L04 source/test gates pass. A
later edit to either production split invalidates this receipt and requires the complete
17-path boundary suite again before post-audit/closure.
Rerun any named failing test file once in isolation before classifying the failure.
