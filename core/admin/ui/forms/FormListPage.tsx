import { Plus } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { createForm, deleteForm } from "@/services/formsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import { FormCreateDrawer } from "./FormCreateDrawer";
import { FormTable } from "./FormTable";
import { useForms } from "./hooks/useForms";

export function FormListPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = useForms();
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCreate = async (payload: {
    name: string;
    slug?: string | null;
    status: "draft" | "published" | "archived";
    description?: string | null;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createForm(payload);
      if (created) {
        navigate(`/forms/${encodeURIComponent(created.id)}`);
        setCreateOpen(false);
        return;
      }
      await refresh(true);
      setCreateOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Failed to create form.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitError(null);
    try {
      await deleteForm(id);
      await refresh(true);
    } catch (err) {
      if (isApiClientError(err)) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Failed to delete form.");
      }
    }
  };

  return (
    <AdminShell
      activeHref="/admin/forms"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Forms</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Forms"
          description="Build custom forms and embed them across pages."
          actions={
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New form
            </Button>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load forms</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>Forms update failed</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}
        <FormTable
          items={items}
          onEdit={(id) => navigate(`/forms/${encodeURIComponent(id)}`)}
          onDelete={handleDelete}
          emptyMessage={isLoading ? "Loading forms..." : undefined}
        />
      </div>
      <FormCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        isSubmitting={isSubmitting}
        error={submitError}
      />
    </AdminShell>
  );
}
