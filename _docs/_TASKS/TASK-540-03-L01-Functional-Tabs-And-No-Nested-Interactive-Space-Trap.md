# TASK-540-03-L01: Functional Tabs and No Nested-Interactive Space Trap

# FileName: TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-03
**Priority:** High
**Category:** Custom Screens / Runtime UI / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01, TASK-540-02-L01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`, and
  `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`

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
const [activeTabByBlock, setActiveTabByBlock] = useState<Record<string, string>>({});

function resolveActiveTab(blockId: string, tabs: ScreenTabItem[]): string | null {
  const requested = activeTabByBlock[blockId];
  return tabs.some((tab) => tab.id === requested) ? requested : (tabs[0]?.id ?? null);
}

function tabDomIds(instanceId: string, blockId: string, tabId: string) {
  return {
    tab: `screen-tab-${instanceId}-${blockId}-${tabId}`,
    panel: `screen-tabpanel-${instanceId}-${blockId}-${tabId}`,
  };
}

function onTabKeyDown(event, index, tabs, blockId) {
  const nextIndex = resolveRovingIndex(event.key, index, tabs.length);
  if (nextIndex === null) return;
  event.preventDefault();
  const next = tabs[nextIndex];
  setActiveTabByBlock((state) => ({ ...state, [blockId]: next.id }));
  const ids = tabDomIds(instanceId, blockId, next.id);
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
      onClick={(e) => { e.stopPropagation(); activate(tab.id); }}
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
return action === "link" && safeHref
  ? <a href={safeHref}>...</a>
  : <span aria-disabled="true">...</span>;

// Direct image block: presentation is a media UUID, but this sink requires a URL.
if (block.type === "image") {
  const presentationAssetId = readMediaPresentationAssetId(block.id);
  const rawImageSrc = presentationAssetId !== null
    ? (presentationMediaUrlsById?.[presentationAssetId] ?? null)
    : resolveBoundThenStaticImageSrc(block, bindings, values);
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

Import `sanitizeScreenAuthoringUrl` from TASK-540-01's Screen-owned contract; do not
call the Page helper directly or duplicate its ordering. This ensures every backslash-
confused value is rejected before delegation at the render trust boundary.

The split is mandatory. Only a direct image block resolves UUID→`MediaRecord.url` and
applies the final URL sanitizer. A media field keeps its normalized UUID because
`FieldRenderer` forwards it to `MediaPicker`, whose selection contract is asset identity;
never pass a URL there. The renderer must not pass a UUID to direct `<img src>`, import
`mediaClient`, or start async work. For a direct image, an authored override remains the
winner when its UUID is missing from the map, producing a placeholder without fallback.
TASK-540-04-L03 owns resolution/cancellation only for direct-image override IDs and
forwards the map through `CustomScreenEntryCanvas.tsx`.

The outer renderer root owns `rendererRootRef`. Do not query global DOM for state
derivation. DOM lookup is permitted only for post-keyboard focus transfer, must be
scoped below that root, and uses IDs containing the per-renderer `useId` namespace.
State falls back at render when a tab is removed, avoiding synchronous setState in an
effect. Nested Tabs remain independent because block IDs are unique within one
document; two concurrent renderer instances cannot collide because their DOM IDs use
different instance namespaces.

For pointer selection, ignore events originating from
`a,button,input,select,textarea,[contenteditable=true],[role=tab]`; the explicit
selection handle remains the keyboard path. Drag/drop handlers stay intact.

## Error/compatibility flow

- Zero Tabs is a fail-safe empty state; valid writes require at least one.
- Removed active tab derives to the first remaining tab without stale focus.
- Legacy unsupported Button action already reads as link-without-href and renders
  disabled. Unsafe defense-in-depth URL also renders disabled, never `#`.
- Direct-image sanitization occurs after presentation UUID resolution and precedence. A
  missing UUID or unsafe resolved winning URL renders the placeholder without fallback.
  Media fields preserve UUID identity for MediaPicker and never enter an image-src sink.
- Preview/entry markup changes only for Tabs or invalid selection semantics;
  unrelated block kinds preserve their content structure.

## Gate regressions owned here; aggregate additions owned by TASK-540-06

- `custom-screen-runtime-renderer.test.tsx`: click/Arrow/Home/End, one panel
  visible, ARIA relationships, nested Tabs isolation, removal fallback, safe link,
  and unique tab/panel IDs plus root-scoped focus across two concurrent renderers.
- `screen-document-image-src.test.ts` pins the shared URL corpus.
- `custom-screen-runtime-renderer.test.tsx` passes real UUID-keyed resolved URL maps and
  proves safe direct-image override, missing asset, unsafe resolved URL, bound/static
  fallback only without an override, no UUID in direct `src`, and placeholder without
  lower-precedence fallback. A separate media-field case proves the exact UUID—not URL—
  reaches MediaPicker and preserves selected-asset behavior.
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
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx
```

Rerun any named failing file once in isolation. No Bun runtime route is touched.
