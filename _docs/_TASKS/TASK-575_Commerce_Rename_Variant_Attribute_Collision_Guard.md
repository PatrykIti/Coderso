# TASK-575: Commerce Rename Variant Attribute Collision Guard

**Status:** ⏳ To Do
**Started:**
**Completed:**
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

- Refuse the rename when the target key is occupied (inline message), or require
  an explicit merge choice/confirm.
- Normalize names before comparison (cover collisions after trim).
- Add a model test pinning behavior for an already-existing key.

## Fix Strategy

```ts
const normalized = nextKey.trim();
if (normalized !== nextKey && variant[normalized] !== undefined) return { ok: false, code: "attribute_key_collision" };
if (variant[nextKey] !== undefined && nextKey !== prevKey) return { ok: false, code: "attribute_key_collision" };
```

## Security Contract

- No endpoint change; editor-model-only. Serialization/normalization stays
  server-authoritative.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest `commerceVariantModel.test.ts` extended with the collision case
  (including trim-collision).
