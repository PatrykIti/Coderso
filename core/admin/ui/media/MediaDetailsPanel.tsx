import { useState } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type { MediaItem, MediaMetaUpdate } from "./types";
import { formatBytes, formatDate } from "./utils";

type MediaDetailsPanelProps = {
  item: MediaItem | null;
  onSave: (id: string, meta: MediaMetaUpdate) => void;
  onDelete: (id: string) => void;
  onCopy: (url: string) => void;
  onOpen: (url: string) => void;
};

export function MediaDetailsPanel({
  item,
  onSave,
  onDelete,
  onCopy,
  onOpen,
}: MediaDetailsPanelProps) {
  const displayName = item?.name ?? "";
  const originalName = item?.originalName ?? "";
  const [title, setTitle] = useState(item?.title ?? "");
  const [alt, setAlt] = useState(item?.alt ?? "");
  const [caption, setCaption] = useState(item?.caption ?? "");

  if (!item) {
    return (
      <div className="flex h-full flex-col gap-4">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Select an asset to see details and edit metadata.
        </div>
      </div>
    );
  }

  const handleSave = () => {
    onSave(item.id, { title, alt, caption });
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Details</h2>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Card className="border-border/60">
        <CardContent className="space-y-4">
          <div className="aspect-[4/3] rounded-lg bg-muted" />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="uppercase">Type</p>
              <p className="text-sm text-foreground">{item.mimeType}</p>
            </div>
            <div>
              <p className="uppercase">Size</p>
              <p className="text-sm text-foreground">
                {formatBytes(item.sizeBytes)}
              </p>
            </div>
            <div>
              <p className="uppercase">Dimensions</p>
              <p className="text-sm text-foreground">
                {item.width && item.height ? `${item.width} x ${item.height}` : "-"}
              </p>
            </div>
            <div>
              <p className="uppercase">Date</p>
              <p className="text-sm text-foreground">
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">File Name</label>
          <Input value={displayName} readOnly />
        </div>
        {originalName ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Original File Name</label>
            <Input value={originalName} readOnly />
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Alt Text</label>
          <Input value={alt} onChange={(event) => setAlt(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Caption</label>
          <Textarea
            rows={3}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="mt-auto space-y-3">
        <Button className="w-full" onClick={handleSave}>
          Save Changes
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => onCopy(item.url)}
        >
          <Copy className="h-4 w-4" />
          Copy Link
        </Button>
        <Button
          variant="ghost"
          className="w-full gap-2 text-muted-foreground"
          onClick={() => onOpen(item.url)}
        >
          <Link2 className="h-4 w-4" />
          Open in new tab
        </Button>
      </div>
    </div>
  );
}
