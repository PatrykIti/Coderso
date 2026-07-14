# TASK-540-03-L01: Functional Tabs and No Nested-Interactive Space Trap

# FileName: TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-03
**Priority:** High
**Category:** Custom Screens / Runtime UI / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`

Do not edit `InlineEditWrapper.tsx`, `CustomScreenEntryCanvas.tsx`, schemas,
inspector, or shared selection helpers. Fix the ancestor semantics at the owning
renderer and update the named behavior expectations before its gate.

## Grounded anchors

- Composite block wrapper selection: `ScreenRuntimeRenderer.tsx:594-631,670-727`.
- Button DOM sink: `:1229-1255`.
- Decorative Tabs and all-panels render: `:1259-1388`.
- Composite section wrapper selection: `:1583-1633`.
- Contenteditable behavior proving the ancestor bug:
  `core/admin/ui/authoring/InlineEditWrapper.tsx:37-49,56-70`.

## Implementation Pseudocode

```tsx
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

function tabDomIds(instanceId: string, blockId: string, tabId: string) {
  return {
    tab: `screen-tab-${instanceId}-${blockId}-${tabId}`,
    panel: `screen-tabpanel-${instanceId}-${blockId}-${tabId}`,
  };
}

function onTabKeyDown(event, index, tabs, block, sectionId) {
  const nextIndex = resolveRovingIndex(event.key, index, tabs.length);
  if (nextIndex === null) return;
  event.preventDefault();
  const next = tabs[nextIndex];
  activateTab(block, next.id, sectionId);
  const ids = tabDomIds(instanceId, block.id, next.id);
  queueMicrotask(() =>
    rendererRootRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(ids.tab)}`)
      ?.focus()
  );
}

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

function firstMediaAssetUuid(value: unknown): string | null {
  if (isScreenMediaAssetUuid(value)) return value;
  if (!Array.isArray(value)) return null;
  return value.find(isScreenMediaAssetUuid) ?? null;
}

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
    const boundAssetId = firstMediaAssetUuid(
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

- Zero Tabs is a fail-safe empty state; valid writes require at least one.
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

- `custom-screen-runtime-renderer.test.tsx`: click/Arrow/Home/End, one panel
  visible, ARIA relationships, nested Tabs isolation in entry and builder (including a
  nested activation inside a non-first outer panel), preview/entry→builder mode-switch
  isolation, removal fallback, a safe Button
  remaining a non-anchor/non-navigating affordance in builder, that same safe Button
  becoming an anchor in preview/entry, unsafe/absent disabled Button behavior, and
  unique tab/panel IDs plus root-scoped focus across two concurrent renderers.
- `screen-document-image-src.test.ts` is read-only here but remains in this leaf's gate
  to pin the shared URL corpus and final-consumer migration.
- `custom-screen-runtime-renderer.test.tsx` passes real UUID-keyed resolved URL maps and
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
- Accessibility assertions cover both block and section roots.

Update all stale expectations, including the prior “no selection button” assertion,
before this source gate. TASK-540-06 may add builder→entry combinations later but must
not re-baseline these interaction, URL, or UUID assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/customScreens/screen-document-image-src.test.ts
```

Rerun any named failing file once in isolation. No Bun runtime route is touched.

## Completion

Implemented accessible and functional Tabs for builder, preview, and entry; unique
renderer-scoped ARIA wiring and keyboard focus; passive selection roots with sibling
selection handles; Button final-sink URL sanitization; and direct-image UUID
provenance with fail-closed override/binding precedence. Media fields continue to
receive their exact scalar/array UUID identity.

The first fresh post-audit found one HIGH nested-builder ancestor-panel regression,
one MEDIUM preview/entry-to-builder state leak, and one LOW unrelated-markup drift.
After correcting the contract and source, recursive child/slot traversal keeps all
ancestor Tabs panels visible, builder state derives exclusively from the host
`insertPoint`, and the renderer emits no global root marker or non-builder section
group class. A second fresh audit found zero HIGH, MEDIUM, or LOW drift. Final
validation: targeted Vitest 82/82, `bun --cwd core lint:types`, `bun --cwd core lint`,
`git diff --check`, empty staging, and forbidden Page-path guard all passed.
