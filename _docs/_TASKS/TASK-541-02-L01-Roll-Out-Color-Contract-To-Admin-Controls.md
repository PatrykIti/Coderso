# TASK-541-02-L01: Roll Out Color Contract to Admin Controls

# FileName: TASK-541-02-L01-Roll-Out-Color-Contract-To-Admin-Controls.md

**Parent Subtask:** TASK-541-02
**Priority:** High
**Category:** Admin UI / Shared Color Controls
**Estimated Effort:** Medium
**Dependencies:** TASK-541-01-L02
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Ownership

Own only:

- `core/admin/ui/shared/colorValue.ts`
- `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx`
- `core/admin/ui/widgets/editors/SharedColorControl.tsx`
- `core/admin/ui/widgets/editors/ClearableFields.tsx`
- `tests/vitest/ui/color-value.test.ts`
- `tests/vitest/ui/color-swatch-alpha.test.tsx`
- `tests/vitest/ui/shared-color-alpha.test.tsx`
- `tests/vitest/ui/shared-color-control.test.tsx`
- `tests/vitest/ui/clearable-fields.test.tsx`
- `tests/vitest/ui/clearable-fields-alpha.test.tsx`

These existing tests move with their source-owning leaf and must be updated before
the source gate; closure reruns them read-only. Do not run concurrently with TASK-481 if its active
file set overlaps these controls. Read the current pre-TASK-539 Page control call sites before
editing the shared control; their authoring profile, gallery UI, and narrow-canvas
behavior are compatibility inputs, not TASK-541 rewrite scope.

The following grounded admin mirrors are deliberately **not** owned here. L03 owns
each mirror beside its retained renderer/normalizer seam and its existing suite:

- `core/admin/ui/widgets/editors/HeroEditors.tsx` with
  `tests/vitest/ui/hero-editor-wave.test.tsx` (local RGBA overlay parser,
  channel clamp/hex conversion, and color-state classifier);
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` with
  `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` (local hex/RGB picker
  classifier and alpha-preserving RGBA formatter);
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` with
  `tests/vitest/ui/cta-banner-editor-wave.test.tsx` (local hex/custom-state
  classifier).

L01 supplies shared adapters for those callers but must not edit their files.

## Implementation Pseudocode

Turn `colorValue.ts` into a picker adapter over `parseCssColorValue` and
`normalizeCssColorValue`; remove its RGB/HSL/keyword grammar, channel clamping,
and range decisions. Retain these exact public adapter shapes:

```ts
export type ParsedColor =
  | Readonly<{
      kind: "hex" | "rgb" | "hsl";
      raw: string;
      normalized: string;
      baseHex: string;
      alpha: number;
      rgb: RgbChannels;
    }>
  | Readonly<{
      kind: "token";
      raw: string;
      normalized: string;
    }>
  | Readonly<{
      kind: "keyword";
      raw: string;
      normalized: "transparent" | "currentColor" | "inherit";
      keyword: "transparent" | "currentColor" | "inherit";
    }>
  | Readonly<{ kind: "unknown"; raw: string }>;

export function parseColorValue(
  value: string | null | undefined,
  profile?: CssColorProfile // default "authoring"
): ParsedColor;
export function normalizeAdminColorValue(
  value: string | null | undefined,
  profile?: CssColorProfile // default "authoring"
): string | undefined;
export function composeHexColor(baseHex: string, alpha: number): string | undefined;
export function colorAlpha(parsed: ParsedColor): number;
export function pickerHexFor(parsed: ParsedColor, fallback?: string): string;
export function isAlphaPickerRepresentable(
  value: string | null | undefined,
  profile?: CssColorProfile
): boolean;
```

`raw` is the original non-null input byte-for-byte (or `""` for nullish input);
accepted variants carry the owner's canonical metadata and an invalid value is
`unknown`, never a coerced literal. `composeHexColor` accepts only a finite alpha
in `0..1` and an opaque `#rgb`/`#rrggbb` base, expands/lowercases it, and emits
six digits for alpha `1` or eight digits using `Math.round(alpha * 255)` otherwise.
An invalid base or alpha returns `undefined`; it is never clamped and never falls
back to black. Every picker/slider caller guards the result before `onChange`
(valid native-picker data still produces exactly one emission).
`colorAlpha` returns the literal metadata alpha and `1` for every non-literal.
`pickerHexFor` returns a literal's `baseHex`; otherwise it returns a lowercase,
expanded valid `#rgb`/`#rrggbb` fallback, with safe `#000000` used only when that
UI fallback argument itself is invalid. `isAlphaPickerRepresentable` is true
exactly for `hex`, `rgb`, and `hsl`.

Never clamp an invalid channel to produce a preview. `ClearableFields.tsx` removes
its hex/rgb recognition and contrast grammar; picker classification and contrast
derive from canonical parsed metadata. The per-kind behavior is exact:

| Parsed kind | Native picker/alpha slider | Contrast | State |
|---|---|---|---|
| `hex`, `rgb`, `hsl` | representable from `baseHex` + `alpha` | calculate from integer `rgb`; alpha `0` is unknown | selected swatch |
| `token` | fallback swatch; slider disabled | unknown | theme token/default token as applicable |
| keyword `transparent` | fallback swatch; slider disabled | unknown | transparent |
| keyword `currentColor`/`inherit` under explicit profile | fallback swatch; slider disabled | unknown | inherited |
| `unknown` | fallback swatch; slider disabled | unknown | saved custom/unknown existing UX |

Thus HSL is no longer mislabeled as a token and is picker/contrast-representable
through shared RGB metadata without changing its canonical HSL persistence bytes.
An unknown stored value remains
visible/untouched until the user explicitly chooses or commits a valid replacement.

Every Page and Menu consumer of `ColorSwatchControl` uses `authoring`; this control
does not expose an inherited-profile opt-in. `ColorSwatchControl` removes its
pre-parser `trim()`/lowercase acceptance path: free-text commit passes the original
`input.value` byte-for-byte to `normalizeAdminColorValue(..., "authoring")`, and
active-state classification uses canonical adapter output rather than a separately
trimmed grammar.

`SharedColorControl` adds `colorProfile?: CssColorProfile`, defaulting to
`authoring`, plus the context option `allowInheritKeyword?: boolean`, defaulting to
`true`. It passes the profile and context through parse, free-text commit,
representability, and state description. Remove `color-mix` classification because
it is not accepted by either canonical profile. A token remains theme-token state.
With explicit `inherited-render`, `currentColor`/`inherit` produce the exact state
below when `allowInheritKeyword` is true; authoring-profile controls classify them
as unknown and never emit them. When `colorProfile="inherited-render"` and
`allowInheritKeyword={false}`, `currentColor` remains accepted/inherited while
`inherit` is classified as `saved_custom`/unknown and a free-text `inherit` commit
emits nothing. Mounting any of those states emits no `onChange`.

```ts
export type SharedColorStateKind =
  | "cleared"
  | "theme_token"
  | "theme_default_token"
  | "transparent"
  | "inherited"
  | "selected_swatch"
  | "saved_custom";

export type SharedColorState = Readonly<{
  kind: SharedColorStateKind;
  label: string;
  description: string;
  clearResultLabel: string;
}>;
```

Every member has exactly those four fields. For `currentColor` and `inherit`, use
`kind: "inherited"`, `label: "Inherited color"`, description
`"An inherited color is preserved for retained rendering. The swatch is only a fallback preview."`,
and the existing default clear-result label. The control root exposes
`data-shared-color-state={colorState.kind}` in both text and swatch-only modes,
including `saved_custom`; tests select `data-shared-color-state="inherited"`.
`describeSharedColorControlState` accepts the existing object plus
`colorProfile?: CssColorProfile` and `allowInheritKeyword?: boolean`; the latter
defaults to `true`. `SharedColorControlProps` adds both optional properties. The
state descriptor and the commit path apply the same post-parse context rule:
`parsed.normalized === "inherit" && !allowInheritKeyword` is unknown/rejected;
the option can narrow `inherited-render` but can never widen `authoring`.
TASK-541-02-L03 passes `allowInheritKeyword={false}` to the
`SharedColorControl` instances for Section's `style.gradientFrom` and
`style.gradientTo`, Divider's `color`, and both Hero background-gradient stops.
The custom `HeroOverlayField` used for `media.overlay` and
`background.media.overlay` is not a `SharedColorControl`; it enforces the
equivalent reject-`inherit` policy internally. Direct CSS-property compatibility
fields retain the default.

Neither control may call `trim()`, `toLowerCase()`, or another cleanup operation
before canonical parsing. Display-only formatting must not feed the acceptance
decision. On free-text commit:

```text
original draft bytes -> normalizeCssColorValue(profile)
undefined -> keep prior stored value and restore/retain draft per current UX
normalized "inherit" + allowInheritKeyword=false -> treat as undefined
normalized -> emit exactly normalized bytes once
```

Native picker and opacity slider continue to emit canonical hex/hex8 through the
guarded composition helper. Do not mutate a stored value in an effect or on mount.

## Error and compatibility flow

An invalid free-text commit emits no `onChange`, retains the last valid stored value,
and keeps/restores bounded draft feedback through the existing control UX. Parsing never
throws or substitutes a fallback color. Existing valid stored values and clear/disabled
semantics remain unchanged.

## Security/UX invariants

- UI validation does not replace Menu/Form/retained-render validation.
- No synchronous setState in effect, no mount commit, no localStorage/cache changes.
- Disabled/transparent/clear behavior and light/dark chrome remain unchanged.
- Do not expose inherited profile implicitly through a broad default.

## Source-owned regression shape and validation

Update the six owned suites for bounded rejection/no clamping, leading-dot and
arity canonicalization, invalid `composeHexColor` returning `undefined`, the exact
per-kind picker/contrast matrix (including HSL), exact four-field inherited state
and root DOM attribute, no mount mutation, and valid replacement/clear. Through
both `ColorSwatchControl` and `SharedColorControl`, construct a valid terminal with
ASCII U+0020 padding to exactly `CSS_COLOR_VALUE_MAX_LENGTH` and assert one
canonical commit, then use the same terminal at max + 1 and assert no emission even
though post-trim content is short. Through both controls also assert no emission
for NBSP (`U+00A0`), another Unicode whitespace such as `U+2003`, and representative
C0/C1 control input; no UI-side trim may turn them into a valid color. Pin the
`allowInheritKeyword={false}` matrix: `currentColor` stays inherited, `inherit`
becomes `saved_custom`/unknown, neither mutates on mount, and only the former can
be recommitted. The
Hero/Gallery Mosaic/CTA Banner files and tests remain read-only here and are
source-owned by L03. The following current Page suites are
read-only compatibility gates and must exist before invocation:

- `tests/vitest/ui/page-editor-control-primitives.test.tsx`
- `tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `tests/vitest/pages/page-editor-control-registry.test.ts`
- `tests/vitest/ui/page-editor-layout-shell.test.tsx`

Do not add a future TASK-539 gallery suite to this gate; TASK-539-03-L02 is its
sole creator. Page continues to enforce its separate seven-token allowlist;
TASK-541 tests use only those seven Page token values and do not widen the Page
sanitizer.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/ui/color-value.test.ts tests/vitest/ui/color-swatch-alpha.test.tsx tests/vitest/ui/shared-color-alpha.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/clearable-fields.test.tsx tests/vitest/ui/clearable-fields-alpha.test.tsx
bun run test:vitest -- tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/ui/page-editor-layout-shell.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

The four Page suites are read-only current-baseline compatibility gates. A failure caused
by the shared color control must be fixed in TASK-541-owned source without weakening or
re-baselining existing Page assertions. TASK-539 later consumes this
landed shared contract and reruns the same gates.
