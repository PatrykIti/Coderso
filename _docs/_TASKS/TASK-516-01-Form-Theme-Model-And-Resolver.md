# TASK-516-01: Form Theme/Style Model (settings) & Resolver

# FileName: TASK-516-01-Form-Theme-Model-And-Resolver.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Services / Schema (JSON model) / Admin client
**Estimated Effort:** Medium
**Dependencies:** none — foundation. Rides the existing `PATCH /forms/:id` validated write path; `forms.settings` is `jsonb` (`schema.ts:1224`) so **no DDL**.
**Status:** ✅ Done (2026-07-06)

---

## Scope (single-writer keystone)

**Sole writer of `core/services/forms/formSettings.ts`,
`core/services/forms/formTheme.ts` (NEW), and the `FormSettings` type region of
`core/admin/services/formsClient.ts`.** Nothing renders the theme yet; 516-02
(Design panel), 516-04 (canvas), 516-06 (runtime) all import the model + resolver
this subtask lands. Ships:

1. **`FormFormTheme` type** added to `FormSettings` as an optional `theme` field,
   covering every group/key of the parent's "Schema-extension plan"
   (layout/surface/typography/input/submit — INCLUDING `surface.borderWidth` and
   `layout.buttonAlignment:"full"`), with a **deliberately RICHER accepted-value
   vocabulary** on a few axes (see "## Reconciliation with parent shape"). The
   parent schema-extension plan MUST be widened to the reconciled vocabulary so
   both contracts agree on the persisted reject-unknown allowlist.
2. **`normalizeFormSettings` extension** — parse/validate `value.theme`:
   reject-unknown KEYS (present-only emission; drop unknown keys), fail-soft
   VALUES (bad enum/color omitted). Legacy forms without `theme` normalize with
   NO `theme` key emitted (theme-absence invariant). NOTE: `normalizeFormSettings`
   is a **fully-defaulted** normalizer (always re-emits the base keys from a fresh
   object literal, returns `getDefaultFormSettings()` for a non-record —
   `formSettings.ts:82-125`), so this is a **present-only theme-absence** invariant,
   NOT whole-object byte-identity against the input (see parent TASK-516 lines 190-194).
3. **`getDefaultFormSettings`** left byte-identical (does NOT add `theme`) so the
   no-theme baseline stays present-only.
4. **`formTheme.ts` resolver** — `resolveFormTheme(theme | undefined) →
   ResolvedFormTheme` (all tokens resolved to concrete values) + token→className
   / token→style maps (width, align, gap, radius, padding, shadow, input size,
   title size/weight, submit). This subtask defines its OWN (richer) token
   vocabulary + class/style maps in `formTheme.ts` — it does **not** align to the
   widget's `FormEmbedStyle`/`FormEmbedLayout`, whose vocabulary DIVERGES on
   several axes (widget `borderWidth` `0|1|2` vs model `none|sm|md`; widget
   `radius` `none|sm|md|lg` and `titleSize` `sm|md|lg` lack the `xl` this model
   adds; widget `widthClassMap` uses `lg:max-w-xl`/`xl:max-w-2xl` vs this model's
   `lg:max-w-2xl`/`xl:max-w-3xl`). 516-06 makes the widget inherit by consuming
   `resolveFormTheme` + the `formTheme.ts` maps as its defaults (NOT by aligning
   the theme to the widget); any per-axis reconciliation with the legacy
   `FormEmbedStyle` shape is a token-translation 516-06 owns and must name
   explicitly.
5. **`formsClient.ts`** — extend the mirrored admin `FormSettings` type with
   `theme?: FormFormTheme`, **re-export the `FormFormTheme` type** from
   `formsClient.ts` (mirroring the existing `export type FormStatus = SharedFormStatus`
   re-export at `formsClient.ts:12` — verified present; `FormFormTheme` is NOT
   re-exported today), so 516-03 can `import type { FormFormTheme } from
   "@/services/formsClient"` per its admin type-boundary contract (516-03 lines 14-21,
   126), and ensure the client `normalizeFormSettings` call path preserves `theme`
   on read/round-trip.

**NO route/RBAC/endpoint/migration change. NO `schemaVersion`.**

## Security Contract

**Schema-first JSON-model extension; no new route/RBAC/endpoint/migration.** The
`theme` normalizer lives in `formSettings.ts` and runs inside the existing
`updateForm`/`createForm` write path (`formsService.ts:93,161`) which is already
gated by `forms:write` (`formsRoutes.ts:249,268`). Reject-unknown at the KEY
boundary; VALUES are fail-soft (invalid color/enum omitted — raw stored input
never reaches CSS; colors flow through `resolveClearableCssColorValue`
(`core/widgets/core/clearableStyle.ts:66`), the same value policy the widget uses,
which whitelists hex / `var(--color-*)` / bounded `rgb()`/`hsl()`/safe keyword and
rejects `url()`/`expression()`/`javascript:`/`data:`/`;{}<>`). The stored-read normalizer stays fail-closed: a legacy form
row without `theme` parses unchanged. **Each new key that joins the reject-unknown
allowlist is a fail-closed READ TRAP ⇒ carries a round-trip persistence test.**

## Pseudocode (grounded in real code)

`formSettings.ts` (extend existing file):

```ts
// enum sets (single source of truth; imported read-only by 516-02/04/06)
export const FORM_THEME_WIDTHS = new Set(["sm","md","lg","xl","full"] as const);
export const FORM_THEME_ALIGNS = new Set(["left","center","right"] as const);
export const FORM_THEME_GAPS = new Set(["sm","md","lg"] as const);   // layout.fieldGap
// ...radius(none|sm|md|lg|xl)/padding(sm|md|lg|xl)/shadow(none|soft|sm|md|lg)/borderWidth(none|sm|md)/inputSize(sm|md|lg)/titleSize(sm|md|lg|xl)/titleWeight(normal|medium|semibold|bold)/fontFamily(display|inherit|sans|serif|mono) sets, PLUS FORM_THEME_BUTTON_ALIGNS(left|center|right|full) for layout.buttonAlignment (does NOT reuse FORM_THEME_ALIGNS — it carries the parent's extra "full") — each with a matching token→class map below. Vocabulary is RICHER than the parent shape by design (max-config-flexibility) — see "## Reconciliation with parent shape" below; the parent schema-extension plan MUST be widened to match so both contracts agree on the persisted reject-unknown allowlist

export type FormFormTheme = { layout?: {...}; surface?: {...}; typography?: {...}; input?: {...}; submit?: {...}; };
export type FormSettings = { /* existing */ theme?: FormFormTheme };

const normalizeEnum = <T extends string>(v: unknown, set: Set<T>): T | undefined =>
  typeof v === "string" && set.has(v as T) ? (v as T) : undefined;      // fail-soft
import { resolveClearableCssColorValue } from "../../widgets/core/clearableStyle";
const normalizeColor = (v: unknown): string | undefined =>
  resolveClearableCssColorValue(v); // real helper (clearableStyle.ts:66): returns undefined for unsafe/blank ⇒ fail-soft VALUE
const normalizeBool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

const normalizeThemeGroup = (raw: unknown, spec) => {          // present-only
  if (!isRecord(raw)) return undefined;
  const out: Record<string,unknown> = {};
  for (const [key, norm] of Object.entries(spec)) {           // ONLY known keys
    const val = norm(raw[key]);                               // unknown keys ignored
    if (val !== undefined) out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : undefined;       // omit empty group
};

const normalizeFormTheme = (raw: unknown): FormFormTheme | undefined => {
  if (!isRecord(raw)) return undefined;
  const theme: FormFormTheme = {};
  const layout   = normalizeThemeGroup(raw.layout, { width:..., align:..., fieldGap:..., columns:normColumns, buttonAlignment:... });
  const surface  = normalizeThemeGroup(raw.surface, { card:normalizeBool, background:normalizeColor, ... });
  // typography / input / submit likewise; submit.label via normalizeOptionalText
  if (layout) theme.layout = layout;  // ...assign each present group
  return Object.keys(theme).length > 0 ? theme : undefined;   // omit when nothing valid
};

// inside normalizeFormSettings(), after existing fields:
const theme = normalizeFormTheme((value as any).theme);
if (theme) normalized.theme = theme;                          // present-only
return normalized;
```

`formTheme.ts` (NEW):

```ts
import type { FormFormTheme } from "./formSettings";
export type ResolvedFormTheme = {
  layout:     { width: FormThemeWidth; align: FormThemeAlign; columns: 1|2; fieldGap: FormThemeGap; buttonAlignment: FormThemeButtonAlign /* left|center|right|full — keeps parent's "full" */ };
  surface:    { card: boolean; padding: FormThemePadding; radius: FormThemeRadius; shadow: FormThemeShadow; borderWidth: FormThemeBorderWidth /* none|sm|md — parent surface.borderWidth */; background?: string; borderColor?: string };
  typography: { fontFamily: FormThemeFontFamily; titleSize: FormThemeTitleSize; titleWeight: FormThemeTitleWeight; titleColor?: string; labelColor?: string; helperColor?: string };
  input:      { size: FormThemeInputSize; radius: FormThemeRadius; background?: string; borderColor?: string; textColor?: string };
  submit:     { fullWidth: boolean; radius: FormThemeRadius; label?: string; background?: string; textColor?: string };
}; // ALL enum/bool tokens concrete (columns is always 1|2, never undefined); optional COLOR tokens stay undefined by default (inherit theme tokens, no inline var emitted)

// FORM_THEME_DEFAULTS = the un-themed canvas. resolveFormTheme(undefined) MUST
// reproduce the prototype form canvas EXACTLY (FormBuilderPreview.tsx:103-146:
// `mx-auto max-w-lg` + `<Card className="p-6">` + title `font-display text-lg
// font-semibold` + `<form className="flex flex-col gap-4">` + `<Button className="w-full">`).
// Every default below is grounded in that source (line cited per value); 516-04
// renders these verbatim, so pinning them here is the prototype-fidelity contract.
export const FORM_THEME_DEFAULTS: ResolvedFormTheme = {
  layout:     { width:"md" /* →max-w-lg :103 */, align:"center" /* mx-auto :103 */, columns:1 /* SINGLE column :112 */, fieldGap:"md" /* →gap-4 :112 */, buttonAlignment:"left" },
  surface:    { card:true /* <Card> wrapper :104 */, padding:"lg" /* →p-6 :104 */, radius:"xl" /* Card rounded-2xl → xl token (formThemeRadiusClass.xl="rounded-2xl"); core/proto card.tsx */, shadow:"soft" /* Card shadow-soft (custom utility --admin-shadow-soft; core+proto card.tsx); NOT shadow-sm */, borderWidth:"sm" /* Card `border` = 1px → sm (core+proto card.tsx) */, background:undefined, borderColor:undefined },
  typography: { fontFamily:"display" /* font-display :106 */, titleSize:"lg" /* →text-lg :106 */, titleWeight:"semibold" /* font-semibold :106 */, titleColor:undefined, labelColor:undefined, helperColor:undefined },
  input:      { size:"md", radius:"lg" /* Input rounded-xl → lg token (formThemeRadiusClass.lg="rounded-xl"); core+proto input.tsx, NOT md/rounded-lg */, background:undefined, borderColor:undefined, textColor:undefined },
  submit:     { fullWidth:true /* w-full :142 */, radius:"lg" /* Button base rounded-xl → lg token; core+proto button.tsx, NOT md/rounded-lg */, label:undefined /* falls back to "Submit" :143 at render */, background:undefined, textColor:undefined },
};
export function resolveFormTheme(theme?: FormFormTheme): ResolvedFormTheme { /* per-GROUP deep-merge over FORM_THEME_DEFAULTS; undefined/omitted group or key → default value */ }
export const formThemeWidthClass: Record<FormThemeWidth, string> = { sm:"max-w-md", md:"max-w-lg" /* prototype default :103 */, lg:"max-w-2xl", xl:"max-w-3xl", full:"max-w-none" };
export const formThemeColumnsClass: Record<1|2, string> = { 1:"grid-cols-1" /* prototype default :112 */, 2:"md:grid-cols-2" }; // layout.columns → grid class (consumed by 516-04:83-84 + 516-06)
export const formThemeAlignClass: Record<FormThemeAlign, string> = { left:"mr-auto", center:"mx-auto" /* prototype default :103 */, right:"ml-auto" };
export const formThemeButtonAlignClass: Record<FormThemeButtonAlign, string> = { left:"mr-auto", center:"mx-auto", right:"ml-auto", full:"w-full" /* parent's "full" = full-bleed submit; overlaps submit.fullWidth — 516-04/06 own precedence (full-width if EITHER buttonAlignment==="full" OR submit.fullWidth) */ };
export const formThemeGapClass: Record<FormThemeGap, string> = { sm:"gap-2", md:"gap-4" /* prototype default :112 */, lg:"gap-6" };
export const formThemePaddingClass: Record<FormThemePadding, string> = { sm:"p-4", md:"p-5", lg:"p-6" /* prototype default :104 */, xl:"p-8" };
export const formThemeRadiusClass: Record<FormThemeRadius, string> = { none:"rounded-none", sm:"rounded-md", md:"rounded-lg", lg:"rounded-xl", xl:"rounded-2xl" };
export const formThemeShadowClass: Record<FormThemeShadow, string> = { none:"shadow-none", soft:"shadow-soft" /* prototype/Card default (custom utility) :104 */, sm:"shadow-sm", md:"shadow-md", lg:"shadow-lg" };
export const formThemeBorderWidthClass: Record<FormThemeBorderWidth, string> = { none:"border-0", sm:"border" /* Card default 1px :104 */, md:"border-2" };
export const formThemeInputSizeClass: Record<FormThemeInputSize, string> = { sm:"h-8 text-sm", md:"h-9 text-sm", lg:"h-11 text-base" };
export const formThemeTitleSizeClass: Record<FormThemeTitleSize, string> = { sm:"text-sm", md:"text-base", lg:"text-lg" /* prototype default :106 */, xl:"text-xl" };
export const formThemeTitleWeightClass: Record<FormThemeTitleWeight, string> = { normal:"font-normal", medium:"font-medium", semibold:"font-semibold" /* prototype default :106 */, bold:"font-bold" };
export function buildFormThemeStyleVars(t: ResolvedFormTheme): Record<string,string>; // ONLY for the OPTIONAL color tokens (surface.background/borderColor, typography.title/label/helperColor, input bg/border/textColor, submit bg/textColor) — omits any undefined color so the un-themed default emits NO inline vars and inherits the prototype's theme tokens
// PINNED CSS-var key set (the SOLE-WRITER contract — 516-04 + 516-06 reference these EXACT
// names as `var(--…)` on their render paths; they are NOT illustrative and MUST NOT drift):
//   surface.background  -> "--form-surface-bg"
//   surface.borderColor -> "--form-border"
//   typography.titleColor  -> "--form-title"
//   typography.labelColor  -> "--form-label"
//   typography.helperColor -> "--form-helper"
//   input.background   -> "--form-input-bg"
//   input.borderColor  -> "--form-input-border"
//   input.textColor    -> "--form-input-text"
//   submit.background  -> "--form-submit-bg"
//   submit.textColor   -> "--form-submit-text"
// Each key is emitted ONLY when its resolved color token is defined (present-only); an undefined
// token emits NO entry so the consumer's `var(--…, <fallback>)` keeps the un-themed default.
```

**Full exported symbol list (this subtask is the SOLE writer of `formTheme.ts`; 516-02/04/06 import these read-only by exact name — 516-04:104 imports
`resolveFormTheme`, `formThemeWidthClass`, `formThemeRadiusClass`, `formThemePaddingClass`, `formThemeShadowClass`, `formThemeGapClass`, `formThemeColumnsClass`, `buildFormThemeStyleVars`):**
`ResolvedFormTheme` (type), `FORM_THEME_DEFAULTS`, `resolveFormTheme`,
`formThemeWidthClass`, `formThemeColumnsClass`, `formThemeAlignClass`,
`formThemeButtonAlignClass`, `formThemeGapClass`, `formThemeRadiusClass`,
`formThemePaddingClass`, `formThemeShadowClass`, `formThemeBorderWidthClass`,
`formThemeInputSizeClass`, `formThemeTitleSizeClass`,
`formThemeTitleWeightClass`, `buildFormThemeStyleVars`.

Error handling: no throws for bad VALUES (fail-soft). `normalizeFormSettings`
already returns defaults for a non-object `settings` (`formSettings.ts:83`).

## Reconciliation with parent shape (parent MUST be updated to match)

This subtask is the authoritative single source of the accepted-value allowlist
(its enum sets ARE the reject-unknown boundary). It intentionally carries a
**richer** vocabulary than the parent TASK-516 "Schema-extension plan" on the
axes below; because each of these values joins the persisted allowlist, the
parent plan MUST be updated so both contracts agree (otherwise a round-trip test
asserting e.g. `padding:"xl"` persists here would contradict the parent).

| Axis | Parent (today) | This subtask (authoritative) | Reason |
|------|----------------|------------------------------|--------|
| `surface.shadow` | `none\|sm\|md\|lg` | `none\|soft\|sm\|md\|lg` | **Fidelity:** the un-themed default reproduces the Card's real `shadow-soft` (a custom utility, `--admin-shadow-soft`); the map had no way to emit it, so the default rendered a harder `shadow-sm`. `soft` is now the default. |
| `surface.padding` | `sm\|md\|lg` | `sm\|md\|lg\|xl` | max-config-flexibility (extra roomier preset). |
| `surface.borderWidth` | `none\|sm\|md` | `none\|sm\|md` (RESTORED — was dropped) | Parent parity + resettable border width. Default `sm` = Card's `border` (1px). |
| `typography.titleWeight` | `medium\|semibold\|bold` | `normal\|medium\|semibold\|bold` | max-config-flexibility (lighter title). |
| `input.radius` / `submit.radius` | `none\|sm\|md\|lg` | `none\|sm\|md\|lg\|xl` (shared `FormThemeRadius`) | Consistency with `surface.radius` which already reaches `xl`; defaults are `lg` (Input/Button `rounded-xl`), NOT the parent-implied `md`. |
| `layout.buttonAlignment` | `left\|center\|right\|full` | `left\|center\|right\|full` (RESTORED — was collapsed to `FORM_THEME_ALIGNS`) | Keep parent's `full`; `full` = full-bleed submit and overlaps `submit.fullWidth` (516-04/06 own precedence). |

Anyone landing 516-01 must open a matching parent-plan edit (outside this
single-writer file) to widen those unions; do NOT ship the subtask with the
parent still narrower.

## Testing requirements + lanes

- **Vitest pure** `tests/vitest/forms/formSettings.test.ts` (extend):
  - theme round-trips through `normalizeFormSettings` (present-only, exact shape) —
    the fixture MUST exercise every newly-allowlisted key/value so the reject-unknown
    boundary is proven to accept them: `surface.borderWidth` (e.g. `"md"`),
    `surface.shadow:"soft"`, `surface.padding:"xl"`, `typography.titleWeight:"normal"`,
    `input.radius:"xl"` / `submit.radius:"xl"`, `layout.buttonAlignment:"full"`;
  - **unknown theme key dropped** (`{ theme: { layout: { bogus: 1, width: "lg" } } }` → only `width`);
  - bad enum/color VALUE omitted (fail-soft); empty group omitted;
  - **present-only theme-absence:** a form WITHOUT `theme` normalizes with NO
    `theme` key — assert `expect("theme" in normalizeFormSettings(noThemeInput)).toBe(false)`
    (optionally also assert the base keys are still present + correctly normalized).
    Do NOT assert `JSON.stringify(out) === JSON.stringify(input)`: the normalizer is
    fully-defaulted (`formSettings.ts:82-125`) so whole-object byte equality fails for
    any legacy input not already in the exact normalized shape/key-order (parent 190-194);
  - `getDefaultFormSettings()` unchanged (snapshot).
- **Vitest pure** `tests/vitest/forms/formTheme.test.ts` (NEW): `resolveFormTheme`
  deep-merge; every token→class map covers its full enum set — INCLUDING
  `formThemeColumnsClass` for both `1` and `2` (`layout.columns`), plus width /
  align / buttonAlign (incl. `full`→`w-full`) / gap / radius / padding /
  shadow (incl. `soft`→`shadow-soft`) / borderWidth (none/sm/md) / inputSize /
  titleSize / titleWeight (incl. `normal`);
  - **prototype-default assertions** (516-04 renders `FORM_THEME_DEFAULTS` verbatim,
    so pin them): `resolveFormTheme(undefined)` yields `surface.shadow==="soft"`
    (→`shadow-soft`), `surface.radius==="xl"` (→`rounded-2xl`),
    `surface.borderWidth==="sm"` (→`border`), `input.radius==="lg"` &
    `submit.radius==="lg"` (→`rounded-xl`), `layout.width==="md"` (→`max-w-lg`).
- **Vitest admin** `tests/vitest/admin/formsClient.test.ts` (extend): client
  `updateForm({settings:{theme}})` preserves theme on the cached round-trip.
- **Bun DB round-trip** `tests/unit/forms/formsService.test.ts` (extend — this is
  the real DB lane: it imports `{ db }` (`:5`), creates rows via `createForm` and
  cleans up with `db.delete(forms)` in `afterEach` (`:61-65`), and already
  round-trips `settings.layoutMode` through `createForm`/`updateForm`
  (`formsService.ts:93/161`, asserted `:105-151`)):
  - `updateForm(id, { settings: { theme } })` with a FULL theme round-trips it
    from the DB (mirror the existing `settings.layoutMode` round-trip — read back
    `(form.settings as { theme?: ... }).theme` and assert the resolved shape);
  - `updateForm`/`createForm` with an UNKNOWN theme key persists the row but the
    read-back has the key DROPPED (reject-unknown at KEY level);
  - each test creates + cleans up its own form row (the suite's `afterEach`
    `db.delete(forms)` already makes this shared-DB safe).
  (The mock-only `tests/integration/routes/forms.test.ts` — no `db` import; it
  only asserts route wiring / `mapFormError` / schema shapes — CANNOT persist or
  create/delete rows; keep any schema-shape assertion there if desired, but the
  "persists it / own row" claim only holds in the `formsService.test.ts` DB lane.)

## UI/UX fidelity + max-config-flexibility notes

Model must express every prototype-implied and reasonable extra styling axis
(container card on/off, width, align, button alignment, columns, gaps, radius,
padding, shadow, border width + border color, title/label/helper typography +
color, input size/radius/colors, submit color/radius/full-width/label) so
downstream panels can offer maximum control. Every token optional and
independently resettable.
