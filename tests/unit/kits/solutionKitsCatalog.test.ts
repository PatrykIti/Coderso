import { expect, test } from "bun:test";

import { solutionKitsCatalog } from "../../../core/services/kits/solutionKitsCatalog";
import { ADVANCED_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/advancedModules";
import { isCuratedMediaUrl } from "../../../core/services/media/curatedMediaProfiles";
import { PAGE_DOCUMENT_SCHEMA_VERSION } from "../../../core/services/pages/pageDocumentV2";

type TestPageBlock = {
  type?: string;
  props?: Record<string, unknown>;
};

type TestPageSection = {
  type?: string;
  name?: string;
  blocks?: TestPageBlock[];
};

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

const readPageSections = (value: unknown) => {
  const data = value as { schemaVersion?: unknown; sections?: TestPageSection[] } | undefined;
  expect(data?.schemaVersion).toBe(PAGE_DOCUMENT_SCHEMA_VERSION);
  expect(data).not.toHaveProperty("blocks");
  return Array.isArray(data?.sections) ? data.sections : [];
};

const readPageBlocks = (value: unknown) =>
  readPageSections(value).flatMap((section) => section.blocks ?? []);

const collectListHrefs = (block: TestPageBlock | undefined) => {
  const items = Array.isArray(block?.props?.items) ? block.props.items : [];
  return items
    .map((item) =>
      typeof item === "object" && item !== null ? (item as { href?: unknown }).href : null
    )
    .filter((href): href is string => typeof href === "string");
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
      expect(readPageSections(page.data).length).toBeGreaterThan(0);
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

test("local service kit wires contact sections to its public inquiry form", () => {
  const kit = solutionKitsCatalog.find((item) => item.id === "local-service-business");
  expect(kit).toBeDefined();

  const formSlugs = new Set(kit!.resourceBlueprint.forms.map((form) => form.slug));
  const contactPage = kit!.resourceBlueprint.pages.find((page) => page.slug === "contact");
  const formIds = readPageBlocks(contactPage?.data)
    .filter((block) => block.type === "form")
    .map((block) => block.props?.formId)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

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
    const sections = readPageSections(homePage?.data);
    const blocks = readPageBlocks(homePage?.data);
    expect(sections.length).toBeGreaterThan(0);
    expect(blocks.length).toBeGreaterThan(0);
    expect(serializedHomePage).toContain(
      scenario.kitId === "beauty-salon" ? "Beauty treatments" : "Primary care"
    );
    expect(serializedHomePage).not.toContain("Build your system with Coderso");
    expect(serializedHomePage).not.toContain("Choose the plan that fits your workflow");
    expect(serializedHomePage).not.toContain("Product overview");
    expect(serializedHomePage).not.toContain("$19");

    const navigationSection = sections.find(
      (section) => section.type === "navigation" && section.name === "Navigation"
    );
    const navigationBlock = navigationSection?.blocks?.find((block) => block.type === "list");
    expect(navigationSection).toMatchObject({
      type: "navigation",
      name: "Navigation",
    });
    const navigationHrefs = collectListHrefs(navigationBlock);
    expect(navigationHrefs).toEqual(expect.arrayContaining([...scenario.expectedNavigationLinks]));

    const footerSection = sections.find(
      (section) => section.type === "navigation" && section.name === "Footer"
    );
    const footerBlock = footerSection?.blocks?.find((block) => block.type === "list");
    expect(footerSection).toMatchObject({
      type: "navigation",
      name: "Footer",
    });
    const footerHrefs = collectListHrefs(footerBlock);
    expect(footerHrefs).toEqual(expect.arrayContaining([...scenario.expectedFooterLinks]));

    const contactPage = kit!.resourceBlueprint.pages.find((page) => page.slug === "contact");
    const formBlock = readPageBlocks(contactPage?.data).find((block) => block.type === "form");
    expect(formBlock?.props?.formId).toBe(scenario.expectedContactFormId);
    expect(formBlock?.props?.title).toBe(scenario.expectedContactFormTitle);
  }
});
