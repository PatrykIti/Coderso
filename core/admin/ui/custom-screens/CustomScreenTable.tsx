import { Blocks, LayoutGrid, Link2, PanelLeft, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AdminLink } from "@/ui/shared/AdminLink";
import { EmptyState } from "@/ui/shared/EmptyState";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import { CustomScreenRowActions } from "./CustomScreenRowActions";
import type { CustomScreenListRow } from "./customScreenListModel";
import { buildCustomScreenWorkspacePath } from "./routeParams";

export type CustomScreenTableProps = {
  items: CustomScreenListRow[];
  emptyMessage?: string;
  selectedIds?: string[];
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  workingId?: string | null;
  onToggleAll?: () => void;
  onToggleScreen?: (id: string) => void;
  onActivate: (id: string) => void;
  onMoveToDraft: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate?: () => void;
};

/**
 * TASK-479-14-L01: Custom Screen management list restyled to the prototype's
 * soft card grid (`_docs/_PROTOTYPE/src/pages/advanced/CustomScreensPage.tsx`).
 * Each screen renders as a `rounded-2xl` card showing a generic screen icon, the
 * shared StatusBadge, an "In sidebar" badge for published (sidebar-visible)
 * screens, block/binding counts, and Edit / Open(Entries) actions. The card view
 * keeps every existing list behaviour: per-card selection (Checkbox), the bulk
 * select-all control, and the row-actions menu (activate / move to draft /
 * delete). Presentation only — all data comes from the real list model.
 */
export function CustomScreenTable({
  items,
  emptyMessage,
  selectedIds = [],
  isAllSelected = false,
  isIndeterminate = false,
  workingId,
  onToggleAll,
  onToggleScreen,
  onActivate,
  onMoveToDraft,
  onDelete,
  onCreate,
}: CustomScreenTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid />}
        title={emptyMessage ? "No screens match your filters" : "Build your first screen"}
        description={
          emptyMessage ??
          "Compose admin surfaces from blocks bound to your content, then publish them to the sidebar."
        }
        action={
          emptyMessage || !onCreate ? undefined : (
            <Button className="gap-1.5" onClick={onCreate}>
              <Plus className="size-4" /> New screen
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
        <Checkbox
          aria-label="Select all custom screens"
          checked={isIndeterminate ? "indeterminate" : isAllSelected}
          onCheckedChange={() => onToggleAll?.()}
        />
        <span>Select all</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((row) => {
          const screen = row.screen;
          const isSelected = selectedIds.includes(screen.id);
          const inSidebar = row.sidebarShortcutState === "visible";
          return (
            <Card
              key={screen.id}
              data-selected={isSelected ? "true" : "false"}
              className="flex h-full flex-col gap-0 p-5 py-5 transition-all hover:-translate-y-0.5 hover:shadow-card data-[selected=true]:ring-2 data-[selected=true]:ring-primary/40"
            >
              <header className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    aria-label={`Select ${screen.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleScreen?.(screen.id)}
                  />
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    <LayoutGrid className="size-6" />
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={screen.status} />
                  <CustomScreenRowActions
                    id={screen.id}
                    status={screen.status}
                    disabled={workingId === screen.id}
                    onActivate={() => onActivate(screen.id)}
                    onMoveToDraft={() => onMoveToDraft(screen.id)}
                    onDelete={() => onDelete(screen.id)}
                  />
                </div>
              </header>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-display text-[15px] font-semibold text-foreground">
                  {screen.name}
                </span>
                {inSidebar ? (
                  <Badge variant="success" className="gap-1">
                    <PanelLeft className="size-3" /> In sidebar
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">{row.contentTypeLabel}</div>
              {screen.sidebarLabel ? (
                <div className="mt-0.5 break-words text-xs text-muted-foreground">
                  Sidebar label: {screen.sidebarLabel}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Blocks className="size-3.5" /> {screen.blocks.length} blocks
                </span>
                <span className="flex items-center gap-1.5">
                  <Link2 className="size-3.5" /> {screen.bindings.length} bindings
                </span>
              </div>

              <Separator className="my-4" />

              <footer className="mt-auto flex items-center gap-2">
                <AdminLink
                  href={`/advanced/custom-screens/${encodeURIComponent(screen.id)}`}
                  prefetch
                  className="flex-1"
                  aria-label={`Edit custom screen: ${screen.name}`}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Edit
                  </Button>
                </AdminLink>
                <AdminLink
                  href={buildCustomScreenWorkspacePath({ screenId: screen.id })}
                  prefetch
                  className="flex-1"
                  aria-label={`Open ${screen.name} records`}
                >
                  <Button variant="soft" size="sm" className="w-full">
                    {inSidebar ? "Open" : "Entries"}
                  </Button>
                </AdminLink>
              </footer>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
