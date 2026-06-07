import { buildAssistantSiteBuilderIntakeReviewHash } from "../../core/services/assistant/assistantSiteBuilderIntakeFacts";
import { normalizeAssistantSiteBuilderIntakeAnswer } from "../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import type {
  AssistantSiteBuilderIntakeAnswer,
  AssistantSiteBuilderIntakeMode,
  AssistantSiteBuilderIntakeSession,
} from "../../core/services/assistant/assistantSiteBuilderIntakeTypes";

export const buildConfirmedSiteBuilderIntakeReviewAnswer = (
  mode: AssistantSiteBuilderIntakeMode,
  answers: readonly AssistantSiteBuilderIntakeAnswer[],
  values: Record<string, unknown> = {}
): AssistantSiteBuilderIntakeAnswer => ({
  stepId: "review",
  values: {
    ...values,
    reviewState: "confirmed",
    confirmed: true,
    confirmedReviewHash: buildAssistantSiteBuilderIntakeReviewHash({
      mode,
      answers: answers.map((answer) => normalizeAssistantSiteBuilderIntakeAnswer(answer)),
    }),
  },
});

export const withConfirmedSiteBuilderIntakeReview = <
  TSession extends AssistantSiteBuilderIntakeSession,
>(
  session: TSession,
  values: Record<string, unknown> = {}
): TSession => {
  const answersWithoutReview = session.answers.filter((answer) => answer.stepId !== "review");
  return {
    ...session,
    currentStepId: "review",
    answers: [
      ...answersWithoutReview,
      buildConfirmedSiteBuilderIntakeReviewAnswer(session.mode, answersWithoutReview, values),
    ],
  };
};
