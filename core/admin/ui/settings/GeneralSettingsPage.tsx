import { CheckCircle2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { BrandingCard } from "./BrandingCard";
import { LogoUploadCard } from "./LogoUploadCard";
import { SettingsSidebar } from "./SettingsSidebar";

export function GeneralSettingsPage() {
  return (
    <SettingsShell
      activeHref="/admin/settings"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="general" />}
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            General Settings
          </span>
          <span className="text-xs text-muted-foreground">
            Manage your global site configuration and preferences
          </span>
        </div>
      }
      topbarActions={
        <span className="text-xs text-muted-foreground">
          Last saved: Today at 11:42 AM
        </span>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 pb-28">
            <BrandingCard />
            <LogoUploadCard />
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Auto-save is currently enabled for this session</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">
                Discard changes
              </Button>
              <Button size="sm" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
