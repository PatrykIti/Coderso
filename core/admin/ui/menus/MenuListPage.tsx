import {
  Columns2,
  Filter,
  List,
  MapPin,
  MoreHorizontal,
  PanelsTopLeft,
  Pencil,
  PenLine,
  Plus,
  Search,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createMenu,
  deleteMenu,
  getCachedMenus,
  listMenusCached,
  moveMenuToDraft,
  publishMenu,
  type MenuSummary,
} from "@/services/menusClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { MenuCreateDialog } from "@/ui/menus/MenuCreateDialog";
import { SiteShellDialog } from "@/ui/menus/SiteShellDialog";
import { AdminLink } from "@/ui/shared/AdminLink";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Token-driven Badge variants (not raw emerald/slate) so :root.dark recolors —
// matches the shared StatusBadge mapping (published→success, draft→secondary).
const statusVariant: Record<MenuSummary["status"], "success" | "secondary"> = {
  published: "success",
  draft: "secondary",
};

const statusLabels: Record<MenuSummary["status"], string> = {
  published: "Published",
  draft: "Draft",
};

export type MenuStatusFilter = "all" | MenuSummary["status"];
export type MenuLocationFilter = "all" | "unassigned" | `location:${string}`;
type MenuBulkActionValue = "publish" | "unpublish" | "delete";

const menuListToasts = createListActionToastAdapter({
  labels: { singular: "menu", plural: "menus" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    unpublish: {
      pastTense: "moved to draft",
      failureVerb: "move",
      errorFallback: "Failed to move menu to draft.",
      bulkPartialMessage: ({ succeededCount, failedCount, labels }) =>
        `Moved ${succeededCount} ${
          succeededCount === 1 ? labels.singular : labels.plural
        } to draft; failed ${failedCount}.`,
      bulkFailureMessage: ({ failedCount, labels }) =>
        `Failed to move ${failedCount} ${
          failedCount === 1 ? labels.singular : labels.plural
        } to draft.`,
    },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

export function resolveMenuListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}

export function filterMenus(
  menus: MenuSummary[],
  query: string,
  status: MenuStatusFilter,
  location: MenuLocationFilter
) {
  const normalized = query.trim().toLowerCase();
  return menus.filter((menu) => {
    const locationLabel = menu.location ?? "Not assigned";
    const matchesQuery =
      !normalized ||
      menu.name.toLowerCase().includes(normalized) ||
      locationLabel.toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || menu.status === status;
    const matchesLocation =
      location === "all" ||
      (location === "unassigned" && !menu.location) ||
      (location.startsWith("location:") && menu.location === location.slice("location:".length));
    return matchesQuery && matchesStatus && matchesLocation;
  });
}

type MenuCardCallbacks = {
  onToggleMenu: (id: string) => void;
  onEdit: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
};

type MenuCardGridProps = MenuCardCallbacks & {
  items: MenuSummary[];
  emptyMessage?: string;
  selectedIds: string[];
};

function MenuRowActions({
  status,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  status: MenuSummary["status"];
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open menu actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={status === "published"} onClick={onPublish}>
          <Upload className="h-4 w-4" />
          Publish
        </DropdownMenuItem>
        <DropdownMenuItem disabled={status !== "published"} onClick={onUnpublish}>
          <Upload className="h-4 w-4 rotate-180" />
          Move to Draft
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuCard({
  item,
  isSelected,
  onToggleMenu,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
}: { item: MenuSummary; isSelected: boolean } & MenuCardCallbacks) {
  // Route shapes are unchanged: the editor + design hrefs stay `/menus/:id`
  // and `/menus/:id/design`. AdminLink resolves the canonical admin prefix.
  const href = `/menus/${encodeURIComponent(item.id)}`;
  const designHref = `/menus/${encodeURIComponent(item.id)}/design`;
  return (
    <Card className="flex flex-col gap-0 rounded-2xl p-5 transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Checkbox
            aria-label={`Select ${item.name}`}
            checked={isSelected}
            onCheckedChange={() => onToggleMenu(item.id)}
          />
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <List className="size-5" />
          </span>
          <div className="min-w-0">
            <AdminLink
              href={href}
              prefetch
              className="block truncate font-display text-[15px] font-semibold text-foreground underline-offset-4 transition hover:underline focus-visible:underline"
              aria-label={`Open menu editor for ${item.name}`}
            >
              {item.name}
            </AdminLink>
            <div className="text-xs text-muted-foreground">
              {item.publishedAt
                ? `Updated ${formatDate(item.publishedAt)}`
                : `Created ${formatDate(item.createdAt)}`}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="soft">{item.location ?? "Not assigned"}</Badge>
          <Badge variant={statusVariant[item.status]}>{statusLabels[item.status]}</Badge>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <AdminLink href={href} prefetch className="flex-1">
          <Button variant="soft" size="sm" className="w-full gap-1.5">
            <PenLine className="size-4" /> Edit
          </Button>
        </AdminLink>
        <AdminLink href={designHref} prefetch className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Workflow className="size-4" /> Design
          </Button>
        </AdminLink>
        <MenuRowActions
          status={item.status}
          onEdit={() => onEdit(item.id)}
          onPublish={() => onPublish(item.id)}
          onUnpublish={() => onUnpublish(item.id)}
          onDelete={() => onDelete(item.id)}
        />
      </div>
    </Card>
  );
}

function MenuCardGrid({ items, emptyMessage, selectedIds, ...callbacks }: MenuCardGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card/60 p-10 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No menus yet. Create your first menu to get started."}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <MenuCard
          key={item.id}
          item={item}
          isSelected={selectedIds.includes(item.id)}
          {...callbacks}
        />
      ))}
    </div>
  );
}

function MenuFilters({
  search,
  status,
  location,
  locationOptions,
  onSearchChange,
  onStatusChange,
  onLocationChange,
}: {
  search: string;
  status: MenuStatusFilter;
  location: MenuLocationFilter;
  locationOptions: Array<{ value: MenuLocationFilter; label: string }>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: MenuStatusFilter) => void;
  onLocationChange: (value: MenuLocationFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search menus by name or location..."
          aria-label="Search menus by name or location"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(value) => onStatusChange(value as MenuStatusFilter)}>
          <SelectTrigger className="h-8 w-full sm:w-[140px]">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={location}
          onValueChange={(value) => onLocationChange(value as MenuLocationFilter)}
        >
          <SelectTrigger className="h-8 w-full sm:w-[180px]">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {locationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Customize menu columns">
          <Columns2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MenuBulkActionsBar({
  selectedCount,
  action,
  onActionChange,
  onApply,
  onClear,
  isApplying,
}: {
  selectedCount: number;
  action: MenuBulkActionValue | "";
  onActionChange: (value: MenuBulkActionValue | "") => void;
  onApply: () => void;
  onClear: () => void;
  isApplying: boolean;
}) {
  return (
    <div
      data-menu-bulk-actions="inline"
      className="flex min-w-0 flex-wrap items-center justify-end gap-2"
    >
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
          Selected {selectedCount}
        </Badge>
        <span className="sr-only">Apply a bulk action to the selected menus.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={action}
          onValueChange={(value) => onActionChange(value as MenuBulkActionValue)}
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Bulk actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publish">
              <Upload className="h-4 w-4" />
              Publish
            </SelectItem>
            <SelectItem value="unpublish">Move to Draft</SelectItem>
            <SelectItem value="delete" className="text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onApply} disabled={!action || isApplying}>
          {isApplying ? "Applying..." : "Apply"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          Clear
        </Button>
      </div>
    </div>
  );
}

export function MenuListPage() {
  const { navigate } = useAdminRouter();
  const initialCached = useMemo(() => getCachedMenus(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<MenuSummary[]>(() => initialCached ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [siteShellOpen, setSiteShellOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<MenuLocationFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<MenuBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      setItems(await listMenusCached({ force: true }));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load menus.");
      }
    }
  }, []);

  useEffect(() => {
    const mountOptions = resolveMenuListMountRefreshOptions(hasInitialCache);
    let active = true;
    listMenusCached({ force: mountOptions.force })
      .then((next) => {
        if (!active) return;
        setItems(next);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load menus.");
        }
      })
      .finally(() => {
        if (active && !mountOptions.background) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.menusList) return;
      void refresh();
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
    menuListToasts.success("create", { targetLabel: created.name });
  };

  const locationOptions = useMemo(() => {
    const locations = Array.from(
      new Set(items.map((item) => item.location).filter((value): value is string => Boolean(value)))
    ).sort((a, b) => a.localeCompare(b));
    return [
      { value: "all" as const, label: "All locations" },
      { value: "unassigned" as const, label: "Not assigned" },
      ...locations.map((value) => ({
        value: `location:${value}` as const,
        label: value,
      })),
    ];
  }, [items]);

  const filteredItems = useMemo(
    () => filterMenus(items, searchQuery, statusFilter, locationFilter),
    [items, searchQuery, statusFilter, locationFilter]
  );
  const pagination = useListPagination(filteredItems, {
    resetKey: JSON.stringify({
      searchQuery,
      statusFilter,
      locationFilter,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((item) => item.id),
    [pagination.visibleRows]
  );
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const handleEdit = (id: string) => {
    navigate(`/menus/${encodeURIComponent(id)}`);
  };

  const handlePublish = async (id: string) => {
    setError(null);
    try {
      await publishMenu(id);
      await refresh();
      menuListToasts.success("publish");
    } catch (err) {
      setError(menuListToasts.error("publish", err));
    }
  };

  const handleUnpublish = async (id: string) => {
    setError(null);
    try {
      await moveMenuToDraft(id);
      await refresh();
      menuListToasts.success("unpublish");
    } catch (err) {
      setError(menuListToasts.error("unpublish", err));
    }
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteMenu(id);
      await refresh();
      menuListToasts.success("delete");
      setPendingDeleteId(null);
    } catch (err) {
      setError(menuListToasts.error("delete", err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleToggleMenu = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((menuId) => menuId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkAction("");
  };

  const runBulkAction = async (action: MenuBulkActionValue, ids: string[]) => {
    if (ids.length === 0) return;
    setError(null);
    setIsBulkWorking(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "publish") return publishMenu(id);
          if (action === "unpublish") return moveMenuToDraft(id);
          return deleteMenu(id);
        })
      );
      await refresh();
      const summary = menuListToasts.summarizeBulkAction(action, ids, results);
      menuListToasts.emitBulk(summary);
      handleClearSelection();

      if (!summary.ok) {
        setError(summary.inlineMessage);
      }
    } finally {
      setIsBulkWorking(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || visibleSelectedIds.length === 0) return;

    if (bulkAction === "delete") {
      setPendingBulkDeleteIds(visibleSelectedIds);
      return;
    }

    void runBulkAction(bulkAction, visibleSelectedIds);
  };

  return (
    <AdminShell activeHref="/admin/menus" breadcrumbs={["Content", "Menus"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Menus"
          description="Choose a menu before editing its links, hierarchy, and visibility rules."
          actions={
            <>
              {selectedCount > 0 ? (
                <MenuBulkActionsBar
                  selectedCount={selectedCount}
                  action={bulkAction}
                  onActionChange={setBulkAction}
                  onApply={handleBulkApply}
                  onClear={handleClearSelection}
                  isApplying={isBulkWorking}
                />
              ) : null}
              <Button variant="outline" className="gap-2" onClick={() => setSiteShellOpen(true)}>
                <PanelsTopLeft className="h-4 w-4" />
                Site shell
              </Button>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load menus</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <MenuFilters
          search={searchQuery}
          status={statusFilter}
          location={locationFilter}
          locationOptions={locationOptions}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onLocationChange={setLocationFilter}
        />

        {isLoading ? (
          <div className="rounded-2xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-soft">
            Loading menus...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pagination.visibleRows.length > 0 ? (
              <div className="flex items-center gap-2 px-1">
                {/* Select-all relocated from the old table header so the bulk
                    bar keeps working after the card-grid restyle. */}
                <Checkbox
                  aria-label="Select all menus"
                  checked={isIndeterminate ? "indeterminate" : isAllSelected}
                  onCheckedChange={() => handleToggleAll()}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
                </span>
              </div>
            ) : null}
            <MenuCardGrid
              items={pagination.visibleRows}
              emptyMessage={items.length > 0 ? "No menus match your current filters." : undefined}
              selectedIds={visibleSelectedIds}
              onToggleMenu={handleToggleMenu}
              onEdit={handleEdit}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
            />
          </div>
        )}
        <ListPaginationFooter resourceLabel="menus" pagination={pagination} isLoading={isLoading} />
      </div>

      <SiteShellDialog open={siteShellOpen} onOpenChange={setSiteShellOpen} />
      <MenuCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        onCreateError={(err) => {
          menuListToasts.error("create", err);
        }}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete menu?"
        description="Delete this menu? This cannot be undone."
        confirmLabel="Delete menu"
        confirmingLabel="Deleting..."
        isConfirming={deletingId === pendingDeleteId}
        onConfirm={() => {
          if (pendingDeleteId) return runDelete(pendingDeleteId);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected menus?"
        description={`Delete ${pendingBulkDeleteIds.length} menu${pendingBulkDeleteIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
