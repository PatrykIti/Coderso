// @vitest-environment happy-dom

import { afterEach, expect, test } from "vitest";

import {
  clearAssistantConversationState,
  readAssistantConversationState,
  writeAssistantConversationState,
} from "../../../core/admin/ui/assistant/assistantConversationState";

afterEach(() => {
  clearAssistantConversationState();
  window.localStorage.clear();
});

test("assistant conversation state persists bounded safe state", () => {
  writeAssistantConversationState({
    messages: [
      {
        id: "msg-1",
        role: "user",
        text: "jakie ekrany customowe sa w Screens?",
      },
      {
        id: "msg-2",
        role: "assistant",
        text: "House Projects - active",
      },
    ],
    activePlan: {
      id: "plan-cms-custom-screen-inspect",
      status: "ready",
      intentId: "cms-resource-inspect",
      responseKind: "inspection",
      title: "CMS resource inspection",
      answer: "Found screens.",
      summary: "Found candidates.",
      confidence: 0.72,
      assumptions: [],
      questions: [],
      inspection: {
        kind: "resource-candidates",
        operation: "inspect",
        resourceKind: "custom-screen",
        matchStatus: "matched",
        query: "Screens",
        candidates: [
          {
            kind: "custom-screen",
            id: "screen-house",
            label: "House Projects",
            status: "active",
          },
        ],
        truncated: false,
      },
      actions: [],
    },
    activePreview: null,
    activeExecution: null,
    planningState: {
      schemaVersion: 1,
      sourcePlanId: "plan-cms-custom-screen-inspect",
      route: "/admin/coderso/custom-screens",
      resourceKind: "custom-screen",
      operation: "inspect",
      query: "Screens",
      candidates: [{ kind: "custom-screen", id: "screen-house", label: "House Projects" }],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    assistantMode: "llm-guide",
  });

  expect(readAssistantConversationState()).toMatchObject({
    messages: [
      { role: "user", text: "jakie ekrany customowe sa w Screens?" },
      { role: "assistant", text: "House Projects - active" },
    ],
    activePlan: {
      id: "plan-cms-custom-screen-inspect",
      responseKind: "inspection",
    },
    planningState: {
      resourceKind: "custom-screen",
      candidates: [{ id: "screen-house", label: "House Projects" }],
    },
    assistantMode: "llm-guide",
  });
});

test("assistant conversation state redacts secret-like message text", () => {
  writeAssistantConversationState({
    messages: [{ id: "msg-secret", role: "user", text: "apiKey sk-test" }],
    activePlan: null,
    activePreview: null,
    activeExecution: null,
    planningState: null,
    assistantMode: "llm-guide",
  });

  expect(readAssistantConversationState()?.messages).toEqual([]);
});
