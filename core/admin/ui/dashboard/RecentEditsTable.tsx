import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardRecentEdit } from "../../../services/dashboard/dashboardTypes";

const statusClassMap: Record<DashboardRecentEdit["status"], string> = {
  draft: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  scheduled: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  archived: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  active: "bg-indigo-500/15 text-indigo-700 border-indigo-500/20",
};

const toStatusLabel = (status: DashboardRecentEdit["status"]) =>
  status.charAt(0).toUpperCase() + status.slice(1);

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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead className="hidden md:table-cell">Author</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden lg:table-cell text-right">Last Edited</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-sm text-muted-foreground">
              No recent edits yet.
            </TableCell>
          </TableRow>
        ) : null}
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.path ?? "No path"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                <span>{item.author.name ?? item.author.email ?? "System"}</span>
                <span className="text-muted-foreground/60">•</span>
                <Badge
                  variant="outline"
                  className={statusClassMap[item.status]}
                >
                  {toStatusLabel(item.status)}
                </Badge>
                <span className="text-muted-foreground/60">•</span>
                <span>{toUpdatedLabel(item.updatedAt)}</span>
              </div>
            </TableCell>
            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
              {item.author.name ?? item.author.email ?? "System"}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge
                variant="outline"
                className={statusClassMap[item.status]}
              >
                {toStatusLabel(item.status)}
              </Badge>
            </TableCell>
            <TableCell className="hidden text-right text-sm text-muted-foreground lg:table-cell">
              {toUpdatedLabel(item.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
