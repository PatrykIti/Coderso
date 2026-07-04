# TASK-504-02

# FileName: TASK-504-02-Menu-CSS-Brand-Level-And-Cheap-Wins.md

**Parent Task:** TASK-504
**Title:** Menu CSS — Brand Rules, Per-Level Rules & Cheap Wins
**Priority:** High
**Category:** Admin UI / Menus / Site Shell
**Estimated Effort:** Large
**Status:** ✅ Done
**Completed:** 2026-07-03
**Depends on:** TASK-504-01 (model: `BrandStyle`, `NavLevelStyle`, `levelStyles` on
`NavItemsProps`, per-link `paddingX/paddingY/radius`, hover-text `linkHoverTextColor`,
`normalizeBrandStyle` / `normalizeNavLevelStyles`, the new clamp-range tables, the
per-device responsive channel carrying brand `style` + `navProps.levelStyles`, AND the
EXPORTED per-device cascade resolvers this CSS module consumes rather than re-implements:
`resolveMenuBrandStyleForDevice(block, device): BrandStyle` (`{}`-when-unstyled) and the
now-level-aware `resolveMenuSectionAppearanceForDevice(section, device)` whose returned
`navProps.levelStyles` is the DESKTOP-cascaded deep merge — mobile never inherits tablet)
**Blocks:** TASK-504-03 (front `aria-current` stamp consumed by the current-page rule),
TASK-504-04 (editor threads `selectedLevel` into `buildMenuDocumentPreviewCss` AND stamps
`data-menu-block-id={block.id}` on the CANVAS brand `<a class="site-header-brand">`,
`MenuDesignEditor.tsx:578` — mirroring the front `siteShell.tsx:414,428` — so directly-set brand
props like `font-weight` take effect on canvas, not just inheritable ones; see §1 data-flow note),
TASK-504-05 (tests, docs, closure)

---

## Scope (single-writer ownership)

**Sole writer of `core/site/menuDocumentCss.ts`.** This subtask emits ALL new CSS for
TASK-504 through the ONE shared `buildMenuRuleSetsForDocument` so the front
(`buildMenuDocumentCss`, `@media`) and the canvas (`buildMenuDocumentPreviewCss`,
flattened) never diverge. It reads (never re-defines) the model shapes and normalizers
landed by 504-01, and consumes the `aria-current` stamp landed by 504-03. It writes NO
model, NO editor, NO front markup. The base sheet (`core/site/siteShellCss.ts`) is NOT
imported for CSS, NOT modified — only `SHELL_APPEARANCE_DEFAULTS` (a validated value
table) stays reused, exactly as today.

Deliverables in this file:
1. `collectMenuBrandRules(doc)` — per-brand-block text + `img{}` rules → `base`.
2. `navLevelRules(navBlock, a)` — per-level link + submenu-container chrome → `desktopShared`.
3. New `.site-nav-link` per-link **padding/radius** rule group (`MENU_RULE_GROUPS`).
4. **Hover-text** color emission + **current-page** `:where([aria-current="page"])` rule.
5. Per-device (tablet + mobile) emission of brand `style` + `levelStyles` deltas through
   `buildMenuRuleSetsForDocument`.
6. Canvas **force-open-selected-level** in `buildMenuDocumentPreviewCss`.

Absent style ⇒ ZERO new bytes (present-only guard). `buildSiteShellCss(null)`
byte-identical (ZERO edits to `siteShellCss.ts`); no-override docs byte-identical.

### Security Contract

UI/client-state + schema-first document contract extension; **no new route/RBAC/
endpoint/migration**. This subtask only READS the already-validated, already-normalized
`MenuDocumentV2` (colors token-backed, numbers clamped, enums mapped by 504-01) and
emits doc-scoped CSS strings. Every id interpolated into a selector goes through
`escapeAuthoringCssString` (existing precedent, `:377`/`:424`). No raw stored input
reaches the sheet; no `schemaVersion` bump.

---

## Verified source anchors (`core/site/menuDocumentCss.ts`, read 2026-07-02)

- `menuDocScope = "[data-site-menu-doc=\"true\"]"` (`:137`). ALL new rules scoped under it.
- `MenuRuleSets` (`:122-135`): `base`, `desktopShared`, `tabletDelta`, `mobile`,
  `previewMobileOpen`, `hide`. New brand rules ride `base`; new level base rules ride
  `desktopShared` (shared ≥640, front + canvas); level deltas ride `tabletDelta` + `mobile`.
- `MENU_RULE_GROUPS` (`:175-258`) — scalar delta engine keyed by `keyof ResolvedMenuAppearance`.
  Group 5 (`link`, `:227-232`) owns `.site-nav-link`. New padding/radius group appended here.
- `collectDeltaRules(resolved, base)` (`:429-437`) — SCALAR per-group deltas, reused verbatim
  for tablet AND mobile. `levelStyles` is a NESTED record → NOT a scalar field → handled by a
  SEPARATE `navLevelDeltaRules`, NOT folded into `MENU_RULE_GROUPS`.
- `collectMenuDividerRules(doc)` (`:362-382`) — the per-block-id emission template
  `collectMenuBrandRules` mirrors (loop `doc.sections[0].blocks`, `escapeAuthoringCssString`
  the id, `[data-menu-block-id="<esc>"]` / `[data-block-id="<esc>"]`). Brand `<a>` carries
  `data-menu-block-id={block.id}` (`siteShell.tsx:414,428`) — image `<img>` is a descendant.
- `navNestingRules(a)` (`:397-412`) + `dropdownRule(base)` (`:264-265`) → `desktopShared`
  (`:453`). `navLevelRules` appended into `desktopShared` beside them.
- `buildMenuRuleSetsForDocument` (`:439-475`) resolves `base`/`tabletResolved`/
  `mobileResolved` via `resolveMenuAppearanceForDevice`. Level styles are NESTED (not in the
  flat `MenuAppearance`), so this module does NOT re-derive them: it reads the
  DESKTOP-cascaded per-device `levelStyles` off 504-01's now-level-aware
  `resolveMenuSectionAppearanceForDevice(section, device).navProps.levelStyles` (§5) — one
  authoritative cascade resolver shared with the 504-04 editor badges, never a local clone.
- `buildMenuDocumentCss(doc)` (`:490-519`): shared ≥640 branch spreads `desktopShared`;
  bounded 640–1023 tablet branch spreads `tabletDelta`; ≤639 mobile branch spreads `mobile`.
- `buildMenuDocumentPreviewCss(doc, device)` (`:573-582`): tablet/desktop branches spread
  `desktopShared`(+`tabletDelta`); mobile spreads `mobile`+`previewMobileOpen`. **This is where
  the canvas force-open-selected-level lands** (mirror `previewMobileOpen`, emitted LAST).
- `buildCanvasStructuralBaseline` (`:532-555`) mirrors base-sheet STRUCTURE only (brand,
  sublist chrome `:548`). It stays UNTOUCHED — the new doc rules are emitted AFTER it and win
  on source order (that is exactly how the front's base sheet is overridden).
- Model (504-01, read-only here): `BrandProps.style?` (`:158`), `NavItemsProps.levelStyles?`
  (`:122`), block union `brand`/`nav-items` (`:177-178`), `MenuBlockResponsive` /
  `MenuBlockOverride` (`:155-156`), `MenuSectionResponsive.*.navProps` (`:151`),
  `resolveMenuSectionAppearanceForDevice` returns `{layout, navProps}` (`:913`).

### Exact depth selectors (verified — hover markup, no `<summary>` in doc path)

| Level | Link selector (`S` = `menuDocScope`) | Container selector |
|---|---|---|
| 0 (top bar) | = the EXISTING flat `S .site-nav-link` base (group 5, `:230`) — the cascade ROOT that reaches links at ALL depths; NEVER re-emitted by `navLevelRules`, NOT a child-combinator clone | — (no container) |
| 1 | `S .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link` | `S .site-nav-list > .site-nav-item > .site-nav-sublist, S .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` |
| 2+ | `S .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link` | `S .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` |

**Inheritance = specificity ladder + source order (true N-1 cascade).** The link selectors
are DELIBERATELY DESCENDANT-anchored so each deeper level is ALSO matched by every shallower
level's rule and wins by specificity. Level 0 is NOT a depth selector: it IS the existing flat
`S .site-nav-link` base (group 5, `:230`), the cascade ROOT that matches links at EVERY depth,
emitted EXACTLY ONCE by `MENU_RULE_GROUPS` and NEVER re-emitted by `navLevelRules`. `navLevelRules`
introduces ONLY levels 1 and 2. (Specificity counts the `S` scope attribute (0,1,0) in every
number below, matching the parent's accounting.) So: the flat base `S .site-nav-link` = (0,2,0)
matches ALL links; level-1's selector (0,5,0) matches EVERY link inside a level-1 sublist
(depths 1, 2, 3…); level-2's selector (0,6,0) matches depths 2, 3… . A level-2 link is matched
by BOTH the level-1 rule (0,5,0) AND the level-2 rule (0,6,0): the level-2 rule wins its OWN
present keys, every key level 2 leaves UNSET falls through to the level-1 rule (inherit level 1),
and keys unset at both fall through to the flat base (inherit level 0). Emitting level 0 as a
child-combinator top-bar clone would BREAK this cascade — it would stop matching sublist links,
so level-1 links would fall back to the global base, not level 0. That is why level 0 stays the
un-re-emitted flat base. This delivers the owner's "inherits level N-1" contract by pure CSS —
and it makes the 504-04 editor badge "inherits level N-1" TRUE for level 2 (do NOT weaken that
badge to "inherits base").

The container base chrome (`.site-nav-sublist`, `siteShellCss.ts:157`) is (0,1,0). The
level-1 container selector is a two-member group — the level-1 sublist itself (0,4,0) AND its
nested sublists (0,5,0) — so level-1 chrome applies to the level-1 container AND cascades into
deeper containers; the level-2 container selector (0,5,0) matches depths 2+ and, being emitted
AFTER level 1 (loop order `[1, 2]`), wins its present keys on equal specificity while level-2's
UNSET keys inherit level-1's chrome. Both beat the (0,1,0) base chrome via specificity + source
order. Container fields are IGNORED for level 0 (no container). Level 2's descendant selectors
cover depths 3, 4… uniformly (deferred: independent 3+).

---

## Execution-ready pseudocode

> All shapes below are READ-ONLY imports from 504-01 unless marked NEW. Types shown for
> clarity; the CSS module only consumes validated values.

### 0. Shared shadow / imports

```ts
// MENU_SHADOW_CSS already maps sm|md → box-shadow strings (:79). Level container `shadow`
// reuses it exactly. "none" ⇒ box-shadow:none (explicit, to override base chrome).
const shadowCss = (s: MenuAppearanceShadow): string =>
  s === "none" ? "none" : MENU_SHADOW_CSS[s];

// Type re-imported from menuDocumentV2 (504-01):
//   type BrandStyle = { fontSize?; fontWeight?; color?; textTransform?; letterSpacing?;
//                       height?; maxWidth? }
//   type NavLevelStyle = { linkColor?; linkHoverColor?; linkHoverTextColor?; linkActiveColor?;
//                          fontSize?; fontWeight?; gap?; paddingX?; paddingY?;
//                          background?; borderColor?; borderWidth?; radius?; shadow?; minWidth? }
```

### 1. `collectMenuBrandRules(doc)` → appended into `base`

Mirrors `collectMenuDividerRules` (`:362-382`). Present-only ⇒ absent style = zero bytes.

```ts
const brandStyleDecls = (style: BrandStyle): string[] =>
  [
    style.fontSize != null ? `font-size:${style.fontSize}px` : null,
    style.fontWeight != null ? `font-weight:${style.fontWeight}` : null,
    style.color != null ? `color:${style.color}` : null,          // token-backed already
    style.textTransform != null ? `text-transform:${style.textTransform}` : null,
    style.letterSpacing != null ? `letter-spacing:${style.letterSpacing}px` : null,
  ].filter(Boolean) as string[];

const brandImageDecls = (style: BrandStyle): string[] =>
  [
    style.height != null ? `height:${style.height}px` : null,
    style.maxWidth != null ? `max-width:${style.maxWidth}px` : null,
  ].filter(Boolean) as string[];

const collectMenuBrandRules = (doc: MenuDocumentV2): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "brand") continue;
    const style = block.props.style;               // BrandStyle | undefined (504-01 prunes empty)
    if (!style) continue;                          // absent ⇒ ZERO bytes
    const esc = escapeAuthoringCssString(block.id);
    const key = `${menuDocScope} [data-menu-block-id="${esc}"]`;
    // Text-mode decls apply to the brand <a> itself; harmless in image mode (a bare <a>
    // wrapping an <img> — font props have no visible effect). Emit per PRESENT key only, so
    // the editor's mode-gating (504-04) is what decides which keys exist. No mode branch here.
    const textDecls = brandStyleDecls(style);
    if (textDecls.length) rules.push(`${key}{${textDecls.join(";")}}`);
    const imgDecls = brandImageDecls(style);
    if (imgDecls.length) rules.push(`${key} img{${imgDecls.join(";")};width:auto}`);
  }
  return rules;
};
```

Fold into `baseRules` (`:445-450`) AFTER the divider rules:

```ts
const baseRules = [
  ...MENU_RULE_GROUPS.map((g) => g.base(base)).filter((r): r is string => r !== null),
  ...collectMenuDividerRules(doc),
  ...collectMenuBrandRules(doc),      // NEW — device-independent base; per-device via §5
];
```

- **Data flow:** rides `base` ⇒ automatically in BOTH builders (front head + canvas
  `sets.base` spread `:581`). The RULE emits identically front + canvas; but the DOM stamp
  location diverges: on the FRONT the brand `<a class="site-header-brand">` itself carries
  `data-menu-block-id` (`siteShell.tsx:414,428`), so `[data-menu-block-id="<esc>"]{…}` lands
  ON the `<a>` and ALL brand decls (including directly-set `font-weight`) apply. On the CANVAS
  the `<a>` (`MenuDesignEditor.tsx:578`) carries NO `data-menu-block-id` — only the wrapper
  `SelectableBlock` `<div>` (`MenuDesignEditor.tsx:303`) does — so the rule lands on the
  WRAPPER. INHERITABLE props (`font-size`/`color`/`text-transform`/`letter-spacing`) still
  cascade down to the `<a>` (color works because the base sets `.site-header-brand{color:inherit}`),
  but `font-weight` is set DIRECTLY by `.site-header-brand{font-weight:600}` in
  `buildCanvasStructuralBaseline` (`menuDocumentCss.ts:535`) and beats inheritance from the
  wrapper ⇒ canvas `font-weight` stays 600 and never changes. **Cross-subtask requirement:**
  504-04 MUST stamp `data-menu-block-id={block.id}` on the CANVAS brand `<a>` (mirroring the
  front markup) so directly-set props like `font-weight` take effect on canvas too; until it
  does, the canvas `font-weight` assertion in smoke #1 is front-only (see §Smoke #1). So it is
  NOT true that there is "no canvas-specific work for base brand" — the rule is device-agnostic,
  but the canvas needs the 504-04 DOM stamp to reach parity on directly-set props. IMAGE MODE is
  a further, SEPARATE canvas gap: the canvas renders brand image mode as ALT TEXT string content
  (`MenuDesignEditor.tsx:578-582`, `String(block.props.image.alt) || "Logo"`), NOT an `<img>`, so
  the `brandImageDecls` `[data-menu-block-id] img{…}` rule has NO target on canvas at all — ALL
  image-mode brand sizing/styling is FRONT-ONLY on canvas (the front renders a real `<img>` via
  `PageBlockContent`, `siteShell.tsx:406-417`). Smoke #1's `img` geometry assertion is therefore
  front-only (see §Smoke #1); this is a canvas-markup gap 504-04 does NOT close by the stamp alone.
- **Error handling:** none needed — values are pre-validated; missing `sections[0]` guarded
  by `?? []` (existing pattern). Non-brand blocks skipped by the `type` guard (fail-closed:
  if 504-01's read trap drops `style`, `block.props.style` is `undefined` ⇒ zero rules, not a
  throw — the round-trip test in 504-01/05 is what catches the dropped key).

### 2. `navLevelRules(navBlock, a)` → appended into `desktopShared`

Reads `navBlock.props.levelStyles` (nested; NOT via the flat `MenuAppearance`). `a` supplies
`dropdownDirection`/defaults context if ever needed; only used for consistency with siblings.

```ts
// Descendant-anchored so deeper levels are matched by shallower rules and inherit them via
// specificity + source order (true N-1 cascade — see the "Inheritance" note above). Level 1
// matches depths 1+, level 2 matches depths 2+ at STRICTLY higher specificity so it wins its
// own present keys while its unset keys fall through to the level-1 rule (which matches level-2
// links too), and keys unset at both fall through to the universal `.site-nav-link` base.
// Level 0 is NOT here — it is the existing flat `${menuDocScope} .site-nav-link` group-5 base
// (the cascade root), never re-emitted as a depth selector. Only 1 and 2 have depth selectors.
const LEVEL_LINK_SELECTORS: Record<1 | 2, string> = {
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link`,
};
// Level 1 is a two-member group so its chrome ALSO reaches nested (level-2+) sublists; level 2
// (emitted after level 1, equal specificity) wins its present keys, unset keys inherit level 1.
const LEVEL_CONTAINER_SELECTORS: Record<1 | 2, string> = {
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist, ${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
};

// Link decls for ONE level's NavLevelStyle (present-only, sparse).
const levelLinkDecls = (s: NavLevelStyle): string[] =>
  [
    s.linkColor != null ? `color:${s.linkColor}` : null,
    s.fontSize != null ? `font-size:${s.fontSize}px` : null,
    s.fontWeight != null ? `font-weight:${s.fontWeight}` : null,
    // NOTE: `gap` is emitted on the CONTAINER (see levelContainerDecls), NOT here — the link is
    // `display:block`, so `gap` on the link is inert (flex/grid-only). Do NOT re-add it here.
    s.paddingX != null || s.paddingY != null
      ? `padding:${s.paddingY ?? 8}px ${s.paddingX ?? 12}px` : null,   // only if EITHER set
    s.radius != null ? `border-radius:${s.radius}px` : null,
  ].filter(Boolean) as string[];

// Hover/active are SEPARATE selectors (state pseudo-classes).
const levelStateRules = (level: 1 | 2, s: NavLevelStyle): string[] => {
  const sel = LEVEL_LINK_SELECTORS[level];
  const out: string[] = [];
  const hoverDecls = [
    s.linkHoverColor != null ? `background:${s.linkHoverColor}` : null,
    s.linkHoverTextColor != null ? `color:${s.linkHoverTextColor}` : null, // §4 hover-text
  ].filter(Boolean) as string[];
  if (hoverDecls.length)
    out.push(`${sel}:hover,${sel}:focus-visible{${hoverDecls.join(";")}}`);
  if (s.linkActiveColor != null) out.push(`${sel}:active{background:${s.linkActiveColor}}`);
  return out;
};

// Container chrome for levels >= 1 ONLY (present-only).
const levelContainerDecls = (s: NavLevelStyle): string[] => {
  const border =
    s.borderColor != null || s.borderWidth != null
      ? `border:${s.borderWidth ?? 1}px solid ${s.borderColor ?? "rgba(15,23,42,.12)"}`
      : null;
  return [
    s.background != null ? `background:${s.background}` : null,
    border,
    s.radius != null ? `border-radius:${s.radius}px` : null,
    s.shadow != null ? `box-shadow:${shadowCss(s.shadow)}` : null,
    s.minWidth != null ? `min-width:${s.minWidth}px` : null,
    // `gap` rides the CONTAINER: the sublist is `display:grid` (base sheet + canvas baseline
    // `.site-nav-sublist{…display:grid;gap:2px…}`, `siteShellCss.ts:151`/`menuDocumentCss.ts:543`),
    // so a per-level `gap` here actually spaces that level's dropdown items (level-0 gap is
    // already `itemGap` on `.site-nav-list`, group 3). This is why `gap` was pulled off the link.
    s.gap != null ? `gap:${s.gap}px` : null,
  ].filter(Boolean) as string[];
};

const navLevelRules = (levelStyles: LevelStylesRecord | undefined): string[] => {
  if (!levelStyles) return [];                 // absent ⇒ ZERO bytes
  const rules: string[] = [];
  // Level 0 = navBlock base scalars are ALREADY emitted by MENU_RULE_GROUPS; levelStyles has
  // NO "0" key by contract. Only 1 and 2 iterate here. (Level-0 per-level control in the
  // EDITOR writes the existing nav base scalars — NOT levelStyles — so nothing new here.)
  for (const lvl of [1, 2] as const) {
    const s = levelStyles[lvl];
    if (!s) continue;
    const linkDecls = levelLinkDecls(s);
    if (linkDecls.length) rules.push(`${LEVEL_LINK_SELECTORS[lvl]}{${linkDecls.join(";")}}`);
    rules.push(...levelStateRules(lvl, s));
    const contDecls = levelContainerDecls(s);
    if (contDecls.length) rules.push(`${LEVEL_CONTAINER_SELECTORS[lvl]}{${contDecls.join(";")}}`);
  }
  return rules;
};
```

Fold into `desktopShared` (`:453`) AFTER nesting rules (source order: level chrome must beat
`navNestingRules`' structural `.site-nav-sublist` rules and the base sheet chrome):

```ts
const navBlock = doc.sections[0]?.blocks.find((b) => b.type === "nav-items");
const baseLevelStyles = navBlock?.type === "nav-items" ? navBlock.props.levelStyles : undefined;
const desktopShared = [dropdownRule(base), ...navNestingRules(base), ...navLevelRules(baseLevelStyles)];
```

- **Cascade / inheritance is pure CSS (specificity ladder + source order):** the
  descendant-anchored level selectors (see the "Inheritance" note above) make a level-2
  link/container ALSO match the level-1 rule, so each level emits ONLY its own present keys and
  an unset level-2 key falls through to the level-1 rule (inherit level 1), an unset level-1
  key falls through to the flat `.site-nav-link` group-5 base (inherit level 0 — that flat base
  is the un-re-emitted cascade root; `navLevelRules` NEVER emits a level-0 depth clone). NO
  runtime merge. This is the concrete mechanism behind the owner's "inherits level N-1"
  contract and the 504-04 "inherits level N-1" editor badge.
- **Sublist chrome (parent §3):** the container decls above are the ONLY author control over
  dropdown `background/border/radius/shadow/minWidth`. They OVERRIDE the hardcoded
  `siteShellCss.ts:157` / canvas baseline `:548` from the doc scope; the base sheet stays
  byte-identical.

### 3. Per-link padding/radius — NEW `MENU_RULE_GROUPS` entry (group 9)

The nav base link padding is hardcoded (`siteShellCss.ts:144`, canvas `:540`
`padding:8px 12px;border-radius:6px`). Add author-controllable `paddingX/paddingY/radius`
as a SCALAR group so it rides the existing tablet/mobile delta machinery for free. 504-01
adds these three keys to `NavItemsProps` (via `NAV_ITEMS_PROP_KEYS` widening +
`menuAppearanceNumberRanges`/local clamps) so they surface as `ResolvedMenuAppearance` fields.

```ts
// appended to MENU_RULE_GROUPS (:258). PRESENT-ONLY base (emits ONLY when authored):
{
  // 9. link box (padding + radius) — separate from group 5 (typography) so a device delta
  //    re-emits ONLY box, not color/font.
  fields: ["linkPaddingX", "linkPaddingY", "linkRadius"],
  base: (a) => {
    // PRESENT-ONLY. These four cheap-win keys carry NO resolution default (parent §4(a) — NOT
    // in MENU_APPEARANCE_DEFAULTS/SHELL_APPEARANCE_DEFAULTS), so an UNAUTHORED key resolves to
    // `undefined` and emits NOTHING ⇒ the base-sheet `padding:8px 12px;border-radius:6px`
    // (siteShellCss.ts:144) stays the effective default and no-override docs are byte-identical.
    const decls = [
      // `padding` is a SHORTHAND needing BOTH axes; emit when EITHER is authored and complete
      // the other axis from the base-sheet fallback (SHELL_DEFAULT_LINK_* below — a local
      // shorthand-completion constant, NOT a resolution seed):
      a.linkPaddingX != null || a.linkPaddingY != null
        ? `padding:${a.linkPaddingY ?? SHELL_DEFAULT_LINK_PY}px ${a.linkPaddingX ?? SHELL_DEFAULT_LINK_PX}px` : null,
      a.linkRadius != null ? `border-radius:${a.linkRadius}px` : null,
    ].filter(Boolean);
    return decls.length ? `${menuDocScope} .site-nav-link{${decls.join(";")}}` : null;
  },
  delta: (a) =>
    `${menuDocScope} .site-nav-link{padding:${a.linkPaddingY ?? SHELL_DEFAULT_LINK_PY}px ${a.linkPaddingX ?? SHELL_DEFAULT_LINK_PX}px;border-radius:${a.linkRadius ?? SHELL_DEFAULT_LINK_RADIUS}px}`,
}
```

- **NO `MENU_APPEARANCE_DEFAULTS` seed for these four keys (parent §4(a) mandate).** The four
  cheap-win keys carry NO resolution default: they are NOT added to `MENU_APPEARANCE_DEFAULTS`
  (`menuDocumentCss.ts:89`) or `SHELL_APPEARANCE_DEFAULTS` (`siteShellCss.ts:67`), so
  `resolveMenuAppearanceForDevice = {...MENU_APPEARANCE_DEFAULTS, ...sanitized}`
  (`menuDocumentCss.ts:113-116`) leaves them `undefined` when unauthored. The group-9 `base()`
  above is PRESENT-ONLY (emits ONLY when a key is authored, `!= null`) — so a doc that never
  touches padding/radius resolves to `undefined` ⇒ `base` returns `null` ⇒ ZERO bytes ⇒
  no-override byte-identity holds AND `buildSiteShellCss(null)` stays byte-identical (nothing new
  enters the base sheet; `siteShellCss.ts` is not imported for CSS and not modified). The
  hardcoded base-sheet `padding:8px 12px;border-radius:6px` (`siteShellCss.ts:144`) remains the
  effective default. `SHELL_DEFAULT_LINK_PX = 12`, `SHELL_DEFAULT_LINK_PY = 8`,
  `SHELL_DEFAULT_LINK_RADIUS = 6` are LOCAL `menuDocumentCss.ts` constants used ONLY to COMPLETE
  the `padding` shorthand when a SINGLE axis is authored (the shorthand needs both) and to supply
  the neutral value in the tablet/mobile `delta` — they are NOT a resolution seed and never enter
  `MENU_APPEARANCE_DEFAULTS`. `SHELL_APPEARANCE_DEFAULTS` (`siteShellCss.ts:67`, verified to
  contain NO `linkPadding*`/`linkRadius`/`linkHoverTextColor`) stays BYTE-IDENTICAL. 504-01 owns
  the MODEL keys + clamp ranges on `NavItemsProps`; 504-02 owns the CSS-side PRESENT-ONLY
  emission (no defaults table extension).
- **Per-device:** free — `collectDeltaRules` (`:429`) picks up the new `fields` automatically;
  it still diffs undefined-vs-undefined = no-op (no seed ⇒ no spurious delta), and a fired
  tablet/mobile delta re-emits TOTAL box decls (completing the shorthand from the local fallbacks
  above) so clearing an override reverts to the base-sheet padding.

### 4. Hover-text color + current-page rule

- **Hover-text (level 0 / base link):** group 6 (`hover`, `:234-238`) is background-only.
  Extend its `base`/`delta` to append `color` when `linkHoverTextColor` is set (504-01 adds
  the field to `NavItemsProps`). Present-only in `base` (unset ⇒ background-only, byte-identical):

```ts
{
  // 6. hover (extended). `linkHoverTextColor` carries NO resolution default (parent §4(b) — NOT
  // in MENU_APPEARANCE_DEFAULTS), so it is `undefined` when unauthored; the `!= null` gate
  // (NOT `!== null`) covers BOTH undefined AND null so an unauthored key emits background-only
  // (byte-identical), never `color:undefined`.
  fields: ["linkHoverColor", "linkHoverTextColor"],
  base: (a) => {
    const decls = [
      `background:${a.linkHoverColor}`,
      a.linkHoverTextColor != null ? `color:${a.linkHoverTextColor}` : null,
    ].filter(Boolean);
    return `${hoverSelector}{${decls.join(";")}}`;
  },
  delta: (a) =>
    `${hoverSelector}{background:${a.linkHoverColor};color:${a.linkHoverTextColor != null ? a.linkHoverTextColor : a.linkColor}}`,
},
```

  (Per-level hover-text is handled by `levelStateRules` in §2 via `NavLevelStyle.linkHoverTextColor`.)

  **Neutral revert = the RESOLVED base link color, NOT `"inherit"`.** The hover group's
  `fields` are `["linkHoverColor","linkHoverTextColor"]`, so the group FIRES on a tablet/mobile
  device whenever `linkHoverColor` differs — e.g. a pre-504 doc that overrides ONLY a per-device
  hover BACKGROUND while also setting a custom `linkColor` (default `linkColor` is `"inherit"`,
  `siteShellCss.ts:69`). Using `"inherit"` here would emit `background:X;color:inherit` at the
  hover selector and OVERRIDE the group-5 base `.site-nav-link{color:linkColor}` (`:144`),
  silently changing hover text from the author's `linkColor` to the inherited color — a behavior
  change to already-published docs that the byte-identity guard (no-override docs only) does NOT
  catch. Reverting to `a.linkColor` restores true base hover-text behavior without regressing
  custom-`linkColor` docs. This mirrors the EXISTING active-group precedent
  (`menuDocumentCss.ts:246`: `a.linkActiveColor !== null ? a.linkActiveColor : a.linkHoverColor`),
  which likewise reverts to the resolved base value, never `"inherit"`.

- **Current-page:** emit ONE doc-scoped rule keyed off the `aria-current="page"` stamp landed
  by 504-03 (front `siteShell.tsx`). The stamp is FRONT-ONLY — the canvas `NavItemsPreview` has
  no route/current-page concept and stamps no `aria-current`, so the rule simply matches nothing
  on the canvas (deferred with the active-item indicator). Reuse the nav base `linkActiveColor`
  as the current-page tint (no new model key — folds out of existing active color), emitted
  present-only:

```ts
// appended in baseRules (device-independent) ONLY when linkActiveColor is set:
const currentPageRule = (a: ResolvedMenuAppearance): string[] =>
  a.linkActiveColor !== null
    ? [`${menuDocScope} .site-nav-link:where([aria-current="page"]){color:${a.linkActiveColor}}`]
    : [];
// …spread into baseRules after collectMenuBrandRules.
```

  `:where()` contributes 0, so the rule stays at the flat base `.site-nav-link` specificity
  ((0,2,0) counting the `S` scope, same accounting as §2) — deliberately NON-elevated so the
  level selectors in §2 and the hover state still win; current-page is the LOWEST-priority
  tint. Absent
  `linkActiveColor` ⇒ zero bytes (byte-identity for legacy docs). No `aria-current` in markup
  yet ⇒ rule matches nothing (harmless) until 504-03 lands — SAME-COMMIT-safe.

> **Note (defect B2 cross-ref — CSS emission is CORRECT, editor display is the fix):** group 5's
> present-only `font-size` (`a.fontSize != null ? …px : null`, `:142`) means an UNSET nav
> `fontSize` emits NOTHING and the link inherits the theme via `font-size:inherit` (base sheet
> `:152`, ~16px). This is the intended semantics — do NOT change it. The misleading part is
> EDITOR-side: 504-04's slider shows `15` (`FONT_SIZE_FALLBACK`) at the unset position; 504-04 §8
> fixes the DISPLAY (show the inherited 16 / "inherited"), NOT this emission. No change here.

### 5. Per-device brand + level deltas

Brand `style` and `levelStyles` are NESTED records, NOT flat `MenuAppearance` scalars, so
`collectDeltaRules` (scalar) does NOT carry them. Add dedicated device resolvers + delta emitters.

> **Single source of cascade truth (no local resolver clones).** This module does NOT
> re-author the tablet/mobile-inherit-desktop cascade. It IMPORTS 504-01's exported resolvers
> and only diffs their output vs the desktop base to decide which delta rules to emit:
> ```ts
> import {
>   resolveMenuBrandStyleForDevice,        // (block, device) => BrandStyle  ({}-when-unstyled)
>   resolveMenuSectionAppearanceForDevice, // level-aware; .navProps.levelStyles = cascaded merge
> } from "../services/menus/menuDocumentV2";
> ```
> Both apply the Pages cascade internally (tablet/mobile each inherit DESKTOP; mobile NEVER
> inherits tablet), so the front CSS and the 504-04 editor badges can never diverge. Note the
> imported resolvers return `{}` (never `undefined`) for an unstyled target — the diff helpers
> below treat `{}` and `undefined` as equal so an unstyled block/level still emits ZERO bytes.

```ts
// --- Brand per-device: 504-01's resolveMenuBrandStyleForDevice already reads
//     block.props.style (desktop) ⊕ block.responsive.{device}.style (tablet/mobile inherit
//     DESKTOP). We only diff its output vs the desktop base to emit a delta. ---

// Brand device deltas: emit the SAME text/img rules as §1 but ONLY when the device-resolved
// style DIFFERS from the desktop base (present-key diff). Rides tabletDelta / mobile buckets.
const collectBrandDeltaRules = (doc, device: MenuDeviceKind): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "brand") continue;
    const resolved = resolveMenuBrandStyleForDevice(block, device);     // 504-01 export ({}-safe)
    const baseStyle = block.props.style;                                // BrandStyle | undefined
    if (shallowEqualStyle(resolved, baseStyle)) continue;               // no diff ⇒ no rule
    const esc = escapeAuthoringCssString(block.id);
    const key = `${menuDocScope} [data-menu-block-id="${esc}"]`;
    const textDecls = brandStyleDecls(resolved);
    if (textDecls.length) rules.push(`${key}{${textDecls.join(";")}}`);
    const imgDecls = brandImageDecls(resolved);
    if (imgDecls.length) rules.push(`${key} img{${imgDecls.join(";")};width:auto}`);
  }
  return rules;
};

// --- Level per-device: 504-01's now-level-aware resolveMenuSectionAppearanceForDevice deep-
//     merges responsive.{device}.navProps.levelStyles over the DESKTOP base per level per
//     field (mobile never reads tablet). We read that cascaded record and diff vs desktop. ---

// Level device deltas: re-run navLevelRules on the device-resolved levelStyles, but only when
// it DIFFERS from desktop. Simplest byte-stable rule: if the device-resolved levelStyles is
// NOT deep-equal to base, emit navLevelRules(resolved) TOTAL for that device.
const collectLevelDeltaRules = (doc, device: MenuDeviceKind): string[] => {
  const navBlock = doc.sections[0]?.blocks.find((b) => b.type === "nav-items");
  const section = doc.sections[0];
  if (!navBlock || navBlock.type !== "nav-items" || !section) return [];
  // one authoritative cascade resolver — NOT a local mergeLevelStyles clone:
  const resolved = resolveMenuSectionAppearanceForDevice(section, device).navProps.levelStyles;
  if (deepEqualLevelStyles(resolved, navBlock.props.levelStyles)) return [];  // no diff
  return navLevelRules(resolved);   // TOTAL re-emit for the device (later source order wins)
};
```

Wire into `buildMenuRuleSetsForDocument` (`:454-458`):

```ts
const tabletDelta = [
  ...collectDeltaRules(tabletResolved, base),           // existing scalar deltas (incl. §3, §4)
  ...collectBrandDeltaRules(doc, "tablet"),             // NEW
  ...collectLevelDeltaRules(doc, "tablet"),             // NEW
];
const mobileRules = [
  ...mobileModeRules(mobileResolved),
  ...collectDeltaRules(mobileResolved, base),
  ...collectBrandDeltaRules(doc, "mobile"),             // NEW
  // NEW — desktop-BASE level styling must reach the mobile (<640) view too: nested sublists are
  // INLINE-visible there (base sheet `.site-nav-sublist{padding-left:16px}`), and the HARD-INVARIANT
  // is 'mobile inherits desktop'. The mobile front branch does NOT spread `desktopShared`, so
  // (unlike tablet) the base `navLevelRules(baseLevelStyles)` would otherwise never reach mobile.
  // Re-emit them here so both level link typography AND container chrome cascade to inline mobile
  // levels — symmetric with the tablet branch (desktopShared + tabletDelta). `baseLevelStyles` is
  // in scope from the `desktopShared` construction above; present-only ⇒ ZERO bytes when unset, so
  // no-override byte-identity holds.
  ...navLevelRules(baseLevelStyles),                    // NEW — base level styling → inline mobile
  ...collectLevelDeltaRules(doc, "mobile"),             // NEW — mobile-SPECIFIC override layers on
  // top of the base (later source order wins), returning [] when the mobile-resolved levelStyles
  // deep-equals desktop (no mobile-specific override); the base rules above supply the inherit.
];
```

- **Cascade correctness (owned by 504-01, not re-derived here):** the imported
  `resolveMenuBrandStyleForDevice` / `resolveMenuSectionAppearanceForDevice` apply the Pages
  cascade internally (tablet + mobile each inherit DESKTOP; mobile NEVER inherits tablet),
  matching the existing scalar `collectDeltaRules(…, base)` semantics. This module only DIFFS
  their output vs the desktop base. No-override docs ⇒ resolved deep-equals base ⇒ deltas EMPTY
  ⇒ NO tablet/mobile branch materializes (front `:507`/`:493` only emit a branch when
  non-empty). Byte-identity holds — the added `navLevelRules(baseLevelStyles)` in the mobile
  branch is ALSO present-only (`baseLevelStyles === undefined` ⇒ `[]`), so a truly no-override
  doc still yields an empty mobile branch. (A doc WITH desktop-base level styling but NO mobile
  override is NOT a no-override doc: it now correctly materializes a mobile branch carrying the
  inherited base level rules — that is the intended 'mobile inherits desktop' behavior, not a
  byte-identity regression.)
- `shallowEqualStyle` / `deepEqualLevelStyles`: small local diff-ONLY helpers (no cascade
  logic) comparing the sparse present keys — and, because the imported resolvers return `{}`
  for an unstyled target while `block.props.style` / `props.levelStyles` are `undefined` when
  unset, they treat `{}`/`undefined` (and an empty vs absent level) as EQUAL so an unstyled
  block/level still diffs to zero ⇒ zero bytes (both operands are sparse+pruned by 504-01, so
  key-set + value equality is exact).

### 6. Canvas force-open-selected-level — `buildMenuDocumentPreviewCss`

Sublists are `display:none` until `:hover`/`:focus-within` (`navNestingRules :400-402`) on the
canvas too. When the editor selects level ≥1, the author must SEE that depth. Mirror the proven
`previewMobileOpen` sim-open (`:461-466`) — emit a doc-scoped force-open rule for the selected
depth, LAST, so it wins the closed `display:none`.

```ts
// NEW optional param, defaulted so existing callers / non-level selections are unaffected.
const previewForceOpenLevel = (level: 1 | 2): string[] => {
  const rules = [
    // Force level-1 sublist open (direct child of the top item).
    `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid}`,
  ];
  if (level >= 2) {
    // Also force the nested level-2 sublist open so its chrome/links are visible.
    rules.push(`${menuDocScope} .site-nav-sublist .site-nav-sublist{display:grid}`);
  }
  return rules;
};

export function buildMenuDocumentPreviewCss(
  doc: MenuDocumentV2,
  device: PageBreakpoint,
  forceOpenLevel?: 1 | 2,      // NEW — threaded from the editor's selected level (504-04)
): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const branch =
    device === "mobile"
      ? [...sets.mobile, ...sets.previewMobileOpen]
      : device === "tablet"
        ? [...sets.desktopShared, ...sets.tabletDelta]
        : sets.desktopShared;
  const forceOpen = forceOpenLevel ? previewForceOpenLevel(forceOpenLevel) : [];
  // forceOpen LAST — beats navNestingRules' display:none within desktopShared (source order).
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch, ...forceOpen].join("\n");
}
```

- **Canvas-only:** `previewForceOpenLevel` is emitted ONLY by the preview builder (never the
  front) — the single canvas-only addition in this task, precedent = `previewMobileOpen`.
  `forceOpenLevel === undefined` (level 0 selected, or non-Design callers) ⇒ zero extra bytes ⇒
  existing preview output byte-identical.
- **Data flow:** 504-04 owns `MenuDocumentCanvas` → passes `selectedLevel >= 1 ? selectedLevel :
  undefined`. This subtask only widens the signature (optional, backward-compatible).

---

## Data flow summary

```
front:  doc → buildMenuDocumentCss → buildMenuRuleSetsForDocument
        → base(+brand+current-page) | desktopShared(+navLevelRules) | tabletDelta(+brand/level Δ)
        | mobile(+navLevelRules base +brand/level Δ) → @media-wrapped string  (aria-current stamped by 504-03)
        (mobile re-emits the desktop-base navLevelRules so inline <640 levels inherit desktop)

canvas: doc,device,forceOpenLevel? → buildMenuDocumentPreviewCss → SAME rule sets, flattened
        → structuralBaseline + base + branch + forceOpen  (author sees the styled depth)
```

Front + canvas parity guaranteed: every rule (except the canvas-only force-open) is produced
ONCE inside `buildMenuRuleSetsForDocument`.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

### Vitest (Bun-free) — `tests/vitest/site/menu-document-css.test.ts` (or the existing menu-css suite)

- **`collectMenuBrandRules`:** a brand block with `style.{fontSize,fontWeight,color,textTransform,
  letterSpacing}` emits `[data-menu-block-id="<esc>"]{font-size…;font-weight…;color…;text-transform…;
  letter-spacing…}`; image `style.{height,maxWidth}` emits `… img{height…;max-width…;width:auto}`;
  brand block with NO `style` (or `style===undefined`) emits ZERO strings; id with a `"`/`\` is
  escaped via `escapeAuthoringCssString`.
- **`navLevelRules`:** `levelStyles.{1,2}` emits the EXACT depth selectors from the table (assert
  the literal selector strings for links AND containers); level-1's link selector is
  descendant-anchored (`… > .site-nav-sublist .site-nav-link`) and level-2's is
  `… > .site-nav-sublist .site-nav-sublist .site-nav-link` (STRICTLY more specific than level 1,
  so a level-2 link is matched by BOTH rules — assert this specificity/source ordering to lock in
  the N-1 cascade); the level-1 container selector is the two-member group that ALSO reaches
  nested sublists; container decls emitted for levels ≥1 ONLY; hover/active state on the state
  selectors; `undefined` levelStyles ⇒ ZERO strings; a level present with only `linkColor` emits
  ONLY `color:` (sparse present-only, no neutral leakage). **`gap` lands on the CONTAINER, not the
  link:** a level present with only `gap` emits `.site-nav-sublist…{gap:…px}` (the container
  selector) and NO `gap` on the `.site-nav-link` rule — assert the link decl string contains no
  `gap:` (guards against the inert `display:block` link `gap` regression).
- **`shadowCss`:** `none` → `box-shadow:none`; `sm`/`md` → `MENU_SHADOW_CSS` strings.
- **Per-link box group (§3):** UNAUTHORED (undefined — NO `MENU_APPEARANCE_DEFAULTS` seed) the
  `base` returns `null` (ZERO bytes); an authored value emits `.site-nav-link{padding…;border-radius…}`
  (a single authored axis completes the shorthand from the local `SHELL_DEFAULT_LINK_*` fallback);
  `collectDeltaRules` re-emits a TOTAL box rule for a tablet/mobile override (undefined-vs-undefined
  ⇒ no spurious delta).
- **Hover-text + current-page (§4):** group 6 `base` appends `color:` only when `linkHoverTextColor`
  set (else background-only, byte-identical); `currentPageRule` emits
  `.site-nav-link:where([aria-current="page"]){color:…}` only when `linkActiveColor` set, ZERO otherwise.
- **Hover-text neutral revert (§4):** a doc that sets ONLY a per-device hover BACKGROUND override
  (`responsive.{tablet,mobile}.navProps.linkHoverColor`) with UNSET `linkHoverTextColor` AND a custom
  base `linkColor` (e.g. `"#111"`) emits a group-6 `delta` of `…:hover…{background:…;color:#111}` —
  i.e. the hover text stays at the author's `linkColor`, NOT `inherit` — proving the device hover
  override does not silently regress custom-`linkColor` hover text (the byte-identity guard covers
  no-override docs ONLY, so this per-device case needs its own assertion).
- **Per-device deltas (§5):** `responsive.tablet.navProps.levelStyles` / `responsive.mobile` brand
  `style` produce `collectLevelDeltaRules`/`collectBrandDeltaRules` output ONLY when the device-resolved
  value differs from DESKTOP; equal-to-base override ⇒ EMPTY; mobile diffs vs desktop (NOT tablet).
- **Mobile inherits desktop level styling (§5):** a doc with DESKTOP-BASE `levelStyles` and NO mobile
  `levelStyles` override emits the desktop level link/container rules INTO the mobile branch (via
  `navLevelRules(baseLevelStyles)`), so the `≤639` region of `buildMenuDocumentCss` carries the same
  level rules as the `≥640` shared region — assert the level-1 link selector rule appears in BOTH.
  Conversely a doc with NO `levelStyles` at all emits ZERO level rules in the mobile branch
  (present-only, byte-identity preserved).
- **Canvas force-open (§6):** `buildMenuDocumentPreviewCss(doc,"desktop",1)` appends the level-1
  force-open rule LAST; `…,2` appends BOTH level-1 and level-2 force-open; `undefined` ⇒ byte-identical
  to the pre-504 preview output for the same doc; the force-open string never appears in
  `buildMenuDocumentCss` (front) output.
- **Shared-builder parity:** for a doc with brand + level styling, assert the brand rule appears in
  BOTH `buildMenuDocumentCss` and `buildMenuDocumentPreviewCss` output; assert level base rules appear
  in the ≥640 shared region of the front string AND the desktop/tablet canvas branch.

### Bun (menu suites)

- **`tests/unit/site/menu-document-render.test.tsx` (Bun) — BYTE-IDENTITY:** a doc with NO brand
  `style`, NO `levelStyles`, default padding/radius, no hover-text/active emits CSS byte-identical to
  a pre-504 baseline snapshot on BOTH `buildMenuDocumentCss` and `buildMenuDocumentPreviewCss`
  (present-only guard). A doc WITH styling emits the new scoped rules on both (front + canvas parity).
- **`tests/integration/routes/menus.test.ts` (Bun):** covered by 504-01/05 (round-trip of `brand.props.style` +
  `navProps.levelStyles` + responsive overrides). This subtask asserts the RENDER, not the route.

### Byte-identity / reject-unknown guards named explicitly

- **`tests/unit/pages/siteShellCss.test.ts` — `buildSiteShellCss(null)` byte-identical: ZERO edits,
  ZERO-line diff.** Nothing new enters the base sheet; `siteShellCss.ts` is untouched.
- **No-override menu docs byte-identical** (`menu-document-render.test.tsx`) — the primary guard for
  every present-only branch added here (brand, level, padding/radius, hover-text, current-page,
  canvas force-open default).
- **Reject-unknown is 504-01's contract** (normalizers) — this CSS module only READS validated
  values; it adds NO new key set. But the fail-closed READ traps for `"style"` (brand) and
  `"levelStyles"` (nav) are what make `block.props.style`/`props.levelStyles` reach this module —
  so the 504-01/05 round-trip tests are a HARD dependency (a dropped key ⇒ this module silently
  emits zero rules, no throw). Assert the round-trip explicitly in 504-01/05.
- **ONE shared builder:** all emission routed through `buildMenuRuleSetsForDocument`; the canvas
  force-open is the single canvas-only addition (precedent `previewMobileOpen`). A test asserts the
  front string contains NO `display:grid` force-open rule for a level selection.

### SMOKE — visible-effect scenarios this CSS enables (measured LIVE; full 5-scenario matrix owned by 504-05)

Run in the live admin canvas AND on the front (`:3000`) with `playwright-cli`; start
`coderso-dev-core-host` if the admin is white/down; verify Soft-Violet is active. Every assertion
measures a **VISIBLE EFFECT (computed style / geometry)**, never control presence.

1. **Brand text + image visible effect** — text-mode: set fontSize+fontWeight+color+textTransform.
   On the FRONT assert the brand `<a>` computed `font-size/font-weight/color/text-transform` ALL
   CHANGED (the `<a>` carries `data-menu-block-id`, so directly-set `font-weight` applies). On the
   CANVAS assert the INHERITABLE props (`font-size/color/text-transform`) CHANGED; `font-weight`
   only changes on canvas AFTER 504-04 stamps `data-menu-block-id` on the canvas brand `<a>`
   (`MenuDesignEditor.tsx:578`) — until then the base `.site-header-brand{font-weight:600}`
   (`menuDocumentCss.ts:535`) beats inheritance from the wrapper, so keep `font-weight` a
   FRONT-ONLY assertion (or gate the canvas `font-weight` check on the 504-04 stamp landing).
   Image-mode: set height+maxWidth; on the FRONT assert the brand `img` computed `height`/`max-width`
   geometry CHANGED (the front image mode renders a real `<img>` via `PageBlockContent`,
   `siteShell.tsx:406-417`, a descendant of the stamped `<a>`). Keep the `img` geometry a FRONT-ONLY
   assertion: the CANVAS renders brand image mode as ALT TEXT string content, not an `<img>` element
   (`MenuDesignEditor.tsx:578-582` — `String(block.props.image.alt) || "Logo"`), so the
   `[data-menu-block-id] img{height;max-width;width:auto}` rule from `brandImageDecls` has NO target
   on canvas and is a no-op there (ALL image-mode brand styling is front-only on canvas — same class
   of canvas gap as the `font-weight` stamp above; do NOT write a canvas `img` geometry assertion).
2. **Level 0/1/2 at the RIGHT depth + N-1 inheritance** — style level 0 (top-bar link color/size),
   level 1 (dropdown link + container background/border/radius), level 2 (nested link). On the
   FRONT, HOVER each depth open and assert each styled level's computed value applies at that depth
   (top-bar ≠ L1 ≠ L2). Then, with level 2's link color LEFT UNSET, assert the level-2 link
   computed color EQUALS level 1's (inherits level 1, NOT the level-0 base) — the concrete proof
   of the descendant-selector N-1 cascade. On the CANVAS, select each level and assert the
   force-open rule reveals that depth (`display !== none`) showing the authored computed values.
   **Mobile inherits desktop level styling:** with the SAME desktop level-1 link styling and NO
   mobile override, load the front at 390px (nested sublists are inline-visible there via
   `.site-nav-sublist{padding-left:16px}`) and assert the inline level-1 link's computed color/size
   MATCHES the desktop-authored value — proving `navLevelRules(baseLevelStyles)` reaches the `<640`
   branch (the 'mobile inherits desktop' invariant), not that it silently drops on mobile.
3. **Per-device brand + level override + reset (desktop/tablet/mobile)** — at 390px override brand
   fontSize + level-1 link color; assert differs from Desktop at 390px, matches Desktop at 1280px;
   Reset ⇒ computed reverts to the DESKTOP-BASE level value (which now reaches mobile via
   `navLevelRules(baseLevelStyles)`), NOT to the unstyled shell base; repeat one field on the bounded
   640–1023 tablet branch; confirm mobile ≠ tablet.
4. **Sublist chrome (level ≥1 container)** — author L1 container background+border+shadow+radius+
   minWidth+**gap**; HOVER open on the front; assert `.site-nav-sublist` computed
   `background-color/border/box-shadow/border-radius/min-width` MATCH the authored values, AND assert
   the container computed `gap` (`row-gap`) CHANGED so the dropdown items visibly re-space (proves
   per-level `gap` is a LIVE control on the grid container, not an inert `display:block` link decl,
   and that the hardcoded base chrome is OVERRIDDEN from the doc-scoped sheet; base sheet untouched).
5. **Hover-text + current-page + link padding** — set hover TEXT color + per-link paddingX/paddingY;
   hover a top-bar link, assert its computed text `color` changed (not just background) and computed
   padding matches; navigate to the active page, assert the link carrying `aria-current="page"`
   (504-03) shows the current-page computed color.

---

## Acceptance Criteria (measured LIVE)

- `collectMenuBrandRules` emits scoped text + `img{}` rules; absent style = zero bytes; legacy brand
  blocks byte-identical.
- `navLevelRules` emits the EXACT depth selectors (0/1/2) + container chrome for levels ≥1, folded
  into `desktopShared`; the descendant-anchored selectors deliver a true N-1 cascade (level 2
  inherits level 1 inherits level 0) by specificity + source order (no runtime merge), matching the
  504-04 "inherits level N-1" badge; the level-2 descendant selectors cover depth 3+.
- Sublist chrome overrides the hardcoded base from the doc scope; base sheet byte-identical.
- Per-link padding/radius group emits present-only (defaults ⇒ zero bytes) and rides tablet/mobile
  deltas; hover-text color + `:where([aria-current="page"])` current-page rule emit present-only.
- Per-device brand + level deltas emit via `buildMenuRuleSetsForDocument` diffed vs DESKTOP (Pages
  cascade; mobile ≠ tablet); no-override docs materialize no tablet/mobile branch. The mobile branch
  ALSO re-emits `navLevelRules(baseLevelStyles)` so desktop-base level styling reaches inline `<640`
  levels ('mobile inherits desktop' HARD-INVARIANT) — present-only, so a doc with NO `levelStyles`
  still emits zero mobile level bytes.
- Group-6 hover `delta` reverts unset `linkHoverTextColor` to the RESOLVED base `linkColor` (not
  `"inherit"`), so a per-device hover-background override never regresses custom-`linkColor` hover text.
- Canvas force-open reveals the selected level ≥1 (single canvas-only addition; default = byte-identical).
- `buildSiteShellCss(null)` byte-identical (ZERO-line test diff); no-override docs byte-identical;
  all new CSS doc-scoped; front + canvas parity; no `schemaVersion` bump; no route/RBAC/endpoint/migration.
- Gates: full Vitest + Bun menu matrices + lint + types + root `tsc` + gates:coderso green; playwright
  visible-effect smoke green at 390px + 768px + 1280px.

---

## Deferred (record in the 504-05 changelog residuals)

- Levels 3+ independent styling (the level-2 descendant selector covers them uniformly).
- Custom `font-family` / `line-height`; active-item indicator pill/underline (beyond current-page color).
- Mobile-drawer chrome — the `menu-drawer` section is not front-rendered yet.
