import { expect, test } from "vitest";

import { cmsOperationFixtures, fakeProvider } from "./fixtures/cmsOperationFixtures";
import {
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";

const resolveTrustedFixtureContext = <
  T extends
    | {
        includeResourceCatalog?: boolean;
        resourceCatalog?: unknown;
      }
    | null
    | undefined,
>(
  context: T
): T => {
  if (
    !context ||
    context.includeResourceCatalog === true ||
    context.resourceCatalog === undefined
  ) {
    return context;
  }
  return {
    ...context,
    includeResourceCatalog: true,
  };
};

test.each(cmsOperationFixtures)("CMS operation fixture: $name", async (fixture) => {
  const context = resolveTrustedFixtureContext(fixture.context);
  const plan = fixture.providerDraft
    ? await planAssistantActionsWithProviderDraft({
        prompt: fixture.prompt,
        context,
        provider: fakeProvider(fixture.providerDraft),
        llmAvailable: true,
      })
    : planAssistantActions({
        prompt: fixture.prompt,
        context,
      });

  expect(plan.status).toBe(fixture.expected.status);
  if (fixture.expected.responseKind) {
    expect(plan.responseKind).toBe(fixture.expected.responseKind);
  }
  if (fixture.expected.intentId) {
    expect(plan.intentId).toBe(fixture.expected.intentId);
  }
  if (fixture.expected.actionTypes) {
    expect(plan.actions.map((action) => action.type)).toEqual(fixture.expected.actionTypes);
  }
  if (fixture.expected.candidates) {
    expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual(
      fixture.expected.candidates
    );
  }
  if (fixture.expected.summaryIncludes) {
    expect(plan.summary).toContain(fixture.expected.summaryIncludes);
  }
  const serialized = JSON.stringify(plan);
  expect(serialized).not.toContain("database.drop");
  expect(serialized).not.toContain("apiKey");
  expect(serialized).not.toContain("Bearer ");
});
