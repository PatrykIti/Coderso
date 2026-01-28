import { LayoutGrid, List, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  listContentTypes,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { listEntries } from "@/services/entriesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";

import { ContentTypeCreateDrawer } from "../content-types/ContentTypeCreateDrawer";
import { EntryCreateDrawer } from "./EntryCreateDrawer";
import { EntryFilters } from "./EntryFilters";
import { EntryTable } from "./EntryTable";
import { EntryTypeSidebar } from "./EntryTypeSidebar";

export function EntryList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [entries, setEntries] = useState([] as Awaited<ReturnType<typeof listEntries>>);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listContentTypes()
      .then((result) => {
        if (!active) return;
        setTypes(result);
        setActiveSlug((prev) => prev ?? result[0]?.slug ?? null);
        setError(null);
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
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) return;
    let active = true;
    listEntries(activeSlug)
      .then((result) => {
        if (!active) return;
        setEntries(result);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load entries.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeSlug]);

  const activeType = useMemo(
    () => types.find((type) => type.slug === activeSlug) ?? null,
    [types, activeSlug]
  );

  const handleEditEntry = (id: string) => {
    if (typeof window !== "undefined" && activeSlug) {
      window.location.assign(`/admin/entries/${encodeURIComponent(activeSlug)}/${encodeURIComponent(id)}`);
    }
  };

  const handleSelectType = (slug: string) => {
    setIsLoading(true);
    setError(null);
    setActiveSlug(slug);
  };

  const handleEntryCreated = (entry: { id: string }, typeSlug: string) => {
    if (typeSlug === activeSlug) {
      listEntries(typeSlug).then((result) => setEntries(result));
    }
    if (typeof window !== "undefined") {
      window.location.assign(`/admin/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(entry.id)}`);
    }
  };

  const handleTypeCreated = (type: ContentTypeSummary) => {
    setTypes((prev) => [type, ...prev]);
    setActiveSlug(type.slug);
  };

  return (
    <SplitShell
      activeHref="/admin/entries"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Entries</span>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load entries</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-72 shrink-0 overflow-hidden rounded-xl border bg-background lg:block">
            <EntryTypeSidebar
              types={types.map((type) => ({
                id: type.id,
                slug: type.slug,
                name: type.name,
                count: activeSlug === type.slug ? entries.length : 0,
              }))}
              activeSlug={activeSlug}
              onSelect={handleSelectType}
              onCreateCollection={() => setCollectionOpen(true)}
            />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {activeType?.name ?? "Entries"}
                </h1>
                <Badge
                  variant="secondary"
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                >
                  Entries
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center rounded-lg border bg-background p-1 shadow-xs sm:flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="bg-primary/10 text-primary hover:bg-primary/15"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </div>
            </div>
            <EntryFilters />
            {isLoading ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Loading entries...
              </div>
            ) : (
              <EntryTable entries={entries} onEdit={handleEditEntry} />
            )}
          </div>
        </div>
      </div>
      <EntryCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={types}
        defaultTypeSlug={activeSlug}
        onCreated={handleEntryCreated}
      />
      <ContentTypeCreateDrawer
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        onCreated={handleTypeCreated}
      />
    </SplitShell>
  );
}
