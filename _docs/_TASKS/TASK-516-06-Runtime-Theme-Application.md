# TASK-516-06: Runtime Theme Application (Preview + Public Inherit)

# FileName: TASK-516-06-Runtime-Theme-Application.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Runtime / Public Widgets
**Estimated Effort:** Medium
**Dependencies:** TASK-516-01 (`resolveFormTheme`, token maps), TASK-516-04
(canvas theme application patterns to mirror).
**Status:** ⏳ To Do

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` and
`core/widgets/core/formEmbed.tsx`, plus the `mapFormBindingToEmbedData` region of
`core/services/pages/pageRendererV2.tsx` (`:1329-1361` — the projection that builds
the embed's `resolved.settings`; per-region ownership, no other 516 subtask touches
this function — 516-04 owns `FormCanvas.tsx` only, and the parent file table must be
widened from 2 files to add this region for 516-06).** Makes the form theme apply
where the form is actually rendered:

1. **Runtime preview** (`FormRuntimePreviewDialog.tsx`) — apply the **FULL**
   `resolveFormTheme(settings.theme)` to the preview form, reusing the SAME
   `formTheme.ts` class/style maps 516-04 applies on the canvas (one code path, so
   preview + canvas cannot drift): container width/align (`formThemeWidthClass` /
   align class), card + colors (`formThemeRadiusClass`/`Padding`/`Shadow` +
   `buildFormThemeStyleVars` CSS vars for bg/border/title/label/helper/submit),
   **typography** (title/label/helper size+weight+color via `formThemeTitleSizeClass`
   etc. + a **local** font-family token→class map keyed on `t.typography.fontFamily`
   on the wrapper — 516-01 exports NO `fontFamilyClass` map and its resolved shape
   follows the raw-token + separate-class-map pattern, so 516-06 owns this tiny map
   in its own files), **`layout.columns`** (swap the fields
   container's FULL `gap-4 md:grid-cols-2` at `:266` (the REAL element carries a
   hardcoded `gap-4`) → `cn(formThemeColumnsClass[columns], formThemeGapClass[fieldGap])`
   so exactly one gap + one columns utility survive, with the
   columns-aware per-field span at `:269`), **`layout.fieldGap`**
   (`formThemeGapClass`, folded into the same `:266` swap so the pre-existing `gap-4`
   is removed, not left to collide), input styling, and submit label/colors/radius/fullWidth —
   so the admin preview matches the canvas + front (a partial preview would visibly
   diverge from the full-theme canvas/front).
2. **Public `formEmbed`** — `formRuntimeResolver` produces the FULL
   `normalizeFormSettings(...)` (`formRuntimeResolver.ts:52,71`), whose `settings`
   IS the full `FormSettings` and CARRIES `theme` after 516-01
   (`formRuntimeContract.ts:34`). **BUT the page-render bridge that actually populates
   the embed's `resolved.settings`, `mapFormBindingToEmbedData`
   (`pageRendererV2.tsx:1352-1356`), projects an EXPLICIT 3-key literal
   `{ layoutMode, saveProgress, stepTitles }` and DROPS `theme`**, so
   `resolved.settings.theme` is `undefined` at runtime today. Widening ONLY the
   `FormEmbedResolvedData.settings` TS type in `formEmbed.tsx` is INSUFFICIENT — the
   embed would render un-themed forever. This subtask therefore ALSO adds a
   **present-only** `theme` passthrough to that projection (see the
   `pageRendererV2.tsx` pseudocode below) so the resolved theme actually reaches the
   widget. Then make the widget **inherit the form theme as its base defaults**, with
   the existing per-instance `FormEmbedStyle`/`FormEmbedLayout`
   (`formEmbed.tsx:13-38`) taking precedence when set. i.e. resolution order:
   per-embed instance style > form theme > widget defaults.

## Pseudocode (grounded in real code)

`FormRuntimePreviewDialog.tsx`:

```tsx
import {
  resolveFormTheme, formThemeWidthClass, formThemeAlignClass, formThemeRadiusClass,
  formThemePaddingClass, formThemeShadowClass, formThemeColumnsClass, formThemeGapClass,
  formThemeTitleSizeClass, formThemeTitleWeightClass, formThemeInputSizeClass,
  buildFormThemeStyleVars,
} from "../../../services/forms/formTheme";
// NOTE: 516-01 exports NO `fontFamilyClass` map (see 516-01 export list, 516-01:182-188) and
// its resolved shape follows the raw-token + separate-class-map pattern (preview already does
// `formThemeTitleSizeClass[t.typography.titleSize]` below), so do NOT import a `fontFamilyClass`
// symbol 516-01 does not declare. 516-06 owns a tiny LOCAL font-family token→class map
// (`FORM_THEME_FONT_CLASS = { display:"font-display", inherit:"", sans:"font-sans", serif:"font-serif", mono:"font-mono" }`
//  — include the "display" key: it is a valid FormThemeFontFamily token AND the resolved DEFAULT (516-01:147 `FORM_THEME_DEFAULTS.typography.fontFamily = "display"`))
// in each of its own files (this dialog + `formEmbed.tsx`); the preview keys it on the resolved
// `t.typography.fontFamily`, the present-only embed path keys it on the raw theme token.
const t = resolveFormTheme(settings.theme); // FULL fully-defaulted theme (preview mirrors canvas' resolveFormTheme path, not present-only)
// Wrapper: cn(formThemeWidthClass[t.layout.width], formThemeAlignClass[t.layout.align], FORM_THEME_FONT_CLASS[t.typography.fontFamily])
//          style={buildFormThemeStyleVars(t)} → CSS vars for bg/border/title/label/helper/submit colors.
// Card: formThemeRadiusClass[t.surface.radius] + Padding + Shadow (+ border width) — same as 516-04 Scope §3 (516-04:68-72).
// Title/description: formThemeTitleSizeClass[t.typography.titleSize] + formThemeTitleWeightClass + title color var;
//   label/helper size+weight+color from the same typography maps/vars.
// Fields container (:266, REAL element = `grid gap-4 md:grid-cols-2`): swap the FULL `gap-4 md:grid-cols-2` substring
//   (NOT just `md:grid-cols-2`) → cn(formThemeColumnsClass[t.layout.columns], formThemeGapClass[t.layout.fieldGap]),
//   so the resulting container carries EXACTLY ONE gap utility (formThemeGapClass) + ONE columns utility (formThemeColumnsClass);
//   leaving the hardcoded `gap-4` in place would collide with `formThemeGapClass[fieldGap]` (e.g. `gap-4`+`gap-6`) → non-deterministic gap;
//   per-field span (:269) becomes columns-aware (columns:1 → col-span-1; columns:2 → half:md:col-span-1 / full:md:col-span-2), matching 516-04:110-113.
// Inputs: formThemeInputSizeClass[t.input.size] + input radius/colors from vars.
// Submit button: label = t.submit.label ?? "Submit preview" (keep preview semantics), colors/radius/fullWidth from t.submit.
```

`pageRendererV2.tsx` (`mapFormBindingToEmbedData`, `:1352-1356` — present-only theme passthrough):

```tsx
// The projection today drops theme (3-key literal). Add a PRESENT-ONLY spread so the
// resolved theme reaches FormEmbedResolvedData.settings without breaking byte-identity
// for un-themed forms (un-themed ⇒ spread is `{}` ⇒ byte-identical to today's markup):
settings: {
  layoutMode: binding.resolution.settings.layoutMode,
  saveProgress: binding.resolution.settings.saveProgress,
  stepTitles: binding.resolution.settings.stepTitles,
  ...(binding.resolution.settings.theme
    ? { theme: binding.resolution.settings.theme }   // raw normalized theme (present-only)
    : {}),
},
// `binding.resolution.settings` IS the full FormSettings (formRuntimeContract.ts:34) and
// carries `theme` after 516-01's normalizeFormSettings. The embed's runtime-data JSON
// schema (formEmbed.tsx:460-471) is `additionalProperties: true`, so the new `theme` key
// passes validation with NO schema change required; the read side consumes it as the raw
// (NOT resolveFormTheme-defaulted) `resolved?.settings?.theme` below.
```

`formEmbed.tsx` (extend `FormEmbedResolvedData.settings` type + present-only theme layering):

**The theme enum vocabulary is NON-IDENTITY with the widget enums** — the form
theme (516-01 schema) and the widget's `FormEmbedStyle`/`FormEmbedLayout`
(`formEmbed.tsx:13-38`) use *different token strings*, and several theme values
have no widget equivalent (lossy). The mapping helpers MUST translate + clamp per
the table below. Do NOT assume `theme.x` can be assigned straight into
`FormEmbedStyle.x`.

Theme→widget translation table (source: `formEmbed.tsx:13-38` vs 516-01 schema):

| widget token (enum)                         | theme token (enum)              | translation (lossy cases noted) |
| ------------------------------------------- | ------------------------------- | ------------------------------- |
| `FormEmbedLayout.alignment` `start\|center\|end` | `layout.align` `left\|center\|right` | `left→start`, `center→center`, `right→end` |
| `FormEmbedLayout.width` `none\|sm\|md\|lg\|xl`   | `layout.width` `sm\|md\|lg\|xl\|full` | **NEVER map into `data.layout.width` — the two width enums DIVERGE (`widthClassMap` `lg="max-w-xl"`/`xl="max-w-2xl"`, `formEmbed.tsx:163-169`; `formThemeWidthClass` `lg="max-w-2xl"`/`xl="max-w-3xl"`, 516-01:152). Routing `lg`/`xl` through the widget enum renders a NARROWER public embed than canvas/preview for the same theme (breaks the cross-surface single-source mandate; 516-01:47-48 documents this divergence).** Emit the theme width class directly via `formThemeWidthClass[width]` on the container for ALL widths (`sm\|md\|lg\|xl\|full`), bypassing the widget width enum entirely, so the embed matches the canvas + preview class-for-class (incl. `full="max-w-none"`) |
| `FormEmbedLayout.buttonAlignment` `start\|center\|end` | `layout.buttonAlignment` `left\|center\|right\|full` | `left→start`, `center→center`, `right→end`; **`full` LOSSY → clamp to `center`** (widget `buttonAlignClassMap` has only `start/center/end`, `formEmbed.tsx:177-181` — no full-width alignment). ACCEPTED lossy gap: the widget-native way to get a full-width submit is `submit.fullWidth` (mapped in the submit row below), so `buttonAlignment:"full"` degrades to a centered button row rather than fabricating a new widget enum |
| `FormEmbedLayout.fieldGap` `sm\|md\|lg` | `layout.fieldGap` `sm\|md\|lg` | **IDENTICAL vocab → pass through** into `themeLayout.fieldGap`; the embed's `resolveLayout` → `fieldGapClassMap` (`formEmbed.tsx:197`) then renders it. Matches the preview's `formThemeGapClass`. Present-only: emit nothing when unset |
| `FormEmbedStyle.radius` `none\|sm\|md\|lg`       | `surface.radius` `none\|sm\|md\|lg\|xl` | pass through; **`xl` LOSSY → clamp to `lg`** |
| `FormEmbedStyle.borderWidth` `0\|1\|2`          | `surface.borderWidth` `none\|sm\|md` | `none→"0"`, `sm→"1"`, `md→"2"` |
| `FormEmbedStyle.inputSize` `none\|sm\|md\|lg`   | `input.size` (narrower vocab)   | pass matching values; clamp any theme value not in `{none,sm,md,lg}` to the resolveStyle default (`md`) |
| `FormEmbedStyle.titleSize` `sm\|md\|lg`         | `typography.titleSize` `sm\|md\|lg\|xl` | pass matching; **`xl` LOSSY → clamp to `lg`** (widget `titleSizeClassMap` `sm\|md\|lg`, `formEmbed.tsx:217`) |
| `FormEmbedStyle.titleWeight` `medium\|semibold\|bold` | `typography.titleWeight` `normal\|medium\|semibold\|bold` | **NON-IDENTICAL vocab — the theme adds `normal` (516-01:87,163 `formThemeTitleWeightClass.normal="font-normal"`) that the widget lacks.** Pass matching values (`medium/semibold/bold`) through into `themeStyle.titleWeight`; **`normal` LOSSY → clamp to `medium`** (nearest available weight — the widget `titleWeightClassMap` has only `medium\|semibold\|bold`, `formEmbed.tsx:223-227`, and `FormEmbedStyle.titleWeight` is `medium\|semibold\|bold`, `formEmbed.tsx:33`; NEVER pass `normal` straight through or `titleWeightClassMap["normal"]===undefined` at render + `Required<FormEmbedStyle>` typecheck fails — the exact enum-token-undefined hazard the Security/render contract warns about). The embed's `titleWeightClassMap` then renders the clamped value. Present-only: emit nothing when unset |
| color tokens (`background`,`surface`,`borderColor`,`titleColor`,`labelColor`,`helperColor`,`submitBackground`,`submitTextColor`) | container/typography/submit colors: `surface.background`→widget `surface`, `surface.borderColor`→`borderColor`, `typography.titleColor/labelColor/helperColor`→same, `submit.background`→`submitBackground`, `submit.textColor`→`submitTextColor` | identity CSS-value passthrough into `themeStyle` (values already policy-checked by `normalizeColor`; re-checked at render via `resolveClearableCssColorValue` per Security Contract). Present-only per key |
| *(no widget axis)* | `surface.padding` `sm\|md\|lg` | **NO widget enum** — the card wrapper hardcodes `p-6` (`formEmbed.tsx:1126`). Direct-apply `formThemePaddingClass[padding]` on that wrapper in place of the hardcoded `p-6` when the theme set it. Present-only: leave `p-6` untouched when unset (byte-identity) |
| *(no widget axis)* | `surface.shadow` `none\|sm\|md\|lg` | **NO widget enum** — the card wrapper has no shadow class today. Direct-apply `formThemeShadowClass[shadow]` on the card wrapper (`formEmbed.tsx:1126`). Present-only: emit nothing when unset |
| *(no widget axis)* | `surface.card` `boolean` | **NO widget enum** — the card wrapper (`w-full space-y-6 p-6` + border + radius, `formEmbed.tsx:1126`) is ALWAYS on. Direct-apply: when `card===false`, drop the card chrome (border/radius/padding/shadow/`space-y-6`), matching the preview + canvas card-off look. Present-only: when unset, keep today's always-on card (byte-identity) |
| *(no widget axis)* | `input.radius` `none\|sm\|md\|lg\|xl` | **NO widget enum** (widget only has `inputSize`, no per-input radius) — its enum IS the shared `FormThemeRadius` (516-01:194, `= surface` radii incl. `xl`), so direct-apply `formThemeRadiusClass[input.radius]` on the input elements (the map handles `xl`; no clamp). Present-only: emit nothing when unset |
| *(no widget axis)* | `input.background` / `input.borderColor` (colors) | **NO widget enum** (widget inputs hardcode `bg-transparent`, `formEmbed.tsx:772/870/1024`) — direct-apply the resolver's input CSS vars from `buildFormThemeStyleVars` (516-01:164) as inline `style` on the inputs, matching the preview's "input radius/colors from vars". Colors re-checked via `resolveClearableCssColorValue` at render. Present-only per key |
| *(no widget axis)* | `submit.radius` `none\|sm\|md\|lg\|xl` | **NO widget enum** — the submit button reuses the container `radiusClassName` (`formEmbed.tsx:1306`), NOT a submit-specific radius. `submit.radius` IS the shared `FormThemeRadius` (516-01:194, incl. `xl`); direct-apply `formThemeRadiusClass[submit.radius]` on the submit `<button>` (also next/back buttons) when set (the map handles `xl`; no clamp). Present-only: fall back to today's `radiusClassName` when unset |
| *(no widget axis)* | `submit.fullWidth` `boolean` | **NO widget enum** — the submit button is auto-width today. Direct-apply `w-full` on the submit `<button>` when `true` (matches preview line 63). Present-only: emit nothing when unset |
| *(no widget axis)* | `submit.label` `string` | **NO widget enum** — the embed submit label is the per-embed `normalizedData.submitLabel` (`formEmbed.tsx:1309`). Direct-apply: when the theme sets `submit.label` AND the embed did NOT set its own `submitLabel`, use the theme label; per-instance `submitLabel` still wins (precedence). Present-only: emit nothing when unset |
| *(no widget axis)* | `typography.fontFamily` `inherit\|display\|sans\|serif\|mono` | **NO widget enum** — do NOT map into `FormEmbedStyle`. The embed path is present-only (cannot call `resolveFormTheme`, which over-defaults `fontFamily→"display"` — the resolved DEFAULT per 516-01:147 `FORM_THEME_DEFAULTS.typography.fontFamily = "display"`), so map the raw token via a small **local** font-family class map defined in `formEmbed.tsx` (516-06's own file — 516-01 exports no raw-token `fontFamilyClass`), applied DIRECTLY on the outer wrapper (same direct-apply seam as `width:"full"`). The map MUST enumerate the FULL vocabulary matching the preview pseudocode (line 61) + 516-04's local map (516-04:131): `{ display:"font-display", inherit:"", sans:"font-sans", serif:"font-serif", mono:"font-mono" }` — `display→font-display` (the default token; DO NOT drop it), `inherit→""` (no class). Present-only: emit nothing when the theme did not set it |
| *(no widget axis)* | `layout.columns` `1\|2` | **NO widget enum** — do NOT map into `FormEmbedLayout`. The fields containers are ALREADY `grid md:grid-cols-2` (`formEmbed.tsx:1217` multi-step, `:1250` single; preview `FormRuntimePreviewDialog.tsx:266`), so `columns:2` is a NO-OP and you cannot "add" a class — you must conditionally **SWAP** the hardcoded `md:grid-cols-2` for the theme's `formThemeColumnsClass[columns]` (516-01:153 → `1:"grid-cols-1"`, `2:"md:grid-cols-2"`). `columns:1` ⇒ `grid-cols-1`, which collapses to a single column and makes per-field `width:"half"` → `md:col-span-1` (`resolveFieldGridSpanClass`, `:693`) **visually inert** (nothing to span across); `columns:2` keeps today's responsive 2-col + per-field half/full spans (field width > form columns, matching 516-04:107-108). Present-only: when the theme sets no `columns`, leave the hardcoded `md:grid-cols-2` untouched (byte-identity) |

**Cross-surface default divergence (ACCEPTED, scoped — reconciles the table with
the single-source mandate below).** The single-source-of-truth mandate (see the
`## UI/UX fidelity` section below) is contracted for every **AUTHOR-SET** theme token: an author-set
`columns` (`1`→`grid-cols-1` / `2`→`md:grid-cols-2`), `fontFamily`
(`display`→`font-display`, `sans`→`font-sans`, …), width, gap, colors, etc. travels
**losslessly** to canvas, admin preview AND the public embed (the width row above
goes to extra lengths precisely so even author-set `width` does not diverge). What
DIVERGES is ONLY the FALLBACK for a token the author did **NOT** set: canvas/preview
run the whole theme through `resolveFormTheme`, so an UNSET `columns` resolves to the
RESOLVED DEFAULT `1` (`grid-cols-1`, matching the prototype's `flex flex-col`,
`FormBuilderPreview.tsx:112`) and an UNSET `fontFamily` resolves to `display`
(`font-display`, `FormBuilderPreview.tsx:106`); the embed's present-only path
deliberately keeps the **WIDGET defaults** for unset tokens (`columns`→today's
`md:grid-cols-2`, `fontFamily`→no font class) so that an un-themed (or
themed-but-partial) form stays **byte-identical** to today's embed markup — the hard,
snapshot-tested SSR/hydration requirement (see **Byte-identity requirement** below +
the byte-identity snapshot test in **Testing requirements**). This does NOT contradict the width row's divergence-avoidance: width's
divergence would strike AUTHOR-SET widths (the two width enums map the same token to
different `max-w-*` classes), so width MUST be direct-applied; `columns`/`fontFamily`
divergence is confined to the UNSET-default zone that byte-identity owns. **Net
contract:** cross-surface pixel parity is guaranteed for what the author CHOSE;
un-set tokens fall back to widget defaults on the embed (embed default: 2-col /
no-font-class; canvas/preview default via `resolveFormTheme`: 1-col / `font-display`).
If exact default parity for THEMED forms is later required, apply
`resolveFormTheme`'s `columns=1` / `fontFamily=display` defaults to embeds that HAVE a
`theme` object (themed forms are exempt from byte-identity, which protects only
un-themed forms) — explicitly OUT OF SCOPE here.

Define the `mapFormThemeToEmbedStyle` / `mapFormThemeToEmbedLayout` helpers
**inside `formEmbed.tsx` (516-06's own sole-writer file)** — NOT in `formTheme.ts`
(516-01 is that file's sole writer, its export list (516-01:182-188) does not
declare these helpers, and 516-01 explicitly assigns the token-translation to
516-06, not itself: 516-01:48-52). The helpers import read-only ONLY the enum
types from `formSettings.ts` (`FormFormTheme`) and the already-exported class maps
they need (`formThemeWidthClass`, `formThemePaddingClass`, `formThemeShadowClass`,
`formThemeRadiusClass`, `buildFormThemeStyleVars`) from `formTheme.ts`; the raw
`fontFamily` token→class map is defined locally in `formEmbed.tsx` (no 516-01
export for it). Each helper returns `undefined` for a token the form theme did not
set (present-only) — never a fabricated default.

```ts
// FormEmbedResolvedData.settings (:93) add: theme?: FormFormTheme
// Layer explicitly — base defaults < theme (present-only) < instance (present-only).
// NEVER let an enum token be undefined at the class-map lookup (:1072-1074), or the
// class-map yields no class and breaks byte-identity.
const formTheme = resolved?.settings?.theme; // raw normalized theme (present-only), NOT resolveFormTheme() defaults
const themeStyle: Partial<FormEmbedStyle> = mapFormThemeToEmbedStyle(formTheme);   // ONLY keys the form theme set; enum values already translated+clamped
const themeLayout: Partial<FormEmbedLayout> = mapFormThemeToEmbedLayout(formTheme); // present-only; EXCLUDES width entirely (all theme widths handled as the direct container class below — widget/theme width enums diverge, see table)
const style: Required<FormEmbedStyle> = {
  ...resolveStyle(undefined),          // concrete widget defaults (borderWidth "1", radius "md", inputSize "md", ...)
  ...themeStyle,                       // present-only theme overrides (translated enums)
  ...(normalizedData.style ?? {}),     // per-instance wins (unchanged from :1048)
};
const layout: Required<FormEmbedLayout> = resolveLayout({
  ...themeLayout,                      // present-only theme overrides
  ...(normalizedData.layout ?? {}),    // per-instance wins
});
// Direct-apply seam (tokens that bypass FormEmbedStyle/Layout entirely — className/style-var on the container, NOT enum tokens fed to the class-map lookups):
//
// WIDTH (all theme widths, because widget/theme width enums diverge). Replace the
// `widthClassMap[layout.width]` class currently applied at :1120 with an explicit
// containerWidthClass; precedence per-instance > theme > widget default:
const containerWidthClass =
  normalizedData.layout?.width           // per-instance set → widget's own enum/class (unchanged)
    ? widthClassMap[normalizedData.layout.width]
    : formTheme?.layout?.width           // theme set (present-only) → theme's LOSSLESS class (matches canvas + preview)
      ? formThemeWidthClass[formTheme.layout.width]
      : widthClassMap["md"];             // byte-identity default: un-themed + no instance ⇒ "max-w-lg" (identical to today's resolveLayout width default "md")
// apply containerWidthClass on the :1117 flex container in place of widthClassMap[layout.width].
// (data-form-embed-width may keep layout.width for compat; the RENDERED width class is containerWidthClass.)
//
// fontFamily → LOCAL font-family token→class map in formEmbed.tsx on the outer wrapper
//              (present-only, no widget enum; 516-01 exports no fontFamilyClass; inherit→"");
// columns    → conditional grid-cols swap on the fields container (see columns row + preview pseudocode);
// surface.padding/shadow → formThemePaddingClass/formThemeShadowClass swapped onto the card
//              wrapper (:1126, replacing/augmenting hardcoded `p-6`); surface.card===false drops the
//              card chrome; all present-only (un-themed ⇒ today's `w-full space-y-6 p-6` untouched);
// input.radius → formThemeRadiusClass on the inputs; input.background/borderColor → buildFormThemeStyleVars
//              input CSS vars as inline style on the inputs (colors re-checked via resolveClearableCssColorValue);
// submit.radius → formThemeRadiusClass on the submit/next/back buttons (:1296/:1306, replacing radiusClassName
//              when set); submit.fullWidth → `w-full` on the submit button; submit.label → used as the button
//              text ONLY when the embed set no per-instance `normalizedData.submitLabel` (per-instance wins).
// ALL direct-apply tokens are present-only: when the theme did not set the token, emit nothing so the
// un-themed + no-instance embed stays byte-identical to today's markup.
```

Note the layering replaces the two-spread `style`/`layout` at
`formEmbed.tsx:1046-1049`/`:1045`: it inserts `themeStyle`/`themeLayout` as a
MIDDLE layer between `resolveStyle(undefined)` defaults and the per-instance
`normalizedData.style`. The result is still a fully-populated
`Required<FormEmbedStyle>`/`Required<FormEmbedLayout>`, so the class-map lookups
at `:1072-1074` / title maps at `:1078-1079` always receive a concrete enum value.

**Byte-identity requirement:** when a form has NO `theme` AND the embed has no
per-instance style, `mapFormThemeToEmbed*(undefined)` returns `{}`, so the spread
collapses to `{ ...resolveStyle(undefined), ...{}, ...{} }` — **byte-identical** to
today's `{ ...resolveStyle(undefined), ...(normalizedData.style ?? {}) }`
(`:1046-1049`). Add mapping helpers + a middle spread layer, not a rewrite of
`resolveStyle`. Enum tokens are NEVER `undefined` at the class-map lookup.

Error handling: pass the RAW normalized `resolved?.settings?.theme` (present-only)
to the mapping helpers — do NOT feed `resolveFormTheme(...)` output, which is
fully-defaulted and would over-contribute tokens the form never set (breaking
byte-identity). The helpers ignore unset groups/keys and clamp any out-of-range
enum to the widget default, so a malformed stored theme emits nothing new and the
existing `formEmbed` SSR/hydration snapshot for un-themed forms is preserved.

## Security Contract

**Read/render path only; no new route/RBAC/endpoint/migration.** The public
submission route (`POST /forms/:id/submissions`,
`formsRoutes.ts:306` → `handleFormSubmissionRoute`) and its
`validateSubmissionPayload` are **untouched** — theme is presentation-only and
never affects payload validation, allowed field names, bot protection, nonce, or
submission access. `formRuntimeResolver` already normalizes `settings` through
`normalizeFormSettings` (fail-soft), so a malformed stored theme cannot reach the
DOM as raw input. No new user-controlled data enters the render.

## Testing requirements + lanes

- **Vitest (forms)** `tests/vitest/forms/formRuntimeResolver.test.ts` (extend —
  this is a Bun-free Vitest lane: it imports `{ afterEach, expect, test, vi }`
  from `"vitest"`, mocks `formsService` via `vi.doMock`, and touches no DB /
  `Bun.serve`): the resolution returns `settings.theme` when set and omits it
  when unset.
- **Vitest widget** `tests/vitest/widgets/formRuntimeScript.test.ts` (extend):
  - a form with a theme renders with the mapped container width / submit color;
  - **byte-identity:** a form WITHOUT a theme and no per-instance style renders
    the exact pre-change markup (snapshot);
  - per-instance `data.style` still overrides the form theme (precedence).
- **Vitest admin/UI** `tests/vitest/admin/formRuntimePreviewDialog.test.tsx`
  (NEW/extend): a themed preview applies container width + **title typography
  (size/weight/color)** + **`layout.columns` grid class** (`grid-cols-1` for
  `columns:1`, `md:grid-cols-2` for `columns:2`) + fieldGap + submit styling — not
  only width + submit; an un-themed preview renders the theme **DEFAULTS**
  (`resolveFormTheme(undefined)` = `FORM_THEME_DEFAULTS`, i.e. parity with the
  canvas' un-themed look), since the preview now shares 516-04's `resolveFormTheme`
  path rather than the legacy hardcoded preview styling.

## UI/UX fidelity + max-config-flexibility notes

The whole-form theme must be a single source of truth that travels with the form
to every render surface (canvas, admin runtime preview, public embed), while the
page-level `formEmbed` instance retains full override power for per-placement
tuning — maximum flexibility with consistent defaults. Scope caveat: this parity is
contracted for every **author-SET** token (see the **Cross-surface default
divergence** note under the translation table); tokens the author left UNSET fall
back to `resolveFormTheme` defaults on canvas/preview but to WIDGET defaults on the
public embed (so `columns`/`fontFamily` defaults differ: embed 2-col / no-font vs
canvas/preview 1-col / `font-display`), a deliberate concession to the embed's
byte-identity/SSR-snapshot requirement for un-themed forms.
