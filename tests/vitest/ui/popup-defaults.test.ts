import { expect, test } from "vitest";

import {
  createDefaultPopupInput,
  defaultPopupContent,
  defaultPopupFrequency,
  defaultPopupSettings,
  defaultPopupTargeting,
  defaultPopupTrigger,
  popupStatusOptions,
} from "../../../core/admin/ui/popups/popupDefaults";

test("popup defaults expose the expected status options", () => {
  expect(popupStatusOptions).toEqual([
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ]);
});

test("popup default factories return isolated baseline objects", () => {
  expect(defaultPopupTrigger()).toEqual({
    type: "time_delay",
    delaySeconds: 3,
  });
  expect(defaultPopupTargeting()).toEqual({
    includePaths: [],
    excludePaths: [],
    audience: "all",
  });
  expect(defaultPopupFrequency()).toEqual({
    strategy: "session_once",
    cooldownMinutes: null,
  });
  expect(defaultPopupContent()).toEqual({
    title: "",
    body: "",
    templateId: null,
    ctaLabel: "",
    ctaHref: "",
  });
  expect(defaultPopupSettings()).toEqual({
    placement: "center",
    dismissible: true,
    showOverlay: true,
  });

  const a = createDefaultPopupInput();
  const b = createDefaultPopupInput();
  a.trigger.delaySeconds = 10;

  expect(b.trigger.delaySeconds).toBe(3);
  expect(a).toMatchObject({
    name: "",
    slug: "",
    status: "draft",
  });
});
