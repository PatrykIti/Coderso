import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { IpAllowlistDrawer, IpAllowlistDrawerPanel } from "./IpAllowlistDrawer";
import { IpAllowlistTable } from "./IpAllowlistTable";
import { SettingsSidebar } from "./SettingsSidebar";
import { useIpAllowlist } from "./useIpAllowlist";

export function IpAllowlistPage() {
  const { entries, isLoading, error, addEntry, removeEntry } = useIpAllowlist();

  return (
    <SettingsShell
      activeHref="/admin/settings"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="security" />}
      preview={<IpAllowlistDrawerPanel readOnly />}
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">IP Allowlist</span>
          <span className="text-xs text-muted-foreground">
            Security & Access Controls
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <IpAllowlistDrawer
            trigger={
              <Button size="sm" className="hidden gap-2 xl:inline-flex">
                <Plus className="h-4 w-4" />
                Add IP Range
              </Button>
            }
            onSubmit={addEntry}
            error={error}
          />
          <IpAllowlistDrawer
            trigger={
              <Button size="sm" className="gap-2 xl:hidden">
                <Plus className="h-4 w-4" />
                Add IP Range
              </Button>
            }
            onSubmit={addEntry}
            error={error}
          />
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 pb-16">
            <IpAllowlistTable
              entries={entries}
              isLoading={isLoading}
              error={error}
              onRemove={removeEntry}
            />
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
