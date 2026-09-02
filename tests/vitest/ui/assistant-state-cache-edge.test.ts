// @vitest-environment happy-dom

import { afterEach, expect, test, vi } from "vitest";

import * as assistantStatusClient from "../../../core/admin/services/assistantStatusClient";
import type { AssistantStatusResponse } from "../../../core/admin/services/assistantStatusClient";
import {
  clearAssistantConversationState,
  readAssistantConversationState,
} from "../../../core/admin/ui/assistant/assistantConversationState";
import {
  clearAssistantRuntimeStateCache,
  loadAssistantRuntimeStateCached,
  readAssistantRuntimeStateCache,
} from "../../../core/admin/ui/assistant/assistantRuntimeStateCache";

const STORAGE_KEY = "coderso.assistant.conversation.state";
const LEGACY_STORAGE_KEY = "nextless.assistant.conversation.state";

const STATUS: AssistantStatusResponse = {
  enabled: true,
  defaultMode: "llm-guide",
  retrievalBackend: "db",
  llmAvailable: true,
  indexReady: true,
  indexBuilding: false,
  indexError: null,
  lastReindexAt: null,
  docCount: 12,
  chunkCount: 44,
};

afterEach(() => {
  clearAssistantConversationState();
  clearAssistantRuntimeStateCache();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const validSnapshot = () => ({
  schemaVersion: 1,
  savedAt: "2099-01-01T00:00:00.000Z",
  expiresAt: "2099-01-01T01:00:00.000Z",
  messages: [{ id: "msg-1", role: "user", text: "Where are settings?" }],
  activePlan: null,
  activePreview: null,
  activeExecution: null,
  planningState: null,
  assistantMode: "llm-guide",
});

test("readAssistantConversationState removes oversized payloads", () => {
  window.localStorage.setItem(STORAGE_KEY, "x".repeat(33_000));

  expect(readAssistantConversationState()).toBeNull();
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
});

test("readAssistantConversationState removes expired payloads", () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...validSnapshot(), expiresAt: "2000-01-01T00:00:00.000Z" })
  );

  expect(readAssistantConversationState()).toBeNull();
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
});

test("readAssistantConversationState migrates legacy payloads into the current key", () => {
  window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(validSnapshot()));

  const state = readAssistantConversationState();

  expect(state?.messages[0]).toMatchObject({ id: "msg-1", text: "Where are settings?" });
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(validSnapshot()));
});

test("readAssistantConversationState returns null for corrupt JSON", () => {
  window.localStorage.setItem(STORAGE_KEY, "{not-json");

  expect(readAssistantConversationState()).toBeNull();
});

test("loadAssistantRuntimeStateCached deduplicates in-flight requests", async () => {
  let resolveStatus!: (value: AssistantStatusResponse) => void;
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockReturnValue(
    new Promise<AssistantStatusResponse>((resolve) => {
      resolveStatus = resolve;
    })
  );

  const first = loadAssistantRuntimeStateCached({ now: () => 1_000 });
  const second = loadAssistantRuntimeStateCached({ now: () => 1_001 });

  expect(assistantStatusClient.getAssistantStatus).toHaveBeenCalledTimes(1);

  resolveStatus(STATUS);
  await expect(first).resolves.toMatchObject({ status: { enabled: true } });
  await expect(second).resolves.toMatchObject({ status: { enabled: true } });
});

test("loadAssistantRuntimeStateCached reports a stale cache read as a miss", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(STATUS);

  await loadAssistantRuntimeStateCached({ now: () => 1_000 });
  expect(readAssistantRuntimeStateCache(1_000)).toMatchObject({
    status: { enabled: true },
  });
  expect(readAssistantRuntimeStateCache(1_000 + 60_001)).toBeNull();
});
