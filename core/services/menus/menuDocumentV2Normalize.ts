/**
 * menuDocumentV2Normalize — the strict document pipeline of the menu document
 * (TASK-542-01-L01): block/section/document normalizers, exact-key gates,
 * deterministic write/stored-read ID allocation, topology assertion, the
 * write/read entry points, and the empty-document constant. Bun-free,
 * import-side-effect free (Vitest lane).
 */
import {
  MenuDocumentError,
  MENU_DOCUMENT_MAX_SECTIONS,
  MENU_DOCUMENT_SCHEMA_VERSION,
  MENU_LEAF_BLOCK_TYPES,
  MENU_NATIVE_BLOCK_TYPES,
  MENU_SECTION_MAX_BLOCKS,
  menuBlockTypes,
  menuSectionTypes,
  type MenuBlockType,
  type MenuBlockV2,
  type MenuDocumentV2,
  type MenuSectionType,
  type MenuSectionV2,
} from "./menuDocumentV2Schema";
import {
  hoistMobileModeOverride,
  isPlainObject,
  normalizeBrandProps,
  normalizeMenuBarLayout,
  normalizeMenuBlockResponsive,
  normalizeMenuSectionResponsive,
  normalizeMenuUtilityProps,
  normalizeNavItemsProps,
  normalizeThroughPageLeaf,
  requireArray,
  sectionTypeName,
  type MenuResponsiveCarveout,
} from "./menuDocumentV2Fields";

// --- deterministic ID / topology contract (TASK-542-01-L01) ------------------

// Exact-key gate at the document level: a non-empty menu document is ONLY
// `schemaVersion` + `sections`. Unknown top-level keys (e.g. a legacy flat
// `blocks`/`overrides` shape) fail closed instead of being laundered through.
const MENU_DOCUMENT_KEYS = ["schemaVersion", "sections"] as const;

// Canonical write grammar for authoring IDs: lowercase start, then lowercase
// letters/digits/`_`/`-`, at most 160 characters total.
const MENU_ID = /^[a-z][a-z0-9_-]{0,159}$/;

const requireWriteId = (value: unknown, path: string): string => {
  if (typeof value !== "string") throw new MenuDocumentError(path);
  const id = value.trim();
  if (!MENU_ID.test(id)) throw new MenuDocumentError(path);
  return id;
};

// Stored-read repair: preserve valid non-colliding legacy IDs verbatim; for
// missing/syntactically-invalid values use the stable structural-path fallback
// and for collisions allocate the next free suffix, reserving the marker bytes
// BEFORE slicing so a duplicate maximum-length ID stays within the grammar.
const allocateLegacyId = (raw: unknown, fallback: string, used: Set<string>): string => {
  const candidate = typeof raw === "string" ? raw.trim() : "";
  const preferred = MENU_ID.test(candidate) ? candidate : fallback;
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  for (let suffix = 2; ; suffix += 1) {
    const marker = `-${suffix}`;
    const base = preferred.slice(0, 160 - marker.length);
    const id = `${base}${marker}`;
    if (!MENU_ID.test(id)) throw new MenuDocumentError("document.id");
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
};

const assertMenuTopology = (sections: MenuSectionV2[]): void => {
  const invalid = (path: string): never => {
    throw new MenuDocumentError(path);
  };
  // sections.length === 0 is the explicit clear sentinel and is handled by the
  // caller BEFORE topology validation.
  if (sections.length === 0) return;
  if (sections.length > 2) invalid("document.sections");
  if (sections[0]?.type !== "menu-bar") invalid("document.sections[0].type");
  if (sections.slice(1).some((section) => section.type !== "menu-drawer"))
    invalid("document.sections[1].type");
  if (sections.filter((section) => section.type === "menu-bar").length !== 1)
    invalid("document.sections");
  if (sections.filter((section) => section.type === "menu-drawer").length > 1)
    invalid("document.sections");
};

export const MENU_LEAF_PAGE_TYPES = {
  "cta-button": "button",
  divider: "divider",
  spacer: "spacer",
} as const;

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
  mode: "write" | "stored-read",
  sectionIndex: number,
  blockIndex: number,
  ids: Set<string>
): MenuBlockV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const type = value.type;
  if (typeof type !== "string" || !(menuBlockTypes as readonly string[]).includes(type)) {
    throw new MenuDocumentError(`${path}.type`);
  }
  const blockType = type as MenuBlockType;
  const id =
    mode === "write"
      ? requireWriteId(value.id, `${path}.id`)
      : allocateLegacyId(value.id, `blk-${sectionIndex}-${blockType}-${blockIndex}`, ids);

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
      // Leaf/brand validation stays on the STRICT page WRITE pipeline in BOTH
      // document paths: a malformed leaf prop degrades the whole doc even on a
      // stored read (the `mode` argument drives ID policy only, not leaf leniency).
      props: normalizeBrandProps(value.props ?? {}, "write", `${path}.props`),
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
    const leaf = normalizeThroughPageLeaf({ ...leafInput, id }, pageType, "write", path);
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
  carveout: MenuResponsiveCarveout,
  sectionIndex: number,
  ids: Set<string>
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
    mode === "write"
      ? requireWriteId(value.id, `${path}.id`)
      : allocateLegacyId(value.id, `sec-${sectionType}-${sectionIndex}`, ids);
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
    normalizeMenuBlock(block, `${path}.blocks[${index}]`, mode, sectionIndex, index, ids)
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

const normalizeMenuDocumentV2 = (value: unknown, mode: "write" | "stored-read"): MenuDocumentV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError("document");
  // Exact-key gate: unknown top-level keys (legacy flat topology) fail closed.
  for (const key of Object.keys(value)) {
    if (!MENU_DOCUMENT_KEYS.includes(key as (typeof MENU_DOCUMENT_KEYS)[number]))
      throw new MenuDocumentError(`document.${key}`);
  }
  const sections = requireArray(value.sections, "document.sections");
  if (sections.length > MENU_DOCUMENT_MAX_SECTIONS)
    throw new MenuDocumentError("document.sections");
  // Schema-first, NO stamp-on-absent: a persisted document MUST carry the EXACT
  // current marker (reject absent OR lower/unknown). The empty clear sentinel is
  // the ONLY shape exempt from versioning, and only when it is well-formed.
  if (sections.length > 0 && value.schemaVersion !== MENU_DOCUMENT_SCHEMA_VERSION) {
    throw new MenuDocumentError("document.schemaVersion");
  }
  const ids = new Set<string>();
  const carveout: MenuResponsiveCarveout = mode === "write" ? "reject" : "prune";
  const normalizedSections = sections.map((section, index) =>
    normalizeMenuSection(section, `document.sections[${index}]`, mode, carveout, index, ids)
  );
  if (normalizedSections.length === 0) return EMPTY_MENU_DOCUMENT;
  assertMenuTopology(normalizedSections);
  // Leaf/brand `mode` stays the literal "write" in BOTH paths (the carve-out is
  // a separate narrow channel — leaf validation never flips to the lenient page
  // read path on a stored read).
  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: normalizedSections,
  };
};

export function normalizeMenuDocumentV2ForWrite(value: unknown): MenuDocumentV2 {
  return normalizeMenuDocumentV2(value, "write");
}

export const EMPTY_MENU_DOCUMENT: MenuDocumentV2 = {
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [],
};

export function normalizeStoredMenuDocumentV2ForRead(value: unknown): MenuDocumentV2 {
  // Fail-closed EXCEPT the one conscious device-defining carve-out (prune): a
  // marker-less/lower-version or otherwise-invalid stored document throws ⇒
  // degrades to empty here ⇒ resolver null ⇒ legacy look.
  try {
    return normalizeMenuDocumentV2(value, "stored-read");
  } catch {
    return { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [] };
  }
}

export const isEmptyMenuDocument = (doc: MenuDocumentV2 | null): boolean =>
  !doc || doc.sections.length === 0 || doc.sections.every((section) => section.blocks.length === 0);
