import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Blocks,
  ClipboardList,
  Database,
  FileText,
  HardDrive,
  Image,
  LayoutDashboard,
  LifeBuoy,
  List,
  Palette,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Store,
  Users,
  Layers,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permission?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  defaultExpanded?: boolean;
  permission?: string;
};

export type NavSection = {
  title: string;
  items?: NavItem[];
  groups?: NavGroup[];
};

export const defaultNavSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Pages", href: "/admin/pages", icon: FileText },
      { label: "Menus", href: "/admin/menus", icon: List },
      { label: "Media", href: "/admin/media", icon: Image },
    ],
    groups: [
      {
        id: "coderso",
        label: "Coderso",
        icon: Blocks,
        defaultExpanded: true,
        items: [
          { label: "Engine", href: "/admin/coderso/engine", icon: Database },
          { label: "Entries", href: "/admin/coderso/entries", icon: Layers },
          { label: "Widgets", href: "/admin/coderso/widgets", icon: Blocks },
          { label: "Forms", href: "/admin/coderso/forms", icon: ClipboardList },
          {
            label: "Posts",
            href: "/admin/coderso/posts",
            icon: FileText,
            badge: "Soon",
          },
        ],
      },
    ],
  },
  {
    title: "Store",
    items: [
      { label: "Plugin Store", href: "/admin/store", icon: Store },
    ],
  },
  {
    title: "Visual",
    items: [
      { label: "Admin UI Theme", href: "/admin/themes", icon: Palette },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Search", href: "/admin/search", icon: Search },
      { label: "SEO Manager", href: "/admin/seo", icon: ShieldCheck },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Backups", href: "/admin/backups", icon: HardDrive },
      { label: "Import / Export", href: "/admin/tools/import-export", icon: ArrowLeftRight },
      { label: "Redirects", href: "/admin/redirects", icon: Shuffle },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Roles Matrix", href: "/admin/roles", icon: ShieldCheck },
      { label: "Audit Logs", href: "/admin/audit", icon: Shield },
      { label: "Access Logs", href: "/admin/access-logs", icon: Activity },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const defaultFooterItems: NavItem[] = [
  { label: "Docs", href: "https://nextless.dev/docs", icon: FileText },
  { label: "Support", href: "https://nextless.dev/support", icon: LifeBuoy },
];
