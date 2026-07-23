# TASK-539-03-L03: Wire Gallery and Responsive Page Canvas

# FileName: TASK-539-03-L03-Wire-Gallery-And-Responsive-Page-Canvas.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / PageEditor / Responsive UX
**Estimated Effort:** Large
**Dependencies:** TASK-539-03-L02
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Sole ownership, split, and collision guard

Own the stable `core/admin/ui/pages/PageEditor.tsx` facade and cohesive extraction
under `core/admin/ui/pages/editor/`:

- `PageEditorRoot.tsx`
- `usePageEditorController.ts`
- `pageEditorDocumentCommands.ts`
- `PageEditorToolbar.tsx`
- `PageEditorRegistryFields.tsx`
- `PageEditorResponsivePanel.tsx`
- `PageEditorSettingsPanel.tsx`

Keep the facade's exact pre-task public surface through explicit named/type
re-exports; no export-star:

- values/functions: `PageEditor`, `PageSettingsSubpanel`,
  `findRecoverableAutosaveRevision`, and `resolveToolbarTargetLabel`;
- local type: `PageEditorProps`;
- all ten host-contract types: `PageEditorHost`,
  `PageEditorHostAppearancePanelProps`, `PageEditorHostCanvasChromeProps`,
  `PageEditorHostFreshnessMode`, `PageEditorHostLoadOptions`,
  `PageEditorHostPalette`, `PageEditorHostPreviewResponse`,
  `PageEditorHostPublishResult`, `PageEditorHostRevisions`, and
  `PageEditorHostSettingsRenderProps`.

Also own the cohesive split of `tests/vitest/ui/page-editor-v2-flow.test.tsx` into:

- the existing core flow suite;
- `page-editor-v2-authoring-flow.test.tsx`
- `page-editor-v2-controls-flow.test.tsx`
- `page-editor-v2-inline-edit-flow.test.tsx`
- `page-editor-v2-responsive-flow.test.tsx`
- `page-editor-v2-layout-flow.test.tsx`
- `page-editor-v2-persistence-flow.test.tsx`
- `page-editor-v2-settings-flow.test.tsx`
- optional focused `pageEditorV2FlowHarness.tsx`, only for shared render/host fixtures.

Each suite must run independently. Extract by behavior, not arbitrary ranges; no
generic dumping-ground helper. Baselines are 5,204 source lines and 6,813 test lines;
every result must be `<=1000`.

Forbidden: `CanvasEditor.tsx`, `PageAuthoringCanvas.tsx`, every Screen/Custom Screen
file, renderer/model/runtime source, and foreign tests. Read TASK-478/TASK-481 output
fresh before editing.

## Implementation Pseudocode

- Replace local `ToolbarMediaUrlField` with `MediaUrlControl`.
- Render `GalleryItemsControl` only for `{kind:"galleryItems"}` and
  `GalleryCategoryTokensControl` only for `{kind:"galleryCategoryTokens"}`; never
  route either through `ListItemsControl`.
- Build every media field's scope from an unambiguous serialized tuple
  `JSON.stringify([targetKind,targetId,control.id])`. Pass it as `scopeKey` and key/remount
  `MediaUrlControl` by that value; for the gallery-items kind pass that same value as
  `GalleryItemsControl.parentScopeKey`, where L02 derives collision-safe row scopes.
  A block/section replacement with the same stored URL therefore cannot receive
  completion from the previous target.
- Pass gallery items only when already canonical; malformed values display as an
  empty list and are never committed until an explicit user edit.
- Preserve L02's source-length contract through the real PageEditor path:
  `GalleryItemsControl` imports/passes `PAGE_GALLERY_SRC_MAX` to its row media
  controls. In the split PageEditor source-owner suite, resolve a selected
  `MediaRecord.url` at exactly 2,048 characters and prove one canonical gallery
  commit, then resolve 2,049 characters and prove no commit, dirty transition, or
  autosave transition and no mutation of the current row. PageEditor must not slice
  either selected or already-displayed source values.
- For each section or block registry control, derive all field behavior once:

  ```ts
  const candidateRegistryBlockPath =
    selectedBlockPath ??
    (selectedSection.blocks[0] ? ([{index: 0}] as const) : null);
  const resolvedBaseRegistryBlock = candidateRegistryBlockPath
    ? getPageBlockAtPath(selectedSection, candidateRegistryBlockPath)
    : null;
  const resolvedEffectiveRegistryBlock = candidateRegistryBlockPath
    ? getPageBlockAtPath(resolvedSelectedSection, candidateRegistryBlockPath)
    : null;

  // A stale selected path must not fall back to the first root. Finalize the
  // one canonical path only after that exact candidate resolves in both views.
  const registryBlockPath =
    candidateRegistryBlockPath &&
    resolvedBaseRegistryBlock &&
    resolvedEffectiveRegistryBlock
      ? candidateRegistryBlockPath
      : null;
  const baseRegistryBlock = registryBlockPath
    ? resolvedBaseRegistryBlock
    : null;
  const effectiveRegistryBlock = registryBlockPath
    ? resolvedEffectiveRegistryBlock
    : null;
  const registryBlockPlacement = registryBlockPath
    ? resolvePageBlockGridPlacement(selectedSection, registryBlockPath, {
        includeHiddenBlocks: true,
      })
    : "none";
  const registryMediaParentScopeKey =
    registryBlockPath && baseRegistryBlock
      ? JSON.stringify(["block", baseRegistryBlock.id, control.id])
      : null;

  const controlDevice = control.responsive ? activeDevice : "desktop";
  const fieldDevice = controlDevice;
  const fieldTarget = control.responsive ? effectiveTarget : baseTarget;

  const visible = isPageEditorControlVisible(control, {
    baseTarget,
    effectiveTarget,
  });

  // Every read/auxiliary/default/shell/reset/commit path receives fieldTarget
  // and fieldDevice, never an independently chosen active target/device.
  patchBlockControlForDevice(block, fieldDevice, control, value);
  patchSectionControlForDevice(section, fieldDevice, control, value);

  function commitRegistryBlock(mutator: (block: PageBlockV2) => PageBlockV2) {
    if (!registryBlockPath) return;
    updateSelectedSection((currentSection) => {
      const result = updatePageBlockAtPath(
        currentSection,
        registryBlockPath,
        mutator
      );
      return result.status === "ok" ? result.section : currentSection;
    });
  }
  ```

  This is the one canonical registry block target: the selected path when present,
  otherwise the first root path `[{index:0}]` when a root exists. Resolve that exact
  candidate in both the base and effective sections before exposing it; never replace
  a stale selected path with the first root, and never independently derive a first
  block while leaving the path null. The exact
  `registryBlockPath`/base/effective block tuple drives control discovery, visibility,
  displayed/auxiliary/default values, media parent scope, span placement, reset, and
  every block mutation. A fallback field commit calls `updatePageBlockAtPath` with
  `[{index:0}]`; selected/nested commits use the selected path. If the chosen path no
  longer resolves in either view, or no candidate exists, render no block registry
  field/control (including media and reset affordances), do not call the placement
  resolver, and perform no block write, dirty transition, or autosave transition
  rather than falling through to a section mutation or a different block. Re-check
  the same path through `updatePageBlockAtPath` inside every write callback and keep
  the current section on a non-`"ok"` result; never reconstruct a path from the
  current selection inside a field, reset, media, or commit callback. Construct and
  expose those callbacks and `registryMediaParentScopeKey` only inside the canonical
  non-null block-field branch.

  Use `fieldTarget` for the visibility source, displayed value, auxiliary inputs,
  and default comparison. Use `fieldDevice` for the field shell, override badge,
  reset affordance, commit callback, and write. Apply this exact projection to
  selected and fallback block paths plus section paths. A base-only control never
  displays an active-device override badge and never exposes/calls a responsive reset.
  Hidden controls never clear values on render. All four gallery controls and all
  five divider controls remain base-owned while tablet/mobile is active; one
  deliberate edit creates one dirty/autosave transition and no responsive
  gallery/divider key. A pre-existing tablet/mobile key remains byte-identical.
- For span controls, call
  `resolvePageBlockGridPlacement(selectedSection, registryBlockPath,
  {includeHiddenBlocks:true})` from L05 only inside the non-null, successfully
  resolved `registryBlockPath` branch, and show them only when the result is not
  `"none"`. Never pass nullable `selectedBlockPath`, never call the helper for an
  empty or stale target, and never derive a separate fallback path for placement.
  Admin intentionally classifies all root blocks, including hidden ones. Do not
  duplicate placement or visibility rules.
- Keep all existing change/autosave/cache/dirty-state flows.

Inspector clearance is Page-local:

```tsx
const canvasScrollerClassName = `min-h-0 flex-1 overflow-auto overscroll-contain
  bg-dotted p-6 lg:p-8 ${
    panelOpen && hasFloatingPanelSelection
      ? "sm:pr-[300px] lg:pr-[300px]"
      : ""
  }`;
```

Build this class locally in PageEditor code; do not import
`joinPageRenderClasses` or another public-renderer helper. Remove the fixed inline
`style={{paddingRight:300}}`. At 320/390/480px the conditional class adds no rail
reservation and the existing normal `p-6` padding remains. From `sm` (`640px`)
upward the open selected inspector reserves exactly 300px on the right, including at
`lg` despite the retained `lg:p-8`; closing it restores the ordinary `p-6 lg:p-8`
padding. Vitest pins the conditional class tokens, open/closed state, and cascade
contract (including both responsive right-padding tokens after the retained
`lg:p-8` token); it does not claim a JSDOM computed-style result. TASK-539-08 owns
the real Playwright computed-padding proof at 640px and an `lg` viewport. The panel
may overlay narrow content and stays closable.

## Security and compatibility

No new network request, storage, route, or security boundary. Existing Page writes
remain internal `/admin/api/*`, session-cookie-only, Page-RBAC protected, CSRF
protected, assigned to `admin_write`, and strict reject-unknown at the Page document
boundary; API-key mode is not supported. No public write, nonce/HMAC, or captcha
change applies. The extracted `MediaUrlControl` retains
`onChange(string | null)` and null-on-clear URL storage; scope/generation isolation
must prevent async media completion from overwriting dirty state or a replacement
target. Malformed gallery input is display-only until an explicit canonical edit.

The split source-owner suites cover tablet and mobile reads, edits, badges, reset
affordances, and commits for all four gallery controls and all five divider controls.
Seed different pre-existing tablet/mobile values first: the displayed/base value
changes, the responsive object stays byte-identical, no responsive reset is exposed,
and the existing dirty/autosave pipeline is invoked exactly once per edit. Media
tests switch between equal-URL targets and resolve the old request after replacement/
unmount, including parent-gallery-scope replacement and stable surviving-row identity
after removing an earlier row. The PageEditor gallery path additionally pins selected
URL boundaries at exactly 2,048/2,049, with the latter producing zero
writes/dirty/autosave changes and no render-time truncation. Fallback-target tests
prove a null selection with a first root finalizes `[{index:0}]` and passes that exact
path to fields, media scope, span placement, reset, and mutation. They also prove an
empty section or stale selected path finalizes no canonical path, does not call
`resolvePageBlockGridPlacement`, renders no block registry field/control, and cannot
write or trigger dirty/autosave. Layout tests pin class
tokens/open-state/cascade ordering and restoration on close; TASK-539-08 owns actual
browser computed clearance at 640px and `lg`.

## Validation and line receipt

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/ui/page-editor-v2-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-controls-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-layout-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-settings-flow.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

The workflow receipt must show every touched/extracted source and test at `<=1000`.
Rerun a named failure alone.
