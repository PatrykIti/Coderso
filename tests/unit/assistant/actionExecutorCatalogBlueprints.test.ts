import { expect, test } from "bun:test";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildFullServiceSitePlan } from "../../../core/services/assistant/blueprints/fullServiceSiteBlueprint";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import { buildProductInquiryCatalogPlan } from "../../../core/services/assistant/blueprints/productInquiryBlueprint";
import { executeAssistantActionPlan } from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import {
  createTestPageIntroSection,
  readPageSections,
  readPageBlocks,
  hasPageBlockType,
} from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan refines existing house-project catalog without creating duplicate page", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-initial",
    },
    deps
  );

  const refinementPlan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.create).toBe(0);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(hasPageBlockType(deps.__state.pages[0]?.currentData, "collection")).toBe(true);
});

test("executeAssistantActionPlan adds inquiry form without creating duplicate page", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-form-initial",
    },
    deps
  );

  const refinementPlan = planAssistantActions({
    prompt: "dodaj formularz zapytania do strony szczegolowej",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-form-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.create).toBe(1);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.forms).toHaveLength(1);
  const form = deps.__state.forms[0];
  if (!form) throw new Error("missing_form");
  expect(deps.__state.formFields.get(form.id)?.length).toBeGreaterThan(0);
  expect(hasPageBlockType(deps.__state.pages[0]?.currentData, "form")).toBe(true);
});

test("executeAssistantActionPlan creates product inquiry catalog and form", async () => {
  const deps = createDeps();
  const plan = buildProductInquiryCatalogPlan();

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-product-inquiry",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(deps.__state.contentTypes.some((entry) => entry.slug === "products")).toBe(true);
  expect(deps.__state.forms[0]?.slug).toBe("product-catalog-inquiry");
  expect(deps.__state.pages[0]?.slug).toBe("/produkty");
  expect(hasPageBlockType(deps.__state.pages[0]?.currentData, "form")).toBe(true);
  expect(
    (deps.__state.pages[0]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    pageRole: "canonical-list-page",
    listingQueryId: deps.__state.listingQueries[0]?.id,
    listingTemplateId: deps.__state.listingTemplates[0]?.id,
  });
  expect(
    (
      deps.__state.pages[0]?.currentData.settings as {
        collectionLink?: { contentTypeId?: string };
      }
    )?.collectionLink?.contentTypeId
  ).toBe(deps.__state.contentTypes[0]?.id);
});

test("executeAssistantActionPlan executes the full-service architecture studio plan", async () => {
  const deps = createDeps();
  const prompt = [
    "Stworz premium strone dla studia architektonicznego Studio Forma.",
    "Potrzebuje portfolio realizacji, oferte uslug z podstronami, proces wspolpracy i kontakt z formularzem leadowym.",
    "Realizacje maja miec katalog z kategoria, lokalizacja i rokiem.",
  ].join(" ");
  const plan = buildFullServiceSitePlan({
    prompt,
    promptKind: "setup_request",
  });

  expect(
    planAssistantActions({
      prompt,
      context: {
        page: "/admin/advanced/widgets",
        locale: "pl-PL",
      },
    }).intentId
  ).toBe("site-builder-basic-intake");

  expect(plan.intentId).toBe("service-business-full-site");
  expect(plan.actions).toHaveLength(49);
  expect(plan.metadata?.launchReadiness?.checks.map((check) => check.status)).toEqual([
    "pending_execute",
    "pending_execute",
    "pending_execute",
    "pending_execute",
    "pending_execute",
    "pending_execute",
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-full-service-1",
    },
    deps
  );

  expect(executed.summary.failed).toBe(0);
  expect(executed.plan.metadata?.launchReadiness?.checks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "pages", status: "satisfied" }),
      expect.objectContaining({ id: "catalogs", status: "satisfied" }),
      expect.objectContaining({ id: "public-content", status: "satisfied" }),
      expect.objectContaining({ id: "navigation-footer", status: "satisfied" }),
      expect.objectContaining({ id: "seo", status: "satisfied" }),
      expect.objectContaining({ id: "media", status: "satisfied" }),
    ])
  );
  expect(deps.__state.pages.map((page) => page.slug).sort()).toEqual([
    "/",
    "/kontakt",
    "/o-nas",
    "/portfolio",
    "/proces",
    "/referencje",
    "/uslugi",
  ]);
  const allowedPageSlugs = new Set(deps.__state.pages.map((page) => page.slug));
  for (const page of deps.__state.pages) {
    const sections = readPageSections(page.publishedData);
    expect(page.status).toBe("published");
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]).toMatchObject({
      id: "full-service-primary-navigation",
      type: "content",
    });
    expect(sections.at(-1)).toMatchObject({ type: "cta" });
    const footerList = sections.at(-1)?.blocks?.find((block) => block.type === "list") as
      { props?: { items?: Array<{ href?: string }> } } | undefined;
    const footerHrefs =
      footerList?.props?.items
        ?.map((link) => link.href)
        .filter((href): href is string => Boolean(href)) ?? [];
    expect(footerHrefs).not.toEqual(
      expect.arrayContaining(["/polityka-prywatnosci", "/regulamin"])
    );
    expect(footerHrefs.every((href) => allowedPageSlugs.has(href))).toBe(true);
  }
  const homePage = deps.__state.pages.find((page) => page.slug === "/");
  expect(
    readPageBlocks(homePage?.publishedData).some(
      (block) =>
        block.type === "heading" &&
        typeof (block.props as { text?: unknown } | undefined)?.text === "string" &&
        (block.props as { text: string }).text.includes("Studio Forma")
    )
  ).toBe(true);
  const servicesPage = deps.__state.pages.find((page) => page.slug === "/uslugi");
  expect(readPageSections(servicesPage?.publishedData).map((section) => section.type)).toEqual([
    "content",
    "collection",
    "cta",
  ]);
  expect(deps.__state.entries.filter((entry) => entry.status === "published")).toHaveLength(6);
  for (const entry of deps.__state.entries) {
    expect(entry.data.coverImageUrl).toEqual(
      expect.stringContaining("https://images.unsplash.com/")
    );
    expect(entry.data.coverImageAlt).toEqual(expect.any(String));
    expect(entry.data.coverImageLicenseUrl).toBe("https://unsplash.com/license");
    expect(Object.prototype.hasOwnProperty.call(entry.data, "heroImage")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry.data, "gallery")).toBe(false);
  }
  expect(deps.__state.detailPages).toHaveLength(2);
  expect(
    deps.__state.detailPages.every(
      (detailPage) =>
        detailPage.currentDocument.seo?.imageField === "coverImageUrl" &&
        detailPage.currentDocument.sections.some(
          (section) =>
            section.type === "hero" &&
            section.variant === "split" &&
            section.blocks.some((block) => block.type === "image")
        )
    )
  ).toBe(true);
  const contentRoutes =
    ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  expect(contentRoutes.map((route) => route.detailPageId).sort()).toEqual(
    deps.__state.detailPages.map((detailPage) => detailPage.id).sort()
  );
  expect(deps.__state.menus.map((menu) => menu.location).sort()).toEqual(["footer", "primary"]);
  expect(deps.__state.menuItemsByMenu.get("menu-1")).toHaveLength(7);
  expect(deps.__state.menuItemsByMenu.get("menu-2")).toHaveLength(7);
  expect(deps.__state.seoDocuments.filter((entry) => entry.targetType === "page")).toHaveLength(7);
});

test("executeAssistantActionPlan keeps media readiness pending without a required media page image", async () => {
  const deps = createDeps();
  const plan = buildFullServiceSitePlan({
    prompt: [
      "Stworz premium strone dla studia architektonicznego Studio Forma.",
      "Potrzebuje portfolio realizacji, oferte uslug z podstronami, proces wspolpracy i kontakt z formularzem leadowym.",
      "Realizacje maja miec katalog z kategoria, lokalizacja i rokiem.",
    ].join(" "),
    promptKind: "setup_request",
  });
  const driftedPlan = structuredClone(plan) as AssistantActionPlan;
  for (const action of driftedPlan.actions) {
    if (action.type !== "page.upsert" || action.input.slug !== "/o-nas") continue;
    action.input.sections = (action.input.sections ?? []).map((section) => ({
      ...section,
      blocks: section.blocks.filter((block) => block.type !== "image"),
    }));
  }

  const executed = await executeAssistantActionPlan(
    {
      plan: driftedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-full-service-media-drift",
    },
    deps
  );

  expect(executed.summary.failed).toBe(0);
  expect(executed.plan.metadata?.launchReadiness?.checks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "pages", status: "satisfied" }),
      expect.objectContaining({ id: "public-content", status: "satisfied" }),
      expect.objectContaining({ id: "media", status: "pending_execute" }),
    ])
  );
});

test("executeAssistantActionPlan resolves supporting page collection links from content type slugs", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link",
    status: "ready",
    intentId: "supporting-page-collection-link",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting products page.",
    summary: "Supporting products page with an explicit collection link.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-products-comparison",
        type: "page.upsert",
        title: "Create products comparison page",
        description: "Create a supporting page linked to the products collection.",
        input: {
          title: "Compare Products",
          slug: "/compare-products",
          status: "draft",
          introTitle: "Compare products",
          introBody: "Pick the right model.",
          sections: [createTestPageIntroSection("products-comparison-intro", "Compare products")],
          collectionLink: {
            contentTypeSlug: "products",
            pageRole: "supporting-page",
            compositionKey: "comparison",
          },
        },
      },
    ],
  };

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (deps.__state.pages[0]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    contentTypeId: contentType.id,
    pageRole: "supporting-page",
    compositionKey: "comparison",
  });
});
