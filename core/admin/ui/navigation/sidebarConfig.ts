import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Image,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShoppingBag,
  Store,
  Users,
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
      { label: "Media", href: "/admin/media", icon: Image },
    ],
  },
  {
    title: "Store",
    items: [
      { label: "Products", href: "/admin/store/products", icon: ShoppingBag },
      { label: "Plugin Store", href: "/admin/store", icon: Store },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const defaultFooterItems: NavItem[] = [
  { label: "Docs", href: "https://nextless.dev/docs", icon: FileText },
  { label: "Support", href: "https://nextless.dev/support", icon: LifeBuoy },
];
