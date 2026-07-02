# TASK-503-01: Screen Block Style Contract
# FileName: TASK-503-01-Screen-Block-Style-Contract.md

**Parent Task:** TASK-503
**Priority:** High
**Category:** Services / Custom Screens / Schema
**Estimated Effort:** Medium
**Dependencies:** TASK-498-02 (per-kind reject-unknown `data` allow-lists, `coerceScreenEnum`/`clampScreenInt`), TASK-500-04 (`normalizeScreenImageSrc`, image `src`/`ratio` allow-list keys), exported page constants (`pageDocumentV2.ts:202` `PAGE_BLOCK_BOX_SPACING_CLAMP` — already exported, NO pageDocumentV2 edit needed)
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

The **model keystone** of TASK-503 (scope A + the schema half of scope E).
ONE file: `core/services/customScreens/customScreenSchemas.ts`. Zero UI, zero
renderer work — 503-02/503-03 consume what this subtask exports.

Deliverables:

1. **`ScreenBlockStyleV1`** — a validated, sparse, additive style channel on
   `ScreenBlockV1` (`width` preset / `minHeight` / per-side `margin`+`padding`
   / `align`), normalized by a ~30-line screen-local validator (unknown keys
   THROW, invalid values COERCE/CLAMP — the screen module's coerce-not-throw
   value style), reusing the exported page clamp constant.
2. **`"style"` in the block-level allow-list** with
   spread-emit-only-when-present → absent key round-trips byte-stable; NO
   schemaVersion bump (screen document stays `schemaVersion: 1`, definition
   stays v4).
3. **Ajv layer extension** — `screenBlockV1Schema` (`:2117`) has
   `additionalProperties: false`, so WITHOUT this change a definition
   create/update carrying `style` would 400 at the route validator before the
   normalizer ever runs (the parent's "server validation picks it up
   automatically" claim is FALSE at the block-key level — verified; the
   server file `core/server/validation/customScreenSchemas.ts` is a pure
   re-export, so extending the service-side schema object IS the server fix,
   no server-file edit).
4. **Export `normalizeScreenImageSrc`** (`:428`, currently module-private) —
   single source of truth for the 503-02 builder-preview gate and the 503-03
   inspector write filter.
5. **`block.variant` resolution at the schema level: NO CHANGE (keep
   accepting).** Parent decision 1: the dead inspector "Background" row is
   REMOVED (503-03), because free-text `variant` must never feed a background
   emission (raw input → CSS violates schema-first). The schema keeps
   `variant` in the block allow-list (`:537`) and in
   `screenBlockV1Schema.properties.variant` (`:2124`) unchanged so every
   stored document round-trips byte-stable and non-destructive. This subtask
   pins that with a regression test.

### Verified current-state anchors (re-checked 2026-07-02, `feature/visual`)

All in `core/services/customScreens/customScreenSchemas.ts` unless noted:

- `ScreenBlockV1` (`:112-124`) — keys `id/type/label/variant/data/layout/
  visibility/editor/legacyWidgetType/children/slots`; NO style channel.
- Block-level `rejectUnknownKeys` allow-list (`:533-545`) inside
  `normalizeScreenBlock` (`:531-595`); conditional-spread return (`:576-594`)
  is the byte-stability pattern to copy.
- Helpers: `isRecord` (`:216`), `normalizeText` (`:219`), `rejectUnknownKeys`
  (`:232-236`, throws `custom_screen_definition_invalid`),
  `coerceScreenEnum(value, allowed, fallback)` (`:411-415`),
  `clampScreenInt(value, fallback, min, max)` (`:417-420`).
- `normalizeScreenImageSrc` (`:427-434`) — module-private `const`; prefix
  allow-list `/`, `http://`, `https://`; unsafe → `""`, never throws;
  idempotent. Applied in the image data case at `:466`.
- Per-kind data allow-lists (`:400-409`): `image: ["label","fit","ratio",
  "field","src"]` — `ratio` is allow-listed but has NO coercion case
  (`:462-467` coerces only `fit` + `src`); it is free text today.
- Write path `normalizeScreenDocumentV1` (`:638`), read path
  `normalizeScreenDocumentV1ForRead` (`:700`) — BOTH funnel through
  `normalizeScreenSection` → `normalizeScreenBlock`, so the style validator
  runs identically on write and read (existing behavior: unknown BLOCK keys
  already throw on read too; `style` follows the same discipline).
- Ajv schemas: `screenBlockV1Schema` (`:2117-2145`, `additionalProperties:
  false`, `variant` at `:2124`), consumed by `screenSectionV1Schema`
  (`:2147`) → `screenDocumentV1Schema` (`:2166`) →
  `customScreenV4DefinitionSchema` (`:2203`) →
  `customScreenDefinitionSchema` (`:2228`) → create/update schemas
  (`:2253`/`:2279`). `core/server/validation/customScreenSchemas.ts` is a
  7-line pure re-export — verified, no edit.
- Nested blocks in `screenBlockV1Schema.children`/`slots` are generic
  `{ type: "object" }` (non-recursive), so nested `style` needs no Ajv work.
- Services→services import precedent: `core/services/menus/menuDocumentV2.ts:1-11`
  imports from `../pages/pageDocumentV2`; the Bun-free boundary bans only
  `@/ui/pages` imports in custom-screens UI. `PAGE_BLOCK_BOX_SPACING_CLAMP =
  { min: 0, max: 240 }` is already exported (`pageDocumentV2.ts:202`).
  (Page's `normalizeBlockStyle`/`normalizeBlockBoxSpacing` are NOT exported
  and stay that way — the screen subset is smaller and coerce-not-throw, so a
  local validator reusing the exported clamp constant is the lower-coupling
  option. **Do NOT edit `pageDocumentV2.ts`.**)
- `migrateWidgetBlockToScreenBlock` (`:771-799`) builds `ScreenBlockV1`
  without a `style` key — widget blocks have none; no migration change.

---

## Implementation plan (execution-ready)

All edits in `core/services/customScreens/customScreenSchemas.ts`.

### 1. Constants + types (place with the TASK-498/500 helper region, after `:409`)

```ts
// TASK-503-01: block-level style channel — validated subset, additive, sparse.
// Reuses the exported page spacing clamp (services→services import is the
// menuDocumentV2 precedent; the Bun-free boundary bans only @/ui/pages).
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../pages/pageDocumentV2"; // top of file, {min:0,max:240}

export const screenBlockWidths = ["auto", "full", "half", "third", "two-thirds"] as const;
export const screenBlockAligns = ["start", "center", "end", "stretch"] as const;
export const screenImageRatios = ["auto", "1/1", "4/3", "16/9", "3/2"] as const;
export const SCREEN_BLOCK_MIN_HEIGHT_CLAMP = { min: 0, max: 640 } as const;
export const screenBlockBoxSides = ["top", "right", "bottom", "left"] as const;

export type ScreenBlockWidth = (typeof screenBlockWidths)[number];
export type ScreenBlockAlign = (typeof screenBlockAligns)[number];
export type ScreenImageRatio = (typeof screenImageRatios)[number];
export type ScreenBlockBoxSpacingV1 = Partial<
  Record<(typeof screenBlockBoxSides)[number], number>
>;
export type ScreenBlockStyleV1 = {
  width?: ScreenBlockWidth;
  minHeight?: number; // clamped int px 0..640 — height as min-height, content-safe
  margin?: ScreenBlockBoxSpacingV1; // per-side clamped ints, PAGE_BLOCK_BOX_SPACING_CLAMP
  padding?: ScreenBlockBoxSpacingV1;
  align?: ScreenBlockAlign;
};
```

Everything above is **exported** (503-02 needs the enums for class maps,
503-03 needs enums + clamps for inspector controls, tests pin the constants).

### 2. `ScreenBlockV1` type (`:112-124`)

Add one optional member after `variant?: string;`:

```ts
  style?: ScreenBlockStyleV1;
```

### 3. Style validator (~30 lines, after `clampScreenInt` `:420`)

Contract: unknown KEYS throw `custom_screen_definition_invalid` (via the
existing `rejectUnknownKeys`, matching `normalizeScreenBlockData`); invalid
VALUES coerce/clamp (never throw); sparse — only present keys are emitted;
empty records prune to `undefined` so `{}`/all-junk never persists.

```ts
const normalizeScreenBlockBoxSpacing = (value: unknown): ScreenBlockBoxSpacingV1 | undefined => {
  if (!isRecord(value)) return undefined; // junk container drops, never throws
  rejectUnknownKeys(value, screenBlockBoxSides); // unknown side key THROWS
  const out: ScreenBlockBoxSpacingV1 = {};
  for (const side of screenBlockBoxSides) {
    if (value[side] === undefined) continue;
    out[side] = clampScreenInt(
      value[side],
      PAGE_BLOCK_BOX_SPACING_CLAMP.min, // fallback (non-number → 0)
      PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      PAGE_BLOCK_BOX_SPACING_CLAMP.max
    );
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const normalizeScreenBlockStyle = (value: unknown): ScreenBlockStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined; // absent = absent
  if (!isRecord(value)) return undefined; // junk container drops, never throws
  rejectUnknownKeys(value, ["width", "minHeight", "margin", "padding", "align"]); // THROWS
  const margin = normalizeScreenBlockBoxSpacing(value.margin);
  const padding = normalizeScreenBlockBoxSpacing(value.padding);
  const style: ScreenBlockStyleV1 = {
    ...(value.width !== undefined
      ? { width: coerceScreenEnum(value.width, screenBlockWidths, "auto") }
      : {}),
    ...(value.minHeight !== undefined
      ? {
          minHeight: clampScreenInt(
            value.minHeight,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max
          ),
        }
      : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
    ...(value.align !== undefined
      ? { align: coerceScreenEnum(value.align, screenBlockAligns, "start") }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};
```

Error handling summary (normative):

| Input | Behavior |
|---|---|
| `style` absent / `null` | `undefined` → key NOT emitted (byte-stable) |
| `style` non-record (string/array/number) | dropped to `undefined`, no throw |
| unknown key in `style` or a box record | THROW `custom_screen_definition_invalid` |
| `width`/`align` not in enum | coerce to `"auto"`/`"start"` |
| `minHeight`/side value float / NaN / string / out of range | `clampScreenInt` → floor int, clamp to `[min,max]`, non-number → min |
| `margin: {}` / all-undefined sides | pruned → key not emitted |
| valid sparse subset | round-trips byte-identical (idempotent) |

### 4. `normalizeScreenBlock` wiring (`:531-595`)

- Allow-list (`:533-545`): insert `"style"` after `"variant"`.
- Before the return: `const style = normalizeScreenBlockStyle(value.style);`
- Return spread (`:576-594`): insert after the `variant` spread:

```ts
    ...(style ? { style } : {}),
```

Key order note: `style` sits between `variant` and `data` in both the type
and the emit order — new documents are the only ones that ever carry it, so
ordering cannot perturb stored bytes.

### 5. Image `ratio`: NO schema coercion (parent decision 3)

`ratio` stays permissive/uncoerced in `normalizeScreenBlockData` — do NOT add
any `data.ratio = coerceScreenEnum(...)` line. Rationale (parent decision 3 +
security contract): `normalizeScreenBlockData` runs on the READ path via
`normalizeScreenDocumentV1ForRead` (`:725-727`), so any schema-level coercion
would mutate stored reads and break read byte-stability ("NO read-path
mutation of stored data"). A stored legacy free-text ratio (e.g. `"16:9"`)
must round-trip byte-identical through BOTH `normalizeScreenDocumentV1` and
`normalizeScreenDocumentV1ForRead`. The dead `ratio` prop is validated ONLY at
its point of use: the renderer class-map (503-02, which resolves an unknown
ratio to the `"auto"` display class) and the inspector EnumRow (503-03, which
rewrites the stored value only on an explicit user change).

### 6. Export `normalizeScreenImageSrc` (`:428`)

`const normalizeScreenImageSrc = ...` → `export const normalizeScreenImageSrc = ...`.
No behavior change; the TASK-500-04 comment block stays. Consumers: 503-02
builder-preview gate, 503-03 inspector write filter, tests.

### 7. Ajv `screenBlockV1Schema` extension (`:2117-2145`)

Add sibling consts above `screenBlockV1Schema`, referencing the SAME exported
constants (zero drift):

```ts
const screenBlockBoxSpacingSchema = {
  type: "object",
  properties: {
    top: { type: "integer", minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min, maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max },
    right: { type: "integer", minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min, maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max },
    bottom: { type: "integer", minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min, maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max },
    left: { type: "integer", minimum: PAGE_BLOCK_BOX_SPACING_CLAMP.min, maximum: PAGE_BLOCK_BOX_SPACING_CLAMP.max },
  },
  additionalProperties: false,
} as const;

const screenBlockStyleV1Schema = {
  type: "object",
  properties: {
    width: { enum: screenBlockWidths },
    minHeight: {
      type: "integer",
      minimum: SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
      maximum: SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max,
    },
    margin: screenBlockBoxSpacingSchema,
    padding: screenBlockBoxSpacingSchema,
    align: { enum: screenBlockAligns },
  },
  additionalProperties: false,
} as const;
```

and in `screenBlockV1Schema.properties`, after `variant`:

```ts
    style: screenBlockStyleV1Schema,
```

Layer-behavior note (conscious, documented): the Ajv route layer REJECTS
(400 `validation_error`) out-of-range/float/unknown-key style payloads,
while the normalizer coerces values and throws only on unknown keys. The Ajv
layer runs only on API create/update payloads; stored documents read through
the normalizer, which clamps. The strictest layer wins on the way in; both
reference the same constants so they cannot drift. (Enum readonly-array usage
`{ enum: screenBlockWidths }` matches the existing
`{ enum: customScreenBindingModes }` precedent.)

### 8. Explicit non-changes (pinned by tests)

- NO schemaVersion bump anywhere (`screenDocumentV1Schema.schemaVersion`
  stays `enum: [1]`; definition stays v4).
- `variant` allow-list entry (`:537`) + Ajv property (`:2124`) untouched.
- Legacy permissive kinds (`field`/`record-header`/`field-group`/`columns`/
  `rich-text`/`legacy-widget` — not in `screenBlockDataAllowedKeys`) stay
  permissive; `style` is a BLOCK-level key, orthogonal to `data`.
- `normalizeScreenDocumentV1ForRead` gets no new logic — the style validator
  reaches it through the shared `normalizeScreenBlock`.
- NO edit to `core/server/validation/customScreenSchemas.ts`,
  `pageDocumentV2.ts`, or any route/RBAC/endpoint/migration.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** (verified: zero route/server-file edits; the
7-line server validation module is a pure re-export that picks up the
extended `customScreenDefinitionSchema` object automatically).

**The one input surface** owned by this subtask:

- (a) the `ScreenBlockStyleV1` validator — enums coerce to allow-listed
  values, ints clamp to `PAGE_BLOCK_BOX_SPACING_CLAMP` /
  `SCREEN_BLOCK_MIN_HEIGHT_CLAMP`, unknown keys throw
  `custom_screen_definition_invalid`. Raw stored input can therefore never
  reach the renderer's inline `style={}` emission (503-02) except as a
  clamped integer or an enum mapped through a class map — no string from the
  document ever becomes CSS.
- (b) the `normalizeScreenImageSrc` prefix filter (`/`, `http://`, `https://`,
  else `""`) — behavior unchanged, now EXPORTED so 503-02/503-03 enforce the
  same filter pre-save; the write-path call site (`:466`) stays.

Schema-first / reject-unknown: block-level, style-level and box-level unknown
keys all throw the existing machine-readable
`custom_screen_definition_invalid`; the Ajv layer mirrors with
`additionalProperties: false`; the per-kind data allow-lists are unchanged
(`ratio` stays allow-listed and uncoerced — parent decision 3).

Non-destructive / byte-stability guards (named):

- absent `style` key round-trips byte-stable (spread-emit-only-when-present);
- stored-V4 byte-stability suites stay green untouched;
- NO schemaVersion bump (document `schemaVersion: 1`, definition v4);
- `variant` stays accepted on read/write (decision 1 — only the dead UI
  control is removed, in 503-03);
- NO read-path mutation of stored data (parent decision 2; the read path only
  gains the shared normalizer's behavior for the genuinely-new additive `style`
  key, which can never appear in stored bytes, so stored reads are untouched);
- `ratio` gets NO schema-level coercion (parent decision 3): it stays
  permissive/uncoerced in `normalizeScreenBlockData`, so a stored free-text
  ratio — legacy `"16:9"` OR the empty string `""` that a cleared inspector
  Ratio input leaves behind — round-trips byte-identical on BOTH read and
  write (never rewritten to `"auto"`, never pruned; the "stored reads
  untouched" guarantee therefore holds for every non-enum ratio, `""`
  included). The dead `ratio` prop is validated only at the renderer class-map
  (503-02) and the inspector EnumRow (503-03) — never in the shared normalizer,
  because that function also runs on the read path
  (`normalizeScreenDocumentV1ForRead`).

Cross-cutting no-regress: TASK-498 presentation-override surface untouched;
Bun-free boundary intact (the `pageDocumentV2` import is services→services,
the allowed menuDocumentV2 precedent — no `@/ui/pages` import anywhere);
palette/insertion behavior and the `PaletteChip` dead-code guard are not
touched by this file.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` — Vitest lane, Bun-free)

Extend `tests/vitest/admin/custom-screen-schemas.test.ts` (follows the
existing TASK-498/500 byte-stable test pattern at `:783` and the existing
`validate` import from `core/server/validation/schemaValidator`):

1. **Valid subset round-trips byte-stable**: block with
   `style: { width: "half", minHeight: 240, margin: { top: 24 }, padding: { top: 16, bottom: 16 }, align: "center" }`
   through `normalizeScreenDocumentV1` → `JSON.stringify` input === output;
   run twice (idempotence).
2. **Absent key stays absent** (byte-stability guard): a block WITHOUT
   `style` normalizes with `"style" in block === false` and stringify-equal
   output; same through `normalizeScreenDocumentV1ForRead`.
3. **Unknown keys throw**: `style: { width: "half", background: "red" }` and
   `style: { margin: { top: 1, inline: 2 } }` both throw
   `custom_screen_definition_invalid` (write AND read normalizers).
4. **Value coercion matrix**: `width: "huge"` → `"auto"`; `align: 7` →
   `"start"`; `minHeight: 99999` → `640`; `minHeight: -5` → `0`;
   `minHeight: 24.9` → `24`; `margin: { top: "12" }` → `{ top: 0 }`
   (non-number → min); `minHeight: NaN` → `0`.
5. **Pruning**: `style: {}` and `style: { margin: {} }` emit NO `style` key;
   `style: "junk"` (non-record) drops silently, no throw.
6. **`variant` regression pin** (decision 1): a block with
   `variant: "anything"` round-trips byte-stable through write + read AND
   passes `validate(customScreenDefinitionSchema, ...)`.
7. **Ajv layer**: `validate(customScreenDefinitionSchema, defWithValidStyle)`
   passes; unknown style key, `minHeight: 10000`, and `style: "junk"` each
   throw the 400 `validation_error` `ApiError`; a definition WITHOUT any
   `style` still validates (no new required member).
8. **`ratio` NOT schema-coerced** (parent decision 3): `data.ratio: "16/9"`
   round-trips byte-stable; `data.ratio: "16:9"` (legacy free text) AND
   `data.ratio: ""` (the empty string a cleared free-text Ratio `<Input>`
   leaves in storage — `ScreenBlockInspector.tsx:600-603`, `onChange` writes
   `event.target.value`) BOTH survive byte-IDENTICAL through
   `normalizeScreenDocumentV1` and `normalizeScreenDocumentV1ForRead` (the
   shared `normalizeScreenBlockData` does NOT coerce `ratio` — it must not
   mutate stored reads, so `""` stays `""`: NOT rewritten to `"auto"`, NOT
   pruned to absent); image data WITHOUT `ratio` stays absent. This uncoerced
   `""` behavior is exactly why the existing `screen-document-image-src.test.ts`
   fixtures that carry `ratio: ""` (`:48` idempotency, `:95` whole-doc
   round-trip) stay green with ZERO edits under this subtask — do not touch
   them. (Display fallback to `"auto"` is asserted at the renderer class-map in
   503-02; inspector rewrite-on-change in 503-03.)
9. **Exported constants pinned**: `screenBlockWidths`, `screenBlockAligns`,
   `screenImageRatios`, `SCREEN_BLOCK_MIN_HEIGHT_CLAMP`,
   `screenBlockBoxSides` exact values (503-02/03 class maps depend on them).

Extend `tests/vitest/customScreens/screen-document-image-src.test.ts`:

10. **`normalizeScreenImageSrc` exported + behavior unchanged**: direct-import
    cases — `"/media/a.jpg"` / `"https://x/y.png"` round-trip verbatim
    (trimmed), `"javascript:alert(1)"` / `"data:image/png;base64,x"` /
    `"blob:x"` / `"  "` / `42` → `""`; idempotent.

Regression pins (run, not rewrite): the stored-V4 byte-stability suites
(`custom-screen-schemas.test.ts` `:783` block,
`screen-document-image-src.test.ts`, `screenEntryPresentationOverrides.test.ts`)
stay green with zero fixture edits.

Bun lane: the route-level PATCH test (valid `style` persists / unknown style
key 4xx via `tests/integration/routes/customScreensRoutes.test.ts`) is owned
by **503-04** per the parent; this subtask's Ajv-layer Vitest cases (item 7)
cover the same contract Bun-free.

Gates before handoff to 503-02: `bun --cwd core lint`, `bun --cwd core
lint:types`, root `tsc -p tsconfig.json --noEmit` (tests/ are outside the
core tsconfig), the custom-screens Vitest suites above.

---

## Acceptance criteria

1. `ScreenBlockStyleV1` + all constants/types exported from
   `customScreenSchemas.ts`; `ScreenBlockV1` has `style?: ScreenBlockStyleV1`.
2. Write AND read document normalizers accept, coerce, and sparse-emit the
   style subset; unknown style/box keys throw
   `custom_screen_definition_invalid`; absent key round-trips byte-identical.
3. `validate(customScreenDefinitionSchema, ...)` accepts a valid `style` and
   rejects unknown style keys / out-of-range values (Ajv layer extended).
4. `data.ratio` is NOT schema-coerced (parent decision 3): it stays
   permissive/uncoerced in `normalizeScreenBlockData`, so a stored legacy
   free-text ratio round-trips byte-identical through BOTH write and read
   normalizers; absent stays absent. Ratio is validated only at the renderer
   class-map (503-02) and inspector EnumRow (503-03).
5. `normalizeScreenImageSrc` is exported, behavior byte-identical.
6. `variant` still round-trips at both layers (regression-pinned); no
   schemaVersion bump; no edits outside `customScreenSchemas.ts` (+ tests).
7. All Testing Requirements green; stored-V4 byte-stability suites green
   unmodified.

---

## Out of scope (owned by siblings)

- Renderer emission (`wrap()` boxStyle/width/align class maps, ratio class
  map, builder src gate) — **503-02** (sole `ScreenRuntimeRenderer.tsx`
  writer).
- Inspector "Layout" group, Background-row REMOVAL, ratio EnumRow, filtered
  src write, `useScreenEntryPreferences` — **503-03**.
- Route-level Bun test, smoke scenarios, docs, changelog (next free number at
  closure — verify live), board/README — **503-04**.
