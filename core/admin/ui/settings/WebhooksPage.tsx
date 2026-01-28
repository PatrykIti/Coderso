import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { SettingsSidebar } from "./SettingsSidebar";
import { WebhookDrawer } from "./WebhookDrawer";
import { WebhooksTable, type WebhookRow } from "./WebhooksTable";

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

export function WebhooksPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRow | null>(null);

  const openCreate = () => {
    setEditingWebhook(null);
    setDrawerOpen(true);
  };

  const openEdit = (webhook: WebhookRow) => {
    setEditingWebhook(webhook);
    setDrawerOpen(true);
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="webhooks" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Webhooks</span>
        </div>
      }
      topbarActions={
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Webhook
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Webhooks</h1>
              <p className="text-sm text-muted-foreground">
                Send real-time content updates to external services.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <WebhooksTable items={webhooks} onEdit={openEdit} />
        </div>
      </div>
      <WebhookDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={editingWebhook ? "edit" : "create"}
        webhook={
          editingWebhook ? { url: editingWebhook.url, events: editingWebhook.events } : null
        }
      />
    </SettingsShell>
  );
}
