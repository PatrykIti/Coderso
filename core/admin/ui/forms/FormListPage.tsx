import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  createForm,
  deleteForm,
  updateForm,
  type FormRecord,
  type FormStatus,
} from "@/services/formsClient";
import {
  getUserSettings,
  setUserSetting,
} from "@/services/userSettingsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import {
  FormBulkActionsBar,
  type FormBulkActionValue,
} from "./FormBulkActionsBar";
import { FormCreateDrawer } from "./FormCreateDrawer";
import {
  FormFilters,
  type FormAccessFilter,
  type FormStatusFilter,
} from "./FormFilters";
import { FormTable } from "./FormTable";
import { useForms } from "./hooks/useForms";

const formListToasts = createListActionToastAdapter({
  labels: { singular: "form", plural: "forms" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    draft: { pastTense: "moved to draft", failureVerb: "move to draft" },
    archive: { pastTense: "archived", failureVerb: "archive" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

export function filterForms(
  forms: FormRecord[],
  query: string,
  status: FormStatusFilter,
  access: FormAccessFilter
) {
  const normalized = query.trim().toLowerCase();
  return forms.filter((form) => {
    const matchesQuery =
      !normalized ||
      form.name.toLowerCase().includes(normalized) ||
      form.slug.toLowerCase().includes(normalized) ||
      (form.description ?? "").toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || form.status === status;
    const matchesAccess = access === "all" || form.submissionAccess === access;
    return matchesQuery && matchesStatus && matchesAccess;
  });
}

const statusForBulkAction = (
  action: Exclude<FormBulkActionValue, "delete">
): FormStatus => {
  if (action === "publish") return "published";
  if (action === "draft") return "draft";
  return "archived";
};

export function FormListPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = useForms();
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormStatusFilter>("all");
  const [accessFilter, setAccessFilter] = useState<FormAccessFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<FormBulkActionValue | "">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [openAfterCreate, setOpenAfterCreate] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await getUserSettings();
        if (!active) return;
        setOpenAfterCreate(prefs["forms.openAfterCreate"]);
      } catch {
        // Defaults keep the create flow usable when settings fail to load.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(
    () => filterForms(items, searchQuery, statusFilter, accessFilter),
    [accessFilter, items, searchQuery, statusFilter]
  );
  const pagination = useListPagination(filteredItems, {
    resetKey: JSON.stringify({
      searchQuery,
      statusFilter,
      accessFilter,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((form) => form.id),
    [pagination.visibleRows]
  );
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const handleCreate = async (payload: {
    name: string;
    slug?: string | null;
    status: FormStatus;
    description?: string | null;
    openAfterCreate: boolean;
  }) => {
    const { openAfterCreate: shouldOpenAfterCreate, ...formInput } = payload;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createForm(formInput);
      if (created) {
        formListToasts.success("create", { targetLabel: created.name });
        if (shouldOpenAfterCreate) {
          navigate(`/coderso/forms/${encodeURIComponent(created.id)}`);
          return;
        }
      }
      await refresh({ force: true, background: true });
      setCreateOpen(false);
    } catch (err) {
      setSubmitError(formListToasts.error("create", err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/coderso/forms/${encodeURIComponent(id)}`);
  };

  const handleActionLogs = (id: string) => {
    navigate(`/coderso/forms/${encodeURIComponent(id)}/action-runs`);
  };

  const handleSetStatus = async (
    id: string,
    status: FormStatus,
    action: "publish" | "draft" | "archive"
  ) => {
    setSubmitError(null);
    try {
      await updateForm(id, { status });
      await refresh({ force: true, background: true });
      formListToasts.success(action);
    } catch (err) {
      setSubmitError(formListToasts.error(action, err));
    }
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    setSubmitError(null);
    try {
      await deleteForm(id);
      await refresh({ force: true, background: true });
      formListToasts.success("delete");
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setPendingDeleteId(null);
    } catch (err) {
      setSubmitError(formListToasts.error("delete", err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleForm = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((formId) => formId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  };

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
    setBulkAction("");
  }, []);

  const runBulkAction = async (action: FormBulkActionValue, ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkWorking(true);
    setSubmitError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "delete") return deleteForm(id);
          return updateForm(id, { status: statusForBulkAction(action) });
        })
      );
      await refresh({ force: true, background: true });
      const summary = formListToasts.summarizeBulkAction(action, ids, results);
      formListToasts.emitBulk(summary);
      if (!summary.ok) {
        setSubmitError(summary.inlineMessage);
        setSelectedIds(summary.failedTargets);
      } else {
        handleClearSelection();
      }
    } catch (err) {
      setSubmitError(
        formListToasts.error("publish", err, {
          fallbackMessage: "Bulk action failed.",
        })
      );
    } finally {
      setIsBulkWorking(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || visibleSelectedIds.length === 0) return;
    if (bulkAction === "delete") {
      setPendingBulkDeleteIds(visibleSelectedIds);
      return;
    }
    void runBulkAction(bulkAction, visibleSelectedIds);
  };

  const handleDrawerOpenChange = (next: boolean) => {
    setCreateOpen(next);
    if (next) {
      setSubmitError(null);
      setDrawerKey((prev) => prev + 1);
    }
  };

  const handleOpenAfterCreateChange = async (next: boolean) => {
    setOpenAfterCreate(next);
    try {
      await setUserSetting("forms.openAfterCreate", next);
    } catch {
      // Preference persistence failures should not block form creation.
    }
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/forms"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Forms</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Forms"
          description="Build custom forms and embed them across pages."
          actions={
            <>
              {selectedCount > 0 ? (
                <FormBulkActionsBar
                  selectedCount={selectedCount}
                  action={bulkAction}
                  onActionChange={setBulkAction}
                  onApply={handleBulkApply}
                  onClear={handleClearSelection}
                  isApplying={isBulkWorking}
                  variant="inline"
                />
              ) : null}
              <Button className="gap-2" onClick={() => handleDrawerOpenChange(true)}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
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
        <FormFilters
          search={searchQuery}
          status={statusFilter}
          access={accessFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onAccessChange={setAccessFilter}
        />
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading forms...
          </div>
        ) : (
          <FormTable
            items={pagination.visibleRows}
            emptyMessage={
              items.length > 0
                ? "No forms match your current filters."
                : undefined
            }
            selectedIds={visibleSelectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            onToggleForm={handleToggleForm}
            onEdit={handleEdit}
            onActionLogs={handleActionLogs}
            onPublish={(id) => handleSetStatus(id, "published", "publish")}
            onMoveToDraft={(id) => handleSetStatus(id, "draft", "draft")}
            onArchive={(id) => handleSetStatus(id, "archived", "archive")}
            onDelete={setPendingDeleteId}
          />
        )}
        <ListPaginationFooter
          resourceLabel="forms"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <FormCreateDrawer
        key={drawerKey}
        open={createOpen}
        onOpenChange={handleDrawerOpenChange}
        onCreate={handleCreate}
        openAfterCreate={openAfterCreate}
        onOpenAfterCreateChange={handleOpenAfterCreateChange}
        isSubmitting={isSubmitting}
        error={submitError}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete form?"
        description="Delete this form only if it has no retained submissions or action diagnostics. This cannot be undone."
        confirmLabel="Delete form"
        confirmingLabel="Deleting..."
        isConfirming={deletingId === pendingDeleteId}
        onConfirm={() => {
          if (pendingDeleteId) return runDelete(pendingDeleteId);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected forms?"
        description={`Delete ${pendingBulkDeleteIds.length} form${pendingBulkDeleteIds.length === 1 ? "" : "s"} if deletion is safe? Retained submissions or action diagnostics block hard delete; use Archive to preserve that history.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
