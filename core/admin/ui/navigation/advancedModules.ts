import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Briefcase,
  Calendar,
  ClipboardList,
  Database,
  Filter,
  Layers,
  LayoutGrid,
  Megaphone,
  Menu,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

export type AdvancedModuleTier = "v1" | "v2" | "v3";

export type AdvancedModuleId =
  | "engine"
  | "entries"
  | "custom-screens"
  | "widgets"
  | "templates"
  | "forms"
  | "posts"
  | "listings"
  | "filters"
  | "search"
  | "booking"
  | "appointments"
  | "reviews"
  | "commerce"
  | "popups"
  | "mega-menu"
  | "membership-portal"
  | "i18n"
  | "ai-kit-wizard";

export type AdvancedOwnerArea =
  | "content"
  | "design"
  | "forms"
  | "operations"
  | "marketing"
  | "growth"
  | "platform";

export type AdvancedModuleLifecycle = "stable" | "preview" | "planned";

export type AdvancedFeatureFlags = Partial<Record<AdvancedModuleId, boolean>>;

type AdvancedNavConfig = {
  href: string;
  icon: LucideIcon;
  defaultEnabled: boolean;
  badge?: string;
  permission?: string;
};

export type AdvancedModuleDefinition = {
  id: AdvancedModuleId;
  label: string;
  tier: AdvancedModuleTier;
  ownerArea: AdvancedOwnerArea;
  lifecycle: AdvancedModuleLifecycle;
  description: string;
  dependencies: AdvancedModuleId[];
  nav: AdvancedNavConfig | null;
};

type AdvancedNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permission?: string;
};

export const ADVANCED_MODULE_REGISTRY: AdvancedModuleDefinition[] = [
  {
    id: "engine",
    label: "Engine",
    tier: "v1",
    ownerArea: "content",
    lifecycle: "stable",
    description: "Content model builder for types, fields, and schema rules.",
    dependencies: [],
    nav: {
      href: "/admin/advanced/engine",
      icon: Database,
      defaultEnabled: true,
    },
  },
  {
    id: "entries",
    label: "Entries",
    tier: "v1",
    ownerArea: "content",
    lifecycle: "stable",
    description: "Entry management for all Engine-defined content types.",
    dependencies: ["engine"],
    nav: {
      href: "/admin/advanced/entries",
      icon: Layers,
      defaultEnabled: true,
    },
  },
  {
    id: "custom-screens",
    label: "Screens",
    tier: "v1",
    ownerArea: "content",
    lifecycle: "preview",
    description: "Custom admin screens composed from widgets and content fields.",
    dependencies: ["engine", "entries", "widgets"],
    nav: {
      href: "/admin/advanced/custom-screens",
      icon: LayoutGrid,
      defaultEnabled: true,
      badge: "Beta",
    },
  },
  {
    id: "widgets",
    label: "Widgets",
    tier: "v1",
    ownerArea: "design",
    lifecycle: "stable",
    description: "Widget library and reusable block editor experiences.",
    dependencies: [],
    nav: {
      href: "/admin/advanced/widgets",
      icon: Blocks,
      defaultEnabled: true,
    },
  },
  {
    id: "templates",
    label: "Templates",
    tier: "v1",
    ownerArea: "design",
    lifecycle: "stable",
    description: "Template presets and layout skeletons for reusable pages.",
    dependencies: ["widgets"],
    nav: null,
  },
  {
    id: "forms",
    label: "Forms",
    tier: "v1",
    ownerArea: "forms",
    lifecycle: "stable",
    description: "Form builder, form submissions, and embed configurations.",
    dependencies: [],
    nav: {
      href: "/admin/advanced/forms",
      icon: ClipboardList,
      defaultEnabled: true,
    },
  },
  {
    id: "posts",
    label: "Posts",
    tier: "v1",
    ownerArea: "content",
    lifecycle: "stable",
    description: "Editorial flow for blog/news style content publishing.",
    dependencies: ["engine", "entries", "widgets"],
    nav: null,
  },
  {
    id: "listings",
    label: "Listings",
    tier: "v2",
    ownerArea: "operations",
    lifecycle: "preview",
    description: "Dynamic listing pages and repeatable cards from content queries.",
    dependencies: ["engine", "entries"],
    nav: {
      href: "/admin/advanced/listings",
      icon: LayoutGrid,
      defaultEnabled: true,
      badge: "Beta",
    },
  },
  {
    id: "filters",
    label: "Filters",
    tier: "v2",
    ownerArea: "operations",
    lifecycle: "preview",
    description: "Faceted filtering controls bound to listing/query datasets.",
    dependencies: ["listings"],
    nav: {
      href: "/admin/advanced/filters",
      icon: Filter,
      defaultEnabled: true,
      badge: "Beta",
    },
  },
  {
    id: "search",
    label: "Search",
    tier: "v2",
    ownerArea: "operations",
    lifecycle: "preview",
    description: "Scoped search modules with query presets and ranking controls.",
    dependencies: ["listings"],
    nav: {
      href: "/admin/advanced/search",
      icon: Search,
      defaultEnabled: true,
      badge: "Beta",
    },
  },
  {
    id: "booking",
    label: "Booking",
    tier: "v2",
    ownerArea: "operations",
    lifecycle: "preview",
    description: "Booking calendars for resources, services, and capacities.",
    dependencies: ["forms", "listings"],
    nav: {
      href: "/admin/advanced/booking",
      icon: Calendar,
      defaultEnabled: true,
      badge: "Beta",
    },
  },
  {
    id: "appointments",
    label: "Appointments",
    tier: "v2",
    ownerArea: "operations",
    lifecycle: "planned",
    description: "Appointment flows for time-slot service businesses.",
    dependencies: ["booking", "forms"],
    nav: {
      href: "/admin/advanced/appointments",
      icon: Briefcase,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
  {
    id: "reviews",
    label: "Reviews",
    tier: "v2",
    ownerArea: "operations",
    lifecycle: "preview",
    description: "Ratings and review moderation tied to listings/services.",
    dependencies: ["forms", "listings"],
    nav: {
      href: "/admin/advanced/reviews",
      icon: Star,
      defaultEnabled: true,
      badge: "Beta",
      permission: "reviews:read",
    },
  },
  {
    id: "commerce",
    label: "Commerce",
    tier: "v3",
    ownerArea: "growth",
    lifecycle: "preview",
    description: "Product experiences, checkout integrations, and catalog UI blocks.",
    dependencies: ["listings", "filters"],
    nav: {
      href: "/admin/advanced/commerce",
      icon: ShoppingCart,
      defaultEnabled: true,
      badge: "Beta",
      permission: "commerce:read",
    },
  },
  {
    id: "popups",
    label: "Popups",
    tier: "v3",
    ownerArea: "marketing",
    lifecycle: "preview",
    description: "Engagement overlays with targeting rules and action triggers.",
    dependencies: ["forms", "widgets"],
    nav: {
      href: "/admin/advanced/popups",
      icon: Megaphone,
      defaultEnabled: true,
      badge: "Beta",
      permission: "popups:read",
    },
  },
  {
    id: "mega-menu",
    label: "Mega Menu",
    tier: "v3",
    ownerArea: "design",
    lifecycle: "planned",
    description: "Advanced multi-column navigation menu builder.",
    dependencies: ["widgets", "entries"],
    nav: {
      href: "/admin/advanced/mega-menu",
      icon: Menu,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
  {
    id: "membership-portal",
    label: "Portal",
    tier: "v3",
    ownerArea: "platform",
    lifecycle: "planned",
    description: "Logged-in client/member portals with scoped access.",
    dependencies: ["entries", "forms"],
    nav: {
      href: "/admin/advanced/portal",
      icon: Users,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
  {
    id: "i18n",
    label: "Multilingual",
    tier: "v3",
    ownerArea: "platform",
    lifecycle: "planned",
    description: "Locale management and translated content workflows.",
    dependencies: ["entries", "listings"],
    nav: {
      href: "/admin/advanced/i18n",
      icon: Sparkles,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
  {
    id: "ai-kit-wizard",
    label: "Solution Kits",
    tier: "v3",
    ownerArea: "growth",
    lifecycle: "preview",
    description: "Template kits with AI-assisted setup and guided defaults.",
    dependencies: ["templates", "widgets", "entries"],
    nav: {
      href: "/admin/advanced/solution-kits",
      icon: Sparkles,
      defaultEnabled: true,
      badge: "Beta",
      permission: "solution-kits:read",
    },
  },
];

const isNavEnabled = (
  module: AdvancedModuleDefinition,
  flags: AdvancedFeatureFlags
): boolean => {
  if (!module.nav) return false;
  const override = flags[module.id];
  if (typeof override === "boolean") {
    return override;
  }
  return module.nav.defaultEnabled;
};

export const buildAdvancedNavItems = (
  flags: AdvancedFeatureFlags = {}
): AdvancedNavItem[] =>
  ADVANCED_MODULE_REGISTRY.filter((module) => isNavEnabled(module, flags)).flatMap(
    (module) => {
      if (!module.nav) return [];
      return [
        {
          label: module.label,
          href: module.nav.href,
          icon: module.nav.icon,
          badge: module.nav.badge,
          permission: module.nav.permission,
        },
      ];
    }
  );

export const advancedModulesByTier = (tier: AdvancedModuleTier) =>
  ADVANCED_MODULE_REGISTRY.filter((module) => module.tier === tier);
