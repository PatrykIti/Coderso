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
          adminHref: `/admin/advanced/custom-screens/screen-${index + 1}`,
        })),
        truncated: true,
      },
      actions: [],
    },
    {
      route: "/admin/advanced/custom-screens",
      nowMs: Date.parse("2026-04-17T10:00:00.000Z"),
      ttlMs: 60_000,
    }
  );

  expect(state).toMatchObject({
    schemaVersion: 1,
    sourcePlanId: "plan-cms-custom-screen-inspect",
    route: "/admin/advanced/custom-screens",
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
    normalizeAssistantPlanningState(
      {
        schemaVersion: 1,
        sourcePlanId: "plan-1",
        route: "/admin",
        resourceKind: "custom-screen",
        operation: "inspect",
        query: "apiKey should not persist",
        candidates: [{ kind: "custom-screen", id: "screen-1", label: "House Projects" }],
        createdAt: "2026-04-17T10:00:00.000Z",
        expiresAt: "2026-04-17T10:01:00.000Z",
      },
      { nowMs: Date.parse("2026-04-17T10:00:30.000Z") }
    )
  ).toMatchObject({
    query: null,
  });
});

test("buildCmsOperationDraftFromPlanningState resolves Polish follow-up selections", () => {
  const state = normalizeAssistantPlanningState(
    {
      schemaVersion: 1,
      sourcePlanId: "plan-1",
      route: "/admin/advanced/custom-screens",
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
      text: "House Projects OR House Projects Archive",
    },
    constraints: {
      expectedCount: 2,
    },
  });
});

test("buildCmsOperationDraftFromPlanningState preserves all prior candidates when query is empty", () => {
  const state = normalizeAssistantPlanningState(
    {
      schemaVersion: 1,
      sourcePlanId: "plan-pages",
      route: "/admin/pages",
      resourceKind: "page",
      operation: "find",
      query: null,
      candidates: [
        { kind: "page", id: "home", label: "home", slug: "/", status: "published" },
        {
          kind: "page",
          id: "catalog",
          label: "Katalog Projektów Domów 33151341",
          slug: "/projekty-domow-33151341",
          status: "published",
        },
        {
          kind: "page",
          id: "seo-page",
          label: "llm-live SEO Page",
          slug: "/llm-live-seo-page",
          status: "published",
        },
      ],
      createdAt: "2026-04-17T10:00:00.000Z",
      expiresAt: "2026-04-17T10:10:00.000Z",
    },
    { nowMs: Date.parse("2026-04-17T10:02:00.000Z") }
  );

  expect(buildCmsOperationDraftFromPlanningState("usun je", state)).toMatchObject({
    operation: "delete",
    resourceKind: "page",
    targetQuery: {
      text: "home OR Katalog Projektów Domów 33151341 OR llm-live SEO Page",
    },
    constraints: {
      expectedCount: 3,
    },
  });
});
