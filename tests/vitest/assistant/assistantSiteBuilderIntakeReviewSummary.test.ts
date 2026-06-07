import { expect, test } from "vitest";

import { buildActionPlanRequestFromReviewedIntake } from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
import { buildAssistantSiteBuilderIntakeReviewHash } from "../../../core/services/assistant/assistantSiteBuilderIntakeFacts";
import { AssistantSiteBuilderIntakeError } from "../../../core/services/assistant/assistantSiteBuilderIntakeErrors";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import { buildSiteBuilderIntakeReviewSummary } from "../../../core/services/assistant/assistantSiteBuilderIntakeReviewSummary";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeAnswer,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";

const baseAnswers = (
  overrides: { mediaPolicy?: string; topic?: string; goals?: string[] } = {}
): AssistantSiteBuilderIntakeAnswer[] => [
  {
    stepId: "business-profile",
    values: {
      siteName: "Review Studio",
      topic: overrides.topic ?? "product catalog and workshops",
      vertical: "commerce",
      locale: "en",
    },
  },
  {
    stepId: "site-goals",
    values: {
      goals: overrides.goals ?? ["sell products", "collect leads"],
      primaryGoal: "collect leads",
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
    },
  },
  {
    stepId: "homepage-sections",
    values: {
      sectionRoles: ["featured-items", "faq", "lead-capture"],
    },
  },
  {
    stepId: "hero",
    values: {
      heroPreset: "offer-with-proof",
      headline: "Products and workshops",
    },
  },
  {
    stepId: "media-policy",
    values: {
      mediaPolicy: overrides.mediaPolicy ?? "placeholder",
    },
  },
  {
    stepId: "content-engine",
    values: {
      contentEngines: ["products", "faq"],
    },
  },
];

const reviewedSession = (
  answers: AssistantSiteBuilderIntakeAnswer[] = baseAnswers()
): AssistantSiteBuilderIntakeSession =>
  normalizeAssistantSiteBuilderIntakeSession(
    withConfirmedSiteBuilderIntakeReview({
      version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
      mode: "advanced",
      currentStepId: "review",
      answers,
    } satisfies AssistantSiteBuilderIntakeSession)
  );

test("buildAssistantSiteBuilderIntakeReviewHash is stable and excludes the review answer", () => {
  const answers = baseAnswers();
  const hash = buildAssistantSiteBuilderIntakeReviewHash({ mode: "advanced", answers });
  const hashWithReview = buildAssistantSiteBuilderIntakeReviewHash({
    mode: "advanced",
    answers: [
      ...answers,
      {
        stepId: "review",
        values: {
          confirmed: true,
          confirmedReviewHash: "different-client-echo",
        },
      },
    ],
  });
  const editedHash = buildAssistantSiteBuilderIntakeReviewHash({
    mode: "advanced",
    answers: answers.map((answer) =>
      answer.stepId === "business-profile"
        ? {
            ...answer,
            values: {
              ...answer.values,
              siteName: "Edited Review Studio",
            },
          }
        : answer
    ),
  });

  expect(hash).toMatch(/^[a-f0-9]{16}$/);
  expect(hashWithReview).toBe(hash);
  expect(editedHash).not.toBe(hash);
});

test("buildSiteBuilderIntakeReviewSummary covers the final review sections", () => {
  const session = reviewedSession();
  const summary = buildSiteBuilderIntakeReviewSummary(session.facts);

  expect(summary).toMatchObject({
    schemaVersion: 1,
    reviewHash: session.facts?.reviewHash,
    readyForReview: true,
    readyForExecution: true,
    confirmationAllowed: true,
    blockingGateCount: 0,
  });
  expect(summary?.sections.map((section) => section.id)).toEqual([
    "pages",
    "menu",
    "footer",
    "hero",
    "homepage-sections",
    "subpages",
    "content-engines",
    "custom-screens",
    "media-policy",
    "seo",
    "lead-capture",
  ]);
  expect(summary?.customScreenDecisions.candidates.map((candidate) => candidate.engineId)).toEqual([
    "products",
    "faq",
  ]);
});

test("buildActionPlanRequestFromReviewedIntake enforces blocking review gates server-side", () => {
  const session = reviewedSession(baseAnswers({ mediaPolicy: "library" }));

  try {
    buildActionPlanRequestFromReviewedIntake(session);
    throw new Error("expected_intake_error");
  } catch (error) {
    expect(error).toBeInstanceOf(AssistantSiteBuilderIntakeError);
    expect((error as AssistantSiteBuilderIntakeError).details).toMatchObject({
      reason: "review_summary_handoff_blocked",
      gates: [
        expect.objectContaining({
          code: "media_library_selection_required",
          stepId: undefined,
        }),
      ],
    });
  }
});
