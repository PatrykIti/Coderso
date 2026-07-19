# TASK-540-03-L01: Functional Tabs and No Nested-Interactive Space Trap

# FileName: TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-03
**Priority:** High
**Category:** Custom Screens / Runtime UI / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Started:** 2026-07-16
**Repair Reason:** The defensive zero-item Tabs branch rendered an empty `tablist` with no usable tab. R03 owns the accessible fail-safe renderer state: no empty tablist/tab/panel and visible exact `role="status"` text `No tabs available.`.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Post-Audit Fixture Integrity Repair:** 2026-07-17 — the subsequent five-lens post-audit stopped before full validation and smoke after proving the extracted renderer harness had replaced the pre-split compile-time fixture annotations with `as` and `as unknown as` assertions. The shared `fields`, `headingBlock`, `headingBinding`, and `staticImageBlock` fixtures again use direct production-contract annotations with unchanged values and exports. The same scoped documentation correction now maps the production and test/support line-count receipts to their declared land orders.
**Post-Audit Fixture Integrity Revalidated:** 2026-07-17 — core lint/types, root `tsc`, the four independent renderer partitions 22/22 + 13/13 + 24/24 + 13/13, the exact six-file dependency-shaped gate 89/89, the unchanged 72-name/67-declaration fingerprint, the family physical-line gate, and `git diff --check` passed. No repository-wide test, clean five-lens rerun, live smoke, changelog, or closure result is claimed.
**Post-Audit Fixture Immutability Repair:** 2026-07-17 — a fresh scoped audit found that removing the unsafe fixture assertions had also removed the harness's shallow runtime freezes, making shared module fixtures mutable across suites. The directly annotated fields array and each field, heading block and data, heading binding, and static image block and data are again frozen without `as`, `satisfies`, or a TypeScript suppression.
**Post-Audit Fixture Immutability Revalidated:** 2026-07-17 — freeze depth and fixture bytes match the prior stateless-harness contract; the exact six-file gate passed 89/89 with unchanged 72-name/67-declaration fingerprints, core/root static checks, Prettier, the family line gate, full diff check, and a fresh read-only audit with 0 HIGH/MEDIUM/LOW findings passed. No repository-wide test, clean five-lens rerun, live smoke, changelog, or closure result is claimed.
**Current Repair State:** The accessible/URL/media behavior repair and cohesive split are implemented. All seven production paths, five renderer-test split paths, and the touched record-interaction/image-source dependency paths passed line, static, exact-count, code-drift, and cross-contract gates. The current modularity receipt covers this targeted owner gate; full family post-audit and runtime smoke remain later closure gates.
**Revalidation Passed:** 2026-07-16 — historical pre-modularity evidence: `core lint:types`, `core lint`, the exact renderer/interaction/image Vitest matrix (89/89), and `git diff --check` independently passed on the then-final shared source. This receipt does not validate extracted modules and claims no new post-audit, live smoke, changelog, or closure result.
**Historical Corrective Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the then-current exact renderer/interaction/image Vitest matrix (89/89), and `git diff --check`
**Historical Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings for the five-value final Button/Image DOM-sink regression matrix
**Fix Started:** 2026-07-14
**Fix Reason:** Final closure audit requires explicit Button and Image final-sink regressions for TAB/LF/CR protocol-relative confusion and the remaining ASCII-control boundary.
**Prior Corrective Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, the exact renderer/interaction/image Vitest matrix (83/83), and `git diff --check`, before the control-character corpus was added
**Prior Corrective Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings on the Tabs/selection-corrected working tree before the control-character corpus was added
**Previous Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, and the exact renderer/interaction/image Vitest matrix (83/83)
**Previous Completion:** 2026-07-14
**Reopened:** 2026-07-14 (final URL-sink control-character regressions)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- the stable `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` facade plus
  `screenRuntimeRendererModel.ts`, `useScreenRuntimeInteractions.ts`,
  `ScreenRuntimeBlockFrame.tsx`, `ScreenRuntimeLeafBlocks.tsx`,
  `ScreenRuntimeContainerBlocks.tsx`, and `ScreenRuntimeSectionList.tsx`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-runtime-presentation.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-runtime-layout.test.tsx`,
  `tests/vitest/ui-integration/support/customScreenRuntimeRendererHarness.tsx`,
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`

For the historical 2026-07-14 R03 correction, R03 wrote only
`tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx`. It consumes the
R01 Screen wrapper read-only and adds final DOM-sink regressions; it need not edit
`ScreenRuntimeRenderer.tsx` when the wrapper fix alone makes the existing renderer fail
closed. `custom-screen-record-interactions.test.tsx` and
`screen-document-image-src.test.ts` remain read-only prerequisites in this gate.

That historical correction remains landed and gated. This leaf is now the current R03
repair owner only for the accessible zero-item Tabs branch and its renderer regression;
the current exact 89/89 gate plus lint/typecheck/diff passed independently. It remains
`🚧 In Progress` with `Implementation Complete` because canonical `✅ Done` awaits family
changelog 1252. At the time of this R03 repair, L03's attempted import-only diff had been
reverted and its older cache/entry receipt was historical. The later final sequential
post-audit separately reopened L03 for the single-versus-multiple media override
contract; that later L03 receipt does not change this renderer owner's 89/89 evidence.

### Pending 2026-07-19 shared-selector consumer correction

Canonical workflow must reopen and gate R01 first. Only after R01 exports
`firstScreenMediaAssetUuid` from the Bun-free
`core/services/customScreens/screenMediaIdentity.ts` owner may R03:

1. import `firstScreenMediaAssetUuid` directly into `ScreenRuntimeLeafBlocks.tsx`;
2. remove the renderer-local `firstMediaAssetUuid` implementation and its model export;
3. import `isScreenMediaAssetUuid` directly into `screenRuntimeRendererModel.ts` from
   the same domain owner; and
4. run the existing `bound direct image uses the first valid UUID in an array and fails
   closed for malformed, empty, missing, and unsafe values` declaration unchanged as
   the scalar/array byte-preservation regression.

The selected UUID must retain its exact input casing and bytes. Invalid scalars,
non-arrays, and arrays without a valid UUID return `null`; no URL, empty value, or later
fallback becomes eligible. R03 does not edit `screenMediaIdentity.ts`, L03 modules, task
status fields, or the protected test-name inventory. Its four suite counts remain
22+13+24+13, and the exact 89-test gate must pass before L03 starts. This is executable
repair scope, not a new completion receipt.

Do not edit `InlineEditWrapper.tsx`, `CustomScreenEntryCanvas.tsx`, schemas,
inspector, or shared selection helpers. Fix the ancestor semantics at the owning
renderer and update the named behavior expectations before its gate.

## Mandatory renderer source split

Touched-file scope is measured from verified family baseline `e5f15a567` through the
final working tree. Staging and intermediate commits do not reset it. Verified
baseline→pre-split counts were Renderer 1,822→1,983, renderer suite 1,536→2,415,
record-interactions suite 607→657, and image-source suite 119→232. All original and new
paths remain in the byte-based final gate. The completed production split has final
line counts 395/188/177/635/420/284/1 in declared owner order. The existing
`ScreenRuntimeRenderer.tsx` import remains stable and exposes the exact same
`ScreenRuntimeRenderer` function reference; the facade may not use `export *`, wrap the
component, or introduce import-time side effects.

| Owner | Sole responsibility | Post-format budget |
|---|---|---:|
| `screenRuntimeRendererModel.ts` | renderer props/context types, system-field maps, presentation/style maps, value/text/stat/time/media helpers, selection-origin predicate, tab ancestry/index helpers, and insert-target equality; pure and state-free | `<=450` |
| `useScreenRuntimeInteractions.ts` | one renderer-root ref/`useId` namespace, local tab state, builder slot derivation, activation, root-scoped focus transfer, roving-key handling, and selection/drag callbacks | `<=350` |
| `ScreenRuntimeBlockFrame.tsx` | passive block frame, selection handle, drag handle, selection ring, metadata badges, style/class composition, and before/after drop targets | `<=350` |
| `ScreenRuntimeLeafBlocks.tsx` | field/header/heading/text/stat/divider/image/button/related-list/unknown leaf rendering, final URL/media provenance, inline-edit sinks, and placeholders | `<=850` |
| `ScreenRuntimeContainerBlocks.tsx` | recursive field-group/columns/Tabs children and named slots, active-panel visibility, empty Tabs status, container drop zones, and delegation to leaf/frame owners | `<=750` |
| `ScreenRuntimeSectionList.tsx` | exported root implementation plus section layout/grid, section selection chrome, full-row gap/drop-zone rules, and source-order section/block traversal | `<=500` |
| `ScreenRuntimeRenderer.tsx` | explicit compatibility re-export only | `<=80` |

The allowed import graph is:

```text
screenRuntimeRendererModel -> useScreenRuntimeInteractions
screenRuntimeRendererModel -> {ScreenRuntimeBlockFrame, ScreenRuntimeLeafBlocks}
model + interactions + frame + leaf -> ScreenRuntimeContainerBlocks
model + interactions + frame + container -> ScreenRuntimeSectionList
ScreenRuntimeSectionList -> explicit ScreenRuntimeRenderer facade
```

`ScreenRuntimeContainerBlocks.tsx` may recurse into its own internal block dispatcher;
LeafBlocks never imports ContainerBlocks. SectionList is the sole owner of root/section
iteration and never imports the facade. Preserve the exact prop contract, one root-local
interaction namespace, builder-vs-entry state isolation, nested Tabs ancestry,
focus/keyboard behavior, passive ancestor semantics, drag/drop contracts, inline edits,
final URL sanitization, override→binding→static media precedence with no lower fallback,
UUID-to-URL resolution boundaries, byte-identical unauthored styling, grid geometry,
DOM order, ARIA relationships, and zero-item accessible state.

## Mandatory runtime-renderer test split

The historical 2,415-line suite collected exactly 72 Vitest cases. Complete test
declarations moved with their exact expanded names/assertions in source order. One
stateless harness owns shared mount/document/render/field/media constants and exposes
builders but no tests, mutable singleton, `beforeEach`, or cross-file cleanup authority.

| Test owner | Exact expanded pre-split positions | Count | Post-format budget |
|---|---:|---:|---:|
| retained `custom-screen-runtime-renderer.test.tsx` | current `:102-716`, positions 1-22: basic leaves, media/Button provenance, five expanded ASCII-control sinks | 22 | `<=800` |
| `custom-screen-runtime-interactions.test.tsx` | current `:717-1317`, positions 23-35: passive selection and all expanded Tabs interaction/isolation cases | 13 | `<=800` |
| `custom-screen-runtime-presentation.test.tsx` | current `:1336-2156`, positions 36-59: related rows, field/header fallback, presentation/style/metadata/drag/image-ratio behavior | 24 | `<=950` |
| `custom-screen-runtime-layout.test.tsx` | current `:2157-2415`, positions 60-72: section-grid/drop-zone parity plus final image placeholder/static-src checks | 13 | `<=500` |
| `support/customScreenRuntimeRendererHarness.tsx` | `mount`, cleanup, canonical fields/document/render helpers, reusable typed blocks/bindings/media IDs only | 0 | `<=450` |

Every suite creates and cleans its own root and is independently runnable in happy-dom.
The harness must not register tests or rely on suite evaluation order. The expanded
72-name multiset—not merely 66 lexical `test` calls—must match before/after: five
ASCII-control `test.each` cases and both mode-switch scenarios remain distinct names.
Its JSON-serialized sorted expanded-name SHA-256 at the verified pre-split tree is
`f35643b91c5b59ebf5e3445535d3e3ba0628782cae860126e2062176f5abfcbb`.
The unchanged dependency suites retain 8/8 record-interaction tests and 9/9
image-source tests, for the exact R03 combined total `22 + 13 + 24 + 13 + 8 + 9 = 89`.

These line-limit blockers are never LOW/TASK-9999 candidates. A missing assertion,
changed expanded name, cross-file state dependency, accessibility drift, URL/media
fallback, or visual behavior regression is blocking according to its actual impact.

The production split landed in this exact order: `screenRuntimeRendererModel.ts`,
`useScreenRuntimeInteractions.ts`, `ScreenRuntimeBlockFrame.tsx`,
`ScreenRuntimeLeafBlocks.tsx`, `ScreenRuntimeContainerBlocks.tsx`,
`ScreenRuntimeSectionList.tsx`, then the explicit `ScreenRuntimeRenderer.tsx` facade.
The stateless harness and retained, interactions, presentation, and layout suites then
landed in that order. Each suite passed independently at 22/22, 13/13, 24/24, and 13/13;
the combined dependency-shaped gate passed 89/89, the 72-name and 67-declaration hashes
matched, and all five test/support paths finished at 95/638/611/798/343 lines in that
declared land order. The fresh
family post-audit and browser smoke run after every source owner lands and remain
mandatory before closure.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named files, symbols, and regression suites above and below rather than mutable line
numbers.

- Composite block wrapper selection: `ScreenRuntimeRenderer.tsx:594-631,670-727`.
- Button DOM sink: `:1229-1255`.
- Decorative Tabs and all-panels render: `:1259-1388`.
- Composite section wrapper selection: `:1583-1633`.
- Contenteditable behavior proving the ancestor bug:
  `core/admin/ui/authoring/InlineEditWrapper.tsx:37-49,56-70`.

## Implementation Pseudocode

```tsx
// ScreenRuntimeRenderer.tsx — stable public seam, no wrapper/export *
export { ScreenRuntimeRenderer } from "./ScreenRuntimeSectionList";

// Root implementation creates one interaction owner and passes typed context down.
const interactions = useScreenRuntimeInteractions({ mode, insertPoint, onSetInsertPoint });
return (
  <div ref={interactions.rendererRootRef}>
    <ScreenRuntimeSectionList context={context} interactions={interactions} />
  </div>
);

// Import ScreenTabItem from customScreenSchemas; do not mirror its shape.
// Add optional renderer prop:
// presentationMediaUrlsById?: Readonly<Record<string, string>>;
const rendererRootRef = useRef<HTMLDivElement>(null);
const reactInstanceId = useId();
const instanceId = reactInstanceId.replace(/[^a-zA-Z0-9_-]/g, "") || "root";
const [localActiveTabByBlock, setLocalActiveTabByBlock] =
  useState<Record<string, string>>({});

function blockContainsId(block: ScreenBlockV1, targetId: string): boolean {
  return block.id === targetId ||
    (block.children ?? []).some((child) => blockContainsId(child, targetId)) ||
    Object.values(block.slots ?? {}).some((children) =>
      children.some((child) => blockContainsId(child, targetId))
    );
}

function builderTabSlot(
  block: ScreenBlockV1,
  tabs: ScreenTabItem[],
  current: ScreenInsertTarget | null | undefined
): string | null {
  if (!current || (current.kind !== "slot-end" && current.kind !== "slot-index")) {
    return null;
  }
  if (current.parentId === block.id) return current.slotId;
  return tabs.find((tab) =>
    (block.slots?.[tab.id] ?? []).some((child) =>
      blockContainsId(child, current.parentId)
    )
  )?.id ?? null;
}

function resolveActiveTab(block: ScreenBlockV1, tabs: ScreenTabItem[]): string | null {
  const requested = mode === "builder"
    ? builderTabSlot(block, tabs, insertPoint)
    : localActiveTabByBlock[block.id];
  return tabs.some((tab) => tab.id === requested) ? requested : (tabs[0]?.id ?? null);
}

function activateTab(block, tabId, sectionId) {
  if (mode === "builder") {
    onSetInsertPoint?.({
      kind: "slot-end",
      sectionId,
      parentId: block.id,
      slotId: tabId,
    });
    return;
  }
  setLocalActiveTabByBlock((state) => ({ ...state, [block.id]: tabId }));
}

function tabDomIds(blockId: string, tabId: string) {
  const identity = `b${blockId.length}-${blockId}-t${tabId.length}-${tabId}`;
  return {
    tab: `screen-tab-${instanceId}-${identity}`,
    panel: `screen-tabpanel-${instanceId}-${identity}`,
  };
}

function focusTabWithinRenderer(blockId: string, tabId: string) {
  const targetId = tabDomIds(blockId, tabId).tab;
  queueMicrotask(() => {
    const root = rendererRootRef.current;
    if (!root) return;
    Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((element) => element.id === targetId)
      ?.focus();
  });
}

function onTabKeyDown(event, index, tabs, block, sectionId) {
  const nextIndex = resolveRovingIndex(event.key, index, tabs.length);
  if (nextIndex === null) return;
  event.preventDefault();
  const next = tabs[nextIndex];
  activateTab(block, next.id, sectionId);
  focusTabWithinRenderer(block.id, next.id);
}

if (tabs.length === 0) {
  return wrap(
    <p role="status" data-screen-tabs-empty="true">
      No tabs available.
    </p>
  );
}
// Only a non-empty collection may continue into tablist/tab/tabpanel markup.

<div role="tablist" aria-label={block.label ?? "Tabs"}>
  {tabs.map((tab, index) => (
    <button type="button" role="tab"
      id={ids.tab} aria-controls={ids.panel}
      aria-selected={active === tab.id}
      tabIndex={active === tab.id ? 0 : -1}
      onClick={(e) => { e.stopPropagation(); activateTab(block, tab.id, sectionId); }}
      onKeyDown={...} />
  ))}
</div>
{tabs.map((tab) => (
  <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}
    hidden={active !== tab.id} tabIndex={0}>
    {render the existing slot/drop-zone contract}
  </div>
))}

// Block and section roots remain non-interactive containers:
<div data-screen-block-id=... onClick={selectOnlyBareContainerTarget}>...</div>
// Add a real, named authoring selection <button type="button"> in chrome.
// Repeat for section selection. Do not put role/tabIndex/onKeyDown on roots.

const safeHref = sanitizeScreenAuthoringUrl(boundHref, "link");
const canNavigate =
  mode !== "builder" && action === "link" && safeHref !== null;
return canNavigate
  ? <a href={safeHref}>...</a>
  : <span
      aria-disabled={action !== "link" || safeHref === null ? "true" : undefined}
    >...</span>;

// Builder always takes the non-anchor branch, even when safeHref is present. Only
// preview/entry may navigate. Missing, unsafe, or legacy-disabled href is aria-disabled
// in every mode.

import { firstScreenMediaAssetUuid } from "../../../services/customScreens/screenMediaIdentity";

// Direct image block: provenance is explicit and this sink accepts only a resolved URL.
if (block.type === "image") {
  const presentationAssetId = readMediaPresentationAssetId(block.id);
  const srcBinding = bindings.find(
    (binding) => binding.blockId === block.id && binding.propPath === "src"
  );
  let rawImageSrc: unknown;
  if (presentationAssetId !== null) {
    // An active override is UUID-only and absolute. Missing map entry means placeholder.
    rawImageSrc = presentationMediaUrlsById?.[presentationAssetId] ?? null;
  } else if (srcBinding !== undefined) {
    // Binding presence is also absolute. Accept a scalar UUID or the first valid UUID
    // in an array; never reinterpret any bound string as a URL or fall back to data.src.
    const boundAssetId = firstScreenMediaAssetUuid(
      readBindingPathValue(values, srcBinding.field)
    );
    rawImageSrc = boundAssetId === null
      ? null
      : (presentationMediaUrlsById?.[boundAssetId] ?? null);
  } else {
    // Static src is eligible only when neither override nor binding is present.
    rawImageSrc = block.data.src;
  }
  const safeImageSrc = sanitizeScreenAuthoringUrl(rawImageSrc, "media");
  return safeImageSrc
    ? <img src={safeImageSrc} ... />
    : <ImagePlaceholder data-image-disabled="true" />;
}

// Bound media field: MediaPicker consumes asset UUID(s), never resolved URLs.
if (block.type === "field" && field?.type === "media") {
  const presentationAssetId = readMediaPresentationAssetId(block.id);
  const displayValue = presentationAssetId ?? boundFieldValue;
  return <FieldRenderer field={field} value={displayValue} ... />;
}
```

Current corrective regression pseudocode (test-only unless the existing sink still
fails after R01):

```tsx
const controlConfusedUrls = [
  "/\t/evil.example/x",
  "/\n/evil.example/x",
  "/\r/evil.example/x",
  "/\u0000/evil.example/x",
  "/\u007F/evil.example/x",
];

for (const value of controlConfusedUrls) {
  const buttonView = render([buttonBlock({ href: value })], "entry");
  const buttonRoot = buttonView.container.querySelector('[data-screen-block-id="button-1"]');
  expect(buttonRoot?.querySelector("a")).toBeNull();
  expect(buttonRoot?.querySelector('[aria-disabled="true"]')).not.toBeNull();

  const imageView = render([imageBlock({ src: value })], "entry");
  const imageRoot = imageView.container.querySelector('[data-screen-block-id="image-1"]');
  expect(imageRoot?.querySelector("img")).toBeNull();
  expect(imageRoot?.querySelector('[data-image-disabled="true"]')).not.toBeNull();
}
```

Use the suite's existing fixture/build/render helpers rather than introducing parallel
test utilities. The Button proof must observe a disabled non-anchor, and the Image proof
must observe the existing placeholder plus the absence of `img`; checking only a
sanitizer return value or emitted URL string is insufficient for R03.

Import `sanitizeScreenAuthoringUrl` and `isScreenMediaAssetUuid` from TASK-540-01's
Screen-owned Bun-free contract; do not call the Page helper directly or duplicate its
URL ordering/UUID regex. This keeps the renderer feasible in its declared land order
before TASK-540-04 extends strict override normalization.

The split is mandatory. Only a direct image block resolves UUID→`MediaRecord.url` and
applies the final URL sanitizer. Provenance is ordered and fail-closed: an active
presentation override is a UUID-only winner and a missing/unsafe map result renders a
placeholder without consulting a binding or static `data.src`. Only when no override
exists may a present binding win; it selects a scalar UUID or the first valid UUID from
an array, and a malformed, URL-shaped, missing-map, or unsafe-map result renders a
placeholder without interpreting the bound value as a URL or consulting static
`data.src`. Static `data.src` is eligible only when both override and binding are
absent. A media field keeps its normalized scalar/array UUID identity because
`FieldRenderer` forwards it to `MediaPicker`, whose selection contract is asset identity;
never pass a URL there. The renderer must not pass a UUID to direct `<img src>`, import
`mediaClient`, or start async work.
TASK-540-04-L03 owns resolution/cancellation for direct-image override IDs and bound
media IDs and
forwards the map through `CustomScreenEntryCanvas.tsx`.

The outer renderer root owns `rendererRootRef`. Do not query global DOM for state
derivation. DOM lookup is permitted only for post-keyboard focus transfer, must be
scoped below that root, and uses IDs containing the per-renderer `useId` namespace.
State falls back at render when a tab is removed, avoiding synchronous setState in an
effect. Builder state is host-owned: tab click/key activation arms its slot-end and the
current `insertPoint` determines the visible panel; Inspector “Edit content” uses that
identical target. When that target belongs to a nested container, every ancestor Tabs
block derives the containing slot by traversing only its own child/slot tree. It never
falls through to preview/entry local state, so nested activation cannot collapse a
non-first ancestor panel and a mode switch cannot leak local selection into builder.
Nested Tabs remain independent because block IDs are unique within one document; two
concurrent renderer instances cannot collide because their DOM IDs use different
instance namespaces.

For pointer selection, ignore events originating from
`a,button,input,select,textarea,[contenteditable=true],[role=tab]`; the explicit
selection handle remains the keyboard path. Drag/drop handlers stay intact.

## Error/compatibility flow

- Zero Tabs is a fail-safe accessible empty state; valid writes require at least one,
  while a defensive read/runtime value renders exact visible `role="status"` text
  `No tabs available.` and emits no `tablist`, `tab`, or `tabpanel`.
- Removed active tab derives to the first remaining tab without stale focus.
- Legacy unsupported Button action already reads as link-without-href and renders
  disabled. Unsafe defense-in-depth URL also renders disabled, never `#`. Builder mode
  never renders a Button anchor or navigates; only preview/entry render a safe anchor.
- Direct-image sanitization occurs after the winning UUID resolves. Override presence,
  then binding presence, is absolute: malformed/URL-shaped bound values, no valid UUID,
  missing map entries, and unsafe resolved URLs all render the placeholder without
  lower-precedence fallback. Only absence of both sources enables static `data.src`.
  Media fields preserve scalar/array UUID identity for MediaPicker and never enter an
  image-src sink.
- Preview/entry markup changes only for Tabs or invalid selection semantics;
  unrelated block kinds preserve their content structure.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `custom-screen-runtime-interactions.test.tsx`: click/Arrow/Home/End, one panel
  visible, ARIA relationships, nested Tabs isolation in entry and builder (including a
  nested activation inside a non-first outer panel), preview/entry→builder mode-switch
  isolation, removal fallback, a safe Button
  remaining a non-anchor/non-navigating affordance in builder, that same safe Button
  becoming an anchor in preview/entry, unsafe/absent disabled Button behavior, and
  unique tab/panel IDs plus root-scoped focus across two concurrent renderers.
- The same interactions suite passes a defensive zero-item Tabs value and asserts visible
  exact `role="status"` text `No tabs available.` together with the absence of an empty
  `tablist`, every `tab`, and every `tabpanel`.
- The same existing renderer test owns the final-sink control corpus. Parameterize the
  exact TAB/LF/CR protocol-relative-confusion values plus NUL/DEL shown in the corrective
  pseudocode. For each value, a Button in entry mode has no `a` and exposes an
  `aria-disabled="true"` affordance; an Image has no `img` and exposes the existing
  `data-image-disabled="true"` placeholder. These are visible DOM-state assertions.
  Do not duplicate sanitizer/write/stored-read/compatibility-alias cases here; R01 owns
  those in `screen-document-image-src.test.ts`.
- `screen-document-image-src.test.ts` is read-only here but remains in this leaf's gate
  to pin the shared URL corpus and final-consumer migration.
- The retained `custom-screen-runtime-renderer.test.tsx` passes real UUID-keyed resolved URL maps and
  proves direct-image precedence with an override UUID, a scalar bound UUID, and the
  first valid UUID from a bound array. Dedicated cases cover malformed and URL-shaped
  bound values, a present binding with no usable value/UUID, a valid UUID missing from
  the map, and an unsafe resolved URL; each renders a placeholder with no binding/static
  fallback. Static safe `data.src` works only when neither override nor binding exists,
  no UUID reaches direct `src`, and a separate media-field case proves the exact
  scalar/array UUID identity—not URL—reaches MediaPicker and preserves selected-asset
  behavior.
- `custom-screen-record-interactions.test.tsx`: contenteditable Space is not
  canceled; links/inputs do not select wrapper; selection handle works by keyboard.
- The interactions suite supplies both block and section selection callbacks while
  activating a nested builder input, an entry link, and a nested builder Tabs control.
  The Tabs case must prove its own visible panel change, exact slot-end `insertPoint`,
  and root-scoped focus while both ancestor callbacks remain unchanged; input and link
  cases likewise prove their own action without changing either passive selection.
- Accessibility assertions cover both block and section roots.

Update all stale expectations, including the prior “no selection button” assertion,
before this source gate. TASK-540-06 may add builder→entry combinations later but must
not re-baseline these interaction, URL, or UUID assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-presentation.test.tsx \
  tests/vitest/ui-integration/custom-screen-runtime-layout.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/customScreens/screen-document-image-src.test.ts
node _docs/_workflows/task-540-implement.mjs --check-task-family-line-limit
```

Run each of the four renderer partitions independently for exact counts 22/22,
13/13, 24/24, and 13/13, then run the six-file matrix for 89/89. Run a complete
physical-line count over the seven production paths, harness/four suites, modified
record-interaction suite, and family-touched image-source suite; reject every result
above 1,000 without changing their ownership. Rerun any named failing file once in
isolation. No Bun runtime route is touched. Because this is UI/editor code, the family
stream also requires the task-scoped helper-restarted `playwright-cli` smoke
specified by TASK-540-06 after all source owners land; source movement does not reuse the
historical browser receipt. `runLeafGate` byte-counts this
leaf's exact `allowedFiles` before and after its commands; the displayed global command
is the final family assertion after all modular streams land.

## Corrective repair completed

The accessible Tabs, passive-selection, URL/UUID sink implementation, length-delimited
DOM identity, and 83/83 gate remain historical metadata. After R01 landed, this leaf
added the explicit final Button/Image control-character DOM regressions and historically
passed the then-current exact 89/89 gate plus a zero-finding post-audit. The current
2026-07-16 accessible zero-item Tabs repair independently passed the historical exact
89/89 gate, lint/typecheck, and diff check. The modular split passed the fresh
independent/combined 89/89 gate, exact fingerprints, line counts, static gates, and
zero-finding code and cross-contract audits. Its exact modularity receipt is current;
family post-audit, runtime smoke, and closure remain pending.
