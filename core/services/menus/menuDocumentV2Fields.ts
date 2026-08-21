/**
 * menuDocumentV2Fields — field-level normalizers of the menu document
 * (TASK-542-01-L01 split): appearance subsets, menu-bar layout, nav-items
 * props, per-device responsive records, block overrides, the box-shadow
 * validator, and the shell default consts. Style-record constants and
 * brand/nav-level/nav-chrome normalizers live in the sibling
 * `menuDocumentV2Styles` module (TASK-542-03-L03 split); this file
 * re-exports the public style surface for stable consumers.
 * Bun-free, import-side-effect free (Vitest lane).
 */
import {
  clampLocalNumber,
  isPlainObject,
  normalizeBrandStyle,
  normalizeEnumLocal,
  normalizeNavChrome,
  normalizeNavLevelStyles,
} from "./menuDocumentV2Styles";
import {
  isMenuAppearanceError,
  menuAppearanceNumberRanges,
  menuAppearanceShadows,
  normalizeMenuAppearance,
  normalizeMenuColorValue,
  type MenuAppearance,
} from "./normalizeMenuAppearance";
import {
  MenuDocumentError,
  MENU_BAR_EXTRA_KEYS,
  MENU_BAR_LAYOUT_KEYS,
  MENU_BAR_LAYOUT_NUMBER_RANGES,
  MENU_NAV_DEVICE_DEFINING_KEYS,
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  MENU_SECTION_OVERRIDE_GROUP_KEYS,
  NAV_ITEMS_PROP_KEYS,
  type MenuBarLayout,
  type MenuBlockOverride,
  type MenuBlockResponsive,
  type MenuResponsiveBreakpoint,
  type MenuSectionOverride,
  type MenuSectionType,
  type MenuSectionResponsive,
  type NavItemsProps,
} from "./menuDocumentV2Schema";

export const requireArray = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) throw new MenuDocumentError(path);
  return value;
};

export const pickAppearance = (
  value: MenuAppearance,
  keys: readonly (keyof MenuAppearance)[]
): MenuAppearance => {
  const out: MenuAppearance = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      Object.assign(out, { [key]: value[key] });
    }
  }
  return out;
};

export const sectionTypeName: Record<MenuSectionType, string> = {
  "menu-bar": "Menu bar",
  "menu-drawer": "Menu drawer",
};

// --- menu-native prop normalizers (reject cross-subset BEFORE pick) ---------

const normalizeAppearanceSubset = (
  value: unknown,
  keys: readonly (keyof MenuAppearance)[],
  path: string
): MenuAppearance => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  // Reject-unknown per subset: `normalizeMenuAppearance` is strict only over the
  // FULL appearance key set, so a cross-subset key (e.g. `linkColor` on a
  // menu-bar layout, or `sticky` on nav-items) would PASS the full normalize and
  // be silently DROPPED by pick. Assert the raw input carries no key outside the
  // intended subset BEFORE pick — never lean on pick to enforce the allowlist.
  for (const key of Object.keys(value)) {
    if (!(keys as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  try {
    return pickAppearance(normalizeMenuAppearance(value), keys);
  } catch (error) {
    if (isMenuAppearanceError(error)) throw new MenuDocumentError(`${path}.${error.field}`);
    throw error;
  }
};

// TASK-520-01-L01: split normalizer. Reject-unknown over the UNION of the
// appearance subset ∪ the EXTRA keys; the appearance keys route through the strict
// `normalizeAppearanceSubset` (fed an appearance-only slice so its own reject-unknown
// does not choke on the extra keys), the extra keys route through local fail-soft
// value normalizers (present-only assign; bad values omitted, never thrown).
export const normalizeMenuBarLayout = (value: unknown, path: string): MenuBarLayout => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const allowed = new Set<string>([...MENU_BAR_LAYOUT_KEYS, ...MENU_BAR_EXTRA_KEYS]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new MenuDocumentError(`${path}.${key}`); // reject-unknown
  }
  const appearanceInput: Record<string, unknown> = {};
  for (const k of MENU_BAR_LAYOUT_KEYS) {
    if (k in (value as object)) appearanceInput[k] = (value as Record<string, unknown>)[k];
  }
  const out: MenuBarLayout = {
    ...(normalizeAppearanceSubset(appearanceInput, MENU_BAR_LAYOUT_KEYS, path) as MenuBarLayout),
  };
  const v = value as Record<string, unknown>;
  if (v.radius != null) {
    const n = clampLocalNumber(MENU_BAR_LAYOUT_NUMBER_RANGES.radius, v.radius);
    if (n !== null) out.radius = n;
  }
  if (v.borderWidthScrolled != null) {
    const n = clampLocalNumber(menuAppearanceNumberRanges.borderWidth, v.borderWidthScrolled);
    if (n !== null) out.borderWidthScrolled = n;
  }
  if (v.surfaceColorScrolled != null) {
    const c = normalizeMenuColorValue(v.surfaceColorScrolled);
    if (c !== null) out.surfaceColorScrolled = c;
  }
  if (v.borderColorScrolled != null) {
    const c = normalizeMenuColorValue(v.borderColorScrolled);
    if (c !== null) out.borderColorScrolled = c;
  }
  if (v.shadowScrolled != null) {
    const s = normalizeEnumLocal(menuAppearanceShadows, v.shadowScrolled);
    if (s !== null) out.shadowScrolled = s;
  }
  // TASK-520-01-L02: custom box-shadow validation (security-critical CSS-value whitelist).
  if (v.shadowCustom != null) {
    const sh = normalizeMenuBoxShadowValue(v.shadowCustom);
    if (sh !== null) out.shadowCustom = sh;
  }
  if (v.shadowCustomScrolled != null) {
    const sh = normalizeMenuBoxShadowValue(v.shadowCustomScrolled);
    if (sh !== null) out.shadowCustomScrolled = sh;
  }
  return out; // present-only; empties simply absent
};

// `levelStyles`/`navChrome` are non-appearance members split off BEFORE the flat
// subset (an unhandled key would be REJECTED and degrade the doc).
export const normalizeNavItemsProps = (value: unknown, path: string): NavItemsProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  // TASK-506: split BOTH non-appearance members (`levelStyles` + `navChrome`) off
  // BEFORE the flat subset — either would be REJECTED by normalizeAppearanceSubset
  // and degrade the doc. Reused verbatim by the responsive write path, so navChrome
  // flows through the SAME reject-unknown per-device (no separate allowlist needed).
  const { levelStyles: rawLevelStyles, navChrome: rawNavChrome, ...scalars } = value;
  const base = normalizeAppearanceSubset(scalars, NAV_ITEMS_PROP_KEYS, path) as NavItemsProps;
  let next: NavItemsProps = base;
  if (rawLevelStyles !== undefined && rawLevelStyles !== null) {
    const levelStyles = normalizeNavLevelStyles(rawLevelStyles, `${path}.levelStyles`);
    if (levelStyles) next = { ...next, levelStyles }; // prune ⇒ no member
  }
  if (rawNavChrome !== undefined && rawNavChrome !== null) {
    const navChrome = normalizeNavChrome(rawNavChrome, `${path}.navChrome`);
    if (navChrome) next = { ...next, navChrome }; // prune ⇒ no member
  }
  return next; // absent BOTH ⇒ bare base (legacy byte-identity)
};

// --- responsive override write normalizers (reject-unknown, prune-empty) ----

/**
 * Read/write divergence for the device-defining carve-out (TASK-502-01). The
 * write path REJECTS a `mobileMode`/`dropdownDirection` inside a responsive
 * navProps record; the stored read PRUNES it (a 501-era doc may legit hold one
 * — degrading the whole doc would be data loss). This is a NARROW channel,
 * separate from the leaf `mode` param (leaf validation stays strict on read).
 */
export type MenuResponsiveCarveout = "reject" | "prune";

export const normalizeMenuSectionResponsive = (
  value: unknown,
  path: string,
  carveout: MenuResponsiveCarveout
): MenuSectionResponsive | undefined => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const out: MenuSectionResponsive = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(MENU_RESPONSIVE_BREAKPOINT_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`); // "desktop"/junk ⇒ reject
    }
    if (raw === undefined || raw === null) continue;
    if (!isPlainObject(raw)) throw new MenuDocumentError(`${path}.${key}`);
    const override: MenuSectionOverride = {};
    for (const groupKey of Object.keys(raw)) {
      if (!(MENU_SECTION_OVERRIDE_GROUP_KEYS as readonly string[]).includes(groupKey)) {
        throw new MenuDocumentError(`${path}.${key}.${groupKey}`); // "style"/"blocks"/… ⇒ reject
      }
    }
    if (raw.layout !== undefined && raw.layout !== null) {
      // Reuses the SAME subset normalizer as the base ⇒ same reject-unknown
      // + color/number/enum validation (raw stored input never reaches CSS).
      const layout = normalizeMenuBarLayout(raw.layout, `${path}.${key}.layout`);
      if (Object.keys(layout).length > 0) override.layout = layout; // prune empty
    }
    if (raw.navProps !== undefined && raw.navProps !== null) {
      if (!isPlainObject(raw.navProps)) throw new MenuDocumentError(`${path}.${key}.navProps`);
      // Device-defining carve-out: mobileMode/dropdownDirection are never
      // overridable. WRITE ⇒ reject (offending path); STORED READ ⇒ prune the
      // key from the record (mobileMode is HOISTED to the base earlier, in the
      // section pre-pass; dropdownDirection is dead ⇒ prune-only).
      let navInput: Record<string, unknown> = raw.navProps;
      for (const defKey of MENU_NAV_DEVICE_DEFINING_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(navInput, defKey)) continue;
        if (carveout === "reject") {
          throw new MenuDocumentError(`${path}.${key}.navProps.${defKey}`);
        }
        if (navInput === raw.navProps) navInput = { ...navInput }; // copy-on-first-prune
        delete navInput[defKey];
      }
      const navProps = normalizeNavItemsProps(navInput, `${path}.${key}.navProps`);
      if (Object.keys(navProps).length > 0) override.navProps = navProps; // prune empty
    }
    if (Object.keys(override).length > 0) out[key as MenuResponsiveBreakpoint] = override;
  }
  return Object.keys(out).length > 0 ? out : undefined; // empty ⇒ NEVER persisted
};

/**
 * HOIST pre-pass (stored read ONLY, TASK-502-01). A 501-era
 * `responsive.mobile.navProps.mobileMode` override is LIVE data (the mobile CSS
 * branch reads the mobile-resolved value), so prune-only would silently change
 * published mobile rendering. When the raw mobile record carries an OWN
 * mobileMode whose value is a VALID enum member, write it into the raw FIRST
 * nav-items block's `props.mobileMode` (the normative base target, overwriting
 * the base value); `normalizeNavItemsProps` then validates it like any base
 * prop. Invalid/junk values are NOT hoisted (prune-only — hoisting junk would
 * degrade the doc the carve-out exists to save); tablet records and
 * `dropdownDirection` are NEVER hoisted (never consumed / truly dead). Returns
 * a new blocks array when a hoist happened, else null (identity).
 */
const NAV_ITEMS_MOBILE_MODE_VALUES = ["disclosure", "inline"] as const;

export const hoistMobileModeOverride = (
  responsive: unknown,
  rawBlocks: unknown[]
): unknown[] | null => {
  if (!isPlainObject(responsive)) return null;
  const mobile = responsive.mobile;
  if (!isPlainObject(mobile)) return null;
  const navProps = mobile.navProps;
  if (!isPlainObject(navProps)) return null;
  if (!Object.prototype.hasOwnProperty.call(navProps, "mobileMode")) return null;
  const override = navProps.mobileMode;
  if (!(NAV_ITEMS_MOBILE_MODE_VALUES as readonly unknown[]).includes(override)) return null;
  const navIndex = rawBlocks.findIndex(
    (block) => isPlainObject(block) && block.type === "nav-items"
  );
  if (navIndex === -1) return null;
  const navBlock = rawBlocks[navIndex];
  if (!isPlainObject(navBlock)) return null;
  const props = isPlainObject(navBlock.props) ? navBlock.props : {};
  const next = [...rawBlocks];
  next[navIndex] = { ...navBlock, props: { ...props, mobileMode: override } };
  return next;
};

const MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS = ["visible"] as const;
// CONSCIOUS fail-closed READ-trap extension (TASK-504-01 §5): "style" carries the
// tablet/mobile brand style delta; forgetting it degrades every doc holding a
// `responsive.{bp}.style` brand delta.
export const MENU_BLOCK_OVERRIDE_GROUP_KEYS = ["visibility", "style"] as const;

export const normalizeMenuBlockResponsive = (
  value: unknown,
  path: string
): MenuBlockResponsive | undefined => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const out: MenuBlockResponsive = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(MENU_RESPONSIVE_BREAKPOINT_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
    if (raw === undefined || raw === null) continue;
    if (!isPlainObject(raw)) throw new MenuDocumentError(`${path}.${key}`);
    for (const groupKey of Object.keys(raw)) {
      // "props"/junk ⇒ reject: menu block overrides carry ONLY visibility + style.
      if (!(MENU_BLOCK_OVERRIDE_GROUP_KEYS as readonly string[]).includes(groupKey)) {
        throw new MenuDocumentError(`${path}.${key}.${groupKey}`);
      }
    }
    const override: MenuBlockOverride = {};
    // CONTROL-FLOW CONVERSION (§5): the two source `continue`s become conditional
    // NON-ASSIGNMENT so the `style` branch + final assign always run — a
    // ported-verbatim `continue` on empty `visible` would silently DROP a valid
    // brand `style` delta (fail-closed data-loss). Asserted in tests.
    if (raw.visibility !== undefined && raw.visibility !== null) {
      if (!isPlainObject(raw.visibility)) throw new MenuDocumentError(`${path}.${key}.visibility`);
      for (const vKey of Object.keys(raw.visibility)) {
        if (!(MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS as readonly string[]).includes(vKey)) {
          throw new MenuDocumentError(`${path}.${key}.visibility.${vKey}`);
        }
      }
      const visible = raw.visibility.visible;
      if (visible !== undefined && visible !== null) {
        if (typeof visible !== "boolean") {
          throw new MenuDocumentError(`${path}.${key}.visibility.visible`);
        }
        override.visibility = { visible };
      } // empty `visible` ⇒ skip ONLY this assign, FALL THROUGH to style
    }
    if (raw.style !== undefined && raw.style !== null) {
      const style = normalizeBrandStyle(raw.style, `${path}.${key}.style`);
      if (style) override.style = style; // prune empty
    }
    if (Object.keys(override).length > 0) out[key as MenuResponsiveBreakpoint] = override;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Authoring cap for the per-menu brand text override (exported: 502-04 sets Input maxLength). */
/** TASK-506 F2 theme/base-sheet default source consts; the SINGLE source for
 *  506-02/506-04. Mirrors `SHELL_DEFAULT_LINK_*` + `NAV_FONT_SIZE_INHERITED`. */
export const MENU_SHELL_DEFAULT_LINK_PX = 12 as const;
export const MENU_SHELL_DEFAULT_LINK_PY = 8 as const;
export const MENU_SHELL_DEFAULT_LINK_RADIUS = 6 as const;
export const NAV_FONT_SIZE_INHERITED = 16 as const;
/** TASK-508-01 R1(a): base-sheet mirror of `.site-nav-sublist{min-width:180px;
 *  padding:6px}` (siteShellCss.ts:151). The sublist container ALWAYS paints these
 *  regardless of override, so the effective UNSET value genuinely IS 180 / 6 —
 *  surfacing them in the hint is honest, not misleading. Do NOT edit siteShellCss.ts. */
export const MENU_SHELL_SUBLIST_MIN_WIDTH = 180 as const;
export const MENU_SHELL_SUBLIST_PADDING = 6 as const;

// cannot validate a full `box-shadow` (offsets + blur + spread + color, possibly
// comma-layered). This bespoke validator accepts ONLY a bounded box-shadow
// grammar: an optional `inset`, 2..4 length tokens, and EXACTLY ONE color token
// validated via `normalizeMenuColorValue`, comma-repeated up to 4 layers, total
// length <= 200. It rejects `url(`/`expression(`/`javascript:`/`var(`/`calc(`/
// `image-set(`/`{`/`}`/`;`/`<`/`>`/`@`/`\`/`/*` up front. Fail-soft (null ⇒ key
// omitted; never throws). The embedded color token is emitted in the canonical
// authoring bytes returned by the shared owner, including leading-dot alpha
// normalization (`.24` → `0.24`). The surrounding shadow grammar and its own
// length/layer limits remain separate from the single-color contract.
const BOX_SHADOW_MAX_LENGTH = 200;
const BOX_SHADOW_MAX_LAYERS = 4;
// One length token: optional sign, integer/decimal with unit px|rem|em, OR bare 0.
const SHADOW_LENGTH = String.raw`-?(?:\d+(?:\.\d+)?(?:px|rem|em)|0)`;
// Hard-deny anything that could break out of the value context or fetch/execute:
const SHADOW_DENY = /url\(|expression\(|javascript:|image-set\(|var\(|calc\(|[;{}<>@\\]|\/\*/i;

// Bracket-aware tokenizer: split a single layer on whitespace ONLY at paren-depth
// 0 so a color function like `rgba(8, 17, 31, .84)` (internal spaces after commas)
// stays a SINGLE token.
const tokenizeShadowLayer = (layer: string): string[] => {
  const tokens: string[] = [];
  let cur = "";
  let depth = 0;
  for (const ch of layer) {
    if (ch === "(") {
      depth += 1;
      cur += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      cur += ch;
      continue;
    }
    if (depth === 0 && /\s/.test(ch)) {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
};

export function normalizeMenuBoxShadowValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > BOX_SHADOW_MAX_LENGTH) return null;
  if (SHADOW_DENY.test(raw)) return null; // security gate 1

  // Split on top-level commas, then re-merge commas that fall INSIDE a color
  // function's parens (a comma at paren-depth > 0 belongs to the color, not a
  // layer boundary — otherwise `rgba(0,0,0,.24)` is miscounted as extra layers).
  const pieces = raw.split(",");
  const mergedLayers: string[] = [];
  let depth = 0;
  for (const piece of pieces) {
    if (depth > 0) mergedLayers[mergedLayers.length - 1] += "," + piece;
    else mergedLayers.push(piece);
    for (const ch of piece) {
      if (ch === "(") depth += 1;
      else if (ch === ")") depth = Math.max(0, depth - 1);
    }
  }
  if (mergedLayers.length > BOX_SHADOW_MAX_LAYERS) return null;

  const lengthRe = new RegExp(`^${SHADOW_LENGTH}$`, "i");
  const cleaned: string[] = [];
  for (const layerRaw of mergedLayers) {
    const layer = layerRaw.trim();
    if (layer.length === 0) return null;
    let rest = layer;
    let inset = "";
    if (/^inset\b/i.test(rest)) {
      inset = "inset ";
      rest = rest.replace(/^inset\b\s*/i, "");
    }
    const tokens = tokenizeShadowLayer(rest).filter(Boolean);
    const lengths: string[] = [];
    let color: string | null = null;
    for (const tok of tokens) {
      if (lengthRe.test(tok)) {
        lengths.push(tok);
        continue;
      }
      if (color !== null) return null; // a second non-length token ⇒ reject
      color = normalizeMenuColorValue(tok); // security gate 2 (reuses color whitelist)
      if (color === null) return null; // unknown token / bad color ⇒ reject
    }
    if (lengths.length < 2 || lengths.length > 4) return null; // offset-x/y (+ optional blur/spread)
    if (color === null) return null; // a visible shadow needs a color
    cleaned.push(`${inset}${lengths.join(" ")} ${color}`.trim());
  }
  return cleaned.join(", "); // canonicalized, validated
}

/** TASK-520-01-L03: brand icon-name validator (pattern-only, fail-soft). The
 *  effective ALLOWLIST is enforced at RENDER (520-04) by resolving the name against
 *  `lucideKebabIconComponents`; an unknown/unresolvable name falls through to the
 *  text/site-name chain and renders nothing injectable. */

export {
  BRAND_STYLE_NUMBER_RANGES,
  isPlainObject,
  MENU_BRAND_TEXT_MAX_LENGTH,
  NAV_CHROME_DEFAULTS,
  NAV_CHROME_KEYS,
  NAV_CHROME_NUMBER_RANGES,
  NAV_LEVEL_NUMBER_RANGES,
  NAV_LEVEL_STYLE_LEVELS,
  NAV_LINK_NUMBER_RANGES,
  normalizeBrandProps,
  normalizeMenuUtilityProps,
  normalizeThroughPageLeaf,
} from "./menuDocumentV2Styles";
