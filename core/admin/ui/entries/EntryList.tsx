import { LayoutGrid, List, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SplitShell } from "@/ui/layouts/SplitShell";

import { EntryFilters } from "./EntryFilters";
import { EntryTable } from "./EntryTable";
import { EntryTypeSidebar } from "./EntryTypeSidebar";

export function EntryList() {
  return (
    <SplitShell
      activeHref="/admin/entries"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Entries</span>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-72 shrink-0 overflow-hidden rounded-xl border bg-background lg:block">
            <EntryTypeSidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">Blog Posts</h1>
                <Badge
                  variant="secondary"
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                >
                  Entries
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center rounded-lg border bg-background p-1 shadow-xs sm:flex">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="bg-primary/10 text-primary hover:bg-primary/15"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </div>
            </div>
            <EntryFilters />
            <EntryTable />
          </div>
        </div>
      </div>
    </SplitShell>
  );
}
