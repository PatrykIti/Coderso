import { useEffect, useMemo, useRef, useState } from "react";

import type { ContentTypeSummary } from "@/services/contentTypesClient";
import { getCachedEntries, listEntriesCached, type EntrySummary } from "@/services/entriesClient";
import { cacheKeys } from "@/services/cachePolicy";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";

export type CustomScreenPreviewFallbackReason = "no-content-type" | "no-records" | "read-failed";

export type CustomScreenPreviewRecordState = {
  source: "entry" | "fallback";
  entryId: string | null;
  fallbackReason?: CustomScreenPreviewFallbackReason;
  note: string | null;
  data: Record<string, unknown>;
};

const buildPreviewValue = (field: {
  label: string;
  type: string;
  options?: Array<{ value: string } | string>;
  relation?: { multiple?: boolean };
}) => {
  switch (field.type) {
    case "number":
      return 120;
    case "boolean":
      return true;
    case "select": {
      const firstOption = Array.isArray(field.options) ? field.options[0] : undefined;
      if (typeof firstOption === "string") return firstOption;
      return firstOption?.value ?? `${field.label} option`;
    }
    case "media":
      return "Hero image";
    case "relation":
      return field.relation?.multiple ? ["Related item"] : "Related item";
    case "richtext":
      return `${field.label} example content`;
    default:
      return `${field.label} preview`;
  }
};

export const buildSchemaFallbackPreviewData = (contentType: ContentTypeSummary | null) => {
  if (!contentType) {
    return {
      title: "Project title",
      slug: "project-title",
      status: "draft",
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
      publishedAt: null,
    };
  }

  const schemaFields = fieldsFromSchema(contentType.schema);
  return {
    title: "Project title",
    slug: "project-title",
    status: "draft",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    publishedAt: null,
    ...Object.fromEntries(schemaFields.map((field) => [field.name, buildPreviewValue(field)])),
  };
};

export function buildPreviewRecordStateFromEntry(
  contentType: ContentTypeSummary,
  entry: EntrySummary
): CustomScreenPreviewRecordState {
  return {
    source: "entry",
    entryId: entry.id,
    note: `Previewing the first record from ${contentType.name}.`,
    data: {
      title: entry.title,
      slug: entry.slug,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      publishedAt: entry.publishedAt ?? null,
      ...entry.data,
    },
  };
}

export function buildFallbackPreviewRecordState(
  contentType: ContentTypeSummary | null,
  reason: CustomScreenPreviewFallbackReason
): CustomScreenPreviewRecordState {
  return {
    source: "fallback",
    entryId: null,
    fallbackReason: reason,
    note:
      reason === "no-content-type"
        ? "Select a content type to preview this screen."
        : reason === "read-failed"
          ? "Preview data could not be loaded. Showing schema fallback values until records can be read."
          : "No records exist for this content type yet. Preview is using schema fallback values.",
    data: buildSchemaFallbackPreviewData(contentType),
  };
}

export function buildCustomScreenPreviewRecordState(input: {
  contentType: ContentTypeSummary | null;
  entries: EntrySummary[] | null;
  readFailed: boolean;
}): CustomScreenPreviewRecordState {
  if (!input.contentType) {
    return buildFallbackPreviewRecordState(null, "no-content-type");
  }
  if (input.entries && input.entries.length > 0) {
    return buildPreviewRecordStateFromEntry(input.contentType, input.entries[0]);
  }
  if (input.readFailed) {
    return buildFallbackPreviewRecordState(input.contentType, "read-failed");
  }
  if (input.entries && input.entries.length === 0) {
    return buildFallbackPreviewRecordState(input.contentType, "no-records");
  }

  return {
    source: "fallback",
    entryId: null,
    note: null,
    data: buildSchemaFallbackPreviewData(input.contentType),
  };
}

export function useCustomScreenPreviewRecordState(contentType: ContentTypeSummary | null) {
  const typeSlug = contentType?.slug ?? null;
  const cachedEntries = typeSlug ? getCachedEntries(typeSlug) : null;
  const [entries, setEntries] = useState<EntrySummary[] | null>(() => cachedEntries);
  const [readFailed, setReadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(() => Boolean(typeSlug) && cachedEntries === null);
  const seededFromCacheRef = useRef(entries !== null);
  const hasResolvedEntriesRef = useRef(entries !== null);
  const previewRecordState = useMemo(
    () =>
      buildCustomScreenPreviewRecordState({
        contentType,
        entries,
        readFailed,
      }),
    [contentType, entries, readFailed]
  );

  useEffect(() => {
    if (!contentType || !typeSlug) return;

    let active = true;

    const hydratePreviewEntries = async (force: boolean) => {
      try {
        const nextItems = await listEntriesCached(typeSlug, { force });
        if (!active) return;
        setEntries(nextItems);
        setReadFailed(false);
        setIsLoading(false);
        hasResolvedEntriesRef.current = true;
      } catch {
        if (!active) return;
        if (!hasResolvedEntriesRef.current) {
          setReadFailed(true);
          setIsLoading(false);
        }
      }
    };

    if (!seededFromCacheRef.current) {
      void hydratePreviewEntries(false);
    }

    const unsubscribe = subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.entriesList(typeSlug)) return;
      void hydratePreviewEntries(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [contentType, typeSlug]);

  return { isLoading, previewRecordState };
}
