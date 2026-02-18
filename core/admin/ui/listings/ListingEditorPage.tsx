import { ArrowLeft, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { subscribeCacheEvents } from "@/utils/cacheBus";

import {
  createDefaultListingQuery,
  listingFilterOperatorOptions,
  listingSourceOptions,
} from "./defaults";
import { useListingTemplates } from "./hooks/useListingTemplates";

type QueryDraftSnapshot = {
  name: string;
  description: string;
  query: ListingQueryPayload;
  selectedTemplateId: string;
};

const resolveListingId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "listings");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
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
  const { navigate } = useAdminRouter();
  const [listingId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveListingId(window.location.pathname);
  });

  const isCreateMode = !listingId || listingId === "new";

  const [contentTypes, setContentTypes] = useState(() => getCachedContentTypes() ?? []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState<ListingQueryPayload>(() => createDefaultListingQuery());
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
          query: createDefaultListingQuery(),
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
    refreshQuery(true).catch(() => undefined);
  }, [isCreateMode, refreshQuery]);

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
        applySnapshot({
          name: created.name,
          description: created.description ?? "",
          query: created.query,
          selectedTemplateId,
        });
        navigate(`/coderso/listings/${encodeURIComponent(created.id)}`);
      } else if (listingId) {
        const updated = await updateListingQuery(listingId, payload);
        applySnapshot({
          name: updated.name,
          description: updated.description ?? "",
          query: updated.query,
          selectedTemplateId,
        });
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save listing query.");
      }
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
      <AdminShell activeHref="/admin/coderso/listings">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Loading listing query...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      activeHref="/admin/coderso/listings"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span>Listings</span>
          <span>/</span>
          <span className="text-foreground">
            {isCreateMode ? "New query" : name || "Editor"}
          </span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isCreateMode ? "New listing query" : "Edit listing query"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Build filters, sorting, and fields, then preview the runtime payload.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/coderso/listings")}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleDiscard} disabled={!hasUnsavedChanges}>
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
            <Button variant="outline" className="gap-2" onClick={runPreview} disabled={isPreviewing}>
              <RefreshCcw className="h-4 w-4" />
              {isPreviewing ? "Previewing..." : "Run preview"}
            </Button>
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save query"}
            </Button>
          </div>
        </div>

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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basics</CardTitle>
                <CardDescription>Name and describe this query preset.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Name</span>
                  <Input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      markDirty();
                    }}
                    placeholder="Homepage featured cards"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Description</span>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source</CardTitle>
                <CardDescription>{sourceDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Source type</span>
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

                {query.source === "entries" ? (
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Content type</span>
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
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Taxonomy ID (optional)</span>
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

                {(query.source === "entries" || query.source === "posts") ? (
                  <label className="grid gap-1.5 text-sm md:col-span-2">
                    <span className="font-medium">Include drafts</span>
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
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Apply source-level constraints.</CardDescription>
                </div>
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
              </CardHeader>
              <CardContent className="space-y-3">
                {query.filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No filters yet.</p>
                ) : null}
                {query.filters.map((filter, index) => (
                  <div
                    key={`${filter.field}-${index}`}
                    className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto]"
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Sort and Pagination</CardTitle>
                  <CardDescription>Control item ordering and limits.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
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
              </CardHeader>
              <CardContent className="space-y-4">
                {query.sort.map((sort, index) => (
                  <div
                    key={`${sort.field}-${index}`}
                    className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
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

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Limit</span>
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
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Offset</span>
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
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fields and Template</CardTitle>
                <CardDescription>
                  Select fields returned by preview/runtime and choose template context.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Fields (comma separated)</span>
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
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Template for preview context (optional)</span>
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
                </label>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  {previewTotal > 0
                    ? `${previewTotal} matching row${previewTotal === 1 ? "" : "s"}`
                    : "Run preview to inspect resolved rows."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {previewRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Preview payload will appear here.
                  </div>
                ) : null}
                {previewRows.map((row, index) => (
                  <pre
                    key={`preview-row-${index}`}
                    className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs"
                  >
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
