import { BookOpen, Hash, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import {
  createContentType,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";

import { buildSchemaFromFields } from "./schemaMapping";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

type ContentTypeCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTypes?: Array<{ name: string; slug: string }>;
  onCreated?: (type: ContentTypeSummary) => void;
  onCreateError?: (error: unknown) => void;
};

export function ContentTypeCreateDrawer({
  open,
  onOpenChange,
  existingTypes = [],
  onCreated,
  onCreateError,
}: ContentTypeCreateDrawerProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(name ? slugify(name) : "");
    }
  }, [name, slugTouched]);

  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setError(null);
      setIsSaving(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    const normalizedName = name.trim().toLowerCase();
    const normalizedSlug = slug.trim().toLowerCase();
    if (existingTypes.some((type) => type.name.trim().toLowerCase() === normalizedName)) {
      setError("Content type name already exists.");
      return;
    }
    if (existingTypes.some((type) => type.slug.trim().toLowerCase() === normalizedSlug)) {
      setError("Content type slug already exists.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const created = await createContentType({
        name: name.trim(),
        slug: normalizedSlug,
        schema: buildSchemaFromFields([]),
        status: "draft",
      });
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create content type.");
      }
      onCreateError?.(err);
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateName = existingTypes.some(
    (type) => type.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  const duplicateSlug = existingTypes.some(
    (type) => type.slug.trim().toLowerCase() === slug.trim().toLowerCase()
  );
  const isDisabled = !name.trim() || !slug.trim() || duplicateName || duplicateSlug || isSaving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Create New Collection</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Define the content type before building fields.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close content type drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 space-y-4 px-6 py-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Name
              </label>
              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Blog Post"
                  className="pl-9"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              {duplicateName ? (
                <p className="text-xs text-destructive">
                  This name is already used by another content type.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slug
              </label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="blog-posts"
                  className="pl-9"
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugTouched(true);
                  }}
                />
              </div>
              {duplicateSlug ? (
                <p className="text-xs text-destructive">
                  This slug is already used by another content type.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isDisabled}>
              {isSaving ? "Creating..." : "Create Collection"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
