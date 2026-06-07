import { expect, test } from "vitest";

import {
  buildActionPlanRequestFromReviewedIntake,
  buildSiteBuilderIntakeCompileResult,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
import { AssistantSiteBuilderIntakeError } from "../../../core/services/assistant/assistantSiteBuilderIntakeErrors";
import {
  resolveSiteBuilderIntakeContentEngines,
  type AssistantSiteBuilderContentEngineDecision,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeContentEngines";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderContentEngineId,
  type AssistantSiteBuilderIntakeAnswer,
  type AssistantSiteBuilderIntakeFacts,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { buildConfirmedSiteBuilderIntakeReviewAnswer } from "../../utils/assistantSiteBuilderIntake";

const readyFacts = (
  overrides: Partial<AssistantSiteBuilderIntakeFacts> = {}
): AssistantSiteBuilderIntakeFacts => ({
  siteName: "Content Engine Studio",
  locale: "en",
  goals: ["show services and collect leads"],
  pageRoles: ["home", "contact"],
  sectionRoles: ["value-proposition", "lead-capture"],
  mediaPolicy: "placeholder",
  readyForReview: true,
  readyForExecution: true,
  ...overrides,
});

const decisionIds = (
  decisions: readonly AssistantSiteBuilderContentEngineDecision[]
): AssistantSiteBuilderContentEngineId[] => decisions.map((decision) => decision.id);

test("resolveSiteBuilderIntakeContentEngines maps supported page and section roles", () => {
  const result = resolveSiteBuilderIntakeContentEngines(
    readyFacts({
      pageRoles: [
        "services",
        "products",
        "portfolio",
        "case-studies",
        "blog",
        "team",
        "locations",
        "faq",
        "testimonials",
      ],
      sectionRoles: ["proof", "content-feed"],
      goals: [],
    })
  );

  expect(result.schemaVersion).toBe(1);
  expect(decisionIds(result.decisions)).toEqual([
    "services",
    "products",
    "portfolio",
    "case-studies",
    "blog",
    "team",
    "locations",
    "faq",
    "testimonials",
  ]);
  expect(result.decisions.find((decision) => decision.id === "products")).toMatchObject({
    status: "supported",
    requiresCustomScreen: true,
    requiresPublicWriteEndpoint: false,
    capabilities: expect.arrayContaining([
      "content_type",
      "listing_page",
      "detail_page",
      "filters",
    ]),
    actionFamilies: expect.arrayContaining([
      "content-type.upsert",
      "listing-query.upsert",
      "detail-page.upsert",
    ]),
  });
  expect(result.gates).toEqual([]);
});

test("resolveSiteBuilderIntakeContentEngines keeps one-off pages static", () => {
  const result = resolveSiteBuilderIntakeContentEngines(
    readyFacts({
      pageRoles: ["home", "about", "pricing", "contact", "legal"],
      sectionRoles: ["value-proposition", "pricing", "contact"],
      goals: ["publish a simple brochure site"],
    })
  );

  expect(result.decisions).toEqual([]);
  expect(result.staticPageRoles).toEqual(["home", "about", "pricing", "contact", "legal"]);
  expect(result.questions).toEqual([]);
  expect(result.gates).toEqual([]);
});

test("resolveSiteBuilderIntakeContentEngines uses explicit and generic text signals without leaking raw text", () => {
  const result = resolveSiteBuilderIntakeContentEngines(
    readyFacts({
      topic: "ceramic workshops with branch locations",
      goals: ["sell products and publish blog posts"],
      contentEngines: ["team"],
      pageRoles: ["home", "contact"],
      sectionRoles: [],
    })
  );
  const serialized = JSON.stringify(result);

  expect(decisionIds(result.decisions)).toEqual(["team", "products", "blog", "locations"]);
  expect(result.decisions.find((decision) => decision.id === "team")?.sources).toEqual([
    { source: "explicit", value: "team" },
  ]);
  expect(result.questions.map((question) => question.engineId)).toEqual([
    "products",
    "blog",
    "locations",
  ]);
  expect(serialized).not.toContain("sell products and publish blog posts");
  expect(serialized).not.toContain("ceramic workshops");
});

test("resolveSiteBuilderIntakeContentEngines gates unsupported engine requests", () => {
  const result = resolveSiteBuilderIntakeContentEngines(
    readyFacts({
      goals: ["need an events calendar and jobs board"],
    })
  );

  expect(result.gates).toEqual([
    expect.objectContaining({
      code: "content_engine_unsupported",
      requestedEngineId: "events",
      source: "goal",
    }),
    expect.objectContaining({
      code: "content_engine_unsupported",
      requestedEngineId: "jobs",
      source: "goal",
    }),
  ]);
});

test("resolveSiteBuilderIntakeContentEngines rejects unknown explicit engine ids", () => {
  expect(() =>
    resolveSiteBuilderIntakeContentEngines(
      readyFacts({
        contentEngines: ["database-drop" as "blog"],
      })
    )
  ).toThrow("intake_option_invalid");
});

test("buildSiteBuilderIntakeCompileResult exposes content-engine decisions outside siteKit", () => {
  const result = buildSiteBuilderIntakeCompileResult(
    readyFacts({
      pageRoles: ["home", "products", "blog", "contact"],
      goals: ["sell products and publish articles"],
    })
  );
  const serializedSiteKit = JSON.stringify(result.siteKit);

  expect(decisionIds(result.reviewFacts.contentEngineDecisions.decisions)).toEqual([
    "products",
    "blog",
  ]);
  expect(result.reviewFacts.contentEngineDecisions.gates).toEqual([]);
  expect(serializedSiteKit).not.toContain("contentEngineDecisions");
  expect(serializedSiteKit).not.toContain("pageRoles");
});

test("buildActionPlanRequestFromReviewedIntake blocks unsupported engine handoff", () => {
  const answers: AssistantSiteBuilderIntakeAnswer[] = [
    {
      stepId: "business-profile",
      values: {
        siteName: "Event Studio",
        topic: "events calendar and local workshops",
        locale: "en",
      },
    },
    {
      stepId: "site-goals",
      values: {
        goals: ["show events calendar"],
        primaryGoal: "show events calendar",
      },
    },
    {
      stepId: "site-map",
      values: {
        pageRoles: ["home", "contact"],
      },
    },
    {
      stepId: "menu",
      values: {
        menuPreset: "simple",
      },
    },
    {
      stepId: "homepage-sections",
      values: {
        sectionRoles: ["value-proposition", "lead-capture"],
      },
    },
    {
      stepId: "hero",
      values: {
        heroPreset: "copy-first",
        headline: "Plan local events",
      },
    },
    {
      stepId: "media-policy",
      values: {
        mediaPolicy: "placeholder",
      },
    },
  ];
  const session: AssistantSiteBuilderIntakeSession = {
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "basic",
    currentStepId: "review",
    answers: [...answers, buildConfirmedSiteBuilderIntakeReviewAnswer("basic", answers)],
  };

  try {
    buildActionPlanRequestFromReviewedIntake(session);
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantSiteBuilderIntakeError);
    const details = (error as AssistantSiteBuilderIntakeError).details;
    expect(details.reason).toBe("review_summary_handoff_blocked");
    expect(details.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "content_engine_unsupported",
        }),
      ])
    );
    return;
  }

  throw new Error("Expected unsupported content-engine handoff gate.");
});
