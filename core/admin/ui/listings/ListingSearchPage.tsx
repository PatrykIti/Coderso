import { Info, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  previewPublicSearch,
  type PublicSearchPreviewResult,
  type PublicSearchSource,
} from "@/services/listingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";

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
        ...(Number.isFinite(limitValue) && limitValue > 0 ? { limit: Math.floor(limitValue) } : {}),
        ...(selectedSources.length > 0 ? { sources: selectedSources } : {}),
      });
      setPayload(result);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "Failed to load search preview.";
      setError(message);
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/advanced/search" breadcrumbs={["Coderso", "Search"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Search"
          description="Preview global public search behavior used by search-box widgets."
          icon={<Search />}
          actions={<Badge variant="soft">Beta</Badge>}
        />

        <Card className="flex flex-row items-start gap-3 rounded-2xl bg-primary-soft/50 p-4 text-sm text-muted-foreground">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary-soft-foreground">
            <Info className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-foreground">What this preview searches</p>
            <p>
              Indexed now: <code>pages.title</code>, <code>pages.slug</code>,
              <code> entries.title</code>, <code>entries.slug</code>, and
              <code> entries.data.title</code>.
            </p>
            <p>Not indexed yet: full widget/page body content rendered on frontend.</p>
          </div>
        </Card>

        <Card className="gap-0 rounded-2xl py-0">
          <div className="px-5 py-4">
            <div className="mb-3 text-sm font-medium text-foreground">Search preview</div>
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <div className="flex h-11 w-full cursor-not-allowed items-center rounded-2xl border border-border bg-muted/50 pl-10 pr-3 text-sm text-muted-foreground shadow-soft">
                {query || "Search…"}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Non-interactive preview of how the search box renders on the front end.
            </p>
          </div>
        </Card>

        <SectionCard bodyClassName="space-y-4">
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
            <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft">
              <span>Pages</span>
              <Switch checked={usePages} onCheckedChange={setUsePages} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft">
              <span>Entries</span>
              <Switch checked={useEntries} onCheckedChange={setUseEntries} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft">
              <span>Posts</span>
              <Switch checked={usePosts} onCheckedChange={setUsePosts} />
            </label>
          </div>
        </SectionCard>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Search preview failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {payload ? (
          <SectionCard bodyClassName="space-y-4">
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
                    className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft"
                  >
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.source} • {item.href}
                    </p>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </AdminShell>
  );
}
