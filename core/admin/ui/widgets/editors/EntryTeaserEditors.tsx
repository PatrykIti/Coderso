import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { listContentTypesCached, type ContentTypeSummary } from "@/services/contentTypesClient";
import { listEntriesCached, type EntrySummary } from "@/services/entriesClient";
import {
  listListingQueriesCached,
  listListingTemplatesCached,
  previewListingQuery,
  type ListingQueryRecord,
  type ListingTemplateRecord,
} from "@/services/listingsClient";
import { previewEntryTeaser } from "@/services/entryTeaserPreviewClient";

import {
  type EntryTeaserDataSourceMode,
  normalizeEntryTeaserData,
  resolveEntryTeaserVariant,
  type EntryTeaserCtaHrefMode,
  type EntryTeaserCtaStyle,
  type EntryTeaserData,
  type EntryTeaserHeadingLevel,
  type EntryTeaserImageAspect,
  type EntryTeaserImageHeight,
  type EntryTeaserMediaMode,
  type EntryTeaserMaxWidth,
  type EntryTeaserObjectFit,
  type EntryTeaserSourceMode,
  type EntryTeaserVariantId,
  type EntryTeaserRadius,
  type EntryTeaserSpacing,
} from "../../../../widgets/core/entryTeaser";
import type { WidgetEditorProps, WidgetPreviewState } from "../../../../widgets/types";
import { normalizeWidgetSafeHref } from "../../../../widgets/core/widgetSafeHref";
import { SharedColorControl } from "./SharedColorControl";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: EntryTeaserVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "horizontal",
    label: "Horizontal",
    description: "Media and text side by side.",
  },
  {
    id: "vertical",
    label: "Vertical",
    description: "Stacked card teaser layout.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Compact teaser for tighter sections.",
  },
];

const sourceModeOptions: Array<{ id: EntryTeaserSourceMode; label: string }> = [
  { id: "latest", label: "Latest entry" },
  { id: "featured", label: "Featured entry" },
  { id: "manual", label: "Manual entry" },
];

const dataSourceModeOptions: Array<{ id: EntryTeaserDataSourceMode; label: string }> = [
  { id: "legacy", label: "Content type" },
  { id: "listing", label: "Listing query" },
];

const hrefModeOptions: Array<{ id: EntryTeaserCtaHrefMode; label: string }> = [
  { id: "auto", label: "Auto entry URL" },
  { id: "custom", label: "Custom URL" },
];

const ctaStyleOptions: Array<{ id: EntryTeaserCtaStyle; label: string }> = [
  { id: "link", label: "Link" },
  { id: "filled", label: "Filled button" },
  { id: "outline", label: "Outline button" },
];

const radiusOptions: Array<{ id: EntryTeaserRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const spacingOptions: Array<{ id: EntryTeaserSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const headingLevelOptions: Array<{ id: EntryTeaserHeadingLevel; label: string }> = [
  { id: "h2", label: "H2" },
  { id: "h3", label: "H3" },
  { id: "h4", label: "H4" },
];

const mediaModeOptions: Array<{ id: EntryTeaserMediaMode; label: string }> = [
  { id: "image", label: "Image" },
  { id: "icon", label: "Icon or logo" },
  { id: "none", label: "No media" },
];

const mediaAspectOptions: Array<{ id: EntryTeaserImageAspect; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "16:9", label: "16:9" },
  { id: "4:3", label: "4:3" },
  { id: "1:1", label: "1:1" },
];

const mediaHeightOptions: Array<{ id: EntryTeaserImageHeight; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Tall" },
];

const mediaFitOptions: Array<{ id: EntryTeaserObjectFit; label: string }> = [
  { id: "cover", label: "Cover" },
  { id: "contain", label: "Contain" },
];

const maxWidthOptions: Array<{ id: EntryTeaserMaxWidth; label: string }> = [
  { id: "sm", label: "Narrow" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Wide" },
  { id: "xl", label: "Extra wide" },
  { id: "full", label: "Full width" },
];

const tagLimitOptions = [
  { value: 0, label: "Hide tags" },
  { value: 3, label: "3 tags" },
  { value: 5, label: "5 tags" },
  { value: 8, label: "8 tags" },
  { value: 12, label: "12 tags" },
];

const NO_CONTENT_TYPE_VALUE = "__no_content_type__";
const NO_ENTRY_VALUE = "__no_entry__";
const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const NO_LISTING_TEMPLATE_VALUE = "__no_listing_template__";
const NO_LISTING_MANUAL_VALUE = "__no_listing_manual__";

const buildContentTypeOptionLabel = (
  entry: ContentTypeSummary,
  nameCounts: Map<string, number>
) => {
  const nameKey = entry.name.trim().toLowerCase();
  if ((nameCounts.get(nameKey) ?? 0) <= 1) return entry.name;
  const statusLabel = typeof entry.status === "string" ? entry.status : "unknown";
  return `${entry.name} (${entry.slug}, ${statusLabel})`;
};

const buildContentTypeNameCounts = (types: ContentTypeSummary[]) => {
  const counts = new Map<string, number>();
  types.forEach((entry) => {
    const key = entry.name.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
};

type ListingManualOption = {
  value: string;
  label: string;
  target: {
    rowId: string;
    entryId?: string;
  };
};

const readStableListingRowId = (row: Record<string, unknown>) => {
  if (typeof row.id !== "string") return undefined;
  const trimmed = row.id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readListingRowLabel = (row: Record<string, unknown>, index: number) => {
  const titleCandidate =
    typeof row.title === "string"
      ? row.title
      : typeof row.name === "string"
        ? row.name
        : typeof row.slug === "string"
          ? row.slug
          : undefined;
  const title = titleCandidate?.trim();
  if (title) return title;
  const rowId = readStableListingRowId(row);
  if (rowId) return `Row ${index + 1} (${rowId})`;
  return `Row ${index + 1}`;
};

const buildListingManualOptions = (query: ListingQueryRecord, rows: Record<string, unknown>[]) =>
  rows.flatMap((row, index) => {
    const rowId = readStableListingRowId(row);
    if (!rowId) return [];
    const entryId =
      query.query.source === "entries" || query.query.source === "posts" ? rowId : undefined;
    return [
      {
        value: rowId,
        label: readListingRowLabel(row, index),
        target: {
          rowId,
          ...(entryId ? { entryId } : {}),
        },
      } satisfies ListingManualOption,
    ];
  });

const resolveSourcePickerError = (
  error: unknown,
  options: {
    authMessage: string;
    fallbackMessage: string;
  }
) => {
  if (isApiClientError(error)) {
    if (error.status === 401 || error.status === 403) {
      return options.authMessage;
    }
    return error.message;
  }
  return options.fallbackMessage;
};

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: EntryTeaserVariantId;
  onChange?: (next: string) => void;
}) {
  const renderThumbnail = (variantId: EntryTeaserVariantId) => {
    if (variantId === "horizontal") {
      return (
        <div
          className="grid h-16 grid-cols-[0.9fr_1.1fr] gap-2 rounded-md border border-border/70 bg-background/70 p-2"
          data-variant-thumbnail={variantId}
        >
          <div className="rounded-sm bg-muted" />
          <div className="space-y-1">
            <div className="h-2 w-3/4 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted/80" />
            <div className="h-2 w-5/6 rounded bg-muted/70" />
          </div>
        </div>
      );
    }

    if (variantId === "vertical") {
      return (
        <div
          className="h-16 rounded-md border border-border/70 bg-background/70 p-2"
          data-variant-thumbnail={variantId}
        >
          <div className="h-6 rounded-sm bg-muted" />
          <div className="mt-2 space-y-1">
            <div className="h-2 w-2/3 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted/80" />
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex h-16 items-center gap-2 rounded-md border border-border/70 bg-background/70 p-2"
        data-variant-thumbnail={variantId}
      >
        <div className="h-10 w-10 rounded-sm bg-muted" />
        <div className="flex-1 space-y-1">
          <div className="h-2 w-2/3 rounded bg-muted" />
          <div className="h-2 w-5/6 rounded bg-muted/80" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="mb-3">{renderThumbnail(option.id)}</div>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function useContentTypeEntries(types: ContentTypeSummary[]) {
  const [entriesByTypeSlug, setEntriesByTypeSlug] = useState<Record<string, EntrySummary[]>>({});
  const [loadingTypeSlugs, setLoadingTypeSlugs] = useState<Record<string, boolean>>({});
  const [entryLoadError, setEntryLoadError] = useState<string | null>(null);

  const ensureEntriesLoaded = useCallback(
    async (typeSlug: string, options?: { force?: boolean }) => {
      if (!typeSlug) return;
      if (!options?.force && entriesByTypeSlug[typeSlug]) return;
      setEntryLoadError(null);
      setLoadingTypeSlugs((current) => ({
        ...current,
        [typeSlug]: true,
      }));
      try {
        const rows = await listEntriesCached(typeSlug, { force: true });
        setEntriesByTypeSlug((current) => ({
          ...current,
          [typeSlug]: rows,
        }));
      } catch (err) {
        setEntryLoadError(
          resolveSourcePickerError(err, {
            authMessage:
              "Your session cannot load entries for this content type. Sign in again and retry.",
            fallbackMessage: "Failed to load entries.",
          })
        );
      } finally {
        setLoadingTypeSlugs((current) => ({
          ...current,
          [typeSlug]: false,
        }));
      }
    },
    [entriesByTypeSlug]
  );

  const getEntriesForTypeId = (typeId: string | undefined) => {
    if (!typeId) return [];
    const type = types.find((entry) => entry.id === typeId);
    if (!type) return [];
    return entriesByTypeSlug[type.slug] ?? [];
  };

  const isEntriesLoading = (typeSlug: string | undefined) =>
    Boolean(typeSlug && loadingTypeSlugs[typeSlug]);

  return {
    ensureEntriesLoaded,
    getEntriesForTypeId,
    isEntriesLoading,
    entryLoadError,
  };
}

function useListingOptions() {
  const [queries, setQueries] = useState<ListingQueryRecord[]>([]);
  const [templates, setTemplates] = useState<ListingTemplateRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadListings = useCallback(async (options?: { markLoading?: boolean }) => {
    if (options?.markLoading !== false) {
      setLoading(true);
    }
    setError(null);
    try {
      const [nextQueries, nextTemplates] = await Promise.all([
        listListingQueriesCached({ force: true }),
        listListingTemplatesCached({ force: true }),
      ]);
      setQueries(nextQueries);
      setTemplates(nextTemplates);
    } catch (err) {
      setError(
        resolveSourcePickerError(err, {
          authMessage: "Your session cannot load listing options. Sign in again and retry.",
          fallbackMessage: "Failed to load listings options.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [nextQueries, nextTemplates] = await Promise.all([
          listListingQueriesCached({ force: true }),
          listListingTemplatesCached({ force: true }),
        ]);
        if (!active) return;
        setQueries(nextQueries);
        setTemplates(nextTemplates);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          resolveSourcePickerError(err, {
            authMessage: "Your session cannot load listing options. Sign in again and retry.",
            fallbackMessage: "Failed to load listings options.",
          })
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return {
    queries,
    templates,
    loading,
    error,
    retry: loadListings,
  };
}

function useListingManualOptions(query: ListingQueryRecord | null, active: boolean) {
  const [items, setItems] = useState<ListingManualOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(
    async (options?: { markLoading?: boolean }) => {
      if (!query) {
        setItems([]);
        setError(null);
        setLoading(false);
        return;
      }
      if (options?.markLoading !== false) {
        setLoading(true);
      }
      setError(null);
      try {
        const preview = await previewListingQuery(query.query);
        setItems(buildListingManualOptions(query, preview.rows ?? []));
      } catch (err) {
        setItems([]);
        setError(
          resolveSourcePickerError(err, {
            authMessage:
              "Your session cannot load listing rows for manual selection. Sign in again and retry.",
            fallbackMessage: "Failed to load listing rows for manual selection.",
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadItems();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [active, loadItems]);

  return {
    items: active ? items : [],
    error: active ? error : null,
    loading: active ? loading : false,
    retry: loadItems,
  };
}

function normalizeValue(value: EntryTeaserData): EntryTeaserData {
  return normalizeEntryTeaserData(value);
}

function updateValue(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  updater: (current: EntryTeaserData) => EntryTeaserData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

type SourceData = NonNullable<EntryTeaserData["source"]>;
type FieldData = NonNullable<EntryTeaserData["fields"]>;
type CtaData = NonNullable<EntryTeaserData["cta"]>;
type StyleData = NonNullable<EntryTeaserData["style"]>;
type SectionData = NonNullable<EntryTeaserData["section"]>;
type TitleData = NonNullable<EntryTeaserData["title"]>;
type MediaData = NonNullable<EntryTeaserData["media"]>;
type LayoutData = NonNullable<EntryTeaserData["layout"]>;
type FallbackData = NonNullable<EntryTeaserData["fallback"]>;

function updateSource(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<SourceData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    source: {
      ...current.source,
      ...patch,
    },
  }));
}

function updateSourceDataMode(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  mode: EntryTeaserDataSourceMode
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    source: {
      ...current.source,
      mode,
      ...(mode === "listing"
        ? { contentTypeId: "", entryId: "" }
        : {
            listingQueryId: "",
            listingTemplateId: "",
            listingManualTarget: {
              rowId: "",
              entryId: "",
            },
          }),
    },
    sourceMode: current.sourceMode ?? "latest",
  }));
}

function updateFields(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<FieldData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fields: {
      ...current.fields,
      ...patch,
    },
  }));
}

function updateCta(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<CtaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    cta: {
      ...current.cta,
      ...patch,
    },
  }));
}

function updateStyle(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateSection(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<SectionData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    section: {
      ...current.section,
      ...patch,
    },
  }));
}

function updateTitleSettings(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<TitleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    title: {
      ...current.title,
      ...patch,
    },
  }));
}

function updateMedia(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<MediaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    media: {
      ...current.media,
      ...patch,
    },
  }));
}

function updateLayout(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<LayoutData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function clearStyle(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function updateFallback(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<FallbackData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fallback: {
      ...current.fallback,
      ...patch,
    },
  }));
}

function canResolveEntryTeaserPreview(normalized: EntryTeaserData) {
  const source = normalized.source ?? {};
  if (source.mode === "listing") {
    if ((source.listingQueryId ?? "").trim().length === 0) return false;
    if (
      normalized.sourceMode === "manual" &&
      (source.listingManualTarget?.rowId ?? "").trim().length === 0 &&
      (source.listingManualTarget?.entryId ?? "").trim().length === 0
    ) {
      return false;
    }
    return (source.listingQueryId ?? "").trim().length > 0;
  }
  if ((source.contentTypeId ?? "").trim().length === 0) return false;
  if (normalized.sourceMode === "manual" && (source.entryId ?? "").trim().length === 0) {
    return false;
  }
  return true;
}

function buildEntryTeaserPreviewKey(normalized: EntryTeaserData) {
  return JSON.stringify({
    sourceMode: normalized.sourceMode ?? "latest",
    source: normalized.source ?? {},
    fallbackToLatest: normalized.fallback?.fallbackToLatest ?? true,
    showImage: normalized.fields?.showImage ?? true,
  });
}

function useEntryTeaserAdminPreview({
  value,
  active,
  setPreviewState,
}: {
  value: EntryTeaserData;
  active: boolean;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
}) {
  const previewKey = buildEntryTeaserPreviewKey(normalizeValue(value));

  useEffect(() => {
    if (!active || !setPreviewState) return;
    const normalized = normalizeValue(value);
    if (!canResolveEntryTeaserPreview(normalized)) {
      setPreviewState(null);
      return;
    }

    let activeRequest = true;
    setPreviewState({ status: "loading" });

    previewEntryTeaser(normalized)
      .then((resolved) => {
        if (!activeRequest) return;
        setPreviewState({
          status: "ready",
          dataPatch: {
            resolved,
          },
        });
      })
      .catch((error) => {
        if (!activeRequest) return;
        setPreviewState({
          status: "error",
          message: resolveSourcePickerError(error, {
            authMessage: "Resolved teaser preview is unavailable until you sign in again.",
            fallbackMessage: "Resolved teaser preview could not be loaded.",
          }),
        });
      });

    return () => {
      activeRequest = false;
    };
  }, [active, previewKey, setPreviewState, value]);
}

function resolvePreviewResolvedData(
  normalized: EntryTeaserData,
  previewState: WidgetPreviewState | null | undefined
) {
  const previewResolved = previewState?.dataPatch?.resolved;
  if (previewResolved && typeof previewResolved === "object") {
    return previewResolved as NonNullable<EntryTeaserData["resolved"]>;
  }
  return normalized.resolved ?? { item: null };
}

function buildSourceSummaryLines(normalized: EntryTeaserData) {
  const source = normalized.source ?? {};
  if (source.mode === "listing") {
    const listingModeLabel =
      normalized.sourceMode === "manual"
        ? "Manual row"
        : normalized.sourceMode === "featured"
          ? "Featured entry"
          : "Latest entry";
    return [
      `Listing query ID: ${(source.listingQueryId ?? "").trim() || "Not selected"}`,
      `Template ID: ${(source.listingTemplateId ?? "").trim() || "Optional"}`,
      `Listing mode: ${listingModeLabel}`,
      normalized.sourceMode === "manual"
        ? `Manual target: ${(source.listingManualTarget?.entryId ?? "").trim() || (source.listingManualTarget?.rowId ?? "").trim() || "Not selected"}`
        : null,
    ].filter((line): line is string => typeof line === "string");
  }

  return [
    `Content type ID: ${(source.contentTypeId ?? "").trim() || "Not selected"}`,
    normalized.sourceMode === "manual"
      ? `Entry ID: ${(source.entryId ?? "").trim() || "Not selected"}`
      : `Mode: ${sourceModeOptions.find((option) => option.id === normalized.sourceMode)?.label ?? "Latest entry"}`,
  ];
}

function SourcePickerFields({
  value,
  onChange,
  dataSourceMode,
  sourceMode,
}: {
  value: EntryTeaserData;
  onChange: (next: EntryTeaserData) => void;
  dataSourceMode: EntryTeaserDataSourceMode;
  sourceMode: EntryTeaserSourceMode;
}) {
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const normalized = normalizeValue(value);
  const selectedTypeId = normalized.source?.contentTypeId ?? "";
  const selectedEntryId = normalized.source?.entryId ?? "";
  const selectedListingQueryId = normalized.source?.listingQueryId ?? "";
  const selectedListingTemplateId = normalized.source?.listingTemplateId ?? "";
  const selectedListingManualRowId = normalized.source?.listingManualTarget?.rowId ?? "";

  const loadContentTypes = useCallback(async (options?: { markLoading?: boolean }) => {
    if (options?.markLoading !== false) {
      setIsLoadingTypes(true);
    }
    setTypesError(null);
    try {
      const items = await listContentTypesCached({ force: true });
      setTypes(items);
    } catch (err) {
      setTypesError(
        resolveSourcePickerError(err, {
          authMessage: "Your session cannot load content types. Sign in again and retry.",
          fallbackMessage: "Failed to load content types.",
        })
      );
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await listContentTypesCached({ force: true });
        if (!active) return;
        setTypes(items);
        setTypesError(null);
      } catch (err) {
        if (!active) return;
        setTypesError(
          resolveSourcePickerError(err, {
            authMessage: "Your session cannot load content types. Sign in again and retry.",
            fallbackMessage: "Failed to load content types.",
          })
        );
      } finally {
        if (active) {
          setIsLoadingTypes(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const { ensureEntriesLoaded, getEntriesForTypeId, isEntriesLoading, entryLoadError } =
    useContentTypeEntries(types);
  const {
    queries,
    templates,
    loading: isLoadingListings,
    error: listingsError,
    retry: retryListings,
  } = useListingOptions();

  const selectedType = types.find((entry) => entry.id === selectedTypeId);
  const selectedTypeSlug = selectedType?.slug ?? "";
  const entries = getEntriesForTypeId(selectedTypeId);
  const selectedListingQuery = queries.find((entry) => entry.id === selectedListingQueryId) ?? null;
  const {
    items: listingManualOptions,
    error: listingManualError,
    loading: isLoadingListingManualOptions,
    retry: retryListingManualOptions,
  } = useListingManualOptions(
    selectedListingQuery,
    dataSourceMode === "listing" &&
      sourceMode === "manual" &&
      selectedListingQueryId.trim().length > 0
  );

  useEffect(() => {
    if (sourceMode !== "manual") return;
    if (!selectedTypeSlug) return;
    void ensureEntriesLoaded(selectedTypeSlug);
  }, [sourceMode, selectedTypeSlug, ensureEntriesLoaded]);

  const selectedTypeValue =
    selectedTypeId.trim().length > 0 ? selectedTypeId : NO_CONTENT_TYPE_VALUE;
  const contentTypeNameCounts = buildContentTypeNameCounts(types);
  const selectedTypeLabel =
    selectedTypeValue === NO_CONTENT_TYPE_VALUE
      ? "No content type selected"
      : selectedType
        ? buildContentTypeOptionLabel(selectedType, contentTypeNameCounts)
        : "Selected content type";

  const selectedEntryValue = selectedEntryId.trim().length > 0 ? selectedEntryId : NO_ENTRY_VALUE;
  const selectedEntryLabel =
    selectedEntryValue === NO_ENTRY_VALUE
      ? "No entry selected"
      : (() => {
          const entry = entries.find((item) => item.id === selectedEntryValue);
          if (!entry) return "Selected entry";
          return `${entry.title} (${entry.status})`;
        })();
  const selectedListingQueryValue =
    selectedListingQueryId.trim().length > 0 ? selectedListingQueryId : NO_LISTING_QUERY_VALUE;
  const selectedListingTemplateValue =
    selectedListingTemplateId.trim().length > 0
      ? selectedListingTemplateId
      : NO_LISTING_TEMPLATE_VALUE;
  const selectedListingQueryLabel =
    selectedListingQueryValue === NO_LISTING_QUERY_VALUE
      ? "No listing query selected"
      : (queries.find((item) => item.id === selectedListingQueryValue)?.name ??
        "Selected listing query");
  const selectedListingTemplateLabel =
    selectedListingTemplateValue === NO_LISTING_TEMPLATE_VALUE
      ? "No template selected (optional)"
      : (templates.find((item) => item.id === selectedListingTemplateValue)?.name ??
        "Selected listing template");
  const selectedListingManualValue =
    selectedListingManualRowId.trim().length > 0
      ? selectedListingManualRowId
      : NO_LISTING_MANUAL_VALUE;
  const selectedListingManualLabel =
    selectedListingManualValue === NO_LISTING_MANUAL_VALUE
      ? "No listing row selected"
      : (listingManualOptions.find((item) => item.value === selectedListingManualValue)?.label ??
        "Selected listing row");

  return (
    <div className="space-y-3">
      {dataSourceMode === "listing" ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Source mode</p>
            <Select
              value={sourceMode}
              onValueChange={(next) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  sourceMode: next as EntryTeaserSourceMode,
                  source:
                    next === "manual"
                      ? current.source
                      : {
                          ...current.source,
                          listingManualTarget: {
                            rowId: "",
                            entryId: "",
                          },
                        },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source mode" />
              </SelectTrigger>
              <SelectContent>
                {sourceModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Listing mode can resolve the latest result, the first featured result, or one
              deterministic manual row.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Listing query</p>
            <Select
              value={selectedListingQueryValue}
              onValueChange={(next) =>
                updateSource(value, onChange, {
                  listingQueryId: next === NO_LISTING_QUERY_VALUE ? "" : next,
                  listingManualTarget: {
                    rowId: "",
                    entryId: "",
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select listing query">
                  {selectedListingQueryLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LISTING_QUERY_VALUE}>No listing query selected</SelectItem>
                {queries.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Listing template</p>
            <Select
              value={selectedListingTemplateValue}
              onValueChange={(next) =>
                updateSource(value, onChange, {
                  listingTemplateId: next === NO_LISTING_TEMPLATE_VALUE ? "" : next,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select listing template">
                  {selectedListingTemplateLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LISTING_TEMPLATE_VALUE}>
                  No template selected (optional)
                </SelectItem>
                {templates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoadingListings ? (
            <p className="text-xs text-muted-foreground">Loading listings options...</p>
          ) : null}
          {listingsError ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{listingsError}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void retryListings()}
              >
                Retry listings
              </Button>
            </div>
          ) : null}
          {sourceMode === "manual" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Manual listing row</p>
              <Select
                value={selectedListingManualValue}
                onValueChange={(next) => {
                  const selectedOption = listingManualOptions.find((item) => item.value === next);
                  updateSource(value, onChange, {
                    listingManualTarget:
                      next === NO_LISTING_MANUAL_VALUE || !selectedOption
                        ? {
                            rowId: "",
                            entryId: "",
                          }
                        : {
                            rowId: selectedOption.target.rowId,
                            entryId: selectedOption.target.entryId ?? "",
                          },
                  });
                }}
                disabled={!selectedListingQuery}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select listing row">
                    {selectedListingManualLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LISTING_MANUAL_VALUE}>No listing row selected</SelectItem>
                  {listingManualOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedListingQuery ? (
                <p className="text-xs text-muted-foreground">
                  Choose a listing query before selecting a manual row.
                </p>
              ) : null}
              {selectedListingQuery && isLoadingListingManualOptions ? (
                <p className="text-xs text-muted-foreground">Loading listing rows...</p>
              ) : null}
              {selectedListingQuery &&
              !isLoadingListingManualOptions &&
              !listingManualError &&
              listingManualOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This listing preview has no stable row IDs for manual selection.
                </p>
              ) : null}
              {listingManualError ? (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">{listingManualError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void retryListingManualOptions()}
                  >
                    Retry listing rows
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Content type</p>
            <Select
              value={selectedTypeValue}
              onValueChange={(next) =>
                updateSource(value, onChange, {
                  contentTypeId: next === NO_CONTENT_TYPE_VALUE ? "" : next,
                  entryId: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type">{selectedTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CONTENT_TYPE_VALUE}>No content type selected</SelectItem>
                {types.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {buildContentTypeOptionLabel(entry, contentTypeNameCounts)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingTypes ? (
              <p className="text-xs text-muted-foreground">Loading content types...</p>
            ) : null}
            {typesError ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{typesError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void loadContentTypes()}
                >
                  Retry content types
                </Button>
              </div>
            ) : null}
          </div>

          {sourceMode === "manual" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Manual entry</p>
              <Select
                value={selectedEntryValue}
                onValueChange={(next) =>
                  updateSource(value, onChange, {
                    entryId: next === NO_ENTRY_VALUE ? "" : next,
                  })
                }
                disabled={!selectedTypeSlug}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entry">{selectedEntryLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ENTRY_VALUE}>No entry selected</SelectItem>
                  {entries.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.title}
                      {` (${entry.status})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeSlug && isEntriesLoading(selectedTypeSlug) ? (
                <p className="text-xs text-muted-foreground">Loading entries...</p>
              ) : null}
              {selectedTypeSlug &&
              !isEntriesLoading(selectedTypeSlug) &&
              !entryLoadError &&
              entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No entries loaded yet for selected content type.
                </p>
              ) : null}
              {entryLoadError ? (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">{entryLoadError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void ensureEntriesLoaded(selectedTypeSlug, { force: true })}
                  >
                    Retry entries
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SourceSummaryCard({
  value,
  context,
}: {
  value: EntryTeaserData;
  context?: WidgetEditorProps<EntryTeaserData>["context"];
}) {
  const normalized = normalizeValue(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const summaryLines = buildSourceSummaryLines(normalized);
  const previewTitle = resolved.item?.title?.trim();
  const previewStatus = resolved.item?.status?.trim();

  return (
    <EditorSection
      title="Source summary"
      description="Use Wizard mode to change the source. Visual mode keeps this as read-only context."
    >
      <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
        <p className="text-sm font-medium">
          {dataSourceModeOptions.find(
            (option) => option.id === (normalized.source?.mode ?? "legacy")
          )?.label ?? "Content type"}
        </p>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {summaryLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {previewTitle ? (
            <p className="text-foreground/80">
              Preview item: {previewTitle}
              {previewStatus ? ` (${previewStatus})` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </EditorSection>
  );
}

function FieldTogglePreview({
  value,
  variant,
  context,
}: {
  value: EntryTeaserData;
  variant: string;
  context?: WidgetEditorProps<EntryTeaserData>["context"];
}) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveEntryTeaserVariant(variant);
  const previewResolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const previewItem = previewResolved.item;
  const previewLoading = context?.previewState?.status === "loading";
  const fields = normalized.fields ?? {};
  const title = previewItem?.title?.trim() || normalized.fallback?.title || "No entry selected";
  const excerpt =
    previewItem?.excerpt?.trim() ||
    normalized.fallback?.description ||
    "Choose a source mode and content type.";
  const meta =
    previewItem?.publishedAt || previewItem?.authorName
      ? [previewItem?.publishedAt?.slice(0, 10), previewItem?.authorName]
          .filter(Boolean)
          .join(" • ")
      : "Meta hidden until teaser content resolves.";
  const visibleTags = (previewItem?.tags ?? []).slice(0, normalized.fields?.tagLimit ?? 5);

  return (
    <div
      className="rounded-lg border border-border/70 bg-muted/10 p-3"
      data-entry-teaser-field-preview={resolvedVariant}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Field preview</p>
        <Badge variant="outline">{resolvedVariant}</Badge>
      </div>
      {previewLoading ? (
        <p className="text-xs text-muted-foreground">Loading resolved teaser preview...</p>
      ) : (
        <div className="space-y-2">
          {(fields.showImage ?? true) ? (
            <div className="h-16 rounded-md border border-dashed border-border/70 bg-background/60" />
          ) : null}
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {(fields.showMeta ?? true) ? (
            <p className="text-xs text-muted-foreground">{meta}</p>
          ) : null}
          {(fields.showExcerpt ?? true) ? (
            <p className="text-xs text-muted-foreground">{excerpt}</p>
          ) : null}
          {(fields.showTags ?? true) ? (
            <div className="flex flex-wrap gap-2">
              {visibleTags.length > 0 ? (
                visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Tags appear here when the resolved entry exposes them.
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SectionContextFields({
  value,
  onChange,
}: {
  value: EntryTeaserData;
  onChange: (next: EntryTeaserData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      title="Section context"
      description="Add an optional section heading and control the teaser title level."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Section heading</p>
          <Input
            value={normalized.section?.title ?? ""}
            onChange={(event) => updateSection(value, onChange, { title: event.target.value })}
            placeholder="Featured article"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Section heading level</p>
          <Select
            value={normalized.section?.headingLevel ?? "h2"}
            onValueChange={(next) =>
              updateSection(value, onChange, { headingLevel: next as EntryTeaserHeadingLevel })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select heading level" />
            </SelectTrigger>
            <SelectContent>
              {headingLevelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Entry title heading level</p>
        <Select
          value={normalized.title?.headingLevel ?? "h3"}
          onValueChange={(next) =>
            updateTitleSettings(value, onChange, { headingLevel: next as EntryTeaserHeadingLevel })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select entry heading level" />
          </SelectTrigger>
          <SelectContent>
            {headingLevelOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </EditorSection>
  );
}

function LayoutAndMediaFields({
  value,
  onChange,
}: {
  value: EntryTeaserData;
  onChange: (next: EntryTeaserData) => void;
}) {
  const normalized = normalizeValue(value);

  return (
    <EditorSection
      title="Layout and media"
      description="Control width, media presentation, and tag density with fixed teaser tokens."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Max width</p>
          <Select
            value={normalized.layout?.maxWidth ?? "lg"}
            onValueChange={(next) =>
              updateLayout(value, onChange, { maxWidth: next as EntryTeaserMaxWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select max width" />
            </SelectTrigger>
            <SelectContent>
              {maxWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Tag limit</p>
          <Select
            value={String(normalized.fields?.tagLimit ?? 5)}
            onValueChange={(next) =>
              updateFields(value, onChange, { tagLimit: Number.parseInt(next, 10) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tag limit" />
            </SelectTrigger>
            <SelectContent>
              {tagLimitOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Media mode</p>
          <Select
            value={normalized.media?.mode ?? "image"}
            onValueChange={(next) =>
              updateMedia(value, onChange, { mode: next as EntryTeaserMediaMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select media mode" />
            </SelectTrigger>
            <SelectContent>
              {mediaModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Image aspect</p>
          <Select
            value={normalized.media?.aspect ?? "auto"}
            onValueChange={(next) =>
              updateMedia(value, onChange, { aspect: next as EntryTeaserImageAspect })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select image aspect" />
            </SelectTrigger>
            <SelectContent>
              {mediaAspectOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Media height</p>
          <Select
            value={normalized.media?.height ?? "auto"}
            onValueChange={(next) =>
              updateMedia(value, onChange, { height: next as EntryTeaserImageHeight })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select media height" />
            </SelectTrigger>
            <SelectContent>
              {mediaHeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Object fit</p>
          <Select
            value={normalized.media?.fit ?? "cover"}
            onValueChange={(next) =>
              updateMedia(value, onChange, { fit: next as EntryTeaserObjectFit })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select object fit" />
            </SelectTrigger>
            <SelectContent>
              {mediaFitOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </EditorSection>
  );
}

function RuntimeSnapshotSection({
  value,
  context,
}: {
  value: EntryTeaserData;
  context?: WidgetEditorProps<EntryTeaserData>["context"];
}) {
  const normalized = normalizeValue(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const snapshotJson = JSON.stringify(resolved ?? { item: null }, null, 2);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    try {
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard?.writeText) {
        throw new Error("clipboard_unavailable");
      }
      await clipboard.writeText(snapshotJson);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <EditorSection
      title="Runtime payload snapshot"
      description="Read-only resolved payload from runtime preview/public rendering."
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
          Copy JSON
        </Button>
        {copyStatus === "copied" ? (
          <p className="text-xs text-muted-foreground">Snapshot copied.</p>
        ) : copyStatus === "error" ? (
          <p className="text-xs text-destructive">
            Clipboard copy failed. You can still inspect the JSON below.
          </p>
        ) : null}
      </div>
      <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed">
        {snapshotJson}
      </pre>
    </EditorSection>
  );
}

function EntryTeaserCtaFields({
  value,
  onChange,
}: {
  value: EntryTeaserData;
  onChange: (next: EntryTeaserData) => void;
}) {
  const normalized = normalizeValue(value);
  const currentCustomHref = normalized.cta?.href ?? "";
  const [customHrefDraft, setCustomHrefDraft] = useState(currentCustomHref);
  const customHrefValidation =
    customHrefDraft.trim().length > 0 &&
    !normalizeWidgetSafeHref(customHrefDraft, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    })
      ? "Use a relative path, hash link, or http(s) URL."
      : null;

  return (
    <EditorSection title="CTA behavior" description="Configure teaser action link.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">CTA label</p>
          <Input
            value={normalized.cta?.label ?? "Read more"}
            onChange={(event) => updateCta(value, onChange, { label: event.target.value })}
            placeholder="Read more"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Href mode</p>
          <Select
            value={normalized.cta?.hrefMode ?? "auto"}
            onValueChange={(next) => {
              const nextMode = next as EntryTeaserCtaHrefMode;
              if (nextMode === "custom") {
                setCustomHrefDraft(currentCustomHref);
              }
              updateCta(value, onChange, {
                hrefMode: nextMode,
                href: nextMode === "custom" ? currentCustomHref : "",
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select href mode" />
            </SelectTrigger>
            <SelectContent>
              {hrefModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(normalized.cta?.hrefMode ?? "auto") === "auto" ? (
            <p className="text-xs text-muted-foreground">
              Auto entry URL uses the resolved entry detail route from CMS content routes.
            </p>
          ) : null}
        </div>
      </div>
      {(normalized.cta?.hrefMode ?? "auto") === "custom" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Custom URL</p>
          <Input
            value={customHrefDraft}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCustomHrefDraft(nextValue);
              updateCta(value, onChange, { href: nextValue });
            }}
            placeholder="/blog/entry-slug or https://..."
          />
          {customHrefValidation ? (
            <p className="text-xs text-destructive">{customHrefValidation}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Leave the field empty to keep the CTA visible but non-navigating until a valid URL is
              set.
            </p>
          )}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
          <span className="text-sm">Open in new tab</span>
          <Switch
            checked={normalized.cta?.opensInNewTab ?? false}
            onCheckedChange={(checked) => updateCta(value, onChange, { opensInNewTab: checked })}
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">CTA style</p>
          <Select
            value={normalized.cta?.style ?? "link"}
            onValueChange={(next) =>
              updateCta(value, onChange, { style: next as EntryTeaserCtaStyle })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select CTA style" />
            </SelectTrigger>
            <SelectContent>
              {ctaStyleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </EditorSection>
  );
}

export function EntryTeaserWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const dataSourceMode = normalized.source?.mode ?? "legacy";
  const sourceMode = normalized.sourceMode ?? "latest";
  const resolvedVariant = resolveEntryTeaserVariant(variant);

  useEntryTeaserAdminPreview({
    value,
    active: context?.editorMode === "wizard" && typeof context?.setPreviewState === "function",
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <EditorSection title="Source mode" description="Choose where teaser content comes from.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Source type</p>
          <Select
            value={dataSourceMode}
            onValueChange={(next) =>
              updateSourceDataMode(value, onChange, next as EntryTeaserDataSourceMode)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source mode" />
            </SelectTrigger>
            <SelectContent>
              {dataSourceModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dataSourceMode === "legacy" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Mode</p>
            <Select
              value={sourceMode}
              onValueChange={(next) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  sourceMode: next as EntryTeaserSourceMode,
                  source: {
                    ...current.source,
                    entryId: next === "manual" ? (current.source?.entryId ?? "") : "",
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source mode" />
              </SelectTrigger>
              <SelectContent>
                {sourceModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <SourcePickerFields
          value={value}
          onChange={onChange}
          dataSourceMode={dataSourceMode}
          sourceMode={sourceMode}
        />
      </EditorSection>

      <EditorSection
        title="Variant"
        description="Pick teaser card orientation with a visual thumbnail."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
      </EditorSection>
    </div>
  );
}

export function EntryTeaserVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const resolvedVariant = resolveEntryTeaserVariant(variant);

  useEntryTeaserAdminPreview({
    value,
    active: context?.editorMode === "visual" && typeof context?.setPreviewState === "function",
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <EditorSection title="Variant and structure" description="Control teaser layout direction.">
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
      </EditorSection>

      <SectionContextFields value={value} onChange={onChange} />

      <SourceSummaryCard value={value} context={context} />

      <EditorSection
        title="Teaser content fields"
        description="Toggle visible entry properties in teaser card and verify the local preview response."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show image</span>
            <Switch
              checked={normalized.fields?.showImage ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showImage: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show excerpt</span>
            <Switch
              checked={normalized.fields?.showExcerpt ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showExcerpt: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show meta</span>
            <Switch
              checked={normalized.fields?.showMeta ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showMeta: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show tags</span>
            <Switch
              checked={normalized.fields?.showTags ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showTags: checked })}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          These toggles update the teaser preview using resolved entry data when the source can be
          loaded.
        </p>
        <FieldTogglePreview value={value} variant={resolvedVariant} context={context} />
      </EditorSection>

      <EntryTeaserCtaFields
        key={context?.blockId ?? "entry-teaser-cta"}
        value={value}
        onChange={onChange}
      />

      <EditorSection
        title="Fallback state"
        description="Edit the empty-state copy and featured-entry fallback behavior together."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Fallback title</p>
          <Input
            value={normalized.fallback?.title ?? ""}
            onChange={(event) => updateFallback(value, onChange, { title: event.target.value })}
            placeholder="No entry selected"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Fallback description</p>
          <Textarea
            value={normalized.fallback?.description ?? ""}
            onChange={(event) =>
              updateFallback(value, onChange, { description: event.target.value })
            }
            rows={3}
            placeholder="Choose a source mode and content type."
          />
        </div>
        <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
          <span className="text-sm">Fallback to latest when featured is missing</span>
          <Switch
            checked={normalized.fallback?.fallbackToLatest ?? true}
            onCheckedChange={(checked) =>
              updateFallback(value, onChange, { fallbackToLatest: checked })
            }
          />
        </label>
      </EditorSection>
    </div>
  );
}

export function EntryTeaserAdvancedEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);

  useEntryTeaserAdminPreview({
    value,
    active: context?.editorMode === "advanced" && typeof context?.setPreviewState === "function",
    setPreviewState: context?.setPreviewState,
  });

  return (
    <div className="space-y-4">
      <LayoutAndMediaFields value={value} onChange={onChange} />

      <EditorSection title="Style tokens" description="Direct style tokens for teaser surface.">
        <div className="grid gap-3 sm:grid-cols-2">
          <SharedColorControl
            label="Surface color"
            value={normalized.style?.surface}
            onChange={(next) => updateStyle(value, onChange, { surface: next })}
            onSwatchChange={(next) => updateStyle(value, onChange, { surface: next })}
            onClear={() => clearStyle(value, onChange, "surface")}
            placeholder="var(--color-bg)"
            pickerFallback="#ffffff"
          />
          <SharedColorControl
            label="Border color"
            value={normalized.style?.border}
            onChange={(next) => updateStyle(value, onChange, { border: next })}
            onSwatchChange={(next) => updateStyle(value, onChange, { border: next })}
            onClear={() => clearStyle(value, onChange, "border")}
            placeholder="var(--color-border)"
            pickerFallback="#d4d4d8"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Radius token</p>
            <Select
              value={normalized.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as EntryTeaserRadius })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing token</p>
            <Select
              value={normalized.style?.spacing ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { spacing: next as EntryTeaserSpacing })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select spacing" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <RuntimeSnapshotSection value={value} context={context} />
    </div>
  );
}
