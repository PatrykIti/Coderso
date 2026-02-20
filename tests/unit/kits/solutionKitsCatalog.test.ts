import { expect, test } from "bun:test";

import { solutionKitsCatalog } from "../../../core/services/kits/solutionKitsCatalog";

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

    for (const form of kit.resourceBlueprint.forms) {
      expect(form.fields.length).toBeGreaterThan(0);
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
      const itemKeys = menu.items.map((item) => item.key);
      expect(new Set(itemKeys).size).toBe(itemKeys.length);

      const knownKeys = new Set(itemKeys);
      for (const item of menu.items) {
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
