import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Download, Settings2, Trash2, UploadCloud } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  deleteMedia,
  getCachedMedia,
  getMediaUsage,
  listMediaCached,
  recoverMediaDimensions,
  replaceMedia as replaceMediaAsset,
  updateMedia,
  uploadMedia,
} from "@/services/mediaClient";
import {
  getStorageSettings,
  updateStorageSettings,
} from "@/services/settingsClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { MediaDetailsDrawer } from "@/ui/media/MediaDetailsDrawer";
import { MediaGrid } from "@/ui/media/MediaGrid";
import { MediaSettingsDrawer } from "@/ui/media/MediaSettingsDrawer";
import {
  MediaToolbar,
  type MediaFilter,
  type MediaView,
} from "@/ui/media/MediaToolbar";
import type { MediaItem, MediaMetaUpdate, MediaUsageItem } from "@/ui/media/types";
import {
  UploadDropzone,
  type UploadDropzoneHandle,
} from "@/ui/media/UploadDropzone";
import { resolveMediaDisplayName, toMediaItem } from "@/ui/media/utils";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

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

export function MediaLibraryPage() {
  const dropzoneRef = useRef<UploadDropzoneHandle | null>(null);
  const initialCached = getCachedMedia();
  const [items, setItems] = useState<MediaItem[]>(() =>
    initialCached ? initialCached.map(toMediaItem) : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [view, setView] = useState<MediaView>("grid");
  const [openAfterUpload, setOpenAfterUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !initialCached);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [usageById, setUsageById] = useState<Record<string, UsageLoadState>>({});
  const [dimensionById, setDimensionById] = useState<Record<string, DimensionRecoveryState>>({});
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [deliveryAccessMode, setDeliveryAccessMode] = useState<
    "public" | "internal"
  >("public");
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const hasHydratedRef = useRef(false);

  const initialSelectedId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("selected");
  }, []);

  const refresh = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = options?.background ?? hasHydratedRef.current;
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
    },
    []
  );

  useEffect(() => {
    refresh({ force: true }).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.mediaList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [refresh]);

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
    setSelectedIds((current) =>
      current.filter((id) => items.some((item) => item.id === id))
    );
  }, [items]);

  useEffect(() => {
    if (!initialSelectedId || selectedId) return;
    const match = items.find((item) => item.id === initialSelectedId);
    if (match) {
      setSelectedId(match.id);
      setIsDrawerOpen(true);
    }
  }, [items, initialSelectedId, selectedId]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
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
  }, [items, search, filter]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet]
  );
  const currentUsage = selectedId ? usageById[selectedId] ?? defaultUsageState : defaultUsageState;
  const currentDimensionState = selectedId
    ? dimensionById[selectedId] ?? defaultDimensionState
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
        const result = await uploadMedia(file);
        uploaded.push(result);
      }
      await refresh({ force: true, background: true });
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
    setIsSelectionMode(false);
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
            message: isApiClientError(err)
              ? err.message
              : "Failed to recover dimensions.",
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
        });
        setDeliveryAccessMode(updated.delivery.accessMode ?? "public");
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
    <AdminShell
      activeHref="/admin/media"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Home</span>
          <span>/</span>
          <span className="text-foreground">Media Library</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Media Library"
          description="Manage your images and assets."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={isSelectionMode ? "secondary" : "outline"}
                className="gap-2"
                onClick={() => setIsSelectionMode((value) => !value)}
              >
                <CheckSquare className="h-4 w-4" />
                Select
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleOpenMediaSettings}
              >
                <Settings2 className="h-4 w-4" />
                Media settings
              </Button>
              <Button
                className="gap-2"
                onClick={() => dropzoneRef.current?.openFileDialog()}
              >
                <UploadCloud className="h-4 w-4" />
                Upload New
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
        <MediaToolbar
          search={search}
          filter={filter}
          view={view}
          onSearchChange={setSearch}
          onFilterChange={setFilter}
          onViewChange={setView}
        />
        {isSelectionMode ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </p>
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
        ) : null}
        <Card className="border-border/60">
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Upload assets</p>
                  <p className="text-xs text-muted-foreground">
                    New uploads use the configured media storage provider.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={openAfterUpload}
                    onCheckedChange={(next) => updateOpenAfterUpload(next === true)}
                  />
                  Open details after upload
                </label>
              </div>
              <UploadDropzone
                ref={dropzoneRef}
                onFiles={handleUploadFiles}
                disabled={isUploading}
                error={uploadError}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {filteredItems.length} of {items.length} assets
              </span>
              {isLoading ? <span>Loading...</span> : null}
            </div>
            {isLoading ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Loading assets...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No media assets found.
              </div>
            ) : (
              <MediaGrid
                items={filteredItems}
                selectedId={selectedId}
                selectedIds={selectedIds}
                view={view}
                selectionMode={isSelectionMode}
                onSelect={handleSelectItem}
                onToggleSelect={handleToggleSelect}
              />
            )}
          </CardContent>
        </Card>
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
      />
    </AdminShell>
  );
}
