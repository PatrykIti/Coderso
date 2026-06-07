import { expect, test } from "bun:test";

import { solutionKitsCatalog } from "../../../core/services/kits/solutionKitsCatalog";
import { ADVANCED_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/advancedModules";
import { isCuratedMediaUrl } from "../../../core/services/media/curatedMediaProfiles";

const normalizePageSlug = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "/") return "/";
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
};

const collectStringValues = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectStringValues(item)
    );
  }
  return [];
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

test("industry starter home pages include menu-backed navigation and footer links", () => {
  const cases = [
    {
      kitId: "medical-clinic",
      expectedNavigationLinks: ["/", "/doctors", "/contact"],
      expectedFooterLinks: ["/doctors", "/contact", "/contact#appointment-request"],
      expectedContactFormId: "appointment-request",
      expectedContactFormTitle: "Appointment Request",
      expectedCuratedMediaUrlCount: 1,
    },
    {
      kitId: "beauty-salon",
      expectedNavigationLinks: ["/", "/offers", "/contact"],
      expectedFooterLinks: ["/offers", "/contact", "/contact#beauty-booking"],
      expectedContactFormId: "beauty-booking",
      expectedContactFormTitle: "Beauty Booking",
      expectedCuratedMediaUrlCount: 6,
    },
  ] as const;

  for (const scenario of cases) {
    const kit = solutionKitsCatalog.find((item) => item.id === scenario.kitId);
    expect(kit).toBeDefined();
    const formSlugs = new Set(kit!.resourceBlueprint.forms.map((form) => form.slug));
    expect(formSlugs.has(scenario.expectedContactFormId)).toBe(true);

    const imageUrls = collectStringValues(kit!.resourceBlueprint.pages)
      .filter((value) => value.startsWith("https://images.unsplash.com/"))
      .sort();
    expect(imageUrls.length).toBeGreaterThanOrEqual(scenario.expectedCuratedMediaUrlCount);
    expect(imageUrls.every((url) => isCuratedMediaUrl(url))).toBe(true);

    const homePage = kit!.resourceBlueprint.pages.find(
      (page) => page.slug.trim().length === 0 || page.slug === "/"
    );
    const serializedHomePage = JSON.stringify(homePage?.data ?? {});
    const blocks =
      (homePage?.data as { blocks?: Array<Record<string, unknown>> } | undefined)?.blocks ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    expect(serializedHomePage).toContain(
      scenario.kitId === "beauty-salon" ? "Beauty treatments" : "Primary care"
    );
    expect(serializedHomePage).not.toContain("Build your system with Coderso");
    expect(serializedHomePage).not.toContain("Choose the plan that fits your workflow");
    expect(serializedHomePage).not.toContain("Product overview");
    expect(serializedHomePage).not.toContain("$19");

    const navigationBlock = blocks[0];
    expect(navigationBlock).toMatchObject({
      type: "navigation",
      variant: "with-cta",
    });

    const navigationData = navigationBlock.data as
      | {
          linksSource?: unknown;
          items?: Array<{ href?: unknown }>;
        }
      | undefined;
    expect(navigationData?.linksSource).toBe("menu");
    const navigationHrefs =
      navigationData?.items
        ?.map((item) => item.href)
        .filter((href): href is string => typeof href === "string") ?? [];
    expect(navigationHrefs).toEqual(expect.arrayContaining([...scenario.expectedNavigationLinks]));

    const footerBlock = blocks.at(-1);
    expect(footerBlock).toMatchObject({
      type: "footer",
      variant: "columns-2",
    });

    const footerData = footerBlock?.data as
      | {
          columns?: Array<{ links?: Array<{ href?: unknown }> }>;
        }
      | undefined;
    const footerHrefs =
      footerData?.columns
        ?.flatMap((column) => column.links ?? [])
        .map((link) => link.href)
        .filter((href): href is string => typeof href === "string") ?? [];
    expect(footerHrefs).toEqual(expect.arrayContaining([...scenario.expectedFooterLinks]));

    const contactPage = kit!.resourceBlueprint.pages.find((page) => page.slug === "contact");
    const contactBlocks =
      (contactPage?.data as { blocks?: Array<Record<string, unknown>> } | undefined)?.blocks ?? [];
    const formEmbedBlock = contactBlocks.find((block) => block.type === "form-embed");
    const formEmbedData = formEmbedBlock?.data as
      | {
          formId?: unknown;
          title?: unknown;
        }
      | undefined;
    expect(formEmbedData?.formId).toBe(scenario.expectedContactFormId);
    expect(formEmbedData?.title).toBe(scenario.expectedContactFormTitle);
  }
});
