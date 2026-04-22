import { Globe, LayoutTemplate, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PageCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    title: string;
    slug: string;
    template?: string;
    openAfterCreate: boolean;
  }) => Promise<void> | void;
  openAfterCreate: boolean;
  onOpenAfterCreateChange: (value: boolean) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export function PageCreateDrawer({
  open,
  onOpenChange,
  onCreate,
  openAfterCreate,
  onOpenAfterCreateChange,
  isSubmitting = false,
  error,
}: PageCreateDrawerProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("landing");
  const [slugTouched, setSlugTouched] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && slug.trim().length > 0;
  }, [slug, title]);
  const titleHint =
    title.trim().length === 0
      ? "Add a page title to generate a slug and enable Create Page."
      : slug.trim().length === 0
        ? "Enter a slug to enable Create Page."
        : "Ready to create the page.";

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    const normalizedSlug = slug.startsWith("/") ? slug : `/${slug}`;
    onCreate({
      title: title.trim(),
      slug: normalizedSlug,
      template,
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
            <SheetTitle>Create New Page</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Start with a template and publish when ready.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close create page drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 px-6 py-6">
          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create page</AlertTitle>
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
                aria-describedby="page-create-title-hint"
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) {
                    const nextSlug = nextTitle.trim() ? `/${slugify(nextTitle)}` : "";
                    setSlug(nextSlug);
                  }
                }}
              />
              <p
                id="page-create-title-hint"
                className="text-xs text-muted-foreground"
              >
                {title.trim().length === 0
                  ? "Title is required before you can create the page."
                  : "The slug is generated from the title until you edit it."}
              </p>
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
            <Separator />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Template
              </label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="h-10">
                  <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing">Landing Page</SelectItem>
                  <SelectItem value="about">About</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="custom">Blank Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="page-open-after-create"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="page-open-after-create"
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
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Page"}
              </Button>
            </div>
          </div>
          {!canSubmit ? (
            <p className="mt-3 text-xs text-muted-foreground">{titleHint}</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
