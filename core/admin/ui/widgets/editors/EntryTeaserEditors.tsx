import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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
  type ListingQueryRecord,
  type ListingTemplateRecord,
} from "@/services/listingsClient";

import {
  type EntryTeaserDataSourceMode,
  normalizeEntryTeaserData,
  resolveEntryTeaserVariant,
  type EntryTeaserCtaHrefMode,
  type EntryTeaserData,
  type EntryTeaserSourceMode,
  type EntryTeaserVariantId,
  type EntryTeaserRadius,
  type EntryTeaserSpacing,
} from "../../../../widgets/core/entryTeaser";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";
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
  { id: "legacy", label: "Legacy content type source" },
  { id: "listing", label: "Listings query source" },
];

const hrefModeOptions: Array<{ id: EntryTeaserCtaHrefMode; label: string }> = [
  { id: "auto", label: "Auto entry URL" },
  { id: "custom", label: "Custom URL" },
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

const NO_CONTENT_TYPE_VALUE = "__no_content_type__";
const NO_ENTRY_VALUE = "__no_entry__";
const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const NO_LISTING_TEMPLATE_VALUE = "__no_listing_template__";

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
  const [entryLoadError, setEntryLoadError] = useState<string | null>(null);

  const ensureEntriesLoaded = useCallback(
    async (typeSlug: string) => {
      if (!typeSlug) return;
      if (entriesByTypeSlug[typeSlug]) return;
      try {
        const rows = await listEntriesCached(typeSlug, { force: true });
        setEntriesByTypeSlug((current) => ({
          ...current,
          [typeSlug]: rows,
        }));
      } catch (err) {
        if (isApiClientError(err)) {
          setEntryLoadError(err.message);
        } else {
          setEntryLoadError("Failed to load entries.");
        }
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

  return {
    ensureEntriesLoaded,
    getEntriesForTypeId,
    entryLoadError,
  };
}

function useListingOptions() {
  const [queries, setQueries] = useState<ListingQueryRecord[]>([]);
  const [templates, setTemplates] = useState<ListingTemplateRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      listListingQueriesCached({ force: true }),
      listListingTemplatesCached({ force: true }),
    ])
      .then(([nextQueries, nextTemplates]) => {
        if (!active) return;
        setQueries(nextQueries);
        setTemplates(nextTemplates);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load listings options.");
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    queries,
    templates,
    loading,
    error,
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
        : { listingQueryId: "", listingTemplateId: "" }),
    },
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

function SourcePickerFields({
  value,
  onChange,
  dataSourceMode,
  sourceMode,
  compact,
}: {
  value: EntryTeaserData;
  onChange: (next: EntryTeaserData) => void;
  dataSourceMode: EntryTeaserDataSourceMode;
  sourceMode: EntryTeaserSourceMode;
  compact?: boolean;
}) {
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const normalized = normalizeValue(value);
  const selectedTypeId = normalized.source?.contentTypeId ?? "";
  const selectedEntryId = normalized.source?.entryId ?? "";
  const selectedListingQueryId = normalized.source?.listingQueryId ?? "";
  const selectedListingTemplateId = normalized.source?.listingTemplateId ?? "";

  useEffect(() => {
    let active = true;
    listContentTypesCached({ force: true })
      .then((items) => {
        if (!active) return;
        setTypes(items);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setTypesError(err.message);
        } else {
          setTypesError("Failed to load content types.");
        }
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingTypes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { ensureEntriesLoaded, getEntriesForTypeId, entryLoadError } = useContentTypeEntries(types);
  const {
    queries,
    templates,
    loading: isLoadingListings,
    error: listingsError,
  } = useListingOptions();

  const selectedType = types.find((entry) => entry.id === selectedTypeId);
  const selectedTypeSlug = selectedType?.slug ?? "";
  const entries = getEntriesForTypeId(selectedTypeId);

  useEffect(() => {
    if (sourceMode !== "manual") return;
    if (!selectedTypeSlug) return;
    void ensureEntriesLoaded(selectedTypeSlug);
  }, [sourceMode, selectedTypeSlug, ensureEntriesLoaded]);

  const selectedTypeValue =
    selectedTypeId.trim().length > 0 ? selectedTypeId : NO_CONTENT_TYPE_VALUE;
  const selectedTypeLabel =
    selectedTypeValue === NO_CONTENT_TYPE_VALUE
      ? "No content type selected"
      : (selectedType?.name ?? "Selected content type");

  const selectedEntryValue = selectedEntryId.trim().length > 0 ? selectedEntryId : NO_ENTRY_VALUE;
  const selectedEntryLabel =
    selectedEntryValue === NO_ENTRY_VALUE
      ? "No entry selected"
      : (entries.find((entry) => entry.id === selectedEntryValue)?.title ?? "Selected entry");
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

  return (
    <div className="space-y-3">
      {dataSourceMode === "listing" ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Listing query</p>
            <Select
              value={selectedListingQueryValue}
              onValueChange={(next) =>
                updateSource(value, onChange, {
                  listingQueryId: next === NO_LISTING_QUERY_VALUE ? "" : next,
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
          {listingsError ? <p className="text-xs text-destructive">{listingsError}</p> : null}
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
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingTypes ? (
              <p className="text-xs text-muted-foreground">Loading content types...</p>
            ) : null}
            {typesError ? <p className="text-xs text-destructive">{typesError}</p> : null}
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
                      {compact ? "" : ` (${entry.status})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeSlug && entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No entries loaded yet for selected content type.
                </p>
              ) : null}
              {entryLoadError ? <p className="text-xs text-destructive">{entryLoadError}</p> : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function EntryTeaserWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const dataSourceMode = normalized.source?.mode ?? "legacy";
  const sourceMode = normalized.sourceMode ?? "latest";
  const resolvedVariant = resolveEntryTeaserVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection title="Source mode" description="Choose where teaser content comes from.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Data source mode</p>
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
          compact
        />
      </EditorSection>

      <EditorSection title="Variant" description="Pick teaser card orientation.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Layout variant</p>
          <Select value={resolvedVariant} onValueChange={(next) => onVariantChange?.(next)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose variant" />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>
    </div>
  );
}

export function EntryTeaserVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const dataSourceMode = normalized.source?.mode ?? "legacy";
  const sourceMode = normalized.sourceMode ?? "latest";
  const resolvedVariant = resolveEntryTeaserVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection title="Variant and structure" description="Control teaser layout direction.">
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection title="Source configuration" description="Choose source mode and content.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Data source mode</p>
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
            <p className="text-sm font-medium">Source mode</p>
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
        title="Teaser content fields"
        description="Toggle visible entry properties in teaser card."
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
      </EditorSection>

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
              onValueChange={(next) =>
                updateCta(value, onChange, { hrefMode: next as EntryTeaserCtaHrefMode })
              }
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
          </div>
        </div>
        {(normalized.cta?.hrefMode ?? "auto") === "custom" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Custom URL</p>
            <Input
              value={normalized.cta?.href ?? ""}
              onChange={(event) => updateCta(value, onChange, { href: event.target.value })}
              placeholder="/blog/entry-slug or https://..."
            />
          </div>
        ) : null}
      </EditorSection>

      <EditorSection title="Empty state copy" description="Text for unresolved teaser source.">
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
      </EditorSection>
    </div>
  );
}

export function EntryTeaserAdvancedEditor({ value, onChange }: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const dataSourceMode = normalized.source?.mode ?? "legacy";
  const sourceMode = normalized.sourceMode ?? "latest";

  return (
    <div className="space-y-4">
      <EditorSection
        title="Source wiring"
        description="Technical source controls for legacy vs listings mode."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Data source mode</p>
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
        <SourcePickerFields
          value={value}
          onChange={onChange}
          dataSourceMode={dataSourceMode}
          sourceMode={sourceMode}
          compact
        />
      </EditorSection>

      <EditorSection title="Style tokens" description="Direct style tokens for teaser surface.">
        <div className="grid gap-3 sm:grid-cols-2">
          <ClearableInputField
            label="Surface color"
            value={normalized.style?.surface}
            onChange={(next) => updateStyle(value, onChange, { surface: next })}
            onClear={() => clearStyle(value, onChange, "surface")}
            placeholder="var(--color-bg)"
          />
          <ClearableInputField
            label="Border color"
            value={normalized.style?.border}
            onChange={(next) => updateStyle(value, onChange, { border: next })}
            onClear={() => clearStyle(value, onChange, "border")}
            placeholder="var(--color-border)"
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

      <EditorSection
        title="Fallback behavior"
        description="Technical fallback logic for featured source mode."
      >
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

      <EditorSection
        title="Runtime payload snapshot"
        description="Read-only resolved payload from runtime preview/public rendering."
      >
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed">
          {JSON.stringify(normalized.resolved ?? { item: null }, null, 2)}
        </pre>
      </EditorSection>
    </div>
  );
}
