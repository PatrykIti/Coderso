import { expect, test } from "vitest";

import { normalizeCmsOperationDraft } from "../../../core/services/assistant/cmsOperationDraftSchema";
import {
  canMapExpectedCountMultiWithPolicy,
  canMapFilteredAllWithPolicy,
  canRecoverUnsupportedProviderActionDraftWithPolicy,
  extractExpectedCountWithPolicy,
  hasDestructiveCountMismatchWithPolicy,
  hasPromptImpliedFieldMismatchWithPolicy,
  isBroadDestructivePromptWithPolicy,
} from "../../../core/services/assistant/operationPolicy/safetyPolicy";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

const plan = (actions: AssistantActionPlan["actions"]): AssistantActionPlan => ({
  id: "plan",
  status: "ready",
  intentId: "test",
  responseKind: "action_plan",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  title: "Test",
  answer: "Test",
  summary: "Test",
  confidence: 1,
  assumptions: [],
  questions: [],
  actions,
});

test("safety policy detects broad destructive prompts and explicit counts", () => {
  expect(isBroadDestructivePromptWithPolicy("usun wszystkie formularze")).toBe(true);
  expect(isBroadDestructivePromptWithPolicy("pokaz wszystkie formularze")).toBe(false);
  expect(extractExpectedCountWithPolicy("usun dwie strony")).toBe(2);
});

test("safety policy detects destructive count mismatches", () => {
  expect(
    hasDestructiveCountMismatchWithPolicy(
      "usun dwie strony",
      plan([
        {
          id: "delete-1",
          type: "page.delete",
          title: "Delete",
          description: "Delete",
          input: { id: "page-1", title: "Page", slug: "/", expectedStatus: "draft" },
        },
      ])
    )
  ).toBe(true);
});

test("safety policy detects prompt-implied field mismatches from policy fields", () => {
  expect(
    hasPromptImpliedFieldMismatchWithPolicy(
      "zmien layout listingu",
      plan([
        {
          id: "listing-template-update",
          type: "listing-template.update",
          title: "Update",
          description: "Update",
          input: {
            id: "template-1",
            name: "Template",
            slug: "template",
            expectedLayout: "grid",
            patch: { name: "Template 2" },
          },
        },
      ])
    )
  ).toBe(true);
});

test("safety policy gates counted and filtered-all multi target rules from policy", () => {
  const countedDraft = normalizeCmsOperationDraft({
    operation: "delete",
    resourceKind: "page",
    targetQuery: { exactName: "Katalog" },
    constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
  });
  const filteredAllDraft = normalizeCmsOperationDraft({
    operation: "delete",
    resourceKind: "page",
    filters: [{ field: "status", operator: "eq", value: "published" }],
  });
  const resolution = {
    status: "ambiguous" as const,
    draft: countedDraft,
    candidates: [
      { kind: "page" as const, id: "1", label: "A", slug: "/a", status: "published", adminHref: "/admin/pages/1" },
      { kind: "page" as const, id: "2", label: "B", slug: "/b", status: "published", adminHref: "/admin/pages/2" },
    ],
    reason: "matched",
  };

  expect(canMapExpectedCountMultiWithPolicy(countedDraft, resolution)).toBe(true);
  expect(canMapFilteredAllWithPolicy("usun wszystkie opublikowane strony", filteredAllDraft, {
    ...resolution,
    draft: filteredAllDraft,
  })).toBe(true);
});

test("safety policy allows local recovery only for non-dangerous provider action arrays", () => {
  expect(
    canRecoverUnsupportedProviderActionDraftWithPolicy({
      actions: [{ type: "page.create", input: {} }],
    })
  ).toBe(true);
  expect(
    canRecoverUnsupportedProviderActionDraftWithPolicy({
      actions: [{ type: "database.drop", input: {} }],
    })
  ).toBe(false);
});
