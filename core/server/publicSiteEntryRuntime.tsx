import { isDetailPageTitleTokenSafe } from "../services/content/detailPageSchema";
import type { DetailPageDocument } from "../services/content/detailPageTypes";
import { resolvePostRuntimeMetaDescription } from "../services/posts/runtime/postBlockRuntimeMapper";
import { readBindingPathValue } from "../services/utils/bindingPath";

type DetailPageRuntimeEntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type DetailPageRuntimeEntry = {
  title?: string | null;
  slug?: string | null;
  data?: Record<string, unknown> | null;
  seo?: DetailPageRuntimeEntrySeo | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  author?: { name?: string | null } | null;
};

const titleTokenPattern = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{\s*([A-Za-z0-9_.-]+)\s*\}/g;

export const toPublicSeoText = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  return null;
};

const readEntryValue = (entry: DetailPageRuntimeEntry, field: string) => {
  const normalized = field.trim();
  switch (normalized) {
    case "title":
      return entry.title;
    case "slug":
      return entry.slug;
    case "publishedAt":
      return entry.publishedAt;
    case "updatedAt":
      return entry.updatedAt;
    case "createdAt":
      return entry.createdAt;
    case "author":
      return entry.author?.name ?? null;
    default: {
      const dataPath = normalized.startsWith("data.")
        ? normalized.slice("data.".length)
        : normalized;
      return readBindingPathValue(entry.data ?? {}, dataPath);
    }
  }
};

const resolveTitle = (
  pattern: string | null | undefined,
  entry: DetailPageRuntimeEntry,
  fallback: string
) => {
  const source = typeof pattern === "string" && pattern.trim().length > 0 ? pattern : fallback;
  let blockedToken = false;
  const rendered = source.replace(titleTokenPattern, (_match, doubleToken, singleToken) => {
    const token = doubleToken ?? singleToken;
    if (!isDetailPageTitleTokenSafe(token)) {
      blockedToken = true;
      return "";
    }
    return toPublicSeoText(readEntryValue(entry, token)) ?? "";
  });
  if (blockedToken) return fallback;
  const trimmed = rendered.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const resolveDetailPageImageUrl = (value: unknown): string | null => {
  if (Array.isArray(value)) return value.length > 0 ? resolveDetailPageImageUrl(value[0]) : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("http://")
    ) {
      return trimmed;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return resolveDetailPageImageUrl(record.src ?? record.url);
};

export const resolveEntryMetaDescription = (entry: DetailPageRuntimeEntry) =>
  entry.seo?.description ?? resolvePostRuntimeMetaDescription(entry.data ?? {});

export const collectPrehydratedDetailBlockIds = (document: DetailPageDocument) =>
  new Set(
    document.bindings
      .filter(
        (binding) =>
          binding.source.kind === "computed" && binding.source.resolver === "relatedItems"
      )
      .map((binding) => binding.blockId)
  );

export const resolveDetailPageRuntimeSeo = (input: {
  document: DetailPageDocument;
  entry: DetailPageRuntimeEntry;
  contentTypeName: string;
}) => {
  const fallbackTitle = input.entry.title ?? input.contentTypeName;
  const descriptionField = input.document.seo?.descriptionField ?? null;
  const imageField = input.document.seo?.imageField ?? null;
  const description = descriptionField
    ? toPublicSeoText(readEntryValue(input.entry, descriptionField))
    : null;
  const imageUrl = imageField
    ? resolveDetailPageImageUrl(readEntryValue(input.entry, imageField))
    : null;

  return {
    title: resolveTitle(
      input.document.seo?.titlePattern ?? input.document.titlePattern,
      input.entry,
      fallbackTitle
    ),
    metaDescription: description ?? resolveEntryMetaDescription(input.entry),
    imageUrl,
    canonicalUrl: input.entry.seo?.canonicalUrl ?? null,
  };
};
