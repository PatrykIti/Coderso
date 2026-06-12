import {
  normalizeContentListData,
  type ContentListRuntimeItem,
} from "../../widgets/core/contentList";
import {
  getPageBlockActiveSlotKeys,
  resolvePageDocumentForBreakpoint,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
} from "./pageDocumentV2";
import {
  mapPageCollectionBlockToContentListData,
  type PageRuntimeCollectionBinding,
  type PageRuntimeDataByBlockId,
} from "./pageRuntimeDataBinding";

/**
 * Canvas-preview data contract for the collection block (TASK-457). The Page
 * Editor fetches the referenced content type and its entries through the
 * cached admin clients and this module maps them onto the SAME runtime
 * binding shape the public renderer consumes (`PageRuntimeCollectionBinding`),
 * via the shared `mapPageCollectionBlockToContentListData` prop mapper — so
 * the canvas inherits the runtime's exact clamps and defaults (limit 1..24,
 * `statusScope: "published"`, `published-desc` ordering).
 *
 * Canvas-safe by construction: only PUBLISHED entries are projected, no
 * detail hrefs are emitted (the canvas disables interactivity anyway), and a
 * missing/deleted content type maps to the runtime resolver's exact
 * fail-closed error shape ("Selected content type no longer exists."), so the
 * canvas shows the same boundary the front would. Saved-query and listing
 * template references do not execute in the canvas — the preview approximates
 * the listing with the type's published entries; the public runtime resolves
 * the real query/template server-side (TASK-418-06-L04).
 *
 * This module must stay Bun-free and side-effect free; it never imports the
 * admin clients or the server-side content-list resolver.
 */

/** Structural shape of a cached admin entry consumed by the mapper. */
export type PageEditorCollectionPreviewEntry = {
  id: string;
  title: string;
  slug: string;
  status: string;
  data: Record<string, unknown>;
  tags?: string[];
  publishedAt?: string | null;
  updatedAt: string;
  author?: { name: string | null } | null;
};

/**
 * Resolved preview source for one referenced content type. `null` is the
 * fail-closed value: the referenced content type no longer exists.
 */
export type PageEditorCollectionPreviewSource = {
  contentType: { id: string; name: string; slug: string };
  entries: readonly PageEditorCollectionPreviewEntry[];
} | null;

const EXCERPT_MAX_LENGTH = 220;

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max).trimEnd()}...`;

/**
 * Canvas-safe mirror of the resolver's `resolveExcerpt` field candidates
 * (`contentListResolver.ts`): explicit excerpt first, then the prose field
 * fallbacks, HTML-stripped and truncated to the same bound. The posts-runtime
 * excerpt path is server-coupled and intentionally not reproduced here.
 */
const resolvePreviewExcerpt = (entry: PageEditorCollectionPreviewEntry): string | undefined => {
  const candidates = [
    entry.data.excerpt,
    entry.data.summary,
    entry.data.description,
    entry.data.lead,
    entry.data.intro,
    entry.data.content,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const plain = stripHtml(candidate);
    if (plain.length === 0) continue;
    return truncate(plain, EXCERPT_MAX_LENGTH);
  }
  return undefined;
};

const toSortableTime = (entry: PageEditorCollectionPreviewEntry): number => {
  const raw = entry.publishedAt ?? entry.updatedAt;
  const parsed = Date.parse(raw ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPreviewItems = (
  entries: readonly PageEditorCollectionPreviewEntry[],
  limit: number
): { items: ContentListRuntimeItem[]; total: number } => {
  // Runtime parity: the block binding always resolves with
  // `statusScope: "published"` and the default `published-desc` sort, and
  // `total` counts the published entries BEFORE the limit slice.
  const published = entries
    .filter((entry) => entry.status === "published")
    .sort((a, b) => toSortableTime(b) - toSortableTime(a));
  const items = published.slice(0, limit).map((entry) => ({
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    // No detail href in the canvas: route resolution is server-owned and
    // the editor canvas disables pointer interactivity regardless.
    excerpt: resolvePreviewExcerpt(entry),
    tags: Array.isArray(entry.tags) ? entry.tags.filter((tag) => typeof tag === "string") : [],
    authorName: entry.author?.name ?? undefined,
    publishedAt: entry.publishedAt ?? entry.updatedAt,
    status: entry.status,
  }));
  return { items, total: published.length };
};

const readBlockContentTypeId = (props: Record<string, unknown> | undefined): string | null => {
  const value = props?.contentTypeId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

/**
 * Maps one collection block to the canvas-preview runtime binding.
 * `source === null` means the referenced content type does not exist (the
 * cached fetch resolved to nothing): the binding carries the runtime
 * resolver's exact fail-closed error so the shared renderer shows the same
 * boundary the front would.
 */
export const buildPageEditorCollectionPreviewBinding = (
  block: PageBlockV2,
  source: PageEditorCollectionPreviewSource
): PageRuntimeCollectionBinding => {
  const data = mapPageCollectionBlockToContentListData(block);
  const resolvedAt = new Date().toISOString();
  if (!source) {
    return {
      kind: "collection",
      // The runtime binding normalizes `{ ...data, resolved }` through the
      // widget owner (`resolveCollectionBinding` in pageRuntimeDataBinding);
      // the canvas keeps the identical final shape.
      data: normalizeContentListData({
        ...data,
        resolved: {
          items: [],
          total: 0,
          sourceTypeId: data.source?.contentTypeId ?? "",
          sourceTypeSlug: "",
          resolvedAt,
          // Pinned runtime shape: `resolveContentListRuntimeData` for a
          // dangling content type id (contentListResolver.ts).
          error: "Selected content type no longer exists.",
        },
      }),
    };
  }
  const limit = data.source?.limit ?? 6;
  const { items, total } = toPreviewItems(source.entries, limit);
  return {
    kind: "collection",
    data: normalizeContentListData({
      ...data,
      resolved: {
        items,
        total,
        sourceTypeId: source.contentType.id,
        sourceTypeSlug: source.contentType.slug,
        resolvedAt,
      },
    }),
  };
};

const walkBlocks = function* (blocks: readonly PageBlockV2[]): Generator<PageBlockV2> {
  for (const block of blocks) {
    // Hidden blocks stay included: the editor canvas renders them as ghosts
    // and a hidden collection block must still preview once toggled visible.
    yield block;
    for (const slotKey of getPageBlockActiveSlotKeys(block)) {
      yield* walkBlocks(block.slots?.[slotKey] ?? []);
    }
  }
};

/**
 * Unique content type ids referenced by collection blocks anywhere in the
 * document, across every breakpoint (base props plus responsive prop
 * overrides), so the editor can prefetch each referenced type's entries once
 * regardless of the active device.
 */
export const collectPageEditorCollectionPreviewContentTypeIds = (
  document: PageDocumentV2
): string[] => {
  const ids = new Set<string>();
  for (const section of document.sections) {
    for (const block of walkBlocks(section.blocks)) {
      if (block.type !== "collection") continue;
      const baseId = readBlockContentTypeId(block.props);
      if (baseId) ids.add(baseId);
      for (const override of Object.values(block.responsive ?? {})) {
        const overrideId = readBlockContentTypeId(override?.props);
        if (overrideId) ids.add(overrideId);
      }
    }
  }
  return [...ids];
};

/**
 * Builds the canvas `runtimeDataByBlockId` map for one breakpoint from the
 * resolved document (so per-breakpoint `contentTypeId` overrides preview the
 * right entries). Blocks without a content type get NO binding — the
 * renderer's canvas branch shows the "pick a content type" empty state — and
 * blocks whose source has not resolved yet get NO binding either, which the
 * canvas presents as its loading state.
 */
export const buildPageEditorCollectionPreviewBindings = (
  document: PageDocumentV2,
  breakpoint: PageBreakpoint,
  sourcesByContentTypeId: Readonly<Record<string, PageEditorCollectionPreviewSource>>
): PageRuntimeDataByBlockId => {
  const bindings: PageRuntimeDataByBlockId = {};
  const resolved = resolvePageDocumentForBreakpoint(document, breakpoint);
  for (const section of resolved.sections) {
    for (const block of walkBlocks(section.blocks)) {
      if (block.type !== "collection") continue;
      const contentTypeId = readBlockContentTypeId(block.props);
      if (!contentTypeId) continue;
      const source = sourcesByContentTypeId[contentTypeId];
      if (source === undefined) continue;
      bindings[block.id] = buildPageEditorCollectionPreviewBinding(block, source);
    }
  }
  return bindings;
};
