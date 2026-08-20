/**
 * Detail-page v1 to v2 conversion (TASK-580-03-L02).
 *
 * Canonical, pure, Bun-free implementation of the widget to V2 section
 * conversion owned by the TASK-580-03 parent. The SAME output contract is
 * consumed by:
 *   - the detail-page read adapter (`normalizeDetailPageDocumentForRead`),
 *   - the L03 SQL backfill parity fixtures
 *     (`tests/fixtures/detailPageV2Conversion/*.json`),
 *   - the editor compatibility tests.
 *
 * Determinism rules:
 *   - Section id = the v1 widget block id (one widget, one section, order-faithful).
 *   - Block ids = `<widgetId>-<role>`. Repeated static roles get a 1-based
 *     occurrence suffix starting at the SECOND occurrence
 *     (`<widgetId>-<role>-1`); per-item roles use the 0-based item index
 *     (`<widgetId>-card-0`, ...).
 *   - `navigation` / `footer` specs are `null` (dropped: the site shell owns them).
 *   - Unmapped widget types become a `custom` section with one read-only
 *     `legacy-widget` block whose `data` is preserved verbatim.
 *   - Bindings whose target widget/type/fieldPath is unknown or dropped are
 *     REMOVED with a machine-readable report (never a 404).
 *
 * The widget map/spec table lives in detailPageV2WidgetMap.ts and is re-exported
 * here for consumer compatibility. This module must stay free of `db/*`,
 * runtime/server, and settings imports.
 */
import {
  PAGE_COLLECTION_LIMIT_CLAMP,
  type PageBlockType,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionType,
  type PageSectionV2,
} from "../pages/pageDocumentV2";
import type {
  DetailPageBinding,
  DetailPageDocument,
  DetailPageDocumentV1,
  DetailPageLegacyWidgetBlockV1,
} from "./detailPageTypes";
import { readBindingPathValue } from "../utils/bindingPath";
import {
  CONTACT_SPEC,
  DEFAULT_LEGACY_SPEC,
  NEWSLETTER_SPEC,
  WIDGET_TO_V2_MAP,
  type BindingDropReport,
  type WidgetConversionItemRoleSpec,
  type WidgetConversionRoleSpec,
  type WidgetConversionSpec,
} from "./detailPageV2WidgetMap";

export {
  CONVERTED_WIDGET_TYPES,
  DEFAULT_LEGACY_SPEC,
  REGISTERED_WIDGET_TYPES,
  WIDGET_TO_V2_MAP,
} from "./detailPageV2WidgetMap";
export type {
  BindingDropReason,
  BindingDropReport,
  WidgetConversionItemRoleSpec,
  WidgetConversionRole,
  WidgetConversionRoleSpec,
  WidgetConversionSpec,
} from "./detailPageV2WidgetMap";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toSectionName = (type: PageSectionType): string =>
  type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const SECTION_DEFAULTS = {
  layout: {
    columns: 1,
    align: "start",
    justify: "start",
    maxWidth: 1080,
    stackVertical: false,
  },
  style: {
    background: "#ffffff",
    backgroundType: "color",
    backgroundImage: null,
    accent: "#0d9488",
    radius: 0,
    shadow: "none",
  },
  spacing: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingLeft: 40,
    paddingRight: 40,
    gap: 24,
  },
  visibility: {
    visible: true,
    authOnly: false,
    anchor: null,
    startsAt: null,
    endsAt: null,
  },
  blockVisibility: { visible: true },
} as const;

const ROLE_BLOCK_TYPES: Record<string, PageBlockType> = {
  heading: "heading",
  text: "text",
  badge: "badge",
  button: "button",
  image: "image",
  columns: "columns",
  divider: "divider",
  spacer: "spacer",
  collection: "collection",
  filters: "filters",
  form: "form",
  embed: "embed",
  card: "card",
  legacy: "legacy-widget",
};

const resolveRoleBlockType = (role: string): PageBlockType => {
  if (/^card-\d+$/.test(role)) return "card";
  const base = role.split(":")[0] ?? role;
  return ROLE_BLOCK_TYPES[base] ?? "legacy-widget";
};

const readRaw = (source: unknown, path: string): unknown =>
  path ? readBindingPathValue(source, path) : undefined;

const collectProps = (
  source: unknown,
  mappings: Array<{ from?: string; propPath?: string }>
): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const mapping of mappings) {
    if (!mapping.propPath) continue;
    const value = readRaw(source, mapping.from ?? "");
    if (value !== undefined) props[mapping.propPath] = value;
  }
  return props;
};

const clampCollectionLimit = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(
      PAGE_COLLECTION_LIMIT_CLAMP.min,
      Math.min(PAGE_COLLECTION_LIMIT_CLAMP.max, Math.trunc(value))
    );
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(
        PAGE_COLLECTION_LIMIT_CLAMP.min,
        Math.min(PAGE_COLLECTION_LIMIT_CLAMP.max, Math.trunc(parsed))
      );
    }
  }
  return undefined;
};

const parsePixelSize = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(PAGE_COLLECTION_LIMIT_CLAMP.max, Math.trunc(value)));
  }
  if (typeof value === "string") {
    const match = /^(\d+)/.exec(value.trim());
    if (match) return Math.max(0, Math.min(240, Number(match[1])));
  }
  return undefined;
};

const buildRoleKey = (role: string, occurrence: number): string =>
  occurrence === 0 ? role : `${role}:${occurrence}`;

const buildBlockId = (widgetId: string, role: string, occurrence: number): string =>
  occurrence === 0 ? `${widgetId}-${role}` : `${widgetId}-${role}-${occurrence}`;

const buildLegacyBlock = (
  widgetId: string,
  widgetType: string,
  data: Record<string, unknown>
): PageBlockV2 => ({
  id: `${widgetId}-legacy`,
  type: "legacy-widget",
  props: { legacyWidgetType: widgetType, data: structuredClone(data) },
  visibility: SECTION_DEFAULTS.blockVisibility,
});

const buildColumnsBlock = (widget: DetailPageLegacyWidgetBlockV1): PageBlockV2 => {
  const columns = Array.isArray(widget.data.columns) ? widget.data.columns : [];
  const count = Math.max(1, Math.min(4, columns.length));
  const block: PageBlockV2 = {
    id: `${widget.id}-columns`,
    type: "columns",
    props: { count },
    visibility: SECTION_DEFAULTS.blockVisibility,
  };

  const slots: Record<string, PageBlockV2[]> = {};
  columns.slice(0, 4).forEach((column, index) => {
    const columnId = isRecord(column) && typeof column.id === "string" ? column.id : null;
    const slotKey = `column:${index + 1}`;
    const children = columnId ? widget.slots?.[`column:${columnId}`] : undefined;
    slots[slotKey] = convertNestedWidgetChildren(children ?? []);
  });
  if (Object.keys(slots).length > 0) {
    // Slot keys are bounded to the four literal `column:1..4` keys by the
    // clamp above; the cast narrows the generic string map to the contract.
    block.slots = slots as PageBlockV2["slots"];
  }
  return block;
};

const convertNestedWidgetChildren = (blocks: DetailPageLegacyWidgetBlockV1[]): PageBlockV2[] =>
  blocks.flatMap((child) => {
    const specEntry = WIDGET_TO_V2_MAP[child.type];
    if (specEntry === null) return []; // navigation/footer children are dropped.
    const spec = specEntry ?? DEFAULT_LEGACY_SPEC;
    const section = buildSectionFromWidget(child, spec);
    if (section.blocks.length === 1 && section.blocks[0]!.type === "legacy-widget") {
      return [section.blocks[0]!];
    }
    return section.blocks;
  });

const buildOptionalTextProp = (props: Record<string, unknown>, key: string, value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) props[key] = value;
};

/**
 * Data-driven role blocks whose props are read from the widget `data` shape
 * rather than a uniform `from` path (collection/filters/form/embed/spacer).
 */
const buildDataDrivenRoleBlock = (
  widget: DetailPageLegacyWidgetBlockV1,
  role: string
): PageBlockV2 => {
  const props: Record<string, unknown> = {};
  const data = widget.data;

  if (role === "collection") {
    if (widget.type === "content-list" || widget.type === "posts-feed") {
      const source = isRecord(data.source) ? data.source : {};
      if (widget.type === "content-list") {
        buildOptionalTextProp(props, "contentTypeId", source.contentTypeId);
        buildOptionalTextProp(props, "queryId", source.listingQueryId);
      }
      // NOTE: the V2 collection block has no relatedSourceId/sourceId prop
      // keys (pageBlockPropKeys.collection). Related-source resolution falls
      // back to single-source auto-selection, so those v1 fields are NOT
      // carried into the converted document. Bindings targeting them drop as
      // unmapped_prop_path.
      const limit = clampCollectionLimit(source.limit);
      if (limit !== undefined) props.limit = limit;
    }
  } else if (role === "filters") {
    buildOptionalTextProp(props, "queryId", data.listingQueryId);
    if (typeof data.autoApply === "boolean") props.autoApply = data.autoApply;
    if (typeof data.showSearch === "boolean") props.showSearch = data.showSearch;
    if (typeof data.showCount === "boolean") props.showCount = data.showCount;
    buildOptionalTextProp(props, "searchLabel", data.searchLabel);
    buildOptionalTextProp(props, "searchPlaceholder", data.searchPlaceholder);
    buildOptionalTextProp(props, "applyLabel", data.applyLabel);
  } else if (role === "form") {
    const formId =
      widget.type === "contact"
        ? readBindingPathValue(data, "form.submission.formId")
        : readBindingPathValue(data, "submission.formId");
    buildOptionalTextProp(props, "formId", formId);
  } else if (role === "spacer") {
    const size = parsePixelSize(readBindingPathValue(data, "height.desktop"));
    if (size !== undefined) props.size = size;
  }
  // `embed` (form-embed): the V2 embed block carries no formId prop; the
  // runtime wires form embeds during re-authoring. `url: null` is emitted so
  // the stored shape is self-normalizing (the shared default `url: ""`
  // normalizes to `null` on a second pass).
  if (role === "embed") props.url = null;

  return {
    id: `${widget.id}-${role}`,
    type: role === "filters" ? "filters" : (ROLE_BLOCK_TYPES[role] ?? "legacy-widget"),
    props,
    visibility: SECTION_DEFAULTS.blockVisibility,
  };
};

const buildSectionFromWidget = (
  widget: DetailPageLegacyWidgetBlockV1,
  spec: WidgetConversionSpec
): PageSectionV2 => {
  const blockVisibility = SECTION_DEFAULTS.blockVisibility;

  // Dynamic form-or-legacy for contact/newsletter: a resolvable formId keeps
  // the form block; otherwise the widget falls back to the legacy placeholder.
  if (spec === CONTACT_SPEC || spec === NEWSLETTER_SPEC) {
    const formId = readRaw(
      widget.data,
      spec === CONTACT_SPEC ? "form.submission.formId" : "submission.formId"
    );
    if (typeof formId !== "string" || formId.trim().length === 0) {
      return buildSectionFromWidget(widget, DEFAULT_LEGACY_SPEC);
    }
  }

  const blocks: PageBlockV2[] = [];
  const roleOccurrences = new Map<string, number>();

  for (const roleSpec of spec.roles) {
    if (roleSpec.role === "legacy") {
      blocks.push(buildLegacyBlock(widget.id, widget.type, widget.data));
      continue;
    }
    if (roleSpec.role === "columns") {
      blocks.push(buildColumnsBlock(widget));
      continue;
    }
    if (
      roleSpec.role === "collection" ||
      roleSpec.role === "filters" ||
      roleSpec.role === "form" ||
      roleSpec.role === "embed"
    ) {
      blocks.push(buildDataDrivenRoleBlock(widget, roleSpec.role));
      continue;
    }
    if (roleSpec.role === "spacer") {
      blocks.push(buildDataDrivenRoleBlock(widget, "spacer"));
      continue;
    }
    const role = String(roleSpec.role);
    const occurrence = roleOccurrences.get(role) ?? 0;
    roleOccurrences.set(role, occurrence + 1);
    const roleKey = buildRoleKey(role, occurrence);
    blocks.push({
      id: buildBlockId(widget.id, role, occurrence),
      type: resolveRoleBlockType(roleKey),
      props: collectProps(widget.data, [roleSpec, ...(roleSpec.extraProps ?? [])]),
      visibility: blockVisibility,
    });
  }

  if (spec.itemRoles) {
    const items = readRaw(widget.data, spec.itemRoles.dataPath);
    if (Array.isArray(items)) {
      items.forEach((item, itemIndex) => {
        const byRole = new Map<
          string,
          {
            blockType: PageBlockType;
            mappings: Array<
              | WidgetConversionRoleSpec
              | WidgetConversionItemRoleSpec
              | { from: string; propPath: string }
            >;
          }
        >();
        for (const itemRole of spec.itemRoles!.rolesPerItem) {
          const entry = byRole.get(itemRole.role) ?? {
            blockType: itemRole.blockType,
            mappings: [],
          };
          entry.mappings.push(itemRole, ...(itemRole.extraProps ?? []));
          byRole.set(itemRole.role, entry);
        }
        for (const [base, { blockType, mappings }] of byRole) {
          blocks.push({
            id: `${widget.id}-${base}-${itemIndex}`,
            type: blockType,
            props: collectProps(item, mappings),
            visibility: blockVisibility,
          });
        }
      });
    }
  }

  return {
    id: widget.id,
    type: spec.sectionType,
    name: toSectionName(spec.sectionType),
    variant: spec.sectionVariant,
    layout: { ...SECTION_DEFAULTS.layout },
    style: { ...SECTION_DEFAULTS.style },
    spacing: { ...SECTION_DEFAULTS.spacing },
    visibility: { ...SECTION_DEFAULTS.visibility },
    responsive: {},
    blocks,
  };
};

/**
 * Convert a v1 widget block list into V2 sections (deterministic, idempotent).
 * `navigation`/`footer` widgets (spec `null`) are dropped entirely.
 */
export function convertWidgetBlocksToV2Sections(
  blocks: DetailPageLegacyWidgetBlockV1[]
): PageSectionV2[] {
  return blocks.flatMap((widget) => {
    const specEntry = WIDGET_TO_V2_MAP[widget.type];
    if (specEntry === null) return []; // navigation/footer drop.
    const spec = specEntry ?? DEFAULT_LEGACY_SPEC;
    return [buildSectionFromWidget(widget, spec)];
  });
}

const collectOldWidgetIds = (blocks: DetailPageLegacyWidgetBlockV1[]): Set<string> => {
  const ids = new Set<string>();
  const visit = (list: DetailPageLegacyWidgetBlockV1[]) => {
    for (const block of list) {
      ids.add(block.id);
      if (Array.isArray(block.children)) visit(block.children);
      if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
        for (const items of Object.values(block.slots)) {
          if (Array.isArray(items)) visit(items);
        }
      }
    }
  };
  visit(blocks);
  return ids;
};

const parseRoleKey = (blockId: string, widgetId: string): string => {
  const remainder = blockId.slice(widgetId.length + 1);
  const perItemMatch = /^(card|question|answer|quote|image)-(\d+)$/.exec(remainder);
  if (perItemMatch) return `${perItemMatch[1]}-${perItemMatch[2]}`;
  const repeatedMatch = /^(heading|text)-(\d+)$/.exec(remainder);
  if (repeatedMatch) return `${repeatedMatch[1]}:${repeatedMatch[2]}`;
  return remainder;
};

/**
 * Derive, per old widget id, the roleKey → new block id index from the
 * converted sections (used by the binding remap).
 */
const deriveRoleIndex = (
  oldWidgetIds: Set<string>,
  sections: PageSectionV2[]
): Map<string, Map<string, string>> => {
  const index = new Map<string, Map<string, string>>();
  const register = (widgetId: string, block: PageBlockV2) => {
    const roleKey = parseRoleKey(block.id, widgetId);
    let widgetIndex = index.get(widgetId);
    if (!widgetIndex) {
      widgetIndex = new Map();
      index.set(widgetId, widgetIndex);
    }
    widgetIndex.set(roleKey, block.id);
  };

  const visitBlocks = (widgetId: string, blocks: PageBlockV2[]) => {
    for (const block of blocks) {
      // The longest old-widget-id prefix match disambiguates ids such as
      // "project-hero" vs "project-hero-art".
      const matchedWidgetId =
        [...oldWidgetIds]
          .filter((candidate) => block.id.startsWith(`${candidate}-`))
          .sort((left, right) => right.length - left.length)[0] ?? widgetId;
      register(matchedWidgetId, block);
      if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
        for (const items of Object.values(block.slots)) {
          if (Array.isArray(items)) visitBlocks(matchedWidgetId, items);
        }
      }
    }
  };

  for (const section of sections) {
    visitBlocks(section.id, section.blocks);
  }
  return index;
};

const resolveItemBindingTarget = (
  spec: WidgetConversionSpec,
  propPath: string
): { role: string; propPath: string } | null => {
  if (!spec.itemBindingRemap) return null;
  const match = /^([^.]+)\.(\d+)\.([^.]+)$/.exec(propPath);
  if (!match) return null;
  const itemField = match[3]!;
  const template = spec.itemBindingRemap[itemField];
  if (!template) return null;
  return {
    role: template.role.replace("*", match[2]!),
    propPath: template.propPath,
  };
};

/**
 * Remap v1 detail-page bindings onto V2 block ids/prop paths. Entries whose
 * target widget/type/fieldPath is unknown, dropped (`navigation`/`footer`), or
 * unmappable are REMOVED from the returned binding list and reported in
 * `dropped` (ordered as in the input). Dangling bindings never 404 the page.
 */
export function convertDetailPageBindingsToV2(
  bindings: DetailPageBinding[],
  oldBlocks: DetailPageLegacyWidgetBlockV1[],
  sections: PageSectionV2[]
): { bindings: DetailPageBinding[]; dropped: BindingDropReport[] } {
  const oldWidgetIds = collectOldWidgetIds(oldBlocks);
  const roleIndex = deriveRoleIndex(oldWidgetIds, sections);
  const oldBlocksById = new Map<string, DetailPageLegacyWidgetBlockV1>();
  const collectOldBlocks = (list: DetailPageLegacyWidgetBlockV1[]) => {
    for (const block of list) {
      oldBlocksById.set(block.id, block);
      if (Array.isArray(block.children)) collectOldBlocks(block.children);
      if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
        for (const items of Object.values(block.slots)) {
          if (Array.isArray(items)) collectOldBlocks(items);
        }
      }
    }
  };
  collectOldBlocks(oldBlocks);

  const converted: DetailPageBinding[] = [];
  const dropped: BindingDropReport[] = [];

  for (const binding of bindings) {
    const oldBlock = oldBlocksById.get(binding.blockId);
    if (!oldBlock) {
      dropped.push({ bindingId: binding.id, reason: "unknown_widget_block" });
      continue;
    }
    const specEntry = WIDGET_TO_V2_MAP[oldBlock.type];
    if (specEntry === null) {
      dropped.push({ bindingId: binding.id, reason: "dropped_widget_type" });
      continue;
    }
    const spec = specEntry ?? DEFAULT_LEGACY_SPEC;

    const itemTarget = resolveItemBindingTarget(spec, binding.propPath);
    const remap = itemTarget ?? spec.bindingRemap[binding.propPath];
    if (!remap) {
      dropped.push({ bindingId: binding.id, reason: "unmapped_prop_path" });
      continue;
    }

    const widgetIndex = roleIndex.get(oldBlock.id);
    const newBlockId = widgetIndex?.get(remap.role);
    if (!newBlockId) {
      dropped.push({ bindingId: binding.id, reason: "unmapped_prop_path" });
      continue;
    }

    converted.push({
      ...binding,
      blockId: newBlockId,
      propPath: remap.propPath,
    });
  }

  return { bindings: converted, dropped };
}

/** Convert a stored v1 detail-page document to schemaVersion 2. */
export function convertDetailPageDocumentV1ToV2(doc: DetailPageDocumentV1): DetailPageDocument {
  const sections = convertWidgetBlocksToV2Sections(doc.blocks);
  const { bindings } = convertDetailPageBindingsToV2(doc.bindings, doc.blocks, sections);
  return {
    schemaVersion: 2,
    id: doc.id,
    name: doc.name,
    contentTypeId: doc.contentTypeId,
    contentTypeSlug: doc.contentTypeSlug,
    status: doc.status,
    titlePattern: doc.titlePattern,
    ...(doc.seo ? { seo: doc.seo } : {}),
    settings: doc.settings,
    sections,
    bindings,
    ...(doc.related ? { related: doc.related } : {}),
  };
}

/** Convert a v1 document AND report the bindings dropped by the conversion. */
export function convertDetailPageDocumentV1ToV2WithReport(doc: DetailPageDocumentV1): {
  document: DetailPageDocument;
  dropped: BindingDropReport[];
} {
  const sections = convertWidgetBlocksToV2Sections(doc.blocks);
  const { bindings, dropped } = convertDetailPageBindingsToV2(doc.bindings, doc.blocks, sections);
  return {
    document: {
      schemaVersion: 2,
      id: doc.id,
      name: doc.name,
      contentTypeId: doc.contentTypeId,
      contentTypeSlug: doc.contentTypeSlug,
      status: doc.status,
      titlePattern: doc.titlePattern,
      ...(doc.seo ? { seo: doc.seo } : {}),
      settings: doc.settings,
      sections,
      bindings,
      ...(doc.related ? { related: doc.related } : {}),
    },
    dropped,
  };
}

/**
 * Assemble the PageDocumentV2 render envelope from a detail-page document.
 * Sections carry the resolved (bound) block props by the time this is called.
 *
 * L04 (L02/L04 boundary decision): the bound v2 sections from
 * `resolveDetailPageBlocks` are threaded in by the caller; the envelope is
 * exactly the L02-delivered shape with `sections` from the caller instead of
 * `doc.sections` so bound entry values reach the render.
 */
export function buildDetailPageRenderDocument(
  doc: DetailPageDocument,
  sections: PageSectionV2[]
): PageDocumentV2 {
  return {
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: {
      template: doc.settings.template,
      showInNav: false,
    },
    sections,
  };
}
