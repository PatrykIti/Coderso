# TASK-488-01-L02: Variant editor card UI
# FileName: TASK-488-01-L02-Variant-Editor-Card-UI.md

**Parent Subtask:** TASK-488-01
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-488-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Render a "Variants" card in `CommerceEditorSections.tsx` that lets an
  author add, edit, reorder-free list, set-default, and remove variants, plus
  edit per-variant SKU, title, pricing (amount / currency / compare-at), stock
  (state / quantity), and string attributes. The card mutates `draft.variants`
  only via the L01 helpers and reports changes through the existing
  `onChange(patch)` prop, so the editor's dirty-state, snapshot/discard, and
  save round-trip work with zero changes to `CommerceEditorPage`.
- **Owning module(s) to create-or-extend:**
  `core/admin/ui/commerce/components/CommerceEditorSections.tsx` (extend) and,
  if the card grows large, a new
  `core/admin/ui/commerce/components/CommerceVariantsCard.tsx` rendered by it.
  Also extend `commerceEditorModel.ts` `toCommerceProductInput` to call
  `serializeDraftVariants` (per L01).
- **Source-of-truth docs:** `_docs/CMS_API.md` (Commerce v1 — variant shape),
  `_docs/CMS_SPEC.md` (Commerce v1 scope).
- **Out-of-scope:** Variant model/business logic (owned by L01); collections UI
  (TASK-488-02); any backend change; media/image picker for variants.

### Verified current state

- `CommerceEditorSections` props are `{ draft: CommerceProductDraft;
  onChange: (patch: Partial<CommerceProductDraft>) => void }`. It currently
  renders Identity / Pricing / Stock `<Card>`s using `@/components/ui/*`
  (`Card`, `Input`, `Select`, `Textarea`) — reuse the same primitives so it
  inherits TASK-479 styling.
- `CommerceEditorPage.patchDraft` already sets `hasUnsavedChanges` and clears
  `success` on every patch; `cloneDraft` already deep-clones variants. So the
  card only needs to emit `onChange({ variants: nextVariants })`.
- Available primitives confirmed in repo: `Card/CardContent/CardHeader/
  CardTitle`, `Input`, `Select*`, `Textarea`, `Button`, `Checkbox`, `Badge`.

## Security Contract

- **Endpoint visibility:** internal (`/admin/api/commerce/products[/:id]`) —
  reused, not added. This leaf adds no route.
- **Auth model:** session-based admin; the product write path is
  `requirePermission("commerce:write")` (read view gated `commerce:read`).
- **RBAC:** create/update of a product carrying variants → `commerce:write`
  (existing). Viewing the editor → `commerce:read` (existing route registration
  in `AdminApp.tsx`).
- **CSRF:** required on internal writes — already attached by `commerceClient`
  (`createCommerceProduct`/`updateCommerceProduct` pass `{ withCsrf: true }`).
  No change.
- **Rate-limit bucket:** n/a — no new endpoint; inherits the admin API bucket
  of the existing product write routes.
- **Validation:** Schema owner unchanged: server `commerceVariantSchema`
  (`additionalProperties: false`, reject-unknown) + `normalizeVariant`. Client
  shaping via L01 `serializeDraftVariants` keeps payloads schema-valid.
- **Anti-abuse:** n/a — authenticated internal admin write, no public/anonymous
  surface, so no nonce/HMAC/CAPTCHA evaluators apply.
- **Secret/PII handling:** variant fields carry no secrets/PII; no new logging
  or cache keys introduced (reuses the existing product detail/list cache).

## Implementation Pseudocode

```tsx
// CommerceEditorSections.tsx — new card appended after the Stock card
import {
  addVariant, removeVariantAt, updateVariantAt, setDefaultVariantAt,
  setVariantAttribute, removeVariantAttribute, renameVariantAttributeKey,
  parseIntegerOrNull, // existing module helper (commerceEditorModel.ts:27);
                      // currently a module-local `const` — export it for reuse here
                      // rather than reinventing a local int parser.
} from "../commerceEditorModel";

function VariantsCard({ draft, onChange }: Props) {
  const variants = draft.variants;
  const emit = (next: CommerceVariant[]) => onChange({ variants: next });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Variants</CardTitle>
        <Button variant="outline" size="sm"
          onClick={() => emit(addVariant(variants, draft.pricingCurrency))}>
          Add variant
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No variants. The base product price/stock applies. Add a variant to
            offer SKU-level pricing, stock, and attributes.
          </p>
        ) : variants.map((variant, index) => (
          <div key={variant.id ?? index} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Input value={variant.title} placeholder="Variant title"
                onChange={(e) => emit(updateVariantAt(variants, index, { title: e.target.value }))} />
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={variant.isDefault}
                  onCheckedChange={(c) => emit(c === true
                    ? setDefaultVariantAt(variants, index)
                    : updateVariantAt(variants, index, { isDefault: false }))} />
                Default
              </label>
              <Button variant="ghost" size="icon"
                onClick={() => emit(removeVariantAt(variants, index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Input value={variant.sku ?? ""} placeholder="SKU (optional)"
              onChange={(e) => emit(updateVariantAt(variants, index, { sku: e.target.value || null }))} />

            {/* pricing: amount / currency / compareAt — numeric inputmode.
                Reuse the existing module helper parseIntegerOrNull
                (commerceEditorModel.ts:27; returns number|null, floors, rejects
                negatives) with `?? 0`, mirroring the base-product amount mapping
                (commerceEditorModel.ts:94 `parseIntegerOrNull(...) ?? 0`);
                compareAtAmount keeps the nullable result (no `?? 0`). */}
            <Input value={String(variant.pricing.amount)} inputMode="numeric"
              onChange={(e) => emit(updateVariantAt(variants, index, {
                pricing: { ...variant.pricing, amount: parseIntegerOrNull(e.target.value) ?? 0 } }))} />
            {/* currency + compareAtAmount inputs analogous */}

            {/* stock: state Select + quantity Input */}
            <Select value={variant.stock.state}
              onValueChange={(state) => emit(updateVariantAt(variants, index, {
                stock: { ...variant.stock, state: state as CommerceStockState } }))}>
              {/* in_stock / out_of_stock / backorder */}
            </Select>

            {/* attributes: key/value rows + add/remove using L01 helpers */}
            <AttributesEditor
              attributes={variant.attributes}
              onSet={(k, v) => emit(setVariantAttribute(variants, index, k, v))}
              onRemove={(k) => emit(removeVariantAttribute(variants, index, k))}
              onRenameKey={(prev, next) => emit(renameVariantAttributeKey(variants, index, prev, next))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

```ts
// commerceEditorModel.ts — wire serialization (from L01) into the existing mapper
export const toCommerceProductInput = (draft: CommerceProductDraft): CommerceProductInput => ({
  /* ...existing fields... */
  variants: serializeDraftVariants(draft.variants), // was: draft.variants
});
```

**Data flow:** user edits a field → card calls an L01 helper → `onChange({
variants })` → `CommerceEditorPage.patchDraft` flags dirty → on Save
`toCommerceProductInput` → `serializeDraftVariants` → `createCommerceProduct`/
`updateCommerceProduct` (CSRF) → server validate/persist → `applyProduct`
re-hydrates the draft from the saved record (variants round-trip back).

**Error handling:** field handlers are pure (no throw). Server rejections (e.g.
`commerce_variant_sku_invalid` → 400 via `mapCommerceError`) surface through the
editor's existing `error` Alert with `isApiClientError(error)?.message`. The
"Default" checkbox enforces single-default at the UI layer via
`setDefaultVariantAt`.

**Regression-test shape:**

- UI render (Vitest, `tests/vitest/ui/commerce-page.test.tsx`): editor in create
  mode renders the "Variants" card and the "Add variant" affordance.
- UI interaction (Vitest, `tests/vitest/ui-integration/`): add a variant →
  a row appears; type a title/sku → state updates; toggle Default on a second
  variant → first variant's Default clears; remove → row disappears; assert the
  `onChange` payload (or rendered output) reflects the L01 helper results.

## Testing Requirements

- **Lane:** Vitest. Render assertion in `tests/vitest/ui/commerce-page.test.tsx`
  via the SSR `renderAdminUi` helper (static markup — no effects/clicks).
  Interaction test in `tests/vitest/ui-integration/commerce-variant-editor.test.tsx`
  using this repo's real interactive harness: a `// @vitest-environment happy-dom`
  file docblock with `createRoot` (`react-dom/client`) mounted inside `React.act`
  and native `dispatchEvent` for clicks/typing (this repo has **no**
  `@testing-library/react` / `render` / `fireEvent`; see
  `custom-screen-record-interactions.test.tsx`).
- Verify the save payload uses `serializeDraftVariants` (blank-title variant is
  dropped, currency uppercased).
- No DB changes → no migration artifacts.
- Green under `bun run lint`, `bun run typecheck`, Vitest suite.
