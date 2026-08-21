/**
 * menuDocumentV2 — facade over the menu Design tab's document model
 * (TASK-542-01-L01 split). Re-exports every public symbol of the four
 * cohesive modules so existing import sites keep importing this path
 * unchanged; adds no new public surface of its own besides the split
 * contract's `menuDocumentHasScrolledVariantForAnyDevice`. Type-only symbols
 * are re-exported with `export type` so the Bun runtime never resolves them
 * as values.
 *
 * Modules:
 * - `menuDocumentV2Schema` — types, key sets, ranges, defaults, errors.
 * - `menuDocumentV2Fields` — field-level normalizers + box-shadow validator.
 * - `menuDocumentV2Normalize` — strict pipeline, IDs, topology, entry points.
 * - `menuDocumentV2Devices` — per-device resolve/read/patch/clear helpers.
 * - `menuDocumentV2Ops` — CRUD, defaults, legacy import, resolvers.
 */
export type {
  BrandProps,
  BrandStyle,
  MenuBarLayout,
  MenuBlockOverride,
  MenuBlockResponsive,
  MenuBlockType,
  MenuBlockV2,
  MenuDeviceKind,
  MenuDocumentV2,
  MenuResponsiveBreakpoint,
  MenuSectionOverride,
  MenuSectionOverrideGroup,
  MenuSectionResponsive,
  MenuSectionType,
  MenuSectionV2,
  MenuUtilityProps,
  NavChromeStyle,
  NavItemsProps,
  NavLevelStyle,
  NavLevelStyleLevel,
  NavLevelStyles,
} from "./menuDocumentV2Schema";
export {
  // --- Schema values ---
  isMenuDocumentError,
  MENU_BAR_LAYOUT_NUMBER_RANGES,
  menuBlockTypes,
  MenuDocumentError,
  MENU_DOCUMENT_INVALID,
  MENU_DOCUMENT_MAX_SECTIONS,
  MENU_DOCUMENT_SCHEMA_VERSION,
  MENU_NAV_DEVICE_DEFINING_KEYS,
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  MENU_SECTION_MAX_BLOCKS,
  menuSectionTypes,
} from "./menuDocumentV2Schema";
export {
  // --- Fields ---
  BRAND_STYLE_NUMBER_RANGES,
  MENU_BRAND_TEXT_MAX_LENGTH,
  MENU_SHELL_DEFAULT_LINK_PX,
  MENU_SHELL_DEFAULT_LINK_PY,
  MENU_SHELL_DEFAULT_LINK_RADIUS,
  MENU_SHELL_SUBLIST_MIN_WIDTH,
  MENU_SHELL_SUBLIST_PADDING,
  NAV_CHROME_DEFAULTS,
  NAV_CHROME_NUMBER_RANGES,
  NAV_FONT_SIZE_INHERITED,
  NAV_LEVEL_NUMBER_RANGES,
  NAV_LINK_NUMBER_RANGES,
  normalizeMenuBoxShadowValue,
} from "./menuDocumentV2Fields";
export {
  // --- Normalize ---
  EMPTY_MENU_DOCUMENT,
  isEmptyMenuDocument,
  normalizeMenuDocumentV2ForWrite,
  normalizeStoredMenuDocumentV2ForRead,
} from "./menuDocumentV2Normalize";
export {
  // --- Devices ---
  clearMenuBlockVisibilityOverride,
  clearMenuBrandStyleBase,
  clearMenuBrandStyleOverride,
  clearMenuNavChromeBase,
  clearMenuNavChromeOverride,
  clearMenuNavLevelStyleBase,
  clearMenuNavLevelStyleOverride,
  clearMenuSectionBase,
  clearMenuSectionOverride,
  hasMenuBlockVisibilityOverride,
  hasMenuBrandStyleOverride,
  menuDocumentHasScrolledVariantForAnyDevice,
  patchMenuBrandStyleForDevice,
  patchMenuNavChromeForDevice,
  patchMenuNavLevelStyleForDevice,
  patchMenuSectionForDevice,
  readMenuBrandStyleBaseValue,
  readMenuBrandStyleOverrideValue,
  readMenuNavChromeBaseValue,
  readMenuNavChromeOverrideValue,
  readMenuNavLevelStyleBaseValue,
  readMenuNavLevelStyleOverrideValue,
  readMenuSectionBaseValue,
  readMenuSectionOverrideValue,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  resolveMenuNavChrome,
  resolveMenuNavLevelStyle,
  resolveMenuSectionAppearanceForDevice,
  setMenuBlockVisibleForDevice,
} from "./menuDocumentV2Devices";
export type {
  // --- Ops types ---
  MenuControlDefault,
  MenuControlDefaultLevel,
} from "./menuDocumentV2Ops";
export {
  // --- Ops values ---
  buildMenuDocumentV2FromLegacy,
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  deleteMenuBlock,
  findMenuBlock,
  insertMenuBlock,
  reorderMenuBlock,
  resolveBrandImageSrc,
  resolveMenuControlDefault,
  resolvePublishedMenuDocument,
  resolveStoredMenuDocument,
} from "./menuDocumentV2Ops";
