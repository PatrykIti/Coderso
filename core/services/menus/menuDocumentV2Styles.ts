/**
 * menuDocumentV2Styles — style-record normalizers of the menu document
 * (TASK-542-03-L03 split from menuDocumentV2Fields): brand/nav-level/
 * nav-chrome style records, brand props, utility props, page-leaf bridge,
 * the local clamp tables + enum option arrays, and the shared numeric/
 * enum helpers. Bun-free, import-side-effect free (Vitest lane).
 */
import { sanitizeAuthoringLinkHref } from "../pages/pageAuthoringSanitizers";
import {
  createPageSectionV2,
  isPageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageBlockStyleV2,
  type PageBlockV2,
  type PageBlockVisibilityV2,
} from "../pages/pageDocumentV2";
import {
  menuAppearanceFontWeights,
  menuAppearanceNumberRanges,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  normalizeMenuColorValue,
} from "./normalizeMenuAppearance";
import {
  MenuDocumentError,
  type BrandProps,
  type BrandStyle,
  type MenuUtilityProps,
  type NavChromeStyle,
  type NavLevelStyle,
  type NavLevelStyleLevel,
  type NavLevelStyles,
} from "./menuDocumentV2Schema";

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const MENU_BRAND_TEXT_MAX_LENGTH = 120 as const;

// CONSCIOUS key-list extension (fail-closed read trap: BRAND_PROP_KEYS gates
// BOTH write and stored read; forgetting a key would degrade every saved doc
// carrying that member to empty on read — asserted in tests). "style" added by
// TASK-504-01 — a forgotten "style" degrades every brand-styled doc to empty.
// TASK-520-01-L03: "icon"/"showText" added (fail-closed read trap — a forgotten
// key degrades every icon/combo doc to empty on read; round-trip test asserts it).
const BRAND_PROP_KEYS = ["mode", "href", "image", "text", "icon", "showText", "style"] as const;

// --- TASK-504-01 brand style + per-level style normalizers ------------------

const BRAND_STYLE_KEYS = [
  "fontSize",
  "fontWeight",
  "color",
  "textTransform",
  "letterSpacing",
  "height",
  "maxWidth",
  // TASK-520-01-L03 icon mode:
  "iconColor",
  "iconSize",
] as const;

// reject-unknown OUTER level keys (RAW string keys off Object.keys — the wire form):
const NAV_LEVEL_KEYS = ["1", "2"] as const;
// NUMERIC iteration/assignment (NavLevelStyleLevel):
export const NAV_LEVEL_STYLE_LEVELS = [1, 2] as const satisfies readonly NavLevelStyleLevel[];
const NAV_LEVEL_STYLE_KEYS = [
  "linkColor",
  "linkHoverColor",
  "linkHoverTextColor",
  "linkActiveColor",
  "fontSize",
  "fontWeight",
  "gap",
  "paddingX",
  "paddingY",
  "background",
  "borderColor",
  "borderWidth",
  "radius",
  "shadow",
  "minWidth",
  // TASK-506 modern fields (each MUST also land in exactly one value partition
  // below — a key here handled by no branch is silently DROPPED):
  "itemDividerShow",
  "itemDividerColor",
  "itemDividerWidth",
  "itemDividerStyle",
  "indicator",
  "indicatorColor",
  "indicatorThickness",
  "indicatorGrow",
  "hoverUnderline",
  "transitionMs",
  "hoverLift",
  "showCaret",
  "caretRotateOnOpen",
  "flyoutAnimation",
  "containerPaddingX",
  "containerPaddingY",
  "submenuPlacement",
  // TASK-508-01 R1(b) (value partition: NAV_LEVEL_STYLE_ENUM_FIELDS):
  "linkAlign",
] as const;

// NEW LOCAL clamp tables (NOT added to menuAppearanceNumberRanges): (a) brand
// "fontSize" COLLIDES (appearance 10..32 vs brand 10..48); (b) letterSpacing/
// height/maxWidth/minWidth/radius are not appearance concepts. Both EXPORTED for
// the 504-04 editor slider bounds.
export const BRAND_STYLE_NUMBER_RANGES = {
  fontSize: { min: 10, max: 48 },
  letterSpacing: { min: -2, max: 8 }, // NEGATIVE min — the reason it can't reuse the shared table
  height: { min: 16, max: 120 },
  maxWidth: { min: 40, max: 400 },
  iconSize: { min: 12, max: 64 }, // TASK-520-01-L03 icon mode
} as const;

export const NAV_LEVEL_NUMBER_RANGES = {
  fontSize: { min: 10, max: 32 },
  gap: { min: 0, max: 32 },
  paddingX: { min: 0, max: 40 },
  paddingY: { min: 0, max: 32 },
  borderWidth: { min: 0, max: 8 },
  radius: { min: 0, max: 32 },
  minWidth: { min: 80, max: 480 },
  // TASK-506 modern numeric fields (levels 1/2 + level-0 navChrome share bounds):
  itemDividerWidth: { min: 1, max: 8 }, // B1
  indicatorThickness: { min: 1, max: 6 }, // B2
  transitionMs: { min: 0, max: 400 }, // B2
  hoverLift: { min: 0, max: 8 }, // B2
  containerPaddingX: { min: 0, max: 40 }, // B4 (levels >= 1)
  containerPaddingY: { min: 0, max: 32 }, // B4 (levels >= 1)
} as const;

// TASK-506 fresh local enum option arrays (mirror menuAppearanceFontWeights usage).
const ITEM_DIVIDER_STYLES = ["solid", "dashed", "dotted"] as const;
const NAV_INDICATOR_KINDS = ["none", "underline", "overline"] as const;
const FLYOUT_ANIMATIONS = ["none", "fade", "slide"] as const;
const SUBMENU_PLACEMENTS = ["right", "bottom", "left"] as const;
// TASK-508-01 fresh enum option arrays (mirror SUBMENU_PLACEMENTS above).
const NAV_LINK_ALIGNS = ["left", "center", "right"] as const; // R1(b) NavLevelStyle.linkAlign
const SUBMENU_DIRECTIONS = ["right", "down", "up", "left"] as const; // R3a navChrome.submenuDirection
const SUBMENU_MODES = ["flyout", "accordion"] as const; // R3b navChrome.submenuMode

// TASK-506 level-0 pill ranges (navChrome-only keys) + the level-0 variants of the
// shared numeric fields (same bounds as the level table above).
export const NAV_CHROME_NUMBER_RANGES = {
  navPillRadius: { min: 0, max: 40 },
  navPillPaddingX: { min: 0, max: 40 },
  navPillPaddingY: { min: 0, max: 32 },
  itemDividerWidth: { min: 1, max: 8 },
  indicatorThickness: { min: 1, max: 6 },
  transitionMs: { min: 0, max: 400 },
  hoverLift: { min: 0, max: 8 },
} as const;

/**
 * TASK-506 F2 modern-fields effective defaults. The single non-hardcoded source
 * for the enum/bool B1–B5 fields' resolved-default hint (`resolveMenuControlDefault`
 * reads it; 506-02 mirrors it for present-only CSS emission; 506-04's
 * `ControlDefaultHint` imports it). These mirror today's implicit CSS behaviour
 * (caret always-on, nested flyout flies right, pure display toggle). NOTE:
 * `flyoutAnimation` is a levels-1/2 NavLevelStyle field (never a navChrome key)
 * but its effective-default VALUE lives here for the level-1/2 hint, exactly like
 * the level-2-only `submenuPlacement`. The GATED present-only NUMERICS are
 * DELIBERATELY absent (unset ⇒ no element ⇒ no meaningful resolved number). */
export const NAV_CHROME_DEFAULTS = {
  submenuPlacement: "right",
  indicator: "none",
  flyoutAnimation: "none",
  showCaret: true,
  caretRotateOnOpen: false,
  indicatorGrow: false,
  hoverUnderline: false,
  itemDividerShow: false,
  itemDividerStyle: "solid",
  // TASK-508-01 HINT-ONLY entries (NAV_CHROME_DEFAULTS is the level-agnostic hint
  // provider, NOT chrome-only — resolveNavKeyThemeDefault's hasOwnProperty branch
  // serves levels 1/2 too). NEVER read by CSS emission ⇒ byte-safe / present-only.
  linkAlign: "left", // R1(b) level-1/2 dropdown link align hint (Default (Left))
  submenuDirection: "down", // R3a recommended unified direction hint (Default (Down))
  submenuMode: "flyout", // R3b default mode hint (Default (Flyout))
} as const;

/** Editor slider-bound convenience alias for the LEVEL-0 nav-link scalars
 *  (control-facing keys `paddingX`/`paddingY`/`radius`, re-mapped from the shared
 *  `menuAppearanceNumberRanges`). Bounds only — the level-0 WRITE target is still
 *  the `linkPaddingX`/`linkPaddingY`/`linkRadius` scalar; this alias is never a
 *  write key. Exported for 504-04. */
export const NAV_LINK_NUMBER_RANGES = {
  paddingX: menuAppearanceNumberRanges.linkPaddingX,
  paddingY: menuAppearanceNumberRanges.linkPaddingY,
  radius: menuAppearanceNumberRanges.linkRadius,
} as const;

/** Local clamp (table-agnostic mirror of clampMenuAppearanceNumber). Returns null
 *  for non-finite ⇒ caller OMITS the key (sparse fail-soft value policy). */
export const clampLocalNumber = (
  range: { min: number; max: number },
  value: unknown
): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(range.max, Math.max(range.min, Math.round(value)))
    : null;

export const normalizeEnumLocal = <T>(options: readonly T[], value: unknown): T | null =>
  options.includes(value as T) ? (value as T) : null;

// --- TASK-520-01-L02: custom box-shadow value validator (security-critical) ---
//
// `shadowCustom`/`shadowCustomScrolled` are attacker-influenceable free-text CSS
// values that 520-02 emits into a `<style>`/inline declaration on the PUBLIC
const BRAND_ICON_NAME_PATTERN = /^[a-z0-9-]{1,64}$/;
const normalizeBrandIconName = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const n = value.trim().toLowerCase();
  return BRAND_ICON_NAME_PATTERN.test(n) ? n : undefined;
};

/**
 * VALUE-handling policy (CONSCIOUS): KEYS reject-unknown (throw
 * MenuDocumentError), but VALUES fail-soft (a bad color/number/enum is OMITTED,
 * NOT thrown — mirrors normalizeMenuColorValue's null-drop). This intentionally
 * differs from the flat normalizeAppearanceSubset (which throws on bad scalar
 * values); asserted by tests so it can never regress silently.
 */
export const normalizeBrandStyle = (value: unknown, path: string): BrandStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path); // structural throw
  for (const key of Object.keys(value)) {
    // reject-unknown KEYS
    if (!(BRAND_STYLE_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const out: BrandStyle = {};
  const num = (k: keyof typeof BRAND_STYLE_NUMBER_RANGES) => {
    const v = clampLocalNumber(BRAND_STYLE_NUMBER_RANGES[k], value[k]);
    if (v !== null) out[k] = v; // value fail-soft omit
  };
  if (value.fontSize !== undefined && value.fontSize !== null) num("fontSize");
  if (value.letterSpacing !== undefined && value.letterSpacing !== null) num("letterSpacing");
  if (value.height !== undefined && value.height !== null) num("height");
  if (value.maxWidth !== undefined && value.maxWidth !== null) num("maxWidth");
  if (value.iconSize !== undefined && value.iconSize !== null) num("iconSize"); // TASK-520-01-L03
  if (value.fontWeight !== undefined && value.fontWeight !== null) {
    const w = normalizeEnumLocal(menuAppearanceFontWeights, value.fontWeight);
    if (w !== null) out.fontWeight = w;
  }
  if (value.textTransform !== undefined && value.textTransform !== null) {
    const t = normalizeEnumLocal(menuAppearanceTextTransforms, value.textTransform);
    if (t !== null) out.textTransform = t;
  }
  if (value.color !== undefined && value.color !== null) {
    const c = normalizeMenuColorValue(value.color);
    if (c !== null) out.color = c;
  }
  if (value.iconColor !== undefined && value.iconColor !== null) {
    // TASK-520-01-L03 icon mode color (alpha OK via the shared color whitelist).
    const c = normalizeMenuColorValue(value.iconColor);
    if (c !== null) out.iconColor = c;
  }
  return Object.keys(out).length > 0 ? out : undefined; // PRUNE empty ⇒ omit member
};

const NAV_LEVEL_STYLE_COLOR_KEYS = [
  "linkColor",
  "linkHoverColor",
  "linkHoverTextColor",
  "linkActiveColor",
  "background",
  "borderColor",
  // TASK-506:
  "itemDividerColor",
  "indicatorColor",
] as const;
const NAV_LEVEL_STYLE_NUMBER_KEYS = [
  "fontSize",
  "gap",
  "paddingX",
  "paddingY",
  "borderWidth",
  "radius",
  "minWidth",
  // TASK-506 (bounds in NAV_LEVEL_NUMBER_RANGES):
  "itemDividerWidth",
  "indicatorThickness",
  "transitionMs",
  "hoverLift",
  "containerPaddingX",
  "containerPaddingY",
] as const;
// TASK-506: the FIRST boolean partition on nav styling (none existed before).
const NAV_LEVEL_STYLE_BOOL_KEYS = [
  "itemDividerShow",
  "indicatorGrow",
  "hoverUnderline",
  "showCaret",
  "caretRotateOnOpen",
] as const;
// TASK-506 enum partition (mirror the shadow branch — fail-soft omit on bad value).
const NAV_LEVEL_STYLE_ENUM_FIELDS = [
  ["itemDividerStyle", ITEM_DIVIDER_STYLES],
  ["indicator", NAV_INDICATOR_KINDS],
  ["flyoutAnimation", FLYOUT_ANIMATIONS],
  ["submenuPlacement", SUBMENU_PLACEMENTS],
  // TASK-508-01 R1(b) — fail-soft OMIT on bad value via the shared enum loop:
  ["linkAlign", NAV_LINK_ALIGNS],
] as const;

const normalizeNavLevelStyle = (value: unknown, path: string): NavLevelStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    // reject-unknown STYLE keys
    if (!(NAV_LEVEL_STYLE_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const out: NavLevelStyle = {};
  for (const k of NAV_LEVEL_STYLE_COLOR_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const c = normalizeMenuColorValue(value[k]);
    if (c !== null) out[k] = c; // value fail-soft omit
  }
  for (const k of NAV_LEVEL_STYLE_NUMBER_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const n = clampLocalNumber(NAV_LEVEL_NUMBER_RANGES[k], value[k]);
    if (n !== null) out[k] = n;
  }
  if (value.fontWeight !== undefined && value.fontWeight !== null) {
    const w = normalizeEnumLocal(menuAppearanceFontWeights, value.fontWeight);
    if (w !== null) out.fontWeight = w;
  }
  if (value.shadow !== undefined && value.shadow !== null) {
    const s = normalizeEnumLocal(menuAppearanceShadows, value.shadow);
    if (s !== null) out.shadow = s;
  }
  // TASK-506 enum branches (fail-soft omit on bad value):
  for (const [k, options] of NAV_LEVEL_STYLE_ENUM_FIELDS) {
    if (value[k] === undefined || value[k] === null) continue;
    const e = normalizeEnumLocal(options, value[k]);
    if (e !== null) (out as Record<string, unknown>)[k] = e;
  }
  // TASK-506 boolean partition (typeof===boolean, non-boolean ⇒ fail-soft OMIT):
  for (const k of NAV_LEVEL_STYLE_BOOL_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    if (typeof value[k] === "boolean") (out as Record<string, unknown>)[k] = value[k];
  }
  return Object.keys(out).length > 0 ? out : undefined; // prune empty level
};

export const normalizeNavLevelStyles = (
  value: unknown,
  path: string
): NavLevelStyles | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    // reject-unknown LEVEL keys ("0"/"3"/junk)
    if (!(NAV_LEVEL_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const out: NavLevelStyles = {};
  for (const level of NAV_LEVEL_STYLE_LEVELS) {
    const raw = (value as Record<string, unknown>)[level]; // value[1] ⇒ "1" at runtime
    if (raw === undefined || raw === null) continue;
    const style = normalizeNavLevelStyle(raw, `${path}.${level}`);
    if (style) out[level] = style; // prune empty level
  }
  return Object.keys(out).length > 0 ? out : undefined; // prune empty record ⇒ omit
};

// --- TASK-506 level-0 navChrome sub-record (Option B) ------------------------
// CONSCIOUS fail-closed READ-trap allowlist: a forgotten key degrades every stored
// doc carrying a navChrome member to empty on read (round-trip test per key). NO
// `flyoutAnimation` — it is a levels-≥1 NavLevelStyle field (writing it under
// navChrome reject-unknown throws).
export const NAV_CHROME_KEYS = [
  "navPillBackground",
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
  "itemDividerShow",
  "itemDividerColor",
  "itemDividerWidth",
  "itemDividerStyle",
  "indicator",
  "indicatorColor",
  "indicatorThickness",
  "indicatorGrow",
  "hoverUnderline",
  "transitionMs",
  "hoverLift",
  "showCaret",
  "caretRotateOnOpen",
  // TASK-508-01 R3a/R3b nav-global submenu form (value partition: NAV_CHROME_ENUM_FIELDS):
  "submenuDirection",
  "submenuMode",
] as const;
const NAV_CHROME_COLOR_KEYS = ["navPillBackground", "itemDividerColor", "indicatorColor"] as const;
const NAV_CHROME_NUMBER_KEYS = [
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
  "itemDividerWidth",
  "indicatorThickness",
  "transitionMs",
  "hoverLift",
] as const;
const NAV_CHROME_ENUM_FIELDS = [
  ["itemDividerStyle", ITEM_DIVIDER_STYLES],
  ["indicator", NAV_INDICATOR_KINDS],
  // TASK-508-01 R3a/R3b (fail-soft OMIT on bad value via the shared enum loop):
  ["submenuDirection", SUBMENU_DIRECTIONS],
  ["submenuMode", SUBMENU_MODES],
] as const;
const NAV_CHROME_BOOL_KEYS = [
  "itemDividerShow",
  "indicatorGrow",
  "hoverUnderline",
  "showCaret",
  "caretRotateOnOpen",
] as const;

// Same VALUE policy as normalizeNavLevelStyle (KEYS throw reject-unknown; VALUES
// fail-soft OMIT). Numbers clamp over NAV_CHROME_NUMBER_RANGES; empty ⇒ pruned.
export const normalizeNavChrome = (value: unknown, path: string): NavChromeStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!(NAV_CHROME_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`); // reject-unknown KEY
    }
  }
  const out: NavChromeStyle = {};
  for (const k of NAV_CHROME_COLOR_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const c = normalizeMenuColorValue(value[k]);
    if (c !== null) (out as Record<string, unknown>)[k] = c;
  }
  for (const k of NAV_CHROME_NUMBER_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const n = clampLocalNumber(NAV_CHROME_NUMBER_RANGES[k], value[k]);
    if (n !== null) (out as Record<string, unknown>)[k] = n;
  }
  for (const [k, options] of NAV_CHROME_ENUM_FIELDS) {
    if (value[k] === undefined || value[k] === null) continue;
    const e = normalizeEnumLocal(options, value[k]);
    if (e !== null) (out as Record<string, unknown>)[k] = e;
  }
  for (const k of NAV_CHROME_BOOL_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    if (typeof value[k] === "boolean") (out as Record<string, unknown>)[k] = value[k];
  }
  return Object.keys(out).length > 0 ? out : undefined; // prune empty ⇒ no member
};

export const normalizeBrandProps = (
  value: unknown,
  mode: "write" | "stored-read",
  path: string
): BrandProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!(BRAND_PROP_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  let brandMode: BrandProps["mode"] = "text";
  if (value.mode !== undefined) {
    // TASK-520-01-L03: "icon" added to the mode union.
    if (value.mode !== "text" && value.mode !== "image" && value.mode !== "icon") {
      throw new MenuDocumentError(`${path}.mode`);
    }
    brandMode = value.mode;
  }
  let href = "/";
  if (value.href !== undefined) {
    if (typeof value.href !== "string") throw new MenuDocumentError(`${path}.href`);
    const trimmed = value.href.trim();
    // Route brand.href through the SAME authoring URL sanitizer every other
    // stored href uses (the page button/link leaf → sanitizeAuthoringLinkHref),
    // closing the reject-unknown hole: `javascript:`/`data:`/`vbscript:` (and
    // other unsafe schemes) are dropped on WRITE and can never be SSR-emitted
    // into the public header anchor. Fail-soft to "/" (mirroring the page
    // button leaf, which drops an unsafe href rather than throwing) so a valid
    // anchor is always rendered.
    if (trimmed.length > 0) href = sanitizeAuthoringLinkHref(trimmed) ?? "/";
  }
  const props: BrandProps = { mode: brandMode, href };
  if (value.text !== undefined && value.text !== null) {
    // null tolerated as absent (mirrors image below).
    if (typeof value.text !== "string") throw new MenuDocumentError(`${path}.text`);
    const text = value.text.trim().slice(0, MENU_BRAND_TEXT_MAX_LENGTH); // fail-soft cap, never throw-on-long
    if (text.length > 0) props.text = text; // SPARSE: empty/whitespace ⇒ OMIT ⇒ inherit site name
  }
  if (value.icon !== undefined && value.icon !== null) {
    // TASK-520-01-L03: fail-soft — a bad icon name is dropped (SPARSE), never throws.
    const icon = normalizeBrandIconName(value.icon);
    if (icon) props.icon = icon;
  }
  if (value.showText !== undefined && value.showText !== null) {
    // TASK-520-01-L03: strict TYPE (throw on non-boolean); present-only VALUE
    // (store only `true`; false = the exclusive-legacy default ⇒ omit).
    if (typeof value.showText !== "boolean") throw new MenuDocumentError(`${path}.showText`);
    if (value.showText) props.showText = true;
  }
  if (value.image !== undefined && value.image !== null) {
    props.image = normalizeBrandImage(value.image, mode, `${path}.image`);
  }
  if (value.style !== undefined && value.style !== null) {
    // null tolerated as absent; sparse ⇒ omit when pruned (legacy byte-identity).
    const style = normalizeBrandStyle(value.style, `${path}.style`);
    if (style) props.style = style;
  }
  return props;
};
const MENU_UTILITY_PROP_KEYS = ["label"] as const;

export const normalizeMenuUtilityProps = (value: unknown, path: string): MenuUtilityProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!(MENU_UTILITY_PROP_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const props: MenuUtilityProps = {};
  if (value.label !== undefined && value.label !== null) {
    if (typeof value.label !== "string") throw new MenuDocumentError(`${path}.label`);
    props.label = value.label.trim();
  }
  return props;
};

/**
 * Wraps a candidate leaf block in ONE throwaway page section, runs the PUBLIC
 * page normalizers, then re-tags it back to the menu type. This inherits
 * button/image/divider/spacer + style + visibility + box-spacing validation for
 * FREE, with no page-schema edit (mirrors `menuNavExtras.ts`).
 */
export const normalizeThroughPageLeaf = (
  block: Record<string, unknown>,
  pageType: string,
  mode: "write" | "stored-read",
  path: string
): {
  props: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility: PageBlockVisibilityV2;
} => {
  const wrapped = {
    // Deterministic throwaway page-block id (the leaf re-tag discards it).
    id: "blk_menu_doc_leaf",
    props: {},
    visibility: { visible: true },
    ...block,
    type: pageType,
  };
  const wrapper = {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: {},
    sections: [
      {
        ...createPageSectionV2("custom", { id: "sec_menu_doc_leaf", name: "Menu leaf" }),
        blocks: [wrapped],
      },
    ],
  };
  let out: PageBlockV2 | undefined;
  try {
    const doc =
      mode === "write"
        ? normalizePageDocumentV2ForWrite(wrapper)
        : normalizeStoredPageDocumentV2ForRead(wrapper);
    out = doc.sections[0]?.blocks[0];
  } catch (error) {
    if (isPageDocumentError(error)) throw new MenuDocumentError(path);
    throw error;
  }
  if (!out) throw new MenuDocumentError(path);
  return { props: out.props, style: out.style, visibility: out.visibility };
};

const normalizeBrandImage = (
  value: unknown,
  mode: "write" | "stored-read",
  path: string
): Record<string, unknown> => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const leaf = normalizeThroughPageLeaf({ props: value }, "image", mode, path);
  return leaf.props;
};
