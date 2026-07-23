# TASK-541-01-L01: One Bun-Free Canonical Color Contract

# FileName: TASK-541-01-L01-One-Bun-Free-Canonical-Color-Contract.md

**Parent Subtask:** TASK-541-01
**Priority:** High
**Category:** Shared Styling / Pure Domain / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-541-01
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Ownership

Create and solely own:

- `core/services/theme/cssColorContract.ts`;
- `tests/vitest/services/css-color-contract.test.ts`, the direct source-gate suite.

Do not edit consumers or the later generated corpus/property suite. The divergent current boundaries are grounded in
`core/admin/ui/shared/colorValue.ts:21-33,81-118,154-162`,
`core/services/menus/normalizeMenuAppearance.ts:147-182`, and
`core/widgets/core/clearableStyle.ts:17-75`.

## Implementation Pseudocode

```ts
export const cssColorProfiles = ["authoring", "inherited-render"] as const;
export type CssColorProfile = (typeof cssColorProfiles)[number];
export type RgbChannels = Readonly<{ red: number; green: number; blue: number }>;

export type ParsedCssColor =
  | {
      kind: "hex" | "rgb" | "hsl";
      normalized: string;
      baseHex: string; // always lowercase #rrggbb
      alpha: number; // finite 0..1
      rgb: RgbChannels; // integer bytes, each 0..255
    }
  | { kind: "token"; normalized: string }
  | { kind: "keyword"; normalized: "transparent" | "currentColor" | "inherit" };

export const CSS_COLOR_VALUE_MAX_LENGTH = 128 as const;
export const CSS_COLOR_SCHEMA_PATTERNS: Readonly<Record<CssColorProfile, string>>;

export function parseCssColorValue(
  value: unknown,
  profile: CssColorProfile
): ParsedCssColor | undefined;

export function normalizeCssColorValue(
  value: unknown,
  profile: CssColorProfile
): string | undefined;
```

`normalizeCssColorValue` returns `parseCssColorValue(... )?.normalized`; consumers do
not create a second normalization path.

## Raw input, positive grammar, and ranges

The parser performs these checks in this order:

1. Require `typeof value === "string"`.
2. Reject when the original, untrimmed `value.length` is greater than
   `CSS_COLOR_VALUE_MAX_LENGTH`. This is JavaScript UTF-16 length; every accepted
   terminal is ASCII, so it agrees with schema `maxLength` for accepted values.
3. Reject C0/C1 controls (`U+0000..U+001F`, `U+007F..U+009F`), tabs/newlines,
   non-ASCII whitespace, comments, and rule-fragment characters/sequences such as
   quotes, backticks, backslash, slash, `/*`, `*/`, `<`, `>`, `;`, `{`, `}`, `[`,
   and `]`. The anchored positive grammar rejects every other unlisted character.
4. Strip only surrounding ASCII U+0020 with an explicit helper; do not use a trim
   operation that can turn Unicode whitespace into a valid value. Reject empty.
5. After parsing and canonicalization, reject a result whose `normalized.length`
   exceeds `CSS_COLOR_VALUE_MAX_LENGTH`. The raw-input cap remains first, but this
   second output guard guarantees that every successful canonical value can be
   parsed again under the same cap.

Inside accepted functions only U+0020 may appear around commas and immediately
inside parentheses. Spaces may not split a numeric lexeme, `%`, `deg`, function
identifier, or custom-property name; there is no space between a function name
and `(`.

Both profiles accept only:

- `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`;
- legacy comma-form `rgb()/rgba()` whose three channels are each 0..255 or 0..100%;
- legacy comma-form `hsl()/hsla()` with hue 0..360 and saturation/lightness 0..100%;
- alpha 0..1 or 0..100%, including a leading-dot input normalized to `0.x`;
- `var(--color-[a-z0-9-]+)`;
- `transparent`.

An unsigned decimal lexeme is `DIGITS` or `DIGITS.DIGITS`: at least one digit on
both sides of a present dot. Leading zeroes are accepted for legacy compatibility
and removed canonically (`000.500` → `0.5`); fractional trailing zeroes are removed,
and an all-zero result is `0`. Signs, a trailing dot, exponent notation, hexadecimal
numbers, `NaN`, and `Infinity` are rejected. Only alpha additionally accepts
`.DIGITS`, which emits with the leading zero. A percent is that same decimal followed
immediately by `%`. Canonicalization is lexeme/string based and must never route
through a number serializer that can emit exponent notation.

HSL hue accepts either a bare number or a case-insensitive `deg` suffix. The
canonical hue is unitless (`210DEG` → `210`). Treat ASCII-case-insensitive `rgb`
and `rgba` as accepted
legacy aliases for the same three-channel grammar, with an optional fourth alpha;
canonical function naming derives only from arity (`rgba(1,2,3)` →
`rgb(1, 2, 3)`, `rgb(1,2,3,.5)` → `rgba(1, 2, 3, 0.5)`). Apply the identical
rule to ASCII-case-insensitive `hsl`/`hsla`.

ASCII-case-insensitive `transparent`, `currentcolor`, and `inherit` emit exactly
`transparent`, `currentColor`, and `inherit`, with the profile gate applied before
return. The `var` identifier is ASCII-case-insensitive and emits lowercase `var`
without inner padding. Its custom-property name is case-sensitive and must already
match lowercase `--color-[a-z0-9-]+`; underscores, uppercase letters, empty suffixes,
double indirection, and fallback arguments are rejected. Hex digits emit lowercase
without expanding the authored 3/4/6/8 length.

`inherited-render` alone additionally accepts `currentColor` and `inherit`. Reject
named colors, `color-mix`, modern/unlisted functions, calc/env/url, arbitrary custom
properties, rule/control characters, comments, angle brackets, and overlength values.

## Literal metadata and exact rounding

After range validation, every `hex`/`rgb`/`hsl` result exposes `baseHex`, `alpha`,
and integer `rgb` metadata without changing the canonical authored color space:

- hex expands 3/4 digits only for metadata, retains original digit count in
  `normalized`, and uses the 4th/8th byte divided by 255 as alpha;
- a unitless RGB channel maps with `Math.round(channel)`; a percentage channel maps
  with `Math.round(percent * 255 / 100)`. Mixed unit/percentage channels remain
  accepted and canonical text preserves each unit;
- HSL uses the standard CSS HSL-to-sRGB chroma/secondary-component/match algorithm,
  maps the resulting components to `0..255`, then applies `Math.round`. Canonical
  hue `360` remains textually `360`, but metadata conversion treats it as hue `0`;
- numeric alpha is its validated 0..1 value and percentage alpha is divided by 100.

Validate every bound before conversion. Do not clamp, substitute, coerce a rejected
channel, or apply a second rounding step. `baseHex` is the lowercase six-digit hex
serialization of those exact integer metadata bytes.

Pseudocode:

```ts
if typeof value !== "string": return undefined
if value.length > CSS_COLOR_VALUE_MAX_LENGTH: return undefined
if control/non-ASCII-space/comment/rule-fragment: return undefined
const raw = trimAsciiSpaceOnly(value)
if empty: return undefined
if structural hex: parse exact digit count; lowercase preserving 3/4/6/8 shape;
                   derive six-digit baseHex and alpha
if structural rgb: parse every channel token by unit; enforce its range;
                   parse alpha; canonicalize function/casing/comma spacing/numbers;
                   derive rounded, clamp-free integer RGB metadata and baseHex
if structural hsl: enforce hue/sat/light/alpha; canonicalize without changing meaning;
                   derive standard rounded HSL-to-RGB metadata/baseHex
if exact token grammar: lowercase VAR identifier; preserve the already-lowercase,
                        case-sensitive custom-property name
if keyword: canonical transparent/currentColor/inherit, enforcing profile
if parsed is defined:
  if parsed.normalized.length > CSS_COLOR_VALUE_MAX_LENGTH: return undefined
  return parsed
otherwise return undefined
```

Canonical numeric spelling uses the decimal-lexeme serializer (`100.0%` → `100%`,
`.84` → `0.84`) and exactly `", "` between legacy functional channels. Do not convert HSL's
canonical bytes to RGB or percent RGB's canonical bytes to integer RGB. Hex
lowercases but does not expand its authored digit count. The output of
normalization must normalize to itself.

`CSS_COLOR_SCHEMA_PATTERNS` are anchored, conservative JSON-Schema-compatible
structural prefilters for the two profiles. They accept exactly the same optional
U+0020 surrounding/internal whitespace and case variants that the parser recognizes;
they do not use `\s`. Because JSON Schema supplies no regex flags, spell
case-insensitive function identifiers and keywords structurally while keeping the
custom-property token lowercase/case-sensitive. Document in code that regex cannot
enforce numeric ranges and every persistence/render consumer must call the parser
after schema validation. A parser-accepted string must always match its profile's
structural pattern; the corpus separately pins intentional structurally valid but
semantically out-of-range false positives.

## Error and compatibility rules

- Rejection is deterministic `undefined`, never throw/clamp/pass raw.
- Unknown stored UI values can remain displayed by adapters until an explicit edit;
  this owner never blesses them.
- No import-time runtime/env coupling. Use standard TypeScript/Math only.
- Do not add a dependency or broad CSS parser.

## Direct regression test and validation

Create the direct suite before treating the source change as gateable. It covers a compact,
hand-authored contract for every public export: one representative for each accepted syntax,
both profile-only keywords, canonical output/idempotence, numeric endpoint rejection,
unsafe rejection (including Unicode whitespace that `String.trim()` would remove),
and a raw-length-before-trim pair built from the same valid terminal plus ASCII
U+0020 padding. The pair at exactly `CSS_COLOR_VALUE_MAX_LENGTH` accepts and
canonicalizes the terminal; the pair at `CSS_COLOR_VALUE_MAX_LENGTH + 1` rejects
even though removing the padding would expose the same short valid terminal. It
also builds an exactly-at-cap functional input whose comma spacing, arity-derived
name, and leading alpha zero would expand the canonical result beyond the cap;
that input must reject, while the structural pattern remains true. This regression
proves that every successful normalization remains within the cap and reparses
idempotently.
also pins the structural-schema-versus-semantic-range distinction,
no-sign/no-exponent/no-trailing-dot
lexemes, leading/trailing zero canonicalization without exponent output, function/
keyword/token case policy, mixed RGB units, integer metadata rounding, HSL primary/
secondary colors, hue-360 metadata equivalence with hue 0, and no clamping. HSL
metadata cases include the achromatic midpoint
`hsl(0, 0%, 50%) → { red: 128, green: 128, blue: 128 } / #808080` and the
nontrivial fractional case
`hsl(210.5, 63.25%, 42.75%) → { red: 40, green: 108, blue: 178 } / #286cb2`.
Construct the boundary cases from
`CSS_COLOR_VALUE_MAX_LENGTH`; no test repeats the integer as an independent policy.
It must fail against the pre-change implementation and pass with this source leaf.

TASK-541-01-L02 does not rebaseline or edit this direct suite. It later adds a separate
generated exhaustive/property/profile corpus and reruns this file unchanged.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts
git diff --check
```
