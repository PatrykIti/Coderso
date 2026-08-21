/**
 * menuDocumentV2Devices — per-device resolve/read/patch/clear helpers of the
 * menu document (TASK-542-01-L01 split, TASK-501-01 surface): section
 * appearance, block visibility, brand style, nav level, nav chrome, plus the
 * responsive-only scrolled-variant helper consumed by the public front
 * (TASK-542-03-L02). Bun-free, import-side-effect free (Vitest lane).
 */
import {
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  type BrandProps,
  type BrandStyle,
  type MenuBarLayout,
  type MenuBlockOverride,
  type MenuBlockResponsive,
  type MenuBlockV2,
  type MenuDeviceKind,
  type MenuDocumentV2,
  type MenuResponsiveBreakpoint,
  type MenuSectionOverride,
  type MenuSectionOverrideGroup,
  type MenuSectionResponsive,
  type MenuSectionV2,
  type NavChromeStyle,
  type NavItemsProps,
  type NavLevelStyle,
  type NavLevelStyleLevel,
  type NavLevelStyles,
} from "./menuDocumentV2Schema";
import type { MenuAppearance } from "./normalizeMenuAppearance";
import { NAV_LEVEL_STYLE_LEVELS } from "./menuDocumentV2Fields";
export const menuDeviceBreakpoint = (device: MenuDeviceKind): MenuResponsiveBreakpoint | null =>
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
/** Deep-merge a levelStyles delta over the base (per level, per field). Scalars
 *  stay shallow (the caller spreads them); ONLY levelStyles needs the deep merge
 *  so a device override never wholesale-REPLACES a base level. */
const mergeNavLevelStyles = (
  base: NavLevelStyles | undefined,
  delta: NavLevelStyles | undefined
): NavLevelStyles | undefined => {
  if (!base && !delta) return undefined;
  const out: NavLevelStyles = {};
  for (const level of NAV_LEVEL_STYLE_LEVELS) {
    const merged = { ...(base?.[level] ?? {}), ...(delta?.[level] ?? {}) };
    if (Object.keys(merged).length > 0) out[level] = merged;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

export function resolveMenuSectionAppearanceForDevice(
  section: MenuSectionV2,
  device: MenuDeviceKind
): { layout: MenuBarLayout; navProps: NavItemsProps } {
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  const baseNavProps: NavItemsProps = navBlock?.type === "nav-items" ? navBlock.props : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) {
    // desktop: base unchanged (includes levelStyles verbatim).
    return { layout: { ...section.layout }, navProps: { ...baseNavProps } };
  }
  const override = section.responsive?.[bp]; // ONLY the device's own record
  // Scalars keep the existing shallow per-key merge; levelStyles is deep-merged
  // per level per field; navChrome shallow-merges base⊕override (like the scalars)
  // so an override field wins while unset fields inherit desktop.
  const { levelStyles: baseLevels, navChrome: baseChrome, ...baseScalars } = baseNavProps;
  const {
    levelStyles: overrideLevels,
    navChrome: overrideChrome,
    ...overrideScalars
  } = override?.navProps ?? {};
  const navProps: NavItemsProps = { ...baseScalars, ...overrideScalars };
  const mergedLevels = mergeNavLevelStyles(baseLevels, overrideLevels);
  if (mergedLevels) navProps.levelStyles = mergedLevels; // omit when empty
  const mergedChrome = { ...(baseChrome ?? {}), ...(overrideChrome ?? {}) };
  if (Object.keys(mergedChrome).length > 0) navProps.navChrome = mergedChrome; // omit when empty
  return {
    layout: { ...section.layout, ...(override?.layout ?? {}) }, // inherits desktop base
    navProps,
  };
}

/** Badge/Reset detection — reads the RAW override (undefined = inherited), never the merge. */
export function readMenuSectionOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only; the
  // runtime already reads/writes by property name) so 520-03 stays cast-free.
  key: keyof MenuAppearance | keyof MenuBarLayout
): unknown {
  const record = section.responsive?.[breakpoint]?.[group];
  return record && Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Record<string, unknown>)[key]
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
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only).
  key: keyof MenuAppearance | keyof MenuBarLayout
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

// --- TASK-504-01 per-device brand style helpers -----------------------------
// desktop ⇒ brand.props.style; tablet/mobile ⇒ their OWN sparse
// responsive[bp].style delta over the DESKTOP base (mobile never reads tablet).

/** Resolve the brand style for a device (desktop = base; tablet/mobile = base ⊕
 *  own delta, field-level cascade). Returns {} when unstyled. */
export function resolveMenuBrandStyleForDevice(
  block: MenuBlockV2,
  device: MenuDeviceKind
): BrandStyle {
  const base = block.type === "brand" ? (block.props.style ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(block.responsive?.[bp]?.style ?? {}) };
}

/** Badge/Reset RAW read — undefined = inherited (hasOwnProperty, never the merge). */
export function readMenuBrandStyleOverrideValue(
  block: MenuBlockV2,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof BrandStyle
): unknown {
  const record = block.responsive?.[breakpoint]?.style;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

export const hasMenuBrandStyleOverride = (
  block: MenuBlockV2,
  breakpoint?: MenuResponsiveBreakpoint
): boolean =>
  breakpoint !== undefined
    ? block.responsive?.[breakpoint]?.style !== undefined
    : MENU_RESPONSIVE_BREAKPOINT_KEYS.some((bp) => block.responsive?.[bp]?.style !== undefined);

/**
 * Device-forked writer. desktop ⇒ brand.props.style; tablet/mobile ⇒ own sparse
 * responsive[bp].style. An `undefined` patch value ⇒ DELETE that key (never an
 * own undefined key). Non-brand block ⇒ identity. Full prune chain: empty style
 * ⇒ drop style; empty override ⇒ drop breakpoint; empty responsive ⇒ delete
 * member (byte-identical legacy shape).
 */
export function patchMenuBrandStyleForDevice(
  doc: MenuDocumentV2,
  blockId: string,
  device: MenuDeviceKind,
  patch: Partial<BrandStyle>
): MenuDocumentV2 {
  const applyPatch = (target: BrandStyle): BrandStyle => {
    const next: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete next[key];
      else next[key] = value;
    }
    return next as BrandStyle;
  };
  return mapMenuBlock(doc, blockId, (block) => {
    if (block.type !== "brand") return block; // non-brand ⇒ identity
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      const nextStyle = applyPatch(block.props.style ?? {});
      const nextProps: BrandProps = { ...block.props };
      if (Object.keys(nextStyle).length > 0) nextProps.style = nextStyle;
      else delete nextProps.style;
      return { ...block, props: nextProps };
    }
    const record = block.responsive?.[bp] ?? {};
    const nextStyle = applyPatch(record.style ?? {});
    const { style: _s, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextStyle).length > 0 ? { ...restRecord, style: nextStyle } : restRecord
    ) as MenuBlockOverride;
    const { [bp]: _b, ...restResponsive } = block.responsive ?? {};
    const responsive: MenuBlockResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuBlockV2 = { ...block, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** Explicit Reset: delete ONE brand-style key, prune style ⇒ override ⇒ responsive. */
export function clearMenuBrandStyleOverride(
  doc: MenuDocumentV2,
  blockId: string,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof BrandStyle
): MenuDocumentV2 {
  return mapMenuBlock(doc, blockId, (block) => {
    const record = block.responsive?.[breakpoint];
    const style = record?.style;
    if (!style || !Object.prototype.hasOwnProperty.call(style, key)) return block;
    const { [key]: _removed, ...restStyle } = style;
    const { style: _s, ...restOverride } = record;
    const nextRecord = (
      Object.keys(restStyle).length > 0 ? { ...restOverride, style: restStyle } : restOverride
    ) as MenuBlockOverride;
    const { [breakpoint]: _b, ...restResponsive } = block.responsive!;
    const responsive: MenuBlockResponsive =
      Object.keys(nextRecord).length > 0
        ? { ...restResponsive, [breakpoint]: nextRecord }
        : restResponsive;
    const next: MenuBlockV2 = { ...block, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-504-01 per-device nav-LEVEL style helpers (levels 1/2 only) --------
// Level 0 reuses the EXISTING patchMenuSectionForDevice / clearMenuSectionOverride
// / readMenuSectionOverrideValue on the scalar navProps group (writing the
// linkPaddingX/linkPaddingY/linkRadius/itemGap BASE scalars, NOT NavLevelStyle
// keys — see §2a). desktop ⇒ the FIRST nav-items block props.levelStyles[level];
// tablet/mobile ⇒ section responsive[bp].navProps.levelStyles[level].

/** Single-level resolver 504-04's per-level control display consumes (the
 *  level-scoped analogue of resolveMenuSectionAppearanceForDevice). Returns {}
 *  when the level is unstyled; mobile never reads tablet. */
export function resolveMenuNavLevelStyle(
  section: MenuSectionV2,
  device: MenuDeviceKind,
  level: NavLevelStyleLevel
): NavLevelStyle {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const base = navBlock?.type === "nav-items" ? (navBlock.props.levelStyles?.[level] ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(section.responsive?.[bp]?.navProps?.levelStyles?.[level] ?? {}) };
}

/** RAW read for a level field's override (badge/Reset) — hasOwnProperty. */
export function readMenuNavLevelStyleOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): unknown {
  const record = section.responsive?.[breakpoint]?.navProps?.levelStyles?.[level];
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

const applyNavLevelPatch = (
  target: NavLevelStyle,
  patch: Partial<NavLevelStyle>
): NavLevelStyle => {
  const next: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next as NavLevelStyle;
};

/** Set a levelStyles record on a navProps group, pruning the empty level. */
const withNavLevel = (
  navProps: NavItemsProps,
  level: NavLevelStyleLevel,
  nextLevel: NavLevelStyle
): NavItemsProps => {
  const { levelStyles = {}, ...rest } = navProps;
  const { [level]: _l, ...restLevels } = levelStyles;
  const nextLevelStyles: NavLevelStyles =
    Object.keys(nextLevel).length > 0 ? { ...restLevels, [level]: nextLevel } : restLevels;
  const next: NavItemsProps = { ...rest };
  if (Object.keys(nextLevelStyles).length > 0) next.levelStyles = nextLevelStyles;
  return next;
};

/**
 * Device-forked writer for ONE level's fields. desktop ⇒ the FIRST nav-items
 * block props.levelStyles[level] (matches the .find() binding used by resolve +
 * collectMenuAppearance); tablet/mobile ⇒ section responsive[bp].navProps
 * .levelStyles[level]. delete-on-undefined + DEEP prune: field ⇒ level ⇒
 * levelStyles ⇒ navProps ⇒ override ⇒ responsive.
 */
export function patchMenuNavLevelStyleForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  level: NavLevelStyleLevel,
  patch: Partial<NavLevelStyle>
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      const navIndex = section.blocks.findIndex((block) => block.type === "nav-items");
      if (navIndex === -1) return section; // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((block, i) => {
          if (i !== navIndex || block.type !== "nav-items") return block;
          const nextLevel = applyNavLevelPatch(block.props.levelStyles?.[level] ?? {}, patch);
          return { ...block, props: withNavLevel(block.props, level, nextLevel) };
        }),
      };
    }
    const record = section.responsive?.[bp] ?? {};
    const navProps = record.navProps ?? {};
    const nextLevel = applyNavLevelPatch(navProps.levelStyles?.[level] ?? {}, patch);
    const nextNavProps = withNavLevel(navProps, level, nextLevel);
    const { navProps: _n, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0 ? { ...restRecord, navProps: nextNavProps } : restRecord
    ) as MenuSectionOverride;
    const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** Explicit Reset for one level field; full DEEP prune chain to legacy shape. */
export function clearMenuNavLevelStyleOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint];
    const levelStyle = record?.navProps?.levelStyles?.[level];
    if (!levelStyle || !Object.prototype.hasOwnProperty.call(levelStyle, key)) return section;
    const { [key]: _removed, ...restLevel } = levelStyle;
    const nextNavProps = withNavLevel(record!.navProps ?? {}, level, restLevel as NavLevelStyle);
    const { navProps: _n, ...restOverride } = record!;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0
        ? { ...restOverride, navProps: nextNavProps }
        : restOverride
    ) as MenuSectionOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0
        ? { ...restResponsive, [breakpoint]: nextRecord }
        : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-506 per-device level-0 navChrome helpers (Option B) ----------------
// desktop ⇒ FIRST nav-items block props.navChrome; tablet/mobile ⇒ section
// responsive[bp].navProps.navChrome (own sparse delta over the DESKTOP base;
// mobile never reads tablet). Mirrors the levelStyles family exactly.

/** Set/delete navChrome on a navProps group, pruning the empty member (mirror
 *  withNavLevel). */
const withNavChrome = (navProps: NavItemsProps, nextChrome: NavChromeStyle): NavItemsProps => {
  const { navChrome: _c, ...rest } = navProps;
  const next: NavItemsProps = { ...rest };
  if (Object.keys(nextChrome).length > 0) next.navChrome = nextChrome;
  return next;
};

const applyNavChromePatch = (
  target: NavChromeStyle,
  patch: Partial<NavChromeStyle>
): NavChromeStyle => {
  const next: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined)
      delete next[key]; // delete-on-undefined
    else next[key] = value;
  }
  return next as NavChromeStyle;
};

/** Single resolver 506-04's level-0 control display consumes. Returns {} when
 *  unstyled; mobile never reads tablet. */
export function resolveMenuNavChrome(
  section: MenuSectionV2,
  device: MenuDeviceKind
): NavChromeStyle {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const base = navBlock?.type === "nav-items" ? (navBlock.props.navChrome ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(section.responsive?.[bp]?.navProps?.navChrome ?? {}) };
}

/** RAW read for a navChrome field's device override (badge/Reset) — hasOwnProperty. */
export function readMenuNavChromeOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof NavChromeStyle
): unknown {
  const record = section.responsive?.[breakpoint]?.navProps?.navChrome;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** RAW read for a navChrome field's BASE value (F1 hasBaseValue predicate). */
export function readMenuNavChromeBaseValue(
  section: MenuSectionV2,
  key: keyof NavChromeStyle
): unknown {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const record = navBlock?.type === "nav-items" ? navBlock.props.navChrome : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * Device-forked writer for level-0 navChrome. desktop ⇒ the FIRST nav-items
 * block props.navChrome (matches the .find() binding used by resolve +
 * collectMenuAppearance); tablet/mobile ⇒ section responsive[bp].navProps
 * .navChrome. delete-on-undefined + DEEP prune: field ⇒ navChrome ⇒ navProps ⇒
 * override ⇒ responsive.
 */
export function patchMenuNavChromeForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  patch: Partial<NavChromeStyle>
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      const navIndex = section.blocks.findIndex((block) => block.type === "nav-items");
      if (navIndex === -1) return section; // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((block, i) => {
          if (i !== navIndex || block.type !== "nav-items") return block;
          const nextChrome = applyNavChromePatch(block.props.navChrome ?? {}, patch);
          return { ...block, props: withNavChrome(block.props, nextChrome) };
        }),
      };
    }
    const record = section.responsive?.[bp] ?? {};
    const navProps = record.navProps ?? {};
    const nextChrome = applyNavChromePatch(navProps.navChrome ?? {}, patch);
    const nextNavProps = withNavChrome(navProps, nextChrome);
    const { navProps: _n, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0 ? { ...restRecord, navProps: nextNavProps } : restRecord
    ) as MenuSectionOverride;
    const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** Explicit Reset for one navChrome field on tablet/mobile; DEEP prune to legacy shape. */
export function clearMenuNavChromeOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof NavChromeStyle
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint];
    const chrome = record?.navProps?.navChrome;
    if (!chrome || !Object.prototype.hasOwnProperty.call(chrome, key)) return section;
    const { [key]: _removed, ...restChrome } = chrome;
    const nextNavProps = withNavChrome(record!.navProps ?? {}, restChrome as NavChromeStyle);
    const { navProps: _n, ...restOverride } = record!;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0
        ? { ...restOverride, navProps: nextNavProps }
        : restOverride
    ) as MenuSectionOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0
        ? { ...restResponsive, [breakpoint]: nextRecord }
        : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-506 F1 base-record reset (desktop-branch delete + prune wrappers) ---
// Thin named API over the existing patch*ForDevice desktop `bp===null` branches
// (which already delete-on-undefined + prune to the legacy byte-stable shape).
// No new prune logic. EXCLUDES MENU_NAV_DEVICE_DEFINING_KEYS (they carry
// resolution defaults, written to base on every device — never base-reset).

/** Clear ONE flat level-0 scalar / layout base key (byte-stable legacy shape). */
export function clearMenuSectionBase(
  doc: MenuDocumentV2,
  sectionId: string,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only).
  key: keyof MenuAppearance | keyof MenuBarLayout
): MenuDocumentV2 {
  return patchMenuSectionForDevice(doc, sectionId, "desktop", group, {
    [key]: undefined,
  } as unknown as NavItemsProps);
}

/** Clear ONE per-level (1/2) base field. */
export function clearMenuNavLevelStyleBase(
  doc: MenuDocumentV2,
  sectionId: string,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): MenuDocumentV2 {
  return patchMenuNavLevelStyleForDevice(doc, sectionId, "desktop", level, { [key]: undefined });
}

/** Clear ONE level-0 navChrome base field (prunes props.navChrome → props). */
export function clearMenuNavChromeBase(
  doc: MenuDocumentV2,
  sectionId: string,
  key: keyof NavChromeStyle
): MenuDocumentV2 {
  return patchMenuNavChromeForDevice(doc, sectionId, "desktop", { [key]: undefined });
}

/** Clear ONE brand-style base field (prunes props.style → props). */
export function clearMenuBrandStyleBase(
  doc: MenuDocumentV2,
  blockId: string,
  key: keyof BrandStyle
): MenuDocumentV2 {
  return patchMenuBrandStyleForDevice(doc, blockId, "desktop", { [key]: undefined });
}

/** RAW base read for a per-level (1/2) field (F1 hasBaseValue predicate). */
export function readMenuNavLevelStyleBaseValue(
  section: MenuSectionV2,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): unknown {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const record = navBlock?.type === "nav-items" ? navBlock.props.levelStyles?.[level] : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** RAW base read for a flat level-0 scalar / layout field (F1 hasBaseValue predicate). */
export function readMenuSectionBaseValue(
  section: MenuSectionV2,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only).
  key: keyof MenuAppearance | keyof MenuBarLayout
): unknown {
  if (group === "layout") {
    return Object.prototype.hasOwnProperty.call(section.layout, key)
      ? (section.layout as Record<string, unknown>)[key]
      : undefined;
  }
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const record = navBlock?.type === "nav-items" ? navBlock.props : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Record<string, unknown>)[key]
    : undefined;
}

/** RAW base read for a brand-style field (F1 hasBaseValue predicate). */
export function readMenuBrandStyleBaseValue(block: MenuBlockV2, key: keyof BrandStyle): unknown {
  const record = block.type === "brand" ? block.props.style : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

// TASK-542 scrolled-presentation keys: an OWN authored scrolled key on the
// effective layout means the menu-bar has a scrolled variant for that device
// (base keys propagate to every device through the effective merge).
const MENU_BAR_SCROLLED_KEYS = [
  "surfaceColorScrolled",
  "borderColorScrolled",
  "borderWidthScrolled",
  "shadowScrolled",
  "shadowCustomScrolled",
] as const;

const hasOwnScrolledPresentationKey = (layout: MenuBarLayout): boolean =>
  MENU_BAR_SCROLLED_KEYS.some((key) => Object.prototype.hasOwnProperty.call(layout, key));

/**
 * True when ANY device's effective menu-bar layout is sticky AND owns at least
 * one authored scrolled presentation key. Read-only over effective layouts, so
 * it never seeds unauthored fields and preserves no-script byte identity for
 * absent/empty/no-scrolled documents. Consumed by the public front
 * (TASK-542-03-L02).
 */
export function menuDocumentHasScrolledVariantForAnyDevice(doc: MenuDocumentV2 | null): boolean {
  if (!doc || doc.sections.length === 0) return false;
  const bar = doc.sections.find((section) => section.type === "menu-bar");
  if (!bar) return false;
  return (["desktop", "tablet", "mobile"] as const).some((device) => {
    const { layout } = resolveMenuSectionAppearanceForDevice(bar, device);
    return layout.sticky === true && hasOwnScrolledPresentationKey(layout);
  });
}

// --- TASK-506 F2 resolved-default provider (single model source of truth) -----
