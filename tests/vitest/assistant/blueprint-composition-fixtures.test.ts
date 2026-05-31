import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import {
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";
import {
  blueprintCompositionFixtures,
  blueprintCompositionProviderFixtures,
} from "./fixtures/blueprintCompositionFixtures";

const actionTypes = (plan: ReturnType<typeof planAssistantActions>) =>
  plan.actions.map((action) => action.type);

const pageSlugs = (plan: ReturnType<typeof planAssistantActions>) =>
  plan.actions
    .filter((action) => action.type === "page.upsert")
    .map((action) => (action.type === "page.upsert" ? action.input.slug : null));

const contentSchemaFieldNames = (plan: ReturnType<typeof planAssistantActions>) => {
  const action = plan.actions.find((item) => item.type === "content-type.upsert");
  if (!action || action.type !== "content-type.upsert") return [];
  const properties = action.input.schema.properties;
  return properties && typeof properties === "object" ? Object.keys(properties) : [];
};

const compositionResourceKeys = (plan: ReturnType<typeof planAssistantActions>) =>
  plan.metadata?.blueprintComposition?.mergedResources.map((resource) => resource.key) ?? [];

const existingMatchResourceKeys = (plan: ReturnType<typeof planAssistantActions>) =>
  plan.metadata?.blueprintComposition?.existingResourceMatches.map((match) => match.resourceKey) ??
  [];

const unresolvedConflictCodes = (plan: ReturnType<typeof planAssistantActions>) =>
  plan.metadata?.blueprintComposition?.unresolvedConflicts.map((conflict) => conflict.code) ?? [];

test.each(blueprintCompositionFixtures)("blueprint composition fixture: $name", (fixture) => {
  if (fixture.promptSourcePath) {
    const source = readFileSync(resolve(process.cwd(), fixture.promptSourcePath), "utf8");
    expect(source).toContain("Mabudo");
  }

  const plan = planAssistantActions({
    prompt: fixture.prompt,
    context: fixture.context,
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe(fixture.expected.status);
  expect(plan.intentId).toBe(fixture.expected.intentId);
  if (fixture.expected.responseKind) {
    expect(plan.responseKind).toBe(fixture.expected.responseKind);
  }
  if (fixture.expected.intentFamily) {
    expect(plan.intentFamily).toBe(fixture.expected.intentFamily);
  }
  expect(actionTypes(plan)).toEqual(fixture.expected.actionTypes);

  if (fixture.expected.pageSlugs) {
    expect(pageSlugs(plan)).toEqual(fixture.expected.pageSlugs);
  }
  if (fixture.expected.primaryCapabilityId) {
    expect(plan.metadata?.blueprintComposition?.primaryCapabilityId).toBe(
      fixture.expected.primaryCapabilityId
    );
  }
  if (fixture.expected.adjunctCapabilityIds) {
    expect(plan.metadata?.blueprintComposition?.adjunctCapabilityIds).toEqual(
      fixture.expected.adjunctCapabilityIds
    );
  }
  if (fixture.expected.gatedCapabilityIds) {
    expect(plan.metadata?.blueprintComposition?.gatedCapabilityIds).toEqual(
      fixture.expected.gatedCapabilityIds
    );
  }
  if (fixture.expected.mergedResourceKeys) {
    expect(compositionResourceKeys(plan)).toEqual(
      expect.arrayContaining(fixture.expected.mergedResourceKeys)
    );
  }
  if (fixture.expected.existingMatchResourceKeys) {
    expect(existingMatchResourceKeys(plan)).toEqual(
      expect.arrayContaining(fixture.expected.existingMatchResourceKeys)
    );
  }
  if (fixture.expected.unresolvedConflictCodes) {
    expect(unresolvedConflictCodes(plan)).toEqual(fixture.expected.unresolvedConflictCodes);
  }
  if (fixture.expected.schemaFields) {
    expect(contentSchemaFieldNames(plan)).toEqual(
      expect.arrayContaining(fixture.expected.schemaFields)
    );
  }
  for (const excluded of fixture.expected.serializedExcludes ?? []) {
    expect(serialized).not.toContain(excluded);
  }
});

test.each(blueprintCompositionProviderFixtures)(
  "blueprint composition provider red-team fixture: $name",
  async (fixture) => {
    let providerCalls = 0;
    const provider: AssistantProvider = {
      id: "fake",
      complete: async () => {
        providerCalls += 1;
        return { text: JSON.stringify(fixture.providerDraft) };
      },
    };

    const execute = () =>
      planAssistantActionsWithProviderDraft({
        prompt: fixture.prompt,
        context: fixture.context,
        llmAvailable: fixture.llmAvailable,
        provider: fixture.providerDraft === null ? null : provider,
      });

    if ("error" in fixture.expected) {
      await expect(execute()).rejects.toThrow(fixture.expected.error);
      return;
    }

    const plan = await execute();
    const serialized = JSON.stringify(plan);

    if (fixture.expectProviderNotCalled) {
      expect(providerCalls).toBe(0);
    }
    expect(plan.status).toBe(fixture.expected.status);
    if (fixture.expected.responseKind) {
      expect(plan.responseKind).toBe(fixture.expected.responseKind);
    }
    if (fixture.expected.intentId) {
      expect(plan.intentId).toBe(fixture.expected.intentId);
    }
    if (fixture.expected.actionTypes) {
      expect(actionTypes(plan)).toEqual(fixture.expected.actionTypes);
    }
    if (fixture.expected.summaryIncludes) {
      expect(plan.summary).toContain(fixture.expected.summaryIncludes);
    }
    for (const excluded of fixture.expected.serializedExcludes ?? []) {
      expect(serialized).not.toContain(excluded);
    }
  }
);
