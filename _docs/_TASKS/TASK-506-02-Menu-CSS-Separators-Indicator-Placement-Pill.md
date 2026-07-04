# TASK-506-02: Menu CSS — Separators, Indicator, Placement & Pill

# FileName: TASK-506-02-Menu-CSS-Separators-Indicator-Placement-Pill.md

**Parent Task:** TASK-506
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-506-01 (model keystone — `NavLevelStyle` new fields + level-0 `navChrome` sub-record + allowlists / clamp ranges / normalizer partitions / the exact compare-key SET enumerated in 506-01's closure note (506-02 WRITES `NAV_LEVEL_STYLE_COMPARE_KEYS` + the navChrome compare list here) + resolvers). 506-02 is the **sole writer of `core/site/menuDocumentCss.ts`** and opens ONLY after 506-01 lands green (the new field types must exist to be read here). Rides TASK-499/501/504's shared `buildMenuRuleSetsForDocument`, the 504 anchored level selectors, and the 501 per-device delta channels.
**Status:** ✅ Done
**Completed:** 2026-07-03 (changelog 1215)

---

## Scope

Emit doc-scoped CSS for every new TASK-506 styling field through the ONE shared
`buildMenuRuleSetsForDocument` so the FRONT `@media` sheet (`buildMenuDocumentCss`)
and the ADMIN-CANVAS flatten (`buildMenuDocumentPreviewCss`) NEVER diverge. Five
bundles, per-level (0 / 1 / 2) + per-device (tablet / mobile via the existing
delta machinery):

- **B1** item separators (orientation-aware: VERTICAL border between top-bar
  items, HORIZONTAL border between dropdown items, `:not(:last-child)`).
- **B2** hover/active underline·overline `::before` indicator bar (`:hover` +
  `[aria-current="page"]`) + `indicatorGrow` transform + `hoverUnderline` +
  `transitionMs` + `hoverLift` translateY. The bar lives on `::before` (NOT
  `::after`) because the nesting caret `@712` already owns `::after` on
  group-parent links — a single element has ONE `::after`, so a shared pseudo
  would make the two rules fight per-property on dropdown-parent links that also
  carry an indicator (a normal top-nav-with-dropdowns + underline combo). Using
  `::before` for the indicator and leaving `::after` for the caret keeps both
  working independently.
- **B3** `showCaret` toggle (suppress the existing `::after`) + `caretRotateOnOpen`
  (rotate on hover/focus-within) + `flyoutAnimation` (an opacity(+transform) reveal that
  ACTUALLY interpolates on open via `transition-behavior:allow-discrete` + `@starting-style`
  layered over — never replacing — the `display:none→grid` toggle, PRESERVING the zero-JS
  hover/focus-within open + reachability).
- **B4** pill on `.site-nav-list` (level-0 wrapper) + inner container padding on
  `.site-nav-sublist` (levels ≥ 1).
- **B5** nested submenu placement `right|bottom|left` rewriting the
  `.site-nav-sublist .site-nav-sublist` positioning WITHOUT losing the anchored
  (0,5,0) level-2 specificity from 504.

**Sole-writer boundary:** this subtask edits ONLY `core/site/menuDocumentCss.ts`.
The model (`menuDocumentV2.ts`) is 506-01's; `siteShell.tsx` is 506-03's; the
editor is 506-04's; tests/docs/closure are 506-05's. Do NOT edit the frozen base
sheet `core/site/siteShellCss.ts` (`buildSiteShellCss(null)` byte-identity is
inviolable). Do NOT touch `MenuDesignEditor.tsx`.

**Narrow test carve-out (force-open assertions ONLY).** 506-05 owns the test
suites, with ONE explicit exception 506-02 MUST apply because it is the direct,
mechanical consequence of this file's own `previewForceOpenLevel` change (§ Canvas
force-open, Hard Invariant 6, test #5): the B3 neutralization (a) appends
`;opacity:1;transform:none` to the force-open `display:grid` decls and (b) switches
the level-2 force-open rule from the SHORT `.site-nav-sublist .site-nav-sublist`
(0,3,0) to the anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` form. Those exact
outputs are already asserted by EXISTING assertions in
`tests/vitest/site/menu-document-css.test.ts` — `L1_OPEN` / `L2_OPEN`
(`@377-378`, `toContain` at `@382`/`@391-392`) and the front `not.toContain`
(`@401-402`) — so verbatim they go RED the instant this change lands. 506-02 is
therefore GRANTED permission to update EXACTLY those two constants and their
paired assertions to the post-change strings
(`{display:grid;opacity:1;transform:none}` and the anchored `L2_OPEN =
`${SCOPE} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}`),
and NOTHING ELSE in that file — every other assertion, and all NEW B1–B5 suites,
remain 506-05's. This surgical carve-out is what lets the mandated force-open
change land the `menu-document-css.test.ts` lane green (§ Implementation order
step 5 / land-green gate below) WITHOUT violating the sole-writer boundary; it is
the deliberately-scoped resolution of the force-open↔existing-assertion collision,
not an open license to edit tests.

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** This subtask is a pure CSS emitter: every value
it interpolates is ALREADY validated / clamped / enum-mapped by 506-01's
normalizers (color via `normalizeMenuColorValue`, numbers via `clampLocalNumber`
over the range tables, enums via `normalizeEnumLocal`, bools via `typeof===boolean`)
— raw stored input NEVER reaches the stylesheet. All rules stay scoped under
`[data-site-menu-doc="true"]`; no auth/nonce/HMAC/reCAPTCHA change; no
`schemaVersion` bump.

---

## Grounding (verified against source this run — line-referenced)

All anchors confirmed by `Read` + `grep -an` on `core/site/menuDocumentCss.ts`
(940 lines; menu files read as BINARY to `rg` — used `grep -an`).

- Scope: `SITE_MENU_DOC_ATTRIBUTE = "data-site-menu-doc"` `@72`;
  `menuDocScope = [data-site-menu-doc="true"]` `@161`. Every new rule prefixes this.
- Imports `@1-23`: `NavLevelStyle`, `NavLevelStyles`, `NavLevelStyleLevel`,
  `resolveMenuSectionAppearanceForDevice` from the model; `shadowCss` `@94`;
  `escapeAuthoringCssString` `@20`; `SHELL_DEFAULT_LINK_PX/PY/RADIUS` `@104-106`.
  **506-02 additionally imports the 506-01 exports:** the `NavChromeStyle` type
  (level-0 chrome record) + its per-device resolver, and any new enum/number consts
  if the model chooses to export bounds. (If 506-01 pins **Option A** — a `"0"`
  level key — then `NavLevelStyleLevel` widens to `0|1|2` and there is no
  `NavChromeStyle` import; see § Level-0 consumption.)
- `LEVEL_LINK_SELECTORS` `@492-495`: `1 = ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`;
  `2 = ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link`.
- `LEVEL_CONTAINER_SELECTORS` `@497-505`: `1` = TWO-member
  (`${scope} .site-nav-list > .site-nav-item > .site-nav-sublist, ${scope} … .site-nav-sublist .site-nav-sublist`);
  **`2` = the anchored (0,5,0) form** `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` `@504`.
- `levelLinkDecls(s)` `@509-518` (all-width link decls); `levelStateRules(level, s)` `@521-531`
  (hover/focus-visible + active); `levelContainerDecls(s)` `@535-548` (≥640-only
  chrome); `navLevelRules(levelStyles, {linkOnly?})` `@566-583` (iterates
  `NAV_LEVELS = [1,2]` `@550`; `linkOnly` OMITS container decls `@578`).
- `navNestingRules(a)` `@698-713`: `@701` `.site-nav-sublist{display:none}`;
  `@703` hover/focus-within `{display:grid}` (zero-JS open — MUST survive B3);
  `@705` `.site-nav-sublist>li{position:relative}`; **`@707-709` HARDCODED nested
  flyout** `.site-nav-sublist .site-nav-sublist{left:100%; top:0|bottom:0 via dropdownDirection}`
  (B5's always-RIGHT gap); **`@712` caret ALREADY emitted**
  `li[data-site-nav-group="true"]>.site-nav-link::after{content:" \25BE";font-size:.7em}`
  (B3 makes toggleable/rotatable, NOT add).
- `dropdownRule(a)` `@325-326` (first-dropdown top|bottom — keep working); `currentPageRule(a)` `@591-594`
  (`.site-nav-link:where([aria-current="page"]){color:linkActiveColor}` — B2's
  `[aria-current=page]` indicator reuses this exact selector).
- `collectMenuDividerRules(doc)` `@423-443` = the standalone `divider` BLOCK
  (header rule, targets `[data-block-id]`) — **NOT** per-nav-item separators; B1 is
  genuinely new (do not confuse).
- Per-device delta: `collectLevelDeltaRules(doc, device)` `@671-683` re-emits
  `navLevelRules(resolved, {linkOnly: device==="mobile"})` on RESOLVED diff;
  `deepEqualLevelStyles` `@641-648` / `shallowEqualLevel` `@638` gate on
  **`NAV_LEVEL_STYLE_COMPARE_KEYS` `@620-636`** — **506-01 SUPPLIES the exact key set
  in its closure note; 506-02 (sole writer of this file) ADDS every new `NavLevelStyle`
  key there, or per-device deltas silently never emit; 506-02 verifies the delta path
  fires for a mobile/tablet override of each new key.**
  `collectBrandDeltaRules` `@652-666` (brand — out of B-scope).
- The ONE builder `buildMenuRuleSetsForDocument(doc)` `@740-805`:
  `baseRules` `@752-759`, `desktopShared` `@764-768` (`dropdownRule` + `navNestingRules(base)` + `navLevelRules(baseLevelStyles)`),
  `tabletDelta` `@769-773`, `mobileRules` `@774-788` (`navLevelRules(baseLevelStyles,{linkOnly:true})` `@786` for mobile-inherits-desktop LINK re-emit),
  `previewMobileOpen` `@791-796`. `baseLevelStyles` read off first nav-items block
  `props.levelStyles` `@746-748` (present-only ⇒ `undefined`).
- FRONT consumer `buildMenuDocumentCss(doc)` `@820-849`; CANVAS consumer
  `buildMenuDocumentPreviewCss(doc, device, forceOpenLevel?)` `@920-940`;
  `buildCanvasStructuralBaseline(device)` `@862-885` (mirrors base-sheet structure,
  incl. its OWN caret `@872` `.site-nav-group>summary::after` — the legacy
  `<summary>` path, structural; document rules follow and win);
  `previewForceOpenLevel(level)` `@894-902` (force-open sim — **B3 extends this**).

---

## Level-0 consumption (follow 506-01's pinned choice)

The parent recommends **Option B**: level-0 chrome lives in a NEW nested
`navProps.navChrome?: NavChromeStyle` sub-record (parallel to `levelStyles`), with
its own reject-unknown allowlist + per-device delta resolver, authored in 506-01.
506-02 then:

- reads `baseNavChrome = navBlock.props.navChrome` (present-only ⇒ `undefined`)
  next to `baseLevelStyles` in `buildMenuRuleSetsForDocument` `@746-748`;
- emits the level-0 variants of B1/B2 + the B3 caret (showCaret/caretRotateOnOpen on the
  level-0 group parents) + the B4 pill from a new `navChromeRules(chrome, {linkOnly?})`
  folded into `desktopShared` (all-width link bits) and gated for the container bits,
  mirroring `navLevelRules`; navChrome has NO `flyoutAnimation` (the top bar is never a
  revealed sublist — flyoutAnimation is a per-container field on `levelStyles[1|2]`);
- per-device: a new `collectChromeDeltaRules(doc, device)` mirroring
  `collectLevelDeltaRules` `@671-683`, diffing the 506-01 chrome resolver output vs
  the base `navChrome` on the chrome compare-key list (506-01 enumerates the key set;
  506-02 CREATES the list here, since this file is 506-02's single-writer surface).

If 506-01 instead pins **Option A** (`"0"` added to the level machinery,
`NavLevelStyleLevel = 0|1|2`), then level-0 rides the SAME `navLevelRules` /
`collectLevelDeltaRules` with a `LEVEL_LINK_SELECTORS[0] = ${scope} .site-nav-link`
+ `LEVEL_CONTAINER_SELECTORS[0] = ${scope} .site-nav-list` entry, `NAV_LEVELS`
becomes `[0,1,2]`, and there is no separate chrome path. **506-02 follows whichever
506-01 shipped — the CSS decls below are identical; only the selector-map wiring
differs.** The pseudocode below is written for Option B (level-0 chrome record);
the Option-A collapse is a mechanical selector-map merge.

---

## Implementation Pseudocode (execution-ready)

All new rule generators return `string[]`, are PRESENT-ONLY (`field != null ? decl : null`
then `.filter(non-null)`) so an unauthored field emits ZERO bytes, and are folded
into the existing `buildMenuRuleSetsForDocument` buckets (never a new top-level
sheet). Emission ORDER within each bucket: new rules go AFTER the existing
`navLevelRules` / `navNestingRules` for their level so they win on source order
(equal specificity), and B2/B3 hover/open rules go after the base link rules.

```ts
// core/site/menuDocumentCss.ts   (SOLE WRITER: 506-02)

// ───────────────────────── B1 item separators (orientation-aware) ────────────
// LEVEL 0 (nav bar): divider BETWEEN top-level items.
//   horizontal bar (orientation !== "vertical") ⇒ VERTICAL rule: border-inline-end
//   vertical bar   (orientation === "vertical")  ⇒ HORIZONTAL rule: border-block-end
// LEVELS ≥1 (dropdown, always vertical stack) ⇒ HORIZONTAL rule: border-block-end
// Reads the FLAT B1 keys directly off NavLevelStyle / NavChromeStyle (506-01's
// normative shape — there is NO nested `itemDivider` sub-object).
const dividerCss = (s: NavLevelStyle | NavChromeStyle): string | null =>   // shared decl builder
  s.itemDividerShow === true
    ? `${s.itemDividerWidth ?? 1}px ${s.itemDividerStyle ?? "solid"} ${s.itemDividerColor ?? "currentColor"}`
    : null;                                                       // itemDividerShow!==true ⇒ omit ENTIRELY
// NOTE: absent OR itemDividerShow:false ⇒ zero bytes. `itemDividerShow:true` with the
// other three unset ⇒ the documented cheap-win fallback (1px solid currentColor);
// confirm with 506-01 the default color token — reuse the menu color normalizer's
// neutral if it exports one.

const level0DividerRule = (chrome: NavChromeStyle, orientation): string | null => {
  const v = dividerCss(chrome);
  if (v == null) return null;
  const side = orientation === "vertical" ? "border-block-end" : "border-inline-end";
  return `${menuDocScope} .site-nav-list > .site-nav-item:not(:last-child){${side}:${v}}`;
};
// The `> li` divider suffix MUST ride a SINGLE-member selector per level — NOT
// LEVEL_CONTAINER_SELECTORS, whose lvl-1 entry @500 is a TWO-member comma group
// (`SEL_A, SEL_B`). String-concatenating `> li:not(:last-child)` onto a comma group
// yields `SEL_A, SEL_B > li:not(:last-child)`, which CSS parses as (a) `SEL_A` ALONE
// ⇒ border-block-end on the level-1 sublist CONTAINER itself + (b) `SEL_B > li` ⇒
// divider on LEVEL-2 items — the divider lands on the wrong depth AND strays onto the
// container, never on the level-1 items it must separate. This is EXACTLY the trap the
// B3 @266 note forbids for flyoutAnimRule; use a dedicated single-member map instead.
const LEVEL_DROPDOWN_ITEM_SELECTORS: Record<1 | 2, string> = {
  // level-1 items are the DIRECT `> li.site-nav-item` of the first sublist — front
  // markup (siteShell.tsx @244-264): `.site-nav-list > .site-nav-item >
  // ul.site-nav-sublist > li.site-nav-item`. Single-member; NOT the (0,5,0) map's [1].
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child)`,
  // level-2 items ride the anchored (0,5,0) nested sublist's DIRECT li (keeps 504 reach;
  // == LEVEL_CONTAINER_SELECTORS[2] @504 + `> li`, and that map entry IS single-member).
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li:not(:last-child)`,
};
const levelDropdownDividerRule = (lvl: 1 | 2, s: NavLevelStyle): string | null => {
  const v = dividerCss(s);
  if (v == null) return null;
  // Single-member per-level selector (the container is display:grid, so a
  // border-block-end draws the HORIZONTAL divider between stacked items). NEVER
  // concatenate `> li` onto the two-member LEVEL_CONTAINER_SELECTORS[1] @500.
  return `${LEVEL_DROPDOWN_ITEM_SELECTORS[lvl]}{border-block-end:${v}}`;
};
// LEVEL split: the level-0 divider targets `.site-nav-item` — it is a top-bar CHROME
// rule (NOT a link decl) ⇒ ≥640-ONLY, folded into desktopShared and EXCLUDED from the
// mobile linkOnly branch exactly like the B4 pill and the B3 caret/flyout. It MUST NOT
// re-emit at mobile: under mobileMode the <640 nav list is forced to
// `flex-direction:column` (base sheet @168 disclosure + mobileModeRules @338-339 + the
// @244 orientation stack), so re-emitting the desktop `border-inline-end` — the VERTICAL
// divider chosen for the HORIZONTAL top bar — would draw the separator on the WRONG axis
// of the vertical mobile stack. The `orientation` read off the resolved appearance does
// NOT reflect that mobileMode column override, so it cannot be trusted to flip the side
// at <640. (If a mobile separator is ever wanted it must be a DISTINCT orientation-flipped
// `border-block-end` variant, never the desktop `border-inline-end`.)
// level≥1 dropdown divider is likewise CONTAINER-scoped ⇒ ≥640-ONLY (respect linkOnly;
// NEVER emit at mobile — the inline <640 stack would get stray borders). Orientation for
// the ≥640 desktop bar is read from the resolved appearance's `orientation`.

// ───────────────────────── B2 indicator + hover chrome ───────────────────────
// LINK-level (all-width). Bar is a ::BEFORE on the link — NOT ::after: the nesting
// caret @712 already emits `li[data-site-nav-group="true"]>.site-nav-link::after`
// (and B3's caretToggle/rotate target that SAME ::after). A single element has ONE
// ::after, so emitting the indicator on ::after would make the two rules fight on
// the shared pseudo-element on any dropdown-PARENT link that also carries an
// indicator (per-property cascade → broken caret OR broken bar). Putting the
// indicator on ::before and leaving ::after to the caret keeps both intact (Hard
// Invariant 8). The link is already position-relative via base sheet? NO —
// `.site-nav-link{display:block}` is not positioned. Add `position:relative` to the
// link decls WHEN indicator!=="none" (present-only, so byte-identity holds when
// unauthored).
const indicatorLinkDecls = (s /* NavLevelStyle | NavChromeStyle */): string[] => {
  const out: string[] = [];
  // transition applies to color/background/transform for hover-lift + grow + color.
  if (s.transitionMs != null)
    out.push(`transition:color ${s.transitionMs}ms,background ${s.transitionMs}ms,transform ${s.transitionMs}ms`);
  if (s.indicator != null && s.indicator !== "none")
    out.push(`position:relative`);                                // anchor the ::before bar
  return out;                                                     // folded INTO the link{} block
};
const indicatorBarRule = (sel: string, s): string | null => {
  if (s.indicator == null || s.indicator === "none") return null;
  const edge = s.indicator === "overline" ? "top:0" : "bottom:0";
  const th = s.indicatorThickness ?? 2;
  const grow = s.indicatorGrow === true;
  // Resting bar: width 0 when grow (animate to 100% on hover), else 100% but
  // transparent until hover/current — modern default = HIDDEN at rest, shown on
  // hover + current. Use scaleX(0)→scaleX(1) for grow (transform-only, GPU),
  // width:100% + opacity for non-grow.
  const rest = grow
    ? `content:"";position:absolute;left:0;${edge};height:${th}px;width:100%;background:${s.indicatorColor ?? "currentColor"};transform:scaleX(0);transform-origin:left;transition:transform ${s.transitionMs ?? 150}ms`
    : `content:"";position:absolute;left:0;${edge};height:${th}px;width:100%;background:${s.indicatorColor ?? "currentColor"};opacity:0;transition:opacity ${s.transitionMs ?? 150}ms`;
  // ::BEFORE (not ::after) — ::after is owned by the @712 caret / B3 rotate on
  // group-parent links; a shared pseudo would collide per-property.
  return `${sel}::before{${rest}}`;
};
const indicatorShownRule = (sel: string, s): string | null => {
  if (s.indicator == null || s.indicator === "none") return null;
  const on = s.indicatorGrow === true ? `transform:scaleX(1)` : `opacity:1`;
  // Shown on :hover / :focus-visible AND on the current page. Reuse the 504
  // aria-current selector form (:where(...) keeps 0-added-specificity so it TIES
  // hover; source order lets both win). Each comma member re-prefixes the scope.
  // ::BEFORE, matching indicatorBarRule (keeps the caret's ::after free).
  return `${sel}:hover::before,${sel}:focus-visible::before,${sel}:where([aria-current="page"])::before{${on}}`;
};
const hoverExtrasRule = (sel: string, s): string | null => {
  const decls = [
    s.hoverUnderline === true ? `text-decoration:underline` : null,
    s.hoverLift != null ? `transform:translateY(-${s.hoverLift}px)` : null,
  ].filter(Boolean);
  return decls.length ? `${sel}:hover,${sel}:focus-visible{${decls.join(";")}}` : null;
};
// B2 wiring: indicatorLinkDecls fold into the SAME link{} block as levelLinkDecls
// (append; present-only). indicatorBarRule/indicatorShownRule/hoverExtrasRule are
// SEPARATE rules pushed after the link rule, in navLevelRules (level≥1) and
// navChromeRules (level 0). ALL are LINK-level ⇒ all-width ⇒ re-emit at mobile.

// ───────────────────────── B3 caret toggle + rotate + flyout ─────────────────
// The caret @712 is emitted UNCONDITIONALLY today for ALL groups. To make it
// per-level toggleable, the @712 rule stays as the DEFAULT, and B3 emits an
// OVERRIDE keyed to the level's group selector.
//   showCaret === false ⇒ suppress: `${groupSel}::after{content:none}` (or display:none)
//   caretRotateOnOpen   ⇒ rotate on open: hover/focus-within transform
// The group selector must be scoped to the level: level-0 group = a DIRECT child
// of .site-nav-list; level≥1 group = inside the sublist. Reuse the depth anchors:
const GROUP_CARET_SELECTORS: Record<0 | 1 | 2, string> = {
  0: `${menuDocScope} .site-nav-list > li[data-site-nav-group="true"] > .site-nav-link`,
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link`,
};
const caretToggleRule = (lvl, s): string | null =>
  s.showCaret === false ? `${GROUP_CARET_SELECTORS[lvl]}::after{content:none}` : null;
const caretRotateRule = (lvl, s): string[] => {
  if (s.caretRotateOnOpen !== true) return [];
  const caret = GROUP_CARET_SELECTORS[lvl];                     // …> .site-nav-link
  const g = caret.replace(" > .site-nav-link", "");             // the <li>
  // The base caret @712 is a non-replaced INLINE ::after (`content:" \25BE";
  // font-size:.7em` — NO `display`). Per CSS Transforms, `transform` does NOT apply to
  // non-replaced inline boxes, so a bare `rotate(180deg)` is SILENTLY IGNORED (zero
  // visible effect), and there is no `transition` to animate it either. So the rotate
  // rule ALSO emits the caret's resting state: give it a transformable box
  // (display:inline-block), a resting `transform:rotate(0)`, and a `transition` so the
  // open rotate both APPLIES and ANIMATES. Emitting the rest state HERE (not amending
  // @712) keeps @712 byte-identical when caretRotateOnOpen is off (Hard Invariant 2).
  return [
    `${caret}::after{display:inline-block;transform:rotate(0);transition:transform ${s.transitionMs ?? 150}ms}`,
    `${g}:hover > .site-nav-link::after,${g}:focus-within > .site-nav-link::after{transform:rotate(180deg)}`,
  ];
};
// flyoutAnimation: NEVER replace the display:none→grid toggle @701/@703 (that is the
// zero-JS reachability contract). Layer opacity(+translateY) OVER it — but make the
// reveal ACTUALLY interpolate on OPEN. An element leaving `display:none` has no rendered
// start value, so a bare `opacity`/`transform` transition SNAPS straight to the final
// value (the classic display:none-kills-the-fade trap); a `visibility 0s Nms` delay only
// helps on CLOSE, leaving the open fade/slide cosmetically inert. The fix that keeps the
// display toggle AND animates the reveal: transition `display` itself with
// `transition-behavior:allow-discrete`, and supply a matching `@starting-style` that
// gives the just-shown (display:none→grid) element a real opacity/transform to
// interpolate FROM. (Rationale: `.site-nav-sublist` is `position:absolute` @157/@878, so
// the reveal causes no layout reflow; the focusable parent link sits OUTSIDE the sublist,
// so :hover/:focus-within on the parent `li` still opens it with zero JS.)
const flyoutAnimRule = (lvl: 1 | 2, s): string[] => {
  if (s.flyoutAnimation == null || s.flyoutAnimation === "none") return [];
  // CONTAINER convention (aligns with LEVEL_CONTAINER_SELECTORS + previewForceOpenLevel):
  // flyoutAnimRule(N) animates the level-N sublist — the SAME sublist
  // LEVEL_CONTAINER_SELECTORS[N] styles and that previewForceOpenLevel(N) force-opens
  // (§ Canvas force-open). So flyoutAnimation authored on levelStyles[N] reveals the
  // level-N container, and selecting Level N in the editor (forceOpenLevel=N) force-opens
  // AND neutralizes exactly the sublist it animates. There is NO flyoutAnimation on
  // navChrome/level-0 — the top bar is never a revealed sublist (and forceOpenLevel=0 ⇒
  // undefined ⇒ nothing to surface). Target the ONE sublist that opens for THIS level,
  // plus the parent li that toggles it — each level gets its OWN single, precise
  // selector. NEVER the cascading two-member LEVEL_CONTAINER_SELECTORS[1]: its lvl-1
  // member ALSO matches the nested `.site-nav-sublist .site-nav-sublist`, so setting the
  // closed rest `opacity:0` there strands the nested level-2 sublist hidden while the
  // paired direct-child shown rule (`openParent:hover > .site-nav-sublist`) un-hides ONLY
  // the first dropdown — a zero-JS reachability BREAK (Hard Invariant 6). Level-1 IS the
  // first dropdown (opened by its level-0 item parent); level-2 IS the anchored nested
  // sublist (opened by its level-1 item parent); level-2 has NO sublist below it ⇒ nothing
  // deeper to animate. openParent/sub are matched so the hidden rule and the shown rule
  // ALWAYS act on the SAME single element.
  const target =
    lvl === 1
      ? {
          // first dropdown = the level-1 sublist (== LEVEL_CONTAINER_SELECTORS[1] first member)
          sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist`,
          openParent: `${menuDocScope} .site-nav-list > .site-nav-item`,
        }
      : {
          // anchored nested-only selector (== LEVEL_CONTAINER_SELECTORS[2] @504)
          sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
          openParent: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > .site-nav-item`,
        };
  const { sub, openParent } = target;
  const dur = s.transitionMs ?? 150;
  // Resting (closed) values the reveal interpolates FROM/TO. display stays governed by
  // @701 (none) / @703 (grid); we transition it here with allow-discrete so the discrete
  // none↔grid flip is sequenced WITH the opacity/transform animation instead of snapping.
  const rest = s.flyoutAnimation === "slide" ? "opacity:0;transform:translateY(-6px)" : "opacity:0";
  const open = s.flyoutAnimation === "slide" ? "opacity:1;transform:translateY(0)" : "opacity:1";
  const txn = s.flyoutAnimation === "slide"
    ? `transition:opacity ${dur}ms,transform ${dur}ms,display ${dur}ms allow-discrete`
    : `transition:opacity ${dur}ms,display ${dur}ms allow-discrete`;
  const shownSel = `${openParent}:hover > .site-nav-sublist,${openParent}:focus-within > .site-nav-sublist`;
  return [
    // Closed: keep @701's display:none; layer the resting opacity/transform + a
    // display-aware transition so BOTH open and close animate (allow-discrete makes the
    // discrete display flip participate; on close it delays display:none to the end).
    `${sub}{${rest};${txn}}`,
    // Open: @703 already flips display:grid; set the shown opacity/transform (+ carry the
    // same transition so the close direction, when :hover/:focus-within drops, animates).
    `${shownSel}{${open};${txn}}`,
    // @starting-style gives the element a real START value the instant it leaves
    // display:none, so the OPEN reveal interpolates from rest instead of snapping. WITHOUT
    // this the fade/slide is invisible on open even though the shown rule string-matches.
    `@starting-style{${shownSel}{${rest}}}`,
  ];
  // `openParent > .site-nav-sublist` resolves to exactly `sub` (verified against the
  // 502-03 markup: li.site-nav-item[data-site-nav-group] > ul.site-nav-sublist), so
  // every hidden state has a matching :hover/:focus-within shown state on the SAME
  // element. The display:none→grid toggle @701/@703 STILL runs (reachability) and
  // opacity/transform animate on top via allow-discrete + @starting-style; keyboard
  // :focus-within on the parent li opens → reachability preserved. NOTE the browser floor:
  // `@starting-style` + `transition-behavior:allow-discrete` are the load-bearing bits —
  // 506-05 must verify a REAL computed transition on the revealed sublist (a no-op
  // animation is invisible to a mere `opacity:1`/`display:grid` present-check).
};
// B3 wiring: caretToggleRule + caretRotateRule + flyoutAnimRule are CONTAINER-ish
// structural (they only matter ≥640 where the flyout exists) ⇒ ≥640-ONLY (skip in
// the mobile linkOnly branch). Emitted in desktopShared (base) + tabletDelta / the
// force-open canvas path. NOTE the keying split: caretToggle/caretRotate are per-level
// 0/1/2 (level-0 group parents live on the top bar), but flyoutAnimRule is called ONLY
// for lvl 1 (levelStyles[1] ⇒ first dropdown) and lvl 2 (levelStyles[2] ⇒ nested) — NOT
// on navChrome/level-0, which has no revealed sublist of its own to animate.
// CROSS-SUBTASK FLYOUTANIMATION FIELD-HOME/CONTROL CONSTRAINT (binds 506-01 + 506-04).
// Because flyoutAnimRule follows the CONTAINER convention — flyoutAnimRule(N) animates the
// level-N sublist that previewForceOpenLevel(N) force-opens (editor: selecting Level N sets
// forceOpenLevel=N, MenuDesignEditor.tsx @2101-2103; forceOpenLevel=0 ⇒ undefined) —
// `flyoutAnimation` is a levels-≥1 CONTAINER field, NOT a parent/level-0 field. So the
// authored / stored / read levels MUST agree, or the animated sublist is neither opened nor
// neutralized on the very panel where it is authored (a dead control defeating Hard
// Invariant 6 — authors must SEE the reveal while styling). Required reconcile:
//   • 506-01 (field home): home `flyoutAnimation` on `NavLevelStyle` (levelStyles[1|2]) ONLY —
//     add it to the level allowlist + `NAV_LEVEL_STYLE_COMPARE_KEYS`, and put it NOWHERE on
//     the level-0 `navChrome` record (not in its allowlist, not in its compare list). The top
//     bar is never a revealed sublist.
//   • 506-04 (control placement): expose the `flyoutAnimation` control ONLY on the Level 1 /
//     Level 2+ panels (the "0"/"1"/"2" level selector @1586, per-level set bound to
//     levelStyles[level] @1277), NEVER on the level-0 / navChrome pill surface.
// This is the flyoutAnimation twin of the B5 submenuPlacement level-ownership note @454.

// ───────────────────────── B4 pill + dropdown inner padding ───────────────────
// PILL — level-0 wrapper on .site-nav-list (all in navChromeRules).
const pillRule = (chrome: NavChromeStyle): string | null => {
  const decls = [
    chrome.navPillBackground != null ? `background:${chrome.navPillBackground}` : null,
    chrome.navPillRadius != null ? `border-radius:${chrome.navPillRadius}px` : null,
    (chrome.navPillPaddingX != null || chrome.navPillPaddingY != null)
      ? `padding:${chrome.navPillPaddingY ?? 0}px ${chrome.navPillPaddingX ?? 0}px`
      : null,
  ].filter(Boolean);
  return decls.length ? `${menuDocScope} .site-nav-list{${decls.join(";")}}` : null;
  // ≥640-ONLY (a pill on the inline <640 stack is wrong) ⇒ desktopShared/tablet,
  // NOT the mobile branch.
};
// DROPDOWN INNER PADDING — levels ≥1, on the container selector (distinct from
// per-LINK paddingX/Y). Fold into levelContainerDecls (@535) so it inherits the
// ≥640-only linkOnly split automatically:
//   containerPaddingX/Y != null ⇒ `padding:${cY ?? 0}px ${cX ?? 0}px`
// CAUTION: the base sheet sets `.site-nav-sublist{padding:6px}` — a single-axis
// author must complete the shorthand (use 0 for the unset axis OR 6 to match the
// base; pick 0 for "author fully controls" — document the choice in 506-05 tests).

// ───────────────────────── B5 nested submenu placement ───────────────────────
// Override the HARDCODED @707 nested flyout for the LEVEL-2 nested sublist ONLY.
// Emit on the ANCHORED (0,5,0) selector LEVEL_CONTAINER_SELECTORS[2] (NOT the short
// (0,3,0) `.site-nav-sublist .site-nav-sublist`) so it TIES the 504 reach + wins by
// source order. Keep dropdownRule @325 (first-dropdown top|bottom) untouched. NEVER
// emit for level 1 / never use LEVEL_CONTAINER_SELECTORS[1] (see the invariant note).
// CROSS-SUBTASK LEVEL-OWNERSHIP CONSTRAINT (binds 506-01 + 506-04). Although
// `submenuPlacement` is allowlist-valid on ANY NavLevelStyle (it lives on the shared
// record, so the schema accepts it at level 1 too), the CSS reads it SOLELY off the
// LEVEL-2 style (`baseLevelStyles?.[2]`) and emits it SOLELY on
// LEVEL_CONTAINER_SELECTORS[2]. A value stored at level 1 is a SILENT CSS no-op (a
// dead control) — test #2 (@618-619) asserts exactly this. So the authored / stored /
// read levels MUST agree: 506-04 exposes the `submenuPlacement` control ONLY on the
// `Level 2+` panel (the editor's level-selector UX — author picks Level 2+, sets "where
// my children fly out"), NEVER on the level-1 panel; and 506-01 documents
// `submenuPlacement` as a LEVEL-2-honored field (allowlist-valid everywhere, but only
// consumed at level 2). This is the "per level >=1" carve-out for B5: the field is
// per-level in shape but level-2 in EFFECT. Wiring it onto the level-1 control would
// store it where the CSS never reads it => dead field.
const submenuPlacementRule = (s: NavLevelStyle): string | null => {
  if (s.submenuPlacement == null) return null;
  const pos =
    s.submenuPlacement === "bottom" ? "left:0;top:100%;right:auto;bottom:auto"
    : s.submenuPlacement === "left"  ? "right:100%;left:auto;top:0;bottom:auto"
    : /* right (default) */             "left:100%;right:auto;top:0;bottom:auto";
  // submenuPlacement is the NESTED axis — it ONLY ever rewrites the level-2 nested
  // sublist, so it emits SOLELY on the anchored (0,5,0) LEVEL_CONTAINER_SELECTORS[2]
  // and is read off the LEVEL-2 style (`baseLevelStyles?.[2]`). It MUST NOT touch
  // level 1: LEVEL_CONTAINER_SELECTORS[1] @500 is a TWO-member selector whose FIRST
  // member is the first dropdown `.site-nav-list > .site-nav-item > .site-nav-sublist`,
  // so writing `left:100%;top:0` (or `right:100%`) there would overwrite
  // dropdownRule @325's top|bottom first-axis and shove the top-level dropdown
  // sideways (Hard Invariant 5). Never use LEVEL_CONTAINER_SELECTORS[1] for placement.
  return `${LEVEL_CONTAINER_SELECTORS[2]}{${pos}}`;
  // Emitted in desktopShared AFTER navNestingRules @707 so it wins the always-RIGHT
  // default on source order. ≥640-ONLY (nested flyout doesn't exist <640). MUST NOT
  // reset the base sheet's first-level absolute — only the nested-nested selector.
};
// B5 PER-DEVICE (tablet) EXCEPTION. submenuPlacement is in NAV_LEVEL_STYLE_COMPARE_KEYS
// so a tablet-only override makes deepEqualLevelStyles=false and collectLevelDeltaRules
// re-runs navLevelRules — but navLevelRules does NOT emit placement (it is a STANDALONE
// submenuPlacementRule appended to desktopShared @396, OUTSIDE navLevelRules). So the
// level-delta path re-emits IDENTICAL level-2 link/container rules and NO placement
// rewrite. B5 therefore needs its OWN standalone tablet-delta emitter, mirroring how
// its base rule is standalone. Gate on a real diff of the RESOLVED tablet level-2
// placement vs the base level-2 placement so an unchanged doc emits zero bytes.
// NEVER mobile — the nested flyout is ≥640-only (mobile is the inline <640 stack).
const submenuPlacementDeltaRule = (doc: MenuDocumentV2, device: "tablet"): string | null => {
  const section = doc.sections[0];
  if (!section) return null;
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return null;
  const resolvedL2 = resolveMenuSectionAppearanceForDevice(section, device)
    .navProps.levelStyles?.[2];                                   // 506-01 resolver, {}-safe
  const baseL2 = navBlock.props.levelStyles?.[2];
  if ((resolvedL2?.submenuPlacement ?? null) === (baseL2?.submenuPlacement ?? null))
    return null;                                                  // no placement diff ⇒ zero bytes
  return submenuPlacementRule(resolvedL2 ?? {});                  // re-emit on the (0,5,0) sel; later source order wins
};
```

### Wiring into the ONE builder (`buildMenuRuleSetsForDocument` `@740-805`)

```
baseLevelStyles  = navBlock.props.levelStyles         // existing @746-748
baseNavChrome    = navBlock.props.navChrome           // NEW (Option B); present-only ⇒ undefined

desktopShared  += navChromeRules(baseNavChrome)       // B1-L0 divider, B2-L0 indicator/hover, B4 pill, B3-L0 caret ONLY (NO flyout — the top bar is never a revealed sublist)
               += (for lvl in [1,2]) B1 dropdown divider + B3 caret/flyout   // ≥640-only; flyoutAnimRule(1) ⇒ first dropdown (level-1 sublist), flyoutAnimRule(2) ⇒ nested (level-2 sublist)
               += submenuPlacementRule(baseLevelStyles?.[2])   // B5: LEVEL-2 nested sublist ONLY (never lvl 1 — see submenuPlacementRule note) — ≥640-only
                  // (B2 per-level indicator/hover already rides navLevelRules via levelLinkDecls append + new state rules)
tabletDelta    += collectChromeDeltaRules(doc,"tablet")     // NEW, mirrors collectLevelDeltaRules
               += submenuPlacementDeltaRule(doc,"tablet")   // B5 EXCEPTION: standalone level-2 placement delta (never mobile — ≥640-only)
                  // collectLevelDeltaRules re-emits the IN-navLevelRules new keys (B1/B3/B4) once they are in COMPARE_KEYS,
                  // but it does NOT carry B5 submenuPlacement (that rule is STANDALONE @396, OUTSIDE navLevelRules) — so B5's
                  // tablet delta MUST be emitted standalone here too, or a tablet-only placement override silently never fires.
mobileRules    += navChromeRules(baseNavChrome,{linkOnly:true})   // B2-L0 LINK bits only; NO pill/divider/caret
               += collectChromeDeltaRules(doc,"mobile")           // linkOnly
                  // navLevelRules(...,{linkOnly:true}) @786 already re-emits per-level LINK indicator/hover
```

- **New `NavLevelStyle` decls that are LINK-level (B2 indicator/hover/lift/transition):**
  append into `levelLinkDecls` `@509` (link `{}` block) + add the bar/shown/hover
  state rules into `navLevelRules` `@566` right after `levelStateRules` — these are
  ALL-WIDTH (re-emit at mobile via `@786` + `collectLevelDeltaRules` mobile linkOnly).
- **New `NavLevelStyle` decls that are CONTAINER-level (B1 dropdown divider, B4
  containerPaddingX/Y, B3 caret/flyout):** emit ONLY in the non-`linkOnly`
  path (guard `if (options?.linkOnly) continue;` `@578` already exists — put them
  BELOW that guard) so they stay ≥640-only and never paint on the inline `<640` stack.
  **B5 placement is the exception on TWO axes:** (a) it is NOT emitted per-level inside
  the `[1,2]` loop (that would hit `LEVEL_CONTAINER_SELECTORS[1]` for lvl 1 and clobber
  the first dropdown — Hard Invariant 5); it is a SINGLE call
  `submenuPlacementRule(baseLevelStyles?.[2])` reading the level-2 style, appended
  directly to `desktopShared`, ≥640-only, never in the mobile branch. (b) Because that
  base rule lives OUTSIDE `navLevelRules`, its per-device delta is NOT carried by
  `collectLevelDeltaRules` (which only re-runs `navLevelRules`) even though
  `submenuPlacement` is in `NAV_LEVEL_STYLE_COMPARE_KEYS`. So a tablet-only placement
  override needs its OWN standalone delta emitter `submenuPlacementDeltaRule(doc,"tablet")`
  appended to `tabletDelta` (gated on a real level-2 placement diff), ≥640-only, never
  mobile. Every OTHER new `NavLevelStyle` key (B1/B3/B4) lives inside `navLevelRules`, so
  its delta IS carried once the key is in `COMPARE_KEYS`; only B5 is the carve-out.
- **`NAV_LEVEL_STYLE_COMPARE_KEYS` `@620-636`:** 506-01 SUPPLIES the list in its closure
  note; 506-02 (sole writer of this file) WRITES it — ADDS every new `NavLevelStyle` key +
  CREATES the navChrome compare list — so `collectLevelDeltaRules` / `collectChromeDeltaRules`
  fire. 506-02's tests assert a per-device override of each new key emits a delta (a missing
  compare key ⇒ the delta test FAILS — a live cross-subtask guard).

### Canvas force-open — B3 hidden-state neutralization (`previewForceOpenLevel` `@894-902`)

`previewForceOpenLevel` sets `display:grid` directly (bypassing hover), but B3's
`flyoutAnimation` closed rest rule leaves the sublist at `opacity:0` (`display:none` from
@701) — so once force-open flips it to `display:grid` the rest `opacity:0` would still
show an OPEN-but-INVISIBLE flyout. Extend it to ALSO force the shown state (`opacity:1`,
`transform:none`) so authors SEE the styled depth. CRITICAL — each neutralize rule must
MATCH THE SPECIFICITY of the B3 hidden rule it overrides so it ties + wins on SOURCE
ORDER (source-order tie-break only decides EQUAL specificity; a higher-specificity
hidden rule beats a lower-specificity force-open regardless of order):

- level-1 first dropdown (force-open `level >= 1`, editor Level-1 panel): the B3
  `flyoutAnimRule(1)` hidden selector is `.site-nav-list > .site-nav-item > .site-nav-sublist`
  = (0,3,0); the force-open rule below uses the SAME selector ⇒ ties + wins on order. ✓
- nested level-2 sublist (force-open `level >= 2`, editor Level-2 panel): the B3
  `flyoutAnimRule(2)` hidden selector is the ANCHORED
  `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` = (0,5,0)
  (== LEVEL_CONTAINER_SELECTORS[2] @504). The SHORT `.site-nav-sublist .site-nav-sublist`
  is only (0,3,0), which LOSES to the (0,5,0) hidden rule regardless of order — a level-2
  `flyoutAnimation` doc would show the nested flyout OPEN-BUT-INVISIBLE on the canvas,
  defeating the stated goal 'authors SEE the styled depth' (Hard Invariant 6). So the
  nested neutralize MUST use the anchored (0,5,0) form:

```ts
const previewForceOpenLevel = (level): string[] => {
  const rules = [
    `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;opacity:1;transform:none}`,
  ];
  if (level >= 2)
    // ANCHORED (0,5,0) — MUST match the B3 flyoutAnimRule(2) nested hidden selector so it
    // ties + wins on source order; the short `.site-nav-sublist .site-nav-sublist` (0,3,0)
    // would LOSE to the (0,5,0) hidden rule.
    rules.push(`${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}`);
  return rules;
};
```

Emitted LAST by `buildMenuDocumentPreviewCss` `@936-937` ⇒ wins the B3 hidden state
+ the closed `display:none` on source order (each rule ties its paired hidden rule's
specificity per the note above). `undefined` forceOpen ⇒ zero extra
bytes (preview byte-identity for the no-select case). Note `buildCanvasStructuralBaseline`
`@872` also hard-emits a `.site-nav-group>summary::after` caret (legacy `<summary>`
path); B3's caret toggle targets the `.site-nav-link::after` (`li[data-site-nav-group]`
menu-doc path), a different element — no conflict, but 506-05 asserts the canvas caret
toggle actually suppresses the menu-doc caret.

### Error handling / present-only discipline

- Every generator returns `null`/`[]` when its field is absent → filtered out → ZERO
  bytes. No generator emits a resolution default (present-only). The only fallbacks
  are the documented cheap-wins (divider `1px solid currentColor` when `show:true`
  but bounds unset; indicator thickness `2`; transition `150ms`) — these fire ONLY
  when the FEATURE is explicitly turned on, so an unauthored doc is byte-identical.
- All interpolated values arrive pre-validated from 506-01 (color/number/enum/bool).
  506-02 does NO re-validation and NO raw-string interpolation of author input except
  through the already-escaped/validated resolver output. Block ids (none new here)
  keep `escapeAuthoringCssString`.
- If 506-01's exports are missing (types absent), 506-02 does NOT compile — this is
  the intended land-order gate (506-02 opens only after 506-01 is green).

---

## Regression / test shape owned or seeded by this subtask (asserted in 506-05)

506-05 authors the suites; 506-02 lands with the CSS-side unit coverage below green
(the parent's `tests/vitest/site/menu-document-css.test.ts` lane). The one edit
506-02 makes to that existing lane is the narrow force-open carve-out declared in
the Sole-writer boundary above — updating ONLY the `L1_OPEN`/`L2_OPEN` constants
and their paired `toContain`/`not.toContain` assertions (`@377-378`, `@382`,
`@391-392`, `@401-402`) to the post-change force-open strings; without that update
this lane cannot be green after the mandated `previewForceOpenLevel` change, so the
"land green" claim below is contingent on applying exactly that carve-out (and no
other test edit):

1. **Present-only zero-byte emission.** For EACH new field, a doc with the field
   UNSET emits byte-identical CSS to the pre-506 builder — `buildMenuDocumentCss` and
   `buildMenuDocumentPreviewCss` output unchanged. Snapshot the no-override doc.
2. **Exact selector strings per bundle** (string-contains asserts, not full snapshot):
   - B1 level-0 horizontal bar ⇒ `.site-nav-list > .site-nav-item:not(:last-child){border-inline-end:…}`;
     orientation `vertical` ⇒ `border-block-end` instead. Dropdown level 1 ⇒ the
     SINGLE-member `.site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child){border-block-end:…}`
     (NOT concatenated off the two-member `LEVEL_CONTAINER_SELECTORS[1]`); assert NO
     `border-block-end` lands on the bare container selector
     `.site-nav-list > .site-nav-item > .site-nav-sublist{…}` and that the divider does
     NOT target level-2 items for a level-1 override. Dropdown level 2 ⇒
     `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li:not(:last-child){border-block-end:…}`
     (anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` + `> li`).
   - B2 `::before` bar on the level link sel (NOT `::after` — that pseudo is the
     caret's; assert the bar rule uses `::before`); shown on `:hover`,
     `:focus-visible`, `:where([aria-current="page"])`; grow ⇒
     `transform:scaleX(0)`→`scaleX(1)`; `hoverUnderline` ⇒
     `text-decoration:underline`; `hoverLift` ⇒ `translateY`; `transitionMs` on
     the link block.
   - B3 `showCaret:false` ⇒ `::after{content:none}` on the level group caret sel;
     `caretRotateOnOpen` ⇒ the caret `::after` rest rule carries `display:inline-block`
     (so `transform` applies to the otherwise non-replaced inline box) + `transform:rotate(0)`
     + `transition:transform …`, and the paired `rotate(180deg)` on `:hover`/`:focus-within`;
     `flyoutAnimation` ⇒ closed rest rule `opacity:0` (+ `transform:translateY(-6px)` for
     `slide`) carrying `transition:…,display …ms allow-discrete`, a `:hover`/`:focus-within`
     shown rule `opacity:1` (+ `transform:translateY(0)`), AND a `@starting-style{…}` block
     on the shown selector with the same `opacity:0`(+transform) start value (assert all
     three: rest, shown, and `@starting-style` — a missing `@starting-style`/`allow-discrete`
     is the no-op-on-open bug), while the `display:none→grid` toggle `@701/@703` is STILL
     present (reachability guard — assert BOTH the display toggle rule and the opacity rule
     exist). Assert the hidden rule targets the level's OWN precise single sublist selector
     (lvl 1 ⇒ `.site-nav-list > .site-nav-item > .site-nav-sublist`; lvl 2 ⇒ the anchored
     `.site-nav-sublist .site-nav-sublist`) and NEVER the two-member
     `LEVEL_CONTAINER_SELECTORS[1]`; assert the paired shown rule acts on the SAME element
     (`openParent:hover/:focus-within > .site-nav-sublist`). Where feasible, a REAL computed
     transition check on the revealed sublist beats string-contains (an inert animation is
     invisible to an `opacity:1` present-check).
   - B4 pill ⇒ `.site-nav-list{background/border-radius/padding}`; container padding
     ⇒ padding inside `LEVEL_CONTAINER_SELECTORS[lvl]{…}`.
   - B5 ⇒ placement rewrite (read off the LEVEL-2 style) on the anchored
     `LEVEL_CONTAINER_SELECTORS[2]` (assert the (0,5,0) form, NOT the short
     `.site-nav-sublist .site-nav-sublist`); `bottom` ⇒ `left:0;top:100%`; `left` ⇒
     `right:100%`; `right` ⇒ `left:100%`; and `dropdownRule` `@325` (first-dropdown
     top|bottom) still present unchanged. A `submenuPlacement` set on the LEVEL-1
     style emits NO placement rule and does NOT touch `LEVEL_CONTAINER_SELECTORS[1]`.
3. **Mobile `linkOnly` split.** With a per-level override of a LINK field (B2) AND a
   CONTAINER field (B1 dropdown divider / B4 padding / B5 placement / B3 flyout): the
   `max-width:639` mobile branch (`buildMenuDocumentCss`) contains the LINK rule and
   does NOT contain the CONTAINER rule; the `min-width:640` shared branch contains BOTH.
   **Level-0 divider is ≥640-only too:** with `navChrome.itemDividerShow:true` set,
   assert the `.site-nav-list > .site-nav-item:not(:last-child)` divider (whether
   `border-inline-end` OR the `vertical`-orientation `border-block-end`) appears in the
   `min-width:640` branch and that NO `border-inline-end` (nor any level-0
   `.site-nav-item:not(:last-child)` divider) leaks into the `max-width:639` mobile
   branch — where the nav list is `flex-direction:column`, so a vertical
   `border-inline-end` would paint on the wrong axis.
4. **Per-device delta fires for each new key** (cross-subtask 506-01 guard). Set each
   new key on `responsive.tablet` / `responsive.mobile`; assert the corresponding delta
   rule appears in the tablet/mobile branch (proves the key is in
   `NAV_LEVEL_STYLE_COMPARE_KEYS` / the chrome compare list). A missing key ⇒ empty
   delta ⇒ this test FAILS. **B5 `submenuPlacement` is the carve-out:** it is NOT
   carried by `collectLevelDeltaRules` (its base rule is standalone, outside
   `navLevelRules`), so a tablet-only `submenuPlacement` override must produce an actual
   placement REWRITE via `submenuPlacementDeltaRule` in the `min-width:640` tablet
   branch — assert the tablet branch contains the level-2 placement rule
   (`LEVEL_CONTAINER_SELECTORS[2]{left:100%…}` etc. matching the tablet value) and that
   it is NOT merely a re-emit of identical level-2 link/container rules. Assert NO B5
   placement delta appears in the `max-width:639` mobile branch (nested flyout is
   ≥640-only).
5. **Canvas force-open neutralizes B3 hidden state (specificity-matched).** With
   `flyoutAnimation:"fade"` set and `forceOpenLevel` provided, `buildMenuDocumentPreviewCss`
   emits `display:grid;opacity:1;transform:none` in the force-open rule (LAST), overriding
   the closed rest `opacity:0`. Assert the NESTED
   neutralize rule uses the ANCHORED (0,5,0) form
   `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{…}` (NOT the
   short (0,3,0) `.site-nav-sublist .site-nav-sublist`), so with a LEVEL-2 `flyoutAnimation`
   (authored on the Level-2 panel ⇒ forceOpenLevel=2 opens the ancestor chain to the nested
   sublist) its (0,5,0) hidden rule is TIED (not out-specified) and the force-open wins on
   source order — the nested flyout is actually visible (not open-but-invisible) on the canvas.
   Where feasible, a real cascade check (computed `display:grid` + `opacity:1` on the
   revealed sublist) beats a string-contains, since a specificity loss is invisible to an
   `opacity:1`/`display:grid` present check.
6. **Byte-identity guards (named).** `buildSiteShellCss(null)` ZERO-line diff
   (`tests/unit/pages/siteShellCss.test.ts` untouched — 506-02 does not import/edit the
   base sheet); no-override menu doc byte-identical
   (`tests/unit/site/menu-document-render.test.tsx`); ONE-shared-builder parity (front
   `@media` and canvas flatten both contain the same bundle rules for an authored doc).
7. **B5 specificity + dropdownDirection intact.** Assert the B5 rule uses the anchored
   level-2 selector and that `dropdownRule` (base `top|bottom`) is emitted UNCHANGED
   alongside it (both present; B5 does not clobber the first-dropdown vertical axis).
   Also assert a LEVEL-1 `submenuPlacement` (e.g. `"right"`/`"left"`) leaves the first
   dropdown untouched: NO placement rule targets the first-dropdown selector
   `.site-nav-list > .site-nav-item > .site-nav-sublist` and `dropdownRule`'s
   `top`/`bottom` first-axis is unchanged (Hard Invariant 5). **B5 tablet delta:** with
   a tablet-only `submenuPlacement` override (base level-2 placement different or unset),
   assert the tablet (`min-width:640`) branch emits a level-2 placement rewrite on the
   anchored `LEVEL_CONTAINER_SELECTORS[2]` reflecting the tablet value, and that a
   tablet override IDENTICAL to base emits NO placement delta (diff-gated, zero bytes) —
   guarding against both the silent-no-emit bug (delta never fired) and a redundant
   re-emit of unchanged level-2 rules.
8. **B3 nested reachability (no orphan hidden state).** With ONLY the LEVEL-2
   `flyoutAnimation` set (e.g. `"fade"`) — under the CONTAINER convention flyoutAnimRule(2)
   animates the level-2 sublist — assert the nested level-2 sublist
   (anchored `.site-nav-sublist .site-nav-sublist`) gets a matching `opacity:1` shown rule
   on `:hover`/`:focus-within` (paired with its `opacity:0` closed rest rule + its
   `@starting-style` on the SAME element), and that NO `opacity:0` closed rest state is
   emitted on the two-member `LEVEL_CONTAINER_SELECTORS[1]` (which would strand the nested
   sublist invisible with no shown rule — Hard Invariant 6).
9. **Indicator + caret coexist on a group-parent link (no shared `::after`).** For a
   doc with BOTH `indicator` (e.g. `"underline"`) AND `showCaret:true` (the default)
   set on the SAME level that has a dropdown parent (`li[data-site-nav-group="true"]`):
   assert the indicator bar is emitted on `::before` (`{sel}::before{content:"";…}`)
   and the caret stays on `::after` (`@712` `li[data-site-nav-group="true"]>.site-nav-link::after{content:" \25BE"…}`
   present + unchanged) — i.e. the two never share one pseudo-element, so the caret
   glyph and the indicator bar both survive. Also assert with `caretRotateOnOpen:true`
   the rotate rule still targets `::after` while the indicator bar remains on `::before`
   (Hard Invariant 8).

**Testing lane:** Vitest Bun-free (`menuDocumentCss.ts` is Bun-free — comment `@69`).
No new Bun runtime suite is needed from 506-02 (route/render Bun suites are 506-03/05).
The `>=5` real-flow SMOKE scenarios (visible-effect, computed-style/geometry) are
authored by **506-05**, not here.

---

## Hard Invariants (this subtask must not break)

1. **`buildSiteShellCss(null)` byte-identical** — base sheet untouched; 506-02 imports
   only `SHELL_APPEARANCE_DEFAULTS` (a value table) `@23`.
2. **No-override docs byte-identical** — present-only emission; every new generator
   returns null/[] when unset.
3. **ONE shared builder** — all new CSS via `buildMenuRuleSetsForDocument`; front
   `@media` + canvas flatten NEVER diverge.
4. **Per-device cascade** — tablet+mobile each diff vs DESKTOP base; mobile NEVER
   inherits tablet. LINK-level new fields (B2) re-emit at mobile; CONTAINER-level new
   fields (B1 dropdown / B4 padding+pill / B5 / B3 flyout) stay ≥640-only (`linkOnly`).
5. **B5 preserves the anchored (0,5,0) level-2 specificity `@504`** and keeps
   `dropdownRule` `@325` / `navNestingRules` `@707` first-axis working. B5 emits
   SOLELY on `LEVEL_CONTAINER_SELECTORS[2]` (read off the level-2 style) and NEVER on
   the two-member `LEVEL_CONTAINER_SELECTORS[1]` `@500` — writing placement there
   would overwrite dropdownRule's top|bottom first-axis on the first dropdown.
6. **B3 keeps the zero-JS hover/focus-within open `@703` + reachability** —
   opacity(+transform) layered OVER the `display:none→grid` toggle (the toggle is NEVER
   replaced), and the reveal is made to ACTUALLY animate on open via
   `transition-behavior:allow-discrete` on the `display` transition + a matching
   `@starting-style` (a plain opacity/transform transition off `display:none` snaps and is
   cosmetically inert on open); does not fight canvas force-open (emitted LAST `@936`,
   each force-open rule SPECIFICITY-MATCHED to the B3 hidden rule it overrides — the
   nested neutralize on the anchored (0,5,0) `.site-nav-sublist .site-nav-sublist`, not
   the (0,3,0) short form, so source-order actually decides the tie).
   `flyoutAnimRule` follows the CONTAINER convention — `flyoutAnimRule(N)` animates the
   level-N sublist (the SAME one `LEVEL_CONTAINER_SELECTORS[N]` styles and
   `previewForceOpenLevel(N)` force-opens), so `flyoutAnimation` authored on `levelStyles[N]`
   is force-opened AND neutralized on the very editor panel it is authored on
   (Level N ⇒ forceOpenLevel=N); there is NO `flyoutAnimation` on `navChrome`/level-0 (the
   top bar is never a revealed sublist, and forceOpenLevel=0 ⇒ undefined). It targets each
   level's OWN single precise sublist selector and pairs every hidden rule with a matching
   shown rule on the SAME element; it NEVER hides via the two-member
   `LEVEL_CONTAINER_SELECTORS[1]` (that would strand the nested level-2 sublist at the closed
   rest `opacity:0` with no matching shown rule).
7. **NO `schemaVersion` bump; NO route/RBAC/endpoint/migration; NO edits outside
   `core/site/menuDocumentCss.ts`.**
8. **Indicator bar and caret never share a pseudo-element.** The B2 indicator emits
   on `::before`; the nesting caret `@712` (and B3's caretToggle/rotate) keep `::after`.
   A single element has ONE `::after`, so co-authoring `indicator` + `showCaret` on the
   same level (a top-nav-with-dropdowns + underline combo) MUST leave both a working
   caret glyph AND a working indicator bar — never a per-property collision on a shared
   `::after`.

---

## Implementation order (within 506-02)

1. Add the shared decl builders (`dividerCss`, `indicator*`, `caret*`, `flyoutAnimRule`,
   `pillRule`, `submenuPlacementRule`) + the `GROUP_CARET_SELECTORS` map.
2. Fold LINK-level decls into `levelLinkDecls` `@509` + new state rules into
   `navLevelRules` `@566` (all-width path); fold CONTAINER-level decls below the
   `linkOnly` guard `@578`.
3. Add `navChromeRules` + `collectChromeDeltaRules` for level-0 (Option B) and wire
   into `desktopShared` / `tabletDelta` / `mobileRules` `@764-788`. (Option A: extend
   the level maps instead.)
4. Extend `previewForceOpenLevel` `@894` to neutralize B3 hidden state (append
   `;opacity:1;transform:none` to both decls + switch the level-2 rule to the
   anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` form). Apply the narrow
   force-open test carve-out (Sole-writer boundary): update ONLY the
   `L1_OPEN`/`L2_OPEN` constants + their paired assertions
   (`menu-document-css.test.ts` `@377-378`/`@382`/`@391-392`/`@401-402`) to the
   post-change strings — no other test edit.
5. Run the CSS unit lane + both byte-identity guards; land green before 506-03
   opens (green here presumes the step-4 carve-out is applied — the pre-existing
   force-open assertions would otherwise be RED against the mandated change).

---

## Documentation

No doc files edited by 506-02 (docs/changelog/README are 506-05's). This subtask's
CSS contract (selector strings, orientation-aware sides, linkOnly split, force-open
neutralization) is the source of truth 506-05 folds into `_docs/PAGE_MODEL.md` /
`_docs/CONTENT_TYPES_SPEC.md`.
