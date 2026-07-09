# TASK-533-01-L01: `colSpan`/`rowSpan` + `columnTemplate` Model + Allowlist + JSON Schema + Normalize + Grid-Template Sanitizer

# FileName: TASK-533-01-L01-Grid-Span-Ratio-Model-Schema-Normalize-Sanitizer.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-01
**Priority:** High
**Category:** Schema (JSON model) / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Add three present-only fields to PageDocumentV2 + one new sanitizer, all in labelled
`TASK-533` regions:
- `PageBlockStyleV2.colSpan?: number`, `PageBlockStyleV2.rowSpan?: number` (clamped
  ints via `PAGE_BLOCK_SPAN_CLAMP {1,4}`).
- `PageSectionStyleV2.columnTemplate?: string` (strict-sanitized grid-track string).
- `pageAuthoringSanitizers.ts` → `sanitizeAuthoringGridTemplate` (strict ALLOWLIST).

Each joins its reject-unknown allowlist + `additionalProperties:false` JSON schema +
normalizer in lockstep. NO schemaVersion bump, NO migration, NO dependency.

## Grounded anchors (RE-GREP at implement time — sibling bundles shift lines)

- **`PageBlockStyleV2`** — `core/services/pages/pageDocumentV2.ts:596-672`
  (present-only style block; `column?: number|null` at `:611`). Append `colSpan`/
  `rowSpan` after the last field (`revealDelay?: number` `:671`).
- **`PageSectionStyleV2`** — `pageDocumentV2.ts:534-571` (last field `fullBleed?`
  `:570`). Append `columnTemplate?: string`.
- **`pageBlockStyleKeys`** — the `as const` allowlist `pageDocumentV2.ts:746-780`
  (ends `"revealDelay"` `:779`). Append `"colSpan"`, `"rowSpan"`.
- **Section-style allowlist** — the INLINE `assertKnownKeys([...])` array inside
  `normalizeSectionStyle`, `pageDocumentV2.ts:2495-2514` (ends `"fullBleed"` `:2510`).
  Append `"columnTemplate"`. (There is NO named `sectionStyleKeys` const.)
- **`pageBlockStyleJsonSchema`** — `pageDocumentV2.ts:1424`
  (`additionalProperties:false` `:1426`; `column` numeric at `:1430`). Add
  `colSpan: numericSchema(...)`, `rowSpan: numericSchema(...)`.
- **`partialSectionStyleJsonSchema`** — `pageDocumentV2.ts:1629`
  (`additionalProperties:false` `:1631`) AND the full non-partial section-style
  properties inside the document JSON schema (grep `radius: numericSchema(0, 64)`
  paired with `shadow: { type: "string", enum: [...pageShadowTokens] }` to find BOTH
  mirrors — add `columnTemplate: { type: "string" }` to BOTH).
- **`normalizeBlockStyle`** — `pageDocumentV2.ts:2661` (`column` normalize
  `:2677-2686`, `borderWidth` clamp via `readOptionalClampedNumber` `:2726-2733`).
  Add `colSpan`/`rowSpan` present-only clamps.
- **`normalizeSectionStyle`** — `pageDocumentV2.ts:2488` (present-only branches for
  `scrollEffect`/`fullBleed`). Add `columnTemplate` present-only string.
- **Clamp defs** — precedent `PAGE_SECTION_BLOCK_COLUMN_CLAMP` / block border clamp
  near `pageDocumentV2.ts:249`. Add `PAGE_BLOCK_SPAN_CLAMP = {min:1,max:4} as const`.
- **`readOptionalClampedNumber`** — `pageDocumentV2.ts:1997` (used for present-only
  clamped numbers; omits on invalid).
- **Sanitizer host** — `core/services/pages/pageAuthoringSanitizers.ts`
  (`sanitizeAuthoringCssColor:93`, `sanitizeAuthoringCssBackground:100`,
  `isSafeAuthoringCssGradient`). Add `sanitizeAuthoringGridTemplate` — DO NOT touch
  the gradient helpers (531's surface).

## Implementation pseudocode

```ts
// ───────────────────────── pageDocumentV2.ts ─────────────────────────

// (clamps, TASK-533 region)
/** TASK-533-01 block grid-span bounds (columns/rows a block may span). */
export const PAGE_BLOCK_SPAN_CLAMP = { min: 1, max: 4 } as const;

// (PageBlockStyleV2 — append, TASK-533 region)
export type PageBlockStyleV2 = {
  /* …existing incl. column?, revealDelay?… */
  // --- TASK-533-01 grid span (present-only, clamped ints) ---
  /** Span N columns in the section grid (`grid-column: span N`). Present-only. */
  colSpan?: number;
  /** Span N rows in the section grid (`grid-row: span N`). Present-only. Reproduces
   *  `.project-card.large{grid-row:span 2}`. */
  rowSpan?: number;
};

// (PageSectionStyleV2 — append, TASK-533 region)
export type PageSectionStyleV2 = {
  /* …existing incl. fullBleed?… */
  // --- TASK-533-01 asymmetric column ratio (present-only, sanitized string) ---
  /** Restricted `grid-template-columns` value (e.g. "1.15fr .85fr"). Overrides the
   *  symmetric grid class when set. Strict-sanitized via
   *  `sanitizeAuthoringGridTemplate`; rejection ⇒ omitted. Present-only. */
  columnTemplate?: string;
};

// (pageBlockStyleKeys — append)
const pageBlockStyleKeys = [ /* …"revealDelay" */,
  // --- TASK-533-01 ---
  "colSpan", "rowSpan",
] as const;

// (section-style inline allowlist inside normalizeSectionStyle — append)
assertKnownKeys(input, [ /* …"fullBleed" */,
  // --- TASK-533-01 ---
  "columnTemplate",
], path, mode);

// (pageBlockStyleJsonSchema.properties — append, additionalProperties:false stays)
colSpan: numericSchema(PAGE_BLOCK_SPAN_CLAMP.min, PAGE_BLOCK_SPAN_CLAMP.max),
rowSpan: numericSchema(PAGE_BLOCK_SPAN_CLAMP.min, PAGE_BLOCK_SPAN_CLAMP.max),

// (partialSectionStyleJsonSchema.properties AND the full section-style schema mirror)
columnTemplate: { type: "string" },   // value validated at normalize by the sanitizer

// (normalizeBlockStyle — append present-only clamped ints)
if (input.colSpan !== undefined) {
  const n = readOptionalClampedNumber(input.colSpan, PAGE_BLOCK_SPAN_CLAMP, `${path}.colSpan`, mode);
  if (n !== undefined) result.colSpan = Math.trunc(n);
}
if (input.rowSpan !== undefined) {
  const n = readOptionalClampedNumber(input.rowSpan, PAGE_BLOCK_SPAN_CLAMP, `${path}.rowSpan`, mode);
  if (n !== undefined) result.rowSpan = Math.trunc(n);
}

// (normalizeSectionStyle — append present-only sanitized string)
if (input.columnTemplate !== undefined) {
  const tpl = sanitizeAuthoringGridTemplate(input.columnTemplate);
  if (typeof tpl === "string" && tpl.length > 0) result.columnTemplate = tpl;
  // rejection / empty ⇒ OMIT (present-only fail-soft); never emit raw
}

// ───────────────────── pageAuthoringSanitizers.ts ─────────────────────
// STRICT ALLOWLIST — positive validation only. Reject everything not in the grammar.
const GRID_MAX_TRACKS = 12;
const GRID_MAX_REPEAT = 12;                                     // repeat(N,…) count bound
// Number sub-pattern MUST accept a leading-dot decimal (`.85fr`, `.9fr`) — the reference
// `.project-grid{grid-template-columns:1.15fr .85fr}` and the L04 fixtures use them.
// The alternation `(?:\d+(?:\.\d+)?|\.\d+)` (== `12` | `1.15` | `.85`) is inlined below.
// GRID_LEN re-validates the INNER tokens of minmax()/repeat(). The unit is OPTIONAL here so
// a BARE, UNITLESS numeric bound (canonically `0`, as in the flagship
// `.hero-grid{grid-template-columns:minmax(0,1fr) minmax(420px,.9fr)}`, styles.css:69 /
// parent Overview Gap-1) is ACCEPTED. Without this, GRID_LEN.test("0") is false and
// sanitizeAuthoringGridTemplate("minmax(0,1fr) …") => null, which would (a) reject the
// L01 ACCEPT list below, (b) fail the L04 round-trip assertion, and (c) invalidate the
// L03 curated `minmax(0,1fr) minmax(420px,.9fr)` preset (L03 Hard-Invariant #3 requires
// all presets be sanitizer-passing). This is a fail-SAFE widening: a bare finite number is
// a valid CSS flexible/fixed minmax bound and carries no injection surface (the up-front
// metacharacter reject + bounded track/repeat counts stay intact).
const GRID_LEN = /^(?:(?:\d+(?:\.\d+)?|\.\d+)(?:fr|px|%|rem|em)?|auto)$/;  // unit OPTIONAL (bare `0` ok)
// NOTE: the minmax()/repeat() INNER body is NOT validated by this regex alone
// (`[^()]+` admits arbitrary chars) — the loop below re-validates each inner token
// against GRID_LEN. The regex only recognises the FUNCTION shape.
// GRID_TRACK keeps the unit REQUIRED for a STANDALONE track (a bare unitless number is not a
// valid standalone grid track); the unitless allowance applies ONLY to the minmax/repeat
// inner re-validation via GRID_LEN.
const GRID_TRACK =
  /^(?:(?:\d+(?:\.\d+)?|\.\d+)(?:fr|px|%|rem|em)|auto|minmax\([^()]+\)|repeat\(\d{1,2},[^()]+\))$/;

// Split a comma-separated function body into trimmed non-empty tokens.
const gridInnerTokens = (body: string): string[] =>
  body.split(",").map((t) => t.trim()).filter((t) => t.length > 0);

export const sanitizeAuthoringGridTemplate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > 200) return null;
  // hard reject any rule/injection metacharacter up front (defence in depth)
  if (/[;{}\\<>@`]|\/\*|url\(|expression\(|:(?![^()]*\))/i.test(raw)) return null;
  const tracks = raw.split(/\s+/);
  if (tracks.length === 0 || tracks.length > GRID_MAX_TRACKS) return null;
  for (const track of tracks) {
    if (!GRID_TRACK.test(track)) return null;
    // CLOSED grammar: re-validate the INNER tokens of minmax()/repeat() against GRID_LEN
    // (bounded finite numbers only — `[^()]+` in GRID_TRACK does NOT do this on its own).
    const mm = /^minmax\((.+)\)$/.exec(track);
    if (mm) {
      const inner = gridInnerTokens(mm[1]!);
      // minmax(min, max) — exactly two length/fr/auto tokens, each valid.
      if (inner.length !== 2 || !inner.every((t) => GRID_LEN.test(t))) return null;
      continue;
    }
    const rp = /^repeat\((\d{1,2}),(.+)\)$/.exec(track);
    if (rp) {
      const count = Number(rp[1]);
      // finite int, bounded (reject repeat(99,…) — \d{1,2} alone allows up to 99).
      if (!Number.isInteger(count) || count < 1 || count > GRID_MAX_REPEAT) return null;
      const inner = gridInnerTokens(rp[2]!);
      if (inner.length === 0 || !inner.every((t) => GRID_LEN.test(t))) return null;
      continue;
    }
  }
  return tracks.join(" ");
};
```

- **Present-only:** an unset block (no `colSpan`/`rowSpan`) and an unset section (no
  `columnTemplate`) normalize + render byte-identically to post-530 (keys omitted).
- **Fail-soft:** out-of-range span clamps; a rejected `columnTemplate` is OMITTED,
  never emitted raw.
- Do NOT alter `PageBlockStyleV2.column` (single-column placement stays).

## Security note

`colSpan`/`rowSpan` are bounded integers (`readOptionalClampedNumber` +
`PAGE_BLOCK_SPAN_CLAMP` + `Math.trunc`) emitted only as `span N` literals (533-01-L02)
— no raw value in CSS/markup/URL. `columnTemplate` is the ONLY author STRING reaching
a CSS VALUE position; it MUST pass the NEW strict-ALLOWLIST
`sanitizeAuthoringGridTemplate` (bounded track count, each track from a tiny grammar,
hard-reject `; { } \\ < > @ url( expression( /* :`), rejection ⇒ omit. The grammar is
CLOSED: `minmax(...)`/`repeat(...)` inner bodies are NOT left to the loose `[^()]+`
match — each inner token is re-validated against `GRID_LEN` and the `repeat()` count is
a finite int ≤ `GRID_MAX_REPEAT` (12), so `minmax(a,b)` / `repeat(99,1fr)` /
`repeat(9,zz)` are REJECTED. It is emitted
as a single React inline-style `gridTemplateColumns` value (a value position, not a
rule), doubly gated. Each new key joins its reject-unknown allowlist +
`additionalProperties:false` schema in lockstep (fail-closed read trap); an unknown
key still throws `PageDocumentError`. Do NOT touch the 531 gradient helpers.

## Vitest test lane (authored in 533-01-L04)

`tests/vitest/pages/page-document-v2.test.ts` — round-trip, reject-unknown,
present-only (unset omitted), clamp (`rowSpan:99→4`, `colSpan:0→1`), `columnTemplate`
sanitizer acceptance/rejection round-trip. Plus a dedicated sanitizer unit test:
- ACCEPT (round-trips byte-identically): `"1.15fr .85fr"` (the flagship leading-dot ratio
  — MUST survive), `"1fr 1.2fr"`, `"minmax(0,1fr) 1fr"`,
  `"minmax(0,1fr) minmax(420px,.9fr)"` (leading-dot inside minmax; the flagship
  `.hero-grid` reference — the OPTIONAL-unit `GRID_LEN` above lets the bare `0` bound
  pass, and this exact vector is also the L04 line 58 round-trip assertion and the L03
  curated preset, so grammar + fixtures + preset agree), `"repeat(3,1fr)"`.
- REJECT (→ `null`): `"1fr;}body{x}"`, `"url(x)"`, `"expression(1)"`, `"repeat(999,1fr)"`
  (count > 12), `"<b>"`, and the CLOSED-grammar inner-garbage cases
  `"minmax(a,b)"` / `"repeat(9,zz)"` (inner tokens fail `GRID_LEN`).

Model-only ⇒ Vitest (Bun-free domain layer).

## Regression / breaking-test ownership

Purely ADDITIVE + present-only; every existing block-style / section-style
byte-identity + round-trip test passes unchanged. No breaking-test rebaseline.
533-01-L04 adds the new coverage.

## Hard Invariants

1. Present-only: `colSpan`/`rowSpan`/`columnTemplate` emitted ONLY when authored+valid;
   omitted otherwise (never `null`/`0`/`""`) → byte-identical when unset.
2. Allowlist + JSON schema + normalizer move in ONE lockstep land per field.
3. `columnTemplate` strict-allowlist-sanitized; rejection ⇒ omit (never raw).
4. Spans clamped via `readOptionalClampedNumber` + `PAGE_BLOCK_SPAN_CLAMP` + trunc.
5. No schemaVersion bump (`:29` stays `2`), no migration, no dependency; additions in
   labelled `TASK-533` regions (additive merge).
