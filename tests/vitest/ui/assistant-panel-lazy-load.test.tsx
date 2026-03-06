import React from "react";
import { expect, test } from "vitest";

import { shouldLoadAssistantRuntimeState } from "../../../core/admin/ui/assistant/AssistantPanel";

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
