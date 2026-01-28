import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { PageFilters } from "./PageFilters";
import { PageTable } from "./PageTable";
import { PageCreateDrawer } from "./PageCreateDrawer";

export function PageListPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AdminShell
      activeHref="/admin/pages"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Pages</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Pages"
          description="Manage your content and page structures."
          actions={
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create New Page
            </Button>
          }
        />
        <PageFilters />
        <PageTable />
        <div className="flex flex-col items-start gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Showing 1-4 of 32 pages</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
      <PageCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </AdminShell>
  );
}
