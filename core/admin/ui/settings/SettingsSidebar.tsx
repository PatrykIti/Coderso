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

type SettingsSidebarItem = (typeof settingsSidebarItems)[number];

// TASK-479-28-L01: the flat `settingsSidebarItems` export stays stable (callers +
// tests read it as an id→href map). The Security branch is rendered as a nested
// group derived from the SAME flat entries — no new routes, no removed hrefs.
const TOP_LEVEL_ORDER = [
  "general",
  "site",
  "assistant",
  "security",
  "api-keys",
  "webhooks",
  "email",
  "storage",
  "integrations",
];
const SECURITY_CHILD_IDS = ["ip-allowlist", "sessions", "login-alerts"];

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

  const byId = new Map<string, SettingsSidebarItem>(
    settingsSidebarItems.map((item) => [item.id, item] as [string, SettingsSidebarItem])
  );
  const pick = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((item): item is SettingsSidebarItem => Boolean(item));
  const topLevelItems = pick(TOP_LEVEL_ORDER);
  const securityChildren = pick(SECURITY_CHILD_IDS);
  const securityActive = activeId === "security" || SECURITY_CHILD_IDS.includes(activeId);

  const renderLink = (item: SettingsSidebarItem, child = false) => {
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
          child
            ? "block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors"
            : "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
          isActive
            ? child
              ? "font-medium text-primary"
              : "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-primary"
            : child
              ? "text-muted-foreground hover:text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:text-muted-foreground"
        )}
      >
        {!child && Icon ? <Icon /> : null}
        {item.label}
      </AdminLink>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Settings
      </p>
      <nav className="flex flex-col gap-0.5">
        {topLevelItems.map((item) => (
          <div key={item.id}>
            {renderLink(item)}
            {item.id === "security" && securityActive && securityChildren.length > 0 ? (
              <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                {securityChildren.map((child) => renderLink(child, true))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </div>
  );
}
