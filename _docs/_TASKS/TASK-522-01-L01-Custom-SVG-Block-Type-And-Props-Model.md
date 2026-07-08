# TASK-522-01-L01: `customSvg` Block Type + Props Model (Atomic Type-Introduction)

# FileName: TASK-522-01-L01-Custom-SVG-Block-Type-And-Props-Model.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the ONE new `pageBlockType` `"customSvg"` and, in ONE atomic
land (a NEW enum member cannot land half-typed), the minimal stub entry to EVERY
exhaustive `Record<PageBlockType,…>` across the FOUR files (see the full inventory
below — `pageDocumentV2.ts` carries THREE exhaustive records, `pageEditorOptions.ts`
one, `pageEditorControlRegistry.ts` one, and `pageBlockRenderDefaults.ts` one), plus
the block's prop model + normalize + JSON schema. Imports the SVG sanitizer from
522-01-L02 (author L02 first or land together) for the `svg` prop normalize.

**Sole-writer note.** This atomic land is the ONLY 522 edit to
`core/services/pages/pageBlockRenderDefaults.ts` — the `customSvg` stub there is
appended by 522-01-L01 (added to 522-01's owned-region set; see the parent
Coordination guard). All other exhaustive records live in files 522-01 already owns
or documented additive seams.

## Grounded anchors (SYMBOL names authoritative; RE-GREP at implement time — 521 has shifted every line)

> Line numbers below are the post-521 actuals as re-grepped 2026-07-08; 521 landed on
> this branch and moved these ~60-130 lines vs the pre-521 draft. Trust the grep-able
> SYMBOL, not the number; `grep -an` before editing.

- `pageBlockTypes` (`pageDocumentV2.ts:50-72`) — 21 members ending `"group"`.
- `pageBlockPropKeys: Record<PageBlockType, readonly string[]>` (`:660`) —
  EXHAUSTIVE; `icon: ["name","label","animation","size","color","speed"]` (`:698`,
  enriched by 521-04), `group:` last (`:702`).
- `pageBlockDefaultProps: Record<PageBlockType, Record<string, unknown>>` (`:901`) —
  EXHAUSTIVE (non-Partial); consumed at runtime by `normalizeBlockProps` (`:2515-2527`)
  and by the registry's
  `blockPropFallback` (`pageEditorControlRegistry.ts:169`). A missing `customSvg` key
  is BOTH a compile break AND a runtime `pageBlockDefaultProps[type]` undefined on
  insert — MUST be stubbed in this atomic land.
- `pageBlockRenderDefaults: Record<PageBlockType, PageBlockRenderDefaults>`
  (`core/services/pages/pageBlockRenderDefaults.ts:138`) — EXHAUSTIVE (non-Partial);
  the moment `customSvg` joins `pageBlockTypes`, `tsc` fails TS2741 here (missing
  `customSvg` key) UNLESS this land stubs it. This file is added to 522-01-L01's
  sole-writer set for exactly this stub.
- `realRuntimeBlockTypes` Set (`:760`), `editorInsertableBlockTypes` Set (`:788`),
  `pageBlockCapabilityReasons: Partial<Record<…>>` (`:849`, Partial — no stub needed).
- `blockOptionCopy: Record<PageBlockType, Omit<BlockOption,"type">>`
  (`core/admin/ui/pages/editor/pageEditorOptions.ts:85`) — EXHAUSTIVE (compile break
  if missing). The live `BlockOption` type (`:42-46`) is EXACTLY
  `{ type; label: string; description: string }` — there is NO `icon` field; every
  entry is icon-less. Do NOT add an `icon` key (excess-property typecheck error).
- `pageBlockControlRegistry: Record<PageBlockType, readonly PageEditorControlDefinition[]>`
  (`core/services/pages/pageEditorControlRegistry.ts:654`) — EXHAUSTIVE; `icon: []`
  (`:903`).
- Normalizers: `normalizeEnum` (`:1681`, fail-closed write), `readNumber` (`:1676`),
  `readSafeColor` (`:1643`), `assertKnownKeys` (`:1751`).
- **Block-prop normalize architecture (verified live — there is NO per-type props
  function).** `normalizeBlockProps(type,value,mode,path,partial)` (`:2515`) is GENERIC:
  it `assertKnownKeys(input, pageBlockPropKeys[type], …)`, seeds
  `result = partial ? {} : { ...pageBlockDefaultProps[type] }` (`:2525` — so a NON-partial
  normalize ALWAYS carries every default key), then for each known key with
  `input[key] !== undefined` calls `normalizeBlockProp(type, key, …)` (`:2727`) — a FLAT
  `if (type===X && key===Y) return …` dispatch chain. The `customSvg` per-key rules
  (sanitize `svg`, clamp `drawSpeed`, slice `label`, coerce `drawIn`) MUST be appended as
  branches in `normalizeBlockProp`, NOT authored as a monolithic per-type function.
- `pageDocumentV2JsonSchema` block-props schema per type
  (`blockPropJsonSchemaForType`, `:1191`) + strict `additionalProperties:false`.

## Implementation pseudocode

```ts
// (1) pageBlockTypes — append ONE member:
export const pageBlockTypes = [ /* …21 existing… */, "customSvg" ] as const;

// (2) Shared clamps/consts (top-of-file const block, this leaf's region):
export const PAGE_CUSTOM_SVG_MAX_BYTES = 24576 as const;   // 24 KiB
export const PAGE_DRAW_SPEED_CLAMP = { min: 600, max: 6000 } as const;

// (3) pageBlockPropKeys — add the customSvg entry (keeps the Record exhaustive):
customSvg: ["svg","drawIn","drawSpeed","label"],

// (4) Capability sets — make it a real, insertable block:
realRuntimeBlockTypes.add("customSvg");            // (add to the Set literal)
editorInsertableBlockTypes.add("customSvg");        // (add to the Set literal)
// pageBlockCapabilityReasons: Partial — NO entry (block is insertable, no reason).

// (5) Default props — the EXHAUSTIVE pageBlockDefaultProps record (:901) MUST gain a
//     customSvg entry (compile break + runtime undefined-on-insert otherwise):
pageBlockDefaultProps.customSvg = { svg: "", drawIn: false, label: "" };
//     (drawSpeed omitted until authored; empty svg = neutral fallback at render.)

// (5b) Render defaults — the EXHAUSTIVE pageBlockRenderDefaults record
//      (pageBlockRenderDefaults.ts:138) MUST gain a customSvg entry (TS2741 otherwise).
//      customSvg has no baked typography/width defaults distinct from a neutral inline
//      node — stub it with the same neutral frame defaults a decorative block uses
//      (mirror the icon/divider entry shape verified live):
pageBlockRenderDefaults.customSvg = { /* …neutral frame render defaults, mirror `icon` */ };

// (6) normalizeBlockProp: APPEND customSvg per-key branches to the flat dispatch
//     chain (`:2727`). NOT a monolithic per-type function — the generic
//     normalizeBlockProps (`:2515`) already does assertKnownKeys(pageBlockPropKeys
//     .customSvg) + seeds {...pageBlockDefaultProps.customSvg} + loops keys, calling
//     this per known key. Each branch returns the normalized VALUE for that key:
//
//   if (type === "customSvg" && key === "svg") {
//     const raw = typeof value === "string" ? value : "";
//     // sanitizeSvg (522-01-L02): allowlist + tripwires; returns "" on failure.
//     return sanitizeSvg(raw, PAGE_CUSTOM_SVG_MAX_BYTES);      // "" on reject (= default)
//   }
//   if (type === "customSvg" && key === "drawIn") {
//     return value === true;                                    // boolean coerce
//   }
//   if (type === "customSvg" && key === "drawSpeed") {
//     return readNumber(value, 2400, PAGE_DRAW_SPEED_CLAMP.min, PAGE_DRAW_SPEED_CLAMP.max);
//   }
//   if (type === "customSvg" && key === "label") {
//     return typeof value === "string" ? value.slice(0, 160) : "";
//   }
//
// PRESENT-ONLY NOTE: because normalizeBlockProps seeds {...defaults} for a full
// (non-partial) normalize, svg/drawIn/label ALWAYS serialize (carrying their defaults
// "", false, "" when unauthored) — they are NOT omitted. drawSpeed is the ONLY
// present-only prop (it is absent from pageBlockDefaultProps.customSvg, so it appears
// only when authored). Do NOT model svg/drawIn/label as omit-when-empty. This matches
// how every other block type persists its props (all default-seeded), and legacy docs
// stay byte-identical because no legacy doc carries a customSvg block at all.

// (7) blockPropJsonSchemaForType("customSvg", key) — per-prop schema, mirrored into
//     the strict additionalProperties:false block-props schema:
//       svg:       { type: "string", maxLength: PAGE_CUSTOM_SVG_MAX_BYTES }
//       drawIn:    { type: "boolean" }
//       drawSpeed: { type: "number", minimum: 600, maximum: 6000 }
//       label:     { type: "string", maxLength: 160 }
```

### Atomic cross-file stubs (required for typecheck; enriched later)

- **`pageEditorOptions.ts` `blockOptionCopy`** — add a MINIMAL stub so the exhaustive
  Record compiles (522-02-L02 enriches copy). `BlockOption` is `{ type; label;
  description }` with NO `icon` field, so the stub is icon-less (an `icon:` key is a
  TS excess-property error, and there is no `Shapes` lucide import — do NOT invent
  one):
  ```ts
  customSvg: { label: "Custom SVG", description: "Paste a sanitized inline SVG." },
  ```
  Do NOT add a lucide import or an `icon` key. (If a palette glyph is ever wanted, it
  requires first extending `BlockOption` with an optional `icon?: LucideIcon` field +
  the palette renderer as a separate explicit change — out of this leaf's scope; no
  existing entry uses one, so omit it.)
- **`pageEditorControlRegistry.ts` `pageBlockControlRegistry`** — add `customSvg: []`
  (empty stub; 522-02-L02 fills the controls):
  ```ts
  customSvg: [],
  ```

## Regression-test shape (delegated to 522-01-L06, asserted here)

- `pageBlockTypes` contains `"customSvg"`; `pageBlockPropKeys.customSvg` deep-equals
  `["svg","drawIn","drawSpeed","label"]`; `pageBlockDefaultProps.customSvg` deep-equals
  `{ svg:"", drawIn:false, label:"" }`; `pageBlockRenderDefaults.customSvg` is defined
  (no undefined-on-insert); capability report marks `customSvg`
  `editorInsertable:true`, runtime `"real"`.
- Round-trip: a `customSvg` block with a clean SVG + `drawIn:true` + `drawSpeed:2400`
  + `label` normalizes → serializes → re-normalizes identically; svg/drawIn/label
  SERIALIZE WITH THEIR DEFAULTS when unauthored (`svg:""`, `drawIn:false`, `label:""`
  are PRESENT — the default-seeded `{...pageBlockDefaultProps.customSvg}` path, NOT
  omitted); `drawSpeed` is the ONLY present-only prop (absent unless authored);
  `drawSpeed:99999` clamps to 6000; unknown prop `customSvg.props.foo` throws
  `PageDocumentError`; an SVG with `<script>` normalizes to `svg:""` (sanitizer → "",
  which equals the default) — assert `svg === ""`, not "omitted".
- Ajv: the block validates against `pageDocumentV2JsonSchema`
  (`additionalProperties:false`) with the four props; an extra prop rejects.
- **Lane:** Vitest `tests/vitest/pages/page-document-v2.test.ts`.

## Hard Invariants

1. ONE new `pageBlockType`; all exhaustive Records gain exactly one entry in this
   atomic land (typecheck green).
2. Present-only at the BLOCK-TYPE level: a `customSvg` block never appears in a legacy
   doc, so all legacy docs normalize byte-identical. Within a `customSvg` block, props
   are default-seeded like every other block type (svg/drawIn/label serialize with
   their defaults; only `drawSpeed` is omit-when-unauthored) — NOT per-prop
   omit-when-empty.
3. `svg` sanitized at write (sanitizer, L02); numbers clamped; unknown prop rejects.
4. No schemaVersion bump; no migration.
</content>
