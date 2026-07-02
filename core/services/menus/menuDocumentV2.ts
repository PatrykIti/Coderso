import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageBlockV2,
  createPageSectionV2,
  isPageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  type PageBlockStyleV2,
  type PageBlockV2,
  type PageBlockVisibilityV2,
} from "../pages/pageDocumentV2";
import { sanitizeAuthoringLinkHref } from "../pages/pageAuthoringSanitizers";
import {
  isMenuAppearanceError,
  normalizeMenuAppearance,
  type MenuAppearance,
} from "./normalizeMenuAppearance";

/**
 * menuDocumentV2 — the menu Design tab's composable document (TASK-499-02).
 *
 * Option B: a NEW, menu-scoped document engine with its OWN section/block
 * enums and its OWN `MENU_DOCUMENT_SCHEMA_VERSION`, independent of the page
 * schema. It reuses ONLY the proven shared leaf validators (button / image /
 * divider / spacer, via the page block pipeline wrapper trick) and the
 * existing strict `normalizeMenuAppearance` field validators (colors, clamped
 * numbers, enum strings). The page schema (`pageDocumentV2.ts`) is NOT
 * polluted with menu types.
 *
 * Write path (strict): `normalizeMenuDocumentV2ForWrite` throws a
 * machine-readable `MenuDocumentError` (`menu_document_invalid` + offending
 * `path`) on unknown section/block types, unknown props, malformed values, or
 * over-capacity trees; nothing is persisted.
 *
 * Read path (fail-closed): `normalizeStoredMenuDocumentV2ForRead` never throws
 * — unreadable input degrades to an empty document (⇒ the resolvers return
 * `null` ⇒ the legacy appearance+extras look).
 *
 * Menu-native blocks (`nav-items`/`brand`/`search`/`account`/`language`) carry
 * NO FLAT block `style`/`visibility`: their appearance flows entirely through
 * the validated menu-bar `layout` + nav-items appearance props, so per-block
 * style/visibility would be redundant AND unvalidatable (the page
 * `normalizeBlockStyle`/`normalizeBlockVisibility` validators are
 * module-private and MUST NOT be deep-imported). Only the reused leaf blocks
 * (`cta-button`/`divider`/`spacer`) carry style/visibility, validated for free
 * by the page block pipeline.
 *
 * Per-device overrides (TASK-501-01 + TASK-502-01): sections carry SPARSE
 * `responsive.{tablet,mobile}.{layout,navProps}` records; EVERY block type
 * (menu-native included) carries sparse `responsive.{tablet,mobile}.visibility`
 * records. The block record is document-level render/CSS gating owned by THIS
 * contract — it does NOT touch the page visibility pipeline. Records store only
 * edited keys, are lazily created, pruned when empty, and removed by explicit
 * Reset only (never auto-removed on equality). Cascade mirrors Pages EXACTLY
 * (`pageResponsiveCss.ts:10-13`): desktop = base; tablet AND mobile each merge
 * ONLY their OWN record over the DESKTOP base — mobile does NOT inherit tablet.
 *
 * Device-defining nav props (TASK-502-01): `mobileMode` and `dropdownDirection`
 * are device-DEFINING, never overridable — a `responsive.*.navProps` record
 * carrying either key is REJECTED on the strict WRITE. On the fail-closed
 * STORED READ the one conscious carve-out applies (a 501-era doc may legit hold
 * such a record; degrading the whole doc for it would be data loss): the keys
 * get SPLIT treatment — `dropdownDirection` is truly DEAD (the desktop-branch
 * emission reads the BASE) ⇒ silently PRUNED; a mobile `mobileMode` override is
 * LIVE (the mobile branch consumes the mobile-resolved value) ⇒ HOISTED into
 * the first nav-items block's base props, THEN pruned — behavior-preserving
 * (published mobile rendering byte-identical). Migration is non-destructive:
 * the migrated doc round-trips clean ⇒ the next autosave persists it.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

export const MENU_DOCUMENT_SCHEMA_VERSION = 1 as const;

export const menuSectionTypes = ["menu-bar", "menu-drawer"] as const;
export const menuBlockTypes = [
  // menu-native (own normalizers):
  "nav-items",
  "brand",
  "search",
  "account",
  "language",
  // reused shared leaf blocks (delegated to the page block pipeline):
  "cta-button",
  "divider",
  "spacer",
] as const;

export type MenuSectionType = (typeof menuSectionTypes)[number];
export type MenuBlockType = (typeof menuBlockTypes)[number];

const MENU_NATIVE_BLOCK_TYPES = ["nav-items", "brand", "search", "account", "language"] as const;
const MENU_LEAF_BLOCK_TYPES = ["cta-button", "divider", "spacer"] as const;

/** Menu-bar layout = the `MenuAppearance` surface/frame subset. */
const MENU_BAR_LAYOUT_KEYS = [
  "surfaceColor",
  "paddingX",
  "paddingY",
  "alignment",
  "borderColor",
  "borderWidth",
  "shadow",
  "sticky",
] as const satisfies readonly (keyof MenuAppearance)[];

/** nav-items props = the `MenuAppearance` typography/link subset. */
const NAV_ITEMS_PROP_KEYS = [
  "itemGap",
  "fontSize",
  "fontWeight",
  "textTransform",
  "linkColor",
  "linkHoverColor",
  "linkActiveColor",
  "dropdownDirection",
  "mobileMode",
  "orientation",
] as const satisfies readonly (keyof MenuAppearance)[];

export type MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]>;
export type NavItemsProps = Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]>;

// --- per-device override vocabulary (TASK-501-01 + TASK-502-01: tablet) ------

// Order tablet-first (wider viewport first; the CSS builder 502-02 iterates
// this const for branch emission). Both tablet and mobile inherit the DESKTOP
// base; mobile does NOT inherit tablet (Pages cascade, pageResponsiveCss.ts).
export const MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet", "mobile"] as const;
export type MenuResponsiveBreakpoint = (typeof MENU_RESPONSIVE_BREAKPOINT_KEYS)[number];
const MENU_SECTION_OVERRIDE_GROUP_KEYS = ["layout", "navProps"] as const;
export type MenuSectionOverrideGroup = (typeof MENU_SECTION_OVERRIDE_GROUP_KEYS)[number];

/**
 * `mobileMode` and `dropdownDirection` are device-DEFINING nav props: they write
 * to the BASE on every device and are NEVER stored inside a responsive record
 * (rejected on write, pruned/hoisted on stored read). Exported so 502-04 can
 * scope the panel controls and tests can assert the carve-out.
 */
export const MENU_NAV_DEVICE_DEFINING_KEYS = ["mobileMode", "dropdownDirection"] as const;

/** Editor device kind. Desktop = base; tablet and mobile each address their OWN
 *  sparse responsive record. Cascade (Pages, pageResponsiveCss.ts:10-13):
 *  tablet and mobile BOTH inherit the DESKTOP base; mobile does NOT inherit tablet. */
export type MenuDeviceKind = "desktop" | "tablet" | "mobile";

export type MenuSectionOverride = {
  /** SPARSE — edited keys only. */
  layout?: MenuBarLayout;
  /** SPARSE — edited keys only (incl. orientation). */
  navProps?: NavItemsProps;
};
export type MenuSectionResponsive = Partial<Record<MenuResponsiveBreakpoint, MenuSectionOverride>>;

export type MenuBlockOverride = { visibility?: { visible: boolean } };
export type MenuBlockResponsive = Partial<Record<MenuResponsiveBreakpoint, MenuBlockOverride>>;

export type BrandProps = {
  mode: "text" | "image";
  href: string;
  /** Validated page `image` leaf props (assetId/src/alt/caption/fit). */
  image?: Record<string, unknown>;
  /**
   * Per-menu brand text override. Fallback chain (normative for 502-03 front
   * AND 502-04 canvas): props.text → siteName (`site.name` setting) → null.
   * Absent = inherit the site name. Text FORMATTING is a named residual, not a
   * member here. Rendered as React text only (never reaches CSS).
   */
  text?: string;
};

export type MenuUtilityProps = {
  label?: string;
};

export type MenuBlockV2 =
  | { id: string; type: "nav-items"; props: NavItemsProps; responsive?: MenuBlockResponsive }
  | { id: string; type: "brand"; props: BrandProps; responsive?: MenuBlockResponsive }
  | {
      id: string;
      type: "search" | "account" | "language";
      props: MenuUtilityProps;
      responsive?: MenuBlockResponsive;
    }
  | {
      id: string;
      type: "cta-button";
      props: Record<string, unknown>;
      style?: PageBlockStyleV2;
      visibility?: PageBlockVisibilityV2;
      responsive?: MenuBlockResponsive;
    }
  | {
      id: string;
      type: "divider" | "spacer";
      props: Record<string, unknown>;
      style?: PageBlockStyleV2;
      visibility?: PageBlockVisibilityV2;
      responsive?: MenuBlockResponsive;
    };

export type MenuSectionV2 = {
  id: string;
  type: MenuSectionType;
  name: string;
  layout: MenuBarLayout;
  blocks: MenuBlockV2[];
  responsive?: MenuSectionResponsive;
};

export type MenuDocumentV2 = {
  schemaVersion: typeof MENU_DOCUMENT_SCHEMA_VERSION;
  sections: MenuSectionV2[];
};

export const MENU_DOCUMENT_INVALID = "menu_document_invalid" as const;

export class MenuDocumentError extends Error {
  readonly code = MENU_DOCUMENT_INVALID;
  readonly path: string;

  constructor(path: string) {
    super(MENU_DOCUMENT_INVALID);
    this.name = "MenuDocumentError";
    this.path = path;
  }
}

export const isMenuDocumentError = (error: unknown): error is MenuDocumentError =>
  error instanceof MenuDocumentError;

/** Clamped tree capacity: a menu document is not a page canvas. */
export const MENU_DOCUMENT_MAX_SECTIONS = 2 as const;
export const MENU_SECTION_MAX_BLOCKS = 12 as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireArray = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) throw new MenuDocumentError(path);
  return value;
};

// Browser-safe id: menuDocumentV2 is pure contract logic imported by the admin
// Design editor (browser), so it must NOT pull `node:crypto`. The global Web Crypto
// `randomUUID` exists in Bun + Node 20+ + browsers; fall back for older/edge runtimes.
const randomMenuDocumentUuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const createMenuDocumentId = (prefix: string) =>
  `${prefix}_${randomMenuDocumentUuid().slice(0, 8)}`;

const pickAppearance = (
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

const readMenuBlockId = (value: Record<string, unknown>, prefix: string): string =>
  typeof value.id === "string" && value.id.trim().length > 0
    ? value.id
    : createMenuDocumentId(prefix);

const sectionTypeName: Record<MenuSectionType, string> = {
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

const normalizeMenuBarLayout = (value: unknown, path: string): MenuBarLayout =>
  normalizeAppearanceSubset(value, MENU_BAR_LAYOUT_KEYS, path) as MenuBarLayout;

const normalizeNavItemsProps = (value: unknown, path: string): NavItemsProps =>
  normalizeAppearanceSubset(value, NAV_ITEMS_PROP_KEYS, path) as NavItemsProps;

// --- responsive override write normalizers (reject-unknown, prune-empty) ----

/**
 * Read/write divergence for the device-defining carve-out (TASK-502-01). The
 * write path REJECTS a `mobileMode`/`dropdownDirection` inside a responsive
 * navProps record; the stored read PRUNES it (a 501-era doc may legit hold one
 * — degrading the whole doc would be data loss). This is a NARROW channel,
 * separate from the leaf `mode` param (leaf validation stays strict on read).
 */
type MenuResponsiveCarveout = "reject" | "prune";

const normalizeMenuSectionResponsive = (
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

const hoistMobileModeOverride = (responsive: unknown, rawBlocks: unknown[]): unknown[] | null => {
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

const normalizeMenuBlockResponsive = (
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
      // "props"/"style" here ⇒ reject: menu block overrides carry ONLY visibility.
      if (groupKey !== "visibility") throw new MenuDocumentError(`${path}.${key}.${groupKey}`);
    }
    if (raw.visibility === undefined || raw.visibility === null) continue;
    if (!isPlainObject(raw.visibility)) throw new MenuDocumentError(`${path}.${key}.visibility`);
    for (const vKey of Object.keys(raw.visibility)) {
      if (!(MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS as readonly string[]).includes(vKey)) {
        throw new MenuDocumentError(`${path}.${key}.visibility.${vKey}`);
      }
    }
    const visible = raw.visibility.visible;
    if (visible === undefined || visible === null) continue; // empty record ⇒ pruned
    if (typeof visible !== "boolean") {
      throw new MenuDocumentError(`${path}.${key}.visibility.visible`);
    }
    out[key as MenuResponsiveBreakpoint] = { visibility: { visible } };
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Authoring cap for the per-menu brand text override (exported: 502-04 sets Input maxLength). */
export const MENU_BRAND_TEXT_MAX_LENGTH = 120 as const;

// CONSCIOUS key-list extension (fail-closed read trap: BRAND_PROP_KEYS gates
// BOTH write and stored read; forgetting a key would degrade every saved doc
// carrying that member to empty on read — asserted in tests).
const BRAND_PROP_KEYS = ["mode", "href", "image", "text"] as const;

const normalizeBrandProps = (
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
    if (value.mode !== "text" && value.mode !== "image") {
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
  if (value.image !== undefined && value.image !== null) {
    props.image = normalizeBrandImage(value.image, mode, `${path}.image`);
  }
  return props;
};

const MENU_UTILITY_PROP_KEYS = ["label"] as const;

const normalizeMenuUtilityProps = (value: unknown, path: string): MenuUtilityProps => {
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

// --- reused leaf blocks — through the page pipeline (the proven trick) -------

const MENU_LEAF_PAGE_TYPES = {
  "cta-button": "button",
  divider: "divider",
  spacer: "spacer",
} as const;

/**
 * Wraps a candidate leaf block in ONE throwaway page section, runs the PUBLIC
 * page normalizers, then re-tags it back to the menu type. This inherits
 * button/image/divider/spacer + style + visibility + box-spacing validation for
 * FREE, with no page-schema edit (mirrors `menuNavExtras.ts`).
 */
const normalizeThroughPageLeaf = (
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
    id: readMenuBlockId(block, "blk"),
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

// --- block / section normalizers --------------------------------------------

// "responsive" added by TASK-501-01 — the stored read is fail-closed
// (normalizeStoredMenuDocumentV2ForRead delegates to the strict writer);
// removing/forgetting this entry degrades every saved responsive document to
// empty (silent data loss).
const MENU_NATIVE_BLOCK_KEYS = ["id", "type", "props", "responsive"];
// "responsive" added by TASK-501-01 — same fail-closed read trap as above.
const MENU_LEAF_BLOCK_KEYS = ["id", "type", "props", "style", "visibility", "responsive"];

const assertBlockKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string
) => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new MenuDocumentError(`${path}.${key}`);
  }
};

const isMenuNativeBlockType = (type: string): boolean =>
  (MENU_NATIVE_BLOCK_TYPES as readonly string[]).includes(type);

const isMenuLeafBlockType = (type: string): type is (typeof MENU_LEAF_BLOCK_TYPES)[number] =>
  (MENU_LEAF_BLOCK_TYPES as readonly string[]).includes(type);

const normalizeMenuBlock = (
  value: unknown,
  path: string,
  mode: "write" | "stored-read"
): MenuBlockV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const type = value.type;
  if (typeof type !== "string" || !(menuBlockTypes as readonly string[]).includes(type)) {
    throw new MenuDocumentError(`${path}.type`);
  }
  const blockType = type as MenuBlockType;
  const id = readMenuBlockId(value, "blk");

  // Reject-unknown at the block level: menu-native blocks carry NO FLAT style/
  // visibility, only reused leaf blocks do (both carry the menu-validated
  // `responsive` visibility record).
  assertBlockKeys(
    value,
    isMenuNativeBlockType(blockType) ? MENU_NATIVE_BLOCK_KEYS : MENU_LEAF_BLOCK_KEYS,
    path
  );

  // Validated by the MENU contract (never the page pipeline) for every block
  // type; emitted spread-if-present so legacy blocks round-trip byte-identically.
  const responsive =
    value.responsive === undefined || value.responsive === null
      ? undefined
      : normalizeMenuBlockResponsive(value.responsive, `${path}.responsive`);

  if (blockType === "nav-items") {
    return {
      id,
      type: "nav-items",
      props: normalizeNavItemsProps(value.props ?? {}, `${path}.props`),
      ...(responsive ? { responsive } : {}),
    };
  }
  if (blockType === "brand") {
    return {
      id,
      type: "brand",
      props: normalizeBrandProps(value.props ?? {}, mode, `${path}.props`),
      ...(responsive ? { responsive } : {}),
    };
  }
  if (blockType === "search" || blockType === "account" || blockType === "language") {
    return {
      id,
      type: blockType,
      props: normalizeMenuUtilityProps(value.props ?? {}, `${path}.props`),
      ...(responsive ? { responsive } : {}),
    };
  }
  if (isMenuLeafBlockType(blockType)) {
    const pageType = MENU_LEAF_PAGE_TYPES[blockType];
    // Strip `responsive` before wrapping: the PAGE block schema accepts a
    // WIDER `responsive` shape (props/style per breakpoint) that would
    // silently launder page-shaped overrides past the menu contract above.
    const { responsive: _rawResponsive, ...leafInput } = value;
    const leaf = normalizeThroughPageLeaf({ ...leafInput, id }, pageType, mode, path);
    return {
      id,
      type: blockType,
      props: leaf.props,
      style: leaf.style,
      visibility: leaf.visibility,
      ...(responsive ? { responsive } : {}),
    };
  }
  throw new MenuDocumentError(`${path}.type`);
};

// "responsive" added by TASK-501-01 — the stored read is fail-closed;
// removing/forgetting this entry degrades every saved responsive document to
// empty (silent data loss).
const MENU_SECTION_KEYS = ["id", "type", "name", "layout", "blocks", "responsive"];

const normalizeMenuSection = (
  value: unknown,
  path: string,
  mode: "write" | "stored-read",
  carveout: MenuResponsiveCarveout
): MenuSectionV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!MENU_SECTION_KEYS.includes(key)) throw new MenuDocumentError(`${path}.${key}`);
  }
  const type = value.type;
  if (typeof type !== "string" || !(menuSectionTypes as readonly string[]).includes(type)) {
    throw new MenuDocumentError(`${path}.type`);
  }
  const sectionType = type as MenuSectionType;
  const id =
    typeof value.id === "string" && value.id.trim().length > 0
      ? value.id
      : createMenuDocumentId("sec");
  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name.trim()
      : sectionTypeName[sectionType];
  const layout = normalizeMenuBarLayout(value.layout ?? {}, `${path}.layout`);
  let rawBlocks = requireArray(value.blocks ?? [], `${path}.blocks`);
  if (rawBlocks.length > MENU_SECTION_MAX_BLOCKS) throw new MenuDocumentError(`${path}.blocks`);
  // HOIST pre-pass (stored read only): a 501-era mobile `mobileMode` override is
  // consumed by the mobile branch today, so it is hoisted into the base props
  // BEFORE block normalization (the responsive normalizer then prunes the
  // record). Behavior-preserving; runs before normalization so the hoisted
  // value is validated like any base prop.
  if (carveout === "prune") {
    const hoisted = hoistMobileModeOverride(value.responsive, rawBlocks);
    if (hoisted) rawBlocks = hoisted;
  }
  const blocks = rawBlocks.map((block, index) =>
    normalizeMenuBlock(block, `${path}.blocks[${index}]`, mode)
  );
  // Spread-if-present: legacy documents WITHOUT `responsive` normalize to
  // byte-identical objects (no `responsive` member ever materializes).
  const responsive =
    value.responsive === undefined || value.responsive === null
      ? undefined
      : normalizeMenuSectionResponsive(value.responsive, `${path}.responsive`, carveout);
  return { id, type: sectionType, name, layout, blocks, ...(responsive ? { responsive } : {}) };
};

// --- write / read / resolvers -----------------------------------------------

const normalizeMenuDocumentV2 = (
  value: unknown,
  carveout: MenuResponsiveCarveout
): MenuDocumentV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError("document");
  const sections = requireArray(value.sections, "document.sections");
  if (sections.length > MENU_DOCUMENT_MAX_SECTIONS)
    throw new MenuDocumentError("document.sections");
  // Schema-first / reject-unknown, NO stamp-on-absent: a NON-EMPTY document MUST
  // carry the EXACT current marker (reject absent OR lower/unknown). This is what
  // makes a marker-less/lower-version STORED document fail-closed to empty on read.
  if (sections.length > 0 && value.schemaVersion !== MENU_DOCUMENT_SCHEMA_VERSION) {
    throw new MenuDocumentError("document.schemaVersion");
  }
  // Leaf/brand `mode` stays the literal "write" in BOTH paths (the carve-out is
  // a separate narrow channel — leaf validation never flips to the lenient page
  // read path on a stored read).
  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: sections.map((section, index) =>
      normalizeMenuSection(section, `document.sections[${index}]`, "write", carveout)
    ),
  };
};

export function normalizeMenuDocumentV2ForWrite(value: unknown): MenuDocumentV2 {
  return normalizeMenuDocumentV2(value, "reject");
}

const EMPTY_MENU_DOCUMENT: MenuDocumentV2 = {
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [],
};

export function normalizeStoredMenuDocumentV2ForRead(value: unknown): MenuDocumentV2 {
  // Fail-closed EXCEPT the one conscious device-defining carve-out (prune): a
  // marker-less/lower-version or otherwise-invalid stored document throws ⇒
  // degrades to empty here ⇒ resolver null ⇒ legacy look.
  try {
    return normalizeMenuDocumentV2(value, "prune");
  } catch {
    return { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [] };
  }
}

export const isEmptyMenuDocument = (doc: MenuDocumentV2 | null): boolean =>
  !doc || doc.sections.length === 0 || doc.sections.every((section) => section.blocks.length === 0);

// --- composition helpers (pure) ---------------------------------------------

export function createDefaultMenuBlock(type: MenuBlockType): MenuBlockV2 {
  if (type === "nav-items")
    return { id: createMenuDocumentId("blk"), type: "nav-items", props: {} };
  if (type === "brand")
    return { id: createMenuDocumentId("blk"), type: "brand", props: { mode: "text", href: "/" } };
  if (type === "search" || type === "account" || type === "language")
    return { id: createMenuDocumentId("blk"), type, props: {} };
  // Reused leaf blocks: seed defaults through the page block factory so props/
  // style/visibility match the page schema, then re-tag to the menu type.
  const pageBlock = createPageBlockV2(MENU_LEAF_PAGE_TYPES[type]);
  return {
    id: createMenuDocumentId("blk"),
    type,
    props: pageBlock.props,
    style: pageBlock.style,
    visibility: pageBlock.visibility,
  };
}

export function createDefaultMenuDocumentV2(): MenuDocumentV2 {
  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: createMenuDocumentId("sec"),
        type: "menu-bar",
        name: sectionTypeName["menu-bar"],
        layout: {},
        blocks: [
          createDefaultMenuBlock("brand"),
          createDefaultMenuBlock("nav-items"),
          createDefaultMenuBlock("cta-button"),
        ],
      },
    ],
  };
}

const firstSectionBlocks = (doc: MenuDocumentV2): MenuBlockV2[] => doc.sections[0]?.blocks ?? [];

const withFirstSectionBlocks = (doc: MenuDocumentV2, blocks: MenuBlockV2[]): MenuDocumentV2 => {
  if (doc.sections.length === 0) return doc;
  return {
    ...doc,
    sections: doc.sections.map((section, index) =>
      index === 0 ? { ...section, blocks } : section
    ),
  };
};

export function findMenuBlock(doc: MenuDocumentV2, id: string | null): MenuBlockV2 | null {
  if (!id) return null;
  for (const section of doc.sections) {
    const found = section.blocks.find((block) => block.id === id);
    if (found) return found;
  }
  return null;
}

export function insertMenuBlock(doc: MenuDocumentV2, block: MenuBlockV2): MenuDocumentV2 {
  return withFirstSectionBlocks(doc, [...firstSectionBlocks(doc), block]);
}

export function deleteMenuBlock(doc: MenuDocumentV2, id: string): MenuDocumentV2 {
  return withFirstSectionBlocks(
    doc,
    firstSectionBlocks(doc).filter((block) => block.id !== id)
  );
}

export function reorderMenuBlock(
  doc: MenuDocumentV2,
  id: string,
  dir: "up" | "down"
): MenuDocumentV2 {
  const blocks = [...firstSectionBlocks(doc)];
  const index = blocks.findIndex((block) => block.id === id);
  if (index === -1) return doc;
  const target = dir === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= blocks.length) return doc;
  const [moved] = blocks.splice(index, 1);
  if (!moved) return doc;
  blocks.splice(target, 0, moved);
  return withFirstSectionBlocks(doc, blocks);
}

// --- per-device resolve / read / patch / clear helpers (TASK-501-01) --------
// All immutable and tolerant (missing id/override ⇒ identity return); consumed
// by the CSS builder (501-02) and the Design editor's event handlers (501-03).

/** desktop ⇒ null (the base); tablet/mobile ⇒ their OWN sparse responsive record. */
const menuDeviceBreakpoint = (device: MenuDeviceKind): MenuResponsiveBreakpoint | null =>
  device === "desktop" ? null : device;

const mapMenuSection = (
  doc: MenuDocumentV2,
  sectionId: string,
  fn: (section: MenuSectionV2) => MenuSectionV2
): MenuDocumentV2 => {
  const index = doc.sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return doc;
  return {
    ...doc,
    sections: doc.sections.map((section, i) => (i === index ? fn(section) : section)),
  };
};

const mapMenuBlock = (
  doc: MenuDocumentV2,
  blockId: string,
  fn: (block: MenuBlockV2) => MenuBlockV2
): MenuDocumentV2 => {
  let found = false;
  const sections = doc.sections.map((section) => {
    const index = section.blocks.findIndex((block) => block.id === blockId);
    if (index === -1) return section;
    found = true;
    return {
      ...section,
      blocks: section.blocks.map((block, i) => (i === index ? fn(block) : block)),
    };
  });
  return found ? { ...doc, sections } : doc;
};

/**
 * Resolve-for-display/CSS: desktop = the base; tablet/mobile = base merged with
 * ONLY their OWN sparse `responsive[bp]` record (both inherit DESKTOP — mobile
 * NEVER merges the tablet record). The nav base is the FIRST `nav-items` block's
 * props (mirrors `collectMenuAppearance`'s `.find()` binding in
 * `menuDocumentCss.ts`).
 */
export function resolveMenuSectionAppearanceForDevice(
  section: MenuSectionV2,
  device: MenuDeviceKind
): { layout: MenuBarLayout; navProps: NavItemsProps } {
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  const baseNavProps: NavItemsProps = navBlock?.type === "nav-items" ? navBlock.props : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) {
    return { layout: { ...section.layout }, navProps: { ...baseNavProps } };
  }
  const override = section.responsive?.[bp]; // ONLY the device's own record
  return {
    layout: { ...section.layout, ...(override?.layout ?? {}) }, // inherits desktop base
    navProps: { ...baseNavProps, ...(override?.navProps ?? {}) },
  };
}

/** Badge/Reset detection — reads the RAW override (undefined = inherited), never the merge. */
export function readMenuSectionOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  key: keyof MenuAppearance
): unknown {
  const record = section.responsive?.[breakpoint]?.[group];
  return record && Object.prototype.hasOwnProperty.call(record, key)
    ? (record as MenuAppearance)[key]
    : undefined;
}

/**
 * Device-forked writer. desktop ⇒ base (group "layout" ⇒ `section.layout`;
 * group "navProps" ⇒ the FIRST nav-items block's props ONLY — NORMATIVE: matches
 * the readers above and `collectMenuAppearance`, and a section-level
 * `responsive[bp].navProps` record can only represent ONE nav-items block;
 * additional nav-items blocks are left untouched). tablet/mobile ⇒ their OWN
 * lazily-created SPARSE `responsive[bp][group]` record (a tablet patch NEVER
 * touches an existing mobile record and vice versa). `patch` values MUST be
 * valid `MenuAppearance` values OR `undefined`: an `undefined` patch value means
 * DELETE-KEY-FROM-TARGET (base-key delete on desktop; override leaf delete +
 * prune chain on tablet/mobile) — never an own `undefined` key, which would
 * break legacy byte-identity and `readMenuSectionOverrideValue`'s hasOwnProperty
 * detection. The write normalizer re-validates on save. NO auto-remove-on-
 * equality — an override exists until cleared.
 */
export function patchMenuSectionForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  group: MenuSectionOverrideGroup,
  patch: MenuBarLayout | NavItemsProps
): MenuDocumentV2 {
  const applyPatch = <T extends Record<string, unknown>>(target: T): T => {
    const next: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined)
        delete next[key]; // delete-on-undefined — never an own undefined key
      else next[key] = value;
    }
    return next as T;
  };
  return mapMenuSection(doc, sectionId, (section) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      if (group === "layout") {
        return {
          ...section,
          layout: applyPatch(section.layout as Record<string, unknown>) as MenuBarLayout,
        };
      }
      const navIndex = section.blocks.findIndex((block) => block.type === "nav-items");
      if (navIndex === -1) return section; // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((block, i) =>
          i === navIndex && block.type === "nav-items"
            ? {
                ...block,
                props: applyPatch(block.props as Record<string, unknown>) as NavItemsProps,
              }
            : block
        ),
      };
    }
    const record = section.responsive?.[bp] ?? {};
    const nextGroup = applyPatch((record[group] ?? {}) as Record<string, unknown>);
    const { [group]: _g, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextGroup).length > 0 ? { ...restRecord, [group]: nextGroup } : restRecord
    ) as MenuSectionOverride;
    const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    // Prune chain to the byte-identical legacy shape, same as clearMenuSectionOverride.
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/**
 * Explicit Reset: delete ONE override key, prune empty group ⇒ empty
 * breakpoint ⇒ empty `responsive` (port of `clearResponsiveOverride`,
 * `pageDocumentV2.ts`). Missing override ⇒ identity.
 */
export function clearMenuSectionOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  key: keyof MenuAppearance
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint]?.[group];
    if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return section;
    const { [key]: _removed, ...restGroup } = record as Record<string, unknown>;
    const { [group]: _g, ...restOverride } = section.responsive![breakpoint]!;
    const override = (
      Object.keys(restGroup).length > 0 ? { ...restOverride, [group]: restGroup } : restOverride
    ) as MenuSectionOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive: MenuSectionResponsive =
      Object.keys(override).length > 0
        ? { ...restResponsive, [breakpoint]: override }
        : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    // Prune to the byte-identical legacy shape (no empty responsive member).
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** desktop = flat leaf visibility (`visibility?.visible ?? true`; native blocks ⇒ true); tablet/mobile = their OWN override ?? DESKTOP value (mobile never reads tablet). */
export function resolveMenuBlockVisibleForDevice(
  block: MenuBlockV2,
  device: MenuDeviceKind
): boolean {
  const desktopVisible = "visibility" in block ? (block.visibility?.visible ?? true) : true;
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return desktopVisible;
  return block.responsive?.[bp]?.visibility?.visible ?? desktopVisible;
}

/**
 * Input to the render-if-visible-anywhere gate (501-02/502-02): a block with a
 * visibility override is DOM-rendered whenever visible on AT LEAST ONE device
 * and CSS-gated per branch; visible-on-neither blocks stay render-skipped.
 * Zero-arg = ANY breakpoint (back-compat: the CSS visibility plan + the
 * hand-off-to-CSS gate render-if-visible-anywhere, now seeing tablet records
 * too); with a `breakpoint` arg = that record only (502-04 badge/Reset).
 */
export const hasMenuBlockVisibilityOverride = (
  block: MenuBlockV2,
  breakpoint?: MenuResponsiveBreakpoint
): boolean =>
  breakpoint !== undefined
    ? block.responsive?.[breakpoint]?.visibility !== undefined
    : MENU_RESPONSIVE_BREAKPOINT_KEYS.some(
        (bp) => block.responsive?.[bp]?.visibility !== undefined
      );

/**
 * tablet/mobile ⇒ their OWN `responsive[bp].visibility` record (any block type,
 * incl. menu-native); desktop ⇒ FLAT `visibility`, LEAF blocks only (native
 * blocks carry no flat visibility by contract — documented no-op for them on
 * desktop). Mirrors `setBlockVisibleForBreakpoint` (`pageEditorMutationActions.ts`).
 */
export function setMenuBlockVisibleForDevice(
  doc: MenuDocumentV2,
  blockId: string,
  device: MenuDeviceKind,
  visible: boolean
): MenuDocumentV2 {
  return mapMenuBlock(doc, blockId, (block) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      // Direct discriminant comparisons (not the type-guard helper) so the
      // union narrows to the leaf members that carry flat `visibility`.
      if (block.type === "cta-button" || block.type === "divider" || block.type === "spacer") {
        return { ...block, visibility: { visible } };
      }
      return block; // menu-native on desktop ⇒ documented no-op
    }
    return {
      ...block,
      responsive: {
        ...(block.responsive ?? {}),
        [bp]: { ...(block.responsive?.[bp] ?? {}), visibility: { visible } },
      },
    };
  });
}

/**
 * Explicit reset; prunes empty `mobile` ⇒ empty `responsive` ⇒ deletes the
 * member (port of `clearBlockResponsiveOverride`, `pageDocumentV2.ts`).
 * Missing override ⇒ identity.
 */
export function clearMenuBlockVisibilityOverride(
  doc: MenuDocumentV2,
  blockId: string,
  breakpoint: MenuResponsiveBreakpoint
): MenuDocumentV2 {
  return mapMenuBlock(doc, blockId, (block) => {
    const record = block.responsive?.[breakpoint];
    if (!record || record.visibility === undefined) return block;
    const { visibility: _removed, ...restOverride } = record;
    const { [breakpoint]: _b, ...restResponsive } = block.responsive!;
    const responsive =
      Object.keys(restOverride).length > 0
        ? { ...restResponsive, [breakpoint]: restOverride }
        : restResponsive;
    const next: MenuBlockV2 = { ...block, responsive };
    // Prune to the byte-identical legacy shape (no empty responsive member).
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- legacy adapter ---------------------------------------------------------

/**
 * Seeds a document from the existing appearance+extras WITHOUT writing (used on
 * first Design open). FRESH-MENU CONTRACT: returns `null` when there is NOTHING
 * legacy to seed (appearance === null AND no extras) so the TASK-499-03 seed
 * chain falls through to `createDefaultMenuDocumentV2()` (which DOES include a
 * brand(text) block); a non-null adapter would make that fall-through dead code
 * and seed a brand-less fresh Design.
 */
export function buildMenuDocumentV2FromLegacy(
  appearance: MenuAppearance | null,
  extras: PageBlockV2[]
): MenuDocumentV2 | null {
  if (appearance === null && extras.length === 0) return null;

  const source = appearance ?? {};
  const layout = pickAppearance(source, MENU_BAR_LAYOUT_KEYS) as MenuBarLayout;
  const navProps = pickAppearance(source, NAV_ITEMS_PROP_KEYS) as NavItemsProps;

  const blocks: MenuBlockV2[] = [
    { id: createMenuDocumentId("blk"), type: "nav-items", props: navProps },
  ];
  for (const block of extras) {
    if (block.type === "button") {
      blocks.push({
        id: block.id,
        type: "cta-button",
        props: block.props,
        style: block.style,
        visibility: block.visibility,
      });
    } else if (block.type === "image") {
      blocks.push({
        id: block.id,
        type: "brand",
        props: { mode: "image", href: "/", image: block.props },
      });
    }
  }

  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: createMenuDocumentId("sec"),
        type: "menu-bar",
        name: sectionTypeName["menu-bar"],
        layout,
        blocks,
      },
    ],
  };
}

// --- published / stored resolvers -------------------------------------------

/**
 * Public render resolver for the published menu document snapshot. Mirrors
 * `resolvePublishedMenuAppearance`: the `published` snapshot first; legacy
 * envelopes without `published` fall back to the top-level `document`;
 * absent/empty ⇒ `null` (legacy appearance+extras treatment).
 */
export function resolvePublishedMenuDocument(settings: unknown): MenuDocumentV2 | null {
  if (!isPlainObject(settings)) return null;
  const published = settings.published;
  const raw = isPlainObject(published) ? published.document : settings.document;
  if (raw === undefined) return null;
  const doc = normalizeStoredMenuDocumentV2ForRead(raw);
  return isEmptyMenuDocument(doc) ? null : doc;
}

/**
 * Draft resolver for the editor: reads the top-level `document` draft only
 * (never the published snapshot), fail-closed; absent/empty ⇒ `null`.
 */
export function resolveStoredMenuDocument(settings: unknown): MenuDocumentV2 | null {
  if (!isPlainObject(settings)) return null;
  const raw = settings.document;
  if (raw === undefined) return null;
  const doc = normalizeStoredMenuDocumentV2ForRead(raw);
  return isEmptyMenuDocument(doc) ? null : doc;
}

export { EMPTY_MENU_DOCUMENT };
