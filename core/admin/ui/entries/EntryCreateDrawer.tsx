import { FileText, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import { getContentTypeLabels } from "./contentTypeLabels";
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
  onCreated?: (entry: EntryDetail, typeSlug: string, openAfterCreate: boolean) => void;
  onCreateError?: (error: unknown) => void;
};

export function EntryCreateDrawer({
  open,
  onOpenChange,
  types,
  defaultTypeSlug,
  onCreated,
  onCreateError,
}: EntryCreateDrawerProps) {
  const [typeSlug, setTypeSlug] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [openAfterCreate, setOpenAfterCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resolvedSlug = slugTouched ? slug : title ? slugify(title) : "";
  const resolvedTypeSlug = typeSlug || defaultTypeSlug || "";

  const resetForm = () => {
    setTypeSlug("");
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setOpenAfterCreate(true);
    setError(null);
    setIsSaving(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const typeOptions = useMemo(() => types, [types]);
  const selectedType = useMemo(
    () => types.find((type) => type.slug === resolvedTypeSlug) ?? null,
    [types, resolvedTypeSlug]
  );
  const { singular: typeSingular } = getContentTypeLabels(
    selectedType?.name ?? typeSlug
  );

  const handleSubmit = async () => {
    if (!resolvedTypeSlug || !title.trim() || !resolvedSlug.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await createEntry(resolvedTypeSlug, {
        title: title.trim(),
        slug: resolvedSlug.trim(),
        data: {},
      });
      onCreated?.(created, resolvedTypeSlug, openAfterCreate);
      handleOpenChange(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create entry.");
      }
      onCreateError?.(err);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled =
    !resolvedTypeSlug || !title.trim() || !resolvedSlug.trim() || isSaving;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>{`Create New ${typeSingular}`}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Select a content type and start drafting.
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
                Content type
              </label>
              <Select value={resolvedTypeSlug} onValueChange={setTypeSlug}>
                <SelectTrigger className="h-10">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select content type" />
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
                value={resolvedSlug}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="entry-open-after-create"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="entry-open-after-create"
                checked={openAfterCreate}
                onCheckedChange={(checked) =>
                  setOpenAfterCreate(checked === true)
                }
              />
              Open in editor after create
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isDisabled}>
                {isSaving ? "Creating..." : "Create Draft"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
