# TASK-532-01: Typography-Fidelity MODEL + Sanitizer Grammar + Controls + Render

# FileName: TASK-532-01-Typography-Model-Sanitizer-Controls-Render.md

**Parent Task:** TASK-532
**Priority:** High
**Category:** Schema (JSON model) / Admin UI / Site Render / Security
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-07-09

---

## Scope

The single implementation subtask for Bundle B. It delivers all five typography
gaps (fluid font-size, heavier weights, text-transform, eyebrow divider,
text-block textColor) across four shared seam files, every edit fenced inside a
labelled `// ===== TASK-532 … =====` region so parallel bundles 531/533/534 merge
additively. Sole-writer files this subtask owns:

- `core/services/pages/pageAuthoringSanitizers.ts` — a NEW length-grammar region
  (`isSafeAuthoringCssLength` + `sanitizeAuthoringCssFontSize`), disjoint from
  bundle 531's gradient-helper relaxation.
- `core/services/pages/pageDocumentV2.ts` — font-weight enum + css-map extension,
  `fontSizeCustom` / `textTransform` block-style fields + allowlist + normalize +
  JSON schema, divider `width`/`align`/`gradient` props.
- `core/services/pages/pageRendererV2.tsx` — `toPageBlockTypographyStyle` emit,
  `renderTextBlock` rich-path color, `case "divider"` render.
- `core/services/pages/pageEditorControlRegistry.ts` — `pageTypographyBlockControls`
  additions + the `divider` per-type controls.

## Leaves (strict land order within 532-01)

1. **L01** — fluid font-size length grammar (sanitizer) + `fontSizeCustom` model.
2. **L02** — font-weight enum (extrabold/black) + `textTransform` model + eyebrow
   divider props. Owns the enum-membership test re-baseline.
3. **L03** — text-block `textColor` render fix (rich path) + control confirmation.
4. **L04** — controls (registry): `fontSizeCustom`, `textTransform`, extended weight
   options, divider eyebrow controls.
5. **L05** — render emit: typography style (`fontSizeCustom` precedence,
   `textTransform`), divider gradient rule.
6. **L06** — tests (Vitest model/schema/render + behavioral render).

L01→L02→L03 land model, then L04 controls, then L05 render, then L06 tests. L01 and
L02 both edit `pageDocumentV2.ts` disjoint regions (grammar-consuming field vs
enum) — L01 first because L02's `textTransform`/divider reference no L01 symbol but
the fence ordering keeps the file coherent.

## Hard Invariants (inherited from parent)

1. Present-only; post-530 docs byte-identical.
2. No dep / no migration / no schemaVersion bump.
3. `fontSizeCustom` strict grammar; colors via `sanitizeAuthoringCssColor`/
   `sanitizeAuthoringCssBackground`; enums fail-closed.
4. Every shared-file edit inside a labelled `TASK-532` region.
5. Owned enum-membership tests re-baselined for the 4→6 weight growth (L02).
