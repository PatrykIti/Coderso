import { expect, test } from "bun:test";

import { planAssistantActionsWithProviderDraft } from "../../../core/services/assistant/actionPlannerService";
import { createOpenRouterProvider } from "../../../core/services/assistant/providers/openRouterProvider";

const apiKey = process.env.TEST_OPENROUTER_API_KEY?.trim();
const model = process.env.TEST_OPENROUTER_MODEL?.trim();

const liveTest = apiKey && model ? test : test.skip;

liveTest(
  "OpenRouter live provider returns a CMS operation draft for LLM Guide planning",
  async () => {
    if (!apiKey || !model) {
      throw new Error("missing_openrouter_test_env");
    }

    const provider = createOpenRouterProvider({
      apiKey,
      model,
      retryCount: 0,
      appName: "Nextless LLM Guide Integration Test",
    });

    const plan = await planAssistantActionsWithProviderDraft({
      prompt:
        "sprawdz jakie ekrany customowe sa widoczne w sekcji Screens i podaj ich dokladne nazwy",
      provider,
      providerModel: model,
      llmAvailable: true,
      context: {
        page: "/admin/coderso/custom-screens",
        locale: "pl-PL",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-04-17T10:00:00.000Z",
          budget: {
            maxItemsPerGroup: 50,
            maxFieldsPerResource: 24,
            truncated: false,
          },
          pages: [],
          contentTypes: [],
          customScreens: [
            {
              id: "screen-house",
              name: "House Projects",
              contentTypeId: "ct-house",
              status: "active",
              showInSidebar: true,
              sidebarLabel: "House Projects",
              writableBindingFields: [],
              bindings: [],
            },
            {
              id: "screen-products",
              name: "Products",
              contentTypeId: "ct-products",
              status: "draft",
              showInSidebar: false,
              sidebarLabel: null,
              writableBindingFields: [],
              bindings: [],
            },
          ],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          warnings: [],
        },
        runtimeSnapshot: {
          schemaVersion: 1,
          route: "/admin/coderso/custom-screens",
          activeHref: "/admin/coderso/custom-screens",
          area: "coderso",
          codersoModule: "custom-screens",
          selectedResource: null,
          visibleActions: [],
          permissionHints: {
            known: false,
            requiredForVisibleActions: [],
            reason: "frontend_user_has_no_permissions",
          },
        },
      },
      limits: {
        maxInputTokens: 8_192,
        maxOutputTokens: 512,
        timeoutMs: 25_000,
      },
    });

    expect(plan.metadata?.planner).toBe("provider");
    expect(plan.metadata?.providerDraftUsed).toBe(true);
    expect(plan.responseKind).toBe("inspection");
    expect(plan.intentId).toBe("cms-resource-inspect");
    expect(plan.actions).toEqual([]);
    expect(plan.inspection?.resourceKind).toBe("custom-screen");
    expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual([
      "House Projects",
      "Products",
    ]);
    expect(JSON.stringify(plan)).not.toContain(apiKey);
  }
);
