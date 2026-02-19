import { expect, test } from "bun:test";

import {
  CODERSO_MODULE_REGISTRY,
  buildCodersoNavItems,
  codersoModulesByTier,
} from "../../../core/admin/ui/navigation/codersoModules";
import { buildDefaultNavSections } from "../../../core/admin/ui/navigation/sidebarConfig";

const ids = new Set(CODERSO_MODULE_REGISTRY.map((module) => module.id));

test("Coderso module registry covers v1-v3 catalog", () => {
  expect(CODERSO_MODULE_REGISTRY).toHaveLength(18);
  expect(ids.has("engine")).toBe(true);
  expect(ids.has("templates")).toBe(true);
  expect(ids.has("membership-portal")).toBe(true);
  expect(ids.has("ai-kit-wizard")).toBe(true);

  expect(codersoModulesByTier("v1")).toHaveLength(6);
  expect(codersoModulesByTier("v2")).toHaveLength(6);
  expect(codersoModulesByTier("v3")).toHaveLength(6);
});

test("buildCodersoNavItems returns stable default navigation contract", () => {
  const items = buildCodersoNavItems();
  expect(items.map((item) => item.label)).toEqual([
    "Engine",
    "Entries",
    "Widgets",
    "Forms",
    "Posts",
    "Listings",
    "Filters",
    "Search",
    "Booking",
    "Commerce",
  ]);
  expect(items.find((item) => item.label === "Posts")?.badge).toBe("Soon");
  expect(items.find((item) => item.label === "Listings")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Filters")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Search")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Booking")?.badge).toBe("Beta");
  expect(items.find((item) => item.label === "Commerce")?.badge).toBe("Beta");
  expect(items.some((item) => item.href === "/admin/coderso/listings")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/filters")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/search")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/booking")).toBe(true);
  expect(items.some((item) => item.href === "/admin/coderso/commerce")).toBe(true);
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

  expect(coderso).toBeDefined();
  expect(coderso?.items.some((item) => item.href === "/admin/coderso/appointments")).toBe(
    true
  );
});
