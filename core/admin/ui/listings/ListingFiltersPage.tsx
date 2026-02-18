import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  previewListingFilters,
  type ListingFiltersPreviewResult,
} from "@/services/listingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { useListingQueries } from "./hooks/useListingQueries";

const NO_LISTING_QUERY_VALUE = "__no_listing_query__";

export function ListingFiltersPage() {
  const { items, isLoading, error } = useListingQueries();
  const [selectedListingQueryId, setSelectedListingQueryId] = useState<string>("");
  const [queryString, setQueryString] = useState("");
  const [preview, setPreview] = useState<ListingFiltersPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedListingQueryId) return;
    if (items.length === 0) return;
    setSelectedListingQueryId(items[0]!.id);
  }, [items, selectedListingQueryId]);

  const activeListingLabel = useMemo(() => {
    if (!selectedListingQueryId) return "No query selected";
    return (
      items.find((item) => item.id === selectedListingQueryId)?.name ??
      "Selected listing query"
    );
  }, [items, selectedListingQueryId]);

  const runPreview = async () => {
    if (!selectedListingQueryId) return;
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewListingFilters({
        listingQueryId: selectedListingQueryId,
        queryString,
      });
      setPreview(result);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to load filter preview.";
      setPreviewError(message);
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/filters"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Filters</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Filters"
          description="Preview runtime filter behavior for listing widgets and URL tokens."
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load listing queries</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-4 rounded-xl border border-border/70 bg-card/50 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Listing query</p>
              <Select
                value={selectedListingQueryId || NO_LISTING_QUERY_VALUE}
                onValueChange={(next) =>
                  setSelectedListingQueryId(
                    next === NO_LISTING_QUERY_VALUE ? "" : next
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select listing query">
                    {activeListingLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LISTING_QUERY_VALUE}>
                    No listing query selected
                  </SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading listing queries...
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Runtime query string</p>
              <Input
                value={queryString}
                onChange={(event) => setQueryString(event.target.value)}
                placeholder="lq.<queryId>.<field>.<op>=value"
              />
            </div>
            <Button
              type="button"
              onClick={runPreview}
              disabled={!selectedListingQueryId || isPreviewLoading}
            >
              {isPreviewLoading ? "Previewing..." : "Run preview"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Use tokens like <code>lq.&lt;queryId&gt;.__q</code>,{" "}
            <code>lq.&lt;queryId&gt;.__sort</code>, or
            <code> lq.&lt;queryId&gt;.&lt;field&gt;.&lt;operator&gt;</code>.
          </p>
        </section>

        {previewError ? (
          <Alert variant="destructive">
            <AlertTitle>Preview failed</AlertTitle>
            <AlertDescription>{previewError}</AlertDescription>
          </Alert>
        ) : null}

        {preview ? (
          <section className="space-y-4 rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{preview.total}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Applied filters
                </p>
                <p className="text-lg font-semibold">{preview.appliedFilters.length}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rejected tokens
                </p>
                <p className="text-lg font-semibold">{preview.rejectedTokens.length}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Runtime search
                </p>
                <p className="text-lg font-semibold">
                  {preview.searchQuery ? "Enabled" : "None"}
                </p>
              </div>
            </div>

            {preview.rejectedTokens.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Ignored tokens: {preview.rejectedTokens.join(", ")}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">Rows snapshot</p>
              <pre className="max-h-80 overflow-auto rounded-md border border-border/70 bg-background/60 p-3 text-xs">
                {JSON.stringify(preview.rows.slice(0, 20), null, 2)}
              </pre>
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}
