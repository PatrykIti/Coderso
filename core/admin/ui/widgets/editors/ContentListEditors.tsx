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
import { listAdminUsers, type AdminUser } from "@/services/adminUsersClient";
import { listContentTypesCached, type ContentTypeSummary } from "@/services/contentTypesClient";
import { getTaxonomyOverview, type ContentTerm } from "@/services/taxonomyClient";
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
  type ContentListImageAspect,
  type ContentListPaginationMode,
  type ContentListTagMode,
  type ContentListGap,
  type ContentListSort,
  type ContentListStatusScope,
  type ContentListVariantId,
} from "../../../../widgets/core/contentList";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";
import { SharedColorControl } from "./SharedColorControl";
import { WidgetEditorSection } from "./WidgetEditorControls";

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
  { id: "legacy", label: "By content type" },
  { id: "listing", label: "By listing query" },
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

const paginationModeOptions: Array<{ id: ContentListPaginationMode; label: string }> = [
  { id: "none", label: "No navigation" },
  { id: "paged", label: "Previous / next" },
  { id: "load-more", label: "Load more" },
  { id: "view-all", label: "View all link" },
];

const cardStyleOptions: Array<{ id: ContentListCardStyle; label: string }> = [
  { id: "outlined", label: "Outlined" },
  { id: "elevated", label: "Elevated" },
  { id: "minimal", label: "Minimal" },
];

const imageAspectOptions: Array<{ id: ContentListImageAspect; label: string }> = [
  { id: "standard", label: "Standard" },
  { id: "wide", label: "Wide 16:9" },
  { id: "square", label: "Square" },
  { id: "compact", label: "Compact height" },
];

const tagModeOptions: Array<{ id: ContentListTagMode; label: string }> = [
  { id: "meta-line", label: "Meta line" },
  { id: "badges", label: "Badges" },
  { id: "hidden", label: "Hidden" },
];

const NO_CONTENT_TYPE_VALUE = "__no_content_type__";
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
          <div className="mt-3 flex gap-2" aria-hidden="true">
            {option.id === "cards" ? (
              <>
                <span className="h-10 flex-1 rounded-md border border-border/70 bg-muted/30" />
                <span className="h-10 flex-1 rounded-md border border-border/70 bg-muted/10" />
              </>
            ) : option.id === "list" ? (
              <span className="h-10 w-full rounded-md border border-border/70 bg-muted/15" />
            ) : (
              <>
                <span className="h-6 flex-1 rounded-md border border-border/70 bg-muted/20" />
                <span className="h-6 flex-1 rounded-md border border-border/70 bg-muted/10" />
                <span className="h-6 flex-1 rounded-md border border-border/70 bg-muted/5" />
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function CardStyleCards({
  value,
  onChange,
}: {
  value: ContentListCardStyle;
  onChange?: (next: ContentListCardStyle) => void;
}) {
  return (
    <div className="space-y-2">
      {cardStyleOptions.map((option) => (
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
          <div
            className="mt-3 rounded-md border p-3 text-xs text-muted-foreground shadow-sm"
            aria-hidden="true"
          >
            {option.id === "minimal" ? (
              <div className="border border-dashed border-border/60 bg-transparent p-3">
                Minimal card
              </div>
            ) : option.id === "elevated" ? (
              <div className="rounded-md border border-border/70 bg-background p-3 shadow-md">
                Elevated card
              </div>
            ) : (
              <div className="rounded-md border border-border/70 bg-muted/15 p-3">
                Outlined card
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

type ContentTypeOption = {
  id: string;
  label: string;
  searchText: string;
};

type AuthorOption = {
  id: string;
  label: string;
  searchText: string;
};

const technicalContentTypeSuffixPattern = /\s+[0-9a-f]{8,}$/i;
const TAXONOMY_DATALIST_ID = "content-list-taxonomy-suggestions";
const NO_AUTHOR_VALUE = "__no_author__";

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const resolveFriendlyContentTypeBaseLabel = (entry: ContentTypeSummary) => {
  const strippedName = collapseWhitespace(
    entry.name.replace(technicalContentTypeSuffixPattern, "")
  );
  if (strippedName.length > 0) return strippedName;
  return collapseWhitespace(entry.slug) || entry.id;
};

function buildContentTypeOptions(types: ContentTypeSummary[]) {
  const counts = new Map<string, number>();
  types.forEach((entry) => {
    const baseLabel = resolveFriendlyContentTypeBaseLabel(entry).toLowerCase();
    counts.set(baseLabel, (counts.get(baseLabel) ?? 0) + 1);
  });

  return types.map((entry) => {
    const baseLabel = resolveFriendlyContentTypeBaseLabel(entry);
    const duplicateCount = counts.get(baseLabel.toLowerCase()) ?? 0;
    const label = duplicateCount > 1 ? `${baseLabel} (${entry.slug})` : baseLabel;
    return {
      id: entry.id,
      label,
      searchText: `${label} ${entry.name} ${entry.slug} ${entry.id}`.toLowerCase(),
    } satisfies ContentTypeOption;
  });
}

function buildAuthorOptions(users: AdminUser[]) {
  return [...users]
    .sort((left, right) => {
      const leftLabel = (left.name?.trim() || left.email).toLowerCase();
      const rightLabel = (right.name?.trim() || right.email).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    })
    .map((user) => ({
      id: user.id,
      label: user.name?.trim() || user.email,
      searchText: `${user.name ?? ""} ${user.email} ${user.id}`.toLowerCase(),
    })) satisfies AuthorOption[];
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
  const [search, setSearch] = useState("");

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

  const options = buildContentTypeOptions(types);
  const searchText = search.trim().toLowerCase();
  const filteredOptions =
    searchText.length > 0
      ? options.filter((entry) => entry.searchText.includes(searchText))
      : options;
  const selectValue = value.trim().length > 0 ? value : NO_CONTENT_TYPE_VALUE;
  const selectedLabel =
    selectValue === NO_CONTENT_TYPE_VALUE
      ? "No content type selected"
      : (options.find((entry) => entry.id === selectValue)?.label ?? "Selected content type");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Content type</p>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search content types"
      />
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === NO_CONTENT_TYPE_VALUE ? "" : next)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select content type">{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_CONTENT_TYPE_VALUE}>No content type selected</SelectItem>
          {filteredOptions.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading ? <p className="text-xs text-muted-foreground">Loading content types...</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function TaxonomySuggestionsInput({
  contentTypeId,
  value,
  onChange,
}: {
  contentTypeId: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const trimmedContentTypeId = contentTypeId.trim();
  const [suggestions, setSuggestions] = useState<ContentTerm[]>([]);
  const [loading, setLoading] = useState(trimmedContentTypeId.length > 0);
  const [error, setError] = useState<string | null>(null);
  const resolvedSuggestions = trimmedContentTypeId.length === 0 ? [] : suggestions;
  const resolvedLoading = trimmedContentTypeId.length === 0 ? false : loading;
  const resolvedError = trimmedContentTypeId.length === 0 ? null : error;

  useEffect(() => {
    if (trimmedContentTypeId.length === 0) {
      return;
    }

    let active = true;
    getTaxonomyOverview(trimmedContentTypeId)
      .then((overview) => {
        if (!active) return;
        const merged = [...overview.terms.categories, ...overview.terms.tags];
        const unique = new Map<string, ContentTerm>();
        merged.forEach((term) => {
          const key = term.name.trim().toLowerCase();
          if (!key) return;
          if (!unique.has(key)) unique.set(key, term);
        });
        setSuggestions(
          [...unique.values()].sort((left, right) => left.name.localeCompare(right.name))
        );
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load taxonomy suggestions.");
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trimmedContentTypeId]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Taxonomy/tag filter</p>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. featured or case-study"
        list={resolvedSuggestions.length > 0 ? TAXONOMY_DATALIST_ID : undefined}
      />
      {resolvedSuggestions.length > 0 ? (
        <datalist id={TAXONOMY_DATALIST_ID}>
          {resolvedSuggestions.map((term) => (
            <option key={term.id} value={term.name} />
          ))}
        </datalist>
      ) : null}
      {resolvedLoading ? (
        <p className="text-xs text-muted-foreground">Loading taxonomy suggestions...</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!resolvedLoading &&
      !resolvedError &&
      resolvedSuggestions.length === 0 &&
      trimmedContentTypeId.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          No taxonomy suggestions available for this content type.
        </p>
      ) : null}
    </div>
  );
}

function AuthorSelect({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    listAdminUsers()
      .then((items) => {
        if (!active) return;
        setUsers(items);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load authors.");
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

  const options = buildAuthorOptions(users);
  const searchText = search.trim().toLowerCase();
  const filteredOptions =
    searchText.length > 0
      ? options.filter((entry) => entry.searchText.includes(searchText))
      : options;
  const selectValue = value.trim().length > 0 ? value : NO_AUTHOR_VALUE;
  const selectedLabel =
    selectValue === NO_AUTHOR_VALUE
      ? "No author filter"
      : (options.find((entry) => entry.id === selectValue)?.label ?? "Selected author");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Author filter</p>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search authors"
      />
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === NO_AUTHOR_VALUE ? "" : next)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select author">{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_AUTHOR_VALUE}>No author filter</SelectItem>
          {filteredOptions.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading ? <p className="text-xs text-muted-foreground">Loading authors...</p> : null}
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
type PaginationData = NonNullable<ContentListData["pagination"]>;
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
        ? { contentTypeId: "", statusScope: "published" as const }
        : { listingQueryId: "", listingTemplateId: "" }),
    },
    filters:
      mode === "listing"
        ? {
            ...current.filters,
            authorId: "",
            searchQuery: "",
            featuredOnly: false,
          }
        : current.filters,
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

function updatePagination(
  value: ContentListData,
  onChange: (next: ContentListData) => void,
  patch: Partial<PaginationData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    pagination: {
      ...current.pagination,
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
  const supportsColumns = resolvedVariant === "cards";
  const showImage = resolved.fields?.showImage ?? true;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout"
        description="Choose list orientation and spacing style."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        <div className="grid gap-3 sm:grid-cols-2">
          {supportsColumns ? (
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
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Columns</p>
              <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                Columns only affect the cards variant.
              </div>
            </div>
          )}
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
          <CardStyleCards
            value={resolved.style?.cardStyle ?? "outlined"}
            onChange={(next) => updateStyle(value, onChange, { cardStyle: next })}
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Source and filters"
        description="Configure data source and basic filtering behavior."
      >
        <div className="rounded-md border border-border/70 px-3 py-2 text-xs text-muted-foreground">
          Source mode:{" "}
          <span className="font-medium text-foreground">
            {sourceMode === "listing" ? "By listing query" : "By content type"}
          </span>
          . Change source mode in Wizard or Advanced.
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
            <TaxonomySuggestionsInput
              key={resolved.source?.contentTypeId ?? ""}
              contentTypeId={resolved.source?.contentTypeId ?? ""}
              value={resolved.filters?.taxonomy ?? ""}
              onChange={(next) => updateFilters(value, onChange, { taxonomy: next })}
            />
          </>
        )}
      </EditorSection>

      <EditorSection
        title="Section context"
        description="Optional heading copy plus guidance for the saved-data canvas preview."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Section title</p>
          <Input
            value={resolved.title ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Optional section title"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Section description</p>
          <Textarea
            value={resolved.description ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={3}
            placeholder="Optional section description"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Builder canvas shows saved resolved data. Save or open Preview to refresh live results.
        </p>
      </EditorSection>

      <EditorSection
        title="Pagination and actions"
        description="Control page navigation and the follow-up action shown below the list."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Navigation mode</p>
          <Select
            value={resolved.pagination?.mode ?? "none"}
            onValueChange={(next) =>
              updatePagination(value, onChange, { mode: next as ContentListPaginationMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Navigation mode" />
            </SelectTrigger>
            <SelectContent>
              {paginationModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(resolved.pagination?.mode ?? "none") !== "none" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Page size</p>
            <Input
              type="number"
              min={1}
              max={24}
              value={String(resolved.pagination?.pageSize ?? resolved.source?.limit ?? 6)}
              onChange={(event) =>
                updatePagination(value, onChange, {
                  pageSize: normalizeContentListLimit(Number(event.target.value)),
                })
              }
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No navigation keeps the current item-limit behavior from the source setup.
          </p>
        )}
        {(resolved.pagination?.mode ?? "none") === "load-more" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Load more label</p>
            <Input
              value={resolved.pagination?.loadMoreLabel ?? "Load more"}
              onChange={(event) =>
                updatePagination(value, onChange, { loadMoreLabel: event.target.value })
              }
              placeholder="Load more"
            />
          </div>
        ) : null}
        {(resolved.pagination?.mode ?? "none") === "view-all" ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">View all link</p>
              <Input
                value={resolved.pagination?.viewAllHref ?? ""}
                onChange={(event) =>
                  updatePagination(value, onChange, { viewAllHref: event.target.value })
                }
                placeholder="/articles"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">View all label</p>
              <Input
                value={resolved.pagination?.viewAllLabel ?? "View all"}
                onChange={(event) =>
                  updatePagination(value, onChange, { viewAllLabel: event.target.value })
                }
                placeholder="View all"
              />
            </div>
          </>
        ) : null}
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
        {showImage ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Image ratio</p>
            <Select
              value={resolved.style?.imageAspect ?? "standard"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { imageAspect: next as ContentListImageAspect })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Image ratio" />
              </SelectTrigger>
              <SelectContent>
                {imageAspectOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enable &quot;Show image&quot; to configure image ratio.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Tag display</p>
            <Select
              value={resolved.style?.tagMode ?? "meta-line"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { tagMode: next as ContentListTagMode })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tag display" />
              </SelectTrigger>
              <SelectContent>
                {tagModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(resolved.style?.tagMode ?? "meta-line") !== "hidden" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Tag limit</p>
              <Input
                type="number"
                min={1}
                max={4}
                value={String(resolved.style?.tagLimit ?? 2)}
                onChange={(event) =>
                  updateStyle(value, onChange, {
                    tagLimit: Math.min(4, Math.max(1, Math.floor(Number(event.target.value) || 1))),
                  })
                }
              />
            </div>
          ) : null}
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
        {sourceMode === "listing" ? (
          <>
            <ListingSourceSelect
              queryId={resolved.source?.listingQueryId ?? ""}
              templateId={resolved.source?.listingTemplateId ?? ""}
              onQueryChange={(next) => updateSource(value, onChange, { listingQueryId: next })}
              onTemplateChange={(next) =>
                updateSource(value, onChange, { listingTemplateId: next })
              }
            />
            <p className="text-xs text-muted-foreground">
              Listing mode uses filters and sorting from the selected Listings query.
            </p>
          </>
        ) : (
          <>
            <AuthorSelect
              value={resolved.filters?.authorId ?? ""}
              onChange={(next) => updateFilters(value, onChange, { authorId: next })}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Search query</p>
              <Input
                value={resolved.filters?.searchQuery ?? ""}
                onChange={(event) =>
                  updateFilters(value, onChange, { searchQuery: event.target.value })
                }
                placeholder="Title, excerpt, tags"
              />
            </div>
            <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
              <span className="text-sm">Featured only</span>
              <Switch
                checked={resolved.filters?.featuredOnly ?? false}
                onCheckedChange={(checked) =>
                  updateFilters(value, onChange, { featuredOnly: checked })
                }
              />
            </label>
          </>
        )}
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
        <SharedColorControl
          label="Text color"
          value={resolved.style?.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          onClear={() => clearStyle(value, onChange, "textColor")}
          placeholder="var(--color-text)"
          pickerFallback="#0f172a"
        />
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
