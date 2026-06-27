import { CheckCircle2, Pencil, Plus, Trash2, Webhook, XCircle } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

type Endpoint = {
  url: string;
  events: string[];
  delivery: { ok: boolean; time: string };
  enabled: boolean;
};

const ENDPOINTS: Endpoint[] = [
  {
    url: "https://hooks.acme.studio/cms",
    events: ["page.published", "post.created", "form.submitted"],
    delivery: { ok: true, time: "2m ago" },
    enabled: true,
  },
  {
    url: "https://api.zapier.com/hooks/catch/8821",
    events: ["page.published", "post.created"],
    delivery: { ok: true, time: "1h ago" },
    enabled: true,
  },
  {
    url: "https://logs.internal.acme.dev/webhook",
    events: ["form.submitted"],
    delivery: { ok: false, time: "3h ago" },
    enabled: false,
  },
];

type DeliveryRow = {
  event: string;
  endpoint: string;
  code: number;
  time: string;
};

const DELIVERIES: DeliveryRow[] = [
  { event: "page.published", endpoint: "hooks.acme.studio/cms", code: 200, time: "2m ago" },
  { event: "post.created", endpoint: "api.zapier.com/hooks/8821", code: 200, time: "14m ago" },
  { event: "form.submitted", endpoint: "logs.internal.acme.dev", code: 500, time: "3h ago" },
  { event: "page.published", endpoint: "hooks.acme.studio/cms", code: 200, time: "Yesterday" },
  { event: "form.submitted", endpoint: "logs.internal.acme.dev", code: 408, time: "2 days ago" },
];

const deliveryColumns: Column<DeliveryRow>[] = [
  {
    key: "event",
    header: "Event",
    render: (row) => (
      <Badge variant="soft">
        {row.event}
      </Badge>
    ),
  },
  {
    key: "endpoint",
    header: "Endpoint",
    render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.endpoint}</span>,
  },
  {
    key: "code",
    header: "Status code",
    render: (row) => (
      <span
        className={cn(
          "font-mono text-sm font-medium tabular-nums",
          row.code >= 200 && row.code < 300 ? "text-success" : "text-destructive",
        )}
      >
        {row.code}
      </span>
    ),
  },
  {
    key: "time",
    header: "Time",
    align: "right",
    render: (row) => <span className="text-sm text-muted-foreground">{row.time}</span>,
  },
];

export function WebhooksPage() {
  return (
    <SettingsLayout
      title="Webhooks"
      description="Notify external services on events."
      saveBar={false}
    >
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <Button className="gap-1.5">
            <Plus className="size-4" /> Add endpoint
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {ENDPOINTS.map((endpoint) => (
            <Card key={endpoint.url} className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Webhook className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="truncate font-mono text-sm font-medium text-foreground">{endpoint.url}</code>
                    <StatusBadge status="active" />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {endpoint.events.map((event) => (
                      <Badge key={event} variant="outline">
                        {event}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                    {endpoint.delivery.ok ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-success" />
                        <span className="text-muted-foreground">
                          Last delivery succeeded · {endpoint.delivery.time}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5 text-destructive" />
                        <span className="text-muted-foreground">
                          Last delivery failed · {endpoint.delivery.time}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit endpoint">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Delete endpoint" className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                  <Switch defaultChecked={endpoint.enabled} className="ml-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <h3 className="mb-3 font-display text-[15px] font-semibold">Recent deliveries</h3>
          <DataTable columns={deliveryColumns} rows={DELIVERIES} />
        </div>
      </div>
    </SettingsLayout>
  );
}
