import { expect, test } from "vitest";

import type { AssistantPlanningState } from "../../../core/services/assistant/actionPlanTypes";
import {
  buildDraftFromFollowUpPolicy,
  resolveFollowUpIntent,
} from "../../../core/services/assistant/operationPolicy/followUpPolicy";

const state: AssistantPlanningState = {
  schemaVersion: 1,
  sourcePlanId: "plan-1",
  route: "/admin/pages",
  resourceKind: "page",
  operation: "find",
  query: null,
  candidates: [
    { kind: "page", id: "page-1", label: "First Page", slug: "/first", status: "published" },
    { kind: "page", id: "page-2", label: "Second Page", slug: "/second", status: "published" },
    { kind: "page", id: "page-3", label: "Third Page", slug: "/third", status: "draft" },
  ],
  createdAt: "2026-04-19T10:00:00.000Z",
  expiresAt: "2026-04-19T10:10:00.000Z",
};

test("follow-up policy resolves pronouns and count words from operation policy", () => {
  expect(resolveFollowUpIntent("usun dwóm pierwszym", state)).toMatchObject({
    operation: "delete",
    selected: [{ id: "page-1" }, { id: "page-2" }],
  });
  expect(resolveFollowUpIntent("usun je", state)).toMatchObject({
    operation: "delete",
    selected: [{ id: "page-1" }, { id: "page-2" }, { id: "page-3" }],
  });
});

test("follow-up policy builds exact prior-candidate target queries", () => {
  expect(buildDraftFromFollowUpPolicy("usun dwa pierwsze", state)).toMatchObject({
    operation: "delete",
    resourceKind: "page",
    targetQuery: {
      text: "First Page OR Second Page",
    },
    constraints: {
      expectedCount: 2,
      destructive: true,
      requiresConfirmation: true,
    },
  });
});

test("follow-up policy rejects prompts without policy follow-up signal", () => {
  expect(resolveFollowUpIntent("usun strone Alpha Page", state)).toBeNull();
});

test("follow-up policy ignores pronouns when prompt names another resource family", () => {
  expect(resolveFollowUpIntent("usun wszystkie formularze", state)).toBeNull();
});
