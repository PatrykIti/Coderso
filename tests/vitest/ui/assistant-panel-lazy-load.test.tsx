import React from "react";
import { expect, test } from "vitest";

import {
  resolveAssistantComposerState,
  resolveAssistantConversationState,
  resolveAssistantConversationWindowPosition,
  resolveAssistantPanelViewState,
  resolveAssistantCurrentMode,
  hasRestorableAssistantConversation,
  shouldLoadAssistantRuntimeState,
} from "../../../core/admin/ui/assistant/AssistantPanel";

test("assistant runtime loads only after panel is opened", () => {
  expect(
    shouldLoadAssistantRuntimeState({
      open: false,
      isReady: false,
      isLoading: false,
    })
  ).toBe(false);
});

test("assistant runtime does not reload while loading or after ready", () => {
  expect(
    shouldLoadAssistantRuntimeState({
      open: true,
      isReady: false,
      isLoading: true,
    })
  ).toBe(false);

  expect(
    shouldLoadAssistantRuntimeState({
      open: true,
      isReady: true,
      isLoading: false,
    })
  ).toBe(false);
});

test("assistant runtime loads once when opened and not ready", () => {
  expect(
    shouldLoadAssistantRuntimeState({
      open: true,
      isReady: false,
      isLoading: false,
    })
  ).toBe(true);
});

test("assistant panel view state distinguishes loading, error, disabled, and ready", () => {
  expect(
    resolveAssistantPanelViewState({
      isReady: false,
      loadError: null,
      statusEnabled: true,
    })
  ).toBe("loading");

  expect(
    resolveAssistantPanelViewState({
      isReady: true,
      loadError: "boom",
      statusEnabled: true,
    })
  ).toBe("error");

  expect(
    resolveAssistantPanelViewState({
      isReady: true,
      loadError: null,
      statusEnabled: false,
    })
  ).toBe("disabled");

  expect(
    resolveAssistantPanelViewState({
      isReady: true,
      loadError: null,
      statusEnabled: true,
    })
  ).toBe("ready");
});

test("assistant conversation state keeps docs-not-ready separate from empty chat", () => {
  expect(
    resolveAssistantConversationState({
      messageCount: 0,
      indexReady: false,
    })
  ).toBe("docs-not-ready");

  expect(
    resolveAssistantConversationState({
      messageCount: 0,
      indexReady: false,
      mode: "llm-guide",
    })
  ).toBe("empty");

  expect(
    resolveAssistantConversationState({
      messageCount: 0,
      indexReady: true,
    })
  ).toBe("empty");

  expect(
    resolveAssistantConversationState({
      messageCount: 2,
      indexReady: false,
    })
  ).toBe("messages");
});

test("assistant composer gates docs-only by docs index and LLM Guide by provider availability", () => {
  const baseStatus = {
    enabled: true,
    defaultMode: "docs-only" as const,
    retrievalBackend: "db" as const,
    llmAvailable: true,
    indexReady: false,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 0,
    chunkCount: 0,
  };

  expect(
    resolveAssistantComposerState({
      message: "Create a product catalog",
      isSending: false,
      status: baseStatus,
      mode: "llm-guide",
    })
  ).toEqual({ disabled: false, reason: null });

  expect(
    resolveAssistantComposerState({
      message: "Where are assistant settings?",
      isSending: false,
      status: baseStatus,
      mode: "docs-only",
    })
  ).toEqual({ disabled: true, reason: "docs_not_ready" });

  expect(
    resolveAssistantComposerState({
      message: "Create a product catalog",
      isSending: false,
      status: { ...baseStatus, llmAvailable: false },
      mode: "llm-guide",
    })
  ).toEqual({ disabled: true, reason: "llm_unavailable" });
});

test("assistant panel ignores stale empty conversation mode when choosing the global default", () => {
  const emptySnapshot = {
    messages: [],
    activePlan: null,
    activePreview: null,
    activeExecution: null,
    planningState: null,
    assistantMode: "docs-only" as const,
  };

  expect(hasRestorableAssistantConversation(null)).toBe(false);
  expect(hasRestorableAssistantConversation(emptySnapshot)).toBe(false);
  expect(
    hasRestorableAssistantConversation({
      ...emptySnapshot,
      messages: [
        {
          id: "message-1",
          role: "assistant",
          text: "Existing answer",
        },
      ],
    })
  ).toBe(true);
});

test("assistant panel starts LLM Guide for a new chat when docs are missing but LLM is ready", () => {
  const status = {
    enabled: true,
    defaultMode: "docs-only" as const,
    retrievalBackend: "db" as const,
    llmAvailable: true,
    indexReady: false,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 0,
    chunkCount: 0,
  };

  expect(
    resolveAssistantCurrentMode({
      status,
      preferredMode: null,
      hasConversation: false,
    })
  ).toBe("llm-guide");

  expect(
    resolveAssistantCurrentMode({
      status,
      preferredMode: "docs-only",
      hasConversation: true,
    })
  ).toBe("docs-only");

  expect(
    resolveAssistantCurrentMode({
      status,
      preferredMode: null,
      hasConversation: true,
    })
  ).toBe("llm-guide");
});

test("assistant conversation window stays anchored near launcher and within viewport bounds", () => {
  const anchored = resolveAssistantConversationWindowPosition({
    launcherPosition: { x: 1200, y: 760 },
    viewportWidth: 1440,
    viewportHeight: 900,
    preferredWidth: 640,
  });

  expect(anchored.width).toBeLessThanOrEqual(520);
  expect(anchored.left).toBeGreaterThanOrEqual(24);
  expect(anchored.bottom).toBeGreaterThanOrEqual(24);

  const clamped = resolveAssistantConversationWindowPosition({
    launcherPosition: { x: 20, y: 40 },
    viewportWidth: 320,
    viewportHeight: 480,
    preferredWidth: 640,
  });

  expect(clamped.left).toBeGreaterThanOrEqual(24);
  expect(clamped.width).toBeLessThanOrEqual(320 - 48);
  expect(clamped.maxHeight).toBeGreaterThanOrEqual(320);
});
