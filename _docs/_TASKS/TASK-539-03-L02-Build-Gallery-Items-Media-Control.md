# TASK-539-03-L02: Build Gallery Items Media Control

# FileName: TASK-539-03-L02-Build-Gallery-Items-Media-Control.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Admin Editor Components
**Estimated Effort:** Medium
**Dependencies:** TASK-539-03-L01
**Status:** ✅ Done
**Completed:** 2026-08-20
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Sole ownership

Create/own:

- `core/admin/ui/pages/editorControls/MediaUrlControl.tsx`
- `core/admin/ui/pages/editorControls/GalleryItemsControl.tsx`
- `core/admin/ui/pages/editorControls/GalleryCategoryTokensControl.tsx`
- matching explicit exports in `core/admin/ui/pages/editorControls/index.ts`
- `tests/vitest/ui/page-editor-media-url-control.test.tsx`
- `tests/vitest/ui/page-editor-gallery-items-control.test.tsx`
- `tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx`

Do not edit `PageEditor.tsx` here. L03 removes its symbol
`ToolbarMediaUrlField` after importing this component.

## Implementation Pseudocode

```ts
type MediaUrlControlProps = {
  label: string;
  value: string;
  scopeKey: string;
  accept?: readonly string[];
  maxLength?: number;
  onChange(value: string | null): void;
};

type GalleryItemsControlProps = {
  label: string;
  value: readonly PageGalleryItemV2[];
  categoryTokens: readonly string[];
  parentScopeKey: string;
  onChange(value: PageGalleryItemV2[]): void;
};

type GalleryCategoryTokensControlProps = {
  label: string;
  value: readonly string[];
  onChange(value: string[]): void;
};
```

`MediaUrlControl` preserves the current `ToolbarMediaUrlField` URL-storage contract:
a stored URL maps to a picker ID for display only; selection resolves the matching
`MediaRecord.url`; clear emits `null`, never `""`. `scopeKey` is a required stable
identity assembled by L03 from target kind + target ID + control ID (use an
unambiguous tuple encoding, not delimiter-concatenated author strings). PageEditor
keys the control by that scope so changing targets remounts it even when both targets
hold the same URL.

`maxLength` is an optional commit guard, not a rendering transform. When it is
present, a resolved `MediaRecord.url` may reach `onChange` only when
`url.length <= maxLength`; an over-limit selection is rejected without an
`onChange` call or replacement value. Clear still emits `null`. Never slice,
normalize, or otherwise mutate the incoming `value` to satisfy the bound: an
already-stored over-limit value remains byte-identical in the readout and can be
cleared explicitly. Generic media fields leave `maxLength` unset unless their owner
contract provides one.

Own one request-generation ref. Advance it on every selection or clear intent and
invalidate the captured generation on `value`, `scopeKey`, or callback-target
replacement and in unmount cleanup. An async media-list completion may call the
captured callback only when its generation and captured scope still equal the live
values. A rejected/older request is non-mutating. This prevents a pending request
from one selected block/section from committing to the replacement callback target.
Never persist an asset ID.

Gallery rows edit only `src`, `alt`, `caption`, and optional space-joined `category`.
Add appends exactly `{src:"",alt:"",caption:""}` and that canonical draft row remains
in component state/output until the user removes it; the control must not silently
drop an empty draft. Import the model-owner constants rather than mirror numbers:
`PAGE_GALLERY_ITEMS_MAX`, `PAGE_GALLERY_SRC_MAX`, `PAGE_GALLERY_ALT_MAX`,
`PAGE_GALLERY_CAPTION_MAX`, `PAGE_GALLERY_CATEGORY_TOKEN_MAX`,
`PAGE_GALLERY_CATEGORY_TOKENS_MAX`, and `PAGE_GALLERY_CATEGORY_MAX`. Disable Add at
120 rows and never emit row 121. Pass
`maxLength={PAGE_GALLERY_SRC_MAX}` to each row's `MediaUrlControl` and independently
guard the row source commit: `null` maps explicitly to canonical `src:""`, a string
of at most 2,048 characters replaces `src`, and a 2,049-character value is
non-mutating. This second guard keeps the row contract intact even if a caller
invokes its callback without the picker. Set the alt input `maxLength` to 500 and
caption input `maxLength` to 2,000 as browser UX only. Their commit handlers must
independently reject alt values above `PAGE_GALLERY_ALT_MAX` and caption values above
`PAGE_GALLERY_CAPTION_MAX` without calling `onChange` or changing the prior row.
Likewise, the source callback must independently reject a string above
`PAGE_GALLERY_SRC_MAX`; an HTML `maxLength` or picker prop is never the contract
boundary. Do not silently truncate any caller-supplied `src`, `alt`, or `caption`
during render. Edits clone only the chosen row. Unknown object keys are never copied.

`parentScopeKey` is required and comes from L03's collision-safe serialized tuple
`JSON.stringify([targetKind,targetId,control.id])`. GalleryItemsControl owns a non-persisted,
monotonic row identity for every mounted row. The identity is immutable for that row,
is never the array index or authored content, and surviving rows retain it when an
earlier row is removed. Add allocates a new identity; remove deletes only the chosen
identity; the product has no reorder path. Reconcile controlled value length without
re-keying surviving rows, and never write the identity into `PageGalleryItemV2`.
Derive each media scope from another unambiguous tuple encoding
`JSON.stringify([parentScopeKey,rowIdentity])`. Key the row wrapper by
`rowIdentity`, and use the derived scope as both `MediaUrlControl.scopeKey` and that
control's React `key`/remount boundary. A parent-scope
replacement therefore invalidates every pending row request even when the new target
has the same items/URLs, while removing row 1 cannot transfer row 2's pending request
to the new array index 0.

```ts
const rowIdentitiesRef = useRef(value.map(() => allocateMonotonicRowIdentity()));

function appendItem(): void {
  rowIdentitiesRef.current.push(allocateMonotonicRowIdentity());
  commit([...value, {src: "", alt: "", caption: ""}]);
}

function removeItem(index: number): void {
  rowIdentitiesRef.current.splice(index, 1);
  commit(value.filter((_, itemIndex) => itemIndex !== index));
}

const rowIdentity = rowIdentitiesRef.current[index];
const rowMediaScopeKey = JSON.stringify([parentScopeKey, rowIdentity]);
```

The real implementation may avoid in-place ref-array operations, but must preserve
the same identity transitions. On a parent-scope change, do not reuse the old
`MediaUrlControl` key even when every row byte is equal.

Category tokens use the owner `GALLERY_CATEGORY_PATTERN` and all owner bounds above:
each token is at most 48 characters, the ordered first-occurrence unique list is at
most 12 tokens, and a space-joined category is at most 587 characters. Trim and
reject an invalid/new duplicate rather than sort or silently replace an existing
token. Disable any add path once 12 tokens are present. Item category assignments
not present in the current token list remain visible and preserved on mount and
unrelated field edits; reconcile them only when the user explicitly edits that
row's categories. Explicit row-category edits use the same ordered unique/pattern/
count/combined-string contract. Empty categories omit the item key. No mount-time
`onChange`.

Rows/buttons have deterministic one-based accessible names and
`data-page-editor-gallery-item`. Keep keyboard focus usable after add/remove. Do not
add drag/reorder.

## Security and compatibility

Components are not validation boundaries. They emit canonical typed data for the
strict normalizer, expose no media metadata/secrets, introduce no localStorage, and
render unmatched URLs/tokens as clearable values without trusting them. The existing
media-list request remains an internal session-cookie-authenticated Admin read; this
leaf adds no route, RBAC, CSRF, rate-limit, public-write, nonce/HMAC, or captcha
contract. Scope/generation checks are client-side stale-write protection, not an
authorization substitute.

The component suites cover exact 2,048/2,049 source URLs from both a selected
`MediaRecord` and the gallery row callback, plus the exact 120/121, 500/501,
2,000/2,001, 48/49, 12/13, and 587/588 boundaries. They prove that 2,048 commits,
2,049 emits nothing and preserves the prior row; direct alt 501 and caption 2,001
commit attempts likewise emit nothing and preserve the prior row even when the event
is dispatched past the HTML input constraint. An incoming over-limit value is
rendered byte-for-byte rather than truncated, and clear remains available.
Also cover `null`→`src:""` row mapping; same URL under two different target scopes;
callback-target replacement; selection/clear races; rejected requests; and an
unmounted control whose pending request resolves later. Remove the first of two rows
while the second row has an unresolved selection, then resolve it and prove it still
targets the surviving row identity; replace `parentScopeKey` with an equal-URL value
pending and prove the old row control remounts and emits zero stale writes. Assert
zero stale `onChange` calls and zero mount-time normalization writes.

## Validation and line receipt

Known cross-leaf type transient (inherited from TASK-539-03-L01): the contract-
mandated `PageEditorControlUiModel` union widening makes the L03-owned
`core/admin/ui/pages/editor/PageEditorRegistryFields.tsx` default branch fail
`lint:types` (TS2322 at ~:776) until L03 lands its render branches for
`{kind:"galleryItems"}` / `{kind:"galleryCategoryTokens"}`. That single error is
the L03-owned file, not a defect of this leaf. The gate below is green apart from
that one documented transient, which must be resolved (lint:types fully green)
once L03 lands, before any combined gate.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/ui/page-editor-media-url-control.test.tsx \
  tests/vitest/ui/page-editor-gallery-items-control.test.tsx \
  tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx
bun --cwd core build:admin
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

All three new components and three new suites must exist before the gate; the index
must expose explicit named exports. Every human-authored file must be at most 1,000
lines and every suite independently runnable. Rerun a named failure alone.
