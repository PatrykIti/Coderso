import { Layers, PlusCircle, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import {
  createMenu,
  getCachedMenus,
  listMenusCached,
  type MenuSummary,
} from "@/services/menusClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { MenuCreateDialog } from "@/ui/menus/MenuCreateDialog";
import { AdminLink } from "@/ui/shared/AdminLink";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCacheRefreshBackground } from "@/utils/cacheRefresh";

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

export function resolveMenuListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}

type MenuListTableProps = {
  items: MenuSummary[];
  emptyMessage?: string;
};

function MenuListTable({ items, emptyMessage }: MenuListTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="min-w-[18rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Menu
            </TableHead>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Location
            </TableHead>
            <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
              Created
            </TableHead>
            <TableHead className="w-36 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                {emptyMessage ?? "No menus yet."}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const href = `/menus/${encodeURIComponent(item.id)}`;
            return (
              <TableRow key={item.id}>
                <TableCell className="py-5 pl-6">
                  <div className="flex flex-col gap-1">
                    <AdminLink
                      href={href}
                      prefetch
                      className="break-words text-left font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
                      aria-label={`Open menu editor for ${item.name}`}
                    >
                      {item.name}
                    </AdminLink>
                    <span className="text-xs text-muted-foreground">
                      Choose this menu to edit its structure and item details.
                    </span>
                    <span className="text-xs text-muted-foreground md:hidden">
                      Created {formatDate(item.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-5">
                  <span className="text-sm text-muted-foreground">
                    {item.location ?? "Not assigned"}
                  </span>
                </TableCell>
                <TableCell className="hidden px-4 py-5 text-sm text-muted-foreground md:table-cell">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell className="py-5 pr-6 text-right">
                  <Button asChild variant="outline" size="sm">
                    <AdminLink href={href} prefetch>
                      Open editor
                    </AdminLink>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function MenuListPage() {
  const initialCached = useMemo(() => getCachedMenus(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<MenuSummary[]>(() => initialCached ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef(hasInitialCache);
  const refresh = useCallback(async (options?: { force?: boolean; background?: boolean }) => {
    const force = options?.force ?? false;
    const background = resolveCacheRefreshBackground({
      explicitBackground: options?.background,
      hasHydrated: hasHydratedRef.current,
    });
    if (!background) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const next = await listMenusCached({ force });
      setItems(next);
      hasHydratedRef.current = true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load menus.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const mountOptions = resolveMenuListMountRefreshOptions(hasInitialCache);
    refresh(mountOptions).catch(() => undefined);
  }, [hasInitialCache, refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.menusList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [refresh]);

  const handleCreate = async (payload: { name: string; location?: string }) => {
    setError(null);
    const created = await createMenu({
      name: payload.name,
      location: payload.location ?? null,
    });
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== created.id);
      return [created, ...next];
    });
  };

  const hasMenus = items.length > 0;

  return (
    <AdminShell
      activeHref="/admin/menus"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Menus</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Menus"
          description="Choose a menu before editing its links, hierarchy, and visibility rules."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => refresh({ force: true, background: false })}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                New Menu
              </Button>
            </div>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load menus</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !hasMenus ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                Create your first menu, then open it from this list to edit its
                structure.
              </div>
              <Button onClick={() => setCreateOpen(true)}>Create Menu</Button>
            </div>
          </div>
        ) : (
          <MenuListTable
            items={items}
            emptyMessage={isLoading ? "Loading menus..." : undefined}
          />
        )}
      </div>

      <MenuCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </AdminShell>
  );
}
