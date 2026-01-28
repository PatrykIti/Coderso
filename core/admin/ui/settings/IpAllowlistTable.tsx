import { Info, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AllowlistStatus = "active" | "inactive";

type AllowlistEntry = {
  id: string;
  label: string;
  description: string;
  range: string;
  addedBy: string;
  status: AllowlistStatus;
};

const allowlistEntries: AllowlistEntry[] = [
  {
    id: "main-office",
    label: "Main Office",
    description: "Headquarters VPN",
    range: "192.168.1.0/24",
    addedBy: "Admin User",
    status: "active",
  },
  {
    id: "dev-team",
    label: "Dev Team",
    description: "Remote staging access",
    range: "45.79.12.0/32",
    addedBy: "Alex Rivet",
    status: "active",
  },
  {
    id: "legacy-api",
    label: "Legacy API",
    description: "Deprecated integration",
    range: "10.0.0.45/32",
    addedBy: "System",
    status: "inactive",
  },
];

const tableHeaderClassName =
  "px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";

export function IpAllowlistTable() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Active Restrictions</h2>
        <p className="text-sm text-muted-foreground">
          Only traffic from the following IP ranges will be able to access the admin
          panel.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className={tableHeaderClassName}>Label</TableHead>
              <TableHead className={tableHeaderClassName}>IP Range (CIDR)</TableHead>
              <TableHead className={tableHeaderClassName}>Added By</TableHead>
              <TableHead className={tableHeaderClassName}>Status</TableHead>
              <TableHead className={cn(tableHeaderClassName, "text-right")}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allowlistEntries.map((entry) => (
              <TableRow
                key={entry.id}
                className={cn(entry.status === "inactive" && "opacity-60")}
              >
                <TableCell className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {entry.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <code
                    className={cn(
                      "rounded-md bg-muted px-2 py-1 text-xs font-mono text-primary",
                      entry.status === "inactive" && "text-muted-foreground"
                    )}
                  >
                    {entry.range}
                  </code>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {entry.addedBy}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Switch
                    defaultChecked={entry.status === "active"}
                    aria-label={`${entry.label} status`}
                  />
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${entry.label}`}
                    className="text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Separator />
        <div className="flex items-center justify-center gap-2 bg-muted/30 px-6 py-3 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>
            Changes to allowlist can take up to 2 minutes to propagate globally.
          </span>
        </div>
      </div>
    </div>
  );
}
