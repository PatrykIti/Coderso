/**
 * menuDocumentCssDelta — device delta collectors, the exact neutralizer matrix,
 * and the entry builders of the menu-document stylesheet (TASK-542-02-L01
 * split): brand/level/chrome deltas, submenu placement + menu-bar extra deltas,
 * `collectDeltaRules`, `buildMenuRuleSetsForDocument`,
 * `buildMenuDocumentCss`, `buildMenuDocumentPreviewCss`, and the canvas
 * baseline/preview helpers. Bun-free (Vitest lane).
 */
import {
  resolveMenuBrandStyleForDevice,
  resolveMenuNavChrome,
  resolveMenuSectionAppearanceForDevice,
  type BrandStyle,
  type MenuBarLayout,
  type MenuDeviceKind,
  type MenuDocumentV2,
  type NavChromeStyle,
  type NavLevelStyle,
  type NavLevelStyles,
  type NavLevelStyleLevel,
} from "../services/menus/menuDocumentV2";
import { MENU_SHELL_SUBLIST_PADDING } from "../services/menus/menuDocumentV2Fields";
import type {
  MenuAppearance,
  MenuAppearanceOrientation,
} from "../services/menus/normalizeMenuAppearance";
import { escapeAuthoringCssString } from "../services/pages/pageAuthoringSanitizers";
import type { PageBreakpoint } from "../services/pages/pageDocumentV2";
import { pageResponsiveMediaBounds } from "../services/pages/pageResponsiveCss";
import {
  BRAND_STYLE_COMPARE_KEYS,
  GROUP_CARET_SELECTORS,
  LEVEL_DROPDOWN_ITEM_SELECTORS,
  LEVEL_LINK_SELECTORS,
  MENU_GROUP_CARET_CONTENT,
  menuDocScope,
  NAV_CHROME_COMPARE_KEYS,
  NAV_LEVEL_STYLE_COMPARE_KEYS,
  SITE_MENU_DOC_ATTRIBUTE,
  TOP_BAR_LINK_SELECTOR,
  deepEqualLevelStyles,
  resolveMenuAppearanceForDevice,
  shallowEqualChrome,
  shallowEqualLevel,
  shallowEqualStyle,
  desktopNavMinWidth,
  mobileMaxWidth,
  type MenuRuleSets,
  type ResolvedMenuAppearance,
} from "./menuDocumentCssCore";
import {
  accordionRules,
  brandIconDecls,
  brandImageDecls,
  brandStyleDecls,
  collectMenuBrandRules,
  collectMenuDividerRules,
  collectMenuVisibilityPlan,
  currentPageRule,
  dropdownRule,
  hideRule,
  menuBarExtra,
  menuBarExtraRules,
  menuBarScrolledRules,
  mobileModeRules,
  navChromeRules,
  navLevelRules,
  navNestingRules,
  submenuDirectionRules,
  submenuPlacementRule,
  MENU_RULE_GROUPS,
} from "./menuDocumentCssRules";

const collectBrandDeltaRules = (doc: MenuDocumentV2, device: MenuDeviceKind): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "brand") continue;
    const resolved = resolveMenuBrandStyleForDevice(block, device); // 504-01 export ({}-safe)
    if (shallowEqualStyle(resolved, block.props.style)) continue; // no diff ⇒ no rule
    const esc = escapeAuthoringCssString(block.id);
    const key = `${menuDocScope} [data-menu-block-id="${esc}"]`;
    const textDecls = brandStyleDecls(resolved);
    if (textDecls.length) rules.push(`${key}{${textDecls.join(";")}}`);
    const imgDecls = brandImageDecls(resolved);
    if (imgDecls.length) rules.push(`${key} img{${imgDecls.join(";")};width:auto}`);
    const iconDecls = brandIconDecls(resolved);
    if (iconDecls.length) rules.push(`${key} svg{${iconDecls.join(";")}}`);
  }
  return rules;
};

// ── TASK-542-02 exact neutralizer matrix ─────────────────────────────────────
// The positive-only re-emitters LEAVE desktop-emitted styling in place when a
// device turns a key OFF (or changes an axis): the desktop rule keeps applying
// inside the device branch — the media-query re-emit only ADDS, it never
// removes. Each neutralizer emits an explicit OFF/RESTORE reset — on the
// EXACT per-level selector (never the descendant base) — immediately BEFORE
// the device's positive re-emit, so the re-emit still wins source order where
// it re-sets the same property, and the reset wins where the re-emit stays
// silent. Runs ONLY after a verified diff ⇒ unchanged docs emit ZERO bytes.
// Link-level resets (indicator, underline) mirror the linkOnly all-width
// surface; container/structural resets (divider, caret, flyout) are ≥640-only.

const TOP_BAR_ITEM_SELECTOR = `${menuDocScope} .site-nav-list > .site-nav-item:not(:last-child)`;
const MENU_FLYOUT_TARGETS: Record<1 | 2, { sub: string; openParent: string }> = {
  1: {
    sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist`,
    openParent: `${menuDocScope} .site-nav-list > .site-nav-item`,
  },
  2: {
    sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
    openParent: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > .site-nav-item`,
  },
};

const levelNeutralizerRules = (
  previous: NavLevelStyle | NavChromeStyle | undefined,
  next: NavLevelStyle | NavChromeStyle | undefined,
  level: 0 | 1 | 2,
  linkOnly: boolean
): string[] => {
  const out: string[] = [];
  const sel = level === 0 ? TOP_BAR_LINK_SELECTOR : LEVEL_LINK_SELECTORS[level];
  // Matrix #3: indicator → none after a visible bar/lift — `content:none` kills
  // the glyph AND the stale transition/transform/opacity that the desktop bar
  // left behind on the ::before.
  if (previous?.indicator != null && previous.indicator !== "none" && next?.indicator === "none") {
    out.push(`${sel}::before{content:none;opacity:1;transform:none;transition:none}`);
  }
  // Matrix #4: hoverUnderline → false after true — kill the desktop underline
  // (the re-emit would otherwise stay silent and the hover rule would persist).
  if (previous?.hoverUnderline === true && next?.hoverUnderline === false) {
    out.push(`${sel}:hover,${sel}:focus-visible{text-decoration:none}`);
  }
  if (linkOnly) return out; // container/structural chrome is ≥640-only
  // Matrix #1: itemDividerShow → false after true. Level 0 clears BOTH axes (the
  // top-bar divider axis depends on orientation); levels 1/2 clear the dropdown
  // separator (border-block-end) on the exact per-level item selector.
  if (previous?.itemDividerShow === true && next?.itemDividerShow === false) {
    if (level === 0)
      out.push(`${TOP_BAR_ITEM_SELECTOR}{border-inline-end:none;border-block-end:none}`);
    else out.push(`${LEVEL_DROPDOWN_ITEM_SELECTORS[level]}{border-block-end:none}`);
  }
  // Matrix #5: showCaret → true after false — restore the canonical glyph with
  // the SHARED literal so the re-emit is byte-identical to navNestingRules.
  if (previous?.showCaret === false && next?.showCaret === true) {
    out.push(
      `${GROUP_CARET_SELECTORS[level]}::after{content:"${MENU_GROUP_CARET_CONTENT}";font-size:.7em}`
    );
  }
  // Matrix #6: caretRotateOnOpen → false after true — neutralize the desktop
  // rest transform/transition AND the hover rotate (caretRotateRule's pair).
  if (previous?.caretRotateOnOpen === true && next?.caretRotateOnOpen === false) {
    const caret = GROUP_CARET_SELECTORS[level];
    const g = caret.replace(" > .site-nav-link", "");
    out.push(`${caret}::after{transform:none;transition:none}`);
    out.push(
      `${g}:hover > .site-nav-link::after,${g}:focus-within > .site-nav-link::after{transform:none}`
    );
  }
  // Matrix #7: flyoutAnimation → none after a non-none reveal — restore the base
  // display:none→grid zero-JS reveal (the desktop flyout REST forced
  // display:grid;visibility:hidden which would otherwise reserve space forever).
  if (
    level !== 0 &&
    previous != null &&
    "flyoutAnimation" in previous &&
    previous.flyoutAnimation != null &&
    previous.flyoutAnimation !== "none" &&
    next != null &&
    "flyoutAnimation" in next &&
    next.flyoutAnimation === "none"
  ) {
    const { sub, openParent } = MENU_FLYOUT_TARGETS[level as 1 | 2];
    out.push(`${sub}{display:none;visibility:visible;opacity:1;transform:none;transition:none}`);
    out.push(
      `${openParent}:hover > .site-nav-sublist,${openParent}:focus-within > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none;transition:none}`
    );
  }
  return out;
};

// Matrix #2: bar orientation flip — the top-bar divider axis depends on
// orientation, so a device that flips the bar leaves the desktop's OLD-axis
// border behind. Clear BOTH axes here; the positive re-emit (navChromeRules
// with the NEW orientation) paints the correct axis after it. ≥640-only (the
// divider is never emitted below 640).
const orientationNeutralizerRule = (
  previous: MenuAppearanceOrientation,
  next: MenuAppearanceOrientation
): string[] =>
  previous === next
    ? []
    : [`${TOP_BAR_ITEM_SELECTOR}{border-inline-end:none;border-block-end:none}`];

/** Level device deltas: TOTAL re-emit of `navLevelRules` on the device-resolved
 *  `levelStyles`, but ONLY when it DIFFERS from desktop (later source order
 *  wins). The cascade is the ONE authoritative resolver — no local merge clone. */
const collectLevelDeltaRules = (doc: MenuDocumentV2, device: MenuDeviceKind): string[] => {
  const section = doc.sections[0];
  if (!section) return [];
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return [];
  const resolved = resolveMenuSectionAppearanceForDevice(section, device).navProps.levelStyles;
  const base = navBlock.props.levelStyles;
  if (deepEqualLevelStyles(resolved, base)) return []; // no diff
  // TASK-508 R3b: recompute the accordion gate from the base doc (submenuMode is
  // base-only — no per-device delta) so the tablet re-emit (linkOnly:false, which
  // fires flyoutAnimRule) ALSO skips flyout when accordion — else a per-device tablet
  // flyoutAnimation on a level would emit its display:grid;visibility:hidden rest and
  // leave the accordion sublist reserving space but invisible on tablet.
  const accordion = navBlock.props.navChrome?.submenuMode === "accordion";
  // Mobile (<640) is inline ⇒ container chrome is ≥640-only (see navLevelRules):
  // a mobile-specific level delta re-emits ONLY link typography + state, never
  // the container, so a per-device container override cannot leak onto the
  // inline nested list. Tablet (≥640) keeps the full container chrome.
  const linkOnly = device === "mobile";
  // TASK-542-02 matrix: neutralize OFF/axis flips BEFORE the positive re-emit
  // (per-level + the #8 depth pass — the level-1 DESKTOP link styles reach
  // level-2 links via the descendant-anchored selectors, so a level-2 DEVICE
  // OFF must reset on the EXACT level-2 selector, never the base). The depth
  // pass fires only when level-2 itself CHANGED at the device ("L2 OFF after
  // L1 ON"): an unchanged level-2 must keep the desktop L1 cascade untouched
  // (tablet inherits desktop) — emitting a reset there would fork tablet from
  // desktop with no device-authored intent.
  const level2Changed = !shallowEqualLevel(resolved?.[2] ?? {}, base?.[2] ?? {});
  const neutralizers = [
    ...levelNeutralizerRules(base?.[1], resolved?.[1], 1, linkOnly),
    ...levelNeutralizerRules(base?.[2], resolved?.[2], 2, linkOnly),
    ...(!linkOnly && level2Changed
      ? levelNeutralizerRules(base?.[1], resolved?.[2], 2, false)
      : []),
  ];
  return [
    ...new Set([
      ...neutralizers,
      ...navLevelRules(resolved, { linkOnly, skipFlyoutAnim: accordion }),
    ]),
  ];
};

// --- TASK-506-02 level-0 navChrome emission + per-device delta --------------
// 506-02 is the sole writer of this navChrome compare list (mirrors
// NAV_LEVEL_STYLE_COMPARE_KEYS; 506-01 supplies the key set). navChrome has NO
// flyoutAnimation / submenuPlacement (both are levels-≥1 NavLevelStyle fields).
const collectChromeDeltaRules = (doc: MenuDocumentV2, device: MenuDeviceKind): string[] => {
  const section = doc.sections[0];
  if (!section) return [];
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return [];
  const resolved = resolveMenuNavChrome(section, device); // 506-01 export ({}-safe)
  const baseChrome = navBlock.props.navChrome;
  const linkOnly = device === "mobile";
  const orientation = resolveMenuAppearanceForDevice(doc, device).orientation;
  const baseOrientation = resolveMenuAppearanceForDevice(doc, "desktop").orientation;
  const chromeChanged = !shallowEqualChrome(resolved, baseChrome);
  // TASK-542-02 matrix #2: an orientation flip changes the top-bar divider AXIS
  // even when the chrome record itself is unchanged — gate on it too. ≥640-only
  // (the divider is never emitted below 640; mobile inherits the desktop link
  // surface via the mobileRules base re-emit, so an orientation-only mobile
  // change needs no delta).
  const orientationChanged = baseOrientation !== orientation;
  if (!chromeChanged && !(orientationChanged && !linkOnly)) return []; // no diff
  const neutralizers = [
    ...(orientationChanged && !linkOnly
      ? orientationNeutralizerRule(baseOrientation, orientation)
      : []),
    ...levelNeutralizerRules(baseChrome, resolved, 0, linkOnly),
  ];
  return [...neutralizers, ...navChromeRules(resolved, orientation, { linkOnly })];
};

/**
 * B5 standalone tablet delta. `submenuPlacement` is in NAV_LEVEL_STYLE_COMPARE_KEYS
 * (so `deepEqualLevelStyles` sees the diff), but its BASE rule
 * (`submenuPlacementRule`) lives OUTSIDE `navLevelRules`, so `collectLevelDeltaRules`
 * re-emits IDENTICAL level-2 link/container rules and NO placement rewrite. This
 * standalone emitter closes that gap: gate on a real level-2 placement diff so an
 * unchanged doc emits ZERO bytes. NEVER mobile (nested flyout is ≥640-only).
 */
const submenuPlacementDeltaRule = (doc: MenuDocumentV2, device: "tablet"): string | null => {
  const section = doc.sections[0];
  if (!section) return null;
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return null;
  const resolvedL2 = resolveMenuSectionAppearanceForDevice(section, device).navProps
    .levelStyles?.[2];
  const baseL2 = navBlock.props.levelStyles?.[2];
  if ((resolvedL2?.submenuPlacement ?? null) === (baseL2?.submenuPlacement ?? null)) return null;
  return submenuPlacementRule(resolvedL2);
};

/**
 * Fixed nesting block for 502-03's recursive markup (`li.site-nav-item` with
 * its own link/label + a DIRECT-child `ul.site-nav-sublist` per level; NO
 * `<details>` in the menu-document path). Emitted ONLY in the shared >=640
 * branch — desktop AND tablet; mobile (<640) never sees these rules, so all
 * levels stay inline-visible there, indented by the base sheet's per-class
 * cumulative `padding-left:16px` (`siteShellCss.ts:171`). DOC-SCOPED ONLY —
 * the frozen base sheet emits NO `.site-nav-sublist .site-nav-sublist` rule.
 *
 * SAME-COMMIT with 502-03's hover markup (Coordination): against today's
 * `<details class="site-nav-group">` structure the open rules match nothing
 * while the hide-by-default still applies — NO transitional rule is emitted.
 */
const collectMenuBarExtraDeltaRules = (
  doc: MenuDocumentV2,
  device: Exclude<MenuDeviceKind, "desktop">
): string[] => {
  const desktopLayout = menuBarExtra(doc, "desktop");
  const deviceLayout = menuBarExtra(doc, device);
  const desktopExtra = menuBarExtraRules(desktopLayout);
  const deviceExtra = menuBarExtraRules(deviceLayout);
  const desktopScrolled = menuBarScrolledRules(desktopLayout);
  const deviceScrolled = menuBarScrolledRules(deviceLayout);
  const out: string[] = [];
  if (deviceExtra.join("") !== desktopExtra.join("")) out.push(...deviceExtra);
  if (deviceScrolled.join("") !== desktopScrolled.join("")) out.push(...deviceScrolled);
  return out;
};

/** TOTAL group deltas for a resolved appearance vs the DESKTOP base (tablet OR mobile). */
const collectDeltaRules = (
  resolved: ResolvedMenuAppearance,
  base: ResolvedMenuAppearance
): string[] =>
  // Diff on RESOLVED values, not on override presence: an override equal to
  // the base (legal — no auto-remove-on-equality) emits nothing.
  MENU_RULE_GROUPS.filter((group) =>
    group.fields.some((field) => resolved[field] !== base[field])
  ).map((group) => group.delta(resolved));

const buildMenuRuleSetsForDocument = (doc: MenuDocumentV2): MenuRuleSets => {
  const base = resolveMenuAppearanceForDevice(doc, "desktop");
  const tabletResolved = resolveMenuAppearanceForDevice(doc, "tablet");
  const mobileResolved = resolveMenuAppearanceForDevice(doc, "mobile");
  // DESKTOP-base level styles (nested — read directly off the first nav-items
  // block, NOT the flat MenuAppearance). Present-only ⇒ undefined when unset.
  const navBlock = doc.sections[0]?.blocks.find((block) => block.type === "nav-items");
  const baseLevelStyles: NavLevelStyles | undefined =
    navBlock?.type === "nav-items" ? navBlock.props.levelStyles : undefined;
  // DESKTOP-base level-0 chrome (TASK-506, Option B). Present-only ⇒ undefined.
  const baseNavChrome: NavChromeStyle | undefined =
    navBlock?.type === "nav-items" ? navBlock.props.navChrome : undefined;
  // Byte-identical to the pre-501 base emission for every document, plus the
  // per-divider context rules, the present-only brand rules, and the present-only
  // current-page tint (all device-independent, all ZERO bytes when unauthored).
  const baseRules = [
    ...MENU_RULE_GROUPS.map((group) => group.base(base)).filter(
      (rule): rule is string => rule !== null
    ),
    ...collectMenuDividerRules(doc),
    ...collectMenuBrandRules(doc), // §1 brand — device-independent; per-device via §5
    ...currentPageRule(base), // §4 current-page tint (present-only)
    // TASK-520-02: menu-bar radius + custom-shadow (AFTER the header-frame group ⇒
    // `shadowCustom` overrides the enum `shadow`) then the [data-scrolled] variants.
    // Present-only ⇒ ZERO bytes for a doc with no extra bar keys (byte-identity).
    ...menuBarExtraRules(menuBarExtra(doc, "desktop")),
    ...menuBarScrolledRules(menuBarExtra(doc, "desktop")),
  ];
  // Shared >=640 rules (desktop AND tablet): dropdownRule reads the BASE
  // (device-defining), nesting rules are structural. Level chrome/link BASE folds
  // in AFTER nesting so it beats the structural `.site-nav-sublist` rules + base
  // sheet chrome on source order.
  const basePlacement = submenuPlacementRule(baseLevelStyles?.[2]); // TASK-506 B5
  // TASK-508 R3b: accordion gate (recomputed in collectLevelDeltaRules for the tablet
  // seam too — see there). Gates flyoutAnimRule OFF in BOTH the desktopShared AND the
  // tablet-delta re-emit paths (flyoutAnimation IS per-device forkable @NAV_LEVEL_STYLE_
  // COMPARE_KEYS, so gating only desktopShared would leave a tablet-delta gap).
  const accordion = baseNavChrome?.submenuMode === "accordion";
  const desktopShared = [
    dropdownRule(base),
    ...navNestingRules(base),
    ...navLevelRules(baseLevelStyles, { skipFlyoutAnim: accordion }), // §2 level base + TASK-506 B1/B2/B3/B4 levels 1/2 (R3b gates flyout)
    // TASK-506 level-0 chrome (B1 divider / B2 indicator / B3 caret / B4 pill).
    ...navChromeRules(baseNavChrome, base.orientation),
    // TASK-508 R3a: nav-global direction — AFTER the legacy axes so it supersedes
    // them, BEFORE B5 so a granular level-2 submenuPlacement still wins (emitted last).
    ...submenuDirectionRules(baseNavChrome),
    // TASK-508 R3b: accordion in-flow block — position:static wins + neutralizes offsets.
    ...accordionRules(baseNavChrome),
    // TASK-506 B5 nested placement — LEVEL-2 only, on the anchored (0,5,0) sel.
    ...(basePlacement ? [basePlacement] : []),
  ];
  const tabletPlacement = submenuPlacementDeltaRule(doc, "tablet"); // TASK-506 B5 carve-out
  const tabletDelta = [
    ...collectDeltaRules(tabletResolved, base), // scalar deltas (incl. §3 box, §4 hover-text)
    ...collectBrandDeltaRules(doc, "tablet"), // §5 brand delta
    ...collectLevelDeltaRules(doc, "tablet"), // §5 level delta (+ TASK-506 B1/B2/B3/B4)
    ...collectChromeDeltaRules(doc, "tablet"), // TASK-506 level-0 chrome delta
    // B5: standalone level-2 placement delta — NOT carried by collectLevelDeltaRules
    // (its base rule is outside navLevelRules), so re-emit here (gated on a diff).
    ...(tabletPlacement ? [tabletPlacement] : []),
    // TASK-520-02: per-device menu-bar extra/scrolled delta (AFTER the frame delta).
    ...collectMenuBarExtraDeltaRules(doc, "tablet"),
  ];
  const mobileRules = [
    ...mobileModeRules(mobileResolved), // FIRST — overrides win source order after it
    ...collectDeltaRules(mobileResolved, base), // mobile diffs vs DESKTOP (ignores tablet)
    ...collectBrandDeltaRules(doc, "mobile"), // §5 brand delta
    // Desktop-BASE level LINK typography must reach the inline <640 view too
    // ('mobile inherits desktop' HARD-INVARIANT): the mobile front branch does
    // NOT spread desktopShared, so re-emit the base level LINK rules here.
    // `linkOnly` OMITS the submenu CONTAINER chrome — that is ≥640-only (folded
    // into desktopShared per the parent contract); re-emitting it here would
    // leak background/border/min-width onto the inline nested list (the base
    // sheet strips that chrome at <640). Present-only ⇒ ZERO bytes when unset
    // (no-override byte-identity holds).
    ...navLevelRules(baseLevelStyles, { linkOnly: true }),
    ...collectLevelDeltaRules(doc, "mobile"), // §5 mobile-specific level override on top
    // TASK-506 level-0 chrome: base LINK B2 bits must reach the inline <640 view
    // (mobile inherits desktop); pill/divider/caret are ≥640-only ⇒ linkOnly.
    ...navChromeRules(baseNavChrome, base.orientation, { linkOnly: true }),
    ...collectChromeDeltaRules(doc, "mobile"), // mobile-specific chrome override (linkOnly)
    // TASK-520-02: per-device menu-bar extra/scrolled delta (AFTER the frame delta).
    ...collectMenuBarExtraDeltaRules(doc, "mobile"),
  ];
  // Canvas-only sim-open: the front's [open] disclosure rule (same declarations
  // as mobileModeRules :267) so the Mobile canvas previews the OPENED list.
  const previewMobileOpen =
    mobileResolved.mobileMode === "disclosure"
      ? [
          `${menuDocScope} .site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`,
        ]
      : [];
  return {
    base: baseRules,
    desktopShared,
    tabletDelta,
    mobile: mobileRules,
    previewMobileOpen,
    hide: collectMenuVisibilityPlan(doc),
  };
};

/**
 * FRONT builder: viewport-media responsive scoped sheet for a published menu
 * document. Mobile disclosure collapses via `@media`, exactly like
 * `buildSiteShellCss`. Branch layout (Pages-exact cascade — tablet AND mobile
 * each diff vs DESKTOP):
 * - shared `min-width:640` — `desktopShared` (dropdown + nesting) + hides for
 *   blocks hidden on desktop AND tablet (pre-502 position, byte-stable);
 * - NEW `min-width:1024` — hides for blocks hidden on desktop but VISIBLE on
 *   tablet (only emitted when such a divergence exists);
 * - NEW bounded `640–1023` tablet `@media` — tablet deltas + tablet-only hides
 *   (only emitted when non-empty, so no-tablet-override docs gain no branch);
 * - `max-width:639` mobile — mobileMode + mobile deltas + mobile hides.
 */
export function buildMenuDocumentCss(doc: MenuDocumentV2): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const desktopOnly = sets.hide.hideDesktopOnly.map(hideRule);
  const tabletBranch = [...sets.tabletDelta, ...sets.hide.hideTabletOnly.map(hideRule)];
  return [
    ...sets.base,
    `@media (min-width: ${desktopNavMinWidth}px){`,
    ...sets.desktopShared,
    ...sets.hide.hideShared.map(hideRule), // hides LAST (501 convention)
    `}`,
    ...(desktopOnly.length
      ? [
          `@media (min-width: ${pageResponsiveMediaBounds.tablet.maxWidth + 1}px){`,
          ...desktopOnly,
          `}`,
        ]
      : []),
    ...(tabletBranch.length
      ? [
          `@media (min-width: ${pageResponsiveMediaBounds.tablet.minWidth}px) and (max-width: ${pageResponsiveMediaBounds.tablet.maxWidth}px){`,
          ...tabletBranch,
          `}`,
        ]
      : []),
    `@media (max-width: ${mobileMaxWidth}px){`,
    ...sets.mobile,
    ...sets.hide.hideMobile.map(hideRule),
    `}`,
  ].join("\n");
}

/**
 * ADMIN-CANVAS structural baseline. On the FRONT the published header carries
 * BOTH scopes: the base site-shell sheet (`[data-site-header]`,
 * `buildSiteShellCss` — which owns the STRUCTURAL nav rules like
 * `.site-nav-list{display:flex}`) plus this module's scoped overrides. The
 * Design canvas injects ONLY the document sheet, so without a structural
 * baseline the nav `<ul>` falls back to `display:block` and the items stack
 * VERTICALLY (canvas-only fidelity bug — the front renders horizontally).
 * These rules mirror the base sheet's structure-only declarations (no colors /
 * appearance — those come from the document rules, emitted AFTER, which win).
 */
const buildCanvasStructuralBaseline = (device: PageBreakpoint): string[] => {
  const header = menuDocScope;
  const base = [
    `${header} .site-header-brand{font-weight:600;color:inherit;text-decoration:none}`,
    `${header} .site-nav summary{cursor:pointer;list-style:none}`,
    `${header} .site-nav summary::-webkit-details-marker{display:none}`,
    `${header} .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;list-style:none;margin:0;padding:0}`,
    `${header} .site-nav-item{position:relative}`,
    `${header} .site-nav-link{display:block;padding:8px 12px;border-radius:6px;text-decoration:none}`,
    `${header} .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px}`,
    `${header} .site-nav-group>summary::after{content:" \\25BE";font-size:.7em}`,
    `${header} .site-nav-sublist{list-style:none;margin:0;padding:6px;display:grid;gap:2px;min-width:180px}`,
    `${header} .site-nav-disclosure{display:none}`,
    `${header} .site-nav-disclosure>summary{padding:8px 12px;border:1px solid rgba(15,23,42,.16);border-radius:6px}`,
  ];
  const desktop = [
    `${header} .site-nav-sublist{position:absolute;left:0;z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}`,
  ];
  const mobile = [
    `${header} .site-nav{width:100%}`,
    `${header} .site-nav-sublist{padding-left:16px}`,
  ];
  return device === "mobile" ? [...base, ...mobile] : [...base, ...desktop];
};

/**
 * Canvas-only force-open for the selected nav level (TASK-504-02 §6). Sublists
 * are `display:none` until `:hover`/`:focus-within` (`navNestingRules`), and a
 * level-2 sublist nests INSIDE a level-1 sublist that is itself closed — so the
 * whole ancestor chain (levels 1..N) is opened CUMULATIVELY, not just depth N.
 * Emitted LAST by the preview builder so it wins the closed `display:none`.
 */
const previewForceOpenLevel = (level: NavLevelStyleLevel): string[] => {
  // TASK-506 B3 + TASK-508 R2: force-open ALSO neutralizes the flyoutAnimation closed
  // rest state (`visibility:hidden;opacity:0`/transform) so the animated flyout is
  // VISIBLE on the canvas, not open-but-invisible. Each neutralize rule MATCHES its
  // rest rule's specificity so it ties + wins on source order (emitted LAST).
  const rules = [
    `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`,
  ];
  if (level >= 2) {
    // ANCHORED (0,5,0) — MUST match flyoutAnimRule(2)'s nested hidden selector; the
    // short (0,3,0) `.site-nav-sublist .site-nav-sublist` would LOSE to it regardless
    // of order, leaving a level-2 flyoutAnimation flyout open-but-invisible.
    rules.push(
      `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`
    );
  }
  return rules;
};

/**
 * ADMIN-CANVAS builder: device-forced scoped sheet. The Design canvas constrains
 * the frame width per the selected `DeviceSwitcher` breakpoint, but `@media`
 * queries respond to the real admin viewport, so the responsive branch is
 * flattened (emitted unwrapped) for the requested device. TASK-502-02: the
 * tablet⇒desktop mapping is GONE — tablet gets a REAL device-forced branch
 * (`desktopShared` + `tabletDelta`). NO visibility hide rules are emitted in
 * ANY forced branch: `hideRule` targets the `[data-menu-block-id]` stamp the
 * editor also paints, so a preview `display:none` would kill the 502-04
 * dimmed selectable ghost — canvas visibility is the ghost gate's job. The
 * mobile branch additionally appends a canvas-only disclosure sim-open so the
 * Mobile canvas previews the nav list under the default `mobileMode`.
 * Consumed ONLY by the admin canvas preview (TASK-499-03); the front uses the
 * viewport variant above. Prepends the structural baseline that the front gets
 * from the base site-shell sheet — document rules follow, so they win.
 */
export function buildMenuDocumentPreviewCss(
  doc: MenuDocumentV2,
  device: PageBreakpoint,
  forceOpenLevel?: NavLevelStyleLevel
): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const branch =
    device === "mobile"
      ? [...sets.mobile, ...sets.previewMobileOpen] // sim-open LAST — wins the closed display:none
      : device === "tablet"
        ? [...sets.desktopShared, ...sets.tabletDelta] // REAL tablet branch (was: desktop map)
        : sets.desktopShared;
  // Canvas-only: when the editor selects a level >= 1, force the whole ancestor
  // chain (levels 1..N) open so the author SEES the styled depth. Emitted LAST so
  // it beats navNestingRules' closed `display:none` on source order. Precedent =
  // previewMobileOpen. `undefined` ⇒ zero extra bytes (preview byte-identical).
  const forceOpen = forceOpenLevel ? previewForceOpenLevel(forceOpenLevel) : [];
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch, ...forceOpen].join(
    "\n"
  );
}
