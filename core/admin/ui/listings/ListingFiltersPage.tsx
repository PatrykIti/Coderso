import { useMemo, useState } from "react";

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
import { previewListingFilters, type ListingFiltersPreviewResult } from "@/services/listingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { useListingQueries } from "./hooks/useListingQueries";

const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const LISTING_QUERY_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

type QueryExample = {
  id: string;
  label: string;
  description: string;
  query: string;
};

export const extractListingQueryIdFromQueryString = (value: string): string | null => {
  const normalized = value.startsWith("?") ? value.slice(1) : value;
  const params = new URLSearchParams(normalized);
  let resolvedId: string | null = null;
  for (const key of params.keys()) {
    const match = key.match(/^lq\.([^.]+)\./);
    if (!match) continue;
    const candidate = match[1] ?? null;
    if (!candidate) continue;
    if (!resolvedId) {
      resolvedId = candidate;
      continue;
    }
    if (resolvedId !== candidate) return null;
  }
  return resolvedId;
};

export function ListingFiltersPage() {
  const { items, isLoading, error } = useListingQueries();
  const [selectedListingQueryId, setSelectedListingQueryId] = useState<string>("");
  const [queryString, setQueryString] = useState("");
  const [preview, setPreview] = useState<ListingFiltersPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const resolvedListingQueryId = selectedListingQueryId || items[0]?.id || "";

  const activeListingLabel = useMemo(() => {
    if (!resolvedListingQueryId) return "No query selected";
    return (
      items.find((item) => item.id === resolvedListingQueryId)?.name ?? "Selected listing query"
    );
  }, [items, resolvedListingQueryId]);

  const runtimeTokenPrefix = useMemo(() => {
    const fallbackQueryId = items[0]?.id ?? "<listingQueryId>";
    const queryId = resolvedListingQueryId || fallbackQueryId;
    return `lq.${queryId}`;
  }, [items, resolvedListingQueryId]);

  const queryExamples = useMemo<QueryExample[]>(
    () => [
      {
        id: "search",
        label: "Text search",
        description: "Find rows matching the global text token.",
        query: `${runtimeTokenPrefix}.__q=about`,
      },
      {
        id: "sort",
        label: "Sort newest",
        description: "Sort by updated date descending.",
        query: `${runtimeTokenPrefix}.__sort=updatedAt:desc`,
      },
      {
        id: "page",
        label: "Second page",
        description: "Paginate to page 2 while keeping default filters.",
        query: `${runtimeTokenPrefix}.__page=2`,
      },
      {
        id: "eq",
        label: "Exact match filter",
        description: "Filter rows where status equals published.",
        query: `${runtimeTokenPrefix}.status.eq=published`,
      },
      {
        id: "in",
        label: "Multi-value filter",
        description: "Filter rows where category is one of selected values.",
        query: `${runtimeTokenPrefix}.category.in=service,repair`,
      },
      {
        id: "combined",
        label: "Combined query",
        description: "Combine search, sort and filter in one runtime query string.",
        query: `${runtimeTokenPrefix}.__q=about&${runtimeTokenPrefix}.__sort=updatedAt:desc&${runtimeTokenPrefix}.status.eq=published`,
      },
    ],
    [runtimeTokenPrefix]
  );

  const runPreview = async () => {
    const inferredListingQueryId = extractListingQueryIdFromQueryString(queryString);
    const previewListingQueryId = resolvedListingQueryId || inferredListingQueryId;
    if (!previewListingQueryId) {
      setPreviewError(
        "Select a listing query first, or provide tokens like lq.<listingQueryId>.<field>.<operator> in query string."
      );
      return;
    }
    if (!LISTING_QUERY_ID_PATTERN.test(previewListingQueryId)) {
      setPreviewError(
        "Listing query id in runtime tokens has invalid format. Use an existing query from Coderso -> Listings."
      );
      return;
    }
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewListingFilters({
        listingQueryId: previewListingQueryId,
        queryString,
      });
      if (!selectedListingQueryId && inferredListingQueryId) {
        setSelectedListingQueryId(inferredListingQueryId);
      }
      setPreview(result);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "Failed to load filter preview.";
      setPreviewError(message);
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/advanced/filters" breadcrumbs={["Coderso", "Filters"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Filters"
          description="Preview runtime filter behavior for listing widgets and URL tokens."
        />

        <section className="rounded-xl border border-border/70 bg-card/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How this works</p>
          <p className="mt-1">
            First define data logic in <code>Coderso → Listings</code> (source, filters, sorting,
            pagination). Then use this Filters screen to test runtime URL tokens for that listing
            query.
          </p>
          <p className="mt-1">
            Widgets and templates use the same listing query, so data logic stays in one place.
          </p>
        </section>

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
                value={resolvedListingQueryId || NO_LISTING_QUERY_VALUE}
                onValueChange={(next) =>
                  setSelectedListingQueryId(next === NO_LISTING_QUERY_VALUE ? "" : next)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select listing query">{activeListingLabel}</SelectValue>
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
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading listing queries...</p>
              ) : null}
              {resolvedListingQueryId ? (
                <p className="text-xs text-muted-foreground">
                  Query ID: <code>{resolvedListingQueryId}</code>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Runtime tokens use listing query ID (UUID), not query name.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Runtime query string</p>
              <Input
                value={queryString}
                onChange={(event) => setQueryString(event.target.value)}
                placeholder="lq.<queryId>.<field>.<op>=value"
              />
            </div>
            <Button type="button" onClick={runPreview} disabled={isPreviewLoading}>
              {isPreviewLoading ? "Previewing..." : "Run preview"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Use tokens like <code>lq.&lt;queryId&gt;.__q</code>,{" "}
            <code>lq.&lt;queryId&gt;.__sort</code>, or
            <code> lq.&lt;queryId&gt;.&lt;field&gt;.&lt;operator&gt;</code>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExamples((value) => !value)}
            >
              {showExamples ? "Hide examples" : "Show examples"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Quick help for token format and ready-to-run sample queries.
            </p>
          </div>
          {showExamples ? (
            <section className="space-y-4 rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">How runtime query string works</p>
                <p className="text-xs text-muted-foreground">
                  Prefix every token with <code>{runtimeTokenPrefix}</code>. Token groups:
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs">
                    <p className="font-medium text-foreground">Search and paging</p>
                    <p>
                      <code>.__q</code>, <code>.__sort</code>, <code>.__page</code>
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs">
                    <p className="font-medium text-foreground">Field filters</p>
                    <p>
                      <code>.&lt;field&gt;.&lt;operator&gt;=value</code>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Operators: <code>eq</code>, <code>neq</code>, <code>in</code>, <code>nin</code>,{" "}
                  <code>contains</code>, <code>startsWith</code>, <code>gt</code>, <code>gte</code>,{" "}
                  <code>lt</code>, <code>lte</code>, <code>between</code>, <code>exists</code>.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Example queries</p>
                <div className="space-y-2">
                  {queryExamples.map((example) => (
                    <article
                      key={example.id}
                      className="rounded-md border border-border/70 bg-muted/10 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{example.label}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQueryString(example.query)}
                        >
                          Use example
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{example.description}</p>
                      <code className="mt-2 block break-all rounded bg-background px-2 py-1 text-xs">
                        {example.query}
                      </code>
                    </article>
                  ))}
                </div>
                {!resolvedListingQueryId ? (
                  <p className="text-xs text-muted-foreground">
                    Select a listing query to run preview, or keep token format with
                    <code> lq.&lt;listingQueryId&gt;...</code> in query string.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
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
                <p className="text-lg font-semibold">{preview.searchQuery ? "Enabled" : "None"}</p>
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
