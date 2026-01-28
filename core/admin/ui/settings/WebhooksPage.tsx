import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { SettingsSidebar } from "./SettingsSidebar";
import { WebhookDrawer } from "./WebhookDrawer";
import { WebhooksTable } from "./WebhooksTable";

export function WebhooksPage() {
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
        <Button size="sm" className="gap-2">
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
          <WebhooksTable />
        </div>
      </div>
      <WebhookDrawer />
    </SettingsShell>
  );
}
