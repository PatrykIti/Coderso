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
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Modularity Repair Pending:** 2026-07-17 — TASK-540-04-L03 and L04 add fifteen production modules behind the stable Entry and Screen Builder facades. This leaf remains the sole writer of `custom-screen-authoring-boundary.test.ts` and must extend that check to all seventeen final authoring production paths after both source gates, then record a fresh exact gate receipt. The historical receipt below validates neither extracted family.
**Repair Reason:** Final post-audit confirmed every production caller supplies a panel label but the shared prop remained optional, allowing an unnamed `region` landmark for future callers. The semantic shell now requires `panelAriaLabel: string`; all existing named-region behavior remains unchanged.
**Revalidation Passed:** 2026-07-16 — validated against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` with dirty owner paths `core/admin/ui/shared/CanvasEditor.tsx` and `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`: `core lint:types`, `core lint`, root `tsc`, the exact three-file Vitest matrix 16/16, and `git diff --check` passed. No full-suite, smoke, changelog, or closure result is claimed.
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

- Screen canvas fixed reserve: `ScreenAuthoringCanvas.tsx:491-523`.
- Responsive panel width already exists:
  `CanvasEditor.tsx:88-97` (`w-[min(280px,calc(100%-2rem))]`).
- Label without role: `CanvasEditor.tsx:143-153`.

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

Do not replace the base `p-6 lg:p-8`, change the breakpoint after smoke, add a
resize listener, or use effect-driven viewport state. Keep panel width/max-height
and reopen control unchanged.

## Error/compatibility flow

No async/error path. Closed and narrow computed gutters remain equivalent to the
current `p-6 lg:p-8` layout; only the wide open state gains the 300 px reserve.
Existing panel `data-*` hooks and drag/drop behavior stay.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- Structural test rejects inline `paddingRight:300`, preserves `p-6 lg:p-8`, and
  pins the conditional `lg:pr-[332px]` class.
- UI render asserts `role=region` plus accessible name.
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
bunx vitest run tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx \
  tests/vitest/ui/custom-screen-authoring-boundary.test.ts \
  tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx
./node_modules/.bin/tsc -p tsconfig.json --noEmit
lines="$(awk 'END { print NR }' tests/vitest/ui/custom-screen-authoring-boundary.test.ts)"
if [ "$lines" -gt 1000 ]; then
  echo "custom-screen-authoring-boundary.test.ts exceeds 1000 physical lines: $lines" >&2
  exit 1
fi
```

The semantic role belongs to the shared shell, so the adjacent component suite is part
of the same mandatory source gate above.
Run this additive boundary update only after the L03 and L04 source/test gates pass. A
later edit to either production split invalidates this receipt and requires the complete
17-path boundary suite again before post-audit/closure.
Rerun any named failing test file once in isolation before classifying the failure.
