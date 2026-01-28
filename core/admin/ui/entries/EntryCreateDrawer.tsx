import { FileText, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
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
import { isApiClientError } from "@/services/apiClient";
import {
  createEntry,
  type EntryDetail,
} from "@/services/entriesClient";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

type EntryCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: Array<{ id: string; slug: string; name: string }>;
  defaultTypeSlug?: string | null;
  onCreated?: (entry: EntryDetail, typeSlug: string) => void;
};

export function EntryCreateDrawer({
  open,
  onOpenChange,
  types,
  defaultTypeSlug,
  onCreated,
}: EntryCreateDrawerProps) {
  const [typeSlug, setTypeSlug] = useState<string>(defaultTypeSlug ?? "");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(title ? slugify(title) : "");
    }
  }, [title, slugTouched]);

  useEffect(() => {
    if (open) return;
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setError(null);
    setIsSaving(false);
  }, [open]);

  useEffect(() => {
    if (!defaultTypeSlug) return;
    setTypeSlug(defaultTypeSlug);
  }, [defaultTypeSlug]);

  const typeOptions = useMemo(() => types, [types]);

  const handleSubmit = async () => {
    if (!typeSlug || !title.trim() || !slug.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await createEntry(typeSlug, {
        title: title.trim(),
        slug: slug.trim(),
        data: {},
      });
      onCreated?.(created, typeSlug);
      onOpenChange(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create entry.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = !typeSlug || !title.trim() || !slug.trim() || isSaving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Create New Entry</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Select a collection and start drafting.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close create entry drawer">
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
                Collection
              </label>
              <Select value={typeSlug} onValueChange={setTypeSlug}>
                <SelectTrigger className="h-10">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Title
              </label>
              <Input
                placeholder="e.g. Launch announcement"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slug
              </label>
              <Input
                placeholder="launch-announcement"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugTouched(true);
                }}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Tags
              </label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="news, release, update" className="pl-9" />
              </div>
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
              {isSaving ? "Creating..." : "Create Draft"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
