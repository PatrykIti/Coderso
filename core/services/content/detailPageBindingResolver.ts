import {
  contentListDefaults,
  type ContentListData,
  type ContentListRuntimeItem,
} from "../../services/renderContracts/contentListContract";
import type { PageBlockV2, PageSectionV2 } from "../pages/pageDocumentV2";
import type { FormRuntimeResolution } from "../forms/formRuntimeContract";
import type { ContentRouteSetting } from "../settings/settingsContracts";
import {
  readBindingPathValue,
  splitBindingPath,
  writeBindingPathValue,
} from "../utils/bindingPath";
import { isCuratedMediaUrl } from "../media/curatedMediaProfiles";
import type {
  DetailPageBinding,
  DetailPageBindingSource,
  DetailPageDocument,
} from "./detailPageTypes";
import type { ContentSchema } from "./validation";
import type { listEntries } from "./entryService";

const secretLikePattern =
  /\b[\w.-]*(token|secret|password|api[-_]?key|credential|cookie|session|csrf)[\w.-]*\b/i;
const curatedExternalImageFieldCandidates = new Set(["coverImageUrl"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneValue = <T>(value: T): T => (value === undefined ? value : structuredClone(value));

const toOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toIsoString = (value: unknown) => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return null;
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const isMissingValue = (value: unknown) => value === undefined || value === null;

const buildDetailHref = (pattern: string, slug: string, id: string) => {
  if (pattern.includes(":slug")) {
    return pattern.replace(":slug", encodeURIComponent(slug));
  }
  if (pattern.includes(":id")) {
    return pattern.replace(":id", encodeURIComponent(id));
  }
  return pattern;
};

const sanitizeHref = (value: string) =>
  value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")
    ? value
    : "#";

type DetailPageSchemaField = {
  name: string;
  schema: Record<string, unknown>;
};

const collectSchemaFields = (schema: ContentSchema) => {
  const fields = new Map<string, DetailPageSchemaField>();
  const properties = isRecord(schema.properties) ? schema.properties : null;
  if (!properties) return fields;

  for (const [name, value] of Object.entries(properties)) {
    if (!isRecord(value)) continue;
    fields.set(name, { name, schema: value });
  }

  return fields;
};

const readRootFieldName = (path: string) => splitBindingPath(path)[0] ?? null;

const isCuratedExternalImageBinding = (binding: DetailPageBinding, block?: PageBlockV2) =>
  binding.source.kind === "entry-field" &&
  curatedExternalImageFieldCandidates.has(readRootFieldName(binding.source.field) ?? "") &&
  // Legacy v1 docs bind `media.src`; converted v2 docs bind `src` on the
  // hero image block.
  (binding.propPath === "media.src" || (binding.propPath === "src" && block?.type === "image"));

const resolveDetailPathPattern = (input: {
  contentTypeSlug: string;
  detailPathPattern?: string;
  contentRoutes?: ContentRouteSetting[];
}) => {
  if (input.detailPathPattern) return input.detailPathPattern;
  const route = input.contentRoutes?.find(
    (entry) => entry.type === input.contentTypeSlug && entry.enabled
  );
  return route?.detailPath ?? `/${input.contentTypeSlug}/:slug`;
};

const normalizeImageValue = (value: unknown): unknown => {
  if (value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    return normalizeImageValue(value[0]);
  }
  if (!isRecord(value)) return undefined;

  const mediaId = toOptionalText(value.mediaId ?? value.id);
  const src = toOptionalText(value.src ?? value.url);
  const alt = toOptionalText(value.alt);

  if (!mediaId && !src && !alt) {
    return cloneValue(value);
  }

  return {
    ...(mediaId ? { mediaId } : {}),
    ...(src ? { src } : {}),
    ...(alt ? { alt } : {}),
  };
};

const normalizeGalleryValue = (value: unknown): unknown => {
  if (value === null) return null;
  const entries = Array.isArray(value) ? value : [value];
  const normalized = entries
    .map((entry) => normalizeImageValue(entry))
    .filter((entry) => entry !== undefined);
  return normalized.length > 0 ? normalized : undefined;
};

const applyBindingTransform = (value: unknown, transform: DetailPageBinding["transform"]) => {
  if (value === undefined) return undefined;
  if (!transform) return cloneValue(value);

  switch (transform) {
    case "text": {
      if (value === null) return null;
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      return undefined;
    }
    case "number":
    case "currency":
    case "area":
      return value === null ? null : (toFiniteNumber(value) ?? undefined);
    case "image":
      return normalizeImageValue(value);
    case "gallery":
      return normalizeGalleryValue(value);
    case "list":
      if (value === null) return null;
      return Array.isArray(value) ? cloneValue(value) : undefined;
    default:
      return undefined;
  }
};

const forEachNestedBlock = (
  blocks: PageBlockV2[],
  visit: (block: PageBlockV2) => boolean | undefined
): boolean => {
  for (const block of blocks) {
    if (visit(block)) return true;
    if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
      for (const items of Object.values(block.slots)) {
        if (!Array.isArray(items)) continue;
        if (forEachNestedBlock(items, visit)) return true;
      }
    }
  }
  return false;
};

const setBlockBindingValue = (
  blocks: PageBlockV2[],
  blockId: string,
  propPath: string,
  value: unknown
): boolean =>
  forEachNestedBlock(blocks, (block) => {
    if (block.id !== blockId) return false;
    block.props = (writeBindingPathValue(block.props ?? {}, propPath, value) ?? {}) as Record<
      string,
      unknown
    >;
    return true;
  });

const findBlockById = (blocks: PageBlockV2[], blockId: string): PageBlockV2 | null => {
  let found: PageBlockV2 | null = null;
  forEachNestedBlock(blocks, (block) => {
    if (block.id === blockId) {
      found = block;
      return true;
    }
    return false;
  });
  return found;
};

const removeEmptyHeroMedia = (sections: PageSectionV2[]): PageSectionV2[] => {
  for (const section of sections) {
    if (section.type !== "hero") continue;
    const imageIndex = section.blocks.findIndex((block) => block.type === "image");
    if (imageIndex === -1) continue;
    const src = section.blocks[imageIndex]?.props?.src;
    if (typeof src === "string" && src.trim().length > 0) continue;
    section.blocks.splice(imageIndex, 1);
    if (section.variant === "split") {
      section.variant = "centered";
    }
  }

  return sections;
};

const resolveBindingFallbackValue = (binding: DetailPageBinding, value: unknown) =>
  applyBindingTransform(isMissingValue(value) ? binding.fallback : value, binding.transform);

export type DetailPageBindingResolverEntry = Awaited<ReturnType<typeof listEntries>>[number];

export type DetailPageBindingResolverContentType = {
  id: string;
  slug: string;
  schema: ContentSchema;
};

type ResolveDetailPageRelatedItemsDeps = {
  listEntries?: (typeId: string) => Promise<DetailPageBindingResolverEntry[]>;
  mapEntriesToContentListItems?: (
    entries: DetailPageBindingResolverEntry[],
    options: { detailPathPattern: string; showImage: boolean }
  ) => Promise<ContentListRuntimeItem[]>;
  resolveListingContentListRuntimeData?: (
    input: ContentListData,
    options: {
      preview: boolean;
      contentRoutes: ContentRouteSetting[];
      runtimeSearchParams?: URLSearchParams;
    }
  ) => Promise<{ items: ContentListRuntimeItem[] }>;
};

export type DetailPageBindingResolverDeps = ResolveDetailPageRelatedItemsDeps & {
  resolveFormRuntimeData?: (
    formId: string,
    options: { preview: boolean }
  ) => Promise<FormRuntimeResolution>;
};

export type DetailPageBindingResolverInput = {
  document: DetailPageDocument;
  entry: DetailPageBindingResolverEntry;
  contentType: DetailPageBindingResolverContentType;
  preview: boolean;
  detailPathPattern?: string;
  contentRoutes?: ContentRouteSetting[];
};

export type DetailPageBindingResolverErrorCode =
  | "detail_page_binding_invalid"
  | "detail_page_binding_missing_required"
  | "detail_page_binding_secret_field"
  | "detail_page_binding_field_missing"
  | "detail_page_related_source_missing"
  | "detail_page_related_source_ambiguous"
  | "detail_page_form_context_missing";

export class DetailPageBindingResolverError extends Error {
  code: DetailPageBindingResolverErrorCode;
  bindingId?: string;
  field?: string;
  propPath?: string;

  constructor(
    code: DetailPageBindingResolverErrorCode,
    input: {
      bindingId?: string;
      field?: string;
      propPath?: string;
      message?: string;
    } = {}
  ) {
    super(input.message ?? code);
    this.name = "DetailPageBindingResolverError";
    this.code = code;
    this.bindingId = input.bindingId;
    this.field = input.field;
    this.propPath = input.propPath;
  }
}

type DetailPageResolveBindingInput = DetailPageBindingResolverInput & {
  binding: DetailPageBinding;
  block: PageBlockV2;
  schemaFields: Map<string, DetailPageSchemaField>;
};

const readEntryFieldValue = (
  fieldPath: string,
  entry: DetailPageBindingResolverEntry,
  schemaFields: Map<string, DetailPageSchemaField>,
  binding: DetailPageBinding
) => {
  const rootField = readRootFieldName(fieldPath);
  if (!rootField || !schemaFields.has(rootField)) {
    throw new DetailPageBindingResolverError("detail_page_binding_field_missing", {
      bindingId: binding.id,
      field: fieldPath,
      propPath: binding.propPath,
      message: `Detail page binding "${binding.id}" targets missing field "${fieldPath}".`,
    });
  }
  if (secretLikePattern.test(fieldPath)) {
    throw new DetailPageBindingResolverError("detail_page_binding_secret_field", {
      bindingId: binding.id,
      field: fieldPath,
      propPath: binding.propPath,
      message: `Detail page binding "${binding.id}" cannot expose secret-like field "${fieldPath}".`,
    });
  }
  return readBindingPathValue(entry.data, fieldPath);
};

const readEntryMetaValue = (
  source: Extract<DetailPageBindingSource, { kind: "entry-meta" }>,
  entry: DetailPageBindingResolverEntry
) => {
  switch (source.field) {
    case "title":
      return entry.title;
    case "slug":
      return entry.slug;
    case "publishedAt":
      return toIsoString(entry.publishedAt ?? entry.updatedAt ?? entry.createdAt);
    case "author":
      return entry.author?.name ?? null;
    default:
      return undefined;
  }
};

export const resolveDetailPageHref = (input: {
  entry: Pick<DetailPageBindingResolverEntry, "id" | "slug">;
  contentTypeSlug: string;
  detailPathPattern?: string;
  contentRoutes?: ContentRouteSetting[];
}) =>
  sanitizeHref(
    buildDetailHref(
      resolveDetailPathPattern({
        contentTypeSlug: input.contentTypeSlug,
        detailPathPattern: input.detailPathPattern,
        contentRoutes: input.contentRoutes,
      }),
      input.entry.slug,
      input.entry.id
    )
  );

const readRelatedSourceId = (block: PageBlockV2) =>
  toOptionalText(readBindingPathValue(block.props ?? {}, "relatedSourceId")) ??
  toOptionalText(readBindingPathValue(block.props ?? {}, "source.relatedSourceId")) ??
  toOptionalText(readBindingPathValue(block.props ?? {}, "sourceId"));

const selectRelatedSource = (
  document: DetailPageDocument,
  block: PageBlockV2,
  binding: DetailPageBinding
) => {
  const sources = document.related ?? [];
  if (sources.length === 0) return null;

  const requestedId = readRelatedSourceId(block);
  if (requestedId) {
    const match = sources.find((source) => source.id === requestedId) ?? null;
    if (!match) {
      throw new DetailPageBindingResolverError("detail_page_related_source_missing", {
        bindingId: binding.id,
        propPath: binding.propPath,
        message: `Detail page binding "${binding.id}" references unknown related source "${requestedId}".`,
      });
    }
    return match;
  }

  if (sources.length === 1) return sources[0]!;

  throw new DetailPageBindingResolverError("detail_page_related_source_ambiguous", {
    bindingId: binding.id,
    propPath: binding.propPath,
    message: `Detail page binding "${binding.id}" needs an explicit related source id.`,
  });
};

export async function resolveDetailPageRelatedItems(
  input: DetailPageResolveBindingInput,
  deps: ResolveDetailPageRelatedItemsDeps = {}
): Promise<ContentListRuntimeItem[] | undefined> {
  const source = selectRelatedSource(input.document, input.block, input.binding);
  if (!source) return undefined;

  if (source.kind === "same-content-type") {
    const listEntries = deps.listEntries ?? (await import("./entryService")).listEntries;
    const mapEntriesToContentListItems =
      deps.mapEntriesToContentListItems ??
      (await import("./contentListResolver")).mapEntriesToContentListItems;

    const entries = await listEntries(input.contentType.id);
    const visible = entries.filter((entry) => {
      if (source.excludeCurrentEntry && entry.id === input.entry.id) return false;
      return input.preview ? true : entry.status === "published";
    });

    return mapEntriesToContentListItems(visible.slice(0, source.limit), {
      detailPathPattern: resolveDetailPathPattern({
        contentTypeSlug: input.contentType.slug,
        detailPathPattern: input.detailPathPattern,
        contentRoutes: input.contentRoutes,
      }),
      showImage: true,
    });
  }

  const resolveListingContentListRuntimeData =
    deps.resolveListingContentListRuntimeData ??
    (await import("./contentListResolver")).resolveListingContentListRuntimeData;

  const listingData: ContentListData = {
    ...contentListDefaults,
    source: {
      ...contentListDefaults.source,
      mode: "listing",
      contentTypeId: "",
      listingQueryId: source.listingQueryId ?? "",
      listingTemplateId: "",
    },
    fields: {
      ...contentListDefaults.fields,
      showImage: true,
    },
  };
  const resolved = await resolveListingContentListRuntimeData(listingData, {
    preview: input.preview,
    contentRoutes: input.contentRoutes ?? [],
  });
  return resolved.items.slice(0, source.limit);
}

export async function resolveDetailPageFormContext(
  input: DetailPageResolveBindingInput,
  deps: DetailPageBindingResolverDeps = {}
) {
  const formId = toOptionalText(readBindingPathValue(input.block.props ?? {}, "formId"));
  if (!formId) {
    throw new DetailPageBindingResolverError("detail_page_form_context_missing", {
      bindingId: input.binding.id,
      propPath: input.binding.propPath,
      message: `Detail page binding "${input.binding.id}" needs block.props.formId for formContext.`,
    });
  }

  const resolveFormRuntimeData =
    deps.resolveFormRuntimeData ??
    (await import("../forms/formRuntimeResolver")).resolveFormRuntimeData;

  return resolveFormRuntimeData(formId, { preview: input.preview });
}

export async function resolveDetailPageBindingValue(
  input: DetailPageResolveBindingInput,
  deps: DetailPageBindingResolverDeps = {}
): Promise<unknown> {
  const { binding, entry } = input;

  switch (binding.source.kind) {
    case "entry-field": {
      const value = readEntryFieldValue(binding.source.field, entry, input.schemaFields, binding);
      if (isCuratedExternalImageBinding(binding, input.block)) {
        return typeof value === "string" && isCuratedMediaUrl(value) ? value : undefined;
      }
      return value;
    }
    case "entry-meta":
      return readEntryMetaValue(binding.source, entry);
    case "computed":
      switch (binding.source.resolver) {
        case "detailHref":
          return resolveDetailPageHref({
            entry,
            contentTypeSlug: input.contentType.slug,
            detailPathPattern: input.detailPathPattern,
            contentRoutes: input.contentRoutes,
          });
        case "relatedItems":
          return resolveDetailPageRelatedItems(input, deps);
        case "formContext":
          return resolveDetailPageFormContext(input, deps);
        default:
          return undefined;
      }
    default:
      return undefined;
  }
}

export async function resolveDetailPageBlocks(
  input: DetailPageBindingResolverInput,
  deps: DetailPageBindingResolverDeps = {}
): Promise<PageSectionV2[]> {
  const sections = cloneValue(input.document.sections);
  const schemaFields = collectSchemaFields(input.contentType.schema);

  for (const binding of input.document.bindings) {
    const block = findBlockById(
      sections.flatMap((section) => section.blocks),
      binding.blockId
    );
    if (!block) {
      throw new DetailPageBindingResolverError("detail_page_binding_invalid", {
        bindingId: binding.id,
        propPath: binding.propPath,
        message: `Detail page binding "${binding.id}" targets missing block "${binding.blockId}".`,
      });
    }

    const resolvedValue = await resolveDetailPageBindingValue(
      {
        ...input,
        binding,
        block,
        schemaFields,
      },
      deps
    );
    const nextValue = resolveBindingFallbackValue(binding, resolvedValue);

    if (nextValue === undefined) {
      if (binding.required) {
        throw new DetailPageBindingResolverError("detail_page_binding_missing_required", {
          bindingId: binding.id,
          field: binding.source.kind === "entry-field" ? binding.source.field : undefined,
          propPath: binding.propPath,
          message: `Detail page binding "${binding.id}" could not resolve required value for "${binding.propPath}".`,
        });
      }
      continue;
    }

    const updated = setBlockBindingValue(
      sections.flatMap((section) => section.blocks),
      binding.blockId,
      binding.propPath,
      nextValue
    );
    if (!updated) {
      throw new DetailPageBindingResolverError("detail_page_binding_invalid", {
        bindingId: binding.id,
        propPath: binding.propPath,
        message: `Detail page binding "${binding.id}" could not update block "${binding.blockId}".`,
      });
    }
  }

  return removeEmptyHeroMedia(sections);
}
