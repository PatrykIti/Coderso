import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isApiClientError } from "@/services/apiClient";
import {
  deleteMedia,
  listMedia,
  updateMedia,
  uploadMedia,
  type MediaRecord,
} from "@/services/mediaClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { MediaDetailsDrawer } from "@/ui/media/MediaDetailsDrawer";
import { MediaGrid } from "@/ui/media/MediaGrid";
import { PageHeader } from "@/ui/shared/PageHeader";
import {
  MediaToolbar,
  type MediaFilter,
  type MediaView,
} from "@/ui/media/MediaToolbar";
import {
  UploadDropzone,
  type UploadDropzoneHandle,
} from "@/ui/media/UploadDropzone";
import type { MediaItem, MediaKind, MediaMetaUpdate } from "@/ui/media/types";

function resolveKindFromMime(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function resolveName(record: MediaRecord) {
  if (record.originalName) return record.originalName;
  const fromKey = record.key?.split("/").pop();
  if (fromKey) return fromKey;
  const fromUrl = record.url?.split("/").pop();
  return fromUrl ?? "asset";
}

function toMediaItem(record: MediaRecord): MediaItem {
  return {
    id: record.id,
    name: resolveName(record),
    originalName: record.originalName ?? undefined,
    type: resolveKindFromMime(record.mimeType),
    sizeBytes: record.size,
    url: record.url,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
    width: record.width ?? undefined,
    height: record.height ?? undefined,
    title: record.title ?? undefined,
    alt: record.alt ?? undefined,
    caption: record.caption ?? undefined,
  };
}

export function MediaLibraryPage() {
  const dropzoneRef = useRef<UploadDropzoneHandle | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [view, setView] = useState<MediaView>("grid");
  const [openAfterUpload, setOpenAfterUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSelectedId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("selected");
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listMedia();
      setItems(result.map(toMediaItem));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load media assets.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
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
    if (!initialSelectedId || selectedId) return;
    const match = items.find((item) => item.id === initialSelectedId);
    if (match) {
      setSelectedId(match.id);
      setIsDrawerOpen(true);
    }
  }, [items, initialSelectedId, selectedId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.title ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || item.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

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
      await refresh();
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

  const handleSaveMeta = (id: string, meta: MediaMetaUpdate) => {
    void (async () => {
      setError(null);
      try {
        const updated = await updateMedia(id, meta);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? toMediaItem(updated) : item))
        );
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to update media metadata.");
        }
      }
    })();
  };

  const handleDelete = (id: string) => {
    void (async () => {
      setError(null);
      try {
        await deleteMedia(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
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

  const handleCopy = (url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
  };

  const handleOpen = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
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
            <Button
              className="gap-2"
              onClick={() => dropzoneRef.current?.openFileDialog()}
            >
              <UploadCloud className="h-4 w-4" />
              Upload New
            </Button>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Media API error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <MediaToolbar
          search={search}
          filter={filter}
          view={view}
          openAfterUpload={openAfterUpload}
          onOpenAfterUploadChange={(next) => {
            setOpenAfterUpload(next);
            setUserSetting("media.openAfterUpload", next).catch(() => undefined);
          }}
          onSearchChange={setSearch}
          onFilterChange={setFilter}
          onViewChange={setView}
        />
        <Card className="border-border/60">
          <CardContent className="space-y-8">
            <UploadDropzone
              ref={dropzoneRef}
              onFiles={handleUploadFiles}
              disabled={isUploading}
              error={uploadError}
            />
            {isLoading ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Loading assets...
              </div>
            ) : (
              <MediaGrid
                items={filteredItems}
                selectedId={selectedId}
                onSelect={handleSelectItem}
              />
            )}
            <div className="flex justify-center">
              <Button variant="outline">Load More Assets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <MediaDetailsDrawer
        key={selectedItem?.id ?? "empty"}
        item={selectedItem}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSave={handleSaveMeta}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onOpen={handleOpen}
      />
    </AdminShell>
  );
}
