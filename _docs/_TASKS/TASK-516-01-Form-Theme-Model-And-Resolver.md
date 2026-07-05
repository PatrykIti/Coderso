# TASK-516-01: Form Theme/Style Model (settings) & Resolver

# FileName: TASK-516-01-Form-Theme-Model-And-Resolver.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Services / Schema (JSON model) / Admin client
**Estimated Effort:** Medium
**Dependencies:** none — foundation. Rides the existing `PATCH /forms/:id` validated write path; `forms.settings` is `jsonb` (`schema.ts:1224`) so **no DDL**.
**Status:** ⏳ To Do

---

## Scope (single-writer keystone)

**Sole writer of `core/services/forms/formSettings.ts`,
`core/services/forms/formTheme.ts` (NEW), and the `FormSettings` type region of
`core/admin/services/formsClient.ts`.** Nothing renders the theme yet; 516-02
(Design panel), 516-04 (canvas), 516-06 (runtime) all import the model + resolver
this subtask lands. Ships:

1. **`FormFormTheme` type** added to `FormSettings` as an optional `theme` field,
   with the exact sub-record shape from the parent's "Schema-extension plan".
2. **`normalizeFormSettings` extension** — parse/validate `value.theme`:
   reject-unknown KEYS (present-only emission; drop unknown keys), fail-soft
   VALUES (bad enum/color omitted). Legacy forms without `theme` normalize
   byte-unchanged (no `theme` key emitted when absent).
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
   `theme` and ensure the client `normalizeFormSettings` call path preserves it
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
// ...radius/padding/shadow/inputSize/titleSize/titleWeight/fontFamily/buttonAlign sets

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
export type ResolvedFormTheme = { /* all tokens concrete */ };
export const FORM_THEME_DEFAULTS: ResolvedFormTheme = { layout:{ width:"md", align:"center", ... }, ... };
export function resolveFormTheme(theme?: FormFormTheme): ResolvedFormTheme { /* deep-merge over defaults */ }
export const formThemeWidthClass: Record<..., string> = { sm:"max-w-md", md:"max-w-lg", lg:"max-w-2xl", xl:"max-w-3xl", full:"max-w-none" };
export const formThemeColumnsClass: Record<1|2, string> = { 1:"grid-cols-1", 2:"md:grid-cols-2" }; // layout.columns → grid class (matches 516-04:62)
// ...align/gap/radius/padding/shadow/inputSize/titleSize/titleWeight maps
export function buildFormThemeStyleVars(t: ResolvedFormTheme): Record<string,string>; // for color tokens (bg/border/title/label/helper/submit)
```

**Full exported symbol list (this subtask is the SOLE writer of `formTheme.ts`; 516-02/04/06 import these read-only by exact name — 516-04:82 imports
`resolveFormTheme`, `formThemeWidthClass`, `formThemeRadiusClass`, `formThemePaddingClass`, `formThemeShadowClass`, `formThemeColumnsClass`, `buildFormThemeStyleVars`):**
`ResolvedFormTheme` (type), `FORM_THEME_DEFAULTS`, `resolveFormTheme`,
`formThemeWidthClass`, `formThemeColumnsClass`, `formThemeAlignClass`,
`formThemeGapClass`, `formThemeRadiusClass`, `formThemePaddingClass`,
`formThemeShadowClass`, `formThemeInputSizeClass`, `formThemeTitleSizeClass`,
`formThemeTitleWeightClass`, `buildFormThemeStyleVars`.

Error handling: no throws for bad VALUES (fail-soft). `normalizeFormSettings`
already returns defaults for a non-object `settings` (`formSettings.ts:83`).

## Testing requirements + lanes

- **Vitest pure** `tests/vitest/forms/formSettings.test.ts` (extend):
  - theme round-trips through `normalizeFormSettings` (present-only, exact shape);
  - **unknown theme key dropped** (`{ theme: { layout: { bogus: 1, width: "lg" } } }` → only `width`);
  - bad enum/color VALUE omitted (fail-soft); empty group omitted;
  - **byte-identity:** a form WITHOUT `theme` normalizes with NO `theme` key
    (`JSON.stringify` equals the pre-change baseline);
  - `getDefaultFormSettings()` unchanged (snapshot).
- **Vitest pure** `tests/vitest/forms/formTheme.test.ts` (NEW): `resolveFormTheme`
  deep-merge; every token→class map covers its full enum set — INCLUDING
  `formThemeColumnsClass` for both `1` and `2` (`layout.columns`), plus width /
  align / gap / radius / padding / shadow / inputSize / titleSize / titleWeight.
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
(container card on/off, width, align, columns, gaps, radius, padding, shadow,
title/label/helper typography + color, input size/radius/colors, submit
color/radius/full-width/label) so downstream panels can offer maximum control.
Every token optional and independently resettable.
