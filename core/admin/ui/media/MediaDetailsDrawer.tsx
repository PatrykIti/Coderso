import { useState } from "react"
import {
  ChevronRight,
  Copy,
  Download,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

import type { MediaItem, MediaMetaUpdate } from "./types"
import { formatBytes, formatDate } from "./utils"

export type MediaDetailsDrawerProps = {
  item: MediaItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, meta: MediaMetaUpdate) => void
  onDelete: (id: string) => void
  onCopy: (url: string) => void
  onOpen: (url: string) => void
}

const usageItems = [
  {
    id: "usage-1",
    title: "How to Setup Nextless CMS",
    context: "Knowledge base article",
    icon: FileText,
  },
  {
    id: "usage-2",
    title: "Homepage Hero Section",
    context: "Landing page module",
    icon: ImageIcon,
  },
  {
    id: "usage-3",
    title: "Product Feature Grid",
    context: "Marketing page block",
    icon: Link2,
  },
]

const previewIconMap = {
  image: ImageIcon,
  document: FileText,
  audio: FileAudio,
}

export function MediaDetailsDrawer({
  item,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onCopy,
  onOpen,
}: MediaDetailsDrawerProps) {
  const [title, setTitle] = useState(item?.title ?? item?.name ?? "")
  const [alt, setAlt] = useState(item?.alt ?? "")
  const [caption, setCaption] = useState(item?.caption ?? "")

  const handleSaveMeta = () => {
    if (!item) return
    onSave(item.id, { title, alt, caption })
  }

  const handleOpenAsset = () => {
    if (!item) return
    onOpen(item.url)
  }

  const handleCopyUrl = () => {
    if (!item) return
    onCopy(item.url)
  }

  const handleDeleteAsset = () => {
    if (!item) return
    onDelete(item.id)
  }

  const PreviewIcon = item ? previewIconMap[item.type] : ImageIcon
  const fileExtension = item?.name.split(".").pop()?.toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div className="space-y-1">
            <SheetTitle>Media Details</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {item ? item.name : "Select a file to preview details."}
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
            <ScrollArea className="flex-1">
              <div className="space-y-8 px-6 pb-8 pt-6">
                <div className="space-y-4">
                  <div className="group relative overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
                    <div className="aspect-video w-full">
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={item.alt ?? item.title ?? item.name}
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
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-9 w-9 bg-background/90 hover:bg-background"
                        onClick={handleOpenAsset}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {item.title ?? item.name}
                      </p>
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
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Metadata
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
                  </div>
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

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Info className="h-4 w-4" />
                    File Information
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Size
                      </p>
                      <p className="text-sm font-medium">
                        {formatBytes(item.sizeBytes)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Dimensions
                      </p>
                      <p className="text-sm font-medium">
                        {item.width && item.height
                          ? `${item.width} × ${item.height} px`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Type
                      </p>
                      <p className="text-sm font-medium">{item.mimeType}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Uploaded
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Link2 className="h-4 w-4" />
                    Usage ({usageItems.length} locations)
                  </div>
                  <div className="space-y-2">
                    {usageItems.map((usage) => {
                      const UsageIcon = usage.icon
                      return (
                        <button
                          key={usage.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-xl border bg-background/80 p-3 text-left transition hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40">
                              <UsageIcon className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <div>
                              <p className="text-sm font-medium">{usage.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {usage.context}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="border-t bg-muted/30 px-6 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Replace
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleCopyUrl}
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
              </div>
              <Button
                variant="destructive"
                className="mt-3 w-full gap-2"
                onClick={handleDeleteAsset}
              >
                <Trash2 className="h-4 w-4" />
                Delete Permanently
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">
              No media selected
            </p>
            <p>Select an item to review details and update metadata.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
