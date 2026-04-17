import { expect, test } from "vitest";

import {
  buildAssistantPlanningStateFromPlan,
  buildCmsOperationDraftFromPlanningState,
  normalizeAssistantPlanningState,
} from "../../../core/services/assistant/cmsPlanningState";

test("buildAssistantPlanningStateFromPlan creates bounded candidate memory", () => {
  const state = buildAssistantPlanningStateFromPlan(
    {
      id: "plan-cms-custom-screen-inspect",
      status: "ready",
      intentId: "cms-resource-inspect",
      responseKind: "inspection",
      title: "CMS resource inspection",
      answer: "Found screens.",
      summary: "Found candidates.",
      confidence: 0.8,
      assumptions: [],
      questions: [],
      inspection: {
        kind: "resource-candidates",
        operation: "inspect",
        resourceKind: "custom-screen",
        matchStatus: "matched",
        query: "House Projects",
        candidates: Array.from({ length: 12 }, (_, index) => ({
          kind: "custom-screen",
          id: `screen-${index + 1}`,
          label: `House Projects ${index + 1}`,
          slug: null,
          status: "active",
          adminHref: `/admin/coderso/custom-screens/screen-${index + 1}`,
        })),
        truncated: true,
      },
      actions: [],
    },
    {
      route: "/admin/coderso/custom-screens",
      nowMs: Date.parse("2026-04-17T10:00:00.000Z"),
      ttlMs: 60_000,
    }
  );

  expect(state).toMatchObject({
    schemaVersion: 1,
    sourcePlanId: "plan-cms-custom-screen-inspect",
    route: "/admin/coderso/custom-screens",
    resourceKind: "custom-screen",
    query: "House Projects",
  });
  expect(state?.candidates).toHaveLength(10);
  expect(state?.expiresAt).toBe("2026-04-17T10:01:00.000Z");
});

test("normalizeAssistantPlanningState rejects expired and secret-like state", () => {
  expect(
    normalizeAssistantPlanningState(
      {
        schemaVersion: 1,
        sourcePlanId: "plan-1",
        route: "/admin",
        resourceKind: "custom-screen",
        operation: "inspect",
        query: "House Projects",
        candidates: [{ kind: "custom-screen", id: "screen-1", label: "House Projects" }],
        createdAt: "2026-04-17T10:00:00.000Z",
        expiresAt: "2026-04-17T10:01:00.000Z",
      },
      { nowMs: Date.parse("2026-04-17T10:02:00.000Z") }
    )
  ).toBeNull();

  expect(
    normalizeAssistantPlanningState({
      schemaVersion: 1,
      sourcePlanId: "plan-1",
      route: "/admin",
      resourceKind: "custom-screen",
      operation: "inspect",
      query: "apiKey should not persist",
      candidates: [{ kind: "custom-screen", id: "screen-1", label: "House Projects" }],
      createdAt: "2026-04-17T10:00:00.000Z",
      expiresAt: "2026-04-17T10:01:00.000Z",
    })
  ).toMatchObject({
    query: null,
  });
});

test("buildCmsOperationDraftFromPlanningState resolves Polish follow-up selections", () => {
  const state = normalizeAssistantPlanningState(
    {
      schemaVersion: 1,
      sourcePlanId: "plan-1",
      route: "/admin/coderso/custom-screens",
      resourceKind: "custom-screen",
      operation: "inspect",
      query: "House Projects",
      candidates: [
        { kind: "custom-screen", id: "screen-1", label: "House Projects" },
        { kind: "custom-screen", id: "screen-2", label: "House Projects Archive" },
      ],
      createdAt: "2026-04-17T10:00:00.000Z",
      expiresAt: "2026-04-17T10:10:00.000Z",
    },
    { nowMs: Date.parse("2026-04-17T10:02:00.000Z") }
  );

  expect(buildCmsOperationDraftFromPlanningState("usun pierwszy", state)).toMatchObject({
    operation: "delete",
    resourceKind: "custom-screen",
    targetQuery: {
      exactName: "House Projects",
    },
  });

  expect(buildCmsOperationDraftFromPlanningState("usun te dwa pierwsze", state)).toMatchObject({
    operation: "delete",
    resourceKind: "custom-screen",
    targetQuery: {
      prefix: "House Projects",
    },
    constraints: {
      expectedCount: 2,
    },
  });
});
