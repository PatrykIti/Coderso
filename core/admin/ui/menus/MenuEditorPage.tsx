import {
  Layers,
  PlusCircle,
  RefreshCcw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import type {
  MenuItemNode,
  MenuItemRecord,
  MenuSummary,
} from "@/services/menusClient";
import {
  createMenu,
  getCachedMenuDetail,
  getCachedMenus,
  getMenuWithItemsCached,
  listMenusCached,
  replaceMenuItems,
  updateMenu,
} from "@/services/menusClient";
import {
  getCachedPages,
  listPagesCached,
  type PageSummary,
} from "@/services/pagesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { MenuCreateDialog } from "@/ui/menus/MenuCreateDialog";
import {
  MenuItemDrawer,
  type MenuItemDraft,
} from "@/ui/menus/MenuItemDrawer";
import { MenuTree, type MenuDropIntent } from "@/ui/menus/MenuTree";
import type { MenuItemDisplay } from "@/ui/menus/types";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCacheRefreshBackground } from "@/utils/cacheRefresh";
import { normalizeMenuItemSettings } from "../../../services/menus/menuItemSettings";

const createTempId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `menu_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const flattenMenuItems = (items: MenuItemNode[]) => {
  const result: MenuItemRecord[] = [];
  const walk = (nodes: MenuItemNode[]) => {
    nodes.forEach((node) => {
      result.push({
        id: node.id,
        label: node.label,
        href: node.href ?? null,
        pageId: node.pageId ?? null,
        parentId: node.parentId ?? null,
        orderIndex: node.orderIndex,
        settings: normalizeMenuItemSettings(node.settings),
      });
      if (node.children?.length) walk(node.children);
    });
  };
  walk(items);
  return result;
};

const buildDisplayTree = (
  items: MenuItemRecord[],
  pageMap: Map<string, PageSummary>
): MenuItemDisplay[] => {
  const nodes = new Map<string, MenuItemDisplay>();
  for (const item of items) {
    const page = item.pageId ? pageMap.get(item.pageId) : null;
    const status =
      !item.href && !item.pageId
        ? "error"
        : page === undefined && item.pageId
          ? "error"
          : "ok";
    nodes.set(item.id, {
      ...item,
      pageTitle: page?.title ?? null,
      status,
      children: [],
    });
  }

  const roots: MenuItemDisplay[] = [];
  for (const item of items) {
    const node = nodes.get(item.id)!;
    if (item.parentId && nodes.has(item.parentId)) {
      nodes.get(item.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: MenuItemDisplay[]) => {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    list.forEach((node) => {
      if (node.children?.length) sortNodes(node.children);
    });
  };

  sortNodes(roots);
  return roots;
};

const buildParentOptions = (items: MenuItemDisplay[]) => {
  const options: Array<{ id: string; label: string }> = [];
  const walk = (nodes: MenuItemDisplay[], depth = 0) => {
    nodes.forEach((node) => {
      options.push({
        id: node.id,
        label: `${"— ".repeat(depth)}${node.label}`,
      });
      if (node.children?.length) walk(node.children, depth + 1);
    });
  };
  walk(items);
  return options;
};

const collectDescendants = (items: MenuItemDisplay[], id: string) => {
  const map = new Map<string, MenuItemDisplay>();
  const walk = (nodes: MenuItemDisplay[]) => {
    nodes.forEach((node) => {
      map.set(node.id, node);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(items);

  const descendants = new Set<string>();
  const visit = (nodeId: string) => {
    const node = map.get(nodeId);
    if (!node?.children?.length) return;
    node.children.forEach((child) => {
      descendants.add(child.id);
      visit(child.id);
    });
  };
  visit(id);
  return descendants;
};

const collectRecordDescendants = (items: MenuItemRecord[], id: string) => {
  const childrenMap = new Map<string | null, MenuItemRecord[]>();
  items.forEach((item) => {
    const key = item.parentId ?? null;
    const existing = childrenMap.get(key) ?? [];
    existing.push(item);
    childrenMap.set(key, existing);
  });

  const descendants = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const children = childrenMap.get(current) ?? [];
    for (const child of children) {
      if (descendants.has(child.id)) continue;
      descendants.add(child.id);
      stack.push(child.id);
    }
  }
  return descendants;
};

export const moveMenuItems = (
  items: MenuItemRecord[],
  dragId: string,
  targetId: string,
  intent: MenuDropIntent
) => {
  if (dragId === targetId) return items;
  const dragItem = items.find((item) => item.id === dragId);
  const targetItem = items.find((item) => item.id === targetId);
  if (!dragItem || !targetItem) return items;

  const nextParentId = intent === "child" ? targetItem.id : targetItem.parentId ?? null;
  if (nextParentId === dragId) return items;

  const descendants = collectRecordDescendants(items, dragId);
  if (nextParentId && descendants.has(nextParentId)) return items;

  const oldParentId = dragItem.parentId ?? null;
  const buildSiblings = (parentId: string | null) =>
    items
      .filter((item) => (item.parentId ?? null) === parentId && item.id !== dragId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const oldSiblings = buildSiblings(oldParentId);
  const newSiblings = oldParentId === nextParentId ? oldSiblings : buildSiblings(nextParentId);

  let insertIndex = newSiblings.length;
  if (intent === "sibling") {
    const targetIndex = newSiblings.findIndex((item) => item.id === targetId);
    insertIndex = targetIndex === -1 ? newSiblings.length : targetIndex;
  }

  const moved = { ...dragItem, parentId: nextParentId };
  const nextSiblings = [...newSiblings];
  nextSiblings.splice(insertIndex, 0, moved);

  const updates = new Map<string, MenuItemRecord>();
  oldSiblings.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });
  nextSiblings.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });

  return items.map((item) => updates.get(item.id) ?? item);
};

export const moveMenuItemToRoot = (
  items: MenuItemRecord[],
  dragId: string,
  position: "start" | "end" = "end"
) => {
  const dragItem = items.find((item) => item.id === dragId);
  if (!dragItem) return items;

  const oldParentId = dragItem.parentId ?? null;
  const buildSiblings = (parentId: string | null) =>
    items
      .filter((item) => (item.parentId ?? null) === parentId && item.id !== dragId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const oldSiblings = buildSiblings(oldParentId);
  const rootSiblings = buildSiblings(null);

  const moved = { ...dragItem, parentId: null };
  const nextRoot =
    position === "start" ? [moved, ...rootSiblings] : [...rootSiblings, moved];

  const updates = new Map<string, MenuItemRecord>();
  oldSiblings.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });
  nextRoot.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });

  return items.map((item) => updates.get(item.id) ?? item);
};

export const validateMenuItemsPayload = (items: MenuItemRecord[]) => {
  for (const entry of items) {
    if (!entry.label.trim()) {
      return {
        ok: false,
        message: "Each menu item must have a label.",
        itemId: entry.id,
      } as const;
    }
    const hasHref = Boolean(entry.href && entry.href.trim().length > 0);
    const hasPage = Boolean(entry.pageId);
    if ((hasHref && hasPage) || (!hasHref && !hasPage)) {
      return {
        ok: false,
        message: "Each menu item must link to a page or a custom URL.",
        itemId: entry.id,
      } as const;
    }
  }
  return { ok: true } as const;
};

export function MenuEditorPage() {
  const initialMenus = useMemo(() => getCachedMenus(), []);
  const initialPages = useMemo(() => getCachedPages(), []);
  const [menus, setMenus] = useState<MenuSummary[]>(() => initialMenus ?? []);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(
    () => initialMenus?.[0]?.id ?? null
  );
  const [menuName, setMenuName] = useState("");
  const [menuLocation, setMenuLocation] = useState("");
  const [originalMenu, setOriginalMenu] = useState<MenuSummary | null>(null);
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [originalItems, setOriginalItems] = useState<MenuItemRecord[]>([]);
  const [pages, setPages] = useState<PageSummary[]>(() => initialPages ?? []);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const hasHydratedRef = useRef(false);
  const skipNextLoadRef = useRef<string | null>(null);
  const activeMenuIdRef = useRef<string | null>(activeMenuId);
  const activeItemIdRef = useRef<string | null>(activeItemId);
  const [isLoading, setIsLoading] = useState(() => !initialMenus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageMap = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);
  const displayTree = useMemo(() => buildDisplayTree(items, pageMap), [items, pageMap]);
  const parentOptions = useMemo(() => buildParentOptions(displayTree), [displayTree]);

  useEffect(() => {
    activeMenuIdRef.current = activeMenuId;
  }, [activeMenuId]);

  useEffect(() => {
    activeItemIdRef.current = activeItemId;
  }, [activeItemId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const applyMenuPayload = useCallback(
    (
      payload: { menu: MenuSummary; items: MenuItemNode[] },
      options?: { preserveItemId?: string | null }
    ) => {
      setOriginalMenu(payload.menu);
      setMenuName(payload.menu.name);
      setMenuLocation(payload.menu.location ?? "");
      const flattened = flattenMenuItems(payload.items);
      setItems(flattened);
      setOriginalItems(flattened);
      const preserveId = options?.preserveItemId ?? null;
      const nextActiveId =
        preserveId && flattened.some((item) => item.id === preserveId)
          ? preserveId
          : null;
      setActiveItemId(nextActiveId);
      setIsDirty(false);
      setRemoteUpdatePending(false);
    },
    []
  );

  const loadMenu = useCallback(
    async (
      menuId: string,
      options?: { allowUnsaved?: boolean; setLoading?: boolean; preserveItemId?: string | null }
    ) => {
      const shouldSetLoading = options?.setLoading !== false;
      if (shouldSetLoading) setIsLoading(true);
      setError(null);
      try {
        const payload = await getMenuWithItemsCached(menuId, { force: true });
        if (!payload) return;
        if (!options?.allowUnsaved && hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyMenuPayload(payload, { preserveItemId: options?.preserveItemId ?? null });
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load menu items.");
        }
      } finally {
        if (shouldSetLoading) setIsLoading(false);
      }
    },
    [applyMenuPayload]
  );

  const refreshMenus = useCallback(
    async (options?: { force?: boolean; background?: boolean; reloadActive?: boolean }) => {
      const force = options?.force ?? false;
      const background = resolveCacheRefreshBackground({
        explicitBackground: options?.background,
        hasHydrated: hasHydratedRef.current,
      });
      const reloadActive = options?.reloadActive ?? true;
      const currentActiveId = activeMenuIdRef.current;
      if (!background) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [menuList, pageList] = await Promise.all([
          listMenusCached({ force }),
          listPagesCached({ force }),
        ]);
        setMenus(menuList);
        setPages(pageList);
        const nextActiveId =
          currentActiveId && menuList.some((menu) => menu.id === currentActiveId)
            ? currentActiveId
            : menuList[0]?.id ?? null;
        setActiveMenuId(nextActiveId);
        hasHydratedRef.current = true;

        const shouldLoadMenu = nextActiveId && (reloadActive || nextActiveId !== currentActiveId);
        if (shouldLoadMenu && nextActiveId) {
          const preserveItemId = nextActiveId === currentActiveId ? activeItemIdRef.current : null;
          if (nextActiveId !== currentActiveId) {
            skipNextLoadRef.current = nextActiveId;
          }
          await loadMenu(nextActiveId, { setLoading: false, preserveItemId });
        }
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
    },
    [loadMenu]
  );

  useEffect(() => {
    refreshMenus({ force: true, reloadActive: true }).catch(() => undefined);
  }, [refreshMenus]);

  useEffect(() => {
    if (!activeMenuId) return;
    if (skipNextLoadRef.current === activeMenuId) {
      skipNextLoadRef.current = null;
      return;
    }
    const cached = getCachedMenuDetail(activeMenuId);
    if (cached) {
      applyMenuPayload(cached);
      setIsLoading(false);
    }
    loadMenu(activeMenuId, { setLoading: !cached, allowUnsaved: true }).catch(() => undefined);
  }, [activeMenuId, applyMenuPayload, loadMenu]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.menusList) return;
      refreshMenus({ force: true, background: true, reloadActive: false }).catch(() => undefined);
    });
  }, [refreshMenus]);

  useEffect(() => {
    if (!activeMenuId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.menuDetail(activeMenuId)) return;
      loadMenu(activeMenuId, { setLoading: false, preserveItemId: activeItemId }).catch(() => undefined);
    });
  }, [activeMenuId, activeItemId, loadMenu]);

  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    const record = items.find((item) => item.id === activeItemId);
    if (!record) return null;
    return {
      ...record,
      linkType: record.pageId ? "page" : "url",
      pageId: record.pageId ?? "",
      href: record.href ?? "",
    } satisfies MenuItemDraft;
  }, [activeItemId, items]);

  const disabledParentIds = useMemo(() => {
    if (!activeItemId) return new Set<string>();
    const descendants = collectDescendants(displayTree, activeItemId);
    descendants.add(activeItemId);
    return descendants;
  }, [activeItemId, displayTree]);

  const hasMetaChanges = useMemo(() => {
    if (!originalMenu) return false;
    return (
      menuName.trim() !== originalMenu.name ||
      (menuLocation.trim() || null) !== (originalMenu.location ?? null)
    );
  }, [menuName, menuLocation, originalMenu]);

  const canSave = hasMetaChanges || isDirty;

  useEffect(() => {
    hasUnsavedChangesRef.current = canSave;
  }, [canSave]);

  const handleCreateMenu = async (payload: { name: string; location?: string }) => {
    const created = await createMenu({
      name: payload.name,
      location: payload.location ?? null,
    });
    setMenus((prev) => [...prev, created]);
    setActiveMenuId(created.id);
  };

  const handleSelectItem = (item: MenuItemDisplay) => {
    setActiveItemId(item.id);
    if (!isLargeScreen) {
      setDetailsOpen(true);
    }
  };

  const handleAddItem = () => {
    if (!activeMenuId) return;
    const defaultLinkType = pages.length > 0 ? "page" : "url";
    const defaultPageId = pages[0]?.id ?? "";
    const newItem: MenuItemRecord = {
      id: createTempId(),
      label: "New item",
      href: defaultLinkType === "url" ? "" : null,
      pageId: defaultLinkType === "page" ? defaultPageId : null,
      parentId: null,
      orderIndex: items.filter((item) => item.parentId === null).length,
      settings: { visibility: "all" },
    };
    setItems((prev) => [...prev, newItem]);
    setActiveItemId(newItem.id);
    setIsDirty(true);
    if (!isLargeScreen) {
      setDetailsOpen(true);
    }
  };

  const handleEditItem = (item: MenuItemDisplay) => {
    setActiveItemId(item.id);
    if (!isLargeScreen) {
      setDetailsOpen(true);
    }
  };

  const handleDeleteItem = (item: MenuItemRecord) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this menu item and its children?");
      if (!confirmed) return;
    }
    const idsToRemove = new Set<string>();
    const tree = buildDisplayTree(items, pageMap);
    idsToRemove.add(item.id);
    collectDescendants(tree, item.id).forEach((id) => idsToRemove.add(id));
    setItems((prev) => prev.filter((entry) => !idsToRemove.has(entry.id)));
    if (activeItemId && idsToRemove.has(activeItemId)) {
      setActiveItemId(null);
      setDetailsOpen(false);
    }
    setIsDirty(true);
  };

  const handleSaveItem = (draft: MenuItemDraft) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.id === draft.id);
      const nextParent = draft.parentId ?? null;
      const shouldReindex = existing && existing.parentId !== nextParent;
      const nextOrderIndex = shouldReindex
        ? prev.filter((entry) => entry.parentId === nextParent && entry.id !== draft.id).length
        : existing?.orderIndex ?? 0;

      return prev.map((entry) =>
        entry.id === draft.id
          ? {
              ...entry,
              label: draft.label,
              href: draft.linkType === "url" ? draft.href.trim() || null : null,
              pageId: draft.linkType === "page" ? draft.pageId || null : null,
              parentId: nextParent,
              orderIndex: nextOrderIndex,
              settings: normalizeMenuItemSettings(draft.settings),
            }
          : entry
      );
    });
    setIsDirty(true);
  };

  const handleMove = (dragId: string, targetId: string, intent: MenuDropIntent) => {
    setItems((prev) => {
      const next = moveMenuItems(prev, dragId, targetId, intent);
      if (next !== prev) {
        setIsDirty(true);
      }
      return next;
    });
  };

  const handleMoveToRoot = (dragId: string, position: "start" | "end") => {
    setItems((prev) => {
      const next = moveMenuItemToRoot(prev, dragId, position);
      if (next !== prev) {
        setIsDirty(true);
      }
      return next;
    });
  };

  const handleDiscard = () => {
    if (originalMenu) {
      setMenuName(originalMenu.name);
      setMenuLocation(originalMenu.location ?? "");
    }
    setItems(originalItems);
    setActiveItemId(null);
    setIsDirty(false);
    setRemoteUpdatePending(false);
  };

  const handleSave = async () => {
    if (!activeMenuId) return;
    setError(null);

    const validation = validateMenuItemsPayload(items);
    if (!validation.ok) {
      setError(validation.message);
      setActiveItemId(validation.itemId);
      if (!isLargeScreen) {
        setDetailsOpen(true);
      }
      return;
    }

    setIsSaving(true);
    try {
      if (hasMetaChanges) {
        await updateMenu(activeMenuId, {
          name: menuName.trim() || originalMenu?.name || "Untitled",
          location: menuLocation.trim() || null,
        });
      }
      if (isDirty) {
        const payload = items.map((entry) => {
          const base = {
            id: entry.id,
            label: entry.label.trim(),
            parentId: entry.parentId ?? null,
            orderIndex: entry.orderIndex,
            settings: normalizeMenuItemSettings(entry.settings),
          };
          const href = entry.href?.trim() ?? "";
          const hasPage = Boolean(entry.pageId);
          const hasHref = href.length > 0;
          if (hasPage && !hasHref) {
            return { ...base, pageId: entry.pageId };
          }
          if (hasHref && !hasPage) {
            return { ...base, href };
          }
          if (hasPage && hasHref) {
            return { ...base, pageId: entry.pageId };
          }
          return base;
        });
        await replaceMenuItems(activeMenuId, payload);
      }
      await loadMenu(activeMenuId, { allowUnsaved: true, preserveItemId: activeItemId });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save menu changes.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const rightPanel = activeItem ? (
    <MenuItemDrawer
      item={activeItem}
      pages={pages}
      parentOptions={parentOptions}
      disabledParentIds={disabledParentIds}
      onClose={() => {
        setDetailsOpen(false);
        setActiveItemId(null);
      }}
      onSave={handleSaveItem}
      onDelete={handleDeleteItem}
    />
  ) : null;

  return (
    <SplitShell
      activeHref="/admin/menus"
      rightPanel={isLargeScreen ? rightPanel : undefined}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Menus</span>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-6">
        <PageHeader
          title="Menus"
          description="Build navigation structures and map them to your site."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => refreshMenus({ force: true, reloadActive: true })}>
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

        {menus.length > 0 ? (
          <div className="rounded-xl border bg-card/60 px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant={canSave ? "secondary" : "outline"}>
                {canSave ? "Unsaved changes" : "All changes saved"}
              </Badge>
              <div className="flex flex-wrap items-center gap-2">
                {!isLargeScreen ? (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setDetailsOpen(true)}
                    disabled={!activeItemId}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Details
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={handleDiscard} disabled={!canSave}>
                  Discard
                </Button>
                <Button onClick={handleSave} disabled={!canSave || isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Menu error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {remoteUpdatePending ? (
          <Alert>
            <AlertTitle>Updated in another tab</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>New changes are available. Refresh to load the latest version.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeMenuId) {
                    loadMenu(activeMenuId, { allowUnsaved: true, preserveItemId: activeItemId }).catch(() => undefined);
                  }
                }}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
            Loading menu settings…
          </div>
        ) : null}

        {!isLoading && menus.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                Create your first menu to start arranging navigation links.
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                Create Menu
              </Button>
            </div>
          </div>
        ) : null}

        {!isLoading && menus.length > 0 ? (
          <div className="flex flex-col gap-6">
            <Card className="border-border/60">
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Active menu
                    </label>
                    <Select
                      value={activeMenuId ?? ""}
                      onValueChange={(value) => setActiveMenuId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select menu" />
                      </SelectTrigger>
                      <SelectContent>
                        {menus.map((menu) => (
                          <SelectItem key={menu.id} value={menu.id}>
                            {menu.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Location
                    </label>
                    <Input
                      value={menuLocation}
                      onChange={(event) => setMenuLocation(event.target.value)}
                      placeholder="primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Menu name
                  </label>
                  <Input
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                    placeholder="Main Menu"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Menu Structure</h3>
                    <p className="text-xs text-muted-foreground">
                      Drag up or down to reorder. Drag right to create sub-menus.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                {displayTree.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
                    No items yet. Add your first link.
                  </div>
                ) : (
                  <MenuTree
                    items={displayTree}
                    activeId={activeItemId}
                    onSelect={handleSelectItem}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onMove={handleMove}
                    onMoveToRoot={handleMoveToRoot}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      <Sheet
        open={Boolean(activeItem) && detailsOpen}
        onOpenChange={(open) => setDetailsOpen(open)}
      >
        <SheetContent side="right" className="w-full p-4 sm:max-w-md">
          <SheetTitle className="sr-only">Menu item details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit the selected menu item settings.
          </SheetDescription>
          {rightPanel}
        </SheetContent>
      </Sheet>

      <MenuCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateMenu}
      />
    </SplitShell>
  );
}
