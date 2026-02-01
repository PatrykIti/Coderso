import { Globe, Settings, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

import type { PageDetail } from "@/services/pagesClient";

type PageSettingsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PageDetail | null;
  onSave: (payload: { title: string; slug: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export function PageSettingsDrawer({
  open,
  onOpenChange,
  page,
  onSave,
  isSubmitting = false,
  error,
}: PageSettingsDrawerProps) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && slug.trim().length > 0;
  }, [slug, title]);

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    const normalizedSlug = slug.startsWith("/") ? slug : `/${slug}`;
    onSave({ title: title.trim(), slug: normalizedSlug });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Page settings</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Update the page title and URL slug.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close page settings">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 px-6 py-6">
          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to update page</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Page title
              </label>
              <Input
                placeholder="e.g. About us"
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) {
                    const nextSlug = nextTitle.trim()
                      ? `/${slugify(nextTitle)}`
                      : "";
                    setSlug(nextSlug);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slug
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="/about"
                  className="pl-9"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>Settings apply instantly to drafts.</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
