# TASK-532-01-L06: Typography-Fidelity Tests (Model / Schema / Grammar / Render)

# FileName: TASK-532-01-L06-Typography-Fidelity-Tests.md

**Parent Task:** TASK-532
**Parent Subtask:** TASK-532-01
**Priority:** High
**Category:** Testing
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the Bundle B test coverage across the correct lanes and
re-baselines the ONE owned breaking test (weight-enum membership). All assertions
promised by L01–L05 land here.

## Test lanes (correct lane per surface)

- **Grammar (Vitest, pure sanitizer):**
  `tests/vitest/pages/page-authoring-sanitizers.test.ts` — `isSafeAuthoringCssLength`
  / `sanitizeAuthoringCssFontSize` accept/reject corpus (L01).
- **Model + schema round-trip (Vitest):** `tests/vitest/pages/page-document-v2.test.ts`
  — `fontSizeCustom`, `fontWeight` extrabold/black, `textTransform`, divider
  `width`/`align`/`gradient` round-trip + reject-unknown + fail-closed enums + Ajv
  `additionalProperties:false` (L01/L02); the `toPageBlockTypographyStyle` emit
  precedence (custom-wins) + weight-css-map (L05).
- **Behavioral render (Vitest `.tsx`):** `tests/vitest/pages/page-renderer-v2.test.tsx`
  — the text-block RICH textColor fix (L03), the divider gradient `<span>` vs legacy
  `<hr>` (L05), a heading with inline `font-size:clamp(...)` + `text-transform` (L05).
  Runtime/DOM-shaped assertions go here (SSR markup), NOT in the pure model lane.
- **Controls (Vitest):** `tests/vitest/pages/page-editor-control-registry.test.ts`
  (control presence + weight options grown to 6 + text-block `textColor` presence) +
  `tests/vitest/pages/page-editor-control-ui-model.test.ts` (`fontSizeCustom`→text,
  `textTransform`→segmented, divider controls) (L04/L03).

## Assertion inventory

### Grammar (page-authoring-sanitizers.test.ts)
- ACCEPT: `1.45rem`, `.78rem`, `12px`, `100%`, `5vw`, `2.5em`, `10ch`,
  `clamp(2.6rem,5vw,4.4rem)`, `min(4rem,8vw)`, `max(1rem,2vh)`,
  `clamp(.9rem,1.2vw,1.1rem)`.
- REJECT (→ `null` from `sanitizeAuthoringCssFontSize`): `url(x)`, `url(javascript:1)`,
  `expression(alert(1))`, `1px;color:red`, `12px}`, `{font-size:0}`, `/*x*/1rem`,
  `calc(1rem + 2px)`, `clamp(1rem,2rem)` (2 args), `clamp(1rem,2rem,3rem,4rem)` (4 args),
  `1rem 2rem`, `red`, `var(--x)`, `1` (no unit), `1deg`, `1s`, a 65+ char string, `""`,
  `-` , `clamp(url(x),1rem,2rem)`, `\`, `<script>`, non-string input (number/object/null).
- Assert `sanitizeAuthoringCssFontSize` returns the trimmed string on accept, `null`
  on reject.

### Model / schema (page-document-v2.test.ts)
- `style.fontSizeCustom:"clamp(2.6rem,5vw,4.4rem)"` round-trips; `"expression(1)"`
  OMITTED (absent, not null); `responsive.tablet.style.fontSizeCustom` round-trips
  (responsive-override style — validated by the SAME `$ref`-shared
  `pageBlockStyleJsonSchema` `$defs` object, NOT a separate `partialBlockStyleJsonSchema`,
  which does not exist); unknown `style.fontSizeThing` throws `PageDocumentError`
  (Ajv `additionalProperties:false` on the single schema — this reject-unknown assertion is
  unaffected by the one-schema correction and MUST stay).
- `fontWeight:"extrabold"`/`"black"` round-trip; map to `800`/`900` via
  `pageTypographyFontWeightCssValues`; `fontWeight:"ultra"` throws (write mode).
- `textTransform:"uppercase"`/`"capitalize"`/`"lowercase"` round-trip; `"none"`/unset
  OMITTED; `"rotate"` throws; unknown key throws.
- `divider` `width:34`/`align:"left"`/`gradient:true` round-trip; `width:9999` clamps
  to 400; `width:1` clamps to 8; `align:"skew"` throws; unknown divider prop throws;
  legacy `divider {tone,thickness}` byte-identical (no new keys serialized).
- **BYTE-IDENTITY:** a post-530 document with NONE of the new fields normalizes +
  serializes byte-identical (snapshot/deep-equal against the pre-532 normalized form).
- `toPageBlockTypographyStyle`: custom-wins over token; token-only path intact;
  `textTransform` emitted; unset → keys absent.

### Behavioral render (page-renderer-v2.test.tsx)
- Rich `text` + `textColor:"#22d3ee"` → body markup carries the authored color +
  inherit-forcing class; plain `text` + same color → `--coderso-block-text` var
  (regression, unchanged); `textColor` unset → rich wrapper has no inline color
  (byte-identical); `textColor:"javascript:alert(1)"` → no color emitted.
- `divider` `gradient:true` → a `<span>` with `linear-gradient(90deg, …, transparent)`
  + `34px` (or authored) width; unset gradient → legacy `<hr>` (byte-identical).
- heading with `fontSizeCustom` → inline `font-size:clamp(...)`; with `textTransform`
  → inline `text-transform`.

### Controls (registry + ui-model)
- `text` block controls include `block.style.fontSizeCustom`, `block.style.textTransform`,
  `block.style.textColor`; `fontWeight` options = 6 members incl. `extrabold`/`black`.
- `divider` controls include `divider.gradient`/`divider.width`/`divider.align`.
- ui-model kinds resolve as declared (text/segmented/toggle/slider).

## Owned breaking-test re-baseline (explicit — TWO assertions, corrected 2026-07-09)

Grow `pageTypographyFontWeights` 4→6 breaks TWO assertions on disk. A
`grep pageTypographyFontWeights` alone MISSES the second (which pins membership via a
LITERAL weight string, not the symbol), so DO BOTH greps before landing:
1. **RE-GREP the SYMBOL** `pageTypographyFontWeights` across `tests/vitest/**` (not just
   `tests/vitest/pages/*`). Update every test that pins the exact enum membership (length 4
   / the 4-member array) to the 6-member form, and any
   `pageTypographyFontWeightCssValues` assertion to include `extrabold:"800"`/`black:"900"`.
   The only symbol-pinned break is
   `tests/vitest/pages/page-editor-control-ui-model.test.ts:139-143` (the hardcoded
   4-member literal); `page-editor-control-registry.test.ts:669` compares by REFERENCE
   (non-breaking).
2. **RE-GREP the LITERAL weight strings** (`"black"`, `"extrabold"`, and each existing
   member used as an invalid-token fixture) across `tests/vitest/**`. This surfaces the
   OWNED re-baseline the symbol-grep misses:
   **`tests/vitest/pages/page-document-v2.test.ts:785-789`** — the reject-unknown block
   uses `style = { fontWeight: "black" }` as its INVALID token and asserts
   `expect(validate(unknownToken)).toBe(false)`; once `"black"` (900) joins the enum the
   shared `pageBlockStyleJsonSchema` (`fontWeight: nullableEnumSchema(pageTypographyFontWeights)`
   at `:1451`) ACCEPTS it and `.toBe(false)` FAILS. Swap the invalid-token fixture to a
   genuinely-unknown token that stays OUTSIDE the 6-member enum (e.g. `fontWeight: "ultra"`),
   preserving the reject-unknown-token intent.

Re-baseline is intended ONLY for this enum growth (these two assertions) — do not weaken
any behavior assertion (e.g. a fail-closed `throws` on a bad enum value stays a `throws`;
the reject-unknown-token assertion stays `.toBe(false)`, just with an out-of-enum token).

## Security note

The test corpus is the security regression net for Bundle B: the grammar
accept/reject vectors (injection, `url()`, comment-escape, calc, arg-count,
length-cap, non-string) assert `fontSizeCustom` can NEVER carry arbitrary CSS; the
enum `throws` vectors assert fail-closed rejection; the `textColor` javascript-URL
vector asserts the color whitelist fail-soft; the byte-identity test asserts a
forgotten allowlist entry (which would silently empty stored docs) is caught. A new
key must not merge without its round-trip + reject-unknown assertion here.

## Hard Invariants

1. Correct lane per surface (grammar/model → Vitest pure; render → Vitest `.tsx`
   behavioral; controls → registry/ui-model).
2. Every new field has a round-trip + reject-unknown + fail-closed/fail-soft assertion.
3. Byte-identity of post-530 no-effect docs asserted.
4. The weight-enum membership re-baseline is the ONLY test change to existing
   assertions; no behavior weakening.
</content>
