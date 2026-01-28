import {
  BarChart3,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { IntegrationCard, type IntegrationCardProps } from "./IntegrationCard";
import { SettingsSidebar } from "./SettingsSidebar";

const integrations: IntegrationCardProps[] = [
  {
    name: "Google Analytics",
    description:
      "Track website traffic and user behavior patterns in real time with GA4.",
    status: "connected",
    icon: BarChart3,
    accent: "amber",
  },
  {
    name: "Slack",
    description:
      "Send instant notifications to team channels when content is published.",
    status: "connected",
    icon: MessageSquare,
    accent: "violet",
  },
  {
    name: "Zapier",
    description:
      "Automate workflows by connecting Nextless with 5,000+ popular apps.",
    status: "disconnected",
    icon: Zap,
    accent: "orange",
  },
  {
    name: "Sentry",
    description:
      "Monitor production errors and performance issues with automatic alerts.",
    status: "connected",
    icon: ShieldAlert,
    accent: "rose",
  },
];

const filters = ["All Services", "Analytics", "Communication", "Developer Tools"];

function IntegrationsSearch() {
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search integrations..." className="pl-9" />
    </div>
  );
}

export function IntegrationsPage() {
  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="integrations" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Integrations</span>
        </div>
      }
      search={<IntegrationsSearch />}
      topbarActions={
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Request new
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect your workflow with third-party services.
          </p>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter, index) => {
                const isActive = index === 0;
                return (
                  <Button
                    key={filter}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-4 text-xs font-semibold",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {filter}
                  </Button>
                );
              })}
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {integrations.map((integration) => (
                <IntegrationCard key={integration.name} {...integration} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
