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
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import { LinkDestinationField } from "./LinkDestinationField";
import {
  ReadonlyWidgetSummaryRow,
  type WidgetControlFieldProps,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

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
  { id: "none", label: "No spacing" },
  { id: "sm", label: "Compact spacing" },
  { id: "md", label: "Balanced spacing" },
  { id: "lg", label: "Spacious spacing" },
];

const paginationModeOptions: Array<{ id: ContentListPaginationMode; label: string }> = [
  { id: "none", label: "No navigation" },
  { id: "paged", label: "Previous / next" },
  { id: "load-more", label: "Load more" },
  { id: "view-all", label: "View all page" },
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
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: EditorMode;
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
  fieldProps,
}: {
  value: ContentListVariantId;
  onChange?: (next: string) => void;
  fieldProps?: WidgetControlFieldProps;
}) {
  return (
    <div
      id={fieldProps?.id}
      aria-labelledby={fieldProps?.["aria-labelledby"]}
      className="space-y-2"
      role="group"
    >
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
  fieldProps,
}: {
  value: ContentListCardStyle;
  onChange?: (next: ContentListCardStyle) => void;
  fieldProps?: WidgetControlFieldProps;
}) {
  return (
    <div
      id={fieldProps?.id}
      aria-labelledby={fieldProps?.["aria-labelledby"]}
      className="space-y-2"
      role="group"
    >
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

function findOptionLabel(
  options: ReadonlyArray<{ id: string; label: string }>,
  value: string | undefined,
  fallback: string
) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return fallback;
  return options.find((option) => option.id === trimmedValue)?.label ?? fallback;
}

function findRecordName<TRecord extends { id: string; name: string | null | undefined }>(
  records: TRecord[],
  value: string | undefined,
  emptyLabel: string,
  missingLabel: string
) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return emptyLabel;
  return records.find((record) => record.id === trimmedValue)?.name?.trim() || missingLabel;
}

function summarizeColorSelection(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return "Theme default";
  if (trimmedValue.startsWith("var(")) return "Theme token selected";
  return "Selected color";
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatRuntimeTimestamp(value: string | undefined) {
  if (!value?.trim()) return "Not refreshed yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Refresh time unavailable";
  return date.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function useContentTypeOptions() {
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

  return {
    options: buildContentTypeOptions(types),
    loading,
    error,
  };
}

function useAuthorOptions() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    options: buildAuthorOptions(users),
    loading,
    error,
  };
}

function ContentTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { options, loading, error } = useContentTypeOptions();
  const [search, setSearch] = useState("");

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
      <WidgetControlRow
        id="content-list.wizard.source.content-type-search"
        label="Search content types"
        ownership="preview"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search content types"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="content-list.wizard.source.content-type"
        label="Content type"
        path="source.contentTypeId"
      >
        {(fieldProps) => (
          <Select
            value={selectValue}
            onValueChange={(next) => onChange(next === NO_CONTENT_TYPE_VALUE ? "" : next)}
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
        )}
      </WidgetControlRow>
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
      <WidgetControlRow
        id="content-list.visual.filters.taxonomy"
        label="Taxonomy or tag filter"
        path="filters.taxonomy"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search or choose a tag"
            list={resolvedSuggestions.length > 0 ? TAXONOMY_DATALIST_ID : undefined}
          />
        )}
      </WidgetControlRow>
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
  const { options, loading, error } = useAuthorOptions();
  const [search, setSearch] = useState("");

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
      <WidgetControlRow
        id="content-list.visual.filters.author-search"
        label="Search authors"
        ownership="preview"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search authors"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="content-list.visual.filters.author"
        label="Author filter"
        path="filters.authorId"
      >
        {(fieldProps) => (
          <Select
            value={selectValue}
            onValueChange={(next) => onChange(next === NO_AUTHOR_VALUE ? "" : next)}
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
        )}
      </WidgetControlRow>
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
      <WidgetControlRow
        id="content-list.wizard.source.listing-query"
        label="Listing query"
        path="source.listingQueryId"
      >
        {() => (
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
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="content-list.wizard.source.listing-template"
        label="Listing template"
        path="source.listingTemplateId"
      >
        {() => (
          <Select
            value={templateSelectValue}
            onValueChange={(next) =>
              onTemplateChange(next === NO_LISTING_TEMPLATE_VALUE ? "" : next)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select listing template">
                {selectedTemplateName}
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
        )}
      </WidgetControlRow>
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

export function ContentListWizardEditor({ value, onChange }: WidgetEditorProps<ContentListData>) {
  const resolved = normalizeValue(value);
  const sourceMode = resolved.source?.mode ?? "legacy";

  return (
    <div className="space-y-4">
      <EditorSection
        id="content-list.wizard.source-binding"
        mode="wizard"
        role="source"
        title="Source setup"
        description="Select data source and quick listing defaults."
      >
        <WidgetControlRow
          id="content-list.wizard.source.mode"
          label="Source mode"
          path="source.mode"
        >
          {(fieldProps) => (
            <Select
              value={sourceMode}
              onValueChange={(next) =>
                updateSourceMode(value, onChange, next as ContentListSourceMode)
              }
            >
              <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
          )}
        </WidgetControlRow>
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
      </EditorSection>

      <EditorSection
        id="content-list.wizard.source-rules"
        mode="wizard"
        role="setup"
        title="Source rules"
        description="First-time source limits and ordering rules."
      >
        {sourceMode === "legacy" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <WidgetControlRow
              id="content-list.wizard.source.status-scope"
              label="Status scope"
              path="source.statusScope"
            >
              {(fieldProps) => (
                <Select
                  value={resolved.source?.statusScope ?? "published"}
                  onValueChange={(next) =>
                    updateSource(value, onChange, { statusScope: next as ContentListStatusScope })
                  }
                >
                  <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
              )}
            </WidgetControlRow>
            <WidgetControlRow id="content-list.wizard.source.sort" label="Sort" path="source.sort">
              {(fieldProps) => (
                <Select
                  value={resolved.source?.sort ?? "published-desc"}
                  onValueChange={(next) =>
                    updateSource(value, onChange, { sort: next as ContentListSort })
                  }
                >
                  <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
              )}
            </WidgetControlRow>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
            Listing mode uses filters and sorting from the selected Listings query.
          </p>
        )}
        <WidgetControlRow
          id="content-list.wizard.source.limit"
          label="Item limit"
          path="source.limit"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
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
          )}
        </WidgetControlRow>
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
  const { options: contentTypeOptions } = useContentTypeOptions();
  const { queries, templates } = useListingOptions();
  const contentTypeLabel = findOptionLabel(
    contentTypeOptions,
    resolved.source?.contentTypeId,
    resolved.source?.contentTypeId ? "Configured content type unavailable" : "Not configured"
  );
  const listingQueryLabel = findRecordName(
    queries,
    resolved.source?.listingQueryId,
    "Not configured",
    "Configured listing query unavailable"
  );
  const listingTemplateLabel = findRecordName(
    templates,
    resolved.source?.listingTemplateId,
    "Inherits default",
    "Configured listing template unavailable"
  );
  const statusScopeLabel = findOptionLabel(
    statusScopeOptions,
    resolved.source?.statusScope ?? "published",
    "Published only"
  );
  const sortLabel = findOptionLabel(
    sortOptions,
    resolved.source?.sort ?? "published-desc",
    "Newest published first"
  );

  return (
    <div className="space-y-4">
      <EditorSection
        id="content-list.visual.variant-layout"
        mode="visual"
        role="layout"
        title="Variant and layout"
        description="Choose list orientation and spacing style."
      >
        <WidgetControlRow id="content-list.visual.variant" label="List variant" path="variant">
          {(fieldProps) => (
            <VariantCards
              value={resolvedVariant}
              onChange={onVariantChange}
              fieldProps={fieldProps}
            />
          )}
        </WidgetControlRow>
        <div className="grid gap-3 sm:grid-cols-2">
          {supportsColumns ? (
            <WidgetControlRow
              id="content-list.visual.layout.columns"
              label="Columns"
              path="style.columns"
            >
              {(fieldProps) => (
                <Select
                  value={resolved.style?.columns ?? "3"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, { columns: next as "1" | "2" | "3" })
                  }
                >
                  <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
              )}
            </WidgetControlRow>
          ) : (
            <WidgetControlRow
              id="content-list.visual.layout.columns"
              label="Columns"
              path="style.columns"
              ownership="readonly"
              readOnly
            >
              {() => (
                <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                  Columns only affect the cards variant.
                </div>
              )}
            </WidgetControlRow>
          )}
          <WidgetControlRow id="content-list.visual.layout.gap" label="Gap" path="style.gap">
            {(fieldProps) => (
              <Select
                value={resolved.style?.gap ?? "md"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { gap: next as ContentListGap })
                }
              >
                <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
            )}
          </WidgetControlRow>
        </div>
        <WidgetControlRow
          id="content-list.visual.layout.card-style"
          label="Card style"
          path="style.cardStyle"
        >
          {(fieldProps) => (
            <CardStyleCards
              value={resolved.style?.cardStyle ?? "outlined"}
              onChange={(next) => updateStyle(value, onChange, { cardStyle: next })}
              fieldProps={fieldProps}
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="content-list.visual.filters"
        mode="visual"
        role="content"
        title="Daily filters"
        description="Review the Wizard-owned source and tune daily editorial filters."
      >
        <ReadonlyWidgetSummaryRow
          id="content-list-visual-source-mode"
          label="Source mode"
          path="source.mode"
          value={sourceMode === "listing" ? "By listing query" : "By content type"}
        />
        {sourceMode === "listing" ? (
          <>
            <ReadonlyWidgetSummaryRow
              id="content-list-visual-listing-query"
              label="Listing query"
              path="source.listingQueryId"
              value={listingQueryLabel}
            />
            <ReadonlyWidgetSummaryRow
              id="content-list-visual-listing-template"
              label="Listing template"
              path="source.listingTemplateId"
              value={listingTemplateLabel}
            />
            <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
              Listing query filtering is owned by the selected Listings query. Change the binding in
              Wizard.
            </p>
          </>
        ) : (
          <>
            <ReadonlyWidgetSummaryRow
              id="content-list-visual-content-type"
              label="Content type"
              path="source.contentTypeId"
              value={contentTypeLabel}
            />
            <ReadonlyWidgetSummaryRow
              id="content-list-visual-status"
              label="Status scope"
              path="source.statusScope"
              value={statusScopeLabel}
            />
            <ReadonlyWidgetSummaryRow
              id="content-list-visual-sort"
              label="Sort"
              path="source.sort"
              value={sortLabel}
            />
            <TaxonomySuggestionsInput
              key={resolved.source?.contentTypeId ?? ""}
              contentTypeId={resolved.source?.contentTypeId ?? ""}
              value={resolved.filters?.taxonomy ?? ""}
              onChange={(next) => updateFilters(value, onChange, { taxonomy: next })}
            />
            <AuthorSelect
              value={resolved.filters?.authorId ?? ""}
              onChange={(next) => updateFilters(value, onChange, { authorId: next })}
            />
            <WidgetControlRow
              id="content-list.visual.filters.search-query"
              label="Search query"
              path="filters.searchQuery"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={resolved.filters?.searchQuery ?? ""}
                  onChange={(event) =>
                    updateFilters(value, onChange, { searchQuery: event.target.value })
                  }
                  placeholder="Title, excerpt, tags"
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id="content-list.visual.filters.featured-only"
              label="Featured only"
              path="filters.featuredOnly"
              hideLabel
            >
              {(fieldProps) => (
                <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                  <span className="text-sm">Featured only</span>
                  <Switch
                    id={fieldProps.id}
                    aria-labelledby={fieldProps["aria-labelledby"]}
                    checked={resolved.filters?.featuredOnly ?? false}
                    onCheckedChange={(checked) =>
                      updateFilters(value, onChange, { featuredOnly: checked })
                    }
                  />
                </label>
              )}
            </WidgetControlRow>
          </>
        )}
      </EditorSection>

      <EditorSection
        id="content-list.visual.section-context"
        mode="visual"
        role="content"
        title="Section context"
        description="Optional heading copy plus guidance for the saved-data canvas preview."
      >
        <WidgetControlRow id="content-list.visual.section.title" label="Section title" path="title">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={resolved.title ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Optional section title"
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="content-list.visual.section.description"
          label="Section description"
          path="description"
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
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
          )}
        </WidgetControlRow>
        <p className="text-xs text-muted-foreground">
          Builder canvas shows saved resolved data. Save or open Preview to refresh live results.
        </p>
      </EditorSection>

      <EditorSection
        id="content-list.visual.pagination-actions"
        mode="visual"
        role="content"
        title="Pagination and actions"
        description="Control page navigation and the follow-up action shown below the list."
      >
        <WidgetControlRow
          id="content-list.visual.pagination.mode"
          label="Navigation mode"
          path="pagination.mode"
        >
          {(fieldProps) => (
            <Select
              value={resolved.pagination?.mode ?? "none"}
              onValueChange={(next) =>
                updatePagination(value, onChange, { mode: next as ContentListPaginationMode })
              }
            >
              <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
          )}
        </WidgetControlRow>
        {(resolved.pagination?.mode ?? "none") !== "none" ? (
          <WidgetControlRow
            id="content-list.visual.pagination.page-size"
            label="Page size"
            path="pagination.pageSize"
            help="Overrides the Wizard item limit whenever navigation is enabled."
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
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
            )}
          </WidgetControlRow>
        ) : (
          <p className="text-xs text-muted-foreground">
            No navigation keeps the current item-limit behavior from the source setup.
          </p>
        )}
        {(resolved.pagination?.mode ?? "none") === "load-more" ? (
          <WidgetControlRow
            id="content-list.visual.pagination.load-more-label"
            label="Load more label"
            path="pagination.loadMoreLabel"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={resolved.pagination?.loadMoreLabel ?? "Load more"}
                onChange={(event) =>
                  updatePagination(value, onChange, { loadMoreLabel: event.target.value })
                }
                placeholder="Load more"
              />
            )}
          </WidgetControlRow>
        ) : null}
        {(resolved.pagination?.mode ?? "none") === "view-all" ? (
          <>
            <WidgetControlRow
              id="content-list.visual.pagination.view-all-destination"
              label="View all destination"
              path="pagination.viewAllHref"
              hideLabel
            >
              {(fieldProps) => (
                <LinkDestinationField
                  fieldId={fieldProps.id}
                  label="View all destination"
                  value={resolved.pagination?.viewAllHref ?? ""}
                  onChange={(next) => updatePagination(value, onChange, { viewAllHref: next })}
                  emptyLabel="Use resolved list page"
                  helpText="Pick a published site page. Leave empty to use the resolved list page when available."
                  feedback={
                    resolved.resolved?.listPath
                      ? "A resolved list page is available from the saved source."
                      : null
                  }
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id="content-list.visual.pagination.view-all-label"
              label="View all label"
              path="pagination.viewAllLabel"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={resolved.pagination?.viewAllLabel ?? "View all"}
                  onChange={(event) =>
                    updatePagination(value, onChange, { viewAllLabel: event.target.value })
                  }
                  placeholder="View all"
                />
              )}
            </WidgetControlRow>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        id="content-list.visual.presentation-fields"
        mode="visual"
        role="visual"
        title="Presentation fields"
        description="Control visible item elements in runtime output."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <WidgetControlRow
            id="content-list.visual.fields.show-image"
            label="Show image"
            path="fields.showImage"
            hideLabel
          >
            {(fieldProps) => (
              <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <span className="text-sm">Show image</span>
                <Switch
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  checked={resolved.fields?.showImage ?? true}
                  onCheckedChange={(checked) =>
                    updateFields(value, onChange, { showImage: checked })
                  }
                />
              </label>
            )}
          </WidgetControlRow>
          <WidgetControlRow
            id="content-list.visual.fields.show-excerpt"
            label="Show excerpt"
            path="fields.showExcerpt"
            hideLabel
          >
            {(fieldProps) => (
              <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <span className="text-sm">Show excerpt</span>
                <Switch
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  checked={resolved.fields?.showExcerpt ?? true}
                  onCheckedChange={(checked) =>
                    updateFields(value, onChange, { showExcerpt: checked })
                  }
                />
              </label>
            )}
          </WidgetControlRow>
          <WidgetControlRow
            id="content-list.visual.fields.show-meta"
            label="Show meta"
            path="fields.showMeta"
            hideLabel
          >
            {(fieldProps) => (
              <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <span className="text-sm">Show meta</span>
                <Switch
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  checked={resolved.fields?.showMeta ?? true}
                  onCheckedChange={(checked) =>
                    updateFields(value, onChange, { showMeta: checked })
                  }
                />
              </label>
            )}
          </WidgetControlRow>
          <WidgetControlRow
            id="content-list.visual.fields.show-cta"
            label="Show CTA link"
            path="fields.showCta"
            hideLabel
          >
            {(fieldProps) => (
              <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <span className="text-sm">Show CTA link</span>
                <Switch
                  id={fieldProps.id}
                  aria-labelledby={fieldProps["aria-labelledby"]}
                  checked={resolved.fields?.showCta ?? true}
                  onCheckedChange={(checked) => updateFields(value, onChange, { showCta: checked })}
                />
              </label>
            )}
          </WidgetControlRow>
        </div>
        {showImage ? (
          <WidgetControlRow
            id="content-list.visual.style.image-aspect"
            label="Image ratio"
            path="style.imageAspect"
          >
            {(fieldProps) => (
              <Select
                value={resolved.style?.imageAspect ?? "standard"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { imageAspect: next as ContentListImageAspect })
                }
              >
                <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
            )}
          </WidgetControlRow>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enable &quot;Show image&quot; to configure image ratio.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <WidgetControlRow
            id="content-list.visual.style.tag-mode"
            label="Tag display"
            path="style.tagMode"
          >
            {(fieldProps) => (
              <Select
                value={resolved.style?.tagMode ?? "meta-line"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, { tagMode: next as ContentListTagMode })
                }
              >
                <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
            )}
          </WidgetControlRow>
          {(resolved.style?.tagMode ?? "meta-line") !== "hidden" ? (
            <WidgetControlRow
              id="content-list.visual.style.tag-limit"
              label="Tag limit"
              path="style.tagLimit"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min={1}
                  max={4}
                  value={String(resolved.style?.tagLimit ?? 2)}
                  onChange={(event) =>
                    updateStyle(value, onChange, {
                      tagLimit: Math.min(
                        4,
                        Math.max(1, Math.floor(Number(event.target.value) || 1))
                      ),
                    })
                  }
                />
              )}
            </WidgetControlRow>
          ) : null}
        </div>
        <WidgetControlRow
          id="content-list.visual.style.cta-label"
          label="CTA label"
          path="style.ctaLabel"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={resolved.style?.ctaLabel ?? "Read more"}
              onChange={(event) => updateStyle(value, onChange, { ctaLabel: event.target.value })}
              placeholder="Read more"
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="content-list.visual.surface-colors"
        mode="visual"
        role="visual"
        title="Surface colors"
        description="Daily card and text colors for runtime output."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <WidgetControlRow
            id="content-list.visual.colors.background"
            label="Card background"
            path="style.backgroundColor"
            hideLabel
          >
            {() => (
              <SharedColorControl
                label="Card background"
                value={resolved.style?.backgroundColor}
                onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
                onSwatchChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
                onClear={() => clearStyle(value, onChange, "backgroundColor")}
                placeholder="var(--color-bg)"
                pickerFallback="#ffffff"
                showValueInput={false}
              />
            )}
          </WidgetControlRow>
          <WidgetControlRow
            id="content-list.visual.colors.border"
            label="Card border"
            path="style.borderColor"
            hideLabel
          >
            {() => (
              <SharedColorControl
                label="Card border"
                value={resolved.style?.borderColor}
                onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
                onSwatchChange={(next) => updateStyle(value, onChange, { borderColor: next })}
                onClear={() => clearStyle(value, onChange, "borderColor")}
                placeholder="var(--color-border)"
                pickerFallback="#d4d4d8"
                showValueInput={false}
              />
            )}
          </WidgetControlRow>
        </div>
        <WidgetControlRow
          id="content-list.visual.colors.text"
          label="Text color"
          path="style.textColor"
          hideLabel
        >
          {() => (
            <SharedColorControl
              label="Text color"
              value={resolved.style?.textColor}
              onChange={(next) => updateStyle(value, onChange, { textColor: next })}
              onSwatchChange={(next) => updateStyle(value, onChange, { textColor: next })}
              onClear={() => clearStyle(value, onChange, "textColor")}
              placeholder="var(--color-text)"
              pickerFallback="#0f172a"
              showValueInput={false}
            />
          )}
        </WidgetControlRow>
      </EditorSection>

      <EditorSection
        id="content-list.visual.empty-state"
        mode="visual"
        role="content"
        title="Empty state"
        description="Text shown when query returns no entries."
      >
        <WidgetControlRow
          id="content-list.visual.empty-state.title"
          label="Title"
          path="emptyState.title"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={resolved.emptyState?.title ?? ""}
              onChange={(event) => updateEmptyState(value, onChange, { title: event.target.value })}
              placeholder="No items found"
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="content-list.visual.empty-state.description"
          label="Description"
          path="emptyState.description"
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={resolved.emptyState?.description ?? ""}
              onChange={(event) =>
                updateEmptyState(value, onChange, { description: event.target.value })
              }
              rows={3}
              placeholder="Adjust filters or publish entries for this content type."
            />
          )}
        </WidgetControlRow>
      </EditorSection>
    </div>
  );
}

export function ContentListAdvancedEditor({ value }: WidgetEditorProps<ContentListData>) {
  const resolved = normalizeValue(value);
  const sourceMode = resolved.source?.mode ?? "legacy";
  const { options: contentTypeOptions } = useContentTypeOptions();
  const { options: authorOptions } = useAuthorOptions();
  const { queries, templates } = useListingOptions();
  const contentTypeLabel = findOptionLabel(
    contentTypeOptions,
    resolved.source?.contentTypeId,
    resolved.source?.contentTypeId ? "Configured content type unavailable" : "Not configured"
  );
  const listingQueryLabel = findRecordName(
    queries,
    resolved.source?.listingQueryId,
    "Not configured",
    "Configured listing query unavailable"
  );
  const listingTemplateLabel = findRecordName(
    templates,
    resolved.source?.listingTemplateId,
    "Inherits default",
    "Configured listing template unavailable"
  );
  const authorLabel = findOptionLabel(
    authorOptions,
    resolved.filters?.authorId,
    resolved.filters?.authorId ? "Configured author unavailable" : "No author filter"
  );
  const statusScopeLabel = findOptionLabel(
    statusScopeOptions,
    resolved.source?.statusScope ?? "published",
    "Published only"
  );
  const sortLabel = findOptionLabel(
    sortOptions,
    resolved.source?.sort ?? "published-desc",
    "Newest published first"
  );
  const columnsLabel = findOptionLabel(columnsOptions, resolved.style?.columns ?? "3", "3 columns");
  const gapLabel = findOptionLabel(gapOptions, resolved.style?.gap ?? "md", "Balanced spacing");
  const cardStyleLabel = findOptionLabel(
    cardStyleOptions,
    resolved.style?.cardStyle ?? "outlined",
    "Outlined"
  );
  const sourceBindingPath =
    sourceMode === "listing"
      ? "source.listingQueryId+source.listingTemplateId"
      : "source.contentTypeId";
  const sourceBindingValue =
    sourceMode === "listing"
      ? `Listing query: ${listingQueryLabel} · Template: ${listingTemplateLabel}`
      : `Content type: ${contentTypeLabel}`;
  const sourceRuleValue =
    sourceMode === "legacy"
      ? `Limit ${resolved.source?.limit ?? 6} · ${statusScopeLabel} · ${sortLabel}`
      : `Limit ${resolved.source?.limit ?? 6} · Listing query owns status and sort`;
  const filtersValue = `Taxonomy: ${
    resolved.filters?.taxonomy?.trim() || "No taxonomy filter"
  } · Search: ${
    resolved.filters?.searchQuery?.trim() ? "Search text configured" : "No search text"
  } · Featured: ${resolved.filters?.featuredOnly ? "Featured only" : "All entries"} · Author: ${
    resolved.filters?.authorId ? authorLabel : "No author filter"
  }`;
  const runtime = resolved.resolved?.runtime;
  const itemCount = resolved.resolved?.items?.length ?? 0;
  const total = resolved.resolved?.total ?? itemCount;
  const rejectedTokenCount = runtime?.rejectedTokens?.length ?? 0;
  const runtimePageValue =
    runtime?.page || runtime?.pageSize || runtime?.totalPages
      ? `Page ${runtime.page ?? "not set"} · Page size ${runtime.pageSize ?? "not set"} · Total pages ${
          runtime.totalPages ?? "not available"
        }`
      : "Pagination runtime not available";
  const runtimeNavigationValue = `Previous page ${
    runtime?.previousPageHref ? "available" : "not available"
  } · Next page ${runtime?.nextPageHref ? "available" : "not available"}`;
  const runtimeError = resolved.resolved?.error?.trim();

  return (
    <div className="space-y-4">
      <EditorSection
        id="content-list.advanced.source-summary"
        mode="advanced"
        role="diagnostics"
        title="Source summary"
        description="Read-only source and filter state owned by Wizard or Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-source-mode"
          label="Source mode"
          path="source.mode"
          value={sourceMode === "listing" ? "By listing query" : "By content type"}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-source-binding"
          label="Source binding"
          path={sourceBindingPath}
          value={sourceBindingValue}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-source-rules"
          label="Source rules"
          path="source.limit+source.statusScope+source.sort"
          value={sourceRuleValue}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-filters"
          label="Daily filters"
          path="filters.taxonomy+filters.searchQuery+filters.featuredOnly+filters.authorId"
          value={filtersValue}
        />
      </EditorSection>

      <EditorSection
        id="content-list.advanced.style-summary"
        mode="advanced"
        role="summary"
        title="Style summary"
        description="Read-only presentation state owned by Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-layout-style"
          label="Layout"
          path="style.columns+style.gap+style.cardStyle"
          value={`${columnsLabel} · ${gapLabel} · ${cardStyleLabel} cards`}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-color-style"
          label="Card and text colors"
          path="style.backgroundColor+style.borderColor+style.textColor"
          value={`Background: ${summarizeColorSelection(
            resolved.style?.backgroundColor
          )} · Border: ${summarizeColorSelection(resolved.style?.borderColor)} · Text: ${summarizeColorSelection(
            resolved.style?.textColor
          )}`}
        />
      </EditorSection>

      <EditorSection
        id="content-list.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime summary"
        description="Read-only sanitized runtime summary without item titles or draft/private content."
      >
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-result"
          label="Runtime result"
          path="resolved.items+resolved.total"
          value={`${pluralize(itemCount, "item")} rendered · ${pluralize(total, "item")} available`}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-source"
          label="Resolved source"
          path="resolved.sourceTypeId+resolved.listingQueryId"
          value={
            sourceMode === "listing"
              ? `Listing query: ${findRecordName(
                  queries,
                  resolved.resolved?.listingQueryId ?? resolved.source?.listingQueryId,
                  "Not configured",
                  "Configured listing query unavailable"
                )}`
              : `Content type: ${findOptionLabel(
                  contentTypeOptions,
                  resolved.resolved?.sourceTypeId ?? resolved.source?.contentTypeId,
                  "Not configured"
                )}`
          }
        />
        {resolved.resolved?.listPath ? (
          <ReadonlyWidgetSummaryRow
            id="content-list-advanced-runtime-list-path"
            label="Resolved list page"
            path="resolved.listPath"
            value="Available from saved source"
          />
        ) : null}
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-pagination"
          label="Runtime pagination"
          path="resolved.runtime.page+resolved.runtime.pageSize+resolved.runtime.totalPages"
          value={runtimePageValue}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-navigation"
          label="Runtime navigation"
          path="resolved.runtime.previousPageHref+resolved.runtime.nextPageHref"
          value={runtimeNavigationValue}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-health"
          label="Runtime health"
          path="resolved.runtime.rejectedTokens+resolved.error"
          value={`${pluralize(rejectedTokenCount, "filtered token")} suppressed · ${
            runtimeError ? "Runtime error present" : "No runtime errors"
          }`}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-refresh"
          label="Last refresh"
          path="resolved.resolvedAt"
          value={formatRuntimeTimestamp(resolved.resolved?.resolvedAt)}
        />
        <ReadonlyWidgetSummaryRow
          id="content-list-advanced-runtime-support-owner"
          label="Support owner"
          path="source.mode"
          value="Wizard owns source setup. Visual owns filters and presentation. Advanced is read-only."
        />
        {runtimeError ? (
          <ReadonlyWidgetSummaryRow
            id="content-list-advanced-runtime-error"
            label="Runtime error"
            path="resolved.error"
            value={runtimeError}
          />
        ) : null}
      </EditorSection>
    </div>
  );
}
