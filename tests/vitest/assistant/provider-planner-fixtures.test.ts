import { expect, test } from "vitest";

import { planAssistantActionsWithProviderDraft } from "../../../core/services/assistant/actionPlannerService";
import { providerPlannerFixtures } from "./fixtures/providerPlannerFixtures";

test.each(providerPlannerFixtures)(
  "planAssistantActionsWithProviderDraft fixture: $name",
  async (fixture) => {
    const plan = await planAssistantActionsWithProviderDraft({
      prompt: fixture.prompt,
      context: fixture.context,
      llmAvailable: fixture.llmAvailable,
      provider: fixture.provider,
    });
    const serialized = JSON.stringify(plan);

    expect(plan.status).toBe(fixture.expected.status);
    if (fixture.expected.intentId) {
      expect(plan.intentId).toBe(fixture.expected.intentId);
    }
    if (fixture.expected.intentFamily) {
      expect(plan.intentFamily).toBe(fixture.expected.intentFamily);
    }
    if (fixture.expected.summaryIncludes) {
      expect(plan.summary).toContain(fixture.expected.summaryIncludes);
    }
    if (fixture.expected.actionType) {
      expect(plan.actions[0]?.type).toBe(fixture.expected.actionType);
    }
    expect(serialized).not.toContain("database.drop");
    expect(serialized).not.toContain("sk-or-v1");
    expect(serialized).not.toContain("Bearer ");
  }
);
