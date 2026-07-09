# TASK-533-01-L03: Editor Controls — Block `colSpan`/`rowSpan` + Section `columnTemplate`

# FileName: TASK-533-01-L03-Grid-Span-Ratio-Controls.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-01
**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Add editor controls (in labelled `TASK-533` regions of
`core/services/pages/pageEditorControlRegistry.ts`) for the 533-01 fields:
- `block.style.colSpan`, `block.style.rowSpan` — number inputs mirroring
  `block.style.column`.
- `section.style.columnTemplate` — a text/preset control (see UI-kind note).

## Grounded anchors (RE-GREP at implement time)

- **`pageUniversalBlockControls`** — `pageEditorControlRegistry.ts:449`. Precedent
  numeric block controls: `block.style.borderWidth` (`:556-565`, `input:"number"`,
  `clamp: PAGE_BLOCK_BORDER_WIDTH_CLAMP`, `fallback:0`), the per-edge padding/margin
  factory (`:577-602`). Append the span controls at the END of the array.
- **`pageUniversalSectionControls`** — `pageEditorControlRegistry.ts:225`. Precedent:
  `section.layout.columns` (`:226-235`, `input:"number"`, `clamp:{min:1,max:4}`),
  `section.layout.maxWidth` (`:236-245`). Append `section.style.columnTemplate` at
  the END.
- **`control(...)` factory** — `pageEditorControlRegistry.ts:~200-223` (builds the
  descriptor; `unit`/`fallback`/`clamp` optional). Import `PAGE_BLOCK_SPAN_CLAMP`
  from `pageDocumentV2.ts` (533-01-L01) for the span clamp.
- **Control kinds** — `core/services/pages/pageEditorControlUiModel.ts` (the
  `input:` kinds: `"number"`, `"select"`, `"segmented"`, `"color"`, `"toggle"`,
  `"media"`, `"text"` if present). `columnTemplate` needs a STRING input. If a
  `"text"` (or `"select"` with ratio presets) kind already exists, REUSE it; only
  add a new UI kind if grounding shows none fits (prefer a `"select"` of curated
  safe presets — `"1fr 1fr"`, `"1.15fr .85fr"`, `"1fr 1.2fr"`, `"1fr .95fr"`,
  `"minmax(0,1fr) minmax(420px,.9fr)"` — which also naturally constrains the value
  to sanitizer-passing strings; a free-text input is acceptable but the value is
  re-sanitized at the write boundary regardless).

## Implementation pseudocode

```ts
// pageUniversalBlockControls — append (TASK-533 region)
control({
  id: "block.style.colSpan",
  panel: "layout", target: "block", label: "Column span",
  path: ["style", "colSpan"],
  input: "number", responsive: true,
  clamp: PAGE_BLOCK_SPAN_CLAMP,   // {min:1,max:4}
  // no fallback → unset shows empty (present-only; not "1")
}),
control({
  id: "block.style.rowSpan",
  panel: "layout", target: "block", label: "Row span",
  path: ["style", "rowSpan"],
  input: "number", responsive: true,
  clamp: PAGE_BLOCK_SPAN_CLAMP,
}),

// pageUniversalSectionControls — append (TASK-533 region)
control({
  id: "section.style.columnTemplate",
  panel: "layout", target: "section", label: "Column ratio",
  path: ["style", "columnTemplate"],
  input: "select",                // curated safe presets (or "text" if that kind exists)
  responsive: false,              // structural; per-breakpoint ratio is not CSS-expressible
  options: ["1fr 1fr", "1.15fr .85fr", "1fr 1.2fr", "1fr .95fr", "minmax(0,1fr) minmax(420px,.9fr)"],
  // unset (no selection) → symmetric grid class fallback (present-only)
}),
```

- Do NOT add a `fallback` that would display a value for an unset field (present-only
  honesty — mirror the owner's opacity/radius fallback fix precedent at `:518-520`).
- If a new `pageEditorControlUiModel.ts` input kind is genuinely needed, add it in a
  labelled `TASK-533` region there and wire a control component under
  `core/admin/ui/pages/editorControls/*`; otherwise REUSE an existing kind.

## Security note

Controls are authoring UI only; no security boundary. The `columnTemplate` value —
whether from a curated `select` or free `text` — is ALWAYS re-sanitized at the write
boundary by `sanitizeAuthoringGridTemplate` (533-01-L01), so a tampered client
payload cannot inject a raw grid string. Curated `select` presets are additionally
guaranteed sanitizer-passing.

## Vitest test lane (authored in 533-01-L04)

Control-registry assertions live with the model tests
(`tests/vitest/pages/*` — control descriptor presence/ids/paths/clamp). Assert the
three new control ids exist with the expected `path` and `clamp`
(`PAGE_BLOCK_SPAN_CLAMP` for spans) and that `columnTemplate` presets are all
accepted by `sanitizeAuthoringGridTemplate`.

## Regression / breaking-test ownership

Additive; no existing control test breaks. If a control-count snapshot exists, that
count delta is an owned update for 533-01-L04 (declared, not drift).

## Hard Invariants

1. Three new control ids: `block.style.colSpan`, `block.style.rowSpan`,
   `section.style.columnTemplate` — correct `path`/`clamp`, present-only (no
   misleading `fallback`).
2. REUSE an existing `input:` kind; add a new UI kind ONLY if none fits (labelled
   `TASK-533` region + component under `editorControls/*`).
3. `columnTemplate` presets are all `sanitizeAuthoringGridTemplate`-passing.
4. Additions in labelled `TASK-533` regions (additive merge).
