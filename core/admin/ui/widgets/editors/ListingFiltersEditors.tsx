import { useEffect, useMemo, useState, type ReactNode } from "react";

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
import { isApiClientError } from "@/services/apiClient";
import { listListingQueriesCached, type ListingQueryRecord } from "@/services/listingsClient";

import {
  listingFiltersDefaults,
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../../../../widgets/core/listingFilters";
import type { WidgetEditorProps } from "../../../../widgets/types";
import type {
  ListingFacetConfig,
  ListingFacetKind,
} from "../../../../services/search/filterContract";
import { ClearableInputField } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

type ListingFilterOperator = NonNullable<ListingFacetConfig["op"]>;

const NO_LISTING_QUERY_VALUE = "__no_listing_query__";

const kindOptions: Array<{ value: ListingFacetKind; label: string }> = [
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "taxonomy", label: "Taxonomy" },
  { value: "range", label: "Range" },
  { value: "date-range", label: "Date range" },
  { value: "sort", label: "Sort" },
];

const operatorOptions: Array<{ value: ListingFilterOperator; label: string }> = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "in", label: "Contains any" },
  { value: "nin", label: "Contains none" },
  { value: "contains", label: "Contains text" },
  { value: "startsWith", label: "Starts with" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Lower than" },
  { value: "lte", label: "Lower or equal" },
  { value: "between", label: "Between" },
  { value: "exists", label: "Exists" },
];

const resolveDefaultOperator = (kind: ListingFacetKind): ListingFilterOperator => {
  if (kind === "radio") return "eq";
  if (kind === "range" || kind === "date-range") return "between";
  if (kind === "sort") return "exists";
  return "in";
};

const parseFacetOptions = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue, rawLabel] = line.split("|").map((entry) => entry.trim());
      if (!rawValue) return null;
      return {
        value: rawValue,
        label: rawLabel || rawValue,
      };
    })
    .filter((option): option is NonNullable<ListingFacetConfig["options"]>[number] =>
      Boolean(option)
    );

const formatFacetOptions = (facet: ListingFacetConfig) =>
  (facet.options ?? [])
    .map((option) => {
      if (!option?.value) return "";
      return option.label && option.label !== option.value
        ? `${option.value}|${option.label}`
        : option.value;
    })
    .filter(Boolean)
    .join("\n");

const parseSortOptions = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue, rawLabel, rawField, rawDir] = line.split("|").map((entry) => entry.trim());
      if (!rawValue || !rawField) return null;
      if (rawDir !== "asc" && rawDir !== "desc") return null;
      return {
        value: rawValue,
        label: rawLabel || rawValue,
        field: rawField,
        dir: rawDir,
      } as NonNullable<ListingFacetConfig["sortOptions"]>[number];
    })
    .filter((option): option is NonNullable<ListingFacetConfig["sortOptions"]>[number] =>
      Boolean(option)
    );

const formatSortOptions = (facet: ListingFacetConfig) =>
  (facet.sortOptions ?? [])
    .map((option) => [option.value, option.label, option.field, option.dir].join("|"))
    .join("\n");

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

function updateValue(
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  updater: (current: ListingFiltersData) => ListingFiltersData
) {
  const current = normalizeListingFiltersData(value);
  const next = updater(current);
  onChange(normalizeListingFiltersData(next));
}

function updateStyle(
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  patch: Partial<NonNullable<ListingFiltersData["style"]>>
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
  value: ListingFiltersData,
  onChange: (next: ListingFiltersData) => void,
  key: keyof NonNullable<ListingFiltersData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function useListingQueries() {
  const [items, setItems] = useState<ListingQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listListingQueriesCached({ force: true })
      .then((next) => {
        if (!active) return;
        setItems(next);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load listing queries.");
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

  return { items, loading, error };
}

function ListingQuerySelect({
  value,
  onChange,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
}) {
  const normalized = normalizeListingFiltersData(value);
  const { items, loading, error } = useListingQueries();
  const loadState = loading ? "loading" : error ? "error" : items.length === 0 ? "empty" : "ready";
  const selectedValue = normalized.listingQueryId || NO_LISTING_QUERY_VALUE;
  const selectedLabel =
    selectedValue === NO_LISTING_QUERY_VALUE
      ? "No listing query selected"
      : (items.find((item) => item.id === selectedValue)?.name ?? "Selected listing query");

  return (
    <EditorSection
      title="Listing query"
      description="Bind facets to a single listing query source."
    >
      <Select
        value={selectedValue}
        onValueChange={(next) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            listingQueryId: next === NO_LISTING_QUERY_VALUE ? "" : next,
          }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select listing query">{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_LISTING_QUERY_VALUE}>No listing query selected</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loadState === "loading" ? (
        <p className="text-xs text-muted-foreground">Loading listing queries...</p>
      ) : null}
      {loadState === "empty" ? (
        <p className="text-xs text-muted-foreground">No listing queries are available yet.</p>
      ) : null}
      {loadState === "error" && error ? <p className="text-xs text-destructive">{error}</p> : null}
    </EditorSection>
  );
}

function FacetsEditor({
  value,
  onChange,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
}) {
  const normalized = normalizeListingFiltersData(value);
  const facets = normalized.facets ?? [];

  const addFacet = () => {
    const index = facets.length + 1;
    updateValue(value, onChange, (current) => ({
      ...current,
      facets: [
        ...(current.facets ?? []),
        {
          id: `facet-${index}`,
          kind: "checkbox",
          label: `Facet ${index}`,
          field: "",
          op: "in",
          options: [],
        },
      ],
    }));
  };

  return (
    <EditorSection
      title="Facet controls"
      description="Create reusable controls. Options use line format value|label."
    >
      <div className="space-y-3">
        {facets.map((facet, index) => {
          const key = facet.id || `facet-${index + 1}`;
          const kind = facet.kind;
          const isSort = kind === "sort";
          const isRange = kind === "range" || kind === "date-range";
          const canUseOptions = !isSort && !isRange;

          return (
            <div
              key={key}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Facet {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateValue(value, onChange, (current) => ({
                      ...current,
                      facets: (current.facets ?? []).filter((_, i) => i !== index),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={facet.id}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateValue(value, onChange, (current) => ({
                      ...current,
                      facets: (current.facets ?? []).map((entry, i) =>
                        i === index ? { ...entry, id: nextValue } : entry
                      ),
                    }));
                  }}
                  placeholder="facet-id"
                />
                <Input
                  value={facet.label}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateValue(value, onChange, (current) => ({
                      ...current,
                      facets: (current.facets ?? []).map((entry, i) =>
                        i === index ? { ...entry, label: nextValue } : entry
                      ),
                    }));
                  }}
                  placeholder="Facet label"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Select
                  value={facet.kind}
                  onValueChange={(nextKind) => {
                    const resolvedKind = kindOptions.some((option) => option.value === nextKind)
                      ? (nextKind as ListingFacetKind)
                      : "checkbox";
                    updateValue(value, onChange, (current) => ({
                      ...current,
                      facets: (current.facets ?? []).map((entry, i) =>
                        i === index
                          ? {
                              ...entry,
                              kind: resolvedKind,
                              op: resolveDefaultOperator(resolvedKind),
                              ...(resolvedKind === "sort" ? { field: undefined, options: [] } : {}),
                            }
                          : entry
                      ),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Facet kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {kindOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!isSort ? (
                  <Input
                    value={facet.field ?? ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateValue(value, onChange, (current) => ({
                        ...current,
                        facets: (current.facets ?? []).map((entry, i) =>
                          i === index ? { ...entry, field: nextValue } : entry
                        ),
                      }));
                    }}
                    placeholder="Field path (example: tags)"
                  />
                ) : (
                  <Input value="Sort config uses per-option field + dir." disabled />
                )}

                {!isSort ? (
                  <Select
                    value={facet.op ?? resolveDefaultOperator(kind)}
                    onValueChange={(nextOp) => {
                      if (!operatorOptions.some((option) => option.value === nextOp)) return;
                      updateValue(value, onChange, (current) => ({
                        ...current,
                        facets: (current.facets ?? []).map((entry, i) =>
                          i === index ? { ...entry, op: nextOp as ListingFilterOperator } : entry
                        ),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value="Sort does not use filter operators." disabled />
                )}
              </div>

              {canUseOptions ? (
                <Textarea
                  value={formatFacetOptions(facet)}
                  onChange={(event) => {
                    const nextOptions = parseFacetOptions(event.target.value);
                    updateValue(value, onChange, (current) => ({
                      ...current,
                      facets: (current.facets ?? []).map((entry, i) =>
                        i === index ? { ...entry, options: nextOptions } : entry
                      ),
                    }));
                  }}
                  rows={4}
                  placeholder={"value|label\nnews|News"}
                />
              ) : null}

              {isSort ? (
                <Textarea
                  value={formatSortOptions(facet)}
                  onChange={(event) => {
                    const nextSortOptions = parseSortOptions(event.target.value);
                    updateValue(value, onChange, (current) => ({
                      ...current,
                      facets: (current.facets ?? []).map((entry, i) =>
                        i === index ? { ...entry, sortOptions: nextSortOptions } : entry
                      ),
                    }));
                  }}
                  rows={4}
                  placeholder={"updatedAt:desc|Newest first|updatedAt|desc"}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addFacet}>
        Add facet
      </Button>
    </EditorSection>
  );
}

function RuntimeBehavior({
  value,
  onChange,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
}) {
  const normalized = normalizeListingFiltersData(value);

  return (
    <EditorSection title="Runtime behavior" description="Labels and auto-apply controls.">
      <Input
        value={normalized.title ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            title: event.target.value,
          }))
        }
        placeholder="Filter results"
      />
      <Textarea
        value={normalized.description ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        rows={2}
        placeholder="Optional helper text."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={normalized.searchLabel ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              searchLabel: event.target.value,
            }))
          }
          placeholder="Search"
        />
        <Input
          value={normalized.searchPlaceholder ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              searchPlaceholder: event.target.value,
            }))
          }
          placeholder="Search results..."
        />
      </div>
      <Input
        value={normalized.applyLabel ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            applyLabel: event.target.value,
          }))
        }
        placeholder="Apply filters"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
          <span>Show search field</span>
          <Switch
            checked={normalized.showSearch !== false}
            onCheckedChange={(checked) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                showSearch: checked,
              }))
            }
          />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
          <span>Auto apply changes</span>
          <Switch
            checked={normalized.autoApply !== false}
            onCheckedChange={(checked) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                autoApply: checked,
              }))
            }
          />
        </label>
      </div>
    </EditorSection>
  );
}

function SurfaceEditor({
  value,
  onChange,
}: {
  value: ListingFiltersData;
  onChange: (next: ListingFiltersData) => void;
}) {
  const normalized = normalizeListingFiltersData(value);

  return (
    <EditorSection title="Surface" description="Decorative filter frame and action colors.">
      <ClearableInputField
        label="Frame background"
        value={normalized.style?.frameBackground}
        onChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
        onClear={() => clearStyle(value, onChange, "frameBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Frame border"
        value={normalized.style?.frameBorderColor}
        onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "frameBorderColor")}
        placeholder="var(--color-border)"
      />
      <ClearableInputField
        label="Action background"
        value={normalized.style?.actionBackground}
        onChange={(next) => updateStyle(value, onChange, { actionBackground: next })}
        onClear={() => clearStyle(value, onChange, "actionBackground")}
        placeholder="var(--color-primary)"
      />
    </EditorSection>
  );
}

function RuntimeSnapshot({ value }: { value: ListingFiltersData }) {
  const normalized = normalizeListingFiltersData(value);
  const snapshot = useMemo(
    () =>
      JSON.stringify(
        {
          resolved: normalized.resolved,
        },
        null,
        2
      ),
    [normalized]
  );

  return (
    <EditorSection title="Runtime payload" description="Read-only runtime data from server SSR.">
      <Textarea value={snapshot} readOnly rows={10} className="font-mono text-xs" />
    </EditorSection>
  );
}

export function ListingFiltersWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<ListingFiltersData>) {
  return (
    <div className="space-y-3">
      <ListingQuerySelect value={value} onChange={onChange} />
      <RuntimeBehavior value={value} onChange={onChange} />
      <SurfaceEditor value={value} onChange={onChange} />
    </div>
  );
}

export function ListingFiltersVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<ListingFiltersData>) {
  return (
    <div className="space-y-3">
      <ListingQuerySelect value={value} onChange={onChange} />
      <RuntimeBehavior value={value} onChange={onChange} />
      <SurfaceEditor value={value} onChange={onChange} />
      <FacetsEditor value={value} onChange={onChange} />
    </div>
  );
}

export function ListingFiltersAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<ListingFiltersData>) {
  return (
    <div className="space-y-3">
      <FacetsEditor value={value} onChange={onChange} />
      <RuntimeSnapshot value={value} />
      <EditorSection
        title="Contract"
        description="This widget expects listing query runtime params under lq.<queryId>.* tokens."
      >
        <p className="text-xs text-muted-foreground">
          Defaults come from <code>listingFiltersDefaults</code>.
        </p>
      </EditorSection>
    </div>
  );
}

export const listingFiltersEditorDefaults = listingFiltersDefaults;
