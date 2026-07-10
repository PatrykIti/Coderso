# TASK-539-03-L02: Build Gallery Items Media Control

# FileName: TASK-539-03-L02-Build-Gallery-Items-Media-Control.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Admin Editor Components
**Estimated Effort:** Medium
**Dependencies:** TASK-539-03-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Create/own:

- `core/admin/ui/pages/editorControls/GalleryItemsControl.tsx`
- `core/admin/ui/pages/editorControls/MediaUrlControl.tsx`
- the matching export lines in `core/admin/ui/pages/editorControls/index.ts`
- new `tests/vitest/ui/page-editor-gallery-items-control.test.tsx`

Do not edit `PageEditor.tsx` or unrelated tests in this leaf. Create the exact new suite
above before the first validation command; this leaf is its sole writer. Extract the existing
`ToolbarMediaUrlField` behavior from `PageEditor.tsx:4640-4724` without changing its
URL-storage contract; L03 removes the local copy after importing this component.

## Implementation Pseudocode

```ts
type MediaUrlControlProps = {
  label: string;
  value: string;
  accept?: readonly string[];
  onChange(value: string | null): void;
};

type GalleryItemsControlProps = {
  label: string;
  value: readonly PageGalleryItemV2[];
  categories: readonly string[];
  onChange(value: PageGalleryItemV2[]): void;
};
```

`MediaUrlControl` keeps the existing data flow:

```text
stored URL -> cached media lookup -> selected asset id for MediaPicker only
picker asset id -> identity-guarded listMediaCached -> matched MediaRecord.url -> onChange(URL)
clear -> onChange(null)
unmatched stored URL -> visible clearable readout; never replace it on mount
```

Do not persist the asset ID. A rejected/stale async lookup leaves the prior URL intact;
the picker owns load-error UI. Preserve cancellation/request identity so a late lookup
cannot overwrite a newer pick.

`GalleryItemsControl` renders ordered rows with image, alt, caption, and category
selection. Add creates exactly `{src:"",alt:"",caption:""}`; remove deletes one row;
field edits clone only the selected row. Category choices come from the block's valid
`filterCategories`; store the existing space-joined canonical token set and omit the
key when empty. Disable or clearly mark a category no longer in the available list,
but preserve it until an explicit user edit so mounting the control never mutates data.

Use stable accessible labels containing the one-based item position. Buttons are real
buttons, list rows expose deterministic `data-page-editor-gallery-item`, and keyboard
focus remains usable after add/remove. Do not add drag/reorder behavior not already
required by the parent.

## Security and compatibility

The component is not a validation boundary. It emits canonical typed objects; the
model write normalizer revalidates every URL/token. It must not expose hidden media
metadata, cache secrets, or place values in localStorage. Unknown legacy object keys
are never copied into the emitted row.

## Test ownership and validation

This leaf creates and owns the dedicated component suite. TASK-539-03-L04 runs it
read-only in the combined editor proof and must not edit or re-baseline it.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/ui/page-editor-gallery-items-control.test.tsx
bun --cwd core build:admin
git diff --check
```

Create the dedicated gallery-control test before this source gate; an absent result or
missing new path is a failure.
Rerun the named failing test file once in isolation before classifying the failure.
