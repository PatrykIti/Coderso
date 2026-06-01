import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  FileText,
  HardDrive,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  List,
  Newspaper,
  Palette,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Store,
  Users,
  Blocks,
} from "lucide-react";
import type { CustomScreenRecord } from "@/services/customScreensClient";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

import { buildAdvancedNavItems, type AdvancedFeatureFlags } from "@/ui/navigation/advancedModules";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permission?: string;
  anyPermissions?: string[];
};

export type NavGroup = {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  defaultExpanded?: boolean;
  permission?: string;
  anyPermissions?: string[];
};

export type NavSection = {
  title: string;
  items?: NavItem[];
  groups?: NavGroup[];
  itemsAfterGroups?: NavItem[];
};

export const buildDefaultNavSections = (
  advancedFeatureFlags: AdvancedFeatureFlags = {}
): NavSection[] => [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permission: "content:read" },
      { label: "Pages", href: "/admin/pages", icon: FileText, permission: "content:read" },
      { label: "Posts", href: "/admin/posts", icon: Newspaper, permission: "content:read" },
      { label: "Menus", href: "/admin/menus", icon: List, permission: "menus:read" },
      { label: "Media", href: "/admin/media", icon: Image, permission: "media:read" },
    ],
    groups: [
      {
        id: "advanced",
        label: "Advanced",
        icon: Blocks,
        defaultExpanded: true,
        items: buildAdvancedNavItems(advancedFeatureFlags),
      },
    ],
  },
  {
    title: "Store",
    items: [
      { label: "Plugin Store", href: "/admin/store", icon: Store, permission: "store:browse" },
    ],
  },
  {
    title: "Visual",
    items: [
      {
        label: "Admin UI Theme",
        href: "/admin/themes",
        icon: Palette,
        permission: "themes:read",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Search", href: "/admin/search", icon: Search, permission: "content:read" },
      { label: "SEO Manager", href: "/admin/seo", icon: ShieldCheck, permission: "content:read" },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, permission: "content:read" },
      { label: "Backups", href: "/admin/backups", icon: HardDrive, permission: "backups:read" },
      {
        label: "Import / Export",
        href: "/admin/tools/import-export",
        icon: ArrowLeftRight,
        permission: "settings:read",
      },
      { label: "Redirects", href: "/admin/redirects", icon: Shuffle, permission: "settings:read" },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        anyPermissions: ["users:read", "roles:read"],
      },
      { label: "Roles Matrix", href: "/admin/roles", icon: ShieldCheck, permission: "roles:read" },
      { label: "Audit Logs", href: "/admin/audit", icon: Shield, permission: "audit:read" },
      {
        label: "Access Logs",
        href: "/admin/access-logs",
        icon: Activity,
        permission: "audit:read",
      },
      { label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings:read" },
    ],
  },
];

export const defaultNavSections: NavSection[] = buildDefaultNavSections();

export const buildCustomScreenShortcutNavItems = (screens: CustomScreenRecord[]): NavItem[] =>
  screens
    .filter((screen) => {
      const capabilities =
        screen.capabilities ??
        resolveCustomScreenCapabilities({
          definition: screen.definition,
          blocks: screen.blocks,
          bindings: screen.bindings,
        });
      return (
        screen.status === "active" &&
        screen.showInSidebar === true &&
        capabilities.supportsDedicatedEditor === true
      );
    })
    .map((screen) => ({
      label: screen.sidebarLabel?.trim() || screen.name,
      href: `/admin/advanced/custom-screens/${encodeURIComponent(screen.id)}/entries`,
      icon: LayoutGrid,
      permission: "content:read",
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

export const appendNavItemsAfterGroup = (
  sections: NavSection[],
  groupId: string,
  items: NavItem[]
): NavSection[] => {
  if (items.length === 0) return sections;

  return sections.map((section) => {
    const hasGroup = section.groups?.some((group) => group.id === groupId) ?? false;
    if (!hasGroup) return section;
    return {
      ...section,
      itemsAfterGroups: items,
    };
  });
};

export const defaultFooterItems: NavItem[] = [
  { label: "Docs", href: "https://coderso.dev/docs", icon: FileText },
  { label: "Support", href: "https://coderso.dev/support", icon: LifeBuoy },
];
