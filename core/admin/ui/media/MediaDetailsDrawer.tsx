import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  Trash2,
  UploadCloud,
  Video,
  X,
  ZoomIn,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AdminLink } from "@/ui/shared/AdminLink";

import { FocalPointPicker } from "./FocalPointPicker";
import { TagInput } from "./TagInput";
import type { MediaFolder, MediaItem, MediaMetaUpdate, MediaUsageItem } from "./types";
import {
  formatBytes,
  formatDate,
  formatDimensions,
  hasMissingImageAlt,
  resolveMediaDisplayName,
} from "./utils";

export type MediaDetailsDrawerProps = {
  item: MediaItem | null;
  open: boolean;
  usageItems?: MediaUsageItem[];
  usageState?: "idle" | "loading" | "loaded" | "error";
  usageError?: string | null;
  dimensionState?: "idle" | "recovering" | "recovered" | "error";
  dimensionMessage?: string | null;
  // TASK-512-05: OPTIONAL (defaulted []) option source for the Folder control.
  // Required-ness would break the three unowned test renders (media.test.tsx /
  // media-restyle.test.tsx / mediaLibrary.test.tsx) under root tsc + Vitest.
  folders?: MediaFolder[];
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, meta: MediaMetaUpdate) => Promise<MediaItem> | MediaItem | void;
  onDelete: (id: string) => void;
  onCopy: (url: string) => Promise<void> | void;
  onOpen: (url: string) => void;
  onReplace?: (id: string, file: File) => Promise<MediaItem> | MediaItem | void;
};

const previewIconMap = {
  image: ImageIcon,
  document: FileText,
  audio: FileAudio,
  video: Video,
};

const usageIconMap = {
  page: ImageIcon,
  entry: FileText,
  post: FileText,
  commerce: Link2,
  submission: FileText,
};

export function MediaDetailsDrawer({
  item,
  open,
  usageItems = [],
  usageState = "idle",
  usageError,
  dimensionState = "idle",
  dimensionMessage,
  folders = [],
  onOpenChange,
  onSave,
  onDelete,
  onCopy,
  onOpen,
  onReplace,
}: MediaDetailsDrawerProps) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = item ? resolveMediaDisplayName(item) : "";
  const originalName = item?.originalName ?? "";
  const [title, setTitle] = useState(item?.title ?? displayName);
  const [alt, setAlt] = useState(item?.alt ?? "");
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [folderId, setFolderId] = useState<string | null>(item?.folderId ?? null);
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [description, setDescription] = useState(item?.description ?? "");
  const [credit, setCredit] = useState(item?.credit ?? "");
  const [focalX, setFocalX] = useState<number | null>(item?.focalX ?? null);
  const [focalY, setFocalY] = useState<number | null>(item?.focalY ?? null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [replaceStatus, setReplaceStatus] = useState<"idle" | "replacing" | "replaced" | "error">(
    "idle"
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTitle(item?.title ?? (item ? resolveMediaDisplayName(item) : ""));
      setAlt(item?.alt ?? "");
      setCaption(item?.caption ?? "");
      setFolderId(item?.folderId ?? null);
      setTags(item?.tags ?? []);
      setDescription(item?.description ?? "");
      setCredit(item?.credit ?? "");
      setFocalX(item?.focalX ?? null);
      setFocalY(item?.focalY ?? null);
      setSaveStatus("idle");
      setCopyStatus("idle");
      setReplaceStatus("idle");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [item]);

  const buildMeta = (overrides: Partial<MediaMetaUpdate> = {}): MediaMetaUpdate => ({
    title,
    alt,
    caption,
    folderId,
    tags,
    focalX,
    focalY,
    description,
    credit,
    ...overrides,
  });

  const syncFromUpdated = (updated: MediaItem) => {
    setTitle(updated.title ?? resolveMediaDisplayName(updated));
    setAlt(updated.alt ?? "");
    setCaption(updated.caption ?? "");
    setFolderId(updated.folderId ?? null);
    setTags(updated.tags ?? []);
    setDescription(updated.description ?? "");
    setCredit(updated.credit ?? "");
    setFocalX(updated.focalX ?? null);
    setFocalY(updated.focalY ?? null);
  };

  // Persist the FULL metadata payload (present-only per MediaMetaUpdate). Rapid
  // control changes (e.g. focal drag) coalesce: while one save is in flight the
  // latest overrides are queued and flushed once it settles, so the final value
  // always lands without concurrent PATCH races.
  const savingRef = useRef(false);
  const pendingRef = useRef<Partial<MediaMetaUpdate> | null>(null);

  const persist = async (overrides: Partial<MediaMetaUpdate> = {}) => {
    if (!item) return;
    if (savingRef.current) {
      pendingRef.current = { ...(pendingRef.current ?? {}), ...overrides };
      return;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const updated = await onSave(item.id, buildMeta(overrides));
      if (updated) syncFromUpdated(updated);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) void persist(pending);
    }
  };

  const handleSaveMeta = () => {
    void persist();
  };

  const handleOpenAsset = () => {
    if (!item) return;
    onOpen(item.url);
  };

  const handleCopyUrl = async () => {
    if (!item) return;
    setCopyStatus("idle");
    try {
      await onCopy(item.url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  const handleDeleteAsset = () => {
    if (!item) return;
    onDelete(item.id);
  };

  const handleReplaceFile = async (file: File | undefined) => {
    if (!item || !file || !onReplace || replaceStatus === "replacing") return;
    setReplaceStatus("replacing");
    try {
      const updated = await onReplace(item.id, file);
      if (updated) syncFromUpdated(updated);
      setReplaceStatus("replaced");
    } catch {
      setReplaceStatus("error");
    } finally {
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const PreviewIcon = item ? previewIconMap[item.type] : ImageIcon;
  const fileExtension = displayName.split(".").pop()?.toUpperCase();
  const missingAlt = item ? hasMissingImageAlt(item) : false;
  const dimensionText = item ? formatDimensions(item) : "Unknown";
  const usageCount = usageState === "loaded" ? usageItems.length : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div className="space-y-1">
            <SheetTitle>Media Details</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {item ? displayName : "Select a file to preview details."}
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        {item ? (
          <>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-8 px-6 pb-8 pt-6">
                <div className="space-y-4">
                  <div className="group relative overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-soft">
                    <div className="aspect-video w-full">
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={item.alt ?? displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/30">
                          <PreviewIcon className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 bg-background/90 hover:bg-background"
                        onClick={handleOpenAsset}
                        aria-label="Open asset preview"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 bg-background/90 hover:bg-background"
                        aria-label="Download asset"
                        asChild
                      >
                        <a href={item.url} download={originalName || displayName}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold">{displayName}</p>
                        {missingAlt ? (
                          <Badge variant="warning" className="shrink-0 text-[10px]">
                            Missing alt
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(item.sizeBytes)} · {item.mimeType}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {fileExtension ?? item.type}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Metadata
                    </div>
                    <div className="text-xs text-muted-foreground" aria-live="polite">
                      {saveStatus === "saving" ? "Saving..." : null}
                      {saveStatus === "saved" ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" />
                          Saved
                        </span>
                      ) : null}
                      {saveStatus === "error" ? (
                        <span className="text-destructive">Save failed</span>
                      ) : null}
                    </div>
                  </div>
                  {originalName ? (
                    <div className="space-y-2">
                      <label
                        htmlFor={`media-original-${item.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Original File Name
                      </label>
                      <Input
                        id={`media-original-${item.id}`}
                        value={originalName}
                        readOnly
                        className="bg-muted/30"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Original File Name
                      </div>
                      <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        Not available for this asset.
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label
                      htmlFor={`media-title-${item.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Title
                    </label>
                    <Input
                      id={`media-title-${item.id}`}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      onBlur={handleSaveMeta}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`media-alt-${item.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Alt Text
                    </label>
                    <Input
                      id={`media-alt-${item.id}`}
                      value={alt}
                      onChange={(event) => setAlt(event.target.value)}
                      onBlur={handleSaveMeta}
                      className="bg-muted/30"
                    />
                    {missingAlt ? (
                      <p className="text-xs text-warning">Image alt text is missing.</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`media-caption-${item.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Caption
                    </label>
                    <Textarea
                      id={`media-caption-${item.id}`}
                      rows={3}
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      onBlur={handleSaveMeta}
                      className="bg-muted/30"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Organization
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`media-folder-${item.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Folder
                    </label>
                    <select
                      id={`media-folder-${item.id}`}
                      value={folderId ?? ""}
                      onChange={(event) => {
                        const next = event.target.value ? event.target.value : null;
                        setFolderId(next);
                        void persist({ folderId: next });
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 text-sm"
                    >
                      <option value="">— No folder —</option>
                      {(folders ?? []).map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tags
                    </div>
                    <TagInput
                      value={tags}
                      onChange={(next) => {
                        setTags(next);
                        void persist({ tags: next });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`media-description-${item.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Description
                    </label>
                    <Textarea
                      id={`media-description-${item.id}`}
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      onBlur={handleSaveMeta}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`media-credit-${item.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Credit
                    </label>
                    <Input
                      id={`media-credit-${item.id}`}
                      value={credit}
                      onChange={(event) => setCredit(event.target.value)}
                      onBlur={handleSaveMeta}
                      className="bg-muted/30"
                    />
                  </div>
                  {item.type === "image" && item.url ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Focal point
                      </div>
                      <FocalPointPicker
                        src={item.url}
                        alt={item.alt ?? displayName}
                        focalX={focalX}
                        focalY={focalY}
                        onChange={(x, y) => {
                          setFocalX(x);
                          setFocalY(y);
                          void persist({ focalX: x, focalY: y });
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Info className="h-4 w-4" />
                    File Information
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Size
                      </p>
                      <p className="text-sm font-medium">{formatBytes(item.sizeBytes)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Dimensions
                      </p>
                      <p className="text-sm font-medium">{dimensionText}</p>
                      {dimensionState === "recovering" ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">Recovering...</p>
                      ) : null}
                      {dimensionState === "recovered" || dimensionState === "error" ? (
                        <p
                          className={
                            dimensionState === "error"
                              ? "mt-1 text-[11px] text-destructive"
                              : "mt-1 text-[11px] text-success"
                          }
                        >
                          {dimensionMessage}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Type
                      </p>
                      <p className="break-all text-sm font-medium">{item.mimeType}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Uploaded
                      </p>
                      <p className="text-sm font-medium">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Link2 className="h-4 w-4" />
                    Usage ({usageCount} locations)
                  </div>
                  {usageState === "loading" ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Loading usage...
                    </div>
                  ) : null}
                  {usageState === "error" ? (
                    <div className="rounded-2xl border border-destructive/40 p-4 text-sm text-destructive">
                      {usageError ?? "Failed to load usage."}
                    </div>
                  ) : null}
                  {usageState === "loaded" && usageItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      This asset is not used by tracked admin content.
                    </div>
                  ) : null}
                  {usageState === "loaded" && usageItems.length > 0 ? (
                    <div className="space-y-2">
                      {usageItems.map((usage) => {
                        const UsageIcon = usageIconMap[usage.type];
                        return (
                          <AdminLink
                            key={usage.id}
                            href={usage.adminHref}
                            prefetch
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted/40"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/40">
                                <UsageIcon className="h-4 w-4 text-muted-foreground" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{usage.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {usage.context}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </AdminLink>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </ScrollArea>
            <div className="border-t bg-muted/30 px-6 py-4">
              <input
                ref={replaceInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  handleReplaceFile(event.currentTarget.files?.[0]).catch(() => undefined);
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!onReplace || replaceStatus === "replacing"}
                  onClick={() => replaceInputRef.current?.click()}
                >
                  <UploadCloud className="h-4 w-4" />
                  {replaceStatus === "replacing" ? "Replacing..." : "Replace"}
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4" />
                  {copyStatus === "copied" ? "Copied" : "Copy URL"}
                </Button>
              </div>
              {copyStatus === "error" ? (
                <p className="mt-2 text-xs text-destructive">Copy failed.</p>
              ) : null}
              {replaceStatus === "replaced" ? (
                <p className="mt-2 text-xs text-success">Asset replaced.</p>
              ) : null}
              {replaceStatus === "error" ? (
                <p className="mt-2 text-xs text-destructive">Replace failed.</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full gap-2" onClick={handleOpenAsset}>
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
                <Button variant="destructive" className="w-full gap-2" onClick={handleDeleteAsset}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">No media selected</p>
            <p>Select an item to review details and update metadata.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
