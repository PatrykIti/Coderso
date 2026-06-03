import {
  BellRing,
  Bot,
  Globe,
  HardDrive,
  KeyRound,
  Link2,
  Mail,
  Network,
  Plug,
  Settings,
  Shield,
} from "lucide-react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { AdminLink } from "@/ui/shared/AdminLink";
import { useSettingsDirtyNavigation } from "@/ui/settings/SettingsDirtyNavigation";

export const settingsSidebarItems = [
  { id: "general", label: "General", icon: Settings, href: "/admin/settings/general" },
  { id: "assistant", label: "Assistant", icon: Bot, href: "/admin/settings/assistant" },
  { id: "site", label: "Site", icon: Globe, href: "/admin/settings/site" },
  { id: "security", label: "Security", icon: Shield, href: "/admin/settings/security" },
  {
    id: "sessions",
    label: "Sessions",
    icon: KeyRound,
    href: "/admin/settings/security/sessions",
  },
  {
    id: "login-alerts",
    label: "Login Alerts",
    icon: BellRing,
    href: "/admin/settings/security/login-alerts",
  },
  {
    id: "ip-allowlist",
    label: "IP Allowlist",
    icon: Network,
    href: "/admin/settings/security/ip-allowlist",
  },
  { id: "api-keys", label: "API Keys", icon: KeyRound, href: "/admin/settings/api-keys" },
  { id: "webhooks", label: "Webhooks", icon: Link2, href: "/admin/settings/webhooks" },
  { id: "email", label: "Email", icon: Mail, href: "/admin/settings/email" },
  { id: "storage", label: "Storage", icon: HardDrive, href: "/admin/settings/storage" },
  { id: "integrations", label: "Integrations", icon: Plug, href: "/admin/settings/integrations" },
];

type SettingsSidebarProps = {
  activeId?: string;
};

const shouldGuardSettingsNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.defaultPrevented) return false;
  if (event.button > 0) return false;
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return false;
  return true;
};

export function SettingsSidebar({ activeId = "general" }: SettingsSidebarProps) {
  const { requestNavigation } = useSettingsDirtyNavigation();

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Settings
      </p>
      <div className="space-y-1">
        {settingsSidebarItems.map((item) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;
          return (
            <AdminLink
              key={item.id}
              href={item.href}
              prefetch
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => {
                if (!shouldGuardSettingsNavigation(event)) return;
                if (!requestNavigation(item.href)) event.preventDefault();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </AdminLink>
          );
        })}
      </div>
    </div>
  );
}
