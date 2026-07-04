import { ArrowLeft, Image as ImageIcon, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import {
  createListingQuery,
  getListingQueryCached,
  previewListingQuery,
  updateListingQuery,
  type ListingFilter,
  type ListingQueryPayload,
  type ListingSort,
} from "@/services/listingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import {
  createDefaultListingQuery,
  listingFilterOperatorOptions,
  listingSourceOptions,
} from "./defaults";
import { useListingTemplates } from "./hooks/useListingTemplates";
import { sourceLabel } from "./listingQuerySummary";
import { listingQueryToasts } from "./listingActionToasts";

function RailGroup({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

const resolvePreviewRowTitle = (row: Record<string, unknown>, index: number): string => {
  if (typeof row.title === "string" && row.title.trim()) return row.title;
  if (typeof row.name === "string" && row.name.trim()) return row.name;
  if (typeof row.slug === "string" && row.slug.trim()) return row.slug;
  return `Row ${index + 1}`;
};

type QueryDraftSnapshot = {
  name: string;
  description: string;
  query: ListingQueryPayload;
  selectedTemplateId: string;
};

const resolveListingId = (pathname: string) => {
  const normalizedPathname = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  const parts = normalizedPathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "listings");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

const resolveInitialContentTypeId = (path: string) => {
  const queryString = path.split("?")[1]?.split("#")[0] ?? "";
  const value = new URLSearchParams(queryString).get("contentTypeId");
  return value?.trim() ?? "";
};

const stringifyFilterValue = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "")).join(", ");
  }
  return String(value);
};

const parseFilterScalar = (input: string): unknown => {
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const parsed = Number(trimmed);
  if (Number.isFinite(parsed) && `${parsed}` === trimmed) {
    return parsed;
  }
  return trimmed;
};

const parseFilterValue = (op: ListingFilter["op"], input: string): unknown => {
  if (op === "exists") return undefined;
  if (op === "in" || op === "nin" || op === "between") {
    return input
      .split(",")
      .map((chunk) => parseFilterScalar(chunk))
      .filter((chunk) => chunk !== "");
  }
  return parseFilterScalar(input);
};

const normalizeDraftQuery = (query: ListingQueryPayload): ListingQueryPayload => {
  if (query.source === "entries") {
    return {
      ...query,
      sourceConfig: {
        contentTypeId: query.sourceConfig.contentTypeId?.trim() ?? "",
        includeDrafts: query.sourceConfig.includeDrafts === true,
      },
    };
  }

  if (query.source === "taxonomies") {
    return {
      ...query,
      sourceConfig: {
        taxonomyId: query.sourceConfig.taxonomyId?.trim() || undefined,
      },
    };
  }

  if (query.source === "posts") {
    return {
      ...query,
      sourceConfig: {
        includeDrafts: query.sourceConfig.includeDrafts === true,
      },
    };
  }

  return {
    ...query,
    sourceConfig: {},
  };
};

const cloneDraftSnapshot = (value: QueryDraftSnapshot): QueryDraftSnapshot => ({
  ...value,
  query: {
    ...value.query,
    sourceConfig: { ...value.query.sourceConfig },
    filters: value.query.filters.map((filter) => ({ ...filter })),
    sort: value.query.sort.map((sort) => ({ ...sort })),
    pagination: { ...value.query.pagination },
    fields: [...value.query.fields],
  },
});

export function ListingEditorPage() {
  const { navigate, path } = useAdminRouter();
  const [listingId] = useState<string | null>(() => {
    if (path) return resolveListingId(path);
    if (typeof window === "undefined") return null;
    return resolveListingId(window.location.pathname);
  });

  const isCreateMode = !listingId || listingId === "new";
  const initialContentTypeId = isCreateMode ? resolveInitialContentTypeId(path) : "";

  const [contentTypes, setContentTypes] = useState(() => getCachedContentTypes() ?? []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState<ListingQueryPayload>(() =>
    createDefaultListingQuery(initialContentTypeId)
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(() => !isCreateMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<QueryDraftSnapshot | null>(() =>
    isCreateMode
      ? {
          name: "",
          description: "",
          query: createDefaultListingQuery(initialContentTypeId),
          selectedTemplateId: "",
        }
      : null
  );

  const { items: templates } = useListingTemplates();

  const markDirty = () => setHasUnsavedChanges(true);

  const applySnapshot = useCallback((value: QueryDraftSnapshot) => {
    setName(value.name);
    setDescription(value.description);
    setQuery(value.query);
    setSelectedTemplateId(value.selectedTemplateId);
    setSnapshot(cloneDraftSnapshot(value));
    setHasUnsavedChanges(false);
  }, []);

  const refreshQuery = useCallback(
    async (force?: boolean) => {
      if (!listingId || isCreateMode) return;
      try {
        const detail = await getListingQueryCached(listingId, { force });
        if (!detail) {
          setError("Listing query not found.");
          return;
        }
        applySnapshot({
          name: detail.name,
          description: detail.description ?? "",
          query: detail.query,
          selectedTemplateId: "",
        });
        setError(null);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load listing query.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [applySnapshot, isCreateMode, listingId]
  );

  useEffect(() => {
    listContentTypesCached({ force: true })
      .then((items) => setContentTypes(items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isCreateMode) return;
    if (!listingId) return;
    let active = true;
    getListingQueryCached(listingId, { force: true })
      .then((detail) => {
        if (!active) return;
        if (!detail) {
          setError("Listing query not found.");
          return;
        }
        applySnapshot({
          name: detail.name,
          description: detail.description ?? "",
          query: detail.query,
          selectedTemplateId: "",
        });
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load listing query.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applySnapshot, isCreateMode, listingId]);

  useEffect(() => {
    if (!listingId || isCreateMode) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.listingQueryDetail(listingId)) return;
      if (hasUnsavedChanges) return;
      refreshQuery(true).catch(() => undefined);
    });
  }, [hasUnsavedChanges, isCreateMode, listingId, refreshQuery]);

  const sourceDescription = useMemo(() => {
    if (query.source === "entries") {
      return "Use a specific Content Type as source.";
    }
    if (query.source === "posts") {
      return "Uses the default post content type mapping.";
    }
    if (query.source === "users") {
      return "List admin users with profile data.";
    }
    return "List taxonomies with term counters.";
  }, [query.source]);

  const fieldsText = query.fields.join(", ");

  const runPreview = async () => {
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const payload = normalizeDraftQuery(query);
      const preview = await previewListingQuery(payload);
      setPreviewRows(preview.rows);
      setPreviewTotal(preview.total);
    } catch (err) {
      if (isApiClientError(err)) {
        setPreviewError(err.message);
      } else {
        setPreviewError("Failed to run listing preview.");
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description || null,
        query: normalizeDraftQuery(query),
      };
      if (isCreateMode) {
        const created = await createListingQuery(payload);
        listingQueryToasts.success("create", { targetLabel: created.name });
        applySnapshot({
          name: created.name,
          description: created.description ?? "",
          query: created.query,
          selectedTemplateId,
        });
        navigate(`/advanced/listings/${encodeURIComponent(created.id)}`);
      } else if (listingId) {
        const updated = await updateListingQuery(listingId, payload);
        listingQueryToasts.success("update", { targetLabel: updated.name });
        applySnapshot({
          name: updated.name,
          description: updated.description ?? "",
          query: updated.query,
          selectedTemplateId,
        });
      }
    } catch (err) {
      setError(
        listingQueryToasts.error(isCreateMode ? "create" : "update", err, {
          fallbackMessage: "Failed to save listing query.",
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!snapshot) return;
    applySnapshot(snapshot);
    setPreviewError(null);
  };

  const updateFilter = (index: number, updates: Partial<ListingFilter>) => {
    setQuery((prev) => {
      const nextFilters = [...prev.filters];
      nextFilters[index] = { ...nextFilters[index], ...updates };
      return { ...prev, filters: nextFilters };
    });
    markDirty();
  };

  const updateSort = (index: number, updates: Partial<ListingSort>) => {
    setQuery((prev) => {
      const nextSort = [...prev.sort];
      nextSort[index] = { ...nextSort[index], ...updates };
      return { ...prev, sort: nextSort };
    });
    markDirty();
  };

  if (isLoading) {
    return (
      <AdminShell activeHref="/admin/advanced/listings">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Loading listing query...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      activeHref="/admin/advanced/listings"
      breadcrumbs={["Coderso", "Listings", isCreateMode ? "New query" : name || "Editor"]}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Listings", href: "/advanced/listings" },
            { label: isCreateMode ? "New query" : name || "Editor" },
          ]}
          title={isCreateMode ? "New listing query" : name || "Edit listing query"}
          description="Build filters, sorting, and fields, then preview the runtime payload."
          actions={
            <>
              {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/advanced/listings")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to list
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDiscard}
                disabled={!hasUnsavedChanges}
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
              <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save query"}
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Listing query error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {previewError ? (
          <Alert variant="destructive">
            <AlertTitle>Preview failed</AlertTitle>
            <AlertDescription>{previewError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="text-sm font-medium">Listing editor</span>
            <Badge variant={hasUnsavedChanges ? "warning" : "outline"}>
              {`${isCreateMode ? "New query" : name || "Listing"} · ${
                hasUnsavedChanges ? "draft" : "saved"
              }`}
            </Badge>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[17rem_minmax(0,1fr)_20rem]">
            {/* LEFT RAIL — Data + Filters */}
            <aside className="space-y-6 border-b border-border bg-muted/20 p-4 xl:border-b-0 xl:border-r">
              <RailGroup label="Details">
                <label className="block space-y-1.5 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <Input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      markDirty();
                    }}
                    placeholder="Homepage featured cards"
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <Textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      markDirty();
                    }}
                    rows={3}
                    placeholder="Optional context for editors."
                  />
                </label>
              </RailGroup>

              <RailGroup label="Data">
                <label className="block space-y-1.5 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Source</span>
                  <Select
                    value={query.source}
                    onValueChange={(value) => {
                      setQuery((prev) => ({
                        ...prev,
                        source: value as ListingQueryPayload["source"],
                      }));
                      markDirty();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {listingSourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <p className="text-xs text-muted-foreground">{sourceDescription}</p>

                {query.source === "entries" ? (
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">Content type</span>
                    <Select
                      value={query.sourceConfig.contentTypeId ?? ""}
                      onValueChange={(value) => {
                        setQuery((prev) => ({
                          ...prev,
                          sourceConfig: {
                            ...prev.sourceConfig,
                            contentTypeId: value,
                          },
                        }));
                        markDirty();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}

                {query.source === "taxonomies" ? (
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      Taxonomy ID (optional)
                    </span>
                    <Input
                      value={query.sourceConfig.taxonomyId ?? ""}
                      onChange={(event) => {
                        setQuery((prev) => ({
                          ...prev,
                          sourceConfig: {
                            ...prev.sourceConfig,
                            taxonomyId: event.target.value,
                          },
                        }));
                        markDirty();
                      }}
                      placeholder="taxonomy-id"
                    />
                  </label>
                ) : null}

                {query.source === "entries" || query.source === "posts" ? (
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      Include drafts
                    </span>
                    <Select
                      value={query.sourceConfig.includeDrafts ? "yes" : "no"}
                      onValueChange={(value) => {
                        setQuery((prev) => ({
                          ...prev,
                          sourceConfig: {
                            ...prev.sourceConfig,
                            includeDrafts: value === "yes",
                          },
                        }));
                        markDirty();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
              </RailGroup>

              <RailGroup
                label="Filters"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setQuery((prev) => ({
                        ...prev,
                        filters: [...prev.filters, { field: "", op: "eq", value: "" }],
                      }));
                      markDirty();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add filter
                  </Button>
                }
              >
                {query.filters.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No filters yet.</p>
                ) : null}
                {query.filters.map((filter, index) => (
                  <div
                    key={`${filter.field}-${index}`}
                    className="space-y-2 rounded-xl border border-border bg-card p-3"
                  >
                    <Input
                      value={filter.field}
                      onChange={(event) => updateFilter(index, { field: event.target.value })}
                      placeholder="field path (e.g. status)"
                    />
                    <Select
                      value={filter.op}
                      onValueChange={(value) =>
                        updateFilter(index, { op: value as ListingFilter["op"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {listingFilterOperatorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={stringifyFilterValue(filter.value)}
                      onChange={(event) =>
                        updateFilter(index, {
                          value: parseFilterValue(filter.op, event.target.value),
                        })
                      }
                      placeholder="value (comma separated for arrays)"
                      disabled={filter.op === "exists"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery((prev) => ({
                          ...prev,
                          filters: prev.filters.filter((_, itemIndex) => itemIndex !== index),
                        }));
                        markDirty();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </RailGroup>
            </aside>

            {/* CANVAS — result preview grid */}
            <div className="min-w-0 space-y-4 bg-dotted p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-display text-lg font-semibold">{name || "Listing"}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{`Bound query · ${previewTotal} results`}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={runPreview}
                    disabled={isPreviewing}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {isPreviewing ? "Previewing..." : "Run preview"}
                  </Button>
                </div>
              </div>

              {previewRows.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Preview payload will appear here.
                  </span>
                  <span>Run preview to inspect resolved rows for this query.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {previewRows.map((row, index) => (
                    <Card key={`preview-row-${index}`} className="gap-0 overflow-hidden py-0">
                      <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground">
                        <ImageIcon className="size-7" />
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="font-display text-sm font-semibold">
                          {resolvePreviewRowTitle(row, index)}
                        </div>
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer select-none">Inspect row</summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
                            {JSON.stringify(row, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT INSPECTOR — sort / pagination / fields / template */}
            <aside className="space-y-5 border-t border-border bg-card p-4 xl:border-t-0 xl:border-l">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Inspector</span>
                <Badge variant="soft">{sourceLabel(query.source)}</Badge>
              </div>

              <InspectorRow label="Sort">
                <div className="space-y-2">
                  {query.sort.map((sort, index) => (
                    <div
                      key={`${sort.field}-${index}`}
                      className="space-y-2 rounded-xl border border-border bg-card p-3"
                    >
                      <Input
                        value={sort.field}
                        onChange={(event) => updateSort(index, { field: event.target.value })}
                        placeholder="sort field"
                      />
                      <Select
                        value={sort.dir}
                        onValueChange={(value) =>
                          updateSort(index, { dir: value as ListingSort["dir"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setQuery((prev) => ({
                            ...prev,
                            sort: prev.sort.filter((_, itemIndex) => itemIndex !== index),
                          }));
                          markDirty();
                        }}
                        disabled={query.sort.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => {
                      setQuery((prev) => ({
                        ...prev,
                        sort: [...prev.sort, { field: "id", dir: "asc" }],
                      }));
                      markDirty();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add sort
                  </Button>
                </div>
              </InspectorRow>

              <div className="grid grid-cols-2 gap-3">
                <InspectorRow label="Limit">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={query.pagination.limit}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setQuery((prev) => ({
                        ...prev,
                        pagination: {
                          ...prev.pagination,
                          limit: Number.isFinite(parsed) ? parsed : prev.pagination.limit,
                        },
                      }));
                      markDirty();
                    }}
                  />
                </InspectorRow>
                <InspectorRow label="Offset">
                  <Input
                    type="number"
                    min={0}
                    max={5000}
                    value={query.pagination.offset}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setQuery((prev) => ({
                        ...prev,
                        pagination: {
                          ...prev.pagination,
                          offset: Number.isFinite(parsed) ? parsed : prev.pagination.offset,
                        },
                      }));
                      markDirty();
                    }}
                  />
                </InspectorRow>
              </div>

              <InspectorRow label="Fields (comma separated)">
                <Textarea
                  value={fieldsText}
                  onChange={(event) => {
                    const fields = event.target.value
                      .split(",")
                      .map((field) => field.trim())
                      .filter(Boolean);
                    setQuery((prev) => ({ ...prev, fields }));
                    markDirty();
                  }}
                  rows={3}
                  placeholder="id, title, slug, status"
                />
              </InspectorRow>

              <InspectorRow label="Template for preview context (optional)">
                <Select
                  value={selectedTemplateId || "__none__"}
                  onValueChange={(value) => {
                    setSelectedTemplateId(value === "__none__" ? "" : value);
                    markDirty();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No template selected</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.layout})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InspectorRow>
            </aside>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
