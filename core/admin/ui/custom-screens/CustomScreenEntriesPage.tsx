import { MoreHorizontal, Pencil, Plus, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import { getCachedCustomScreen, getCustomScreenCached, type CustomScreenRecord } from "@/services/customScreensClient";
import {
  deleteEntry,
  getCachedEntries,
  listEntriesCached,
  type EntrySummary,
} from "@/services/entriesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { AdminLink } from "@/ui/shared/AdminLink";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { EntryCreateDrawer } from "../entries/EntryCreateDrawer";
import { resolveCustomScreenId } from "./routeParams";

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

type CustomScreenEntriesTableProps = {
  screenId: string;
  items: EntrySummary[];
  typeSlug: string;
  emptyMessage?: string;
  onDelete: (id: string) => void;
};

function CustomScreenEntriesTable({
  screenId,
  items,
  typeSlug,
  emptyMessage,
  onDelete,
}: CustomScreenEntriesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[18rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Record
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Status
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
              Updated
            </TableHead>
            <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="px-6 py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No records yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-6 pl-6">
                <div className="flex flex-col gap-1">
                  <AdminLink
                    href={`/coderso/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(item.id)}`}
                    className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                  >
                    {item.title}
                  </AdminLink>
                  <span className="text-xs text-muted-foreground">/{item.slug}</span>
                </div>
              </TableCell>
              <TableCell className="hidden px-4 py-6 md:table-cell">
                <Badge
                  variant={item.status === "published" ? "default" : "outline"}
                  className="capitalize"
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                {formatDate(item.updatedAt)}
              </TableCell>
              <TableCell className="w-12 py-6 pr-6 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <AdminLink
                        href={`/coderso/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(item.id)}`}
                        className="w-full"
                      >
                        <SquarePen className="h-4 w-4" />
                        Edit record
                      </AdminLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <AdminLink
                        href={`/coderso/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(item.id)}`}
                        className="w-full"
                      >
                        <Pencil className="h-4 w-4" />
                        Classic editor
                      </AdminLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomScreenEntriesPage() {
  const { path, navigate } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const initialScreen = useMemo(
    () => (screenId ? getCachedCustomScreen(screenId) ?? null : null),
    [screenId]
  );
  const initialContentType = useMemo(
    () =>
      initialScreen
        ? getCachedContentTypes()?.find(
            (item) => item.id === initialScreen.contentTypeId
          ) ?? null
        : null,
    [initialScreen]
  );
  const initialEntries = useMemo(
    () => (initialContentType ? getCachedEntries(initialContentType.slug) ?? [] : []),
    [initialContentType]
  );
  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [entries, setEntries] = useState<EntrySummary[]>(initialEntries);
  const [contentTypeSlug, setContentTypeSlug] = useState<string | null>(
    initialContentType?.slug ?? null
  );
  const [contentTypeName, setContentTypeName] = useState<string | null>(
    initialContentType?.name ?? null
  );
  const [isLoading, setIsLoading] = useState(() => !(initialScreen && initialContentType));
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!screenId) return;
      setIsLoading(true);
      try {
        const nextScreen = await getCustomScreenCached(screenId, { force });
        if (!nextScreen) {
          setError("Custom screen not found.");
          setEntries([]);
          return;
        }

        const contentTypes = await listContentTypesCached({ force: true });
        const contentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!contentType) {
          setScreen(nextScreen);
          setContentTypeSlug(null);
          setContentTypeName(null);
          setEntries([]);
          setError("Content type not found.");
          return;
        }

        const nextEntries = await listEntriesCached(contentType.slug, { force: true });
        setScreen(nextScreen);
        setContentTypeSlug(contentType.slug);
        setContentTypeName(contentType.name);
        setEntries(nextEntries);
        setError(null);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load custom screen records.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [screenId]
  );

  useEffect(() => {
    if (!screenId) return;
    const cachedScreen = getCachedCustomScreen(screenId);
    const cachedTypes = getCachedContentTypes();
    if (cachedScreen) {
      setScreen(cachedScreen);
      const cachedType =
        cachedTypes?.find((item) => item.id === cachedScreen.contentTypeId) ?? null;
      if (cachedType) {
        setContentTypeSlug(cachedType.slug);
        setContentTypeName(cachedType.name);
        const cachedEntries = getCachedEntries(cachedType.slug);
        if (cachedEntries) {
          setEntries(cachedEntries);
          setIsLoading(false);
        }
      }
    }
    refresh(true).catch(() => undefined);
  }, [refresh, screenId]);

  useEffect(() => {
    if (!screenId) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (contentTypeSlug && event.key === cacheKeys.entriesList(contentTypeSlug))
      ) {
        refresh(true).catch(() => undefined);
      }
    });
  }, [contentTypeSlug, refresh, screenId]);

  const handleDelete = async (entryId: string) => {
    if (!contentTypeSlug) return;
    try {
      await deleteEntry(contentTypeSlug, entryId);
      await refresh(true);
      setActionError(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setActionError(err.message);
      } else {
        setActionError("Failed to delete record.");
      }
    }
  };

  const handleCreated = (
    entry: { id: string },
    _: string,
    openAfterCreate: boolean
  ) => {
    if (!screenId) return;
    if (openAfterCreate) {
      navigate(
        `/coderso/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(entry.id)}`
      );
      return;
    }
    refresh(true).catch(() => undefined);
  };

  const baseHref = screenId
    ? `/coderso/custom-screens/${encodeURIComponent(screenId)}`
    : "/coderso/custom-screens";

  return (
    <AdminShell
      activeHref="/admin/coderso/custom-screens"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span>Screens</span>
          {screen?.name ? (
            <>
              <span>/</span>
              <span>{screen.name}</span>
            </>
          ) : null}
          <span>/</span>
          <span className="text-foreground">Records</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title={screen?.name ? `${screen.name} Records` : "Custom Screen Records"}
          description={
            contentTypeName
              ? `Manage ${contentTypeName} entries through the custom screen workflow.`
              : "Load the bound content type to start working with records."
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => navigate(baseHref)}>
                Open builder
              </Button>
              <Button
                className="gap-2"
                disabled={!contentTypeSlug}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New record
              </Button>
            </div>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load records</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Record action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
        {screen && screen.bindings.length === 0 ? (
          <Alert>
            <AlertTitle>No field bindings yet</AlertTitle>
            <AlertDescription>
              This screen can already open records, but the dedicated editor becomes useful
              after mapping widget props to content fields in the builder.
            </AlertDescription>
          </Alert>
        ) : null}

        <CustomScreenEntriesTable
          screenId={screen?.id ?? ""}
          items={entries}
          typeSlug={contentTypeSlug ?? ""}
          onDelete={handleDelete}
          emptyMessage={isLoading ? "Loading records..." : undefined}
        />
      </div>

      <EntryCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={
          contentTypeSlug && contentTypeName && screen?.contentTypeId
            ? [
                {
                  id: screen.contentTypeId,
                  slug: contentTypeSlug,
                  name: contentTypeName,
                },
              ]
            : []
        }
        defaultTypeSlug={contentTypeSlug}
        onCreated={handleCreated}
      />
    </AdminShell>
  );
}
