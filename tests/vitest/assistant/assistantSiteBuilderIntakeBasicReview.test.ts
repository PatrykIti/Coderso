import { expect, test } from "vitest";

import { deriveBasicSiteMapDefaults } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicDefaults";
import { buildBasicSiteBuilderReviewFacts } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicReview";
import type { AssistantSiteBuilderIntakeFacts } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

const baseFacts = (): AssistantSiteBuilderIntakeFacts => {
  const basicDefaults = deriveBasicSiteMapDefaults({
    pageRoles: ["home", "services", "portfolio", "faq", "contact"],
    goals: ["pokazac uslugi, portfolio i zbierac zapytania"],
    menuPreset: "grouped",
    sectionRoles: [
      "value-proposition",
      "services-overview",
      "featured-items",
      "proof",
      "faq",
      "lead-capture",
      "contact",
      "content-feed",
      "call-to-action",
    ],
  });

  return {
    siteName: "Studio Review",
    locale: "pl",
    goals: ["pokazac uslugi, portfolio i zbierac zapytania"],
    pageRoles: ["home", "services", "portfolio", "faq", "contact"],
    sectionRoles: [...basicDefaults.homepageSectionRoles],
    menuPreset: "grouped",
    heroPreset: "copy-first",
    mediaPolicy: "curated",
    basicDefaults,
    answeredStepIds: [
      "business-profile",
      "site-goals",
      "site-map",
      "menu",
      "hero",
      "homepage-sections",
      "media-policy",
    ],
    missingRequiredStepIds: ["review"],
    missingReviewInputStepIds: [],
    readyForReview: true,
    readyForExecution: false,
  };
};

test("buildBasicSiteBuilderReviewFacts maps Basic section roles to supported widget aliases", () => {
  const review = buildBasicSiteBuilderReviewFacts(baseFacts());

  expect(review.schemaVersion).toBe(1);
  expect(review.pages.map((page) => [page.roleId, page.path])).toEqual([
    ["home", "/"],
    ["services", "/services"],
    ["portfolio", "/portfolio"],
    ["faq", "/faq"],
    ["contact", "/contact"],
  ]);
  expect(review.menuItems.some((item) => item.key === "group-offer")).toBe(true);
  expect(
    review.widgetCandidates.map((candidate) => [candidate.sectionRoleId, candidate.alias])
  ).toEqual([
    ["value-proposition", "hero"],
    ["services-overview", "content-list"],
    ["featured-items", "content-list"],
    ["proof", "testimonials"],
    ["faq", "faq"],
    ["lead-capture", "form-embed"],
    ["contact", "contact"],
    ["content-feed", "posts-feed"],
    ["call-to-action", "cta"],
  ]);
  expect(review.widgetCandidates.every((candidate) => candidate.widgetType)).toBe(true);
  expect(review.summary).toContain("Homepage widget candidates: hero, content-list");
  expect(review.summary).toContain("Readable homepage blocks: Content hero");
  expect(review.contactPath).toBe("/contact");
});

test("buildBasicSiteBuilderReviewFacts infers content candidates and review gates", () => {
  const review = buildBasicSiteBuilderReviewFacts(baseFacts());

  expect(review.contentEngineCandidates.map((candidate) => candidate.id)).toEqual([
    "services",
    "portfolio",
    "faq",
    "testimonials",
    "blog",
  ]);
  expect(review.gates).toEqual([
    {
      code: "content_engine_required",
      severity: "info",
      message:
        "Structured content candidates are review-only until the content-engine adapter creates schemas and pages.",
    },
  ]);
});

test("buildBasicSiteBuilderReviewFacts keeps featured items generic across site categories", () => {
  const basicDefaults = deriveBasicSiteMapDefaults({
    pageRoles: ["home", "products", "contact"],
    goals: ["sprzedawac produkty i zbierac zapytania"],
    menuPreset: "simple",
    sectionRoles: ["featured-items"],
  });

  const review = buildBasicSiteBuilderReviewFacts({
    siteName: "Product Review",
    locale: "pl",
    goals: ["sprzedawac produkty i zbierac zapytania"],
    pageRoles: ["home", "products", "contact"],
    sectionRoles: ["featured-items"],
    menuPreset: "simple",
    heroPreset: "copy-first",
    mediaPolicy: "curated",
    basicDefaults,
    answeredStepIds: [
      "business-profile",
      "site-goals",
      "site-map",
      "menu",
      "hero",
      "homepage-sections",
      "media-policy",
    ],
    missingRequiredStepIds: ["review"],
    missingReviewInputStepIds: [],
    readyForReview: true,
    readyForExecution: false,
  });

  expect(
    review.widgetCandidates.map((candidate) => [candidate.sectionRoleId, candidate.alias])
  ).toEqual([["featured-items", "content-list"]]);
  expect(review.contentEngineCandidates.map((candidate) => candidate.id)).toEqual(["products"]);
  expect(review.contentEngineCandidates.map((candidate) => candidate.id)).not.toContain(
    "portfolio"
  );
});

test("buildBasicSiteBuilderReviewFacts resolves process and gates remaining unsupported sections", () => {
  const facts = {
    ...baseFacts(),
    sectionRoles: ["process", "benefits", "comparison", "pricing"],
  } satisfies AssistantSiteBuilderIntakeFacts;

  const review = buildBasicSiteBuilderReviewFacts(facts);

  expect(
    review.widgetCandidates.map((candidate) => [
      candidate.sectionRoleId,
      candidate.alias,
      candidate.widgetType,
    ])
  ).toEqual([["process", "process", "feature-grid"]]);
  expect(review.gates.map((gate) => [gate.code, gate.sectionRoleId])).toEqual([
    ["widget_alias_unsupported", "benefits"],
    ["widget_alias_unsupported", "comparison"],
    ["widget_alias_unsupported", "pricing"],
    ["content_engine_required", undefined],
  ]);
});

test("buildBasicSiteBuilderReviewFacts adds media library gate and redacts secret-like labels", () => {
  const facts = baseFacts();
  facts.mediaPolicy = "library";
  facts.basicDefaults = {
    ...facts.basicDefaults!,
    pageRoutes: facts.basicDefaults!.pageRoutes.map((route) =>
      route.roleId === "services"
        ? {
            ...route,
            label: "Services api_key=sk-or-v1-1234567890abcdef",
            menuLabel: "Services api_key=sk-or-v1-1234567890abcdef",
          }
        : route
    ),
  };

  const review = buildBasicSiteBuilderReviewFacts(facts);
  const serialized = JSON.stringify(review);

  expect(review.gates).toContainEqual({
    code: "media_library_selection_required",
    severity: "info",
    mediaPolicy: "library",
    message: "Media-library mode needs confirmed existing media assets before execution.",
  });
  expect(serialized).not.toContain("sk-or-v1-1234567890abcdef");
  expect(serialized).toContain("[REDACTED]");
});

test("buildBasicSiteBuilderReviewFacts fails closed for unknown role and media ids", () => {
  expect(() =>
    buildBasicSiteBuilderReviewFacts({
      ...baseFacts(),
      sectionRoles: ["database-drop" as "faq"],
    })
  ).toThrow("intake_option_invalid");

  expect(() =>
    buildBasicSiteBuilderReviewFacts({
      ...baseFacts(),
      mediaPolicy: "external-url" as "curated",
    })
  ).toThrow("intake_option_invalid");

  expect(() =>
    buildBasicSiteBuilderReviewFacts({
      ...baseFacts(),
      contentEngines: ["database-drop" as "blog"],
    })
  ).toThrow("intake_option_invalid");
});

test("buildBasicSiteBuilderReviewFacts fails closed before Basic review readiness", () => {
  expect(() =>
    buildBasicSiteBuilderReviewFacts({
      readyForReview: false,
      missingReviewInputStepIds: ["site-map"],
      missingRequiredStepIds: ["site-map", "review"],
    })
  ).toThrow("intake_session_invalid");

  expect(() =>
    buildBasicSiteBuilderReviewFacts({
      ...baseFacts(),
      readyForReview: true,
      answeredStepIds: ["business-profile", "site-goals"],
    })
  ).toThrow("intake_session_invalid");
});
