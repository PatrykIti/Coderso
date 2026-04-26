import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

import type { WidgetTemplateCategory } from "@/services/widgetTemplateCategoriesClient";

type WidgetTemplateCategoryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WidgetTemplateCategory[];
  onCreate: (name: string) => Promise<void> | void;
  onUpdate: (id: string, name: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  error?: string | null;
};

export function WidgetTemplateCategoryDrawer({
  open,
  onOpenChange,
  categories,
  onCreate,
  onUpdate,
  onDelete,
  error,
}: WidgetTemplateCategoryDrawerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewName("");
    setEditingId(null);
    setEditingName("");
    setPendingDeleteId(null);
    setActionError(null);
  }, [open]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setActionError("Category name is required.");
      return;
    }
    setIsWorking(true);
    setActionError(null);
    try {
      await onCreate(trimmed);
      setNewName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setActionError("Category name is required.");
      return;
    }
    setIsWorking(true);
    setActionError(null);
    try {
      await onUpdate(editingId, trimmed);
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update category.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsWorking(true);
    setActionError(null);
    try {
      await onDelete(id);
      setPendingDeleteId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete category.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Template categories</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Organize templates by managing their categories.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close categories panel">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-6">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                New category
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Footer layouts"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
                <Button size="sm" onClick={handleCreate} disabled={isWorking}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {error || actionError ? (
              <Alert variant="destructive">
                <AlertDescription>{error ?? actionError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Existing categories
              </p>
              {categories.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground">
                  No categories yet. Add your first one above.
                </div>
              ) : (
                categories.map((category) => {
                  const isEditing = editingId === category.id;
                  const isDeleting = pendingDeleteId === category.id;
                  return (
                    <div key={category.id} className="space-y-2">
                      <div
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                          isEditing
                            ? "border-primary/40 bg-primary/5"
                            : isDeleting
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-border/60 bg-muted/20"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {category.name}
                            </span>
                            {isEditing ? <Badge variant="outline">Editing</Badge> : null}
                            {isDeleting ? <Badge variant="destructive">Deleting</Badge> : null}
                          </div>
                          {isEditing ? (
                            <Input
                              aria-label={`New name for ${category.name}`}
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              className="h-8 text-xs"
                            />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleUpdate}
                                disabled={isWorking}
                                aria-label={`Save changes to ${category.name}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                                disabled={isWorking}
                                aria-label={`Cancel editing ${category.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingId(category.id);
                                  setEditingName(category.name);
                                  setPendingDeleteId(null);
                                }}
                                aria-label={`Edit ${category.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setPendingDeleteId(category.id);
                                  setEditingId(null);
                                }}
                                aria-label={`Delete ${category.name}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isDeleting ? (
                        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
                          <span>
                            Delete category <span className="font-medium">{category.name}</span>?
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setPendingDeleteId(null)}
                              disabled={isWorking}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => handleDelete(category.id)}
                              disabled={isWorking}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
