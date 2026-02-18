import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  createListingTemplate,
  deleteListingTemplate,
  updateListingTemplate,
  type ListingTemplateLayout,
} from "@/services/listingsClient";

import { listingLayoutOptions } from "./defaults";
import { useListingTemplates } from "./hooks/useListingTemplates";

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

type TemplateFormState = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  layout: ListingTemplateLayout;
};

const emptyTemplateForm = (): TemplateFormState => ({
  id: null,
  name: "",
  slug: "",
  description: "",
  layout: "grid",
});

export function ListingTemplateManager() {
  const { items, isLoading, error, refresh } = useListingTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [items]
  );

  const openCreate = () => {
    setSaveError(null);
    setForm(emptyTemplateForm());
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const current = items.find((entry) => entry.id === id);
    if (!current) return;
    setSaveError(null);
    setForm({
      id: current.id,
      name: current.name,
      slug: current.slug,
      description: current.description ?? "",
      layout: current.layout,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteListingTemplate(id);
      await refresh(true);
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to delete listing template.");
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (form.id) {
        await updateListingTemplate(form.id, {
          name: form.name,
          slug: form.slug || null,
          description: form.description || null,
          layout: form.layout,
        });
      } else {
        await createListingTemplate({
          name: form.name,
          slug: form.slug || null,
          description: form.description || null,
          layout: form.layout,
        });
      }
      await refresh(true);
      setDialogOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save listing template.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Listing Templates</CardTitle>
          <CardDescription>
            Reusable display presets for listing widgets and cards.
          </CardDescription>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load templates</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {saveError ? (
          <Alert variant="destructive">
            <AlertTitle>Template action failed</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[14rem] pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Template
                </TableHead>
                <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                  Layout
                </TableHead>
                <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                  Updated
                </TableHead>
                <TableHead className="w-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    {isLoading ? "Loading templates..." : "No listing templates yet."}
                  </TableCell>
                </TableRow>
              ) : null}
              {sortedItems.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="py-6 pl-6">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.description ?? "No description"}
                      </span>
                      <span className="text-xs text-muted-foreground">/{template.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden px-4 py-6 md:table-cell">
                    <Badge variant="outline" className="capitalize">
                      {template.layout}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden px-4 py-6 text-sm text-muted-foreground lg:table-cell">
                    {formatDate(template.updatedAt)}
                  </TableCell>
                  <TableCell className="w-12 py-6 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEdit(template.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(template.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit listing template" : "New listing template"}
            </DialogTitle>
            <DialogDescription>
              Define a reusable layout preset for dynamic lists and cards.
            </DialogDescription>
          </DialogHeader>

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
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                placeholder="Optional description for your team"
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
