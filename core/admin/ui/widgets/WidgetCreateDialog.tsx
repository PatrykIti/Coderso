import { Code2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { listRegisteredPageWidgets } from "@/ui/widgets/registry";
import { createBlock } from "@/ui/pages/builder/blockUtils";
import type { WidgetTemplateCategory } from "@/services/widgetTemplateCategoriesClient";

type WidgetCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WidgetTemplateCategory[];
  onCreate?: (payload: {
    name: string;
    description?: string | null;
    category: string;
    blocks: Array<Record<string, unknown>>;
  }) => Promise<void> | void;
};

const NO_CATEGORIES_VALUE = "no-categories";

export function WidgetCreateDialog({
  open,
  onOpenChange,
  categories,
  onCreate,
}: WidgetCreateDialogProps) {
  const widgets = useMemo(() => listRegisteredPageWidgets(), []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [baseTemplate, setBaseTemplate] = useState("blank");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName("");
      setDescription("");
      setCategory(categories[0]?.name ?? "");
      setBaseTemplate("blank");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) return;
    if (!category && categories.length > 0) {
      setCategory(categories[0].name);
    }
  }, [open, category, categories]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a widget name.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const blocks = baseTemplate === "blank" ? [] : [createBlock(baseTemplate)];
      await onCreate?.({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        category,
        blocks,
      });
      handleOpenChange(false);
    } catch {
      setError("Failed to create template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Custom Widget</DialogTitle>
            <DialogDescription>
              Create a reusable widget template for your pages.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close custom widget dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Widget name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Featured Service Card"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea
              rows={3}
              placeholder="Explain the purpose of this widget."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value={NO_CATEGORIES_VALUE} disabled>
                      Add a category first
                    </SelectItem>
                  ) : (
                    categories.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Base template
              </label>
              <Select value={baseTemplate} onValueChange={setBaseTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Start from..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank</SelectItem>
                  {widgets.map((widget) => (
                    <SelectItem key={widget.type} value={widget.type}>
                      {widget.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Code2 className="h-4 w-4 text-primary" />
              Developer note
            </div>
            <p className="mt-2">
              Custom widgets can be reused across pages. Updates will apply everywhere
              the widget is used.
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSaving}>
            {isSaving ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
