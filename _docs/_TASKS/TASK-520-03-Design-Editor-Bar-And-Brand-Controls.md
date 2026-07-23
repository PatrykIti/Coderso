# TASK-520-03: Design Editor — Menu-Bar Scrolled/Radius/Shadow & Brand Icon/Combo Controls

# FileName: TASK-520-03-Design-Editor-Bar-And-Brand-Controls.md

**Parent Task:** TASK-520
**Priority:** High
**Category:** Admin UI / Content (Menus)
**Estimated Effort:** Medium
**Dependencies:** TASK-520-01 (model), TASK-520-02 (CSS — so the admin preview canvas reflects the new keys via `buildMenuDocumentCss`). TASK-519 (alpha color control — consumed for the scrolled/brand-icon color swatches; graceful fallback to the hex-only control if 519 has not landed).
**Status:** ✅ Done

---

## Scope (single-writer)

**520-03 is the SOLE WRITER of `core/admin/ui/menus/MenuDesignEditor.tsx`.** Adds
the authoring controls for the new model keys + a preview scrolled-state toggle so
authors can SEE the scrolled variant in the canvas. Two disjoint leaves:

- **520-03-L01** — menu-bar controls region (`MenuBarPanel`, around @980-1080): a
  "Radius" number control, a "Custom shadow" text/value control, and a
  **"Scrolled state" group** (surface color / border color / border width /
  shadow preset / custom shadow) — only meaningful when `sticky` is on (gate the
  group on `layout.sticky`). Plus the canvas preview "scrolled" toggle.
- **520-03-L02** — brand controls region (`BrandLogoPicker` @1210-1276 + brand
  style controls @1301-1414 + the canvas brand preview @725-760): a **mode
  selector** (Text / Image / Icon), an **icon picker** (reuse the Timeline lucide
  browser pattern — `lucideKebabIconComponents`/`lucideIconNames`) + icon
  color/size style controls, and a **"Show text alongside" combo toggle**.

ZERO edits to `menuDocumentV2.ts`, `menuDocumentCss.ts`, `siteShell.tsx`. Consumes
the model + CSS read-only.

## Grounded anchors

`MenuBarPanel` layout resolve @920-924; `setLayoutField`/`setField` @926;
`setColor` @927-928; `layoutOverride`/`resetLayout`/`layoutBaseValue`/`layoutIsSet`
@931-957; `layoutControl(key,label,node)` @958-978 (wraps `MenuResponsiveControlShell`
+ `ControlDefaultHint`); existing controls @987-1080 (surfaceColor @987, borderColor
@997, alignment @1008, borderWidth @1049, shadow enum @1058-1066 with `shadowLabels`
@298, sticky @1069-1074); `ColorSwatchControl` import; `BrandLogoPicker` @1210-1276
(`MediaPickerControl` @1270); brand style controls @1301-1414 (`resolveMenuBrandStyleForDevice`
@1302, `setBrand` @1313, `brandStyleControl` @1327); canvas brand preview @725-760
(`resolveBrandImageSrc` @742, img XOR text @750). `shadowLabels` @298.

## Security note

No route surface. The controls only WRITE values the 520-01 normalizer re-validates
(color whitelist, box-shadow whitelist, icon-name pattern). The custom-shadow text
control MUST surface helper text (the shadow color accepts the same whitelist as
other color fields — hex/rgb[a]/hsl[a]/var/transparent — per 520-01-L02's
bracket-aware grammar) and show a fail-soft indication when a value is dropped
(re-read shows the control empty). No client-side trust: the model normalizer is
authoritative.

## Cross-subtask reconcile

`layoutBaseValue`/`resetLayoutBase` (@948,955) call
`readMenuSectionBaseValue`/`clearMenuSectionBase` (defined in `menuDocumentV2.ts`
@2197/@2146) with `key as keyof MenuAppearance`. The new extra keys (`radius`,
`shadowCustom`, `*Scrolled`) are `keyof MenuBarLayout` but NOT `keyof MenuAppearance`.
**Resolved by 520-01-L01:** it widens both helper param types to
`keyof MenuAppearance | keyof MenuBarLayout` (type-only, runtime unchanged — the
helpers already read/write `section.layout[key]` by name). So 520-03 passes the
extra keys with NO unsafe cast and NO second-file edit. `layoutControl(key,…)`,
`setField(key,value)`, `layoutOverride`/`resetLayout` (which use
`readMenuSectionOverrideValue`/`clearMenuSectionOverride`, likewise generic) all
thread the extra keys unchanged. If a residual excess-property/type error appears
at the admin `tsc` gate, it is a reconcile failure against L01's widening — do NOT
paper over it with `as any` in this file.

## Testing Requirements

Vitest admin/UI (`tests/vitest/ui/menu-design-editor.test.tsx`): control render +
onChange assertions per leaf (below). The ≥6-scenario Playwright smoke is in 520-05.
