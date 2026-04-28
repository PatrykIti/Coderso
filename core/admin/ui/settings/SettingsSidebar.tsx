import {
  Bot,
  Globe,
  HardDrive,
  KeyRound,
  Link2,
  Mail,
  Plug,
  Settings,
  Shield,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { resolveAdminHref } from "@/utils/adminPaths";

export const settingsSidebarItems = [
  { id: "general", label: "General", icon: Settings, href: "/admin/settings/general" },
  { id: "assistant", label: "Assistant", icon: Bot, href: "/admin/settings/assistant" },
  { id: "site", label: "Site", icon: Globe, href: "/admin/settings/site" },
  { id: "security", label: "Security", icon: Shield, href: "/admin/settings/security" },
  { id: "api-keys", label: "API Keys", icon: KeyRound, href: "/admin/settings/api-keys" },
  { id: "webhooks", label: "Webhooks", icon: Link2, href: "/admin/settings/webhooks" },
  { id: "email", label: "Email", icon: Mail, href: "/admin/settings/email" },
  { id: "storage", label: "Storage", icon: HardDrive, href: "/admin/settings/storage" },
  { id: "integrations", label: "Integrations", icon: Plug, href: "/admin/settings/integrations" },
];

type SettingsSidebarProps = {
  activeId?: string;
};

export function SettingsSidebar({ activeId = "general" }: SettingsSidebarProps) {
  const adminBasePath = useAdminBasePath();
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Settings
      </p>
      <div className="space-y-1">
        {settingsSidebarItems.map((item) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;
          const href = resolveAdminHref(adminBasePath, item.href);
          return (
            <a
              key={item.id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
