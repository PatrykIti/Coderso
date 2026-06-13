import { expect, test } from "vitest";

import {
  ADVANCED_MODULE_REGISTRY,
  buildAdvancedNavItems,
  advancedModulesByTier,
} from "../../../core/admin/ui/navigation/advancedModules";
import {
  appendNavItemsAfterGroup,
  buildCustomScreenShortcutNavItems,
  buildDefaultNavSections,
} from "../../../core/admin/ui/navigation/sidebarConfig";
import { buildAdvancedFeatureFlagsForSolutionKit } from "../../../core/admin/services/solutionKitSelection";

const ids = new Set<string>(ADVANCED_MODULE_REGISTRY.map((module) => module.id));

test("Advanced module registry covers v1-v3 catalog", () => {
  expect(ADVANCED_MODULE_REGISTRY).toHaveLength(19);
  expect(ids.has("engine")).toBe(true);
  expect(ids.has("page-templates")).toBe(true);
  expect(ids.has("templates")).toBe(false);
  expect(ids.has("membership-portal")).toBe(true);
  expect(ids.has("ai-kit-wizard")).toBe(true);
  expect(ADVANCED_MODULE_REGISTRY.find((module) => module.id === "widgets")?.nav).toBeNull();
  expect(ADVANCED_MODULE_REGISTRY.find((module) => module.id === "page-templates")?.nav).toBeNull();

  expect(advancedModulesByTier("v1")).toHaveLength(7);
  expect(advancedModulesByTier("v2")).toHaveLength(6);
  expect(advancedModulesByTier("v3")).toHaveLength(6);
});

test("buildAdvancedNavItems returns stable default navigation contract", () => {
  const items = buildAdvancedNavItems();
  expect(items.map((item) => item.label)).toEqual([
    "Engine",
    "Entries",
    "Screens",
    "Forms",
    "Listings",
    "Filters",
    "Search",
    "Booking",
    "Reviews",
    "Commerce",
    "Popups",
    "Solution Kits",
  ]);
  expect(items.find((item) => item.label === "Listings")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Filters")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Search")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Booking")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Reviews")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Commerce")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Popups")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Solution Kits")?.badge).toBe("Beta");
  expect(items.some((item) => item.href === "/admin/advanced/listings")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/filters")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/search")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/booking")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/reviews")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/commerce")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/popups")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/custom-screens")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/widgets")).toBe(false);
  expect(items.some((item) => item.href === "/admin/advanced/page-templates")).toBe(false);
  expect(items.some((item) => item.href === "/admin/advanced/solution-kits")).toBe(true);
});

test("buildAdvancedNavItems supports feature-flagged modules", () => {
  const items = buildAdvancedNavItems({
    listings: false,
    filters: true,
    search: true,
    widgets: false,
  });

  expect(items.some((item) => item.href === "/admin/advanced/listings")).toBe(false);
  expect(items.some((item) => item.href === "/admin/advanced/filters")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/search")).toBe(true);
  expect(items.some((item) => item.href === "/admin/advanced/widgets")).toBe(false);
});

test("buildDefaultNavSections composes Advanced group from registry", () => {
  const sections = buildDefaultNavSections({ appointments: true });
  const main = sections.find((section) => section.title === "Main");
  const advanced = main?.groups?.find((group) => group.id === "advanced");
  const mainLabels = main?.items?.map((item) => item.label) ?? [];

  expect(advanced).toBeDefined();
  expect(mainLabels).toEqual(["Dashboard", "Pages", "Posts", "Menus", "Media"]);
  expect(advanced?.items.some((item) => item.href === "/admin/advanced/appointments")).toBe(true);
  expect(advanced?.items.some((item) => item.href === "/admin/posts")).toBe(false);
});

test("buildDefaultNavSections narrows Advanced group for an active solution kit", () => {
  const flags = buildAdvancedFeatureFlagsForSolutionKit({
    id: "automotive-workshop",
    title: "Automotive Workshop",
    shortDescription: "Workshop starter",
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "booking",
      "reviews",
    ],
    features: [],
    manifest: {
      id: "automotive-workshop",
      title: "Automotive Workshop",
      vertical: "automotive-workshop",
      includes: {
        contentTypes: ["service"],
        entries: [],
        widgets: ["hero", "feature-grid", "testimonials", "cta-banner"],
        templates: ["service-home", "service-list"],
        forms: ["service-request"],
        menus: ["primary", "footer"],
      },
      requiredModules: [
        "engine",
        "entries",
        "custom-screens",
        "widgets",
        "forms",
        "listings",
        "booking",
        "reviews",
      ],
      optionalModules: [],
      postInstallTasks: [],
    },
  });

  const sections = buildDefaultNavSections(flags);
  const main = sections.find((section) => section.title === "Main");
  const advanced = main?.groups?.find((group) => group.id === "advanced");
  const hrefs = advanced?.items.map((item) => item.href) ?? [];

  expect(hrefs).toEqual([
    "/admin/advanced/engine",
    "/admin/advanced/entries",
    "/admin/advanced/custom-screens",
    "/admin/advanced/forms",
    "/admin/advanced/listings",
    "/admin/advanced/booking",
    "/admin/advanced/reviews",
    "/admin/advanced/solution-kits",
  ]);
});

test("buildCustomScreenShortcutNavItems returns only active sidebar screens", () => {
  const items = buildCustomScreenShortcutNavItems([
    {
      id: "screen-b",
      name: "Beta Catalog",
      contentTypeId: "type-1",
      status: "active",
      collectionRole: null,
      compositionKey: null,
      showInSidebar: true,
      sidebarLabel: "Catalog",
      schemaVersion: 1,
      blocks: [{ id: "field-1", type: "screen-field-value", data: {} }],
      bindings: [
        {
          id: "binding-1",
          widgetId: "field-1",
          propPath: "value",
          field: "title",
          mode: "readwrite",
        },
      ],
      createdAt: "2026-03-06T00:00:00.000Z",
      updatedAt: "2026-03-06T00:00:00.000Z",
    },
    {
      id: "screen-a",
      name: "Alpha Catalog",
      contentTypeId: "type-1",
      status: "draft",
      collectionRole: null,
      compositionKey: null,
      showInSidebar: true,
      sidebarLabel: "Alpha",
      schemaVersion: 1,
      blocks: [],
      bindings: [],
      createdAt: "2026-03-06T00:00:00.000Z",
      updatedAt: "2026-03-06T00:00:00.000Z",
    },
    {
      id: "screen-c",
      name: "Services",
      contentTypeId: "type-2",
      status: "active",
      collectionRole: null,
      compositionKey: null,
      showInSidebar: false,
      sidebarLabel: null,
      schemaVersion: 1,
      blocks: [],
      bindings: [],
      createdAt: "2026-03-06T00:00:00.000Z",
      updatedAt: "2026-03-06T00:00:00.000Z",
    },
  ]);

  expect(items).toHaveLength(1);
  expect(items[0]?.label).toBe("Catalog");
  expect(items[0]?.href).toBe("/admin/advanced/custom-screens/screen-b/entries");
});

test("appendNavItemsAfterGroup appends shortcut items after Advanced group", () => {
  const sections = appendNavItemsAfterGroup(buildDefaultNavSections(), "advanced", [
    {
      label: "Catalog",
      href: "/admin/advanced/custom-screens/screen-1/entries",
      icon: ADVANCED_MODULE_REGISTRY[2]!.nav!.icon,
    },
  ]);
  const main = sections.find((section) => section.title === "Main");

  expect(main?.itemsAfterGroups?.map((item) => item.label)).toEqual(["Catalog"]);
});
