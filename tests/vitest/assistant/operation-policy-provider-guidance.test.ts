import { expect, test } from "vitest";

import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";
import {
  buildProviderOperationDraftGuidance,
  buildProviderPlannerSystemPrompt,
  buildProviderPolicyGuidance,
  buildProviderPolicyRegistry,
} from "../../../core/services/assistant/operationPolicy/providerGuidance";

test("buildProviderPolicyGuidance exposes provider-safe policy resources", () => {
  const guidance = buildProviderPolicyGuidance(assistantOperationPolicy);

  expect(guidance.schemaVersion).toBe(1);
  expect(guidance.draft.resourceKinds).toEqual(
    expect.arrayContaining(["page", "custom-screen", "settings-surface", "solution-kit"])
  );
  expect(guidance.draft.resourceKinds).not.toContain("post");
  expect(guidance.resources.some((resource) => resource.key === "appointments")).toBe(false);

  const settings = guidance.resources.find((resource) => resource.key === "settings-api-keys");
  expect(settings?.coverageState).toBe("live-gated");
  expect(settings?.secrets).toMatchObject({
    redacted: true,
    providerAllowed: false,
  });
  expect(settings?.secrets?.secretFields).toContain("apiKeys.secret");
});

test("buildProviderPolicyGuidance derives create contracts and safety from policy", () => {
  const guidance = buildProviderPolicyGuidance(assistantOperationPolicy);

  expect(guidance.createContracts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: "page",
        actionTypes: expect.arrayContaining(["page.upsert"]),
        fields: expect.arrayContaining(["title", "slug", "status"]),
      }),
      expect.objectContaining({
        key: "form",
        actionTypes: expect.arrayContaining(["form.upsert"]),
        fields: expect.arrayContaining(["name", "slug", "status", "submissionAccess"]),
      }),
    ])
  );
  expect(guidance.safety.destructiveDefault).toMatchObject({
    requireReview: true,
    allowAllUnfiltered: false,
  });
});

test("provider registry is grouped from operation policy", () => {
  const registry = buildProviderPolicyRegistry(assistantOperationPolicy);
  const settings = registry.find((entry) => entry.kind === "settings-surface");

  expect(registry.some((entry) => entry.kind === "page")).toBe(true);
  expect(settings?.aliases).toEqual(expect.arrayContaining(["settings", "api keys"]));
  expect(settings?.supportedOperations).toEqual(
    expect.arrayContaining(["inspect", "find", "configure", "update"])
  );
});

test("operation draft guidance is generated from policy metadata", () => {
  const guidance = buildProviderOperationDraftGuidance(assistantOperationPolicy);
  const noteText = guidance.notes.join(" ");
  const examplesText = JSON.stringify(guidance.examples);

  expect(noteText).toContain("Allowed draft resourceKinds from policy");
  expect(noteText).toContain("custom-screen.status");
  expect(noteText).toContain("Secret-bearing resources are redacted");
  expect(examplesText).toContain("listing-query");
  expect(examplesText).toContain("seo-document");
});

test("provider system prompt uses policy JSON and avoids old hardcoded create lists", () => {
  const prompt = buildProviderPlannerSystemPrompt(assistantOperationPolicy);

  expect(prompt).toContain('"schemaVersion":1');
  expect(prompt).toContain('"settings-api-keys"');
  expect(prompt).toContain("policy guidance JSON");
  expect(prompt).not.toContain("For page create items use");
  expect(prompt).not.toContain("For form create items use");
});
