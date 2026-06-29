import { useMemo, useState } from "react";
import { CircleCheck, Pencil, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { SeoItem } from "./SeoTable";

type SeoDrawerProps = {
  item: SeoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    payload: { title: string; description: string; canonicalUrl: string; robots: string }
  ) => void;
  isSaving?: boolean;
  error?: string | null;
};

const titleMax = 60;
const descriptionMax = 160;

function getCountTone(length: number, max: number) {
  if (length === 0) return "text-muted-foreground";
  if (length <= max) return "text-success";
  return "text-warning";
}

export function SeoDrawer({
  item,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  error,
}: SeoDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SeoDrawerContent
        key={`${item?.id ?? "empty"}:${item?.metaTitle ?? ""}:${item?.metaDescription ?? ""}:${item?.canonicalUrl ?? ""}:${item?.robots ?? ""}`}
        item={item}
        onSave={onSave}
        isSaving={isSaving}
        error={error}
      />
    </Sheet>
  );
}

type SeoDrawerContentProps = {
  item: SeoItem | null;
  onSave: (
    id: string,
    payload: { title: string; description: string; canonicalUrl: string; robots: string }
  ) => void;
  isSaving: boolean;
  error?: string | null;
};

function SeoDrawerContent({ item, onSave, isSaving, error }: SeoDrawerContentProps) {
  const [metaTitle, setMetaTitle] = useState(item?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(item?.metaDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(item?.canonicalUrl ?? "");
  const [robots, setRobots] = useState(item?.robots ?? "");

  const titleCount = metaTitle.length;
  const descriptionCount = metaDescription.length;
  const hasChanges =
    metaTitle !== (item?.metaTitle ?? "") ||
    metaDescription !== (item?.metaDescription ?? "") ||
    canonicalUrl !== (item?.canonicalUrl ?? "") ||
    robots !== (item?.robots ?? "");

  const handleDiscard = () => {
    setMetaTitle(item?.metaTitle ?? "");
    setMetaDescription(item?.metaDescription ?? "");
    setCanonicalUrl(item?.canonicalUrl ?? "");
    setRobots(item?.robots ?? "");
  };

  const analysisTone = useMemo(() => {
    if (item?.analysisStatus === "attention") {
      return {
        container: "border-warning/30 bg-warning-soft text-warning",
        icon: "text-warning",
      };
    }
    return {
      container: "border-success/30 bg-success-soft text-success",
      icon: "text-success",
    };
  }, [item?.analysisStatus]);

  const analysisTitle =
    item?.analysisStatus === "attention" ? "Needs Attention" : "Analysis Passed";

  return (
    <SheetContent
      side="right"
      overlayClassName="bg-slate-900/40 backdrop-blur-sm"
      className="flex h-full w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl"
      showCloseButton={false}
    >
      <SheetTitle className="sr-only">Quick SEO Edit</SheetTitle>
      <SheetDescription className="sr-only">
        Edit the public SEO title and description for the selected page.
      </SheetDescription>
      <div className="flex items-center justify-between border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pencil className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Quick SEO Edit
            </p>
            <p className="text-sm font-semibold text-foreground">
              {item?.title ?? "No page selected"}
            </p>
          </div>
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Search Engine Preview
          </p>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              {item?.previewUrl ?? "https://coderso.com"}
              <span className="text-muted-foreground/70">
                {item?.previewPath ? ` › ${item.previewPath}` : ""}
              </span>
            </p>
            <p className="mt-1 text-base font-semibold text-info">
              {metaTitle || "Add a meta title"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {metaDescription || "Add a meta description to improve click-through rates."}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Meta Title</label>
              <span className={cn("text-[10px] font-medium", getCountTone(titleCount, titleMax))}>
                {titleCount} / {titleMax} characters
              </span>
            </div>
            <Input
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
              placeholder="Add a concise, keyword-rich title"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Meta Description</label>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  getCountTone(descriptionCount, descriptionMax)
                )}
              >
                {descriptionCount} / {descriptionMax} characters
              </span>
            </div>
            <Textarea
              rows={4}
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
              placeholder="Summarize the page in one or two sentences."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Canonical URL</label>
            <Input
              value={canonicalUrl}
              onChange={(event) => setCanonicalUrl(event.target.value)}
              placeholder="https://example.com/page"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Robots</label>
            <Input
              value={robots}
              onChange={(event) => setRobots(event.target.value)}
              placeholder="index,follow"
            />
          </div>
          {item?.keywords.length ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Focus Keywords</label>
              <div className="flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="px-3 py-1 text-xs text-muted-foreground"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn("rounded-xl border px-4 py-4", analysisTone.container)}>
          <div className="flex items-center gap-2">
            <CircleCheck className={cn("h-4 w-4", analysisTone.icon)} />
            <p className="text-xs font-semibold uppercase">{analysisTitle}</p>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {(
              item?.analysisNotes ?? [
                "Keyword found in Title and Meta Description",
                "Optimal length for both Title and Description",
                "Fast loading time detected for this page",
              ]
            ).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t bg-muted/30 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDiscard}
            disabled={!item || isSaving || !hasChanges}
          >
            Discard
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              if (!item) return;
              onSave(item.id, {
                title: metaTitle,
                description: metaDescription,
                canonicalUrl,
                robots,
              });
            }}
            disabled={!item || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Update SEO"}
          </Button>
        </div>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
      </div>
    </SheetContent>
  );
}
