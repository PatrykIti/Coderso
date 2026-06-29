import { Database, FileText, Image } from "lucide-react";

import { StatusBadge } from "@/ui/shared/StatusBadge";
import type {
  DashboardRecentEdit,
  DashboardRecentEditType,
} from "../../../services/dashboard/dashboardTypes";

/**
 * TASK-479-07-L01: recently-edited list restyled to the prototype look
 * (`_docs/_PROTOTYPE/src/pages/DashboardPage.tsx` "Recently edited pages") — a
 * divided list with a muted type-icon tile, title/path, and the shared
 * `StatusBadge`. Rows stay non-interactive (the payload carries no per-record
 * admin href; inventing one is out of scope). Data is unchanged: every field
 * comes straight from `DashboardRecentEdit`.
 */
const typeIcon = (type: DashboardRecentEditType) => {
  if (type === "media") return <Image className="size-4" />;
  if (type === "entry") return <Database className="size-4" />;
  return <FileText className="size-4" />;
};

const toAuthorLabel = (author: DashboardRecentEdit["author"]) =>
  author.name ?? author.email ?? "System";

const toUpdatedLabel = (isoDate: string) => {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type RecentEditsTableProps = {
  items: DashboardRecentEdit[];
};

export function RecentEditsTable({ items }: RecentEditsTableProps) {
  if (items.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
        No recent edits yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {typeIcon(item.type)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{item.title}</div>
            <div className="truncate text-xs text-muted-foreground">{item.path ?? "—"}</div>
          </div>
          <StatusBadge status={item.status} />
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
            {toAuthorLabel(item.author)}
          </span>
          <span className="hidden shrink-0 text-xs text-muted-foreground lg:block">
            {toUpdatedLabel(item.updatedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
