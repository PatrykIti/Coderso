# TASK-532-01-L01: Fluid Font-Size — Safe Length Grammar + `fontSizeCustom` Model

# FileName: TASK-532-01-L01-Fluid-Font-Size-Grammar-And-Model.md

**Parent Task:** TASK-532
**Parent Subtask:** TASK-532-01
**Priority:** High
**Category:** Security / Schema (JSON model)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds (1) a NEW dependency-free numeric-unit-clamp length grammar to
`core/services/pages/pageAuthoringSanitizers.ts` (`isSafeAuthoringCssLength` +
`sanitizeAuthoringCssFontSize`) inside a labelled `TASK-532` region, and (2) a
present-only `style.fontSizeCustom?: string` field on `PageBlockStyleV2` in
`pageDocumentV2.ts` (allowlist + normalize + JSON-schema mirror). Disjoint from
bundle 531's gradient-helper edits (same file, different region) and from L02's
enum edits.

## Grounded anchors (SYMBOL names authoritative; RE-GREP at implement time)

- `pageAuthoringSanitizers.ts`: `isSafeAuthoringCssColor` (`:79`),
  `sanitizeAuthoringCssColor` (`:93`), `hasBalancedParens` (`:34`, REUSE),
  `isSingleGradientLayer` (`:54`, bundle-531 region — do NOT touch),
  `functionalColorPattern` (`:28`). No length/`clamp()` grammar exists yet.
- `pageDocumentV2.ts`: `PageBlockStyleV2` (`:596`); `fontSize?: PageTypographyFontSize
  | null` (`:626`); `pageBlockStyleKeys` (`:746`, `"fontSize"` at `:763`);
  `normalizeBlockStyle` (`:2661`), its `fontSize` branch (`:2760`) via
  `normalizeNullableEnum`; the SINGLE hoisted `pageBlockStyleJsonSchema`
  (`$defs/pageBlockStyle`, `:1424`, `additionalProperties:false` at `:1426`;
  `fontSize:nullableEnumSchema(...)` at `:1450`), which is `$ref`-shared by BOTH the inline
  (`blockJsonSchemaForType :1574`) and responsive-override (`blockResponsiveJsonSchemaForType
  :1547`) paths via `pageBlockStyleJsonSchemaRef` (`:1513-1514`). **There is NO
  `partialBlockStyleJsonSchema`** — one edit to `pageBlockStyleJsonSchema` covers both
  paths. Import `sanitizeAuthoringCssFontSize` at the top-of-file sanitizer import block
  (append-only).

## Implementation pseudocode

```ts
// ── pageAuthoringSanitizers.ts — NEW "TASK-532 typography length grammar" region ──
// Allowlisted units; NO "s"/"deg"/etc. "vw" is allowed as the fluid middle arg.
const LENGTH_UNITS = ["rem","em","px","vw","vh","%","ch"] as const;
const FONT_SIZE_MAX_LEN = 64;  // hard length cap (defence-in-depth)
// A bare number + one allowlisted unit, e.g. 1.45rem, .78rem, 100%, 5vw, 12px.
const singleLengthPattern =
  /^-?(?:\d+\.?\d*|\.\d+)(?:rem|em|px|vw|vh|%|ch)$/i;
// One clamp()/min()/max() whose comma-separated args are each a singleLength.
const clampHeadPattern = /^(clamp|min|max)\((.*)\)$/i;

export const isSafeAuthoringCssLength = (value: string): boolean => {
  const v = value.trim();
  if (!v || v.length > FONT_SIZE_MAX_LEN) return false;
  // Reject every CSS-escape / injection construct up front (fail-closed):
  if (/[;{}<>\\]|\/\*|url\s*\(|expression\s*\(|:/.test(v)) return false;
  if (singleLengthPattern.test(v)) return true;
  const m = clampHeadPattern.exec(v);
  if (!m) return false;
  if (!hasBalancedParens(v)) return false;              // REUSE :34
  const args = m[2].split(",").map((a) => a.trim());
  // clamp needs exactly 3 args; min/max accept >=1 (all lengths, no nesting).
  if (m[1].toLowerCase() === "clamp" && args.length !== 3) return false;
  if (args.length < 1) return false;
  return args.every((a) => singleLengthPattern.test(a));
};

export const sanitizeAuthoringCssFontSize = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSafeAuthoringCssLength(trimmed) ? trimmed : null;  // present-only: null ⇒ omit
};

// ── pageDocumentV2.ts — "TASK-532 fluid font-size" region ──
// PageBlockStyleV2 (:596), inside a // ===== TASK-532 ===== fence, append:
//   /** Fluid font-size (present-only). Safe clamp()/rem/px/em/vw grammar; WINS
//    *  over the discrete `fontSize` token at render. */
//   fontSizeCustom?: string;
// pageBlockStyleKeys (:746) — append inside the TASK-532 fence: "fontSizeCustom".
// normalizeBlockStyle (:2661) — append AFTER the fontSize branch (:2760):
if (input.fontSizeCustom !== undefined) {
  const safe = sanitizeAuthoringCssFontSize(input.fontSizeCustom); // write-boundary
  if (safe) result.fontSizeCustom = safe;                          // present-only omit-on-null
}
// JSON schema — add to the SINGLE pageBlockStyleJsonSchema $defs object (:1424); its
// $ref covers BOTH the inline and responsive-override paths (no partialBlockStyleJsonSchema):
//   fontSizeCustom: { type: "string", maxLength: 64 }
// (String schema is intentionally loose — the GRAMMAR is enforced by the normalizer,
//  which is the security boundary; the schema length cap is defence-in-depth. Both
//  keep additionalProperties:false so an UNKNOWN key still rejects.)
```

## Precedence note (consumed by L05)

The model keeps BOTH `fontSize` (token) and `fontSizeCustom`. `fontSizeCustom` is
NOT normalized away when `fontSize` is set — render precedence (custom-wins) is an
EMIT concern owned by L05 (`toPageBlockTypographyStyle`). This leaf only validates +
stores.

## Regression-test shape (delegated to 532-01-L06, asserted here)

- **Grammar (Vitest, sanitizer unit):** `isSafeAuthoringCssLength` accepts
  `"1.45rem"`, `".78rem"`, `"12px"`, `"100%"`, `"5vw"`,
  `"clamp(2.6rem,5vw,4.4rem)"`, `"min(4rem,8vw)"`, `"max(1rem,2vh)"`; REJECTS
  `"url(x)"`, `"expression(alert(1))"`, `"1px;color:red"`, `"12px}"`, `"/*x*/1rem"`,
  `"calc(1rem+2px)"` (calc not allowlisted), `"clamp(1rem,2rem)"` (2 args),
  `"clamp(1rem,2rem,3rem,4rem)"` (4 args), `"red"`, `"1rem 2rem"`, a 65-char string,
  `"var(--x)"`, `"1"` (no unit).
- **Model round-trip (Vitest `page-document-v2.test.ts`):** a block with
  `style.fontSizeCustom:"clamp(2.6rem,5vw,4.4rem)"` round-trips identically; a bad
  value (`"expression(1)"`) is OMITTED (not stored, not `null`); a block WITHOUT the
  field is byte-identical to post-530; a `responsive.tablet.style.fontSizeCustom`
  round-trips (validates against the partial schema); unknown key
  `style.fontSizeThing` throws `PageDocumentError`.
- **Lane:** Vitest `tests/vitest/pages/page-authoring-sanitizers.test.ts`
  (grammar) + `tests/vitest/pages/page-document-v2.test.ts` (model round-trip).

## Security note

`fontSizeCustom` is the ONLY new free-text CSS surface in Bundle B. The grammar is
an ALLOWLIST (numeric + fixed unit set; single `clamp/min/max` of lengths) with an
explicit fail-closed pre-check rejecting `;{}<>\`, `/*`, `url(`, `expression(`, and
`:` (blocks declaration-injection, comment-escape, `url()` fetch, and pseudo/property
smuggling), plus a 64-char cap and a balanced-paren check. `sanitizeAuthoringCssFontSize`
returns `null` on any non-conforming input ⇒ the field is OMITTED (never stored raw),
enforced at the write boundary (`normalizeBlockStyle`); L05 emits only this
already-sanitized value inline. No raw author CSS ever reaches a `font-size`
declaration. Corpus includes injection + parser-differential vectors (532-01-L06).

## Hard Invariants

1. Present-only; `fontSizeCustom` omitted when unset OR when the grammar rejects.
2. Strict numeric-unit-clamp grammar — NO arbitrary CSS (allowlist, fail-closed).
3. Allowlist + the SINGLE `pageBlockStyleJsonSchema` `$defs` object updated (its `$ref`
   covers both inline and responsive-override; no `partialBlockStyleJsonSchema`); unknown
   key rejects (`additionalProperties:false`).
4. All edits inside a labelled `TASK-532` region; the gradient helpers (531) are
   not touched.
</content>
