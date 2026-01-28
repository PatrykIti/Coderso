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

type WebhookStatus = "active" | "inactive";
type DeliveryStatus = "success" | "pending" | "failed";

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  lastDelivery: {
    label: string;
    status: DeliveryStatus;
  };
};

const webhooks: WebhookRow[] = [
  {
    id: "deployment-hook",
    url: "https://api.deployment-service.com/hooks",
    events: ["entry.created", "media.uploaded"],
    status: "active",
    lastDelivery: { label: "2 minutes ago", status: "success" },
  },
  {
    id: "slack-alerts",
    url: "https://hooks.slack.com/services/T0123/B456",
    events: ["entry.updated"],
    status: "inactive",
    lastDelivery: { label: "3 days ago", status: "pending" },
  },
  {
    id: "staging-worker",
    url: "https://staging-worker.internal.io/process",
    events: ["media.deleted"],
    status: "active",
    lastDelivery: { label: "1 hour ago", status: "failed" },
  },
];

const statusClasses: Record<WebhookStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const deliveryMeta: Record<
  DeliveryStatus,
  { icon: typeof CheckCircle2; className: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "text-emerald-500",
  },
  pending: {
    icon: Clock3,
    className: "text-slate-400",
  },
  failed: {
    icon: AlertCircle,
    className: "text-rose-500",
  },
};

export function WebhooksTable() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
          {webhooks.map((webhook) => {
            const delivery = deliveryMeta[webhook.lastDelivery.status];
            const DeliveryIcon = delivery.icon;

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
                        className="border-blue-500/20 bg-blue-500/10 text-[10px] font-semibold uppercase text-blue-600"
                      >
                        {event}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-semibold uppercase", statusClasses[webhook.status])}
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
                    <Button variant="ghost" size="icon-sm" aria-label="Edit webhook">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-rose-500 hover:text-rose-600"
                      aria-label="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
