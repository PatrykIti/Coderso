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
 * NO block `style`/`visibility`: their appearance flows entirely through the
 * validated menu-bar `layout` + nav-items appearance props, so per-block
 * style/visibility would be redundant AND unvalidatable (the page
 * `normalizeBlockStyle`/`normalizeBlockVisibility` validators are
 * module-private and MUST NOT be deep-imported). Only the reused leaf blocks
 * (`cta-button`/`divider`/`spacer`) carry style/visibility, validated for free
 * by the page block pipeline.
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
] as const satisfies readonly (keyof MenuAppearance)[];

export type MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]>;
export type NavItemsProps = Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]>;

export type BrandProps = {
  mode: "text" | "image";
  href: string;
  /** Validated page `image` leaf props (assetId/src/alt/caption/fit). */
  image?: Record<string, unknown>;
};

export type MenuUtilityProps = {
  label?: string;
};

export type MenuBlockV2 =
  | { id: string; type: "nav-items"; props: NavItemsProps }
  | { id: string; type: "brand"; props: BrandProps }
  | { id: string; type: "search" | "account" | "language"; props: MenuUtilityProps }
  | {
      id: string;
      type: "cta-button";
      props: Record<string, unknown>;
      style?: PageBlockStyleV2;
      visibility?: PageBlockVisibilityV2;
    }
  | {
      id: string;
      type: "divider" | "spacer";
      props: Record<string, unknown>;
      style?: PageBlockStyleV2;
      visibility?: PageBlockVisibilityV2;
    };

export type MenuSectionV2 = {
  id: string;
  type: MenuSectionType;
  name: string;
  layout: MenuBarLayout;
  blocks: MenuBlockV2[];
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

const BRAND_PROP_KEYS = ["mode", "href", "image"] as const;

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

const MENU_NATIVE_BLOCK_KEYS = ["id", "type", "props"];
const MENU_LEAF_BLOCK_KEYS = ["id", "type", "props", "style", "visibility"];

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

  // Reject-unknown at the block level: menu-native blocks carry NO style/
  // visibility, only reused leaf blocks do.
  assertBlockKeys(
    value,
    isMenuNativeBlockType(blockType) ? MENU_NATIVE_BLOCK_KEYS : MENU_LEAF_BLOCK_KEYS,
    path
  );

  if (blockType === "nav-items") {
    return {
      id,
      type: "nav-items",
      props: normalizeNavItemsProps(value.props ?? {}, `${path}.props`),
    };
  }
  if (blockType === "brand") {
    return {
      id,
      type: "brand",
      props: normalizeBrandProps(value.props ?? {}, mode, `${path}.props`),
    };
  }
  if (blockType === "search" || blockType === "account" || blockType === "language") {
    return {
      id,
      type: blockType,
      props: normalizeMenuUtilityProps(value.props ?? {}, `${path}.props`),
    };
  }
  if (isMenuLeafBlockType(blockType)) {
    const pageType = MENU_LEAF_PAGE_TYPES[blockType];
    const leaf = normalizeThroughPageLeaf({ ...value, id }, pageType, mode, path);
    return {
      id,
      type: blockType,
      props: leaf.props,
      style: leaf.style,
      visibility: leaf.visibility,
    };
  }
  throw new MenuDocumentError(`${path}.type`);
};

const MENU_SECTION_KEYS = ["id", "type", "name", "layout", "blocks"];

const normalizeMenuSection = (
  value: unknown,
  path: string,
  mode: "write" | "stored-read"
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
  const rawBlocks = requireArray(value.blocks ?? [], `${path}.blocks`);
  if (rawBlocks.length > MENU_SECTION_MAX_BLOCKS) throw new MenuDocumentError(`${path}.blocks`);
  const blocks = rawBlocks.map((block, index) =>
    normalizeMenuBlock(block, `${path}.blocks[${index}]`, mode)
  );
  return { id, type: sectionType, name, layout, blocks };
};

// --- write / read / resolvers -----------------------------------------------

export function normalizeMenuDocumentV2ForWrite(value: unknown): MenuDocumentV2 {
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
  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: sections.map((section, index) =>
      normalizeMenuSection(section, `document.sections[${index}]`, "write")
    ),
  };
}

const EMPTY_MENU_DOCUMENT: MenuDocumentV2 = {
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [],
};

export function normalizeStoredMenuDocumentV2ForRead(value: unknown): MenuDocumentV2 {
  // Fail-closed delegate to the strict writer: a marker-less/lower-version stored
  // document throws ⇒ degrades to empty here ⇒ resolver null ⇒ legacy look.
  try {
    return normalizeMenuDocumentV2ForWrite(value);
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
