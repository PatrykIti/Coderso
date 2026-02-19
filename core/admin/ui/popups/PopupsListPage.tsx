import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import {
  deletePopup,
  updatePopupStatus,
  type PopupRecord,
} from "@/services/popupsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { PopupTable } from "./PopupTable";
import { usePopups } from "./hooks/usePopups";

type PopupStatusFilter = "all" | PopupRecord["status"];

export function PopupsListPage() {
  const { navigate } = useAdminRouter();
  const { items, isLoading, error, refresh } = usePopups();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PopupStatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.slug.toLowerCase().includes(needle)
      );
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter((item) => item.status === "published").length,
      draft: items.filter((item) => item.status === "draft").length,
      archived: items.filter((item) => item.status === "archived").length,
    }),
    [items]
  );

  const handleDelete = async (id: string) => {
    try {
      await deletePopup(id);
      await refresh(true);
      setActionError(null);
    } catch (error) {
      if (isApiClientError(error)) {
        setActionError(error.message);
      } else {
        setActionError("Failed to delete popup.");
      }
    }
  };

  const handleStatusChange = async (id: string, status: PopupRecord["status"]) => {
    try {
      await updatePopupStatus(id, status);
      await refresh(true);
      setActionError(null);
    } catch (error) {
      if (isApiClientError(error)) {
        setActionError(error.message);
      } else {
        setActionError("Failed to update popup status.");
      }
    }
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/popups"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Popups</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Popups"
          description="Manage popup campaigns with triggers, targeting rules, and lifecycle states."
          actions={
            <Button className="gap-2" onClick={() => navigate("/coderso/popups/new")}>
              <Plus className="h-4 w-4" />
              New popup
            </Button>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load popups</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Popup action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search popups by name or slug..."
              aria-label="Search popups"
            />
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PopupStatusFilter)}
            >
              <TabsList className="grid w-full grid-cols-4 md:w-[30rem]">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
                <TabsTrigger value="archived">Archived ({counts.archived})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <PopupTable
          items={filtered}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          emptyMessage={isLoading ? "Loading popups..." : undefined}
        />
      </div>
    </AdminShell>
  );
}
