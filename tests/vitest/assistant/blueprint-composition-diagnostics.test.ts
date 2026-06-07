import { expect, test } from "vitest";

import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildBlueprintCompositionDiagnostics } from "../../../core/services/assistant/blueprints/blueprintCompositionDiagnostics";
import { productCatalogReuseContext } from "./fixtures/blueprintCompositionFixtures";

test("buildBlueprintCompositionDiagnostics serializes selected capabilities and action trace", () => {
  const prompt = "Create a product catalog with inquiry form and a blog hub.";
  const plan = planAssistantActions({
    prompt,
    context: productCatalogReuseContext,
  });

  const diagnostics = buildBlueprintCompositionDiagnostics({
    prompt,
    plan,
    generatedAt: "2026-05-10T12:00:00.000Z",
  });

  expect(diagnostics).toMatchObject({
    schemaVersion: 1,
    kind: "blueprint-composition-diagnostics",
    generatedAt: "2026-05-10T12:00:00.000Z",
    plan: {
      intentId: "blueprint-composed-product-catalog",
      status: "ready",
      responseKind: "action_plan",
    },
    selectedCapabilities: {
      primary: "product-catalog",
      adjuncts: ["product-inquiry-catalog", "editorial-content-hub"],
      gated: [],
    },
    actionAssembly: {
      totalActions: 9,
      actionTypes: [
        "content-type.upsert",
        "custom-screen.upsert",
        "listing-query.upsert",
        "listing-template.upsert",
        "form.upsert",
        "page.upsert",
        "page.upsert",
        "detail-page.upsert",
        "setting.content-route.upsert",
      ],
      actionTypeCounts: expect.arrayContaining([
        { type: "page.upsert", count: 2 },
        { type: "detail-page.upsert", count: 1 },
        { type: "form.upsert", count: 1 },
      ]),
    },
    resources: {
      mergedKeys: expect.arrayContaining(["detail-page:products", "form:product-catalog-inquiry"]),
      noDuplicateMatches: [
        {
          actionType: "listing-query.upsert",
          resourceKey: "listing-query:Product Catalog Query",
          status: "matched",
          reason: "name_unique_in_catalog",
          candidateCount: 1,
          hasExistingId: true,
        },
      ],
    },
  });
  expect(diagnostics.promptHash).toMatch(/^[a-f0-9]{16}$/);
  expect(JSON.stringify(diagnostics)).not.toContain(prompt);
});

test("buildBlueprintCompositionDiagnostics redacts provider draft and prompt secrets", () => {
  const prompt = "Create a product catalog with inquiry form and a blog hub. token sk-or-v1-secret";
  const plan = planAssistantActions({
    prompt,
    context: productCatalogReuseContext,
  });

  const diagnostics = buildBlueprintCompositionDiagnostics({
    prompt,
    plan,
    providerDraft: {
      operation: "create",
      resourceKind: "entry",
      apiKey: "sk-or-v1-red-team-secret",
      csrfToken: "csrf-red-team-secret",
      sessionCookie: "session-red-team-secret",
      actions: [{ type: "database.drop", input: { password: "secret-value" } }],
    },
    generatedAt: "2026-05-10T12:00:00.000Z",
  });
  const serialized = JSON.stringify(diagnostics);

  expect(diagnostics.providerDraft).toMatchObject({
    operation: "create",
    resourceKind: "entry",
    hasActionsArray: true,
    keys: expect.arrayContaining(["[redacted-key]", "actions", "operation", "resourceKind"]),
  });
  expect(diagnostics.providerDraft?.keys).not.toContain("[redacted]");
  expect(serialized).not.toContain("sk-or-v1-red-team-secret");
  expect(serialized).not.toContain("secret-value");
  expect(serialized).not.toContain("database.drop");
  expect(serialized).not.toContain(prompt);
});
