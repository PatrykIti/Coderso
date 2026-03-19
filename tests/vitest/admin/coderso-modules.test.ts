import { expect, test } from "vitest";

import {
  CODERSO_MODULE_REGISTRY,
  buildCodersoNavItems,
  codersoModulesByTier,
} from "../../../core/admin/ui/navigation/codersoModules";
import {
  appendNavItemsAfterGroup,
  buildCustomScreenShortcutNavItems,
  buildDefaultNavSections,
} from "../../../core/admin/ui/navigation/sidebarConfig";
import { buildCodersoFeatureFlagsForSolutionKit } from "../../../core/admin/services/solutionKitSelection";

const ids = new Set(CODERSO_MODULE_REGISTRY.map((module) => module.id));

test("Coderso module registry covers v1-v3 catalog", () => {
  expect(CODERSO_MODULE_REGISTRY).toHaveLength(19);
  expect(ids.has("engine")).toBe(true);
  expect(ids.has("templates")).toBe(true);
  expect(ids.has("membership-portal")).toBe(true);
  expect(ids.has("ai-kit-wizard")).toBe(true);

  expect(codersoModulesByTier("v1")).toHaveLength(7);
  expect(codersoModulesByTier("v2")).toHaveLength(6);
  expect(codersoModulesByTier("v3")).toHaveLength(6);
});

test("buildCodersoNavItems returns stable default navigation contract", () => {
  const items = buildCodersoNavItems();
  expect(items.map((item) => item.label)).toEqual([
    "Engine",
    "Entries",
    "Screens",
    "Widgets",
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
  expect(items.some((item) => item.href === "/admin/coderso/listings")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/filters")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/search")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/booking")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/reviews")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/commerce")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/popups")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/custom-screens")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/solution-kits")).toBe(true);
});

test("buildCodersoNavItems supports feature-flagged modules", () => {
  const items = buildCodersoNavItems({
    listings: false,
    filters: true,
    search: true,
    widgets: false,
  });

  expect(items.some((item) => item.href === "/admin/coderso/listings")).toBe(false);
  expect(items.some((item) => item.href === "/admin/coderso/filters")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/search")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/widgets")).toBe(false);
});

test("buildDefaultNavSections composes Coderso group from registry", () => {
  const sections = buildDefaultNavSections({ appointments: true });
  const main = sections.find((section) => section.title === "Main");
  const coderso = main?.groups?.find((group) => group.id === "coderso");
  const mainLabels = main?.items?.map((item) => item.label) ?? [];

  expect(coderso).toBeDefined();
  expect(mainLabels).toEqual(["Dashboard", "Pages", "Posts", "Menus", "Media"]);
  expect(coderso?.items.some((item) => item.href === "/admin/coderso/appointments")).toBe(
    true
  );
  expect(coderso?.items.some((item) => item.href === "/admin/coderso/posts")).toBe(false);
});

test("buildDefaultNavSections narrows Coderso group for an active solution kit", () => {
  const flags = buildCodersoFeatureFlagsForSolutionKit({
    id: "automotive-workshop",
    title: "Automotive Workshop",
    shortDescription: "Workshop starter",
    recommendedModules: ["engine", "entries", "widgets", "forms", "booking", "reviews"],
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
      requiredModules: ["engine", "entries", "widgets", "forms", "booking", "reviews"],
      optionalModules: [],
      postInstallTasks: [],
    },
  });

  const sections = buildDefaultNavSections(flags);
  const main = sections.find((section) => section.title === "Main");
  const coderso = main?.groups?.find((group) => group.id === "coderso");
  const hrefs = coderso?.items.map((item) => item.href) ?? [];

  expect(hrefs).toEqual([
    "/admin/coderso/engine",
    "/admin/coderso/entries",
    "/admin/coderso/widgets",
    "/admin/coderso/forms",
    "/admin/coderso/booking",
    "/admin/coderso/reviews",
    "/admin/coderso/solution-kits",
  ]);
});

test("buildCustomScreenShortcutNavItems returns only active sidebar screens", () => {
  const items = buildCustomScreenShortcutNavItems([
    {
      id: "screen-b",
      name: "Beta Catalog",
      contentTypeId: "type-1",
      status: "active",
      showInSidebar: true,
      sidebarLabel: "Catalog",
      schemaVersion: 1,
      blocks: [],
      bindings: [],
      createdAt: "2026-03-06T00:00:00.000Z",
      updatedAt: "2026-03-06T00:00:00.000Z",
    },
    {
      id: "screen-a",
      name: "Alpha Catalog",
      contentTypeId: "type-1",
      status: "draft",
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
  expect(items[0]?.href).toBe("/admin/coderso/custom-screens/screen-b/entries");
});

test("appendNavItemsAfterGroup appends shortcut items after Coderso group", () => {
  const sections = appendNavItemsAfterGroup(buildDefaultNavSections(), "coderso", [
    {
      label: "Catalog",
      href: "/admin/coderso/custom-screens/screen-1/entries",
      icon: CODERSO_MODULE_REGISTRY[2]!.nav!.icon,
    },
  ]);
  const main = sections.find((section) => section.title === "Main");

  expect(main?.itemsAfterGroups?.map((item) => item.label)).toEqual(["Catalog"]);
});
