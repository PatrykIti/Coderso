import {
  BarChart3,
  CreditCard,
  Hash,
  Mail,
  MessageSquare,
  ShieldAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { GitHubBrandIcon } from "@/components/BrandIcons";
import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection } from "@/components/patterns/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Integration = {
  name: string;
  desc: string;
  icon: LucideIcon | typeof GitHubBrandIcon;
  tone: string;
  connected?: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    name: "Google Analytics",
    desc: "Track visitors and page performance.",
    icon: BarChart3,
    tone: "bg-warning-soft text-warning",
    connected: true,
  },
  {
    name: "Stripe",
    desc: "Accept payments and subscriptions.",
    icon: CreditCard,
    tone: "bg-primary-soft text-primary",
    connected: true,
  },
  {
    name: "Slack",
    desc: "Send activity notifications to channels.",
    icon: Hash,
    tone: "bg-info-soft text-info",
  },
  {
    name: "Mailchimp",
    desc: "Sync subscribers and run campaigns.",
    icon: Mail,
    tone: "bg-warning-soft text-warning",
  },
  {
    name: "Zapier",
    desc: "Automate workflows across apps.",
    icon: Zap,
    tone: "bg-warning-soft text-warning",
  },
  {
    name: "GitHub",
    desc: "Connect repositories and deploys.",
    icon: GitHubBrandIcon,
    tone: "bg-muted text-muted-foreground",
  },
  {
    name: "Sentry",
    desc: "Monitor errors and performance.",
    icon: ShieldAlert,
    tone: "bg-destructive/12 text-destructive",
  },
  {
    name: "Discord",
    desc: "Post updates to your community.",
    icon: MessageSquare,
    tone: "bg-info-soft text-info",
  },
];

export function IntegrationsPage() {
  return (
    <SettingsLayout
      title="Integrations"
      description="Connect third-party services."
      saveBar={false}
    >
      <SettingsSection
        title="Available integrations"
        description="Connect the tools your team already uses."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <Card key={item.name} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span
                  className={`flex size-11 items-center justify-center rounded-xl ${item.tone}`}
                >
                  <item.icon className="size-5" />
                </span>
                {item.connected ? <Badge variant="success">Connected</Badge> : null}
              </div>
              <div className="mt-3.5 text-sm font-semibold">{item.name}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{item.desc}</div>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                {item.connected ? (
                  <>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                    <Switch defaultChecked className="ml-auto" />
                  </>
                ) : (
                  <Button variant="soft" size="sm" className="w-full">
                    Connect
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </SettingsSection>
    </SettingsLayout>
  );
}
