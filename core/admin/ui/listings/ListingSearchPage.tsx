import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  previewPublicSearch,
  type PublicSearchPreviewResult,
  type PublicSearchSource,
} from "@/services/listingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

export function ListingSearchPage() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("20");
  const [usePages, setUsePages] = useState(true);
  const [useEntries, setUseEntries] = useState(true);
  const [usePosts, setUsePosts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PublicSearchPreviewResult | null>(null);

  const selectedSources = useMemo(() => {
    const sources: PublicSearchSource[] = [];
    if (usePages) sources.push("pages");
    if (useEntries) sources.push("entries");
    if (usePosts) sources.push("posts");
    return sources;
  }, [useEntries, usePages, usePosts]);

  const runPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const limitValue = Number(limit);
      const result = await previewPublicSearch({
        q: query,
        ...(Number.isFinite(limitValue) && limitValue > 0
          ? { limit: Math.floor(limitValue) }
          : {}),
        ...(selectedSources.length > 0 ? { sources: selectedSources } : {}),
      });
      setPayload(result);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to load search preview.";
      setError(message);
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/search"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Search</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Search"
          description="Preview global public search behavior used by search-box widgets."
        />

        <section className="space-y-4 rounded-xl border border-border/70 bg-card/50 p-4">
          <div className="grid gap-3 md:grid-cols-[2fr_120px_auto] md:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Query</p>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type at least 2 characters..."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Limit</p>
              <Input
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                placeholder="20"
              />
            </div>
            <Button type="button" onClick={runPreview} disabled={isLoading}>
              {isLoading ? "Searching..." : "Run preview"}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
              <span>Pages</span>
              <Switch checked={usePages} onCheckedChange={setUsePages} />
            </label>
            <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
              <span>Entries</span>
              <Switch checked={useEntries} onCheckedChange={setUseEntries} />
            </label>
            <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
              <span>Posts</span>
              <Switch checked={usePosts} onCheckedChange={setUsePosts} />
            </label>
          </div>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Search preview failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {payload ? (
          <section className="space-y-4 rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Resolved query:</span>
              <code>{payload.query || "(empty)"}</code>
              <span>•</span>
              <span>Sources: {payload.sources.join(", ") || "(none)"}</span>
              <span>•</span>
              <span>Items: {payload.items.length}</span>
            </div>

            <div className="space-y-2">
              {payload.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results.</p>
              ) : (
                payload.items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-md border border-border/70 bg-background/60 px-3 py-2"
                  >
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.source} • {item.href}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}
