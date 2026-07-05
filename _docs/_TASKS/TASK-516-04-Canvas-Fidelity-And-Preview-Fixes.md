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
**Status:** ⏳ To Do

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
   line 393-394) and matches the prototype's styled native select
   (`_docs/_PROTOTYPE/src/components/ui/select.tsx` — a styled native `<select>` +
   `ChevronDown`). Today `kind:"select"` (`FormCanvas.tsx:204-206`) falls through
   to a text `Input`.
2. **B3 fix — type-accurate previews.** Real typed `<input>` controls (readOnly
   for the preview), matching the parent stub's `<input type=date|time|number|tel|
   email>` (parent line 400) — NOT one generic text `Input` and NOT a styled
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
   size/radius/colors, submit color/radius/full-width/label.
   **Columns→grid map + field-width precedence (concrete).** `columns` is the
   `1 | 2` token 516-01 lands (parent Schema-extension plan line 112; `normColumns`
   in `formSettings.ts`, default `2`; exposed on the resolved theme as
   `t.layout.columns`). **516-01 ships BOTH the `columns` token AND the
   `formThemeColumnsClass` map** (516-01:119, `{ 1:"grid-cols-1", 2:"md:grid-cols-2" }`)
   and pins `FORM_THEME_DEFAULTS.layout.columns = 2`, so
   `resolveFormTheme(undefined).columns` is always `1|2` (never `undefined`).
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
import { resolveFormTheme, formThemeWidthClass, formThemeRadiusClass, formThemePaddingClass, formThemeShadowClass, formThemeGapClass, buildFormThemeStyleVars } from "../../../services/forms/formTheme";
// NOTE: no formThemeColumnsClass import — the columns→grid map is local to this
// file (see Scope §3); 516-01 does not ship it.

// FieldPreviewProps: widen kind + carry scale/step
type FieldPreviewProps = { /* existing */ min?: number; max?: number; step?: number;
  kind?: "text"|"select"|"checkbox"|"radio"|"range"|"hidden"|"rating"|"date"|"time"|"number"|"phone"|"email"; };

// FormCanvasProps.fields[].settings: add min/max (already stored by validation.ts:32-33)
type FieldSettings = { /* existing */ min?: number; max?: number; /* placeholder/helper/options/... */ };
type FormCanvasProps = { /* existing */ deviceWidth?: "desktop"|"mobile"; theme?: FormFormTheme };

const t = resolveFormTheme(theme);
const containerClass = cn(
  deviceWidth === "mobile" ? "max-w-sm" : formThemeWidthClass[t.layout.width],
  t.layout.align === "left" ? "mr-auto" : t.layout.align === "right" ? "ml-auto" : "mx-auto",
);
const cardClass = cn(
  t.surface.card ? formThemeRadiusClass[t.surface.radius] : "border-0 shadow-none bg-transparent",
  formThemePaddingClass[t.surface.padding], formThemeShadowClass[t.surface.shadow], /* border width */
);
// style={buildFormThemeStyleVars(t)} → CSS vars for bg/border/title/label/helper/submit colors

// FieldPreview: add branch
kind === "select" ? (
  // REAL native <select> (styled like the prototype, disabled for preview) — a real
  // <select> DOM node, NOT a DIV look-alike and NOT the Radix combobox.
  <div className="relative">
    <select disabled defaultValue={(options && options[0]) ?? ""} className="w-full appearance-none rounded-md border bg-muted/40 px-3 py-2 pr-9 text-sm text-muted-foreground">
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
          className={cn("w-full rounded-md border px-3 py-2 text-sm", selected ? "border-primary/30 bg-background" : "bg-muted/40 text-muted-foreground")} />
      </div>
    ); })()
) : /* checkbox/radio/hidden/text/textarea: existing branches unchanged */ ...

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
```

Grid wrappers (both single AND multi-step branches, `FormCanvas.tsx:263,278`):
replace the hardcoded `md:grid-cols-2` with `cn(deviceWidth === "mobile" ? "grid-cols-1" : formColumnsClass, formThemeGapClass[t.layout.fieldGap])` (where `formColumnsClass` is the local const from Scope §3); per-field span uses the columns-aware rule from Scope §3
(`columns:1`→`col-span-1`; `columns:2`→`half:md:col-span-1`/`full:md:col-span-2`;
mobile→single column). Submit button uses `t.submit.*` (label override, colors,
radius, fullWidth).

Error handling: `resolveFormTheme(undefined)` yields 516-01's `FORM_THEME_DEFAULTS`
(width `"md"`, card on, etc.). These defaults are **prototype-aligned**, so an
un-themed canvas renders the PROTOTYPE look, NOT the current pre-change canvas —
see "Un-themed default look" below.

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formCanvas.test.tsx` (NEW/extend):
  - a `select` field renders a real `<select>` element (query the `<select>` DOM
    node, NOT an `<input type="text">`) — regression for B2, matching the parent's
    documented DOM test shape (parent line 393-394);
  - a `date` field renders `<input type="date">` (likewise `phone`→`type="tel"`,
    `email`→`type="email"`, `number`→`type="number"`) — real typed inputs, not a
    generic text input and not a look-alike DIV — regression for B3, matching the
    parent test shape;
  - a `rating` field renders `max` scale items, not a slider — regression for B3;
  - applying a theme changes the container width class / submit label / card
    presence (assert on class + text, computed effect);
  - **un-themed default look:** rendering with `theme=undefined` produces the
    resolved-default (prototype-aligned) classes/text — assert the container is
    `max-w-lg` (NOT `max-w-2xl`), the card uses the default radius/shadow/padding
    (`p-6`, NOT `p-8 rounded-3xl shadow-xl`), field micro-labels are normal-case
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
normal-case `<Label>` above each input, single-column `flex flex-col gap-4`,
full-width submit reading **`Submit`**. Applying the resolved defaults therefore
moves the un-themed canvas FROM today's values TO the prototype ones:

| Element | Today (`FormCanvas.tsx`) | Un-themed resolved default (target) |
|---|---|---|
| Container width | `max-w-2xl` (:233) | `formThemeWidthClass["md"]` = `max-w-lg` |
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
