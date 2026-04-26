import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createListingTemplate,
  updateListingTemplate,
  type ListingTemplateConfig,
  type ListingTemplateLayout,
  type ListingTemplateRecord,
} from "@/services/listingsClient";

import { BindingEditor } from "./components/BindingEditor";
import { listingLayoutOptions } from "./defaults";
import { listingTemplateToasts } from "./listingActionToasts";

type TemplateFormState = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  layout: ListingTemplateLayout;
  config: ListingTemplateConfig;
};

type ListingTemplateManagerProps = {
  items: ListingTemplateRecord[];
  createOpen: boolean;
  editingTemplateId: string | null;
  onCreateOpenChange: (open: boolean) => void;
  onEditingTemplateIdChange: (id: string | null) => void;
  onSaved: (input: {
    action: "create" | "update";
    template: ListingTemplateRecord;
  }) => void | Promise<void>;
};

const defaultTemplateConfig = (): ListingTemplateConfig => ({
  fields: [],
  itemActions: [],
  emptyState: {
    title: "No items found",
    description: null,
    ctaLabel: null,
    ctaHref: null,
  },
  style: {
    columns: 3,
    gap: "md",
    cardVariant: "default",
  },
});

const cloneTemplateConfig = (
  config: ListingTemplateConfig
): ListingTemplateConfig => ({
  fields: config.fields.map((field) => ({
    ...field,
    conditions: Array.isArray(field.conditions)
      ? field.conditions.map((condition) => ({ ...condition }))
      : [],
  })),
  itemActions: config.itemActions.map((item) => ({ ...item })),
  emptyState: { ...config.emptyState },
  style: { ...config.style },
});

const emptyTemplateForm = (): TemplateFormState => ({
  id: null,
  name: "",
  slug: "",
  description: "",
  layout: "grid",
  config: defaultTemplateConfig(),
});

export function ListingTemplateManager({
  items,
  createOpen,
  editingTemplateId,
  onCreateOpenChange,
  onEditingTemplateIdChange,
  onSaved,
}: ListingTemplateManagerProps) {
  const [form, setForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dialogOpen = createOpen || editingTemplateId !== null;

  useEffect(() => {
    if (createOpen) {
      setSaveError(null);
      setForm(emptyTemplateForm());
      return;
    }

    if (!editingTemplateId) return;
    const current = items.find((entry) => entry.id === editingTemplateId);
    if (!current) {
      setSaveError("Listing template not found.");
      return;
    }
    setSaveError(null);
    setForm({
      id: current.id,
      name: current.name,
      slug: current.slug,
      description: current.description ?? "",
      layout: current.layout,
      config: cloneTemplateConfig(current.config ?? defaultTemplateConfig()),
    });
  }, [createOpen, editingTemplateId, items]);

  const closeDialog = () => {
    onCreateOpenChange(false);
    onEditingTemplateIdChange(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
      return;
    }
    if (!editingTemplateId) {
      onCreateOpenChange(true);
    }
  };

  const handleSave = async () => {
    const action = form.id ? "update" : "create";
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = form.id
        ? await updateListingTemplate(form.id, {
            name: form.name,
            slug: form.slug || null,
            description: form.description || null,
            layout: form.layout,
            config: form.config,
          })
        : await createListingTemplate({
            name: form.name,
            slug: form.slug || null,
            description: form.description || null,
            layout: form.layout,
            config: form.config,
          });
      listingTemplateToasts.success(action, { targetLabel: saved.name });
      await onSaved({ action, template: saved });
    } catch (err) {
      setSaveError(listingTemplateToasts.error(action, err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {form.id ? "Edit listing template" : "New listing template"}
          </DialogTitle>
          <DialogDescription>
            Define a reusable layout preset for dynamic lists and cards.
          </DialogDescription>
        </DialogHeader>

        {saveError ? (
          <Alert variant="destructive">
            <AlertTitle>Template action failed</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Homepage cards"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Slug</span>
            <Input
              value={form.slug}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, slug: event.target.value }))
              }
              placeholder="homepage-cards"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Layout</span>
            <Select
              value={form.layout}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  layout: value as ListingTemplateLayout,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                {listingLayoutOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Description</span>
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional description for your team"
            />
          </label>

          <BindingEditor
            value={form.config.fields}
            onChange={(fields) =>
              setForm((prev) => ({
                ...prev,
                config: {
                  ...prev.config,
                  fields,
                },
              }))
            }
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
