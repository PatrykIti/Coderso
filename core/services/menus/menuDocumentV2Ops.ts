/**
 * menuDocumentV2Ops — document CRUD and authoring helpers of the menu document
 * (TASK-542-01-L01 split): default block/document factories, find/insert/
 * delete/reorder, the resolved-default provider, legacy import, and the
 * published/stored resolvers. Bun-free, import-side-effect free (Vitest lane).
 */
import { createPageBlockV2, type PageBlockV2 } from "../pages/pageDocumentV2";
import { sanitizeAuthoringMediaUrl } from "../pages/pageAuthoringSanitizers";
import { SHELL_APPEARANCE_DEFAULTS } from "../../site/siteShellCss";
import type { MenuAppearance } from "./normalizeMenuAppearance";
import {
  MENU_BAR_LAYOUT_KEYS,
  MENU_DOCUMENT_SCHEMA_VERSION,
  NAV_ITEMS_PROP_KEYS,
  type BrandProps,
  type MenuBarLayout,
  type MenuBlockType,
  type MenuBlockV2,
  type MenuDeviceKind,
  type MenuDocumentV2,
  type MenuSectionV2,
  type NavLevelStyleLevel,
  type NavItemsProps,
} from "./menuDocumentV2Schema";
import {
  isEmptyMenuDocument,
  MENU_LEAF_PAGE_TYPES,
  normalizeStoredMenuDocumentV2ForRead,
  EMPTY_MENU_DOCUMENT,
} from "./menuDocumentV2Normalize";
import {
  isPlainObject,
  MENU_SHELL_DEFAULT_LINK_PX,
  MENU_SHELL_DEFAULT_LINK_PY,
  MENU_SHELL_DEFAULT_LINK_RADIUS,
  MENU_SHELL_SUBLIST_MIN_WIDTH,
  NAV_CHROME_DEFAULTS,
  NAV_CHROME_KEYS,
  NAV_FONT_SIZE_INHERITED,
  pickAppearance,
  sectionTypeName,
  MENU_SHELL_SUBLIST_PADDING,
} from "./menuDocumentV2Fields";
import {
  menuDeviceBreakpoint,
  readMenuSectionBaseValue,
  resolveMenuNavLevelStyle,
} from "./menuDocumentV2Devices";

// Authoring-time ID generation for the CREATION helpers below (the normalizer
// never invents an ID — TASK-542-01-L01). Browser-safe: no `node:crypto`.
const randomMenuDocumentUuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const createMenuDocumentId = (prefix: string) =>
  `${prefix}_${randomMenuDocumentUuid().slice(0, 8)}`;
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

/**
 * Brand IMAGE src resolver (TASK-504-01 §3a, B1 model half; SINGLE home). Takes
 * the NORMALIZED brand `image` shape (the page image-leaf props
 * `{ assetId, src, alt, caption, fit }`) and returns the resolvable `src` (or
 * null when absent/unresolvable), reusing the SAME `sanitizeAuthoringMediaUrl`
 * the image leaf uses to derive its `src` (`pageRendererV2.tsx` renderImage). Do
 * NOT re-implement in 504-03/504-04 — they IMPORT this.
 */
export function resolveBrandImageSrc(image: BrandProps["image"]): string | null {
  if (!isPlainObject(image)) return null;
  return sanitizeAuthoringMediaUrl(image.src) ?? null;
}

export type MenuControlDefault = {
  value: number | string | boolean | undefined;
  sourceLabel: string;
};

/** level param vocabulary: 0 = level-0 nav scalar/navChrome; 1|2 = NavLevelStyle;
 *  "base" = brand OR layout scalar (a DISTINCT source domain, never a level-0 nav key). */
export type MenuControlDefaultLevel = 0 | 1 | 2 | "base";

// Gated present-only numerics: unset ⇒ NO element exists ⇒ NO meaningful resolved
// number; range.min is FORBIDDEN here (the exact misleading 0/80 bug F2 kills).
const MENU_GATED_PRESENT_ONLY_OFF_KEYS = [
  "itemDividerWidth",
  "indicatorThickness",
  "transitionMs",
  "hoverLift",
] as const;
// TASK-508-01 R1(a): containerPaddingX/Y REMOVED — the sublist container has a REAL
// base-sheet default (6px), surfaced via the explicit branches in
// resolveNavKeyThemeDefault. The level-0 pill (navPillRadius/PaddingX/PaddingY) genuinely
// has NO base-sheet default when unset (no element painted) ⇒ stays gated "Not applied".
const MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS = [
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
] as const;

// Level-style field name ⇒ level-0 nav-base SCALAR name (the analogous cascade key).
const NAV_LEVEL_TO_BASE_SCALAR: Record<string, keyof MenuAppearance> = {
  paddingX: "linkPaddingX",
  paddingY: "linkPaddingY",
  radius: "linkRadius",
  gap: "itemGap",
};

const isMenuLayoutKey = (key: string): boolean =>
  (MENU_BAR_LAYOUT_KEYS as readonly string[]).includes(key);

const humanizeControlValue = (value: unknown): string =>
  typeof value === "boolean"
    ? value
      ? "On"
      : "Off"
    : typeof value === "string"
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : String(value);

/** Value + unit for the "Inherits level N (…)" / device labels. */
const formatControlValue = (key: string, value: unknown): string => {
  if (typeof value === "number") return `${value}${key === "transitionMs" ? "ms" : "px"}`;
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
};

/** Terminal theme / base-sheet default for a nav (level 0/1/2) key (case 3). */
const resolveNavKeyThemeDefault = (key: string): MenuControlDefault => {
  if (key === "fontSize")
    return {
      value: NAV_FONT_SIZE_INHERITED,
      sourceLabel: `Inherited from theme (${NAV_FONT_SIZE_INHERITED}px)`,
    };
  if (key === "paddingX" || key === "linkPaddingX")
    return {
      value: MENU_SHELL_DEFAULT_LINK_PX,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_PX}px`,
    };
  if (key === "paddingY" || key === "linkPaddingY")
    return {
      value: MENU_SHELL_DEFAULT_LINK_PY,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_PY}px`,
    };
  if (key === "radius" || key === "linkRadius")
    return {
      value: MENU_SHELL_DEFAULT_LINK_RADIUS,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_RADIUS}px`,
    };
  // TASK-508-01 R1(a): real base-sheet defaults for the dropdown CONTAINER controls
  // (siteShellCss.ts:151 `.site-nav-sublist{min-width:180px;padding:6px}`). Hint/thumb
  // only — CSS emission (levelContainerDecls, 508-02) stays present-only on the STORED value.
  if (key === "minWidth")
    return {
      value: MENU_SHELL_SUBLIST_MIN_WIDTH,
      sourceLabel: `Default ${MENU_SHELL_SUBLIST_MIN_WIDTH}px`,
    };
  if (key === "containerPaddingX" || key === "containerPaddingY")
    return {
      value: MENU_SHELL_SUBLIST_PADDING,
      sourceLabel: `Default ${MENU_SHELL_SUBLIST_PADDING}px`,
    };
  if ((MENU_GATED_PRESENT_ONLY_OFF_KEYS as readonly string[]).includes(key))
    return { value: undefined, sourceLabel: "Off" };
  if ((MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS as readonly string[]).includes(key))
    return { value: undefined, sourceLabel: "Not applied" };
  if (Object.prototype.hasOwnProperty.call(NAV_CHROME_DEFAULTS, key)) {
    const value = (NAV_CHROME_DEFAULTS as Record<string, string | boolean>)[key];
    return { value, sourceLabel: `Default (${humanizeControlValue(value)})` };
  }
  if (key === "gap" || key === "itemGap")
    return {
      value: SHELL_APPEARANCE_DEFAULTS.itemGap,
      sourceLabel: `Default ${SHELL_APPEARANCE_DEFAULTS.itemGap}px`,
    };
  // Other enums/colors with no declared default ⇒ present-only, no hint value.
  return { value: undefined, sourceLabel: "Not set" };
};

/** Terminal theme default for a "base" (brand OR layout) key (case 4). */
const resolveBaseKeyThemeDefault = (key: string): MenuControlDefault => {
  if (isMenuLayoutKey(key)) {
    const value = (SHELL_APPEARANCE_DEFAULTS as Record<string, unknown>)[key];
    if (typeof value === "number") return { value, sourceLabel: `Default ${value}px` };
    if (value === undefined || value === null) return { value: undefined, sourceLabel: "Not set" };
    return {
      value: value as string | boolean,
      sourceLabel: `Default (${humanizeControlValue(value)})`,
    };
  }
  // Brand key: KEY-based from the shell defaults where present; most brand keys
  // (color/letterSpacing/height/maxWidth) have NO theme default ⇒ present-only.
  const value = (SHELL_APPEARANCE_DEFAULTS as Record<string, unknown>)[key];
  if (value === undefined || value === null) return { value: undefined, sourceLabel: "Not set" };
  if (typeof value === "number") return { value, sourceLabel: `Inherited from theme (${value}px)` };
  return {
    value: value as string | boolean,
    sourceLabel: `Default (${humanizeControlValue(value)})`,
  };
};

/** Read the level-0 nav-base value (scalar OR navChrome) for the analogous key. */
const readNavBaseAnalogValue = (section: MenuSectionV2, key: string): unknown => {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  if (navBlock?.type !== "nav-items") return undefined;
  const props = navBlock.props;
  if ((NAV_CHROME_KEYS as readonly string[]).includes(key)) {
    const chrome = props.navChrome;
    return chrome && Object.prototype.hasOwnProperty.call(chrome, key)
      ? (chrome as Record<string, unknown>)[key]
      : undefined;
  }
  const scalarKey = NAV_LEVEL_TO_BASE_SCALAR[key] ?? key;
  return Object.prototype.hasOwnProperty.call(props, scalarKey)
    ? (props as Record<string, unknown>)[scalarKey]
    : undefined;
};

/** Desktop's OWN authored value at the given level (the base a device inherits). */
const readOwnDesktopValue = (
  section: MenuSectionV2,
  level: MenuControlDefaultLevel,
  key: string
): unknown => {
  if (level === "base") {
    // Layout is section-scoped (reachable); brand is BLOCK-scoped (NOT reachable).
    return isMenuLayoutKey(key)
      ? readMenuSectionBaseValue(section, "layout", key as keyof MenuAppearance)
      : undefined;
  }
  if (level === 0) return readNavBaseAnalogValue(section, key);
  const resolved = resolveMenuNavLevelStyle(section, "desktop", level);
  return (resolved as Record<string, unknown>)[key];
};

/**
 * Returns the EFFECTIVE value + human source label for an UNSET control so the
 * editor never hardcodes defaults. Section-only (4-param): 506-04 computes each
 * brand control's `isSet` at its call site (brand is block-scoped) and passes it
 * in. NEVER emits CSS / mutates the doc — pure read/derivation.
 */
export function resolveMenuControlDefault(
  section: MenuSectionV2,
  device: MenuDeviceKind,
  level: MenuControlDefaultLevel,
  key: string
): MenuControlDefault {
  const bp = menuDeviceBreakpoint(device);
  // Case 1 — tablet/mobile with the field unset on THIS device ⇒ inherit RESOLVED
  // desktop at the SAME level (device override was already ruled out — the editor
  // only calls this for an unset control).
  if (bp !== null) {
    const own = readOwnDesktopValue(section, level, key);
    if (own !== undefined)
      return { value: own as MenuControlDefault["value"], sourceLabel: "Inherited from desktop" };
    // Brand "base" desktop value is block-scoped ⇒ unreachable from `section`
    // ⇒ present-only, NO misleading "Inherited from desktop".
    if (level === "base" && !isMenuLayoutKey(key))
      return { value: undefined, sourceLabel: "Not set" };
    // Desktop unset at this level ⇒ RECURSE the desktop cascade (case 2/3/4). Reuse
    // its resolved value but keep the device-inherit label; a still-undefined
    // desktop value stays undefined (never "Inherited from desktop (undefined)").
    const walked = resolveMenuControlDefault(section, "desktop", level, key);
    return walked.value === undefined
      ? { value: undefined, sourceLabel: walked.sourceLabel }
      : { value: walked.value, sourceLabel: "Inherited from desktop" };
  }

  // Desktop.
  if (level === "base") return resolveBaseKeyThemeDefault(key); // case 4
  if (level === 0) return resolveNavKeyThemeDefault(key); // case 3

  // Case 2 — level N (1/2) unset ⇒ FULL CASCADE WALK of shallower LEVELS (the walk
  // lives here because resolveMenuNavLevelStyle does NOT self-fall-back a level).
  for (let l = level - 1; l >= 1; l -= 1) {
    const resolved = resolveMenuNavLevelStyle(section, "desktop", l as NavLevelStyleLevel);
    const value = (resolved as Record<string, unknown>)[key];
    if (value !== undefined)
      return {
        value: value as MenuControlDefault["value"],
        sourceLabel: `Inherits level ${l} (${formatControlValue(key, value)})`,
      };
  }
  // All shallower NavLevelStyle levels unset ⇒ fall through to the LEVEL-0
  // nav-base/navChrome value (the real next cascade stop).
  const navBaseValue = readNavBaseAnalogValue(section, key);
  if (navBaseValue !== undefined)
    return {
      value: navBaseValue as MenuControlDefault["value"],
      sourceLabel: `Inherits level 0 (${formatControlValue(key, navBaseValue)})`,
    };
  // Level 0 also unset ⇒ theme / base-sheet default.
  return resolveNavKeyThemeDefault(key);
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
