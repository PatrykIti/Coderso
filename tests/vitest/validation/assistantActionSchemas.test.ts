import { expect, test } from "vitest";

import { ApiError } from "../../../core/server/errorHandler";
import { assistantActionPlanRequestSchema } from "../../../core/server/validation/assistantActionSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { ASSISTANT_SITE_BUILDER_INTAKE_VERSION } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

const expectValidationError = (payload: Record<string, unknown>) => {
  try {
    validate(assistantActionPlanRequestSchema, payload);
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
};

test("assistant action planning rejects client-supplied resource catalogs", () => {
  expect(() =>
    validate(assistantActionPlanRequestSchema, {
      prompt: "plan detail page",
      context: { includeResourceCatalog: true },
    })
  ).not.toThrow();
  expectValidationError({
    prompt: "plan detail page",
    context: { includeResourceCatalog: true, resourceCatalog: { schemaVersion: 1 } },
  });
});

test("assistant planning accepts strict basic and advanced intake states", () => {
  expect(() =>
    validate(assistantActionPlanRequestSchema, {
      prompt: "continue Basic site-builder intake",
      context: {
        siteBuilderIntakeState: {
          activeSession: {
            version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
            mode: "basic",
            currentStepId: "site-goals",
            answers: [
              { stepId: "business-profile", values: { siteName: "Provider Finder", locale: "en" } },
            ],
          },
        },
      },
    })
  ).not.toThrow();
  expect(() =>
    validate(assistantActionPlanRequestSchema, {
      prompt: "continue Advanced site-builder intake",
      context: {
        siteBuilderIntakeState: {
          requestedMode: "advanced",
          activeSession: {
            version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
            mode: "advanced",
            currentStepId: "design-preset",
            answers: [
              {
                stepId: "menu",
                values: {
                  menuPreset: "simple",
                  advancedMenuBehaviorIds: ["sticky", "mobile-drawer"],
                  advancedCtaTargetPageRole: "contact",
                },
              },
              {
                stepId: "design-preset",
                values: {
                  designPresetId: "modern",
                  designBrief: "Clean controlled visual direction.",
                },
              },
            ],
          },
        },
      },
    })
  ).not.toThrow();
});

test("assistant planning rejects tampered basic rawHtml and advanced option IDs", () => {
  expectValidationError({
    prompt: "continue Basic site-builder intake",
    context: {
      siteBuilderIntakeState: {
        activeSession: {
          version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
          mode: "basic",
          currentStepId: "site-goals",
          answers: [
            {
              stepId: "business-profile",
              values: {
                siteName: "Provider Finder",
                locale: "en",
                rawHtml: "<script>alert(1)</script>",
              },
            },
          ],
        },
      },
    },
  });
  expectValidationError({
    prompt: "continue Advanced site-builder intake",
    context: {
      siteBuilderIntakeState: {
        requestedMode: "advanced",
        activeSession: {
          version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
          mode: "advanced",
          currentStepId: "hero",
          answers: [
            {
              stepId: "hero",
              values: { heroPreset: "offer-with-proof", advancedHeroVariantId: "fullscreen-video" },
            },
          ],
        },
      },
    },
  });
});
