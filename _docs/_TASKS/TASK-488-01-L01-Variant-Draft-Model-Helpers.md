# TASK-488-01-L01: Variant draft model helpers
# FileName: TASK-488-01-L01-Variant-Draft-Model-Helpers.md

**Parent Subtask:** TASK-488-01
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add pure, immutable model helpers for variant mutation and
  serialization to `core/admin/ui/commerce/commerceEditorModel.ts`, so the
  variant editor card (TASK-488-01-L02) holds no business logic. Helpers cover:
  create empty variant, add, update-by-index, remove-by-index, set-single-
  default, attribute add/edit/remove/rename, and a `serializeDraftVariants`
  used by `toCommerceProductInput` to trim and drop blank-title rows before they
  hit the server schema.
- **Owning module(s) to create-or-extend:**
  `core/admin/ui/commerce/commerceEditorModel.ts` (extend).
- **Source-of-truth docs:** `_docs/CMS_API.md` (Commerce v1 preview — product
  payload shape, `variants`), `_docs/CMS_SPEC.md` (Commerce v1 scope).
- **Out-of-scope:** Any React/rendering code (that is L02); any backend or
  schema change. The server already owns canonical normalization
  (`commerceService.normalizeVariant`); these helpers only shape the *draft* and
  produce a clean `CommerceProductInput.variants` array.

### Verified current state

- `CommerceVariant` (`commerceClient.ts`): `{ id?: string; sku: string | null;
  title: string; pricing: CommerceMoney; stock: CommerceStock; attributes:
  Record<string,string>; isDefault: boolean }`.
- `CommerceProductDraft.variants: CommerceVariant[]` already exists;
  `draftFromCommerceProduct` hydrates `item.variants ?? []`;
  `toCommerceProductInput` already spreads `variants: draft.variants` straight
  through (no trim/normalize today).
- `CommerceEditorPage.cloneDraft` already deep-clones each variant
  (`attributes`/`pricing`/`stock`), so discard/snapshot already works once the
  card mutates `draft.variants` immutably.
- Server schema: `commerceVariantSchema` requires `title` (minLength 1); `sku`
  is `string|null` (maxLength 128); `attributes` keys must match
  `^[a-zA-Z0-9_.-]+$` (maxLength 200, max 50 props); `pricing`/`stock` reuse the
  money/stock schemas; `variants` array max 100.

## Security Contract

- **Endpoint visibility:** n/a — pure client model module, no route added.
- **Auth model:** n/a (no I/O). Serialized output is consumed by the existing
  `POST /admin/api/commerce/products` and `PATCH /admin/api/commerce/products/:id`
  routes, both `requirePermission("commerce:write")` and CSRF-wrapped by
  `commerceClient` (`{ withCsrf: true }`) — unchanged by this leaf.
- **RBAC:** n/a here; enforced by the unchanged product write routes.
- **CSRF:** n/a here; already applied at the `commerceClient` write boundary.
- **Rate-limit bucket:** n/a (no new endpoint).
- **Validation:** Schema owner is unchanged — server `commerceVariantSchema`
  (`reject-unknown` via `additionalProperties: false`) plus
  `commerceService.normalizeVariant`. This leaf's `serializeDraftVariants`
  performs *defensive client shaping only* (trim `title`/`sku`, drop blank-title
  rows, drop blank attribute keys/values) so the UI never POSTs a payload the
  server would 400; it is not the source of truth.
- **Anti-abuse:** n/a — internal admin write, not a public/anonymous surface.
- **Secret/PII handling:** none — variant data (title/sku/price/stock/attrs)
  contains no secrets or PII; nothing is logged or cached beyond the existing
  product cache seam.

## Implementation Pseudocode

```ts
// commerceEditorModel.ts (additions)
import type { CommerceVariant } from "@/services/commerceClient";

export const createEmptyVariant = (currency: string): CommerceVariant => ({
  sku: null,
  title: "",
  pricing: { amount: 0, currency: currency || "USD", compareAtAmount: null },
  stock: { state: "in_stock", quantity: null },
  attributes: {},
  isDefault: false,
});

export const addVariant = (variants: CommerceVariant[], currency: string) =>
  [...variants, createEmptyVariant(currency)];

export const updateVariantAt = (
  variants: CommerceVariant[],
  index: number,
  patch: Partial<CommerceVariant>
): CommerceVariant[] =>
  variants.map((v, i) => (i === index ? { ...v, ...patch } : v));

export const removeVariantAt = (variants: CommerceVariant[], index: number) =>
  variants.filter((_, i) => i !== index);

// exactly one default: setting one clears the others
export const setDefaultVariantAt = (variants: CommerceVariant[], index: number) =>
  variants.map((v, i) => ({ ...v, isDefault: i === index }));

export const setVariantAttribute = (
  variants: CommerceVariant[],
  index: number,
  key: string,
  value: string
) =>
  updateVariantAt(variants, index, {
    attributes: { ...variants[index].attributes, [key]: value },
  });

export const removeVariantAttribute = (
  variants: CommerceVariant[],
  index: number,
  key: string
) => {
  const next = { ...variants[index].attributes };
  delete next[key];
  return updateVariantAt(variants, index, { attributes: next });
};

export const renameVariantAttributeKey = (
  variants: CommerceVariant[],
  index: number,
  prevKey: string,
  nextKey: string
) => {
  const attrs = variants[index].attributes;
  if (prevKey === nextKey || !(prevKey in attrs)) return variants;
  const { [prevKey]: moved, ...rest } = attrs;
  return updateVariantAt(variants, index, { attributes: { ...rest, [nextKey]: moved } });
};

// shape draft variants into a server-safe array (trim, drop blanks, normalize attrs)
export const serializeDraftVariants = (variants: CommerceVariant[]): CommerceVariant[] =>
  variants
    .map((v) => {
      const attributes: Record<string, string> = {};
      for (const [k, val] of Object.entries(v.attributes)) {
        const key = k.trim();
        const value = typeof val === "string" ? val.trim() : "";
        if (key && value) attributes[key] = value;
      }
      return {
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku && v.sku.trim() ? v.sku.trim() : null,
        title: v.title.trim(),
        pricing: { ...v.pricing, currency: (v.pricing.currency || "USD").toUpperCase() },
        stock: v.stock,
        attributes,
        isDefault: Boolean(v.isDefault),
      } satisfies CommerceVariant;
    })
    .filter((v) => v.title.length > 0); // server requires non-empty title

// Audit M2 fix: this leaf OWNS the `parseIntegerOrNull` export consumed by
// the variant editor card (L02 imports it; L01 is the single writer).
export const parseIntegerOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(parsed) ? parsed : null;
};
```

**Data flow:** card mutates `draft.variants` only through these helpers →
`toCommerceProductInput` is updated to call `serializeDraftVariants(draft.variants)`
instead of passing `draft.variants` raw → existing `createCommerceProduct` /
`updateCommerceProduct` client wrappers POST/PATCH the clean payload → server
`commerceVariantSchema` + `normalizeVariant` validate/persist.

**Error handling:** these helpers never throw (pure transforms). Server-side
domain errors continue to surface via the existing route boundary mapping
(`mapCommerceError`, e.g. an over-long `sku` → `commerce_variant_sku_invalid`
→ 400) and are rendered by the editor's existing `error` Alert. The client
shaping defensively trims/normalizes well-formed inputs before they reach (a malformed key still 400s server-side — audit L3) that path.

**Regression-test shape:**

- Unit/domain (Vitest): `createEmptyVariant` defaults & currency fallback;
  `addVariant` length grows; `updateVariantAt`/`removeVariantAt` immutability
  (originals untouched); `setDefaultVariantAt` clears all other defaults;
  attribute add/edit/remove/rename; `serializeDraftVariants` trims title/sku,
  uppercases currency, drops blank-title rows, and drops blank attribute
  keys/values.

## Testing Requirements

- **Lane:** Vitest (`tests/vitest/`) — pure TS, no DOM/route/DB dependency.
- New file: `tests/vitest/admin/commerceVariantModel.test.ts` (or extend an
  existing commerce model spec) covering every helper and edge case above.
- No DB changes → no migration artifacts.
- Must pass under `bun --cwd core lint:types` and the Vitest suite.
