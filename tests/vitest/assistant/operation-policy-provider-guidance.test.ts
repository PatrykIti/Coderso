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
    expect.arrayContaining([
      "page",
      "detail-page",
      "custom-screen",
      "settings-surface",
      "solution-kit",
      "post",
      "media",
    ])
  );
  expect(guidance.resources.some((resource) => resource.key === "appointments")).toBe(false);
  expect(guidance.resources.find((resource) => resource.key === "detail-page")).toMatchObject({
    kind: "detail-page",
    coverageState: "live-gated",
    actions: expect.not.arrayContaining([expect.objectContaining({ mode: "executable" })]),
  });

  const settings = guidance.resources.find((resource) => resource.key === "settings-api-keys");
  expect(settings?.coverageState).toBe("live-gated");
  expect(settings?.secrets).toMatchObject({
    redacted: true,
    providerAllowed: false,
  });
  expect(settings?.secrets?.secretFields).toContain("apiKeys.secret");

  const retiredWidgets = guidance.resources.find((resource) => resource.key === "widget-template");
  expect(retiredWidgets).toMatchObject({
    label: "Retired Widget Compatibility",
    coverageState: "legacy-maintenance",
    operations: ["inspect", "find", "update", "delete"],
  });
  expect(retiredWidgets?.actions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "widget-template.update", mode: "executable" }),
      expect.objectContaining({ type: "widget-template.delete", mode: "executable" }),
      expect.objectContaining({ type: "widget-template.block.patch", mode: "executable" }),
    ])
  );
  expect(retiredWidgets?.operations).not.toContain("create");
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
  expect(guidance.createContracts.some((contract) => contract.key === "widget-template")).toBe(
    false
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
  expect(registry.some((entry) => entry.kind === "detail-page")).toBe(true);
  expect(settings?.aliases).toEqual(expect.arrayContaining(["settings", "api keys"]));
  expect(settings?.supportedOperations).toEqual(
    expect.arrayContaining(["inspect", "find", "configure", "update"])
  );
  const retiredWidgets = registry.find((entry) => entry.kind === "widget-template");
  expect(retiredWidgets?.supportedOperations).toEqual(["inspect", "find", "update", "delete"]);
});

test("operation draft guidance is generated from policy metadata", () => {
  const guidance = buildProviderOperationDraftGuidance(assistantOperationPolicy);
  const noteText = guidance.notes.join(" ");
  const examplesText = JSON.stringify(guidance.examples);

  expect(noteText).toContain("Allowed draft resourceKinds from policy");
  expect(noteText).toContain("custom-screen.status");
  expect(noteText).toContain("Secret-bearing resources are redacted");
  expect(examplesText).toContain("listing-query");
  expect(examplesText).toContain("detail-page");
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
