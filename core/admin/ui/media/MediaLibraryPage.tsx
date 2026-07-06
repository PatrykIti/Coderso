import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Image as ImageIcon, Settings2, Trash2, UploadCloud } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  deleteMedia,
  getCachedMedia,
  getCachedMediaForEvent,
  getMediaUsage,
  listMediaCached,
  recoverMediaDimensions,
  replaceMedia as replaceMediaAsset,
  updateMedia,
  uploadMedia,
} from "@/services/mediaClient";
import {
  createMediaFolder,
  deleteMediaFolder,
  getCachedMediaFolders,
  getCachedMediaFoldersForEvent,
  listMediaFoldersCached,
  reorderMediaFolders,
  updateMediaFolder,
} from "@/services/mediaFoldersClient";
import { getStorageSettings, updateStorageSettings } from "@/services/settingsClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { MediaDetailsDrawer } from "@/ui/media/MediaDetailsDrawer";
import {
  EMPTY_MEDIA_FILTER,
  MediaFilterPanel,
  countActiveFilters,
  type MediaFilterState,
} from "@/ui/media/MediaFilterPanel";
import { MediaFolderRail, type MediaFolderReorder } from "@/ui/media/MediaFolderRail";
import { MediaGrid } from "@/ui/media/MediaGrid";
import { MediaSettingsDrawer } from "@/ui/media/MediaSettingsDrawer";
import { StorageQuotaCard } from "@/ui/media/StorageQuotaCard";
import { MediaToolbar, type MediaFilter, type MediaView } from "@/ui/media/MediaToolbar";
import type { MediaFolder, MediaItem, MediaMetaUpdate, MediaUsageItem } from "@/ui/media/types";
import { UploadDropzone, type UploadDropzoneHandle } from "@/ui/media/UploadDropzone";
import {
  buildFolderTree,
  countMediaByFolder,
  filterByTag,
  hasMissingImageAlt,
  resolveMediaDisplayName,
  toMediaItem,
  type FolderNode,
} from "@/ui/media/utils";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

type UsageLoadState = {
  state: "idle" | "loading" | "loaded" | "error";
  items: MediaUsageItem[];
  error?: string | null;
};

type DimensionRecoveryState = {
  state: "idle" | "recovering" | "recovered" | "error";
  message?: string | null;
};

const defaultUsageState: UsageLoadState = {
  state: "idle",
  items: [],
  error: null,
};

const defaultDimensionState: DimensionRecoveryState = {
  state: "idle",
  message: null,
};

// TASK-512-06: descendant-aware folder membership set. Walks the built folder
// tree once; on the matching node it collects that node id + every nested
// descendant id, so filtering by a parent folder includes its subfolders'
// assets. Returns an EMPTY set when `folderId` is absent from the tree. Pure (no
// React) so it is unit-testable directly; exported for the Vitest lane.
export function folderDescendantIds(tree: FolderNode[], folderId: string): Set<string> {
  const ids = new Set<string>();
  let matched = false;
  const collectSubtree = (node: FolderNode) => {
    ids.add(node.id);
    for (const child of node.children ?? []) collectSubtree(child);
  };
  const find = (nodes: FolderNode[]) => {
    for (const node of nodes) {
      if (matched) return;
      if (node.id === folderId) {
        matched = true;
        collectSubtree(node);
        return;
      }
      if (node.children?.length) find(node.children);
    }
  };
  find(tree);
  return ids;
}

export function MediaLibraryPage() {
  const dropzoneRef = useRef<UploadDropzoneHandle | null>(null);
  const initialCached = useMemo(() => getCachedMedia(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<MediaItem[]>(() =>
    initialCached ? initialCached.map(toMediaItem) : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [view, setView] = useState<MediaView>("grid");
  const [openAfterUpload, setOpenAfterUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [usageById, setUsageById] = useState<Record<string, UsageLoadState>>({});
  const [dimensionById, setDimensionById] = useState<Record<string, DimensionRecoveryState>>({});
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [deliveryAccessMode, setDeliveryAccessMode] = useState<"public" | "internal">("public");
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  // TASK-512-06: real user folders + storage quota + Filters panel state.
  const [folders, setFolders] = useState<MediaFolder[]>(() => getCachedMediaFolders() ?? []);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [mediaFilterState, setMediaFilterState] = useState<MediaFilterState>(EMPTY_MEDIA_FILTER);
  const [quotaTotalBytes, setQuotaTotalBytes] = useState<number | null>(null);
  const [quotaPlanLabel, setQuotaPlanLabel] = useState<string | null>(null);
  const hasHydratedRef = useRef(hasInitialCache);

  const initialSelectedId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("selected");
  }, []);

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
      const result = await listMediaCached({ force });
      setItems(result.map(toMediaItem));
      hasHydratedRef.current = true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load media assets.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  const applyCachedMediaRows = useCallback(() => {
    const cached = getCachedMediaForEvent();
    if (!cached) return false;
    setItems(cached.map(toMediaItem));
    hasHydratedRef.current = true;
    setIsLoading(false);
    return true;
  }, []);

  useEffect(() => {
    refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(() => undefined);
  }, [hasInitialCache, refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.mediaList) return;
      if (event.action === "update" && applyCachedMediaRows()) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [applyCachedMediaRows, refresh]);

  // TASK-512-06: user folders — cached fetch on mount + cross-tab cache sync.
  const refreshFolders = useCallback(async (options?: { force?: boolean }) => {
    try {
      const result = await listMediaFoldersCached({ force: options?.force ?? false });
      if (Array.isArray(result)) setFolders(result);
    } catch {
      // Ignore folder load failures; the rail degrades to type-only filters.
    }
  }, []);

  useEffect(() => {
    refreshFolders().catch(() => undefined);
  }, [refreshFolders]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.mediaFolders) return;
      const cached = getCachedMediaFoldersForEvent();
      if (cached) {
        setFolders(cached);
        return;
      }
      refreshFolders({ force: true }).catch(() => undefined);
    });
  }, [refreshFolders]);

  // TASK-512-06: quota fetch on mount (explicit) so the storage card is
  // data-backed BEFORE the settings drawer is ever opened. `loadMediaSettings`
  // re-syncs the same state on drawer open so card + drawer stay consistent.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settings = await getStorageSettings();
        if (!active) return;
        setQuotaTotalBytes(settings.quota.totalBytes ?? null);
        setQuotaPlanLabel(settings.quota.planLabel ?? null);
      } catch {
        // Ignore quota load failures; the card degrades to the count-only view.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await getUserSettings();
        if (!active) return;
        setOpenAfterUpload(prefs["media.openAfterUpload"]);
      } catch {
        // Ignore preference load failures; defaults will be used.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const exists = items.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(null);
      setIsDrawerOpen(false);
    }
  }, [items, selectedId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  useEffect(() => {
    if (!initialSelectedId || selectedId) return;
    const match = items.find((item) => item.id === initialSelectedId);
    if (match) {
      setSelectedId(match.id);
      setIsDrawerOpen(true);
    }
  }, [items, initialSelectedId, selectedId]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    let next = items.filter((item) => {
      const displayName = resolveMediaDisplayName(item).toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        displayName.includes(normalizedSearch) ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.originalName ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.title ?? "").toLowerCase().includes(normalizedSearch);
      const matchesFilter = filter === "all" || item.type === filter;
      return matchesSearch && matchesFilter;
    });

    const f = mediaFilterState;
    if (activeFolderId) {
      const descendantIds = folderDescendantIds(folderTree, activeFolderId);
      next = next.filter((item) => item.folderId != null && descendantIds.has(item.folderId));
    }
    if (f.types.length) next = next.filter((item) => f.types.includes(item.type));
    if (f.tags.length) next = f.tags.reduce((acc, tag) => filterByTag(acc, tag), next);
    if (f.alt !== "any")
      next = next.filter((item) =>
        f.alt === "missing"
          ? hasMissingImageAlt(item)
          : item.type === "image" && !hasMissingImageAlt(item)
      );
    // Compare the DATE portion (createdAt is a full ISO datetime; the facet is a
    // <input type=date> "YYYY-MM-DD"). Inclusive on both bounds.
    if (f.dateFrom) next = next.filter((item) => item.createdAt.slice(0, 10) >= f.dateFrom!);
    if (f.dateTo) next = next.filter((item) => item.createdAt.slice(0, 10) <= f.dateTo!);
    return next;
  }, [items, search, filter, activeFolderId, folderTree, mediaFilterState]);

  // Deduped, sorted union of every item tag — the Filters panel's tag chip source.
  const filterTags = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags ?? []))].sort(),
    [items]
  );

  // Folder rail counts + storage summary are pure render-time derivations of the
  // already-loaded `items` (no extra fetch, no setState-in-effect).
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const it of items) counts[it.type] = (counts[it.type] ?? 0) + 1;
    return counts;
  }, [items]);
  const totalBytes = useMemo(
    () => items.reduce((sum, it) => sum + (it.sizeBytes ?? 0), 0),
    [items]
  );
  // Per-folder recursive item counts (descendants included) for the rail — a
  // DISTINCT map from the type-count `folderCounts` above (which feeds `typeCounts`).
  const folderItemCounts = useMemo(
    () =>
      Object.fromEntries(
        folders.map((folder) => [folder.id, countMediaByFolder(items, folder.id, folders)])
      ),
    [folders, items]
  );

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet]
  );
  const currentUsage = selectedId
    ? (usageById[selectedId] ?? defaultUsageState)
    : defaultUsageState;
  const currentDimensionState = selectedId
    ? (dimensionById[selectedId] ?? defaultDimensionState)
    : defaultDimensionState;

  const updateOpenAfterUpload = (next: boolean) => {
    setOpenAfterUpload(next);
    setUserSetting("media.openAfterUpload", next).catch(() => undefined);
  };

  const handleUploadFiles = async (files: File[]) => {
    setUploadError(null);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = [] as Array<{ id: string }>;
      for (const file of files) {
        // Upload meta stays minimal (mediaUploadSchema is additionalProperties:false
        // and carries no folderId). When a folder is active, land the asset there via
        // upload-first-then-PATCH so the route boundary never sees an unknown key.
        const result = await uploadMedia(file);
        if (activeFolderId) {
          const patched = await updateMedia(result.id, { folderId: activeFolderId });
          uploaded.push(patched);
        } else {
          uploaded.push(result);
        }
      }
      applyCachedMediaRows();
      if (uploaded[0]?.id) {
        setSelectedId(uploaded[0].id);
        setIsDrawerOpen(openAfterUpload);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to upload files.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMeta = async (id: string, meta: MediaMetaUpdate) => {
    setError(null);
    try {
      const updated = await updateMedia(id, meta);
      const next = toMediaItem(updated);
      setItems((prev) => prev.map((item) => (item.id === id ? next : item)));
      return next;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update media metadata.");
      }
      throw err;
    }
  };

  // TASK-512-06: rail selection reconciled in BOTH directions so the grid
  // (activeFolderId, the sole folder source of truth), the Filters badge, and the
  // panel folder control never diverge. Folder + rail type are mutually exclusive.
  const handleSelectFolder = (folderId: string | null) => {
    setActiveFolderId(folderId);
    setMediaFilterState((prev) => ({ ...prev, folderId }));
    if (folderId) setFilter("all");
  };

  const handleSelectType = (type: MediaFilter) => {
    setFilter(type);
    setActiveFolderId(null);
    setMediaFilterState((prev) => ({ ...prev, folderId: null }));
  };

  const handleCreateFolder = (name: string, parentId: string | null) => {
    createMediaFolder({ name, parentId }).catch(() => undefined);
  };

  const handleRenameFolder = (id: string, name: string) => {
    updateMediaFolder(id, { name }).catch(() => undefined);
  };

  const handleDeleteFolder = (id: string) => {
    void (async () => {
      try {
        await deleteMediaFolder(id);
        if (activeFolderId === id) {
          setActiveFolderId(null);
          setMediaFilterState((prev) => ({ ...prev, folderId: null }));
        }
      } catch {
        // Ignore delete failures; the rail reconciles on the next cache event.
      }
    })();
  };

  const handleReorderFolders = (orders: MediaFolderReorder[]) => {
    reorderMediaFolders(orders).catch(() => undefined);
  };

  const handleFilterChange = (next: MediaFilterState) => {
    setMediaFilterState(next);
    // A panel-selected folder writes through to the rail's activeFolderId (the
    // grid's single folder source of truth); a panel folder clears the rail type.
    setActiveFolderId(next.folderId);
    if (next.folderId) setFilter("all");
  };

  const handleFilterReset = () => {
    setMediaFilterState(EMPTY_MEDIA_FILTER);
    setActiveFolderId(null);
  };

  const handleDelete = (id: string) => {
    void (async () => {
      setError(null);
      try {
        await deleteMedia(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        setSelectedIds((prev) => prev.filter((selected) => selected !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setIsDrawerOpen(false);
        }
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to delete media asset.");
        }
      }
    })();
  };

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    setIsDrawerOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  };

  const handleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) next.add(item.id);
      return [...next];
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setActionMessage(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Delete ${selectedIds.length} selected media assets?`);
      if (!ok) return;
    }

    setError(null);
    setActionMessage(null);
    const deleted = new Set<string>();
    for (const id of selectedIds) {
      try {
        await deleteMedia(id);
        deleted.add(id);
      } catch {
        // Keep deleting independent selected assets; failures are summarized below.
      }
    }

    if (deleted.size > 0) {
      setItems((prev) => prev.filter((item) => !deleted.has(item.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.has(id)));
      if (selectedId && deleted.has(selectedId)) {
        setSelectedId(null);
        setIsDrawerOpen(false);
      }
    }

    const failed = selectedIds.length - deleted.size;
    setActionMessage(
      failed > 0
        ? `Deleted ${deleted.size} assets. ${failed} assets failed.`
        : `Deleted ${deleted.size} assets.`
    );
  };

  const handleBulkDownload = () => {
    if (selectedItems.length === 0 || typeof document === "undefined") return;
    for (const item of selectedItems) {
      const link = document.createElement("a");
      link.href = item.url;
      link.download = item.originalName ?? resolveMediaDisplayName(item);
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const handleCopy = async (url: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      throw new Error("clipboard_unavailable");
    }
    await navigator.clipboard.writeText(url);
  };

  const handleOpen = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleReplaceMedia = async (id: string, file: File) => {
    setError(null);
    try {
      const updated = await replaceMediaAsset(id, file);
      const next = toMediaItem(updated);
      setItems((prev) => prev.map((item) => (item.id === id ? next : item)));
      setDimensionById((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return next;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to replace media asset.");
      }
      throw err;
    }
  };

  const loadUsage = useCallback(async (id: string) => {
    setUsageById((prev) => ({
      ...prev,
      [id]: { state: "loading", items: prev[id]?.items ?? [], error: null },
    }));
    try {
      const result = await getMediaUsage(id);
      setUsageById((prev) => ({
        ...prev,
        [id]: { state: "loaded", items: result, error: null },
      }));
    } catch (err) {
      setUsageById((prev) => ({
        ...prev,
        [id]: {
          state: "error",
          items: [],
          error: isApiClientError(err) ? err.message : "Failed to load usage.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!selectedId || !isDrawerOpen) return;
    loadUsage(selectedId).catch(() => undefined);
  }, [selectedId, isDrawerOpen, loadUsage]);

  useEffect(() => {
    if (!selectedItem || !isDrawerOpen) return;
    if (selectedItem.type !== "image") return;
    if (selectedItem.width && selectedItem.height) return;
    const existing = dimensionById[selectedItem.id]?.state;
    if (existing && existing !== "idle") return;

    const id = selectedItem.id;
    setDimensionById((prev) => ({
      ...prev,
      [id]: { state: "recovering", message: "Recovering..." },
    }));
    recoverMediaDimensions(id)
      .then((updated) => {
        const next = toMediaItem(updated);
        setItems((prev) => prev.map((item) => (item.id === id ? next : item)));
        const hasDimensions = Boolean(next.width && next.height);
        setDimensionById((prev) => ({
          ...prev,
          [id]: {
            state: "recovered",
            message: hasDimensions ? "Dimensions recovered." : "Dimensions unavailable.",
          },
        }));
      })
      .catch((err) => {
        setDimensionById((prev) => ({
          ...prev,
          [id]: {
            state: "error",
            message: isApiClientError(err) ? err.message : "Failed to recover dimensions.",
          },
        }));
      });
  }, [selectedItem, isDrawerOpen, dimensionById]);

  const loadMediaSettings = useCallback(async () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    setIsSettingsLoading(true);
    try {
      const settings = await getStorageSettings();
      setDeliveryAccessMode(settings.delivery.accessMode ?? "public");
      setQuotaTotalBytes(settings.quota.totalBytes ?? null);
      setQuotaPlanLabel(settings.quota.planLabel ?? null);
    } catch (err) {
      if (isApiClientError(err)) {
        setSettingsError(err.message);
      } else {
        setSettingsError("Failed to load media settings.");
      }
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  const handleOpenMediaSettings = () => {
    setIsSettingsDrawerOpen(true);
    loadMediaSettings().catch(() => undefined);
  };

  const handleSaveMediaSettings = () => {
    if (isSettingsLoading || isSettingsSaving) return;

    void (async () => {
      setSettingsError(null);
      setSettingsSuccess(null);
      setIsSettingsSaving(true);
      try {
        const updated = await updateStorageSettings({
          delivery: { accessMode: deliveryAccessMode },
          quota: { totalBytes: quotaTotalBytes, planLabel: quotaPlanLabel },
        });
        setDeliveryAccessMode(updated.delivery.accessMode ?? "public");
        setQuotaTotalBytes(updated.quota.totalBytes ?? null);
        setQuotaPlanLabel(updated.quota.planLabel ?? null);
        setSettingsSuccess("Media settings updated.");
      } catch (err) {
        if (isApiClientError(err)) {
          setSettingsError(err.message);
        } else {
          setSettingsError("Failed to update media settings.");
        }
      } finally {
        setIsSettingsSaving(false);
      }
    })();
  };

  return (
    <AdminShell activeHref="/admin/media" breadcrumbs={["Home", "Media Library"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Media Library"
          description="Manage your images and assets."
          icon={<ImageIcon className="h-5 w-5" />}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={handleOpenMediaSettings}>
                <Settings2 className="h-4 w-4" />
                Media settings
              </Button>
              <Button className="gap-2" onClick={() => dropzoneRef.current?.openFileDialog()}>
                <UploadCloud className="h-4 w-4" />
                Upload
              </Button>
            </div>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Media API error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionMessage ? (
          <Alert>
            <AlertTitle>Media action</AlertTitle>
            <AlertDescription>{actionMessage}</AlertDescription>
          </Alert>
        ) : null}
        <StorageQuotaCard
          usedBytes={totalBytes}
          totalBytes={quotaTotalBytes}
          planLabel={quotaPlanLabel}
          assetCount={items.length}
          className="shadow-soft"
          onManagePlan={handleOpenMediaSettings}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <MediaFolderRail
            folders={folders}
            folderTree={folderTree}
            typeCounts={folderCounts}
            folderCounts={folderItemCounts}
            activeFolderId={activeFolderId}
            activeType={filter}
            onSelectType={handleSelectType}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onReorder={handleReorderFolders}
          />
          <div className="flex min-w-0 flex-col gap-4">
            <MediaToolbar
              search={search}
              view={view}
              onSearchChange={setSearch}
              onViewChange={setView}
              onOpenFilters={() => setFilterPanelOpen(true)}
              activeFilterCount={countActiveFilters(mediaFilterState)}
            />
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{selectedIds.length} selected</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectVisible}>
                  Select visible
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={selectedIds.length === 0}
                  onClick={handleBulkDownload}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    handleBulkDelete().catch(() => undefined);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                  Clear
                </Button>
              </div>
            </div>
            {/* Headless dropzone lives OUTSIDE the card's space-y flow (it is
                display:none) so it keeps drag/drop + the openFileDialog handle
                for the header "Upload" button without adding any vertical gap
                or the large dashed drop area that pushed the list below the fold. */}
            <UploadDropzone
              ref={dropzoneRef}
              onFiles={handleUploadFiles}
              disabled={isUploading}
              error={uploadError}
              variant="headless"
            />
            <Card>
              <CardContent className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing {filteredItems.length} of {items.length} assets
                    </span>
                    {isLoading ? <span>Loading...</span> : null}
                    {uploadError ? <span className="text-destructive">{uploadError}</span> : null}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={openAfterUpload}
                      onCheckedChange={(next) => updateOpenAfterUpload(next === true)}
                    />
                    Open details after upload
                  </label>
                </div>
                {isLoading ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Loading assets...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No media assets found.
                  </div>
                ) : (
                  <MediaGrid
                    items={filteredItems}
                    selectedId={selectedId}
                    selectedIds={selectedIds}
                    view={view}
                    selectionMode
                    onSelect={handleSelectItem}
                    onToggleSelect={handleToggleSelect}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <MediaDetailsDrawer
        key={selectedItem?.id ?? "empty"}
        item={selectedItem}
        open={isDrawerOpen}
        usageItems={currentUsage.items}
        usageState={currentUsage.state}
        usageError={currentUsage.error}
        dimensionState={currentDimensionState.state}
        dimensionMessage={currentDimensionState.message}
        folders={folders}
        onOpenChange={setIsDrawerOpen}
        onSave={handleSaveMeta}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onOpen={handleOpen}
        onReplace={handleReplaceMedia}
      />
      <MediaSettingsDrawer
        open={isSettingsDrawerOpen}
        onOpenChange={setIsSettingsDrawerOpen}
        accessMode={deliveryAccessMode}
        isLoading={isSettingsLoading}
        isSaving={isSettingsSaving}
        error={settingsError}
        success={settingsSuccess}
        onAccessModeChange={setDeliveryAccessMode}
        onSave={handleSaveMediaSettings}
        quotaPlanLabel={quotaPlanLabel}
        quotaTotalBytes={quotaTotalBytes}
        onQuotaPlanLabelChange={setQuotaPlanLabel}
        onQuotaTotalBytesChange={setQuotaTotalBytes}
      />
      <Sheet open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <MediaFilterPanel
                tags={filterTags}
                folders={folders}
                value={mediaFilterState}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
