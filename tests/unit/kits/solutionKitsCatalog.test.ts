import { expect, test } from "bun:test";

import { solutionKitsCatalog } from "../../../core/services/kits/solutionKitsCatalog";
import { ADVANCED_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/advancedModules";

const normalizePageSlug = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "/") return "/";
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
};

test("solution kits catalog provides complete starter packs for each kit", () => {
  expect(solutionKitsCatalog.length).toBeGreaterThanOrEqual(5);

  for (const kit of solutionKitsCatalog) {
    expect(kit.resourceBlueprint.contentTypes.length).toBeGreaterThan(0);
    expect(kit.resourceBlueprint.forms.length).toBeGreaterThan(0);
    expect(kit.resourceBlueprint.pages.length).toBeGreaterThan(0);
    expect(kit.resourceBlueprint.menus.length).toBeGreaterThan(0);

    expect(kit.manifest).toBeDefined();
    expect(kit.manifest?.includes.forms.length).toBeGreaterThan(0);
    expect(kit.manifest?.requiredModules.length).toBeGreaterThan(0);

    for (const form of kit.resourceBlueprint.forms) {
      expect((form.fields ?? []).length).toBeGreaterThan(0);
    }

    for (const page of kit.resourceBlueprint.pages) {
      expect(page.data).toBeDefined();
      expect(page.seo).toBeDefined();
    }
  }
});

test("solution kit resource blueprint keys are unique and internally consistent", () => {
  for (const kit of solutionKitsCatalog) {
    const pageSlugs = kit.resourceBlueprint.pages.map((page) => normalizePageSlug(page.slug));
    const formSlugs = kit.resourceBlueprint.forms.map((form) => form.slug);
    const typeSlugs = kit.resourceBlueprint.contentTypes.map((type) => type.slug);
    const menuLocations = kit.resourceBlueprint.menus.map((menu) => menu.location ?? menu.name);

    expect(new Set(pageSlugs).size).toBe(pageSlugs.length);
    expect(new Set(formSlugs).size).toBe(formSlugs.length);
    expect(new Set(typeSlugs).size).toBe(typeSlugs.length);
    expect(new Set(menuLocations).size).toBe(menuLocations.length);

    for (const menu of kit.resourceBlueprint.menus) {
      const items = menu.items ?? [];
      const itemKeys = items.map((item) => item.key);
      expect(new Set(itemKeys).size).toBe(itemKeys.length);

      const knownKeys = new Set(itemKeys);
      for (const item of items) {
        expect(Boolean(item.href) || Boolean(item.pageSlug)).toBe(true);

        if (item.pageSlug) {
          expect(pageSlugs.includes(normalizePageSlug(item.pageSlug))).toBe(true);
        }

        if (item.parentKey) {
          expect(knownKeys.has(item.parentKey)).toBe(true);
        }
      }
    }
  }
});

test("solution kit recommended modules stay aligned with known Coderso modules and core blueprint needs", () => {
  const knownModules = new Set(ADVANCED_MODULE_REGISTRY.map((module) => module.id));

  for (const kit of solutionKitsCatalog) {
    for (const moduleId of kit.recommendedModules) {
      expect(knownModules.has(moduleId as (typeof ADVANCED_MODULE_REGISTRY)[number]["id"])).toBe(
        true
      );
    }

    if (kit.resourceBlueprint.contentTypes.length > 0) {
      expect(kit.recommendedModules).toContain("engine");
      expect(kit.recommendedModules).toContain("entries");
      expect(kit.recommendedModules).toContain("custom-screens");
    }

    if (kit.resourceBlueprint.pages.length > 0) {
      expect(kit.recommendedModules).toContain("widgets");
    }
  }

  const beautySalon = solutionKitsCatalog.find((kit) => kit.id === "beauty-salon");
  const servicesDirectory = solutionKitsCatalog.find((kit) => kit.id === "services-directory");
  const smallEcommerce = solutionKitsCatalog.find((kit) => kit.id === "small-ecommerce");

  expect(beautySalon?.recommendedModules).toContain("entries");
  expect(servicesDirectory?.recommendedModules).toContain("widgets");
  expect(smallEcommerce?.recommendedModules).toContain("entries");
  expect(smallEcommerce?.recommendedModules).toContain("listings");
  expect(smallEcommerce?.recommendedModules).toContain("filters");
});

test("local service kit wires contact widgets to its public inquiry form", () => {
  const kit = solutionKitsCatalog.find((item) => item.id === "local-service-business");
  expect(kit).toBeDefined();

  const formSlugs = new Set(kit!.resourceBlueprint.forms.map((form) => form.slug));
  const contactPage = kit!.resourceBlueprint.pages.find((page) => page.slug === "contact");
  const blocks =
    (contactPage?.data as { blocks?: Array<{ type?: string; data?: unknown }> })?.blocks ?? [];
  const formIds = blocks.flatMap((block) => {
    const data = block.data as
      | {
          formId?: string;
          form?: { submission?: { formId?: string; mode?: string } };
        }
      | undefined;
    return [data?.formId, data?.form?.submission?.formId].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
  });

  expect(formSlugs.has("service-inquiry")).toBe(true);
  expect(formIds).toContain("service-inquiry");
  expect(formIds.every((formId) => formSlugs.has(formId))).toBe(true);
});
