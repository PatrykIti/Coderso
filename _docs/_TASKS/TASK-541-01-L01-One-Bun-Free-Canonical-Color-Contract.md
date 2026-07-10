# TASK-541-01-L01: One Bun-Free Canonical Color Contract

# FileName: TASK-541-01-L01-One-Bun-Free-Canonical-Color-Contract.md

**Parent Subtask:** TASK-541-01
**Priority:** High
**Category:** Shared Styling / Pure Domain / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-541-01
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

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

export type ParsedCssColor =
  | { kind: "hex"; normalized: string; baseHex: string; alpha: number }
  | { kind: "rgb"; normalized: string; baseHex: string; alpha: number }
  | { kind: "hsl"; normalized: string; alpha: number }
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

## Positive grammar and ranges

Both profiles accept only:

- `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`;
- legacy comma-form `rgb()/rgba()` whose three channels are each 0..255 or 0..100%;
- legacy comma-form `hsl()/hsla()` with hue 0..360 and saturation/lightness 0..100%;
- alpha 0..1 or 0..100%, including a leading-dot input normalized to `0.x`;
- `var(--color-[a-z0-9-]+)`;
- `transparent`.

`inherited-render` alone additionally accepts `currentColor` and `inherit`. Reject
named colors, `color-mix`, modern/unlisted functions, calc/env/url, arbitrary custom
properties, rule/control characters, comments, angle brackets, and overlength values.

Pseudocode:

```ts
if typeof value !== "string": return undefined
const raw = value.trim()
if empty/over cap/unsafe-fragment: return undefined
if structural hex: parse exact digit count; lowercase preserving 3/4/6/8 shape;
                   derive six-digit baseHex and alpha
if structural rgb: parse every channel token by unit; enforce its range;
                   parse alpha; canonicalize function/casing/comma spacing/numbers;
                   derive clamped-free baseHex (rejection, never clamping)
if structural hsl: enforce hue/sat/light/alpha; canonicalize without changing meaning
if exact token grammar: preserve token spelling (custom properties are case-sensitive)
if keyword: canonical transparent/currentColor/inherit, enforcing profile
otherwise return undefined
```

Canonical numeric spelling uses parsed finite values (`100.0%` → `100%`, `.84` →
`0.84`) and exactly `", "` between legacy functional channels. Do not convert HSL to
RGB or percent RGB to integer RGB. Hex lowercases but does not expand its authored
digit count. The output of normalization must normalize to itself.

`CSS_COLOR_SCHEMA_PATTERNS` are anchored, conservative JSON-Schema-compatible
structural prefilters for the two profiles. They accept the same surrounding/internal
whitespace that the parser canonicalizes. Because JSON Schema supplies no regex flags,
spell case-insensitive function/keyword alternatives structurally; normalize function
names to lowercase while preserving the case-sensitive custom-property token. Document
in code that regex cannot enforce numeric ranges and every persistence/render consumer
must call the parser after schema validation.

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
unsafe rejection, exact max-length acceptance plus max+1 rejection, and the structural-
schema-versus-semantic-range distinction. Construct the boundary cases from
`CSS_COLOR_VALUE_MAX_LENGTH`; no test repeats the integer as an independent policy.
It must fail against the pre-change implementation and pass with this source leaf.

TASK-541-01-L02 does not rebaseline or edit this direct suite. It later adds a separate
generated exhaustive/property/profile corpus and reruns this file unchanged.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts \
  tests/vitest/ui/color-value.test.ts \
  tests/vitest/services/normalize-menu-appearance.test.ts \
  tests/vitest/widgets/clearableStyle.test.ts
git diff --check
```
