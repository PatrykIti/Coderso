import { ArrowLeft, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  createCommerceCollection,
  deleteCommerceCollection,
  listCommerceCollectionsCached,
  updateCommerceCollection,
  type CommerceCollectionRecord,
} from "@/services/commerceClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";

import {
  draftFromCollection,
  emptyCollectionDraft,
  isCollectionDraftValid,
  toCollectionInput,
  type CollectionDraft,
} from "./commerceCollectionModel";

/**
 * TASK-488-02-L01: collections management page (list + create/edit dialog +
 * delete confirm) wiring the existing `commerceClient` collection functions.
 * Reuses `AdminShell` / `PageHeader` / `ConfirmActionDialog` and the
 * `@/components/ui/*` primitives exactly like `CommerceListPage`.
 */
export function CommerceCollectionsPage() {
  const { navigate } = useAdminRouter();
  const [collections, setCollections] = useState<CommerceCollectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<CollectionDraft | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listCommerceCollectionsCached({ force: true })
      .then((items) => {
        if (active) setCollections(items);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(isApiClientError(loadError) ? loadError.message : "Failed to load collections.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!editing || !isCollectionDraftValid(editing)) return;
    setIsSaving(true);
    setError(null);
    try {
      if (editing.id) {
        await updateCommerceCollection(editing.id, toCollectionInput(editing));
      } else {
        await createCommerceCollection(toCollectionInput(editing));
      }
      const items = await listCommerceCollectionsCached({ force: true });
      setCollections(items);
      setEditing(null);
    } catch (saveError) {
      setError(isApiClientError(saveError) ? saveError.message : "Failed to save collection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteCommerceCollection(id);
      const items = await listCommerceCollectionsCached({ force: true });
      setCollections(items);
      setPendingDeleteId(null);
    } catch (deleteError) {
      setError(
        isApiClientError(deleteError) ? deleteError.message : "Failed to delete collection."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/advanced/commerce"
      breadcrumbs={["Coderso", "Commerce", "Collections"]}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Collections"
          description="Create and manage product collections."
          icon={<FolderPlus />}
          actions={
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/advanced/commerce")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to products
              </Button>
              <Button className="gap-2" onClick={() => setEditing(emptyCollectionDraft())}>
                <Plus className="h-4 w-4" />
                New collection
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Collections error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-card">
            Loading collections...
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-card">
            No collections yet. Create one to organize products into groups.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{collection.name}</span>
                    <Badge variant="soft">/{collection.slug}</Badge>
                  </div>
                  {collection.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setEditing(draftFromCollection(collection))}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPendingDeleteId(collection.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit collection" : "New collection"}</DialogTitle>
            <DialogDescription>
              Collections group products for filters and runtime widgets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label htmlFor="collection-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="collection-name"
                value={editing?.name ?? ""}
                placeholder="Premium"
                onChange={(event) =>
                  setEditing((current) =>
                    current ? { ...current, name: event.target.value } : current
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="collection-slug" className="text-sm font-medium">
                Slug
              </label>
              <Input
                id="collection-slug"
                value={editing?.slug ?? ""}
                placeholder="premium"
                onChange={(event) =>
                  setEditing((current) =>
                    current ? { ...current, slug: event.target.value } : current
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Optional. Derived from the name when left blank.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="collection-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="collection-description"
                rows={3}
                value={editing?.description ?? ""}
                placeholder="Optional description shown in admin lists."
                onChange={(event) =>
                  setEditing((current) =>
                    current ? { ...current, description: event.target.value } : current
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!editing || !isCollectionDraftValid(editing) || isSaving}
            >
              {isSaving ? "Saving..." : "Save collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete collection?"
        description="Products keep their other assignments; this removes the collection. This cannot be undone."
        confirmLabel="Delete collection"
        confirmingLabel="Deleting..."
        isConfirming={deletingId === pendingDeleteId}
        onConfirm={() => {
          if (pendingDeleteId) return handleDelete(pendingDeleteId);
        }}
      />
    </AdminShell>
  );
}
