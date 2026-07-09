# TASK-534-04-L01: Switcher Tabs Control (`props.tabs` editor + variant + activeIndex)

# FileName: TASK-534-04-L01-Switcher-Tabs-Control.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-04
**Priority:** High
**Category:** Admin UI / Content (Pages)
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Adds the `pageBlockControlRegistry.switcher` per-type control array
(labelled `// ── TASK-534 ──` region) in
`core/services/pages/pageEditorControlRegistry.ts`. Controls: the tab-label list editor
(add/remove/reorder labels → `props.tabs`), the `variant` segmented (`pill`/`underline`),
and `activeIndex` (default-active tab). Panel bodies (child blocks per `panel:N` slot) are
edited on the CANVAS via the existing slot-child authoring path (no dedicated control).
Reproduces the prototype barn/villa/eco switcher authoring.

**Firm decision on the tabs control kind (resolved 2026-07-09): REUSE `"items"` with a
DEFENSIVE `href`-tolerant switcher tab normalizer.** The `"items"` kind resolves to
`{ kind: "listItems" }` (`pageEditorControlUiModel.ts:407-408`), whose editor commits
`PageListItemV2` shapes = `string | { label, href }` — it can emit a `{label, href}` row
(with an empty or set `href`). The switcher tab schema is `{ label:string }` with
`additionalProperties:false` + `required:["label"]` (534-01-L01), so a `{label, href}` row
would be a schema violation IF it reached the schema unchanged. It does NOT, because the
534-01-L01 switcher-tabs normalizer REBUILDS each tab as a NEW `{ label: readText(...) }`
object (reading ONLY `label`, discarding `href` and every other key) BEFORE the document
is schema-validated (the compiled `pageDocumentV2JsonSchema` is asserted against the
NORMALIZED doc, not the raw editor draft). So reusing `"items"` is SAFE: a `{label,href}`
editor row normalizes to `{label}` on save and passes `additionalProperties:false`. This
leaf REQUIRES that defensive normalizer behavior (a test pins it) and does NOT add a
`switcherTabs` kind. (If a future audit finds the listItems editor cannot commit rows at
all without an href AND the normalizer rebuild were ever removed, the minimal
`switcherTabs` kind below is the fallback — but the default path is "reuse items +
href-tolerant normalizer".)

## Grounded anchors

- `pageBlockControlRegistry` `:947` (the per-type `Record<PageBlockType,…>`;
  `customSvg` entry `:1314-1337` is the exact add precedent; `gallery: []` `:1065`).
- `blockPropControl(type, key, { label, input, panel?, options?, clamp?, unit? })`
  helper (used throughout, e.g. customSvg `:1315`).
- `PageEditorControlInput` union `pageEditorControlRegistry.ts:67-89` (NOT
  `pageEditorControlUiModel.ts` — that file holds the DIFFERENT `PageEditorControlUiModel`
  union at `:43`; the line overlap is coincidental). The `"items"` kind
  (`pageEditorControlRegistry.ts:81`, structured list-items — label + optional href; the
  `"switch"` member is `:72`) maps to `{ kind: "listItems" }`
  (`pageEditorControlUiModel.ts:407-408`), which commits `PageListItemV2` = `string |
  {label, href}`. A tab list is label-ONLY; the switcher tab schema is `{label}` with
  `additionalProperties:false`. REUSE `"items"` because the 534-01-L01 switcher-tabs
  normalizer rebuilds each tab as a fresh `{label}` (dropping `href`) BEFORE schema
  validation runs on the normalized doc — so a `{label,href}` editor row is safe. The
  normalizer's `href`-tolerance is the load-bearing guarantee; a test pins it.
- `switcherVariants` / `SWITCHER_MAX_PANELS` from 534-01-L01 (read-only import;
  append to the append-only import block).

## Implementation pseudocode

```ts
// ── TASK-534 ── switcher per-type controls (pageBlockControlRegistry, customSvg pattern)
switcher: [
  blockPropControl("switcher", "tabs", {
    label: "Tabs",
    input: "items",          // REUSE listItems; the 534-01-L01 normalizer rebuilds each
                             // tab as {label} (drops href) BEFORE schema validation, so a
                             // {label,href} editor row is safe against additionalProperties:false.
    panel: "content",
  }),
  blockPropControl("switcher", "variant", {
    label: "Style",
    input: "segmented",
    panel: "style",
    options: switcherVariants,   // ["pill","underline"]
  }),
  blockPropControl("switcher", "activeIndex", {
    label: "Default tab",
    input: "number",
    panel: "content",
    clamp: { min: 0, max: SWITCHER_MAX_PANELS - 1 },
  }),
],

// ── (only if "items" is unsuitable) new UI kind — TWO files:
//   pageEditorControlRegistry.ts (union :67-89):  PageEditorControlInput (+): | "switcherTabs"
//   pageEditorControlUiModel.ts  (union :43-87):  PageEditorControlUiModel (+): | { kind: "switcherTabs"; max: number }
//   pageEditorControlUiModel.ts  (resolve switch, near :407):
//     case "switcherTabs": return { kind: "switcherTabs", max: SWITCHER_MAX_PANELS };
//   + a control component in core/admin/ui/pages/editorControls/SwitcherTabsControl.tsx
//     (add/remove/reorder label rows; commits [{label}] arrays).
```

**Decision (resolved):** reuse `"items"`. The listItems editor may commit `{label,href}`
rows, but the 534-01-L01 switcher-tabs normalizer rebuilds each tab as `{label}` (dropping
`href`) before the normalized doc is schema-validated, so `additionalProperties:false` +
`required:["label"]` are satisfied. The `switcherTabs` kind is the fallback ONLY if that
normalizer guarantee is ever removed. Do NOT over-build.

## Security note

No new attacker surface at the control layer — controls only produce values that
re-flow through the 534-01-L01 write normalizer (`normalizeEnum` fail-closed for
`variant`, clamp for `activeIndex`, label-string clamp + escape for `tabs[].label`).
The control does NOT bypass normalization; the editor draft is re-normalized on
save (`normalizePageDocumentV2ForWrite`). Tab labels remain escaped text at render
(534-02-L01). The `activeIndex` clamp mirrors the write clamp.

## Test lane

**Vitest** (`tests/vitest/pages/page-editor-control-registry.test.ts` — the
existing control-registry suite) — delegated to 534-04-L04, asserted here: the
`switcher` type resolves controls including a `tabs` `items`/`listItems` control, a
`variant` segmented over `switcherVariants`, and a clamped `activeIndex`; the UI
model maps `tabs` to `{ kind: "listItems" }`. **Schema-safety test (pins the reuse
decision):** a switcher whose `tabs` come in as `[{label:"A",href:"/x"}]` (the shape the
listItems editor can commit) normalizes to `[{label:"A"}]` and the normalized doc PASSES
`ajv.compile(pageDocumentV2JsonSchema)` (i.e. `additionalProperties:false` +
`required:["label"]` on the tab object does NOT throw) — the regression guard that
reusing `"items"` cannot hard-fail authoring.

## Regression / owned-breaking-test notes

- **Owned:** `page-editor-control-registry.test.ts` may assert the full per-type
  registry / count — ADD the `switcher` cases (customSvg-pattern precedent updated
  the same suite). If a new `PageEditorControlInput`/`PageEditorControlUiModel`
  member is added, the UI-model exhaustive-switch test OWNS the new case (typecheck
  will force it).

## Hard Invariants

1. Controls produce values re-normalized on save (no normalization bypass).
2. Reuse `"items"` (`listItems`) for `tabs`; the 534-01-L01 normalizer rebuilds each tab
   as `{label}` (drops `href`) so a `{label,href}` editor row passes the switcher schema's
   `additionalProperties:false` — pinned by a schema-safety test. `switcherTabs` is a
   fallback kind only, not the default.
3. `activeIndex` clamp mirrors the write clamp; `variant` segmented over the enum.
