import { FilePlus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";

import type { FormStatus } from "@/services/formsClient";

type FormCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    name: string;
    slug?: string | null;
    status: FormStatus;
    description?: string | null;
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

export function FormCreateDrawer({
  open,
  onOpenChange,
  onCreate,
  openAfterCreate,
  onOpenAfterCreateChange,
  isSubmitting = false,
  error,
}: FormCreateDrawerProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<FormStatus>("draft");
  const [description, setDescription] = useState("");

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);
  const nameHint =
    name.trim().length === 0
      ? "Name is required before you can create the form."
      : "The slug is generated from the name until you edit it.";

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    const trimmedSlug = slug.trim();
    onCreate({
      name: name.trim(),
      slug: trimmedSlug.length > 0 ? trimmedSlug : null,
      status,
      description: description.trim().length > 0 ? description.trim() : null,
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
            <SheetTitle>Create New Form</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Collect responses with a custom form layout.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close create form drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 px-6 py-6">
          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create form</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Form name
              </label>
              <Input
                placeholder="e.g. Contact form"
                value={name}
                aria-describedby="form-create-name-hint"
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!slugTouched) {
                    setSlug(nextName.trim() ? slugify(nextName) : "");
                  }
                }}
              />
              <p
                id="form-create-name-hint"
                className="text-xs text-muted-foreground"
              >
                {nameHint}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slug
              </label>
              <div className="relative">
                <FilePlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="contact-form"
                  className="pl-9"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Description
              </label>
              <Textarea
                rows={3}
                placeholder="Short summary for the forms list"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Status
              </label>
              <Select value={status} onValueChange={(value) => setStatus(value as FormStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="form-open-after-create"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="form-open-after-create"
                checked={openAfterCreate}
                onCheckedChange={(checked) =>
                  onOpenAfterCreateChange(checked === true)
                }
              />
              Open in builder after create
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create form"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
