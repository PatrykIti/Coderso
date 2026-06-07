import { expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import {
  buildSiteBuilderIntakeCompileResult,
  buildActionPlanRequestFromReviewedIntake,
  compileIntakeToSiteKitPlanInput,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
import { AssistantSiteBuilderIntakeError } from "../../../core/services/assistant/assistantSiteBuilderIntakeErrors";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { assistantActionPlanRequestSchema } from "../../../core/server/validation/assistantActionSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";

const basicCoffeeDirectorySession: AssistantSiteBuilderIntakeSession =
  withConfirmedSiteBuilderIntakeReview({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "basic",
    currentStepId: "review",
    answers: [
      {
        stepId: "business-profile",
        values: {
          siteName: "Mapa Kawy",
          entityName: "Fundacja Mapa Kawy",
          topic: "coffee venues and events",
          vertical: "hospitality directory",
          audience: "people looking for places to work, meet, and taste coffee",
          locale: "pl",
          region: "Krakow",
          summary: "Create a public guide without technical wording.",
        },
      },
      {
        stepId: "site-goals",
        values: {
          goals: ["show places", "collect inquiries", "build trust"],
          primaryGoal: "collect inquiries",
        },
      },
      {
        stepId: "site-map",
        values: {
          pageRoles: ["home", "locations", "blog", "faq", "contact"],
        },
      },
      {
        stepId: "menu",
        values: {
          menuPreset: "location-aware",
          primaryActionLabel: "Ask about cooperation",
          primaryActionPageRole: "contact",
        },
      },
      {
        stepId: "homepage-sections",
        values: {
          sectionRoles: ["value-proposition", "featured-items", "proof", "lead-capture"],
        },
      },
      {
        stepId: "hero",
        values: {
          heroPreset: "location-led",
          headline: "Find a good coffee place",
          subheadline: "A guide to venues, events, and routes.",
          primaryCallToAction: "Browse places",
        },
      },
      {
        stepId: "subpages",
        values: {
          pageRoles: ["about", "team"],
        },
      },
      {
        stepId: "media-policy",
        values: {
          mediaPolicy: "curated",
        },
      },
    ],
  });

const productCatalogSession: AssistantSiteBuilderIntakeSession =
  withConfirmedSiteBuilderIntakeReview({
    ...basicCoffeeDirectorySession,
    mode: "advanced",
    answers: [
      {
        stepId: "business-profile",
        values: {
          siteName: "Studio Ceramiki",
          topic: "handmade ceramic products and workshops",
          vertical: "commerce",
          audience: "buyers and workshop participants",
          locale: "en",
          summary: "Sell products and show workshops.",
        },
      },
      {
        stepId: "site-goals",
        values: {
          goals: ["sell products", "show catalog", "collect leads"],
          primaryGoal: "sell products",
        },
      },
      {
        stepId: "site-map",
        values: {
          pageRoles: ["home", "products", "portfolio", "contact"],
        },
      },
      {
        stepId: "menu",
        values: {
          menuPreset: "conversion-focused",
          primaryActionLabel: "Ask about order",
          primaryActionPageRole: "contact",
          advancedMenuBehaviorIds: ["grouped", "sticky", "mobile-drawer"],
          advancedCtaTargetPageRole: "contact",
        },
      },
      {
        stepId: "homepage-sections",
        values: {
          sectionRoles: ["featured-items", "proof", "lead-capture"],
          advancedSectionVariantIds: [
            "featured-items-cards",
            "proof-spotlight",
            "lead-capture-standard",
          ],
        },
      },
      {
        stepId: "hero",
        values: {
          heroPreset: "offer-with-proof",
          headline: "Ceramics made for daily use",
          advancedHeroVariantId: "split",
        },
      },
      {
        stepId: "subpages",
        values: {
          pageRoles: ["about", "faq"],
        },
      },
      {
        stepId: "media-policy",
        values: {
          mediaPolicy: "placeholder",
        },
      },
      {
        stepId: "content-engine",
        values: {
          contentEngines: ["products", "portfolio", "faq"],
        },
      },
    ],
  });

const withBusinessProfileValues = (
  session: AssistantSiteBuilderIntakeSession,
  values: Record<string, unknown>
): AssistantSiteBuilderIntakeSession =>
  withConfirmedSiteBuilderIntakeReview({
    ...session,
    answers: session.answers
      .filter((answer) => answer.stepId !== "review")
      .map((answer) =>
        answer.stepId === "business-profile"
          ? {
              ...answer,
              values: {
                ...answer.values,
                ...values,
              },
            }
          : answer
      ),
  });

test("compileIntakeToSiteKitPlanInput maps reviewed Basic intake to schema-exact siteKit context", () => {
  const siteKit = compileIntakeToSiteKitPlanInput(basicCoffeeDirectorySession);

  expect(Object.keys(siteKit).sort()).toEqual(
    [
      "businessType",
      "enabledStepIds",
      "goals",
      "locale",
      "preferredKitId",
      "region",
      "selectedKitId",
      "siteName",
    ].sort()
  );
  expect(siteKit).toEqual({
    businessType: "services_directory",
    goals: [
      "lead_generation",
      "catalog_showcase",
      "reviews_social_proof",
      "collect_qualified_leads",
    ],
    locale: "pl",
    region: "Krakow",
    siteName: "Mapa Kawy",
    preferredKitId: "services-directory",
    selectedKitId: "services-directory",
    enabledStepIds: ["settings", "content-model", "pages", "forms", "navigation", "qa"],
  });
  expect(siteKit).not.toHaveProperty("mediaPolicy");
  expect(siteKit).not.toHaveProperty("pageRoles");
  expect(siteKit).not.toHaveProperty("siteBuilderIntake");
  expect(siteKit).not.toHaveProperty("advancedRuntimeOverrides");
});

test("compileIntakeToSiteKitPlanInput maps Advanced product facts without one-industry defaults", () => {
  const siteKit = compileIntakeToSiteKitPlanInput(productCatalogSession);

  expect(siteKit).toMatchObject({
    businessType: "small_ecommerce",
    preferredKitId: "small-ecommerce",
    selectedKitId: "small-ecommerce",
    locale: "en",
    siteName: "Studio Ceramiki",
  });
  expect(siteKit.goals).toEqual([
    "lead_generation",
    "catalog_showcase",
    "reviews_social_proof",
    "sell_products",
    "collect_qualified_leads",
  ]);
  expect(siteKit.advancedRuntimeOverrides).toMatchObject({
    schemaVersion: 1,
    menu: {
      behaviorIds: ["grouped", "sticky", "mobile-drawer"],
      variantId: "split",
      ctaTargetPageRole: "contact",
    },
    hero: {
      variantId: "split",
      widgetType: "hero",
      widgetVariantId: "split",
    },
    sectionVariants: [
      {
        variantId: "featured-items-cards",
        widgetType: "content-list",
        widgetVariantId: "cards",
      },
      {
        variantId: "proof-spotlight",
        widgetType: "testimonials",
        widgetVariantId: "spotlight",
      },
      {
        variantId: "lead-capture-standard",
        widgetType: "form-embed",
        widgetVariantId: "standard",
      },
    ],
  });
});

test("compileIntakeToSiteKitPlanInput does not treat generic workshops as automotive", () => {
  const ceramicWorkshop = compileIntakeToSiteKitPlanInput(
    withBusinessProfileValues(productCatalogSession, {
      siteName: "Warsztaty Ceramiczne",
      topic: "warsztaty ceramiczne dla rodzin",
      vertical: "education and handmade products",
      summary: "Rodzinne zajecia, produkty ceramiczne i zapisy na wydarzenia.",
    })
  );
  const homeAutomationWorkshop = compileIntakeToSiteKitPlanInput(
    withBusinessProfileValues(productCatalogSession, {
      siteName: "Dom Inteligentny",
      topic: "warsztaty automatyki domowej dla rodzin",
      vertical: "education and smart home",
      summary: "Zajecia o automatyce domowej, czujnikach i scenariuszach smart home.",
    })
  );
  const carWorkshop = compileIntakeToSiteKitPlanInput(
    withBusinessProfileValues(basicCoffeeDirectorySession, {
      siteName: "Auto Punkt",
      topic: "warsztat samochodowy i diagnostyka pojazdow",
      vertical: "automotive service",
    })
  );

  expect(ceramicWorkshop.businessType).not.toBe("automotive_workshop");
  expect(ceramicWorkshop.preferredKitId).not.toBe("automotive-workshop");
  expect(homeAutomationWorkshop.businessType).not.toBe("automotive_workshop");
  expect(homeAutomationWorkshop.preferredKitId).not.toBe("automotive-workshop");
  expect(carWorkshop.businessType).toBe("automotive_workshop");
  expect(carWorkshop.preferredKitId).toBe("automotive-workshop");
});

test("compileIntakeToSiteKitPlanInput maps single-business local services away from directory kits", () => {
  const bikeService = compileIntakeToSiteKitPlanInput(
    withBusinessProfileValues(basicCoffeeDirectorySession, {
      siteName: "Velo Serwis Miejski",
      topic: "Serwis rowerowy, przeglady i szybkie naprawy",
      vertical: "serwis rowerowy",
      summary: "Lokalna firma uslugowa z oferta uslug, realizacjami, opiniami, FAQ i kontaktem.",
      offerSummary:
        "Przeglady sezonowe, naprawy hamulcow i napedu oraz umawianie przegladow rowerow.",
    })
  );

  expect(bikeService.businessType).toBe("custom");
  expect(bikeService.preferredKitId).toBe("local-service-business");
  expect(bikeService.selectedKitId).toBe("local-service-business");
});

test("compileIntakeToSiteKitPlanInput treats a single-business service catalog as local service", () => {
  const serviceCatalog = compileIntakeToSiteKitPlanInput(
    withBusinessProfileValues(basicCoffeeDirectorySession, {
      siteName: "HydroFix",
      topic: "firma hydrauliczna",
      vertical: "lokalna firma uslugowa",
      summary: "Potrzebuje strony z katalogiem uslug, realizacjami, opiniami, FAQ i kontaktem.",
      offerSummary:
        "Katalog uslug hydraulicznych, cennik orientacyjny, realizacje oraz formularz zapytania.",
    })
  );

  expect(serviceCatalog.businessType).toBe("custom");
  expect(serviceCatalog.preferredKitId).toBe("local-service-business");
  expect(serviceCatalog.selectedKitId).toBe("local-service-business");
});

test("compileIntakeToSiteKitPlanInput still maps explicit provider catalogs to directory kit", () => {
  const providerCatalog = compileIntakeToSiteKitPlanInput(
    withBusinessProfileValues(basicCoffeeDirectorySession, {
      siteName: "Katalog Fachowcow",
      topic: "katalog uslugodawcow i wykonawcow",
      vertical: "services marketplace",
      summary: "Publiczny katalog firm z profilami dostawcow, wyszukiwarka i formularzem zgloszen.",
      offerSummary: "Lista wielu wykonawcow oraz filtrowanie po miescie i kategorii.",
    })
  );

  expect(providerCatalog.businessType).toBe("services_directory");
  expect(providerCatalog.preferredKitId).toBe("services-directory");
  expect(providerCatalog.selectedKitId).toBe("services-directory");
});

test("buildActionPlanRequestFromReviewedIntake returns internal strict siteKit handoff", () => {
  const request = buildActionPlanRequestFromReviewedIntake(productCatalogSession);

  expect(request.context).toEqual({ siteKit: request.context.siteKit });
  expect(JSON.stringify(request.context)).not.toContain("advancedLayout");
  expect(JSON.stringify(request.context)).not.toContain("referenceDesignBrief");
  expect(JSON.stringify(request.context)).not.toContain("advancedSectionVariantIds");
  expect(JSON.stringify(request.context)).not.toContain("actions");
  expect(() => validate(assistantActionPlanRequestSchema, request)).toThrow("Invalid payload");
  expect(() =>
    validate(assistantActionPlanRequestSchema, {
      prompt: request.prompt,
      context: {
        siteBuilderIntakeState: {
          activeSession: productCatalogSession,
        },
      },
    })
  ).not.toThrow();
});

test("buildSiteBuilderIntakeCompileResult keeps review metadata outside siteKit", () => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(productCatalogSession);
  const result = buildSiteBuilderIntakeCompileResult(normalized.facts ?? {});
  const serializedSiteKit = JSON.stringify(result.siteKit);

  expect(result.siteKit).toMatchObject({
    businessType: "small_ecommerce",
    selectedKitId: "small-ecommerce",
  });
  expect(result.reviewFacts).toMatchObject({
    menuPreset: "conversion-focused",
    heroPreset: "offer-with-proof",
    mediaPolicy: "placeholder",
    contentEngines: ["products", "portfolio", "faq"],
    designPresetId: undefined,
  });
  expect(result.reviewFacts.advancedLayout).toMatchObject({
    menu: {
      behaviorIds: ["grouped", "sticky", "mobile-drawer"],
    },
    hero: {
      variantId: "split",
    },
  });
  expect(result.siteKit.advancedRuntimeOverrides).toMatchObject({
    menu: {
      behaviorIds: ["grouped", "sticky", "mobile-drawer"],
      variantId: "split",
      ctaTargetPageRole: "contact",
    },
    hero: {
      variantId: "split",
    },
  });
  expect(serializedSiteKit).not.toContain("advancedLayout");
  expect(serializedSiteKit).not.toContain("referenceDesignBrief");
  expect(serializedSiteKit).not.toContain("mediaPolicy");
  expect(serializedSiteKit).not.toContain("pageRoles");
  expect(serializedSiteKit).toContain("advancedRuntimeOverrides");
  expect(result.gates).toEqual([]);
});

test("compiled siteKit context is gated outside reviewed active session", () => {
  const request = buildActionPlanRequestFromReviewedIntake(productCatalogSession);
  const plan = normalizeAssistantActionPlan(planAssistantActions(request));

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.responseKind).toBe("gated");
  expect(plan.actions).toEqual([]);
});

test("reviewed active intake session hands off to strict siteKit action plan", () => {
  const plan = normalizeAssistantActionPlan(
    planAssistantActions({
      prompt: "Continue guided site-builder intake.",
      context: {
        siteBuilderIntakeState: {
          activeSession: productCatalogSession,
        },
      },
    })
  );

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.responseKind).toBe("action_plan");
  expect(plan.metadata?.siteBuilderIntake).toBeUndefined();
  expect(plan.actions.map((action) => action.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
});

test("compileIntakeToSiteKitPlanInput fails closed before review confirmation", () => {
  try {
    compileIntakeToSiteKitPlanInput({
      ...basicCoffeeDirectorySession,
      answers: [
        ...basicCoffeeDirectorySession.answers.slice(0, -1),
        {
          stepId: "review",
          values: {
            reviewState: "confirmed",
            confirmed: false,
          },
        },
      ],
    });
    throw new Error("expected_intake_error");
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantSiteBuilderIntakeError);
    expect((error as AssistantSiteBuilderIntakeError).code).toBe("intake_session_invalid");
    expect((error as AssistantSiteBuilderIntakeError).details).toMatchObject({
      reason: "site_kit_handoff_blocked",
      reviewState: "confirmed",
    });
  }
});
