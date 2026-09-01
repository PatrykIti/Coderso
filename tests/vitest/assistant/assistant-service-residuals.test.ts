import { describe, expect, test } from "vitest";

import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";
import {
  isLikelyDeletePrompt,
  resolveContextualRefinementFamily,
} from "../../../core/services/assistant/actionPlanHeuristics";
import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";

describe("assistant service residual branches", () => {
  test("buildAssistantAdminContext treats a whitespace-only page as a null route", () => {
    const context = buildAssistantAdminContext({ page: "   " });
    expect(context.route).toBeNull();
    expect(context.area).toBe("other");
  });

  test("isLikelyDeletePrompt detects destructive prompts", () => {
    expect(isLikelyDeletePrompt("usuń stronę")).toBe(true);
    expect(isLikelyDeletePrompt("napraw układ przycisku")).toBe(false);
  });

  test("resolveContextualRefinementFamily maps portfolio routes to portfolio projects", () => {
    const context = buildAssistantAdminContext({ page: "/admin/portfolio" });
    expect(resolveContextualRefinementFamily(context, "product_catalog")).toBe(
      "portfolio_projects"
    );
  });

  test("normalizeAssistantActionPlan rejects an entry upsert draft with an untrusted media reference", () => {
    const plan = {
      status: "ready",
      questions: [],
      actions: [
        {
          type: "entry.upsert-draft",
          id: "a1",
          title: "Draft",
          description: "d",
          input: {
            contentTypeSlug: "products",
            title: "Sample",
            slug: "sample",
            values: { imageUrl: "https://evil.example/untrusted.jpg" },
          },
        },
      ],
      id: "p1",
      intentId: "provider-entry",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      title: "Draft entry",
      answer: "I can draft an entry.",
      summary: "Create a draft product entry.",
      confidence: 0.8,
      assumptions: [],
    };
    expect(() => normalizeAssistantActionPlan(plan)).toThrow("assistant_action_plan_invalid");
  });

  test("normalizeAssistantActionPlan infers docs response kind when no questions or actions exist", () => {
    const plan = {
      status: "ready",
      questions: [],
      actions: [],
      id: "p2",
      intentId: "generic-guide",
      title: "Guide",
      answer: "Here is a guide.",
      summary: "Docs only.",
      confidence: 0.9,
      assumptions: [],
    };
    const normalized = normalizeAssistantActionPlan(plan);
    expect(normalized.responseKind).toBe("docs");
    expect(normalized.actions).toEqual([]);
  });
});
