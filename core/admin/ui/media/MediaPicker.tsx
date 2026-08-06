import { FileAudio, FileText, ImagePlus, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isApiClientError } from "@/services/apiClient";
import { getCachedMedia, listMediaCached } from "@/services/mediaClient";
import { MediaGrid } from "@/ui/media/MediaGrid";
import type { MediaItem } from "@/ui/media/types";
import { formatBytes, resolveMediaDisplayName, toMediaItem } from "@/ui/media/utils";
import { normalizeMediaPickerValue, type MediaPickerSelectionValue } from "./mediaPickerValue";

type MediaPickerProps = {
  value: unknown;
  onChange: (value: MediaPickerSelectionValue) => void;
  multiple?: boolean;
  accept?: string[];
  maxItems?: number;
  /**
   * Chrome override for the "Browse media" trigger on surfaces where the
   * admin-theme button variables do not apply (e.g. the dark page-editor
   * floating toolbar). The dialog itself is portaled and keeps theme chrome.
   */
  triggerButtonClassName?: string;
  /** Chrome override for the selected-asset remove buttons (same surfaces). */
  removeButtonClassName?: string;
};

const normalizeAccept = (accept?: string[]) =>
  (accept ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());

const matchesAccept = (item: Pick<MediaItem, "type" | "mimeType">, accept?: string[]) => {
  const normalized = normalizeAccept(accept);
  if (normalized.length === 0) return true;
  const candidate = item.mimeType.toLowerCase();
  return normalized.some((pattern) => {
    if (pattern === "*/*") return true;
    if (!pattern.endsWith("/*")) return candidate === pattern;

    const family = pattern.slice(0, pattern.indexOf("/"));
    if (!candidate.startsWith(`${family}/`)) return false;
    if (family === "image") return item.type === "image";
    if (family === "audio") return item.type === "audio";
    if (family === "video") return item.type === "video";
    return item.type === "document";
  });
};

export function MediaPicker({
  value,
  onChange,
  multiple = false,
  accept,
  maxItems,
  triggerButtonClassName,
  removeButtonClassName,
}: MediaPickerProps) {
  const initialCached = useMemo(() => getCachedMedia(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<MediaItem[]>(() =>
    initialCached ? initialCached.map(toMediaItem) : []
  );
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const selectedIds = useMemo(() => {
    const normalized = normalizeMediaPickerValue(value, multiple);
    if (Array.isArray(normalized)) return normalized;
    return typeof normalized === "string" ? [normalized] : [];
  }, [multiple, value]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );
  const hasSelection = selectedIds.length > 0;
  const isResolvingSelection =
    hasSelection && selectedItems.length === 0 && (isLoading || !hasLoaded);

  const canAddMore = !multiple || !maxItems || selectedIds.length < maxItems;

  useEffect(() => {
    if (hasLoaded) return;
    if (!isOpen && selectedIds.length === 0) return;
    let active = true;
    listMediaCached({ force: false })
      .then((result) => {
        if (active) setItems(result.map(toMediaItem));
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load media assets.");
        }
      })
      .finally(() => {
        if (!active) return;
        if (!hasInitialCache) setIsLoading(false);
        setHasLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache, hasLoaded, isOpen, selectedIds.length]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesAccept(item, accept)) return false;
      if (!query) return true;
      const normalized = query.toLowerCase();
      const displayName = resolveMediaDisplayName(item).toLowerCase();
      return (
        displayName.includes(normalized) ||
        item.name.toLowerCase().includes(normalized) ||
        (item.originalName ?? "").toLowerCase().includes(normalized) ||
        (item.title ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [items, query, accept]);

  const handleSelect = (id: string) => {
    if (multiple) {
      const exists = selectedIds.includes(id);
      if (!exists && !canAddMore) return;
      const next = exists ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id];
      onChange(next);
      return;
    }
    onChange(id);
    setIsOpen(false);
  };

  const handleRemove = (id: string) => {
    if (multiple) {
      onChange(selectedIds.filter((entry) => entry !== id));
    } else {
      onChange(null);
    }
  };

  const helperText = multiple
    ? maxItems
      ? `Select up to ${maxItems} assets.`
      : "Select one or more assets."
    : "Select a single asset.";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{helperText}</p>
          {accept && accept.length > 0 ? (
            <p className="text-[11px] text-muted-foreground">Allowed: {accept.join(", ")}</p>
          ) : null}
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className={triggerButtonClassName}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Browse media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Media library</DialogTitle>
              <DialogDescription>
                Choose an existing media asset for this editor field. Search by name or title, then
                select an asset from the library.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or title..."
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="max-h-[420px] overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Loading media assets...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No media assets found.
                  </div>
                ) : (
                  <MediaGrid
                    items={filteredItems}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                  />
                )}
              </div>
              {!canAddMore && multiple ? (
                <p className="text-xs text-muted-foreground">Max items reached ({maxItems}).</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!hasSelection ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          No media selected yet.
        </div>
      ) : isResolvingSelection ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          Loading selected media...
        </div>
      ) : selectedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          Selected media is unavailable.
        </div>
      ) : (
        <div className="space-y-3">
          {selectedItems.map((item) => (
            <div
              key={item.id}
              data-media-picker-selected-id={item.id}
              className="flex items-center gap-3 rounded-xl border bg-muted/10 p-3"
            >
              {(() => {
                const displayName = resolveMediaDisplayName(item);
                return (
                  <>
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.alt ?? displayName}
                        className="h-16 w-20 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-20 items-center justify-center rounded-lg border bg-muted/30">
                        {item.type === "audio" ? (
                          <FileAudio className="h-6 w-6 text-muted-foreground" />
                        ) : item.type === "video" ? (
                          <Video className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(item.sizeBytes)}</p>
                    </div>
                  </>
                );
              })()}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={removeButtonClassName}
                onClick={() => handleRemove(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
