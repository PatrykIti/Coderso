# TASK-575: Commerce Rename Variant Attribute Collision Guard

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1297 (pinned)
**Priority:** Low
**Size:** Small

# FileName: TASK-575_Commerce_Rename_Variant_Attribute_Collision_Guard.md

**Parent Task:** none
**Source Findings:** L-488-01 (audit `_TMP-audit-task-488-commerce.md`, verified at HEAD `4e3dab15`)

## Purpose

`renameVariantAttributeKey()` removes `prevKey` and then creates
`{ ...rest, [nextKey]: moved }`. If the variant already has `nextKey`, its value
is silently replaced by the `prevKey` value. Example: `{ color: "red", size:
"L" }` after renaming `color → size` becomes `{ size: "red" }`; `L` is lost.
This is easy to trigger while typing a rename in the editor and is a visible
loss of draft work. Not TASK-9999-eligible: admin-visible draft loss.

## Evidence

- `core/admin/ui/commerce/commerceEditorModel.ts:163-175` — unconditional
  delete-then-set overwrite.

## Scope

- Keep `renameVariantAttributeKey` returning `CommerceVariant[]` (public
  contract used by `CommerceVariantsCard.emit` → `onChange`); do NOT change it
  to `{ok, code}`.
- Add a pure predicate `validateRenameVariantAttributeKey(attrs, prevKey,
  nextKey)` returning a machine-readable result (`{ ok: true } | { ok: false;
  code: "attribute_key_collision" }`) that `AttributesEditor` checks BEFORE
  emitting, so no collision ever mutates draft state.
- `AttributesEditor` renders an inline message from local state when the
  predicate fails (no rename event fired, draft untouched).
- Normalize names before comparison: compute `normalized = nextKey.trim()` once;
  refuse only when `normalized !== prevKey && normalized in attrs` (also covers
  trim collisions; a trim-only rename of the same key is a no-op success).
- Add a model test pinning behavior for an already-existing key and a UI test
  for the inline message.

## Fix Strategy

```ts
// commerceEditorModel.ts — keep the existing rename behavior, guarded:
export const validateRenameVariantAttributeKey = (
  attrs: Record<string, string>, prevKey: string, nextKey: string
): { ok: true } | { ok: false; code: "attribute_key_collision" } => {
  const normalized = nextKey.trim();
  if (normalized !== prevKey && normalized in attrs) {
    return { ok: false, code: "attribute_key_collision" };
  }
  return { ok: true };
};

// renameVariantAttributeKey stays (variants: CommerceVariant[], prevKey, nextKey) => CommerceVariant[]
// and is only called after the predicate passes (or is a no-op on collision).
```

```tsx
// AttributesEditor.tsx — check before emitting:
const result = validateRenameVariantAttributeKey(attributes, prevKey, nextKey);
if (!result.ok) { setCollisionKey(nextKey); return; } // inline message, no emit
onRenameKey(prevKey, nextKey);
```

## Security Contract

- No endpoint change; editor-model-only. Serialization/normalization stays
  server-authoritative.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest `commerceVariantModel.test.ts` extended with the collision case
  (including trim-collision) for `validateRenameVariantAttributeKey` +
  `renameVariantAttributeKey` no-op on collision.
- Vitest UI test for the `AttributesEditor` inline message (no emit on
  collision).
