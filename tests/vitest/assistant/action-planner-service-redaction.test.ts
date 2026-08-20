import { afterEach, expect, test, vi } from "vitest";

import {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import { mapCmsOperationToActionPlan } from "../../../core/services/assistant/cmsOperationActionMapper";
import {
  isCuratedMediaUrl,
  selectCuratedMediaProfile,
} from "../../../core/services/media/curatedMediaProfiles";
import type {
  AssistantActionContext,
  AssistantAdminContext,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";
import {
  carCatalogMarkdownPrompt,
  createContentTypeFieldAddContext,
  createFakeProvider,
  createPageWithReferencedTemplateContext,
  createTrustedCatalog,
  contentTypeFieldAddPrompt,
} from "./actionPlannerFixtures";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("planAssistantActions redacts poisoned follow-up target text before asking for input", () => {
  const plan = planAssistantActions({
    prompt: 'update page "Admin Secret api_key=sk-or-test" title to Hidden',
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("site-builder-follow-up-target_required");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("Admin Secret");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).toContain("[REDACTED]");
});

test("planAssistantActions redacts token-like follow-up target text without keyword hints", () => {
  const plan = planAssistantActions({
    prompt: 'update page "sk-or-test" title to Hidden',
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).toContain("[REDACTED]");
});

test("planAssistantActions redacts secret-like text in generic clarifying plans", () => {
  const plan = planAssistantActions({
    prompt: "stworz cos api_key=sk-or-test",
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("generic-guide-needs-input");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).toContain("[REDACTED]");
});

test("planAssistantActions redacts secret-like text in docs guidance plans", () => {
  const plan = planAssistantActions({
    prompt: "jak dziala cms api_key=sk-or-test",
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("docs-guidance");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).toContain("[REDACTED]");
});

test("mapCmsOperationToActionPlan redacts secret-like unresolved target queries", () => {
  const context: AssistantAdminContext = {
    route: "/admin/pages",
    locale: "en",
    resourceCatalog: createTrustedCatalog(),
    runtimeSnapshot: null,
    activeSurface: null,
    collectionWorkspaceHint: null,
    collectionWorkspace: null,
    planningState: null,
    area: "pages",
    advancedModule: null,
  };
  const plan = mapCmsOperationToActionPlan({
    prompt: "update page api_key=sk-or-test title to Hidden",
    draft: {
      operation: "update",
      resourceKind: "page",
      targetQuery: { exactName: "api_key=sk-or-test" },
      mutation: { fieldIntent: "title", value: "Hidden" },
      constraints: { destructive: false, requiresConfirmation: true },
    },
    context,
  });
  const serialized = JSON.stringify(plan);

  expect(plan?.status).toBe("needs_input");
  expect(plan?.actions).toEqual([]);
  expect(plan?.inspection?.query).toBe("[REDACTED]");
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
});

test("mapCmsOperationToActionPlan redacts custom screen delete target prefixes", () => {
  const context: AssistantAdminContext = {
    route: "/admin/advanced/custom-screens",
    locale: "en",
    resourceCatalog: createTrustedCatalog({
      customScreens: [
        {
          id: "screen-secret",
          name: "sk-or-test Workspace",
          contentTypeId: "ct-projects",
          status: "active",
          collectionRole: "canonical-admin-screen",
          compositionKey: "guided-portfolio",
          showInSidebar: true,
          sidebarLabel: "Workspace",
          writableBindingFields: [],
          bindings: [],
        },
      ],
    }),
    runtimeSnapshot: null,
    activeSurface: null,
    collectionWorkspaceHint: null,
    collectionWorkspace: null,
    planningState: null,
    area: "advanced",
    advancedModule: "custom-screens",
  };
  const plan = mapCmsOperationToActionPlan({
    prompt: "delete custom screen sk-or-test",
    draft: {
      operation: "delete",
      resourceKind: "custom-screen",
      resourceKey: "custom-screen",
      targetQuery: { prefix: "sk-or-test" },
      constraints: { destructive: true, requiresConfirmation: true },
    },
    context,
  });

  expect(plan?.status).toBe("ready");
  expect(plan?.actions[0]?.type).toBe("custom-screen.delete");
  expect(plan?.actions[0]?.input).toMatchObject({
    expectedNamePrefix: "[REDACTED]",
  });
});

test("planAssistantActions redacts secret-like text in generic policy-gated CMS plans", () => {
  const plan = planAssistantActions({
    prompt: "zaktualizuj media api_key=sk-or-test i ustaw podpisany URL signature=abc123",
    context: {
      page: "/admin/media",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).not.toContain("signature=abc123");
  expect(serialized).toContain("[REDACTED]");
});

test("planAssistantActions redacts secret-like text in generic inspection plans", () => {
  const plan = planAssistantActions({
    prompt: "find page api_key=sk-or-test",
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("ready");
  expect(plan.responseKind).toBe("inspection");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).toContain("[REDACTED]");
});

test("planAssistantActions redacts secret-like text in broad destructive blocks", () => {
  const plan = planAssistantActions({
    prompt: "delete all pages api_key=sk-or-test",
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
        pages: [{ id: "page-home", title: "Home", slug: "/", status: "published" }],
      }),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("cms-page-delete-broad-blocked");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).toContain("[REDACTED]");
});

test("planAssistantActionsWithProviderDraft redacts secret-like text in policy-gated provider drafts", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "zaktualizuj media api_key=sk-or-test i ustaw podpisany URL signature=abc123",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "update",
        resourceKind: "settings-surface",
        resourceKey: "settings-api-keys",
        targetQuery: { exactName: "API Keys" },
        filters: null,
        mutation: { value: "sk-or-test" },
        constraints: { destructive: false, requiresConfirmation: true },
      })
    ),
    providerModel: "anthropic/claude-sonnet-4",
    context: {
      page: "/admin/media",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog(),
    },
  });
  const serialized = JSON.stringify(plan);

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
  expect(plan.intentId).toBe("settings-api-keys-update-gated");
  expect(plan.actions).toEqual([]);
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("sk-or-test");
  expect(serialized).not.toContain("signature=abc123");
  expect(serialized).toContain("[REDACTED]");
});
