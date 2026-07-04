import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Blocks,
  Calendar,
  ClipboardList,
  Database,
  FileText,
  Filter,
  HardDrive,
  Image,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  List,
  Megaphone,
  Newspaper,
  Palette,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Shuffle,
  Sparkles,
  Star,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import { PUBLISHED_SCREEN_IDS, SCREENS } from "@/lib/screensMock";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

export type NavSection = {
  title: string;
  items?: NavItem[];
  group?: NavGroup;
  /** Published custom screens — appended right after the Advanced group, like the real admin. */
  itemsAfterGroup?: NavItem[];
};

/** Published custom screens that show up in the sidebar under their own name. */
const publishedScreenNavItems: NavItem[] = PUBLISHED_SCREEN_IDS.map((id) => {
  const screen = SCREENS[id];
  return {
    label: screen.name,
    to: `/advanced/custom-screens/${screen.id}/entries`,
    icon: screen.icon,
  };
});

/** Mirrors core/admin/ui/navigation/sidebarConfig.ts + advancedModules.ts (prototype routes). */
export const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard },
      { label: "Pages", to: "/pages", icon: FileText },
      { label: "Posts", to: "/posts", icon: Newspaper },
      { label: "Menus", to: "/menus", icon: List },
      { label: "Media", to: "/media", icon: Image },
    ],
    group: {
      id: "advanced",
      label: "Advanced",
      icon: Blocks,
      items: [
        { label: "Engine", to: "/advanced/engine", icon: Database },
        { label: "Entries", to: "/advanced/entries", icon: Layers },
        { label: "Screens", to: "/advanced/custom-screens", icon: LayoutGrid, badge: "Beta" },
        { label: "Forms", to: "/advanced/forms", icon: ClipboardList },
        { label: "Listings", to: "/advanced/listings", icon: LayoutGrid, badge: "Beta" },
        { label: "Filters", to: "/advanced/filters", icon: Filter, badge: "Beta" },
        { label: "Search", to: "/advanced/search", icon: Search, badge: "Beta" },
        { label: "Booking", to: "/advanced/booking", icon: Calendar, badge: "Beta" },
        { label: "Reviews", to: "/advanced/reviews", icon: Star, badge: "Beta" },
        { label: "Commerce", to: "/advanced/commerce", icon: ShoppingCart, badge: "Beta" },
        { label: "Popups", to: "/advanced/popups", icon: Megaphone, badge: "Beta" },
        { label: "Solution Kits", to: "/advanced/solution-kits", icon: Sparkles, badge: "Beta" },
        { label: "Widgets", to: "/advanced/widgets", icon: Blocks },
        { label: "Page Templates", to: "/advanced/page-templates", icon: LayoutTemplate },
      ],
    },
    itemsAfterGroup: publishedScreenNavItems,
  },
  {
    title: "Store",
    items: [{ label: "Plugin Store", to: "/store", icon: Store }],
  },
  {
    title: "Visual",
    items: [{ label: "Admin UI Theme", to: "/themes", icon: Palette }],
  },
  {
    title: "Tools",
    items: [
      { label: "Search", to: "/search", icon: Search },
      { label: "SEO Manager", to: "/seo", icon: ShieldCheck },
      { label: "Analytics", to: "/analytics", icon: BarChart3 },
      { label: "Backups", to: "/backups", icon: HardDrive },
      { label: "Import / Export", to: "/tools/import-export", icon: ArrowLeftRight },
      { label: "Redirects", to: "/redirects", icon: Shuffle },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", to: "/users", icon: Users },
      { label: "Roles Matrix", to: "/roles", icon: ShieldCheck },
      { label: "Audit Logs", to: "/audit", icon: Shield },
      { label: "Access Logs", to: "/access-logs", icon: Activity },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export const footerItems: NavItem[] = [
  { label: "Docs", to: "https://coderso.dev/docs", icon: FileText },
  { label: "Support", to: "https://coderso.dev/support", icon: ShieldCheck },
];
