import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Briefcase,
  Calendar,
  ClipboardList,
  Database,
  FileText,
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

export type CodersoModuleTier = "v1" | "v2" | "v3";

export type CodersoModuleId =
  | "engine"
  | "entries"
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

export type CodersoOwnerArea =
  | "content"
  | "design"
  | "forms"
  | "operations"
  | "marketing"
  | "growth"
  | "platform";

export type CodersoModuleLifecycle = "stable" | "preview" | "planned";

export type CodersoFeatureFlags = Partial<Record<CodersoModuleId, boolean>>;

type CodersoNavConfig = {
  href: string;
  icon: LucideIcon;
  defaultEnabled: boolean;
  badge?: string;
  permission?: string;
};

export type CodersoModuleDefinition = {
  id: CodersoModuleId;
  label: string;
  tier: CodersoModuleTier;
  ownerArea: CodersoOwnerArea;
  lifecycle: CodersoModuleLifecycle;
  description: string;
  dependencies: CodersoModuleId[];
  nav: CodersoNavConfig | null;
};

type CodersoNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permission?: string;
};

export const CODERSO_MODULE_REGISTRY: CodersoModuleDefinition[] = [
  {
    id: "engine",
    label: "Engine",
    tier: "v1",
    ownerArea: "content",
    lifecycle: "stable",
    description: "Content model builder for types, fields, and schema rules.",
    dependencies: [],
    nav: {
      href: "/admin/coderso/engine",
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
      href: "/admin/coderso/entries",
      icon: Layers,
      defaultEnabled: true,
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
      href: "/admin/coderso/widgets",
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
      href: "/admin/coderso/forms",
      icon: ClipboardList,
      defaultEnabled: true,
    },
  },
  {
    id: "posts",
    label: "Posts",
    tier: "v1",
    ownerArea: "content",
    lifecycle: "planned",
    description: "Editorial flow for blog/news style content publishing.",
    dependencies: ["engine", "entries", "widgets"],
    nav: {
      href: "/admin/coderso/posts",
      icon: FileText,
      defaultEnabled: true,
      badge: "Soon",
    },
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
      href: "/admin/coderso/listings",
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
      href: "/admin/coderso/filters",
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
      href: "/admin/coderso/search",
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
      href: "/admin/coderso/booking",
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
      href: "/admin/coderso/appointments",
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
    lifecycle: "planned",
    description: "Ratings and review moderation tied to listings/services.",
    dependencies: ["forms", "listings"],
    nav: {
      href: "/admin/coderso/reviews",
      icon: Star,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
  {
    id: "commerce",
    label: "Commerce",
    tier: "v3",
    ownerArea: "growth",
    lifecycle: "planned",
    description: "Product experiences, checkout integrations, and catalog UI blocks.",
    dependencies: ["listings", "filters"],
    nav: {
      href: "/admin/coderso/commerce",
      icon: ShoppingCart,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
  {
    id: "popups",
    label: "Popups",
    tier: "v3",
    ownerArea: "marketing",
    lifecycle: "planned",
    description: "Engagement overlays with targeting rules and action triggers.",
    dependencies: ["forms", "widgets"],
    nav: {
      href: "/admin/coderso/popups",
      icon: Megaphone,
      defaultEnabled: false,
      badge: "Soon",
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
      href: "/admin/coderso/mega-menu",
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
      href: "/admin/coderso/portal",
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
      href: "/admin/coderso/i18n",
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
    lifecycle: "planned",
    description: "Template kits with AI-assisted setup and guided defaults.",
    dependencies: ["templates", "widgets", "entries"],
    nav: {
      href: "/admin/coderso/solution-kits",
      icon: Sparkles,
      defaultEnabled: false,
      badge: "Soon",
    },
  },
];

const isNavEnabled = (
  module: CodersoModuleDefinition,
  flags: CodersoFeatureFlags
): boolean => {
  if (!module.nav) return false;
  const override = flags[module.id];
  if (typeof override === "boolean") {
    return override;
  }
  return module.nav.defaultEnabled;
};

export const buildCodersoNavItems = (
  flags: CodersoFeatureFlags = {}
): CodersoNavItem[] =>
  CODERSO_MODULE_REGISTRY.filter((module) => isNavEnabled(module, flags)).flatMap(
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

export const codersoModulesByTier = (tier: CodersoModuleTier) =>
  CODERSO_MODULE_REGISTRY.filter((module) => module.tier === tier);
