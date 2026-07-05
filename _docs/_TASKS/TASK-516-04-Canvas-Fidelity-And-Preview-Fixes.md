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
   (styled read-only `<select>`-look listing `options`). Today `kind:"select"`
   (`FormCanvas.tsx:204-206`) falls through to a text `Input`.
2. **B3 fix — type-accurate previews.** Distinct affordances for `date`
   (calendar look), `time` (HH:MM), `number` (numeric + optional step hint),
   `phone` (tel), `email` (@). `rating` renders a **scale of `max` stars/pills**
   (not the `range` slider). `range` keeps a slider wired to min/max.
3. **Theme application (G4).** Wrap/style the canvas form-card from
   `resolveFormTheme(theme)`: container width (also constrained by `deviceWidth`
   from 516-03), align, card on/off, background/border/radius/padding/shadow,
   field gap, columns default, title/label/helper typography + colors, input
   size/radius/colors, submit color/radius/full-width/label. Per-field
   `style.width` still overrides the form `columns` default (precedence: field
   width > form columns).
4. Keep the existing multi-step grouping (`groupedFields`) and selection/remove
   affordances intact.

## Pseudocode (grounded in real code)

```tsx
import { resolveFormTheme, formThemeWidthClass, formThemeRadiusClass, buildFormThemeStyleVars } from "../../../services/forms/formTheme";

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
  <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
    <span>{(options && options[0]) ?? "Select an option"}</span><ChevronDown className="h-4 w-4" />
  </div>
) : kind === "rating" ? (
  <div className="flex gap-1">{Array.from({length: Math.max(3, Number(max ?? 5))}).map(...<Star/>)}</div>
) : /* date/time/number/phone/email → Input with matching type-hint icon */ ...

// renderField: fix kind mapping — rating no longer maps to "range"
const kind = field.type === "select" ? "select"
  : field.type === "rating" ? "rating"
  : field.type === "range" ? "range" : ...;
```

Field gap + columns applied on the grid wrappers (both single and multi-step
branches). Submit button uses `t.submit.*` (label override, colors, radius,
fullWidth).

Error handling: `resolveFormTheme(undefined)` yields defaults → canvas renders
exactly as today when no theme is set (visual byte-parity for un-themed forms).

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formCanvas.test.tsx` (NEW/extend):
  - a `select` field renders a select-look control (NOT a text input) —
    regression for B2;
  - a `rating` field renders `max` scale items, not a slider — regression for B3;
  - applying a theme changes the container width class / submit label / card
    presence (assert on class + text, computed effect);
  - **un-themed byte-parity:** rendering with `theme=undefined` matches the
    pre-change snapshot (no visual regression for existing forms);
  - per-field `width:"half"` still yields `md:col-span-1` under a `columns:2`
    form theme (precedence).

## UI/UX fidelity + max-config-flexibility notes

Canvas must render realistic per-type controls like the prototype canvas
(`FormBuilderPreview.tsx` canvas) and reflect the whole-form theme live so the
Design tab is a true WYSIWYG. Field width overrides form columns; document that
precedence in a code comment. No conservative fallback that keeps the generic
text-input-for-everything preview.
