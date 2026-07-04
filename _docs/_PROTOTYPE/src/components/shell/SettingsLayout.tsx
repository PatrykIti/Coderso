import {
  Bot,
  Database,
  Globe,
  KeyRound,
  Mail,
  Plug,
  Settings2,
  Shield,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Button } from "@/components/ui/button";
import { Link, usePath } from "@/lib/router";
import { cn } from "@/lib/cn";

type SettingsNavItem = { label: string; to: string; icon: LucideIcon; children?: { label: string; to: string }[] };

const SETTINGS_NAV: SettingsNavItem[] = [
  { label: "General", to: "/settings/general", icon: Settings2 },
  { label: "Site", to: "/settings/site", icon: Globe },
  { label: "Assistant", to: "/settings/assistant", icon: Bot },
  {
    label: "Security",
    to: "/settings/security",
    icon: Shield,
    children: [
      { label: "IP allowlist", to: "/settings/security/ip-allowlist" },
      { label: "Sessions", to: "/settings/security/sessions" },
      { label: "Login alerts", to: "/settings/security/login-alerts" },
    ],
  },
  { label: "API keys", to: "/settings/api-keys", icon: KeyRound },
  { label: "Webhooks", to: "/settings/webhooks", icon: Webhook },
  { label: "Email", to: "/settings/email", icon: Mail },
  { label: "Storage", to: "/settings/storage", icon: Database },
  { label: "Integrations", to: "/settings/integrations", icon: Plug },
];

export function SettingsLayout({
  title,
  description,
  children,
  saveBar = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  saveBar?: boolean;
}) {
  const path = usePath();
  const normalized = path === "/settings" ? "/settings/general" : path;

  return (
    <div>
      <PageHeader title="Settings" description="Configure your workspace, security, and integrations." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 lg:sticky lg:top-2 lg:self-start">
          {SETTINGS_NAV.map((item) => {
            const active = normalized === item.to || normalized.startsWith(`${item.to}/`);
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:text-muted-foreground",
                  )}
                >
                  <item.icon />
                  {item.label}
                </Link>
                {item.children && active ? (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const childActive = normalized === child.to;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                            childActive
                              ? "font-medium text-primary"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="min-w-0">
          <div className="mb-1">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
          {saveBar ? (
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
              <Button variant="ghost">Discard</Button>
              <Button>Save changes</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
