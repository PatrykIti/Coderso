import { Layers, PlusCircle, Save, SlidersHorizontal, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import type {
  MenuItemInput,
  MenuItemNode,
  MenuItemRecord,
  MenuSummary,
  MenuWithItems,
} from "@/services/menusClient";
import {
  getCachedMenuDetail,
  getMenuWithItemsCached,
  replaceMenuItems,
  updateMenu,
} from "@/services/menusClient";
import { getCachedPages, listPagesCached, type PageSummary } from "@/services/pagesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { MenuItemDeleteDialog } from "@/ui/menus/MenuItemDeleteDialog";
import { MenuItemDrawer, type MenuItemDraft } from "@/ui/menus/MenuItemDrawer";
import { resolveMenuId } from "@/ui/menus/routeParams";
import { MenuTree } from "@/ui/menus/MenuTree";
import type { MenuDropIntent } from "@/ui/menus/menuDnD";
import type { MenuItemDisplay } from "@/ui/menus/types";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { normalizeMenuItemSettings } from "../../../services/menus/menuItemSettings";

const createTempId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `menu_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const menuEditorStatusBadgeClassName = (status: MenuSummary["status"]) =>
  status === "published"
    ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600"
    : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800";

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
      !item.href && !item.pageId ? "error" : page === undefined && item.pageId ? "error" : "ok";
    nodes.set(item.id, {
      ...item,
      pageTitle: page?.title ?? null,
      parentLabel: null,
      status,
      children: [],
    });
  }

  const roots: MenuItemDisplay[] = [];
  for (const item of items) {
    const node = nodes.get(item.id)!;
    if (item.parentId && nodes.has(item.parentId)) {
      const parent = nodes.get(item.parentId)!;
      node.parentLabel = parent.label;
      parent.children!.push(node);
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

export function describeMenuLocationState(input: {
  location: string;
  status: MenuSummary["status"];
}) {
  const location = input.location.trim();
  if (!location) return "Not assigned to a theme slot.";
  if (input.status !== "published") {
    return `Assigned to ${location}, but hidden from runtime until published.`;
  }
  return `Assigned to the ${location} theme slot.`;
}

const buildMenuItemsPayload = (items: MenuItemRecord[]): MenuItemInput[] =>
  items.map((entry) => {
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

  const nextParentId = intent === "child" ? targetItem.id : (targetItem.parentId ?? null);
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

  const targetIndex = newSiblings.findIndex((item) => item.id === targetId);
  const insertIndex =
    intent === "child"
      ? newSiblings.length
      : intent === "before"
        ? targetIndex === -1
          ? newSiblings.length
          : Math.max(0, targetIndex)
        : targetIndex === -1
          ? newSiblings.length
          : Math.max(0, targetIndex + 1);

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
  const nextRoot = position === "start" ? [moved, ...rootSiblings] : [...rootSiblings, moved];

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

export const shouldLoadActiveMenuAfterRefresh = (input: {
  currentActiveId: string | null;
  nextActiveId: string | null;
  reloadActive: boolean;
}) =>
  Boolean(
    input.nextActiveId && (input.reloadActive || input.nextActiveId !== input.currentActiveId)
  );

export const resolveMenuMountRefreshOptions = (hasInitialCache: boolean) => ({
  force: false,
  background: hasInitialCache,
  reloadActive: false,
});

type PendingDeleteState = {
  item: MenuItemRecord;
  descendantIds: string[];
};

export function MenuEditorPage() {
  const { navigate, path } = useAdminRouter();
  const menuId = useMemo(() => resolveMenuId(path), [path]);
  const initialMenu = useMemo(() => (menuId ? getCachedMenuDetail(menuId) : null), [menuId]);
  const initialPages = useMemo(() => getCachedPages(), []);
  const hasInitialMenuCache = Boolean(initialMenu);
  const [menuName, setMenuName] = useState(() => initialMenu?.menu.name ?? "");
  const [menuLocation, setMenuLocation] = useState(() => initialMenu?.menu.location ?? "");
  const [originalMenu, setOriginalMenu] = useState<MenuWithItems["menu"] | null>(
    () => initialMenu?.menu ?? null
  );
  const [items, setItems] = useState<MenuItemRecord[]>(() =>
    initialMenu ? flattenMenuItems(initialMenu.items) : []
  );
  const [originalItems, setOriginalItems] = useState<MenuItemRecord[]>(() =>
    initialMenu ? flattenMenuItems(initialMenu.items) : []
  );
  const [pages, setPages] = useState<PageSummary[]>(() => initialPages ?? []);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const skipNextDetailRefreshCountRef = useRef(0);
  const mutationInFlightRef = useRef(false);
  const activeItemIdRef = useRef<string | null>(activeItemId);
  const [isLoading, setIsLoading] = useState(() => Boolean(menuId && !initialMenu));
  const [pendingAction, setPendingAction] = useState<"save" | "publish" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(() =>
    menuId ? null : "Select a menu from the Menus list."
  );

  const pageMap = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);
  const displayTree = useMemo(() => buildDisplayTree(items, pageMap), [items, pageMap]);
  const parentOptions = useMemo(() => buildParentOptions(displayTree), [displayTree]);

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
    (payload: MenuWithItems, options?: { preserveItemId?: string | null }) => {
      setOriginalMenu(payload.menu);
      setMenuName(payload.menu.name);
      setMenuLocation(payload.menu.location ?? "");
      const flattened = flattenMenuItems(payload.items);
      setItems(flattened);
      setOriginalItems(flattened);
      const preserveId = options?.preserveItemId ?? null;
      const nextActiveId =
        preserveId && flattened.some((item) => item.id === preserveId) ? preserveId : null;
      setActiveItemId(nextActiveId);
      setIsDirty(false);
      setRemoteUpdatePending(false);
      setPendingDelete(null);
    },
    []
  );

  const loadMenu = useCallback(
    async (
      nextMenuId: string,
      options?: {
        force?: boolean;
        allowUnsaved?: boolean;
        setLoading?: boolean;
        preserveItemId?: string | null;
      }
    ) => {
      const shouldSetLoading = options?.setLoading !== false;
      const force = options?.force ?? false;
      if (shouldSetLoading) setIsLoading(true);
      setError(null);
      try {
        const payload = await getMenuWithItemsCached(nextMenuId, { force });
        if (!payload) {
          setOriginalMenu(null);
          setItems([]);
          setOriginalItems([]);
          setActiveItemId(null);
          setError("Menu not found.");
          return;
        }
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

  useEffect(() => {
    if (!menuId) return;
    const mountOptions = resolveMenuMountRefreshOptions(hasInitialMenuCache);
    let active = true;
    Promise.all([
      listPagesCached({ force: mountOptions.force }),
      getMenuWithItemsCached(menuId, { force: mountOptions.force }),
    ])
      .then(([pageList, payload]) => {
        if (!active) return;
        setPages(pageList);
        if (!payload) {
          setOriginalMenu(null);
          setItems([]);
          setOriginalItems([]);
          setActiveItemId(null);
          setError("Menu not found.");
          return;
        }
        applyMenuPayload(payload, { preserveItemId: activeItemIdRef.current });
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load menu.");
        }
      })
      .finally(() => {
        if (active && !mountOptions.background) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyMenuPayload, hasInitialMenuCache, menuId]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.pagesList) return;
      listPagesCached({ force: true })
        .then((nextPages) => setPages(nextPages))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (!menuId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.menuDetail(menuId)) return;
      if (skipNextDetailRefreshCountRef.current > 0 || mutationInFlightRef.current) {
        skipNextDetailRefreshCountRef.current = Math.max(
          0,
          skipNextDetailRefreshCountRef.current - 1
        );
        return;
      }
      loadMenu(menuId, {
        force: true,
        setLoading: false,
        preserveItemId: activeItemIdRef.current,
      }).catch(() => undefined);
    });
  }, [loadMenu, menuId]);

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

  const handleSelectItem = (item: MenuItemDisplay) => {
    setActiveItemId(item.id);
    if (!isLargeScreen) {
      setDetailsOpen(true);
    }
  };

  const handleAddItem = () => {
    if (!menuId) return;
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

  const handleRequestDeleteItem = (item: MenuItemRecord) => {
    const descendantIds = [item.id, ...collectDescendants(displayTree, item.id)];
    setPendingDelete({ item, descendantIds });
  };

  const handleConfirmDeleteItem = () => {
    if (!pendingDelete) return;
    const idsToRemove = new Set<string>(pendingDelete.descendantIds);
    setItems((prev) => prev.filter((entry) => !idsToRemove.has(entry.id)));
    if (activeItemId && idsToRemove.has(activeItemId)) {
      setActiveItemId(null);
      setDetailsOpen(false);
    }
    setIsDirty(true);
    setPendingDelete(null);
  };

  const handleSaveItem = (draft: MenuItemDraft) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.id === draft.id);
      const nextParent = draft.parentId ?? null;
      const shouldReindex = existing && existing.parentId !== nextParent;
      const nextOrderIndex = shouldReindex
        ? prev.filter((entry) => entry.parentId === nextParent && entry.id !== draft.id).length
        : (existing?.orderIndex ?? 0);

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

  const handleDiscard = () => {
    if (originalMenu) {
      setMenuName(originalMenu.name);
      setMenuLocation(originalMenu.location ?? "");
    }
    setItems(originalItems);
    setActiveItemId(null);
    setIsDirty(false);
    setRemoteUpdatePending(false);
    setPendingDelete(null);
  };

  const runOwnDetailMutation = async <T,>(operation: () => Promise<T>) => {
    skipNextDetailRefreshCountRef.current += 1;
    try {
      return await operation();
    } catch (err) {
      skipNextDetailRefreshCountRef.current = Math.max(
        0,
        skipNextDetailRefreshCountRef.current - 1
      );
      throw err;
    }
  };

  const buildMenuMetadataPatch = () => {
    if (!originalMenu) return null;
    const nextName = menuName.trim() || originalMenu.name || "Untitled";
    const nextLocation = menuLocation.trim() || null;
    const patch: { name?: string; location?: string | null } = {};
    if (nextName !== originalMenu.name) {
      patch.name = nextName;
    }
    if (nextLocation !== (originalMenu.location ?? null)) {
      patch.location = nextLocation;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  };

  const persistMenuEditorState = async (options?: {
    nextStatus?: MenuSummary["status"];
    successMessage?: string;
  }) => {
    if (!menuId || mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    setPendingAction(
      options?.nextStatus === "published"
        ? "publish"
        : options?.nextStatus === "draft"
          ? "draft"
          : "save"
    );
    setError(null);

    const validation = validateMenuItemsPayload(items);
    if (!validation.ok) {
      setError(validation.message);
      setActiveItemId(validation.itemId);
      if (!isLargeScreen) {
        setDetailsOpen(true);
      }
      mutationInFlightRef.current = false;
      setPendingAction(null);
      return;
    }

    try {
      const metadataPatch = buildMenuMetadataPatch();
      if (metadataPatch) {
        await runOwnDetailMutation(() => updateMenu(menuId, metadataPatch));
      }
      if (isDirty) {
        await runOwnDetailMutation(() => replaceMenuItems(menuId, buildMenuItemsPayload(items)));
      }
      if (options?.nextStatus) {
        await runOwnDetailMutation(() => updateMenu(menuId, { status: options.nextStatus }));
      }
      await loadMenu(menuId, {
        force: true,
        allowUnsaved: true,
        setLoading: false,
        preserveItemId: activeItemId,
      });
      toast.success(options?.successMessage ?? "Menu saved.");
    } catch (err) {
      const message = isApiClientError(err) ? err.message : "Failed to save menu changes.";
      setError(message);
      toast.error(message);
    } finally {
      mutationInFlightRef.current = false;
      setPendingAction(null);
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
      onDelete={handleRequestDeleteItem}
    />
  ) : null;

  const title = originalMenu?.name ?? "Menu Editor";
  const menuStatus = originalMenu?.status ?? "draft";
  const isPublished = menuStatus === "published";
  const isMutating = pendingAction !== null;
  const locationState = describeMenuLocationState({
    location: menuLocation,
    status: menuStatus,
  });
  const missingMenuState = !isLoading && !originalMenu;

  return (
    <SplitShell
      activeHref="/admin/menus"
      rightPanel={isLargeScreen ? rightPanel : undefined}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <button
            type="button"
            className="transition hover:text-foreground"
            onClick={() => navigate("/menus")}
          >
            Menus
          </button>
          <span>/</span>
          <span className="text-foreground">{title}</span>
          {originalMenu ? (
            <span className={menuEditorStatusBadgeClassName(menuStatus)}>
              {isPublished ? "Published" : "Draft"}
            </span>
          ) : null}
          {canSave ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
    >
      <div className="flex h-full flex-col gap-6">
        <PageHeader
          title={title}
          description="Edit one menu at a time. Change metadata, refine the structure, and publish when ready."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {originalMenu ? (
                <>
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
                  <Button variant="ghost" onClick={handleDiscard} disabled={!canSave || isMutating}>
                    Discard
                  </Button>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => persistMenuEditorState()}
                    disabled={!canSave || isMutating}
                  >
                    <Save className="h-4 w-4" />
                    {pendingAction === "save" ? "Saving..." : "Save changes"}
                  </Button>
                  {!isPublished ? (
                    <Button
                      className="gap-2"
                      onClick={() =>
                        persistMenuEditorState({
                          nextStatus: "published",
                          successMessage: "Menu published.",
                        })
                      }
                      disabled={isMutating}
                    >
                      <Upload className="h-4 w-4" />
                      {pendingAction === "publish" ? "Publishing..." : "Publish"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        persistMenuEditorState({
                          nextStatus: "draft",
                          successMessage: "Menu moved to draft.",
                        })
                      }
                      disabled={isMutating}
                    >
                      <Upload className="h-4 w-4 rotate-180" />
                      {pendingAction === "draft" ? "Moving..." : "Move to Draft"}
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Menu error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {missingMenuState ? (
          <Alert>
            <AlertTitle>Menu unavailable</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Return to the Menus list and choose the menu you want to edit.</span>
              <Button variant="outline" size="sm" onClick={() => navigate("/menus")}>
                Back to menus
              </Button>
            </AlertDescription>
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
                  if (menuId) {
                    loadMenu(menuId, {
                      force: true,
                      allowUnsaved: true,
                      setLoading: false,
                      preserveItemId: activeItemId,
                    }).catch(() => undefined);
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

        {!isLoading && originalMenu ? (
          <div className="flex flex-col gap-6">
            <Card className="border-border/60">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Theme location
                  </label>
                  <Input
                    value={menuLocation}
                    onChange={(event) => setMenuLocation(event.target.value)}
                    placeholder="primary"
                    aria-describedby="menu-location-help menu-location-state"
                  />
                  <p id="menu-location-help" className="text-xs text-muted-foreground">
                    Slot key used by the theme or Navigation widget, for example{" "}
                    <code>primary</code> or <code>footer</code>. Leave empty for menus that are not
                    mounted in a theme slot yet.
                  </p>
                  <p id="menu-location-state" className="text-xs text-muted-foreground">
                    {locationState}
                  </p>
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
                      Drag from the grip handle to reorder. Drop near the top or bottom of a row for
                      same-level placement, or through the middle to create a sub-menu.
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
                    onDelete={handleRequestDeleteItem}
                    onMove={handleMove}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isLoading && !originalMenu && !error ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                Choose a menu from the Menus list before editing its structure.
              </div>
              <Button onClick={() => navigate("/menus")}>Back to menus</Button>
            </div>
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

      <MenuItemDeleteDialog
        open={Boolean(pendingDelete)}
        itemLabel={pendingDelete?.item.label ?? ""}
        descendantCount={Math.max(0, (pendingDelete?.descendantIds.length ?? 1) - 1)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        onConfirm={handleConfirmDeleteItem}
      />
    </SplitShell>
  );
}
