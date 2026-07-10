# TASK-539-03-L03: Wire Gallery and Responsive Page Canvas

# FileName: TASK-539-03-L03-Wire-Gallery-And-Responsive-Page-Canvas.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / PageEditor / Responsive UX
**Estimated Effort:** Medium
**Dependencies:** TASK-539-03-L01, TASK-539-03-L02
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership and collision guard

Sole source writer: `core/admin/ui/pages/PageEditor.tsx`. This leaf also owns the
compatibility-expectation updates required before its source gate in
`tests/vitest/ui/page-editor-v2-flow.test.tsx`.

Do not implement until TASK-478/TASK-481 are inactive and their final file is read
fresh. Explicitly forbidden: `core/admin/ui/shared/CanvasEditor.tsx`, every Custom
Screen file, `PageAuthoringCanvas.tsx`, model/render/runtime source, and foreign tests.

## Implementation Pseudocode

Replace the local media URL field with the L02 import and render
`GalleryItemsControl` for the `galleryItems` UI model:

```tsx
case "galleryItems":
  return <GalleryItemsControl
    label={control.label}
    value={isCanonicalGalleryArray(rawValue) ? rawValue : []}
    categories={readStringArray(effectiveBlock.props.filterCategories)}
    onChange={onCommit}
  />;
```

Do not create a second permissive gallery normalizer in the browser. Defensive UI
guards may map malformed input to an empty display but only the canonical control
output is committed.

Before rendering controls, call `isPageEditorControlVisible` with the effective value
for the active device. This makes divider, parallax, filter category, and later gates
consistent across base/tablet/mobile. Hidden controls do not clear values merely by
rendering; TASK-539-01 normalization owns stale-value cleanup.

For spans, derive whether the selected block has a real section-grid-item target.
Hide span controls for per-column composition and non-grid media-split placement;
template wrappers that TASK-539-05 marks as actual grid items remain eligible. Keep
this derivation pure/render-time and do not set state in an effect.

Replace fixed inspector clearance around `PageEditor.tsx:2610-2619` with Page-local
responsive classes/data state:

```tsx
className={join(..., inspectorOpen ? "sm:pr-[300px]" : undefined)}
```

The exact breakpoint must leave zero reserved right padding at 320, 390, and 480px,
and retain the existing 300px desktop clearance. The shared panel may overlay narrow
content and remains closable; do not change `CanvasEditor` or Screen behavior.

## Errors and UX invariants

- Never overwrite dirty Page state from media cache completion.
- Existing picker load failures retain the current value.
- Gallery edits travel through the existing Page change/autosave path.
- Panel open/close, breakpoint selection, cache hydration, and dirty-navigation
  behavior remain unchanged.
- No new localStorage or network request is introduced.

## Gate test ownership and validation

Update `page-editor-v2-flow.test.tsx` for the new control wiring and responsive clearance
before this source gate. TASK-539-03-L04 owns later additive cross-file cases and must
not re-baseline these landed expectations.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

The new gallery-control suite was created and gated by TASK-539-03-L02. L03 runs it
read-only only when debugging a wiring failure; L04 later runs the complete combined
proof before the next subtask.
Rerun any named failing test file once in isolation before classifying the failure.
