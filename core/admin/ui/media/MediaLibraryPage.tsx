import { useMemo, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { MediaDetailsPanel } from "@/ui/media/MediaDetailsPanel";
import { MediaGrid } from "@/ui/media/MediaGrid";
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

const seedMedia: MediaItem[] = [
  {
    id: "media-1",
    name: "hero-banner_v2.jpg",
    type: "image",
    sizeBytes: 2.4 * 1024 * 1024,
    url: "/media/hero-banner_v2.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-01-20T09:12:00Z",
    width: 1920,
    height: 1080,
    title: "Hero Banner",
    alt: "Mountain landscape",
  },
  {
    id: "media-2",
    name: "coding-session.jpg",
    type: "image",
    sizeBytes: 1.8 * 1024 * 1024,
    url: "/media/coding-session.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-01-18T12:30:00Z",
    width: 1600,
    height: 900,
  },
  {
    id: "media-3",
    name: "Q1_Financial_Report.pdf",
    type: "document",
    sizeBytes: 840 * 1024,
    url: "/media/Q1_Financial_Report.pdf",
    mimeType: "application/pdf",
    createdAt: "2026-01-14T08:10:00Z",
  },
  {
    id: "media-4",
    name: "abstract-bg-04.png",
    type: "image",
    sizeBytes: 4.1 * 1024 * 1024,
    url: "/media/abstract-bg-04.png",
    mimeType: "image/png",
    createdAt: "2026-01-12T15:55:00Z",
    width: 2400,
    height: 1350,
  },
  {
    id: "media-5",
    name: "podcast-episode-01.mp3",
    type: "audio",
    sizeBytes: 42 * 1024 * 1024,
    url: "/media/podcast-episode-01.mp3",
    mimeType: "audio/mpeg",
    createdAt: "2026-01-10T19:20:00Z",
  },
];

function resolveKind(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function MediaLibraryPage() {
  const dropzoneRef = useRef<UploadDropzoneHandle | null>(null);
  const [items, setItems] = useState<MediaItem[]>(seedMedia);
  const [selectedId, setSelectedId] = useState<string | null>(
    seedMedia[0]?.id ?? null
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [view, setView] = useState<MediaView>("grid");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleUploadFiles = (files: File[]) => {
    setUploadError(null);
    if (files.length === 0) return;
    setIsUploading(true);
    const newItems = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: resolveKind(file.type),
      sizeBytes: file.size,
      url: `/media/${file.name}`,
      mimeType: file.type || "application/octet-stream",
      createdAt: new Date().toISOString(),
      title: file.name,
    }));
    setItems((prev) => [...newItems, ...prev]);
    setSelectedId(newItems[0]?.id ?? null);
    setIsUploading(false);
  };

  const handleSaveMeta = (id: string, meta: MediaMetaUpdate) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...meta } : item))
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      const next = items.find((item) => item.id !== id);
      setSelectedId(next?.id ?? null);
    }
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
    <SplitShell
      activeHref="/admin/media"
      rightPanel={
        <MediaDetailsPanel
          key={selectedItem?.id ?? "empty"}
          item={selectedItem}
          onSave={handleSaveMeta}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onOpen={handleOpen}
        />
      }
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
        <MediaToolbar
          search={search}
          filter={filter}
          view={view}
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
            <MediaGrid
              items={filteredItems}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className="flex justify-center">
              <Button variant="outline">Load More Assets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SplitShell>
  );
}
