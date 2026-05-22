# TASK-288-03: Tabs Admin Preview and Runtime Activation

# FileName: TASK-288-03_Tabs_Admin_Preview_and_Runtime_Activation.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI Preview + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-05-04, TASK-288
**Status:** To Do

---

## Overview

Repair Tabs-specific preview/runtime activation from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows C3, W6, and R5.

The report confirmed that the published frontend runs the Tabs runtime script,
but the admin preview remains static because scripts inserted through React
`dangerouslySetInnerHTML` are not executed as browser parser scripts. Users
therefore cannot test switching panels in admin before publishing.

## Scope Boundary

This leaf owns only the Tabs-specific activation path after TASK-256 finalizes
instance-safe selectors and ARIA relationships.

It must not introduce a generic script registry, global page-builder runtime
bridge, or shared interactive-widget policy. If implementation requires one of
those shared mechanisms, split that work back to TASK-256-04 and consume it
here.

## Sub-Tasks

- [ ] Replace any selector assumptions that still depend on legacy runtime
  namespaces or stale trigger/panel lookup logic after TASK-256 lands
  instance-safe values.
- [ ] Make the admin preview switch panels without requiring parser-executed
  inline scripts.
- [ ] Prevent React preview state from fighting the runtime-managed `hidden`
  attribute.
- [ ] Ensure published runtime still initializes once per page or once per
  scoped root according to the final TASK-256 contract.
- [ ] Avoid duplicate inline script payloads when multiple Tabs widgets render
  on the same page, or explicitly consume the shared runtime payload helper if
  one already exists on the branch. If that helper does not exist, split the
  transport/dedupe mechanism to a new shared task before marking W6 fixed.
- [ ] Add an explicit script `type` only if the final render path still emits an
  inline script tag.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/tabs.tsx` | Add a Tabs-local preview activation path or consume a shared runtime helper; remove duplicate script output only if a shared transport helper exists on the branch or is split before implementation. |
| `tests/vitest/widgets/tabs.test.tsx` | Add SSR marker/state assertions for the public renderer and any runtime transport branch that remains local to Tabs. |
| `tests/vitest/ui-integration/tabs-preview-activation.test.tsx` | Add the Bun-free client-render proof for admin preview activation, active-state updates, and hidden-state parity when `previewDevice`/editor preview is active. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Keep editor-form coverage only; do not rely on this suite as the sole admin-preview interaction proof. |

## Implementation Pseudocode

```tsx
function normalizeTabsRootId(blockId: string | undefined) {
  return `tabs-${(blockId ?? "preview").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function TabsBlock({
  data,
  variant,
  slots,
  previewDevice,
  blockId,
}: {
  data: TabsData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  blockId?: string;
}) {
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const panels = resolvePanels(data, slotMap);
  const normalized = normalizeTabsData(data, panels.length);
  const initialActiveId =
    normalized.options?.defaultItemId &&
    panels.some((panel) => panel.instanceId === normalized.options?.defaultItemId)
      ? normalized.options.defaultItemId
      : (panels[0]?.instanceId ?? "1");
  const [previewActiveId, setPreviewActiveId] = useState(initialActiveId);
  const isReactPreview = Boolean(previewDevice);
  const activeId = isReactPreview ? previewActiveId : initialActiveId;
  const rootId = normalizeTabsRootId(blockId);

  return (
    <div data-coderso-tabs={rootId} data-coderso-tabs-active-id={activeId}>
      {panels.map((panel) => (
        <button
          type="button"
          data-coderso-tabs-trigger
          onClick={isReactPreview ? () => setPreviewActiveId(panel.instanceId) : undefined}
          aria-selected={panel.instanceId === activeId}
        />
      ))}
      {panels.map((panel) => (
        <div
          role="tabpanel"
          data-state={panel.instanceId === activeId ? "active" : "inactive"}
          hidden={panel.instanceId !== activeId}
        />
      ))}
      {!isReactPreview ? (
        <script type="text/javascript" dangerouslySetInnerHTML={{ __html: getTabsRuntimeClientScript() }} />
      ) : null}
    </div>
  );
}
```

Runtime transport note:

- Preview interaction proof must live in a dedicated Bun-free UI integration
  suite under `tests/vitest/ui-integration/*`.
- Public script transport de-duplication must either use an existing
  request-scoped helper or move to a shared follow-up task before W6 is closed.

Error handling:

- Preview state must reset to a valid panel if item count changes and the active
  preview panel disappears.
- `blockId` comes from the shared `WidgetDefinition.render` contract and
  `WidgetRenderer`; do not invent a second instance-id source inside Tabs.
- Missing panel slots still fall back to normalized panels.
- Runtime selectors must ignore unknown or malformed roots rather than throwing.
- Multiple Tabs widgets on one page must not share mutable active state.

## Regression Test Shape

- `tests/vitest/ui-integration/tabs-preview-activation.test.tsx`: client-render
  `TabsBlock`/`WidgetRenderer` with preview context, click and keyboard-switch
  tabs, and assert active panel visibility changes without relying on parser
  execution of inline `<script>`.
- `tests/vitest/widgets/tabs.test.tsx`: assert public SSR markers, whichever
  runtime transport branch remains local to Tabs, and no regression in root-
  scoped active-state markers.
- `tests/vitest/ui/tabs-editor-wave.test.tsx`: keep only existing editor-form
  regressions so preview activation proof does not drift back into form tests.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless data shape changes.
- Anti-abuse: no user-authored script content, inline event-handler strings, or
  raw HTML. Any runtime script must remain static source controlled by the repo.
- Secret handling: no secrets in DOM IDs, data attributes, script payloads, or
  diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/tabs-preview-activation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx` only for
  unchanged editor-form regressions; keep the admin-preview interaction proof in
  the dedicated UI integration harness
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TABS.md` with the final admin preview/runtime
  activation contract.
- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows C3, W6, and R5 after
  validation.

## Changelog Policy

- Covered by the TASK-288 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Tabs can be switched in admin preview without publishing the page.
- Published pages still switch tabs by click and keyboard after TASK-256
  instance-safe selectors land.
- Multiple Tabs widgets on a page do not duplicate runtime payloads or share
  active state.
- React preview rendering and runtime rendering no longer fight over `hidden`
  state.
