import { expect, test } from "bun:test";

import {
  postAutosaveSchema,
  postMetadataSchema,
} from "../../../core/server/validation/postSchemas";
import {
  contentEntryAllEntriesQuerySchema,
  contentEntryMetadataSchema,
} from "../../../core/server/validation/contentSchemas";
import { assistantActionPlanRequestSchema } from "../../../core/server/validation/assistantActionSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { ApiError } from "../../../core/server/errorHandler";
import { ASSISTANT_SITE_BUILDER_INTAKE_VERSION } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

test("schema validator supports date-time metadata schemas without compile errors", () => {
  expect(() =>
    validate(postMetadataSchema, {
      tags: ["launch"],
      taxonomy: { categoryId: "cat-1" },
      seo: { robots: "index,follow" },
    })
  ).not.toThrow();

  expect(() =>
    validate(postAutosaveSchema, {
      title: "Draft title",
      tags: ["launch"],
      taxonomy: { categoryId: "cat-1" },
    })
  ).not.toThrow();

  expect(() =>
    validate(postMetadataSchema, {
      scheduledAt: "2026-04-24T08:00:00.000Z",
    })
  ).not.toThrow();

  expect(() =>
    validate(contentEntryMetadataSchema, {
      scheduledAt: "2026-04-24T08:00:00+02:00",
    })
  ).not.toThrow();
});

test("schema validator rejects invalid date-time metadata values", () => {
  try {
    validate(postMetadataSchema, {
      scheduledAt: "tomorrow",
    });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});

test("all content entries query schema rejects unknown filters", () => {
  expect(() => validate(contentEntryAllEntriesQuerySchema, {})).not.toThrow();

  try {
    validate(contentEntryAllEntriesQuerySchema, { type: "posts" });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});

test("assistant action planning request rejects client-supplied resource catalogs", () => {
  expect(() =>
    validate(assistantActionPlanRequestSchema, {
      prompt: "plan detail page",
      context: {
        includeResourceCatalog: true,
      },
    })
  ).not.toThrow();

  try {
    validate(assistantActionPlanRequestSchema, {
      prompt: "plan detail page",
      context: {
        includeResourceCatalog: true,
        resourceCatalog: {
          schemaVersion: 1,
        },
      },
    });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});

test("assistant action planning request accepts strict site-builder intake state", () => {
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
              {
                stepId: "business-profile",
                values: {
                  siteName: "Provider Finder",
                  locale: "en",
                },
              },
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

test("assistant action planning request rejects tampered site-builder intake values", () => {
  try {
    validate(assistantActionPlanRequestSchema, {
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
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});

test("assistant action planning request rejects tampered Advanced intake option ids", () => {
  try {
    validate(assistantActionPlanRequestSchema, {
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
                values: {
                  heroPreset: "offer-with-proof",
                  advancedHeroVariantId: "fullscreen-video",
                },
              },
            ],
          },
        },
      },
    });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});
