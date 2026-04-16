import { expect, test } from "vitest";

import {
  classifyAssistantPrompt,
  resolveContextualRefinementFamily,
} from "../../../core/services/assistant/actionPlanHeuristics";
import type { AssistantAdminContext } from "../../../core/services/assistant/actionPlanTypes";

const createContext = (
  input: Partial<AssistantAdminContext>
): AssistantAdminContext => ({
  route: null,
  locale: null,
  resourceCatalog: null,
  runtimeSnapshot: null,
  area: "other",
  codersoModule: null,
  ...input,
});

test("classifyAssistantPrompt keeps docs-only questions non-mutating", () => {
  expect(classifyAssistantPrompt("gdzie zmienie kolory hero widgetu?")).toMatchObject({
    promptKind: "docs_question",
    intentFamily: "unknown",
  });
});

test("classifyAssistantPrompt routes CMS operation questions to LLM Guide planning", () => {
  expect(classifyAssistantPrompt("jakie ekrany widzisz z prefixem House Projects?")).toMatchObject({
    promptKind: "refinement_request",
    intentFamily: "unknown",
  });

  expect(classifyAssistantPrompt("czy widzisz strone Pysiek w pages?")).toMatchObject({
    promptKind: "refinement_request",
    intentFamily: "unknown",
  });
});

test("classifyAssistantPrompt routes setup and refinement prompts deterministically", () => {
  expect(classifyAssistantPrompt("potrzebuje katalogu produktow")).toMatchObject({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(classifyAssistantPrompt("dodaj filtr po kategorii i cenie")).toMatchObject({
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
  });

  expect(classifyAssistantPrompt("stworz portfolio projektow")).toMatchObject({
    promptKind: "setup_request",
    intentFamily: "portfolio_projects",
  });
});

test("resolveContextualRefinementFamily uses runtime snapshot selected resource", () => {
  const family = resolveContextualRefinementFamily(
    createContext({
      runtimeSnapshot: {
        schemaVersion: 1,
        route: "/admin/pages/produkty",
        activeHref: "/admin/pages/produkty",
        area: "pages",
        codersoModule: null,
        selectedResource: {
          kind: "page",
          id: "produkty",
        },
        visibleActions: [],
        permissionHints: {
          known: false,
          requiredForVisibleActions: [],
          reason: "frontend_user_has_no_permissions",
        },
      },
    }),
    "unknown"
  );

  expect(family).toBe("product_catalog");
});

test("resolveContextualRefinementFamily uses resource catalog summaries", () => {
  const family = resolveContextualRefinementFamily(
    createContext({
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-11T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [
          {
            id: "ct-services",
            slug: "services",
            name: "Services",
            entryCount: 3,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    }),
    "unknown"
  );

  expect(family).toBe("services_directory");
});
