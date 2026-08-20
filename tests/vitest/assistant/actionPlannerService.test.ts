import { afterEach, expect, test, vi } from "vitest";

import {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import { mapCmsOperationToActionPlan } from "../../../core/services/assistant/cmsOperationActionMapper";
import {
  isCuratedMediaUrl,
  selectCuratedMediaProfile,
} from "../../../core/services/media/curatedMediaProfiles";
import type {
  AssistantActionContext,
  AssistantAdminContext,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";
import {
  carCatalogMarkdownPrompt,
  createContentTypeFieldAddContext,
  createFakeProvider,
  createPageWithReferencedTemplateContext,
  createTrustedCatalog,
  contentTypeFieldAddPrompt,
} from "./actionPlannerFixtures";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("detects guide planning prompt for house projects catalog", () => {
  expect(
    isLikelyGuidePlanningPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toBe(true);
  expect(
    isLikelyHouseProjectsCatalogPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toBe(true);
});

test("classifyAssistantPrompt distinguishes docs, setup, and refinement prompts", () => {
  expect(classifyAssistantPrompt("gdzie zmienie kolory hero widgetu?")).toMatchObject({
    promptKind: "docs_question",
    intentFamily: "unknown",
  });

  expect(
    classifyAssistantPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toMatchObject({
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
  });

  expect(classifyAssistantPrompt("dodaj filtr po metrazu i liczbie pokoi")).toMatchObject({
    promptKind: "refinement_request",
  });
});

test("planAssistantActions builds ready house projects catalog plan", () => {
  const plan = planAssistantActions({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("setup_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
  expect(plan.actions.some((action) => action.type === "page.upsert")).toBe(true);
});

test("planAssistantActions composes a single-adjunct house projects prompt through the live blueprint planner path", () => {
  const plan = planAssistantActions({
    prompt: "Build a house projects catalog with a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("blueprint-composed-house-projects-catalog");
  expect(
    plan.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/projekty-domow", "/blog"]);
});

test("planAssistantActions composes mixed product prompts through the live blueprint planner path", () => {
  const plan = planAssistantActions({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("blueprint-composed-product-catalog");
  expect(plan.actions.filter((action) => action.type === "content-type.upsert")).toHaveLength(1);
  expect(plan.actions.filter((action) => action.type === "form.upsert")).toHaveLength(1);
  expect(
    plan.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/produkty", "/blog"]);
  expect(plan.metadata?.blueprintShadow).toBeUndefined();
});

test("planAssistantActions routes broad full-service architecture prompts into Basic intake", () => {
  const plan = planAssistantActions({
    prompt: [
      "Stwórz premium stronę dla studia architektonicznego Studio Forma.",
      "Potrzebuję portfolio realizacji, ofertę usług z podstronami, proces współpracy i kontakt z formularzem leadowym.",
      "Realizacje mają mieć katalog z kategorią, lokalizacją i rokiem.",
    ].join(" "),
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.intentId).toBe("site-builder-basic-intake");
  expect(plan.actions).toEqual([]);
  expect(plan.questions[0]?.id).toBe("site-builder-intake.business-profile");
  expect(plan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "basic",
    nextStepId: "business-profile",
    canExecute: false,
  });
});

test("selectCuratedMediaProfile matches supported industries without unsafe fallback", () => {
  expect(
    selectCuratedMediaProfile({
      prompt: "Strona premium dla pracowni architektury z portfolio wnetrz.",
      intentFamily: "service_business_full_site",
    })?.id
  ).toBe("architecture-studio");

  expect(
    selectCuratedMediaProfile({
      prompt: "Strona dla restauracji z menu, rezerwacjami i filmem w tle.",
      intentFamily: "service_business_full_site",
    })
  ).toBeNull();
});

test("classifyAssistantPrompt does not route generic non-architecture full-site prompts to architecture blueprint", () => {
  expect(
    classifyAssistantPrompt(
      "Stworz kompletny serwis dla restauracji z menu, rezerwacjami, galeria i kontaktem."
    ).intentFamily
  ).not.toBe("service_business_full_site");
});

test("planAssistantActions routes English full-service site prompts into Basic intake", () => {
  const plan = planAssistantActions({
    prompt: [
      "Create a premium full-service architecture studio site for Studio Forma.",
      "It must include home, services, portfolio, about, process, references, contact with lead form, primary nav, footer, SEO, public sample content, and working services and portfolio detail pages.",
      "Use a clean premium architecture-studio UX with strong public pages, not a scaffold.",
    ].join(" "),
    context: {
      page: "/admin/settings/assistant",
      locale: "en-US",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
  expect(plan.promptKind).toBe("setup_request");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.intentId).toBe("site-builder-basic-intake");
  expect(plan.actions).toEqual([]);
  expect(plan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "basic",
    nextStepId: "business-profile",
  });
});

test("planAssistantActions builds a generic catalog from nontechnical markdown field briefs", () => {
  const plan = planAssistantActions({
    prompt: carCatalogMarkdownPrompt,
    context: {
      page: "/admin/settings/assistant",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.responseKind).toBe("action_plan");
  expect(plan.intentId).toBe("generic-catalog-samochodow");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);

  const contentTypeAction = plan.actions.find((action) => action.type === "content-type.upsert");
  expect(contentTypeAction?.input).toMatchObject({
    slug: "samochodow",
    name: "Samochodow",
  });
  expect(contentTypeAction?.input.schema).toMatchObject({
    type: "object",
    additionalProperties: false,
    properties: {
      brand: { type: "string" },
      model: { type: "string" },
      year: { type: "integer" },
      price: { type: "number" },
      mileage_km: { type: "integer" },
      short_description: { type: "string", xFieldType: "richtext" },
      featured_image: { type: "string", xFieldType: "media" },
      gallery: { type: "array", xFieldType: "media" },
      availability_status: { type: "string" },
    },
  });

  const listingQueryAction = plan.actions.find((action) => action.type === "listing-query.upsert");
  expect(listingQueryAction?.input).toMatchObject({
    contentTypeSlug: "samochodow",
    fields: expect.arrayContaining([
      "data.short_description",
      "data.featured_image",
      "data.availability_status",
      "data.brand",
      "data.price",
    ]),
  });
  const pageAction = plan.actions.find((action) => action.type === "page.upsert");
  expect(pageAction?.input).toMatchObject({
    slug: "/samochodow",
    collectionLink: {
      contentTypeSlug: "samochodow",
      pageRole: "canonical-list-page",
    },
  });
});
