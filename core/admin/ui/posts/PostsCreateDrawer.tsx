import { Globe, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  resolvePostSlugDisplay,
  type PostSlugRouteContext,
} from "@/services/siteSettingsClient";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type PostsCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    title: string;
    slug: string;
    openAfterCreate: boolean;
  }) => Promise<void> | void;
  openAfterCreate: boolean;
  onOpenAfterCreateChange: (value: boolean) => void;
  isSubmitting?: boolean;
  error?: string | null;
  slugRouteContext?: PostSlugRouteContext | null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export function PostsCreateDrawer({
  open,
  onOpenChange,
  onCreate,
  openAfterCreate,
  onOpenAfterCreateChange,
  isSubmitting = false,
  error,
  slugRouteContext = null,
}: PostsCreateDrawerProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && slug.trim().length > 0;
  }, [slug, title]);
  const slugDisplay = useMemo(
    () => (slugRouteContext ? resolvePostSlugDisplay(slugRouteContext, slug) : null),
    [slug, slugRouteContext]
  );

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    onCreate({
      title: title.trim(),
      slug: slugify(slug),
      openAfterCreate,
    });
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
            <SheetTitle>Create New Post</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Start a new article and publish when ready.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close create post drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 px-6 py-6">
          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create post</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Post title
              </label>
              <Input
                placeholder="e.g. Product launch update"
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) {
                    setSlug(nextTitle.trim() ? slugify(nextTitle) : "");
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
                  placeholder="product-launch-update"
                  className="pl-9"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                />
              </div>
              {slugDisplay ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{slugDisplay.label}:</span>{" "}
                  {slugDisplay.value}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="post-open-after-create"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="post-open-after-create"
                checked={openAfterCreate}
                onCheckedChange={(checked) =>
                  onOpenAfterCreateChange(checked === true)
                }
              />
              Open in editor after create
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
