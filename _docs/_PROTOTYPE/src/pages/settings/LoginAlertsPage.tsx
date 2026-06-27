import { MapPin, Monitor, ShieldAlert, type LucideIcon } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { RELATIVE_TIMES, pick } from "@/lib/mock";

const ALERTS = [
  { label: "New device sign-in", desc: "Notify when a new device is used.", on: true },
  { label: "New location", desc: "Notify on sign-in from a new place.", on: true },
  { label: "Failed attempts", desc: "Notify after repeated failed logins.", on: true },
  { label: "Password changed", desc: "Notify when the account password changes.", on: false },
];

type RecentAlert = {
  icon: LucideIcon;
  title: string;
  location: string;
  tone: BadgeProps["variant"];
  badge: string;
};

const RECENT: RecentAlert[] = [
  { icon: Monitor, title: "New device sign-in", location: "Warsaw, Poland", tone: "info", badge: "New device" },
  { icon: MapPin, title: "New location", location: "Berlin, Germany", tone: "warning", badge: "New location" },
  { icon: ShieldAlert, title: "Failed attempts", location: "Unknown · 5 tries", tone: "destructive", badge: "Blocked" },
];

export function LoginAlertsPage() {
  return (
    <SettingsLayout title="Login alerts" description="Get notified about account activity.">
      <div className="divide-y divide-border">
        <SettingsSection title="Alerts" description="Choose which events trigger a notification.">
          <div className="divide-y divide-border">
            {ALERTS.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <div className="text-sm font-medium">{row.label}</div>
                  <div className="text-sm text-muted-foreground">{row.desc}</div>
                </div>
                <Switch defaultChecked={row.on} />
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="Channels" description="Where alerts are delivered.">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-muted-foreground">patryk@coderso.dev</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <div className="text-sm font-medium">Webhook</div>
                <div className="text-sm text-muted-foreground">Post events to your endpoint.</div>
              </div>
              <Switch />
            </div>
            <SettingsField label="Webhook URL" htmlFor="hook" hint="A POST request is sent for each alert.">
              <Input id="hook" className="font-mono" defaultValue="https://hooks.coderso.dev/alerts" />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Recent alerts" description="The latest account activity we flagged.">
          <div className="flex flex-col gap-2">
            {RECENT.map((alert, index) => (
              <div
                key={alert.title}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <alert.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{alert.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {alert.location} · {pick(RELATIVE_TIMES, index)}
                  </div>
                </div>
                <Badge variant={alert.tone}>{alert.badge}</Badge>
              </div>
            ))}
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
