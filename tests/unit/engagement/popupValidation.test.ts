import { expect, test } from "bun:test";

import {
  normalizePopupFrequency,
  normalizePopupSlug,
  normalizePopupStatus,
  normalizePopupTargeting,
  normalizePopupTrigger,
} from "../../../core/services/popups/popupValidation";

test("normalizePopupStatus uses fallback and accepts valid values", () => {
  expect(normalizePopupStatus(undefined, "draft")).toBe("draft");
  expect(normalizePopupStatus("published", "draft")).toBe("published");
});

test("normalizePopupStatus rejects invalid value", () => {
  expect(() => normalizePopupStatus("invalid", "draft")).toThrow("popup_status_invalid");
});

test("normalizePopupTrigger supports all trigger variants", () => {
  expect(normalizePopupTrigger({ type: "time_delay", delaySeconds: 10 })).toEqual({
    type: "time_delay",
    delaySeconds: 10,
  });
  expect(normalizePopupTrigger({ type: "scroll_depth", percent: 55 })).toEqual({
    type: "scroll_depth",
    percent: 55,
  });
  expect(normalizePopupTrigger({ type: "exit_intent" })).toEqual({
    type: "exit_intent",
  });
  expect(normalizePopupTrigger({ type: "cta_click", selector: "#hero-cta" })).toEqual({
    type: "cta_click",
    selector: "#hero-cta",
  });
});

test("normalizePopupTargeting normalizes path lists and defaults audience", () => {
  const normalized = normalizePopupTargeting({
    includePaths: ["/", " /pricing "],
    excludePaths: ["/private"],
  });
  expect(normalized).toEqual({
    includePaths: ["/", "/pricing"],
    excludePaths: ["/private"],
    audience: "all",
  });
});

test("normalizePopupFrequency normalizes strategy and cooldown", () => {
  expect(
    normalizePopupFrequency({
      strategy: "daily_once",
      cooldownMinutes: 30,
    })
  ).toEqual({
    strategy: "daily_once",
    cooldownMinutes: 30,
  });
});

test("normalizePopupSlug derives slug from fallback source", () => {
  expect(normalizePopupSlug(undefined, "Welcome Offer")).toBe("welcome-offer");
});
