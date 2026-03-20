import React from "react";
import { expect, test } from "vitest";

import {
  resolveAssistantConversationState,
  resolveAssistantConversationWindowPosition,
  resolveAssistantPanelViewState,
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

test("assistant conversation window stays anchored near launcher and within viewport bounds", () => {
  const anchored = resolveAssistantConversationWindowPosition({
    launcherPosition: { x: 1200, y: 760 },
    viewportWidth: 1440,
    viewportHeight: 900,
  });

  expect(anchored.width).toBeLessThanOrEqual(360);
  expect(anchored.left).toBeGreaterThanOrEqual(24);
  expect(anchored.bottom).toBeGreaterThanOrEqual(24);

  const clamped = resolveAssistantConversationWindowPosition({
    launcherPosition: { x: 20, y: 40 },
    viewportWidth: 320,
    viewportHeight: 480,
  });

  expect(clamped.left).toBeGreaterThanOrEqual(24);
  expect(clamped.width).toBeLessThanOrEqual(320 - 48);
  expect(clamped.maxHeight).toBeGreaterThanOrEqual(320);
});
