import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ApiKeyDialog } from "./ApiKeyDialog";
import { ApiKeysTable } from "./ApiKeysTable";
import { SettingsSidebar } from "./SettingsSidebar";

export function ApiKeysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="api-keys" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">API Keys</span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <PageHeader
              title="API Keys"
              description="Create, rotate, and revoke access tokens for integrations."
              actions={
                <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              }
            />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <ApiKeysTable />
          </div>
        </div>
      </div>
      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </SettingsShell>
  );
}
