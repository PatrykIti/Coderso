import { Bell, ChevronRight, ListChecks, MonitorSmartphone, type LucideIcon } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/router";

const QUICK_LINKS: { title: string; desc: string; to: string; icon: LucideIcon }[] = [
  {
    title: "IP allowlist",
    desc: "Restrict admin access to trusted networks.",
    to: "/settings/security/ip-allowlist",
    icon: ListChecks,
  },
  {
    title: "Active sessions",
    desc: "Review and revoke signed-in devices.",
    to: "/settings/security/sessions",
    icon: MonitorSmartphone,
  },
  {
    title: "Login alerts",
    desc: "Get notified about new or risky sign-ins.",
    to: "/settings/security/login-alerts",
    icon: Bell,
  },
];

export function SecuritySettingsPage() {
  return (
    <SettingsLayout title="Security" description="Authentication and protection.">
      <div className="divide-y divide-border">
        <SettingsSection title="Authentication" description="How users prove who they are.">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Require 2FA for all users</div>
                <div className="text-sm text-muted-foreground">
                  Enforce two-factor authentication on every account.
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Password policy">
                <Select defaultValue="strong">
                  <option value="basic">Basic — 8+ characters</option>
                  <option value="strong">Strong — 12+, mixed case and symbols</option>
                  <option value="paranoid">Paranoid — 16+, rotated quarterly</option>
                </Select>
              </SettingsField>
              <SettingsField label="Session timeout">
                <Select defaultValue="24h">
                  <option value="1h">After 1 hour</option>
                  <option value="8h">After 8 hours</option>
                  <option value="24h">After 24 hours</option>
                  <option value="30d">After 30 days</option>
                </Select>
              </SettingsField>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Login protection" description="Defend against brute-force and abuse.">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Rate limit">
                <Select defaultValue="medium">
                  <option value="lenient">Lenient — 20 / minute</option>
                  <option value="medium">Medium — 10 / minute</option>
                  <option value="strict">Strict — 5 / minute</option>
                </Select>
              </SettingsField>
              <SettingsField label="Failed-attempt lockout">
                <Select defaultValue="5">
                  <option value="3">After 3 attempts</option>
                  <option value="5">After 5 attempts</option>
                  <option value="10">After 10 attempts</option>
                </Select>
              </SettingsField>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Block Tor exit nodes</div>
                <div className="text-sm text-muted-foreground">
                  Reject sign-in attempts originating from the Tor network.
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="More" description="Detailed security controls and logs.">
          <div className="flex flex-col gap-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    <link.icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{link.title}</div>
                    <div className="truncate text-sm text-muted-foreground">{link.desc}</div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
