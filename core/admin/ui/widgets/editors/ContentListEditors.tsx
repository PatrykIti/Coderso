import { useEffect, useState, type ReactNode } from "react";

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
import {
  listListingQueriesCached,
  listListingTemplatesCached,
  type ListingQueryRecord,
  type ListingTemplateRecord,
} from "@/services/listingsClient";

import {
  contentListDefaults,
  normalizeContentListData,
  normalizeContentListLimit,
  type ContentListSourceMode,
  resolveContentListVariant,
  type ContentListCardStyle,
  type ContentListData,
  type ContentListGap,
  type ContentListSort,
  type ContentListStatusScope,
  type ContentListVariantId,
} from "../../../../widgets/core/contentList";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";

const variantOptions: Array<{
  id: ContentListVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "cards",
    label: "Cards",
    description: "Card grid with visual emphasis and optional media.",
  },
  {
    id: "list",
    label: "List",
    description: "Single-column stream for article-like browsing.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Dense layout for sidebars and short collections.",
  },
];

const sourceModeOptions: Array<{ id: ContentListSourceMode; label: string }> = [
  { id: "legacy", label: "Legacy content type source" },
  { id: "listing", label: "Listings query source" },
];

const statusScopeOptions: Array<{ id: ContentListStatusScope; label: string }> = [
  { id: "published", label: "Published only" },
  { id: "all", label: "All statuses" },
  { id: "draft", label: "Draft only" },
  { id: "scheduled", label: "Scheduled only" },
  { id: "archived", label: "Archived only" },
];

const sortOptions: Array<{ id: ContentListSort; label: string }> = [
  { id: "published-desc", label: "Newest published first" },
  { id: "published-asc", label: "Oldest published first" },
  { id: "updated-desc", label: "Recently updated first" },
  { id: "updated-asc", label: "Oldest update first" },
  { id: "title-asc", label: "Title A-Z" },
  { id: "title-desc", label: "Title Z-A" },
];

const columnsOptions = [
  { id: "1", label: "1 column" },
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
] as const;

const gapOptions: Array<{ id: ContentListGap; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const cardStyleOptions: Array<{ id: ContentListCardStyle; label: string }> = [
  { id: "outlined", label: "Outlined" },
  { id: "elevated", label: "Elevated" },
  { id: "minimal", label: "Minimal" },
];

const NO_CONTENT_TYPE_VALUE = "__no_content_type__";
const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const NO_LISTING_TEMPLATE_VALUE = "__no_listing_template__";

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: ContentListVariantId;
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

function ContentTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          setError(err.message);
        } else {
          setError("Failed to load content types.");
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

  const selectValue = value.trim().length > 0 ? value : NO_CONTENT_TYPE_VALUE;
  const selectedLabel =
    selectValue === NO_CONTENT_TYPE_VALUE
      ? "No content type selected"
      : (types.find((entry) => entry.id === selectValue)?.name ?? "Selected content type");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Content type</p>
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === NO_CONTENT_TYPE_VALUE ? "" : next)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select content type">{selectedLabel}</SelectValue>
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
      {loading ? <p className="text-xs text-muted-foreground">Loading content types...</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
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

function ListingSourceSelect({
  queryId,
  templateId,
  onQueryChange,
  onTemplateChange,
}: {
  queryId: string;
  templateId: string;
  onQueryChange: (next: string) => void;
  onTemplateChange: (next: string) => void;
}) {
  const { queries, templates, loading, error } = useListingOptions();
  const querySelectValue = queryId.trim().length > 0 ? queryId : NO_LISTING_QUERY_VALUE;
  const templateSelectValue = templateId.trim().length > 0 ? templateId : NO_LISTING_TEMPLATE_VALUE;
  const selectedQueryName =
    querySelectValue === NO_LISTING_QUERY_VALUE
      ? "No listing query selected"
      : (queries.find((item) => item.id === querySelectValue)?.name ?? "Selected listing query");
  const selectedTemplateName =
    templateSelectValue === NO_LISTING_TEMPLATE_VALUE
      ? "No template selected (optional)"
      : (templates.find((item) => item.id === templateSelectValue)?.name ??
        "Selected listing template");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Listing query</p>
        <Select
          value={querySelectValue}
          onValueChange={(next) => onQueryChange(next === NO_LISTING_QUERY_VALUE ? "" : next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select listing query">{selectedQueryName}</SelectValue>
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
          value={templateSelectValue}
          onValueChange={(next) => onTemplateChange(next === NO_LISTING_TEMPLATE_VALUE ? "" : next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select listing template">{selectedTemplateName}</SelectValue>
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
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading listings options...</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function normalizeValue(value: ContentListData): ContentListData {
  return normalizeContentListData(value);
}

function updateValue(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
  updater: (current: ContentListData) => ContentListData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

type SourceData = NonNullable<ContentListData["source"]>;
type FilterData = NonNullable<ContentListData["filters"]>;
type FieldData = NonNullable<ContentListData["fields"]>;
type EmptyStateData = NonNullable<ContentListData["emptyState"]>;
type StyleData = NonNullable<ContentListData["style"]>;

function updateSource(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
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

function updateSourceMode(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
  mode: ContentListSourceMode
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    source: {
      ...current.source,
      mode,
      ...(mode === "listing"
        ? { contentTypeId: "" }
        : { listingQueryId: "", listingTemplateId: "" }),
    },
  }));
}

function updateFilters(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
  patch: Partial<FilterData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    filters: {
      ...current.filters,
      ...patch,
    },
  }));
}

function updateFields(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
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

function updateEmptyState(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
  patch: Partial<EmptyStateData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    emptyState: {
      ...current.emptyState,
      ...patch,
    },
  }));
}

function updateStyle(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
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
  value: ContentListData,
  onChange: (next: ContentListData) => void,
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

export function ContentListWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ContentListData>) {
  const resolved = normalizeValue(value);
  const resolvedVariant = resolveContentListVariant(variant);
  const sourceMode = resolved.source?.mode ?? "legacy";

  return (
    <div className="space-y-4">
      <EditorSection
        title="Source setup"
        description="Select data source and quick listing defaults."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Source mode</p>
          <Select
            value={sourceMode}
            onValueChange={(next) =>
              updateSourceMode(value, onChange, next as ContentListSourceMode)
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
        {sourceMode === "listing" ? (
          <ListingSourceSelect
            queryId={resolved.source?.listingQueryId ?? ""}
            templateId={resolved.source?.listingTemplateId ?? ""}
            onQueryChange={(next) => updateSource(value, onChange, { listingQueryId: next })}
            onTemplateChange={(next) => updateSource(value, onChange, { listingTemplateId: next })}
          />
        ) : (
          <ContentTypeSelect
            value={resolved.source?.contentTypeId ?? ""}
            onChange={(next) => updateSource(value, onChange, { contentTypeId: next })}
          />
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium">Item limit</p>
          <Input
            type="number"
            min={1}
            max={24}
            value={String(resolved.source?.limit ?? contentListDefaults.source?.limit ?? 6)}
            onChange={(event) =>
              updateSource(value, onChange, {
                limit: normalizeContentListLimit(Number(event.target.value)),
              })
            }
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Variant"
        description="Pick how entries should be arranged in preview and runtime."
      >
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

export function ContentListVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ContentListData>) {
  const resolved = normalizeValue(value);
  const resolvedVariant = resolveContentListVariant(variant);
  const sourceMode = resolved.source?.mode ?? "legacy";

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout"
        description="Choose list orientation and spacing style."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns</p>
            <Select
              value={resolved.style?.columns ?? "3"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columns: next as "1" | "2" | "3" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent>
                {columnsOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Gap</p>
            <Select
              value={resolved.style?.gap ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { gap: next as ContentListGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Card style</p>
          <Select
            value={resolved.style?.cardStyle ?? "outlined"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { cardStyle: next as ContentListCardStyle })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Card style" />
            </SelectTrigger>
            <SelectContent>
              {cardStyleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Source and filters"
        description="Configure data source and basic filtering behavior."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Source mode</p>
          <Select
            value={sourceMode}
            onValueChange={(next) =>
              updateSourceMode(value, onChange, next as ContentListSourceMode)
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
        {sourceMode === "listing" ? (
          <ListingSourceSelect
            queryId={resolved.source?.listingQueryId ?? ""}
            templateId={resolved.source?.listingTemplateId ?? ""}
            onQueryChange={(next) => updateSource(value, onChange, { listingQueryId: next })}
            onTemplateChange={(next) => updateSource(value, onChange, { listingTemplateId: next })}
          />
        ) : (
          <>
            <ContentTypeSelect
              value={resolved.source?.contentTypeId ?? ""}
              onChange={(next) => updateSource(value, onChange, { contentTypeId: next })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Status scope</p>
                <Select
                  value={resolved.source?.statusScope ?? "published"}
                  onValueChange={(next) =>
                    updateSource(value, onChange, { statusScope: next as ContentListStatusScope })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusScopeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Sort</p>
                <Select
                  value={resolved.source?.sort ?? "published-desc"}
                  onValueChange={(next) =>
                    updateSource(value, onChange, { sort: next as ContentListSort })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Taxonomy/tag filter</p>
              <Input
                value={resolved.filters?.taxonomy ?? ""}
                onChange={(event) =>
                  updateFilters(value, onChange, { taxonomy: event.target.value })
                }
                placeholder="e.g. featured or case-study"
              />
            </div>
          </>
        )}
      </EditorSection>

      <EditorSection
        title="Presentation fields"
        description="Control visible item elements in runtime output."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show image</span>
            <Switch
              checked={resolved.fields?.showImage ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showImage: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show excerpt</span>
            <Switch
              checked={resolved.fields?.showExcerpt ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showExcerpt: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show meta</span>
            <Switch
              checked={resolved.fields?.showMeta ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showMeta: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show CTA link</span>
            <Switch
              checked={resolved.fields?.showCta ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showCta: checked })}
            />
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">CTA label</p>
          <Input
            value={resolved.style?.ctaLabel ?? "Read more"}
            onChange={(event) => updateStyle(value, onChange, { ctaLabel: event.target.value })}
            placeholder="Read more"
          />
        </div>
      </EditorSection>

      <EditorSection title="Empty state" description="Text shown when query returns no entries.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={resolved.emptyState?.title ?? ""}
            onChange={(event) => updateEmptyState(value, onChange, { title: event.target.value })}
            placeholder="No items found"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={resolved.emptyState?.description ?? ""}
            onChange={(event) =>
              updateEmptyState(value, onChange, { description: event.target.value })
            }
            rows={3}
            placeholder="Adjust filters or publish entries for this content type."
          />
        </div>
      </EditorSection>
    </div>
  );
}

export function ContentListAdvancedEditor({ value, onChange }: WidgetEditorProps<ContentListData>) {
  const resolved = normalizeValue(value);
  const sourceMode = resolved.source?.mode ?? "legacy";

  return (
    <div className="space-y-4">
      <EditorSection
        title="Query controls"
        description="Technical filtering and ordering options for runtime resolution."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Source mode</p>
          <Select
            value={sourceMode}
            onValueChange={(next) =>
              updateSourceMode(value, onChange, next as ContentListSourceMode)
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
        {sourceMode === "listing" ? (
          <ListingSourceSelect
            queryId={resolved.source?.listingQueryId ?? ""}
            templateId={resolved.source?.listingTemplateId ?? ""}
            onQueryChange={(next) => updateSource(value, onChange, { listingQueryId: next })}
            onTemplateChange={(next) => updateSource(value, onChange, { listingTemplateId: next })}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Item limit</p>
            <Input
              type="number"
              min={1}
              max={24}
              value={String(resolved.source?.limit ?? 6)}
              onChange={(event) =>
                updateSource(value, onChange, {
                  limit: normalizeContentListLimit(Number(event.target.value)),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Author id filter</p>
            <Input
              value={resolved.filters?.authorId ?? ""}
              onChange={(event) => updateFilters(value, onChange, { authorId: event.target.value })}
              placeholder="Optional author UUID"
              disabled={sourceMode === "listing"}
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Search query</p>
          <Input
            value={resolved.filters?.searchQuery ?? ""}
            onChange={(event) =>
              updateFilters(value, onChange, { searchQuery: event.target.value })
            }
            placeholder="Title, excerpt, tags"
            disabled={sourceMode === "listing"}
          />
        </div>
        <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
          <span className="text-sm">Featured only</span>
          <Switch
            checked={resolved.filters?.featuredOnly ?? false}
            onCheckedChange={(checked) => updateFilters(value, onChange, { featuredOnly: checked })}
            disabled={sourceMode === "listing"}
          />
        </label>
        {sourceMode === "listing" ? (
          <p className="text-xs text-muted-foreground">
            Listing mode uses filters and sorting from the selected Listings query.
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Styling tokens"
        description="Direct color values for cards and text output."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ClearableInputField
            label="Card background"
            value={resolved.style?.backgroundColor}
            onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
            onClear={() => clearStyle(value, onChange, "backgroundColor")}
            placeholder="var(--color-bg)"
          />
          <ClearableInputField
            label="Card border"
            value={resolved.style?.borderColor}
            onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
            onClear={() => clearStyle(value, onChange, "borderColor")}
            placeholder="var(--color-border)"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Text color</p>
          <Input
            value={resolved.style?.textColor ?? ""}
            onChange={(event) => updateStyle(value, onChange, { textColor: event.target.value })}
            placeholder="var(--color-text)"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Runtime payload snapshot"
        description="Read-only resolved payload from runtime preview/public rendering."
      >
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed">
          {JSON.stringify(resolved.resolved ?? { items: [] }, null, 2)}
        </pre>
      </EditorSection>
    </div>
  );
}
