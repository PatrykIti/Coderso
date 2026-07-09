# TASK-534-01-L01: Switcher + ScrollHint Block Types, Panel Slots, Gallery Filter Props (Model)

# FileName: TASK-534-01-L01-Switcher-ScrollHint-Blocks-Panel-Slots-Gallery-Filter-Model.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Large
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits the block-type / slot / prop region of
`core/services/pages/pageDocumentV2.ts` (all inside labelled `// ── TASK-534 ──`
fences) PLUS the three OTHER exhaustive `Record<PageBlockType,…>` maps that the member-add
forces (`core/services/pages/pageBlockRenderDefaults.ts:138`, the admin palette-copy map
`core/admin/ui/pages/editor/pageEditorOptions.ts:85` `blockOptionCopy`, and, in the test
tree, `tests/vitest/ui/page-editor-v2-flow.test.tsx:731`). Adds the two new `pageBlockTypes`
members (`switcher`, `scrollHint`), the six `panel:1..6` slot keys, the per-type prop
allowlists + default props, the capability-set entries, the gallery filter props
(`filterable`, `filterCategories`, per-item `category`), the per-type block normalizers,
the per-type JSON-schema entries, AND the `switcher`/`scrollHint` entries in
`pageBlockRenderDefaults` (`{ ...frameRenderDefaults }`, mirroring `customSvg:194`) + the
`pageEditorBlockLabels` test map + the `blockOptionCopy` admin palette-copy map
(`pageEditorOptions.ts:85`) — ALL in ONE atomic land (exhaustive-record requirement; the
`customSvg` pattern, TASK-522-01-L01, updated `blockOptionCopy` in the SAME atomic land).
Disjoint from L02 (style keys). VERIFY with root
`tsc -p tsconfig.json --noEmit` (covers `tests/`), NOT just `bun --cwd core lint:types`. Reproduces the prototype `_docs/projekty-domow-wow-site`
(`app.js:54-100`: barn/villa/eco `styleData` swap + `data-category` filter).

## Grounded anchors

- `pageBlockTypes` `:51-76` (last member `"customSvg"` `:75` — the ADD precedent).
- `pageBlockSlotKeys` `:169-175` (`children`,`column:1..4`); `PageBlockSlotKey`
  `:377`; `pageLayoutBlockSlots` `:822` (which layout blocks expose which slots);
  `getPageBlockActiveSlotKeys` `:1052`.
- `pageBlockPropKeys: Record<PageBlockType, readonly string[]>` `:828-873`
  (`gallery: ["items","layout"]` `:845`; `customSvg` entry `:872`).
- `pageBlockDefaultProps` `:1079-1138` (`gallery: { items:[], layout:"grid" }`
  `:1096`; `customSvg` default `:1138`+).
- `realRuntimeBlockTypes` Set `:930-959` (`customSvg` added `:958`);
  `editorInsertableBlockTypes` Set `:962-1007` (`customSvg` `:1007`);
  `dataBoundBlockTypes` `:960`; `layoutBlockTypes` `:961`.
- **OTHER exhaustive `Record<PageBlockType,…>` maps that MUST gain both members in the
  same atomic land or typecheck breaks (grounded 2026-07-09; the `customSvg` precedent
  edited each):**
  - `core/services/pages/pageBlockRenderDefaults.ts:138`
    `export const pageBlockRenderDefaults: Record<PageBlockType, PageBlockRenderDefaults>`
    — non-Partial exhaustive; `customSvg: { ...frameRenderDefaults }` at `:194`. Add
    `switcher: { ...frameRenderDefaults }` and `scrollHint: { ...frameRenderDefaults }`.
  - `tests/vitest/ui/page-editor-v2-flow.test.tsx:731`
    `const pageEditorBlockLabels: Record<PageBlockType, string>` — exhaustive label map;
    `customSvg: "Custom SVG"` at `:755`, consumed at `:2012`. Add `switcher: "…"` +
    `scrollHint: "…"` labels. (Lives under `tests/vitest/ui/`, OUTSIDE the
    `tests/vitest/pages/*` glob — the "re-run named files" guidance would miss it; only
    root `tsc -p tsconfig.json --noEmit` catches it.)
  - `core/admin/ui/pages/editor/pageEditorOptions.ts:85`
    `export const blockOptionCopy: Record<PageBlockType, Omit<BlockOption, "type">>` —
    NON-Partial exhaustive palette-copy map; `customSvg` entry at `:110`. Add
    `switcher`/`scrollHint` `{ label, description }` entries HERE (moved out of
    534-04-L03 so the atomic model land keeps root `tsc` green — palette copy is trivial
    static text). `BlockOption` is `{ type; label; description }` (`:42`) — there is NO
    `icon` field (the `:107` comment marks an `icon` key as an excess-property typecheck
    error, and `customSvg:110` has none), so DO NOT add an `icon` field and DO NOT add any
    `lucide-react` import for this map. Grounded 2026-07-09: this is a non-Partial
    exhaustive `Record<PageBlockType,…>`, so omitting the two entries leaves two required
    keys missing ⇒ root `tsc` FAILS at the 534-01 gate.
- Per-type prop schema builders `blockPropJsonSchemaForType` (used at `:1527`,
  `:1535`); block-props normalize `assertKnownKeys(input, pageBlockPropKeys[type], …)`
  `:2966` + the per-key loop `:2973` (`result[key] = normalizeBlockProp(type, key,
  input[key], mode, …)`). The per-key dispatcher `normalizeBlockProp(type, key, value,
  mode, path)` is at **`:3170`** — a FLAT `if (type===X && key===Y) return normalize…(value…)`
  cascade returning ONE value per key (NOT a per-type multi-field block); `normalizeGalleryItems`
  at **`:3143`** rebuilds ONLY `{src,alt,caption}` and drops other keys (extend it for
  `category`). Real helpers: `normalizeEnum` **`:1943`** (signature `(value, options,
  fallback, context, mode)`, fail-CLOSED in write mode — NOT `:1554`, which is a
  responsive-override schema builder), `readNumber(value, fallback, min, max)` **`:1938`**
  (FOUR required args), `readBoolean(value, fallback)` `:1935`, and the string helpers
  `readText(value, fallback)` `:1891` / `readOptionalText(value)` `:1897` (there is NO
  `readString`), array via `requireArray(value ?? [], path, mode)` `:2040` / `Array.isArray`
  (there is NO `readArray`).

## Implementation pseudocode

```ts
// ── TASK-534 ── (1) block-type members (customSvg pattern — pageBlockTypes:51)
export const pageBlockTypes = [
  /* …existing… "customSvg", */
  "switcher",    // segmented tabs / panels — absorbs 527
  "scrollHint",  // hero scroll-hint indicator (CSS keyframe, no runtime)
] as const;

// ── TASK-534 ── (2) panel slot keys (pageBlockSlotKeys:169)
export const pageBlockSlotKeys = [
  "children","column:1","column:2","column:3","column:4",
  "panel:1","panel:2","panel:3","panel:4","panel:5","panel:6",
] as const;
export const SWITCHER_MAX_PANELS = 6 as const;               // = number of panel:N slots
export const switcherVariants = ["pill","underline"] as const;
export type PageSwitcherVariant = (typeof switcherVariants)[number];
export const scrollHintGlyphs = ["dot","chevron"] as const;
export type PageScrollHintGlyph = (typeof scrollHintGlyphs)[number];
export const GALLERY_FILTER_CATEGORY_MAX = 12 as const;      // max chip categories
// A category is a SINGLE kebab/word token — NO SPACE (grounded 2026-07-09): the runtime
// filter (534-01-L03) treats an item's data-category as a SPACE-SEPARATED SET of category
// tokens (`cat.split(" ").indexOf(f)`), and each chip's data-filter is ONE token. If a
// single category could contain a space, the runtime would split it into two tokens and a
// chip whose data-filter is the whole phrase would never match. So a category is a single
// space-free token; multiple categories per item are joined with spaces in data-category.
export const GALLERY_CATEGORY_PATTERN = /^[\w-]{1,48}$/;      // single token, NO space

// ── TASK-534 ── (3) switcher exposes panel slots (pageLayoutBlockSlots:822)
const pageLayoutBlockSlots: Partial<Record<PageBlockType, readonly PageBlockSlotKey[]>> = {
  /* …existing container/columns/group… */
  switcher: ["panel:1","panel:2","panel:3","panel:4","panel:5","panel:6"],
};

// ── TASK-534 ── (4) prop allowlists (pageBlockPropKeys:828)
switcher:   ["tabs","activeIndex","variant"],   // tabs: [{label:string}]
scrollHint: ["label","glyph"],
gallery:    ["items","layout","filterable","filterCategories"],  // +2 present-only
//   gallery ITEM shape (inside the existing items[] normalizer) gains optional
//   `category?: string` (kebab-sanitized) — extend the item allowlist there.

// ── TASK-534 ── (5) default props (pageBlockDefaultProps:1079)
switcher:   { tabs: [{ label: "Tab one" }, { label: "Tab two" }], activeIndex: 0, variant: "pill" },
scrollHint: { label: "Scroll", glyph: "dot" },     // label present (a11y); omitted-empty ok
gallery:    { items: [], layout: "grid" },          // UNCHANGED — filterable/filterCategories present-only

// ── TASK-534 ── (6) capability flips (customSvg pattern)
realRuntimeBlockTypes.add("switcher");   // renderer case in 534-02-L01
realRuntimeBlockTypes.add("scrollHint"); // renderer case in 534-02-L03
editorInsertableBlockTypes.add("switcher");
editorInsertableBlockTypes.add("scrollHint");
// scrollHint: NOT dataBound, NOT layout, NO slots.
// switcher: NOT dataBound, but IS a SLOT HOST → MUST be added to layoutBlockTypes.
//   FIRM DECISION (grounded 2026-07-09): getPageBlockActiveSlotKeys (:1052-1054) does
//   `if (!layoutBlockTypes.has(block.type)) return [];` — it gates on layoutBlockTypes
//   (:961 = container/columns/group), NOT pageLayoutBlockSlots. So exposing panel slots
//   ONLY via pageLayoutBlockSlots leaves getPageBlockActiveSlotKeys(switcher) === []
//   (dead panels for the editor slot-enumeration path), even though the JSON schema
//   (:1569) and the normalize slot-validation (:3426) read .slots from
//   pageLayoutBlockSlots and would work. Add "switcher" to layoutBlockTypes so
//   getPageBlockActiveSlotKeys returns its panel:1..6 slots.
layoutBlockTypes.add("switcher");   // (:961) — REQUIRED for getPageBlockActiveSlotKeys
//   NOTE: layoutBlockTypes has exactly ONE consumer — getPageBlockActiveSlotKeys
//   (grep confirms only :961 def + :1054 use). Its columns-count slicing branch
//   (`if (block.type !== "columns") return slots;` :1055) means a non-columns member
//   (switcher) simply returns ALL its panel slots — correct, no side effects. Re-grep at
//   implement time to confirm no new consumer was added; if one appears, guard it rather
//   than dropping the membership (the slot API depends on it).

// ── TASK-534 ── (7) per-type normalize — the block-props normalizer is a FLAT
//   per-KEY dispatcher `normalizeBlockProp(type, key, value, mode, path)` (:3170) that
//   returns ONE value per key (NOT a `case "switcher": { result.x=…; result.y=… }`
//   multi-field block; grounded 2026-07-09). Add per-(type,key) branches, placed BEFORE
//   the generic string tail, mirroring the existing `if (type===X && key===Y) return …`
//   shape (e.g. the icon branches). Real helpers: `readText(value, fallback)` /
//   `readOptionalText(value)` (NOT `readString`), `requireArray(value ?? [], path, mode)`
//   / `Array.isArray` (NOT `readArray`), `readNumber(value, fallback, min, max)` (FOUR
//   args — the 2-arg form does not exist), `normalizeEnum(value, options, fallback,
//   path, mode)` (defined at :1943, fail-CLOSED in write mode), `readBoolean(value, fallback)`.

// switcher.tabs — bounded array of { label } (label = escaped text, length-clamped),
// count clamped to SWITCHER_MAX_PANELS. Reuse the requireArray + isRecord pattern:
if (type === "switcher" && key === "tabs") {
  const raw = requireArray(value ?? [], path, mode).slice(0, SWITCHER_MAX_PANELS);
  // REBUILD each tab as a fresh { label } ONLY — reading label and DISCARDING every other
  // key (notably `href`). This is the LOAD-BEARING guarantee that the editor's `"items"`
  // (listItems) control can reuse this prop: a `{label,href}` editor row normalizes to
  // `{label}` BEFORE schema validation, so the switcher tab schema
  // (additionalProperties:false, required:["label"]) never rejects it (see 534-04-L01).
  const tabs = raw.map((t) => ({ label: readText(isRecord(t) ? t.label : "", "") }));
  return tabs.length ? tabs : [{ label: "Tab one" }];
}
if (type === "switcher" && key === "variant") {
  return normalizeEnum(value, switcherVariants, "pill", path, mode);
}
if (type === "switcher" && key === "activeIndex") {
  // clamp to a valid tab range; SWITCHER_MAX_PANELS-1 is the hard upper bound
  // (per-tab clamp against the actual tab count happens in the renderer / a follow pass):
  return readNumber(value, 0, 0, SWITCHER_MAX_PANELS - 1);
}
// scrollHint
if (type === "scrollHint" && key === "glyph") {
  return normalizeEnum(value, scrollHintGlyphs, "dot", path, mode);
}
if (type === "scrollHint" && key === "label") {
  return readText(value, "Scroll");   // a11y text, escaped at render
}
// gallery present-only filter props (per-key)
if (type === "gallery" && key === "filterable") {
  return readBoolean(value, false) ? true : undefined;   // present-only: omit false
}
if (type === "gallery" && key === "filterCategories") {
  const cats = (Array.isArray(value) ? value : [])
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => GALLERY_CATEGORY_PATTERN.test(c))       // single-token allowlist (drop bad)
    .slice(0, GALLERY_FILTER_CATEGORY_MAX);
  return cats.length ? cats : undefined;                   // present-only
}
// gallery ITEM category — extend normalizeGalleryItems (:3143), which today rebuilds
//   ONLY {src,alt,caption} and DROPS every other key. Add category to the rebuilt object:
//   an item may hold MULTIPLE categories as a SPACE-SEPARATED set of single tokens
//   (matching the runtime `cat.split(" ")`). Inside the item map (:3157-3166), after
//   computing src/alt/caption:
//     const catTokens = (readOptionalText(item.category) ?? "").split(/\s+/)
//       .filter((t) => GALLERY_CATEGORY_PATTERN.test(t)).slice(0, GALLERY_FILTER_CATEGORY_MAX);
//     const rebuilt: Record<string, unknown> = { src, alt, caption };
//     if (catTokens.length) rebuilt.category = catTokens.join(" ");   // present-only
//     return [rebuilt];
//   (Present-only: no `category` key when no valid token, so legacy gallery items stay
//   byte-identical.)

// ── TASK-534 ── (8) per-type JSON schema (blockPropJsonSchemaForType / the
//     per-type property block, additionalProperties:false in lockstep):
switcher: { tabs:{type:"array",items:{type:"object",additionalProperties:false,
             properties:{label:{type:"string"}},required:["label"]},maxItems:6},
           activeIndex:{type:"number",minimum:0}, variant:{type:"string",enum:[...switcherVariants]} }
scrollHint: { label:{type:"string"}, glyph:{type:"string",enum:[...scrollHintGlyphs]} }
gallery (+): filterable:{type:"boolean"},
             filterCategories:{type:"array",items:{type:"string"},maxItems:12}
//   gallery item schema (+): category:{type:"string"}

// ── TASK-534 ── (9) admin palette copy (blockOptionCopy, pageEditorOptions.ts:85 —
//   NON-Partial exhaustive Record<PageBlockType, Omit<BlockOption,"type">>, so it MUST gain
//   both members in THIS atomic land or root `tsc` breaks at the 534-01 gate; customSvg:110
//   is the precedent). BlockOption is `{ type; label; description }` (pageEditorOptions.ts:42)
//   — there is NO `icon` field (explicit comment at :107: adding one is an excess-property
//   typecheck error). So land the two entries with the REAL two-field `{ label, description }`
//   shape (customSvg:110 has no icon). Do NOT add any lucide import for this map.
switcher:   { label: "Switcher", description: "Segmented tabs with swappable panels" },
scrollHint: { label: "Scroll hint", description: "Animated scroll indicator" },
```

## Security note

Two attacker surfaces: (a) `switcher.variant` / `scrollHint.glyph` ENUMS —
`normalizeEnum` fail-CLOSED on write (bad value throws `PageDocumentError`, never
stored). (b) FREE-TEXT `tabs[].label` / `scrollHint.label` / gallery item
`category` + `filterCategories[]`. Labels are length-clamped strings rendered as
escaped React text nodes (never `dangerouslySetInnerHTML`) — no execution.
**Category strings are additionally constrained to `GALLERY_CATEGORY_PATTERN`
(`^[\w-]{1,48}$` — single token, NO space) at write** because they become a
`data-category` ATTRIBUTE VALUE
and a runtime `String.includes` operand (534-02-L02 / 534-01-L03); an out-of-pattern
category is DROPPED (fail-soft), so the attribute value is always a bounded token
and can never `"`-break out of the attribute. `activeIndex` is clamped to a valid
tab range (fail-soft). Every new key joins `pageBlockPropKeys[type]` (⇒ the
`assertKnownKeys` `:2966` reject-unknown) AND the per-type JSON schema
(`additionalProperties:false`) in lockstep — an unknown prop (`switcher.evil`)
throws `PageDocumentError`.

## Test lane

**Vitest** (`tests/vitest/pages/`) — model normalize/round-trip is pure TypeScript
(no DB), per `_docs/TESTING_STRATEGY.md`. Delegated to 534-01-L04, asserted here:
round-trip a `switcher` (tabs/activeIndex/variant), a `scrollHint`, a filterable
`gallery` with tagged items; assert bad enum VALUE
(`variant:"drop-table"`/`glyph:"explode"`) throws in write mode; a bad category
(`"a\";b{}"`) is dropped; an unknown prop (`switcher.evil`) throws; a legacy doc
(no switcher/scrollHint/filter) is byte-identical; the JSON schema accepts the good
shapes and rejects the unknown-prop shape. **Slot-host assertion:**
`getPageBlockActiveSlotKeys` for a `switcher` block returns the six `panel:1..6` slots
(NOT `[]`) — the regression guard that `switcher` was added to `layoutBlockTypes`, not
just `pageLayoutBlockSlots`; also assert the switcher's `pageBlockCapabilities.slots` is
the six panel keys and the JSON schema / normalize slot-validation accept a block placed
in `panel:1`.

## Regression / owned-breaking-test notes

- **Owned breaking surfaces (exhaustive `Record<PageBlockType,…>` — typecheck AND tests).**
  Adding two `pageBlockTypes` members BREAKS every exhaustive record / enumeration. Grep +
  UPDATE in THIS leaf's commit (atomic land):
  - **`core/services/pages/pageBlockRenderDefaults.ts:138`** (`Record<PageBlockType,
    PageBlockRenderDefaults>`, non-Partial) — add `switcher`/`scrollHint`
    `{ ...frameRenderDefaults }` (mirroring `customSvg:194`), else `tsc` fails. NOT
    previously named by the contract — added here.
  - **`tests/vitest/ui/page-editor-v2-flow.test.tsx:731`** (`Record<PageBlockType,
    string>` `pageEditorBlockLabels`, `customSvg:"Custom SVG"` at `:755`, used `:2012`) —
    add `switcher`/`scrollHint` labels, else `tsc` fails. Lives OUTSIDE
    `tests/vitest/pages/*`, so only root `tsc` catches it — NOT previously named; added here.
  - **`core/admin/ui/pages/editor/pageEditorOptions.ts:85`** (`Record<PageBlockType,
    Omit<BlockOption,"type">>` `blockOptionCopy`, non-Partial exhaustive; `customSvg` at
    `:110`) — add `switcher`/`scrollHint` entries with the REAL two-field
    `{ label, description }` shape (`BlockOption` is `{ type; label; description }` at `:42`;
    there is NO `icon` field — the comment at `:107` flags an `icon` key as an
    excess-property typecheck error, and `customSvg:110` has none). Do NOT add any
    `lucide-react` import for this map. Else root `tsc` fails at THIS gate.
    MOVED here from 534-04-L03: because the map is non-Partial exhaustive and 534-04 is the
    LAST subtask in the strictly-sequential land order (534-01→02→03→04) with a per-subtask
    root-`tsc` gate, leaving it to 534-04 would break typecheck the moment 534-01 lands.
    Palette copy is trivial static text, so it belongs in the atomic model land (the
    customSvg precedent, TASK-522-01-L01, updated `blockOptionCopy` in the SAME land).
  - `tests/vitest/pages/*` capability/block-type snapshots, any
    `pageBlockCapabilities`/`pageBlockPropKeys` completeness test, the block-palette
    option-count test.
  This is the customSvg-pattern cost (TASK-522-01-L01 updated the SAME set); land the
  member + ALL exhaustive records + test updates together so `tsc -p tsconfig.json
  --noEmit` (root, covers `tests/`) + vitest stay green — `bun --cwd core lint:types`
  alone does NOT cover the `tests/` maps.
- A pure-additive present-only field on `gallery` does NOT break byte-identity
  tests (unauthored ⇒ omitted).

## Hard Invariants

1. Present-only (`filterable:false`/empty categories omitted; unauthored switcher/
   scrollHint impossible on legacy docs).
2. Reject-unknown (`pageBlockPropKeys` + per-type JSON schema in lockstep) + enum
   fail-closed on write + category kebab drop (fail-soft).
3. customSvg-pattern atomic land: member + ALL exhaustive `Record<PageBlockType,…>`
   entries (including `pageBlockRenderDefaults.ts:138`, the
   `tests/vitest/ui/page-editor-v2-flow.test.tsx:731` `pageEditorBlockLabels` map, AND the
   `pageEditorOptions.ts:85` `blockOptionCopy` palette-copy map with the REAL
   `{ label, description }` shape — NO `icon` field, NO lucide import, per `BlockOption:42` /
   the `:107` excess-property comment) + capability sets + tests in ONE commit; root
   `tsc -p tsconfig.json --noEmit`
   (covers `tests/` AND `core/admin/`) green — not just `bun --cwd core lint:types`.
4. No schemaVersion bump; no migration; colors N/A here (no color prop added).
