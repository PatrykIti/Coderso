import {
  Copy,
  KeyRound,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ApiKeyStatus = "active" | "rotating" | "revoked";

type ApiKey = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
  status: ApiKeyStatus;
};

const apiKeys: ApiKey[] = [
  {
    id: "prod-frontend",
    name: "Production Frontend",
    scopes: ["Content Read", "Media Read"],
    createdAt: "Oct 24, 2025",
    lastUsed: "2 minutes ago",
    status: "active",
  },
  {
    id: "sync-bot",
    name: "External Sync Bot",
    scopes: ["Content Write", "Media Manage"],
    createdAt: "Sep 12, 2025",
    lastUsed: "5 days ago",
    status: "rotating",
  },
  {
    id: "mobile-dev",
    name: "Mobile App Dev",
    scopes: ["Content Read"],
    createdAt: "Aug 05, 2025",
    lastUsed: "Never",
    status: "revoked",
  },
];

const statusStyles: Record<ApiKeyStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  rotating: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  revoked: "border-rose-500/30 bg-rose-500/10 text-rose-600",
};

const statusLabels: Record<ApiKeyStatus, string> = {
  active: "Active",
  rotating: "Rotating",
  revoked: "Revoked",
};

const scopeBadgeClass =
  "border-primary/20 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide";

export function ApiKeysTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scope
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Created
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Used
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {key.name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {key.scopes.map((scope) => (
                    <Badge
                      key={scope}
                      variant="outline"
                      className={scopeBadgeClass}
                    >
                      {scope}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {key.createdAt}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {key.lastUsed}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`${statusStyles[key.status]} text-[10px] font-semibold uppercase tracking-wide`}
                >
                  {statusLabels[key.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${key.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4" />
                      Copy key
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RefreshCw className="h-4 w-4" />
                      Rotate key
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <Trash2 className="h-4 w-4" />
                      Revoke key
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
