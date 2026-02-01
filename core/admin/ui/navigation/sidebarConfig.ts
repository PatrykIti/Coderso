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
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const defaultNavSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Pages", href: "/admin/pages", icon: FileText },
      { label: "Content", href: "/admin/entries", icon: Layers },
      { label: "Content Types", href: "/admin/content-types", icon: Database },
      { label: "Menus", href: "/admin/menus", icon: List },
      { label: "Media", href: "/admin/media", icon: Image },
      { label: "Widgets", href: "/admin/widgets", icon: Blocks },
      { label: "Forms", href: "/admin/forms", icon: ClipboardList },
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
