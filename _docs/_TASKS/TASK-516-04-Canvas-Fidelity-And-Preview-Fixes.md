# TASK-516-04: Canvas Fidelity, Field-Preview Fixes & Theme Application

# FileName: TASK-516-04-Canvas-Fidelity-And-Preview-Fixes.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Content (Forms) / Page Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-516-01 (`resolveFormTheme`, token maps). **Lands before
TASK-516-03** and defines the optional `deviceWidth?` + `theme?` props on
`FormCanvasProps` that 516-03's `FormBuilderPage` then wires (the props are a
no-op until 516-03 supplies the values; declaring them here first keeps 516-03's
typecheck gate green).
**Status:** ✅ Done
**Completed:** 2026-07-06

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FormCanvas.tsx`.** Fixes the canvas field
previews (B2, B3), applies the form theme so the builder canvas reflects the
whole-form styling live, and honors the device toggle width. Ships:

1. **B2 fix — `select` preview.** `FieldPreview` gains a real `select` branch
   rendering a **real native `<select>` element** (styled like the prototype's
   select, with a `ChevronDown` adornment), `disabled` for the non-interactive
   canvas preview, listing `options` as `<option>`s. Use a **native `<select>`
   element — NOT the Radix `@/components/ui/select` component**, which renders a
   `<button role="combobox">` and no `<select>` DOM node; a native element both
   passes the parent's documented DOM test (`renders a <select>`, parent
   lines 459-461) and matches the prototype's styled native select
   (`_docs/_PROTOTYPE/src/components/ui/select.tsx` — a styled native `<select>` +
   `ChevronDown`). Today `kind:"select"` (`FormCanvas.tsx:204-206`) falls through
   to a text `Input`.
2. **B3 fix — type-accurate previews.** Real typed `<input>` controls (readOnly
   for the preview), matching the parent stub's `<input type=date|time|number|tel|
   email>` (parent lines 451-457) — NOT one generic text `Input` and NOT a styled
   look-alike DIV: `date` → `<input type="date">`, `time` → `<input type="time">`,
   `number` → `<input type="number">` (+ optional `step` hint), `phone` →
   `<input type="tel">`, `email` → `<input type="email">`. A type-hint icon
   (`Calendar`/`Clock`/`Hash`/`Phone`/`AtSign`) MAY be added as an optional leading
   adornment, but the real typed `<input>` carries the semantics and satisfies the
   parent DOM test. `rating` renders a **scale of `max` stars/pills** (not the
   `range` slider). `range` keeps a real `<input type="range">` slider (`disabled`
   for preview) wired to min/max.
   **Prop-plumbing prerequisite (this subtask, same single-writer file):** the
   canvas types do NOT currently carry the data these branches need, so B3 first
   extends them:
   - `FormCanvasProps.fields[].settings` (`FormCanvas.tsx:146-159`) gains
     `min?: number; max?: number;` — the source rows already validate/store these
     (`validation.ts:32-33`, rating `max` clamped 3..10 at `:235-239`), they are
     just not passed to the canvas today.
   - `FieldPreviewProps` (`FormCanvas.tsx:11-23`) gains `min?: number; max?: number;
     step?: number;` and its `kind` union (`FormCanvas.tsx:19`, today only
     `"text"|"select"|"checkbox"|"radio"|"range"|"hidden"`) widens to add
     `"rating"|"date"|"time"|"number"|"phone"|"email"`.
   - `renderField` (`FormCanvas.tsx:195-207`) maps EACH field `type` to a distinct
     `kind` (today `date/time/number/phone/email` all collapse to `"text"` and
     `rating` wrongly maps to `"range"`): `select→"select"`, `rating→"rating"`,
     `range→"range"`, `date→"date"`, `time→"time"`, `number→"number"`,
     `phone→"phone"`, `email→"email"`, `checkbox→"checkbox"`, `radio→"radio"`,
     `hidden→"hidden"`, else `"text"`; and forwards `min={field.settings.min}`,
     `max={field.settings.max}`, `step={field.settings.inputStep ?? field.settings.step}`.
   - New `lucide-react` imports for the type-hint icons: `ChevronDown` (select),
     `Star` (rating), `Calendar` (date), `Clock` (time), `Hash` (number),
     `Phone` (phone), `AtSign` (email) — added to the existing
     `{ CirclePlus, GripVertical, Trash2 }` import (`FormCanvas.tsx:1`).
3. **Theme application (G4).** Wrap/style the canvas form-card from
   `resolveFormTheme(theme)`: container width (also constrained by `deviceWidth`
   from 516-03), align, card on/off, background/border/radius/padding/shadow,
   field gap, columns default, title/label/helper typography + colors, input
   size/radius/colors, submit color/radius/full-width/label/**alignment**
   (`layout.buttonAlignment` — see the submit pseudocode + precedence rule below).
   **Title typography (explicit — the `<h2>` must move OFF `text-2xl`).** The
   canvas title `<h2>` is hardcoded `text-2xl font-semibold text-foreground`
   (`FormCanvas.tsx:243`), which does NOT match the prototype title
   (`font-display text-lg font-semibold`, `FormBuilderPreview.tsx:106`). Restyle
   the `<h2>` to render the RESOLVED title typography from 516-01:
   `cn(formThemeTitleSizeClass[t.typography.titleSize], formThemeTitleWeightClass[t.typography.titleWeight], <title font-family class>)` with
   the resolved title color via `buildFormThemeStyleVars`. Because `t` comes from
   `resolveFormTheme`, the **un-themed** canvas must therefore render the prototype
   default `font-display text-lg font-semibold` (516-01's `FORM_THEME_DEFAULTS`
   titleSize default → `text-lg`, titleWeight default → `font-semibold`, title
   font-family default → `font-display`) — the literal `text-2xl` must NOT survive
   (see the Form-title row in "Un-themed default look"). **Confirm 516-01 pins
   `FORM_THEME_DEFAULTS` title defaults to `text-lg` / `font-semibold` / `font-display`
   (not `text-2xl`)** so this resolved default is prototype-faithful; if 516-01's
   titleSize/titleWeight/font-family defaults do not resolve to those classes, that
   is a 516-01 default-value drift to raise, not a reason to leave the `<h2>` at
   `text-2xl`.
   **Columns→grid map + field-width precedence (concrete).** `columns` is the
   `1 | 2` token 516-01 lands (parent Schema-extension plan line 145). The
   `formSettings.ts` normalizer is **present-only** (parent `normalizeFormTheme`
   line 311 `...(THEME_COLUMNS.includes(...) ? { columns } : {})`): an invalid/absent
   `columns` is **OMITTED, not coerced**, so the effective DEFAULT always comes from
   the RESOLVER, not the normalizer. Exposed on the resolved theme as
   `t.layout.columns`. **516-01 ships BOTH the `columns` token AND the
   `formThemeColumnsClass` map** (516-01:148, `{ 1:"grid-cols-1", 2:"md:grid-cols-2" }`)
   and pins the RESOLVER default `FORM_THEME_DEFAULTS.layout.columns = 1` so the
   **un-themed canvas renders SINGLE-COLUMN, matching the prototype**
   (`FormBuilderPreview.tsx:103-146`, source of truth); `resolveFormTheme(undefined).columns`
   is thus always `1|2` (never `undefined`) and defaults to `1`.
   `formThemeColumnsClass` is a shared token→class map — 516-06 also imports it for
   the runtime front-end (516-06:60) — so this subtask **IMPORTS it** rather than
   hand-rolling a local duplicate. Map the grid wrapper class that today is
   hardcoded `md:grid-cols-2` (`FormCanvas.tsx:263,278`) via the shared map:
   `const formColumnsClass = formThemeColumnsClass[t.layout.columns];`
   Per-field `style.width` still overrides the form `columns` default
   (**precedence: field width > form columns**), generalizing today's binary span
   (`FormCanvas.tsx:267,281`):
   - `columns:1` → wrapper `grid-cols-1`; every field spans the single column
     (`col-span-1` for both `full` and `half` — `half` is a no-op at 1 column).
   - `columns:2` → wrapper `md:grid-cols-2`; `full → md:col-span-2`,
     `half → md:col-span-1` (unchanged from today).
   - **Mobile degrade:** when `deviceWidth === "mobile"` the grid collapses to a
     single column (`grid-cols-1`, ignore the `md:*` span classes) so the canvas
     mirrors the responsive front render regardless of the `columns` token.
   The `columns` token domain is fixed by 516-01; if 516-01 later widens it, this
   local const is the single place to extend.
4. Keep the existing multi-step grouping (`groupedFields`) and selection/remove
   affordances intact.

## Pseudocode (grounded in real code)

```tsx
import { CirclePlus, GripVertical, Trash2, ChevronDown, Star, Calendar, Clock, Hash, Phone, AtSign } from "lucide-react";
import { resolveFormTheme, formThemeWidthClass, formThemeRadiusClass, formThemeBorderWidthClass, formThemePaddingClass, formThemeShadowClass, formThemeGapClass, formThemeColumnsClass, formThemeInputSizeClass, formThemeTitleSizeClass, formThemeTitleWeightClass, formThemeButtonAlignClass, buildFormThemeStyleVars } from "../../../services/forms/formTheme";
// NOTE: formThemeTitleSizeClass / formThemeTitleWeightClass ARE exported by 516-01
// (516-01 export list, lines 153-157) and are used for the title <h2> restyle below —
// import them here. There is NO `fontFamilyClass` export from 516-01, so (like 516-06)
// define a small LOCAL font-family token→class map in THIS file for the `<title font-family class>`
// (e.g. `{ inherit:"", display:"font-display", sans:"font-sans", serif:"font-serif", mono:"font-mono" }`),
// keyed on the resolved `t.typography.fontFamily`; do NOT import a `fontFamilyClass` symbol 516-01 does not declare.
// NOTE: formThemeColumnsClass IS the shared token→grid map 516-01 ships (516-01:148);
// IMPORT it (do NOT hand-roll a local duplicate — 516-06 imports the same map). The only
// local const is `formColumnsClass = formThemeColumnsClass[t.layout.columns]` (Scope §3).

// FieldPreviewProps: widen kind + carry scale/step + RESOLVED label/input styling
// (so buildFormThemeStyleVars color vars actually reach the field controls and the
// micro-label moves OFF `uppercase tracking-[0.2em]` — Scope §3 "label typography +
// colors, input size/radius/colors"). FormCanvas resolves these ONCE from `t` and
// forwards them to every FieldPreview (single source of truth for field styling):
//   const inputClass = cn(formThemeInputSizeClass[t.input.size], formThemeRadiusClass[t.input.radius]);
//   const labelClass = "text-sm font-medium";  // prototype <Label>: normal-case (NOT uppercase tracking-[0.2em])
//   // color vars come from buildFormThemeStyleVars(t): input uses --form-input-bg/-border/-text,
//   // label uses --form-label (each OMITTED when its token is undefined ⇒ inherit theme token).
type FieldPreviewProps = { /* existing */ min?: number; max?: number; step?: number;
  kind?: "text"|"select"|"checkbox"|"radio"|"range"|"hidden"|"rating"|"date"|"time"|"number"|"phone"|"email";
  inputClass?: string;    // cn(formThemeInputSizeClass[t.input.size], formThemeRadiusClass[t.input.radius]) from FormCanvas
  labelClass?: string;    // resolved normal-case label typography (default "text-sm font-medium")
};

// FormCanvasProps.fields[].settings: add min/max (already stored by validation.ts:32-33)
type FieldSettings = { /* existing */ min?: number; max?: number; /* placeholder/helper/options/... */ };
type FormCanvasProps = { /* existing */ deviceWidth?: "desktop"|"mobile"; theme?: FormFormTheme };

const t = resolveFormTheme(theme);
const containerClass = cn(
  deviceWidth === "mobile" ? "max-w-sm" : formThemeWidthClass[t.layout.width],
  t.layout.align === "left" ? "mr-auto" : t.layout.align === "right" ? "ml-auto" : "mx-auto",
);
const cardClass = cn(
  t.surface.card
    // card ON: resolved radius + resolved BORDER WIDTH + border-color var (516-01:160
    // formThemeBorderWidthClass = { none:"border-0", sm:"border", md:"border-2" };
    // default borderWidth "sm" ⇒ the un-themed card keeps its 1px `border`).
    ? cn(formThemeRadiusClass[t.surface.radius], formThemeBorderWidthClass[t.surface.borderWidth],
        "border-[color:var(--form-border,inherit)]")   // borderColor var (omitted ⇒ inherit theme border)
    : "border-0 shadow-none bg-transparent",
  formThemePaddingClass[t.surface.padding], formThemeShadowClass[t.surface.shadow],
  "bg-[var(--form-surface-bg,transparent)]",   // surface.background var (omitted ⇒ transparent, keeps Card default)
);
// style={buildFormThemeStyleVars(t)} → CSS vars for bg/border/title/label/helper/input/submit colors.
// These vars are set on the Card, so any element BELOW must consume them explicitly — the field
// controls do NOT inherit them from a hardcoded `bg-muted/40 text-muted-foreground`. Field label +
// input branches therefore reference the vars via arbitrary-value classes (fallback = today's look),
// e.g. label: `text-[color:var(--form-label,inherit)]`; input:
// `bg-[var(--form-input-bg,transparent)] border-[color:var(--form-input-border,inherit)] text-[color:var(--form-input-text,inherit)]`.
// When a color token is undefined the var is OMITTED (buildFormThemeStyleVars), so the fallback wins
// and the un-themed default keeps the muted-preview look (no inline color emitted).
// NOTE: the `--form-*` var names above are the EXACT keys `buildFormThemeStyleVars` emits —
// now PINNED in 516-01 (516-01:164 pinned key set): surface.background→`--form-surface-bg`,
// surface.borderColor→`--form-border`, title→`--form-title`, label→`--form-label`,
// helper→`--form-helper`, input bg/border/text→`--form-input-bg`/`--form-input-border`/
// `--form-input-text`, submit bg/text→`--form-submit-bg`/`--form-submit-text`. 516-04 + 516-06
// reference this ONE agreed set (516-06 consumes the same helper output at :143). Do NOT rename
// these or hardcode `bg-muted/40`; reconcile any drift TO the 516-01:164 pinned set.

// FieldPreview: add branch
kind === "select" ? (
  // REAL native <select> (styled like the prototype, disabled for preview) — a real
  // <select> DOM node, NOT a DIV look-alike and NOT the Radix combobox.
  <div className="relative">
    <select disabled defaultValue={(options && options[0]) ?? ""}
      className={cn("w-full appearance-none border px-3 pr-9", inputClass,
        selected ? "border-primary/30 bg-background" : "bg-muted/40 text-muted-foreground")}>
      {(options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
  </div>
) : kind === "rating" ? (
  <div className="flex gap-1">{Array.from({length: Math.min(10, Math.max(3, Number(max ?? 5)))}).map(...<Star/>)}</div>
) : kind === "range" ? (
  <input type="range" min={min} max={max} disabled className="w-full" />
) : (kind === "date" || kind === "time" || kind === "number" || kind === "phone" || kind === "email") ? (
  // REAL typed <input> (readOnly) + optional leading type-hint icon.
  (() => { const inputType = kind === "phone" ? "tel" : kind; /* date|time|number|email pass through */
    return (
      <div className="relative">
        {/* optional <Calendar/Clock/Hash/Phone/AtSign/> leading icon */}
        <input type={inputType} readOnly placeholder={placeholder} defaultValue={value}
          step={kind === "number" ? step : undefined}
          className={cn("w-full border px-3", inputClass, selected ? "border-primary/30 bg-background" : "bg-muted/40 text-muted-foreground")} />
      </div>
    ); })()
) : /* checkbox/radio/hidden: existing branches unchanged; text `Input` + `Textarea`
      branches keep their structure but ADD `inputClass` (input size/radius) to their
      className cn(...) so themed input size/radius applies uniformly to all typed
      controls, not only select/date/number. */ ...

// LABEL restyle (FormCanvas.tsx:74-83) — the micro-label MUST move OFF
// `text-[10px] font-semibold uppercase tracking-[0.2em]` to the resolved normal-case
// label typography (prototype <Label>), or the "un-themed default look" normal-case
// assertion (Testing §) cannot pass:
<label className={cn(labelClass /* "text-sm font-medium", NOT uppercase tracking-[0.2em] */,
  "text-[color:var(--form-label,inherit)]",  // labelColor var (omitted ⇒ inherit)
  selected ? "text-primary" : undefined)}>{label}</label>
// (helper/description text, if rendered, likewise reads `text-[color:var(--form-helper,inherit)]`.)

// renderField: map EACH type to a distinct kind (rating no longer → "range";
// date/time/number/phone/email no longer collapse to "text")
const kind = field.type === "select" ? "select"
  : field.type === "rating" ? "rating"
  : field.type === "range" ? "range"
  : field.type === "date" ? "date"
  : field.type === "time" ? "time"
  : field.type === "number" ? "number"
  : field.type === "phone" ? "phone"
  : field.type === "email" ? "email"
  : field.type === "checkbox" ? "checkbox"
  : field.type === "radio" ? "radio"
  : field.type === "hidden" ? "hidden" : "text";
// forward scale/step: min={field.settings.min} max={field.settings.max}
//   step={field.settings.inputStep ?? field.settings.step}
// forward resolved styling (computed ONCE in FormCanvas from `t`, same value for every field):
//   inputClass={cn(formThemeInputSizeClass[t.input.size], formThemeRadiusClass[t.input.radius])}
//   labelClass="text-sm font-medium"  // resolved normal-case label typography

// SUBMIT BUTTON (FormCanvas.tsx:298 — today hardcoded label "Submit Form" + always full-width).
// FULL-WIDTH PRECEDENCE is explicitly delegated to THIS subtask by 516-01:155
// (formThemeButtonAlignClass comment): full-width if EITHER t.submit.fullWidth OR
// t.layout.buttonAlignment === "full"; otherwise the (auto-width) button is aligned
// via formThemeButtonAlignClass[t.layout.buttonAlignment] (left:"mr-auto",
// center:"mx-auto", right:"ml-auto" — margin-auto alignment inside the `flex flex-col` form).
const submitFullWidth = t.submit.fullWidth || t.layout.buttonAlignment === "full";
const submitClass = cn(
  formThemeRadiusClass[t.submit.radius],   // submit radius (default lg ⇒ rounded-xl; 516-01:149)
  submitFullWidth ? "w-full" : cn("w-auto", formThemeButtonAlignClass[t.layout.buttonAlignment]),
  // submit color vars from buildFormThemeStyleVars(t) — ILLUSTRATIVE key names (use the
  // EXACT keys 516-01 emits, per the buildFormThemeStyleVars NOTE above); omitted ⇒ inherit.
  "bg-[var(--form-submit-bg,inherit)] text-[color:var(--form-submit-text,inherit)]",
);
// label override: un-themed ⇒ "Submit" (FormBuilderPreview.tsx:143), NOT the current "Submit Form".
<Button type="button" disabled className={submitClass}>{t.submit.label ?? "Submit"}</Button>
```

Grid wrappers (both single AND multi-step branches, `FormCanvas.tsx:263,278`): the real
wrappers are `grid gap-3 md:grid-cols-2` — replace the FULL `gap-3 md:grid-cols-2` substring
(keep only `grid`) with `cn(deviceWidth === "mobile" ? "grid-cols-1" : formColumnsClass, formThemeGapClass[t.layout.fieldGap])`
(where `formColumnsClass` is the local const from Scope §3) so EXACTLY ONE columns utility
(`formColumnsClass`) + ONE gap utility (`formThemeGapClass[fieldGap]`) survive — leaving the
pre-existing `gap-3` in place would collide with the injected gap and produce a non-deterministic
gap (mirror 516-06's explicit anti-collision handling). Per-field span uses the columns-aware rule from Scope §3
(`columns:1`→`col-span-1`; `columns:2`→`half:md:col-span-1`/`full:md:col-span-2`;
mobile→single column). The submit button applies `t.submit.*` + the
`t.layout.buttonAlignment` precedence rule 516-01:155 assigns to THIS subtask
(execution-ready pseudocode below). Title `<h2>` (`FormCanvas.tsx:243`) drops the hardcoded
`text-2xl font-semibold` for
`cn(formThemeTitleSizeClass[t.typography.titleSize], formThemeTitleWeightClass[t.typography.titleWeight], <title font-family class>)`
+ resolved title color (un-themed ⇒ prototype `font-display text-lg font-semibold`,
`FormBuilderPreview.tsx:106`).

Error handling: `resolveFormTheme(undefined)` yields 516-01's `FORM_THEME_DEFAULTS`
(width `"md"`, card on, etc.). These defaults are **prototype-aligned**, so an
un-themed canvas renders the PROTOTYPE look, NOT the current pre-change canvas —
see "Un-themed default look" below.

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formCanvas.test.tsx` (NEW/extend):
  - a `select` field renders a real `<select>` element (query the `<select>` DOM
    node, NOT an `<input type="text">`) — regression for B2, matching the parent's
    documented DOM test shape (parent lines 459-461);
  - a `date` field renders `<input type="date">` (likewise `phone`→`type="tel"`,
    `email`→`type="email"`, `number`→`type="number"`) — real typed inputs, not a
    generic text input and not a look-alike DIV — regression for B3, matching the
    parent test shape;
  - a `rating` field renders `max` scale items, not a slider — regression for B3;
  - applying a theme changes the container width class / submit label / card
    presence (assert on class + text, computed effect);
  - **submit alignment + full-width precedence** (`layout.buttonAlignment`): a theme
    with `submit.fullWidth:false` + `layout.buttonAlignment:"right"` yields a
    submit that is NOT `w-full` and carries `ml-auto`
    (`formThemeButtonAlignClass.right`); a theme with `layout.buttonAlignment:"full"`
    (even when `submit.fullWidth:false`) yields `w-full` (asserts the 516-01:155
    "full-width if EITHER" precedence rule); the un-themed default submit is `w-full`
    (`FORM_THEME_DEFAULTS.submit.fullWidth`);
  - **card border width** (`surface.borderWidth`): the un-themed card carries the
    default `border` (`formThemeBorderWidthClass.sm`), `surface.borderWidth:"md"`
    yields `border-2`, and `surface.borderWidth:"none"` (or `surface.card:false`)
    yields `border-0` (asserts the border-width token is wired, not hardcoded);
  - **themed field styling plumbs through to FieldPreview:** a theme with a
    non-default `input.size`/`input.radius` changes a field control's class
    (e.g. `input.size:"lg"` ⇒ `h-11 text-base`, `input.radius:"none"` ⇒
    `rounded-none` — asserts `inputClass` reaches the select/typed/text inputs, not a
    hardcoded `rounded-md`), and a theme with `typography.labelColor`/`input.*Color`
    emits the corresponding CSS var on the card (via `buildFormThemeStyleVars`) that
    the label/input class references — regression that the G4 color/size tokens are
    actually wired into the previews, not just the Card wrapper;
  - **un-themed default look:** rendering with `theme=undefined` produces the
    resolved-default (prototype-aligned) classes/text — assert the container is
    `max-w-lg` (NOT `max-w-2xl`), the card uses the default radius/shadow/padding
    (`p-6`, NOT `p-8 rounded-3xl shadow-xl`), the grid wrapper is `grid-cols-1`
    (single-column, NOT `md:grid-cols-2` — asserts the resolver `columns=1` default),
    the form title `<h2>` renders the prototype title typography (`text-lg` +
    `font-display`) and is **NOT** `text-2xl` (asserts the h2 moved off the
    hardcoded size to the resolved title-typography default),
    field micro-labels are normal-case
    (NOT `uppercase tracking-[0.2em]`), and the submit reads `Submit` (NOT
    `Submit Form`). This test REPLACES the old "matches pre-change snapshot"
    assertion — the pre-change canvas snapshot must be regenerated because applying
    resolved defaults intentionally moves the un-themed canvas to the prototype
    look (see "Un-themed default look" below). Do NOT assert byte-parity against
    the old visual snapshot.
  - per-field `width:"half"` still yields `md:col-span-1` under a `columns:2`
    form theme, and `col-span-1` (no `md:` split) under `columns:1` (precedence:
    field width > form columns).

## Un-themed default look (prototype alignment; snapshot regeneration)

The current canvas is NOT the prototype look and is NOT the baseline to preserve.
`resolveFormTheme(undefined)` → `FORM_THEME_DEFAULTS` (516-01), and those defaults
match the prototype canvas (`_docs/_PROTOTYPE/src/pages/advanced/FormBuilderPreview.tsx:103-146`):
`mx-auto max-w-lg`, `<Card className="p-6">` (Card default radius/shadow),
a **`font-display text-lg font-semibold`** form title (`:106`, NOT `text-2xl`),
normal-case `<Label>` above each input, single-column `flex flex-col gap-4`,
full-width submit reading **`Submit`**. Applying the resolved defaults therefore
moves the un-themed canvas FROM today's values TO the prototype ones:

| Element | Today (`FormCanvas.tsx`) | Un-themed resolved default (target) |
|---|---|---|
| Container width | `max-w-2xl` (:233) | `formThemeWidthClass["md"]` = `max-w-lg` |
| Form title (`<h2>`) | `text-2xl font-semibold` (:243) | prototype title typography = `font-display text-lg font-semibold` (`FormBuilderPreview.tsx:106`): `formThemeTitleSizeClass[<default titleSize>]` = `text-lg` + `formThemeTitleWeightClass[<default titleWeight>]` = `font-semibold` + the title font-family default `font-display` — **NOT `text-2xl`** |
| Grid columns | `md:grid-cols-2` (:263,278) | `formThemeColumnsClass[1]` = `grid-cols-1` (single column, prototype `flex flex-col`) |
| Card radius | `rounded-3xl` (:236) | default radius token (Card default, no `rounded-3xl`) |
| Card padding | `p-8` (:236) | `p-6` |
| Card shadow | `shadow-xl` (:236) | default shadow token |
| Field micro-label | `text-[10px] uppercase tracking-[0.2em]` (:77) | normal-case label (label-typography default) |
| Submit label | `Submit Form` (:298) | `Submit` |

**Byte-parity intent is scoped to 516-01's settings serialization ONLY** —
`getDefaultFormSettings()` stays byte-identical and no-theme rows normalize with
no `theme` key (516-01 §3, byte-identity test). It does NOT apply to canvas
visuals: the visual "baseline" here is the PROTOTYPE, not the pre-change canvas.
The existing FormCanvas visual snapshot (if any) MUST be regenerated as part of
this subtask; the regenerated snapshot is the prototype-aligned default above.

## UI/UX fidelity + max-config-flexibility notes

Canvas must render realistic per-type controls like the prototype canvas
(`FormBuilderPreview.tsx` canvas) and reflect the whole-form theme live so the
Design tab is a true WYSIWYG. Field width overrides form columns; document that
precedence in a code comment. No conservative fallback that keeps the generic
text-input-for-everything preview.
