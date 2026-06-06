import { expect, test } from "vitest";

import {
  buildSiteBuilderIntakeAdvancedLayoutFacts,
  listSiteBuilderIntakeAdvancedHeroVariants,
  listSiteBuilderIntakeAdvancedMenuBehaviors,
  listSiteBuilderIntakeAdvancedSectionVariants,
  listSiteBuilderIntakeAdvancedWidgetRequirements,
  resolveSiteBuilderIntakeAdvancedHeroVariant,
  resolveSiteBuilderIntakeAdvancedMenuBehavior,
  resolveSiteBuilderIntakeAdvancedSectionVariant,
  siteBuilderIntakeAdvancedHeroVariantOptionDefinitions,
  siteBuilderIntakeAdvancedMenuBehaviorOptionDefinitions,
  siteBuilderIntakeAdvancedSectionVariantOptionDefinitions,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeAdvancedOptions";
import {
  normalizeAssistantSiteBuilderIntakeAnswer,
  normalizeAssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  getSiteBuilderIntakeOption,
  listSiteBuilderIntakeOptions,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeRegistry";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  assistantSiteBuilderAdvancedHeroVariantIds,
  assistantSiteBuilderAdvancedMenuBehaviorIds,
  assistantSiteBuilderAdvancedSectionVariantIds,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { listWidgetsForSurface } from "../../../core/widgets/registry";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

const secretLikePattern =
  /\b(password|token|secret|api[-_\s]?key|authorization|cookie|bearer|csrf|session)\b/iu;

test("Advanced option registries are deterministic and backend-owned", () => {
  const menu = listSiteBuilderIntakeAdvancedMenuBehaviors();
  const heroes = listSiteBuilderIntakeAdvancedHeroVariants();
  const sections = listSiteBuilderIntakeAdvancedSectionVariants();

  expect(Object.isFrozen(menu)).toBe(true);
  expect(Object.isFrozen(heroes)).toBe(true);
  expect(Object.isFrozen(sections)).toBe(true);
  expect(menu.map((option) => option.id)).toEqual([...assistantSiteBuilderAdvancedMenuBehaviorIds]);
  expect(heroes.map((option) => option.id)).toEqual([
    ...assistantSiteBuilderAdvancedHeroVariantIds,
  ]);
  expect(sections.map((option) => option.id)).toEqual([
    ...assistantSiteBuilderAdvancedSectionVariantIds,
  ]);
  expect(siteBuilderIntakeAdvancedMenuBehaviorOptionDefinitions.map((option) => option.id)).toEqual(
    [...assistantSiteBuilderAdvancedMenuBehaviorIds]
  );
  expect(siteBuilderIntakeAdvancedHeroVariantOptionDefinitions.map((option) => option.id)).toEqual([
    ...assistantSiteBuilderAdvancedHeroVariantIds,
  ]);
  expect(
    siteBuilderIntakeAdvancedSectionVariantOptionDefinitions.map((option) => option.id)
  ).toEqual([...assistantSiteBuilderAdvancedSectionVariantIds]);
  expect(listSiteBuilderIntakeOptions("advancedMenuBehaviors").map((option) => option.id)).toEqual([
    ...assistantSiteBuilderAdvancedMenuBehaviorIds,
  ]);
  expect(listSiteBuilderIntakeOptions("advancedHeroVariants").map((option) => option.id)).toEqual([
    ...assistantSiteBuilderAdvancedHeroVariantIds,
  ]);
  expect(
    listSiteBuilderIntakeOptions("advancedSectionVariants").map((option) => option.id)
  ).toEqual([...assistantSiteBuilderAdvancedSectionVariantIds]);

  for (const definition of [...menu, ...heroes, ...sections]) {
    expect(Object.isFrozen(definition)).toBe(true);
    expect(definition.label.trim()).not.toBe("");
    expect(definition.description.trim()).not.toBe("");
    expect(JSON.stringify(definition)).not.toMatch(secretLikePattern);
  }
});

test("Advanced layout facts map selected ids to existing widget-backed review facts", () => {
  const facts = buildSiteBuilderIntakeAdvancedLayoutFacts({
    menuBehaviorIds: ["grouped", "sticky", "mobile-drawer"],
    ctaTargetPageRole: "contact",
    heroVariantId: "media-left",
    sectionVariantIds: ["proof-spotlight", "faq-two-column", "call-to-action-split"],
    selectedSectionRoleIds: ["proof", "faq", "call-to-action"],
    designSupportedSectionRoleIds: ["proof", "faq", "call-to-action"],
  });

  expect(facts).toMatchObject({
    menu: {
      behaviorIds: ["grouped", "sticky", "mobile-drawer"],
      widgetType: "navigation",
      module: "navigation",
      variantId: "split",
      structure: "grouped",
      sticky: true,
      transparent: false,
      mobileMode: "drawer",
      ctaTargetPageRole: "contact",
    },
    hero: {
      variantId: "media-left",
      widgetType: "hero",
      widgetVariantId: "media-left",
      module: "content",
      alias: "hero",
      pagePresetIds: ["content:landing-home"],
      sectionPresetIds: ["content:hero-benefits"],
    },
    sectionVariants: [
      {
        variantId: "proof-spotlight",
        sectionRoleId: "proof",
        alias: "testimonials",
        widgetType: "testimonials",
        widgetVariantId: "spotlight",
        module: "engagement",
      },
      {
        variantId: "faq-two-column",
        sectionRoleId: "faq",
        alias: "faq",
        widgetType: "faq-accordion",
        widgetVariantId: "two-column",
        module: "engagement",
      },
      {
        variantId: "call-to-action-split",
        sectionRoleId: "call-to-action",
        alias: "cta",
        widgetType: "cta-banner",
        widgetVariantId: "split",
        module: "content",
      },
    ],
    gates: [],
  });
});

test("Advanced option ids fail closed and CTA targets cannot be arbitrary URLs", () => {
  expect(() => resolveSiteBuilderIntakeAdvancedMenuBehavior("mega-menu")).toThrow(
    "intake_option_invalid"
  );
  expect(() => resolveSiteBuilderIntakeAdvancedHeroVariant("custom-3d")).toThrow(
    "intake_option_invalid"
  );
  expect(() => resolveSiteBuilderIntakeAdvancedSectionVariant("process-timeline")).toThrow(
    "intake_option_invalid"
  );
  expect(() => getSiteBuilderIntakeOption("advancedSectionVariants", "pricing-table")).toThrow(
    "intake_option_invalid"
  );
  expect(() =>
    normalizeAssistantSiteBuilderIntakeAnswer({
      stepId: "menu",
      values: {
        menuPreset: "simple",
        advancedCtaTargetPageRole: "https://evil.test/buy-now",
      },
    })
  ).toThrow("intake_option_invalid");
  expect(() =>
    normalizeAssistantSiteBuilderIntakeAnswer({
      stepId: "menu",
      values: {
        menuPreset: "simple",
        ctaHref: "https://evil.test/buy-now",
      },
    })
  ).toThrow("intake_answer_unknown_key");
});

test("Advanced option combinations produce explicit gates instead of invented widgets", () => {
  const facts = buildSiteBuilderIntakeAdvancedLayoutFacts({
    menuBehaviorIds: ["single-level", "grouped", "transparent", "nontransparent"],
    heroVariantId: "split",
    sectionVariantIds: ["faq-two-column"],
    selectedSectionRoleIds: ["proof"],
    designSupportedSectionRoleIds: ["proof"],
  });

  expect(facts?.menu).toMatchObject({
    structure: "grouped",
    transparent: false,
  });
  expect(facts?.gates.map((gate) => gate.code)).toEqual([
    "advanced_menu_structure_conflict",
    "advanced_menu_surface_conflict",
    "advanced_section_role_missing",
    "advanced_section_preset_unsupported",
  ]);
  expect(facts?.sectionVariants).toEqual([
    expect.objectContaining({
      variantId: "faq-two-column",
      sectionRoleId: "faq",
      widgetType: "faq-accordion",
    }),
  ]);
});

test("Advanced intake derives normalized facts and rejects Basic tampering", () => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(
    withConfirmedSiteBuilderIntakeReview({
      version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
      mode: "advanced",
      currentStepId: "review",
      answers: [
        {
          stepId: "business-profile",
          values: {
            siteName: "Plant Studio",
            topic: "plant shop and workshops",
            locale: "pl",
          },
        },
        {
          stepId: "site-goals",
          values: {
            goals: ["sell products", "collect leads"],
          },
        },
        {
          stepId: "site-map",
          values: {
            pageRoles: ["home", "products", "faq", "contact"],
          },
        },
        {
          stepId: "menu",
          values: {
            menuPreset: "conversion-focused",
            primaryActionPageRole: "contact",
            advancedMenuBehaviorIds: ["sticky", "mobile-drawer"],
            advancedCtaTargetPageRole: "contact",
          },
        },
        {
          stepId: "homepage-sections",
          values: {
            sectionRoles: ["featured-items", "faq", "lead-capture"],
            advancedSectionVariantIds: [
              "featured-items-cards",
              "faq-two-column",
              "lead-capture-standard",
            ],
          },
        },
        {
          stepId: "hero",
          values: {
            heroPreset: "offer-with-proof",
            advancedHeroVariantId: "split",
          },
        },
        {
          stepId: "media-policy",
          values: {
            mediaPolicy: "placeholder",
          },
        },
      ],
    })
  );

  expect(normalized.facts?.advancedLayout).toMatchObject({
    menu: {
      behaviorIds: ["sticky", "mobile-drawer"],
      variantId: "with-cta",
      sticky: true,
      mobileMode: "drawer",
      ctaTargetPageRole: "contact",
    },
    hero: {
      widgetVariantId: "split",
    },
    sectionVariants: [
      {
        variantId: "featured-items-cards",
        widgetType: "content-list",
      },
      {
        variantId: "faq-two-column",
        widgetType: "faq-accordion",
      },
      {
        variantId: "lead-capture-standard",
        widgetType: "form-embed",
      },
    ],
    gates: [],
  });
  expect(normalized.facts?.readyForExecution).toBe(true);

  expect(() =>
    normalizeAssistantSiteBuilderIntakeSession({
      version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
      mode: "basic",
      currentStepId: "menu",
      answers: [
        {
          stepId: "business-profile",
          values: {
            siteName: "Tamper",
            locale: "pl",
          },
        },
        {
          stepId: "menu",
          values: {
            menuPreset: "simple",
            advancedMenuBehaviorIds: ["sticky"],
          },
        },
      ],
    })
  ).toThrow("intake_answer_invalid");
});

test("Advanced option widget requirements match registered page-builder widgets", () => {
  ensureRuntimeWidgetsRegistered();
  const widgetsByType = new Map(
    listWidgetsForSurface("page-builder").map((widget) => [widget.type, widget])
  );

  for (const requirement of listSiteBuilderIntakeAdvancedWidgetRequirements()) {
    const widget = widgetsByType.get(requirement.widgetType);
    expect(widget, requirement.widgetType).toBeTruthy();
    expect(widget?.module).toBe(requirement.module);
    expect(widget?.complexity).toBe("composite");
    expect(widget?.variants.map((variant) => variant.id)).toContain(requirement.variantId);
  }
});
