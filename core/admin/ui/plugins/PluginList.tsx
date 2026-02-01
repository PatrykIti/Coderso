import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

import type { InstalledPlugin } from "./types";

const statusStyles: Record<InstalledPlugin["status"], string> = {
  enabled: "border-emerald-500/30 text-emerald-600",
  disabled: "border-slate-500/30 text-slate-600",
  error: "border-rose-500/40 text-rose-600",
};

export type PluginListProps = {
  items: InstalledPlugin[];
  selectedName?: string;
  onSelect: (name: string) => void;
};

export function PluginList(props: PluginListProps) {
  const { items, selectedName } = props;
  const basePath = resolveAdminBasePath();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>Plugin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Policy</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((plugin) => (
            <TableRow
              key={plugin.name}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/40",
                selectedName === plugin.name && "bg-primary/5"
              )}
              onClick={() => props.onSelect(plugin.name)}
            >
              <TableCell>
                <div>
                  <p className="text-sm font-semibold">{plugin.name}</p>
                  <p className="text-xs text-muted-foreground">v{plugin.version}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusStyles[plugin.status]}>
                  {plugin.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{plugin.policy}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {plugin.lastUpdated}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={withAdminBasePath(
                      basePath,
                      `/store/plugins/${encodeURIComponent(plugin.name)}`
                    )}
                  >
                    Manage
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
