import { Copy, KeyRound, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";

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

import type { ApiKeyRecord } from "@/services/apiKeysClient";

import { getScopeLabel } from "./apiKeyScopes";

type ApiKeyStatus = "active" | "revoked";

// TASK-479-28-L05: token-driven status tints (no raw emerald/rose palette).
const statusStyles: Record<ApiKeyStatus, string> = {
  active: "border-transparent bg-success-soft text-success",
  revoked: "border-transparent bg-destructive/12 text-destructive",
};

const statusLabels: Record<ApiKeyStatus, string> = {
  active: "Active",
  revoked: "Revoked",
};

const scopeBadgeClass =
  "border-transparent bg-primary-soft text-primary-soft-foreground text-[10px] font-semibold uppercase tracking-wide";

type ApiKeysTableProps = {
  items: ApiKeyRecord[];
  isLoading?: boolean;
  busyId?: string | null;
  copyableIds?: Set<string>;
  onCopy?: (key: ApiKeyRecord) => void;
  onRotate?: (key: ApiKeyRecord) => void;
  onRevoke?: (key: ApiKeyRecord) => void;
};

const formatDate = (value: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatRelative = (value: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

export function ApiKeysTable({
  items,
  isLoading = false,
  busyId,
  copyableIds,
  onCopy,
  onRotate,
  onRevoke,
}: ApiKeysTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                Loading API keys...
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                No API keys created yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((key) => {
              const status: ApiKeyStatus = key.revokedAt ? "revoked" : "active";
              const isBusy = busyId === key.id;
              const canCopy = copyableIds?.has(key.id) ?? false;

              return (
                <TableRow key={key.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">{key.name}</span>
                        <p className="font-mono text-xs text-muted-foreground">{key.prefix}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className={scopeBadgeClass}>
                          {getScopeLabel(scope)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelative(key.lastUsedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusStyles[status]} text-[10px] font-semibold uppercase tracking-wide`}
                    >
                      {statusLabels[status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${key.name}`}
                          disabled={isBusy}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onCopy?.(key)} disabled={!canCopy}>
                          <Copy className="h-4 w-4" />
                          {canCopy ? "Copy key" : "Copy key (generated once)"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onRotate?.(key)}
                          disabled={status === "revoked" || isBusy}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Rotate key
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onRevoke?.(key)}
                          disabled={status === "revoked" || isBusy}
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
