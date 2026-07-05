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
`core/widgets/core/formEmbed.tsx`.** Makes the form theme apply where the form is
actually rendered:

1. **Runtime preview** (`FormRuntimePreviewDialog.tsx`) — apply the **FULL**
   `resolveFormTheme(settings.theme)` to the preview form, reusing the SAME
   `formTheme.ts` class/style maps 516-04 applies on the canvas (one code path, so
   preview + canvas cannot drift): container width/align (`formThemeWidthClass` /
   align class), card + colors (`formThemeRadiusClass`/`Padding`/`Shadow` +
   `buildFormThemeStyleVars` CSS vars for bg/border/title/label/helper/submit),
   **typography** (title/label/helper size+weight+color via `formThemeTitleSizeClass`
   etc. + `fontFamilyClass` on the wrapper), **`layout.columns`** (swap the fields
   container `md:grid-cols-2` at `:266` → `formThemeColumnsClass[columns]`, with the
   columns-aware per-field span at `:269`), **`layout.fieldGap`**
   (`formThemeGapClass`), input styling, and submit label/colors/radius/fullWidth —
   so the admin preview matches the canvas + front (a partial preview would visibly
   diverge from the full-theme canvas/front).
2. **Public `formEmbed`** — the widget already receives the resolved form
   settings via `formRuntimeResolver` (which returns `normalizeFormSettings(...)`
   → now includes `theme`, `formRuntimeResolver.ts:71,98`) and exposes them as
   `resolved.settings` (`formEmbed.tsx:1053-1060`). Make the widget **inherit the
   form theme as its base defaults**, with the existing per-instance
   `FormEmbedStyle`/`FormEmbedLayout` (`formEmbed.tsx:13-38`) taking precedence
   when set. i.e. resolution order: per-embed instance style > form theme >
   widget defaults.

## Pseudocode (grounded in real code)

`FormRuntimePreviewDialog.tsx`:

```tsx
import {
  resolveFormTheme, formThemeWidthClass, formThemeAlignClass, formThemeRadiusClass,
  formThemePaddingClass, formThemeShadowClass, formThemeColumnsClass, formThemeGapClass,
  formThemeTitleSizeClass, formThemeTitleWeightClass, formThemeInputSizeClass,
  fontFamilyClass, buildFormThemeStyleVars,
} from "../../../services/forms/formTheme";
const t = resolveFormTheme(settings.theme); // FULL fully-defaulted theme (preview mirrors canvas' resolveFormTheme path, not present-only)
// Wrapper: cn(formThemeWidthClass[t.layout.width], formThemeAlignClass[t.layout.align], fontFamilyClass[t.typography.fontFamily])
//          style={buildFormThemeStyleVars(t)} → CSS vars for bg/border/title/label/helper/submit colors.
// Card: formThemeRadiusClass[t.surface.radius] + Padding + Shadow (+ border width) — same as 516-04:97-99.
// Title/description: formThemeTitleSizeClass[t.typography.titleSize] + formThemeTitleWeightClass + title color var;
//   label/helper size+weight+color from the same typography maps/vars.
// Fields container (:266): swap "md:grid-cols-2" → cn(formThemeColumnsClass[t.layout.columns], formThemeGapClass[t.layout.fieldGap]);
//   per-field span (:269) becomes columns-aware (columns:1 → col-span-1; columns:2 → half:md:col-span-1 / full:md:col-span-2), matching 516-04:131-132.
// Inputs: formThemeInputSizeClass[t.input.size] + input radius/colors from vars.
// Submit button: label = t.submit.label ?? "Submit preview" (keep preview semantics), colors/radius/fullWidth from t.submit.
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
| `FormEmbedLayout.width` `none\|sm\|md\|lg\|xl`   | `layout.width` `sm\|md\|lg\|xl\|full` | **NEVER map into `data.layout.width` — the two width enums DIVERGE (`widthClassMap` `lg="max-w-xl"`/`xl="max-w-2xl"`, `formEmbed.tsx:163-169`; `formThemeWidthClass` `lg="max-w-2xl"`/`xl="max-w-3xl"`, 516-01:118). Routing `lg`/`xl` through the widget enum renders a NARROWER public embed than canvas/preview for the same theme (breaks the cross-surface single-source mandate; 516-01:38-39 documents this divergence).** Emit the theme width class directly via `formThemeWidthClass[width]` on the container for ALL widths (`sm\|md\|lg\|xl\|full`), bypassing the widget width enum entirely, so the embed matches the canvas + preview class-for-class (incl. `full="max-w-none"`) |
| `FormEmbedLayout.buttonAlignment` `start\|center\|end` | `layout.buttonAlignment` (same align vocab `left\|center\|right`) | `left→start`, `center→center`, `right→end` |
| `FormEmbedStyle.radius` `none\|sm\|md\|lg`       | `surface.radius` `none\|sm\|md\|lg\|xl` | pass through; **`xl` LOSSY → clamp to `lg`** |
| `FormEmbedStyle.borderWidth` `0\|1\|2`          | `surface.borderWidth` `none\|sm\|md` | `none→"0"`, `sm→"1"`, `md→"2"` |
| `FormEmbedStyle.inputSize` `none\|sm\|md\|lg`   | `input.size` (narrower vocab)   | pass matching values; clamp any theme value not in `{none,sm,md,lg}` to the resolveStyle default (`md`) |
| `FormEmbedStyle.titleSize` `sm\|md\|lg`         | `typography.titleSize`          | pass matching; clamp out-of-range to `md` |
| color tokens (`background`,`surface`,`borderColor`,`titleColor`,`labelColor`,`helperColor`,`submitBackground`,`submitTextColor`) | `surface.*`/`typography.*`/`submit.*` colors | identity CSS-value passthrough (already normalized by `normalizeColor`) |
| *(no widget axis)* | `typography.fontFamily` `inherit\|sans\|serif\|mono` | **NO widget enum** — do NOT map into `FormEmbedStyle`; apply the resolved font class/`style` var (via 516-01's `fontFamilyClass` map) DIRECTLY to the outer wrapper (same direct-apply seam as `width:"full"`). Present-only: emit nothing when the theme did not set it |
| *(no widget axis)* | `layout.columns` `1\|2` | **NO widget enum** — do NOT map into `FormEmbedLayout`. The fields containers are ALREADY `grid md:grid-cols-2` (`formEmbed.tsx:1217` multi-step, `:1250` single; preview `FormRuntimePreviewDialog.tsx:266`), so `columns:2` is a NO-OP and you cannot "add" a class — you must conditionally **SWAP** the hardcoded `md:grid-cols-2` for the theme's `formThemeColumnsClass[columns]` (516-01:119 → `1:"grid-cols-1"`, `2:"md:grid-cols-2"`). `columns:1` ⇒ `grid-cols-1`, which collapses to a single column and makes per-field `width:"half"` → `md:col-span-1` (`resolveFieldGridSpanClass`, `:693`) **visually inert** (nothing to span across); `columns:2` keeps today's responsive 2-col + per-field half/full spans (field width > form columns, matching 516-04:58-72). Present-only: when the theme sets no `columns`, leave the hardcoded `md:grid-cols-2` untouched (byte-identity) |

Define these translations as a single `formThemeToEmbed*` map/helper in
`516-01`'s `formTheme.ts` (co-located with the token maps) so 516-06 imports it
rather than re-declaring; return `undefined` for a token the form theme did not
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
// fontFamily → fontFamilyClass[...] on the outer wrapper (present-only, no widget enum);
// columns    → conditional grid-cols swap on the fields container (see columns row + preview pseudocode).
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

- **Bun runtime** `tests/vitest/forms/formRuntimeResolver.test.ts` (extend):
  the resolution returns `settings.theme` when set and omits it when unset.
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
tuning — maximum flexibility with consistent defaults.
