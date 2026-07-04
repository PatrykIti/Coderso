import { AlertCircle, CheckCircle2, Clock3, Link2, Pencil, Trash2 } from "lucide-react";

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

export type WebhookStatus = "active" | "inactive";
export type DeliveryStatus = "success" | "pending" | "failed";

export type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  lastDelivery: {
    label: string;
    status: DeliveryStatus;
  };
};

// TASK-479-28-L05: token-driven status/delivery tints (no raw emerald/slate/rose).
const statusClasses: Record<WebhookStatus, string> = {
  active: "border-transparent bg-success-soft text-success",
  inactive: "border-transparent bg-muted text-muted-foreground",
};

const deliveryMeta: Record<DeliveryStatus, { icon: typeof CheckCircle2; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: "text-success",
  },
  pending: {
    icon: Clock3,
    className: "text-muted-foreground",
  },
  failed: {
    icon: AlertCircle,
    className: "text-destructive",
  },
};

type WebhooksTableProps = {
  items: WebhookRow[];
  onEdit?: (row: WebhookRow) => void;
  onDelete?: (row: WebhookRow) => void;
  isLoading?: boolean;
  busyId?: string | null;
};

export function WebhooksTable({
  items,
  onEdit,
  onDelete,
  isLoading = false,
  busyId,
}: WebhooksTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              URL
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Events
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Delivery
            </TableHead>
            <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="px-6 py-6 text-sm text-muted-foreground">
                Loading webhooks...
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-6 py-6 text-sm text-muted-foreground">
                No webhooks configured yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((webhook) => {
              const delivery = deliveryMeta[webhook.lastDelivery.status];
              const DeliveryIcon = delivery.icon;
              const isBusy = busyId === webhook.id;

              return (
                <TableRow key={webhook.id} className="hover:bg-muted/30">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{webhook.url}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {webhook.events.map((event) => (
                        <Badge
                          key={event}
                          variant="outline"
                          className="border-transparent bg-info-soft text-info text-[10px] font-semibold uppercase"
                        >
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        statusClasses[webhook.status]
                      )}
                    >
                      {webhook.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <DeliveryIcon className={cn("h-4 w-4", delivery.className)} />
                      {webhook.lastDelivery.label}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit webhook"
                        onClick={() => onEdit?.(webhook)}
                        disabled={isBusy}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete webhook"
                        onClick={() => onDelete?.(webhook)}
                        disabled={isBusy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
