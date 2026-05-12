import { expect, test } from "vitest";

import { normalizeWidgetSafeHref } from "../../../core/widgets/core/widgetSafeHref";

test("normalizeWidgetSafeHref keeps allowed relative, hash, and http urls", () => {
  expect(
    normalizeWidgetSafeHref("/pricing", {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    })
  ).toBe("/pricing");
  expect(
    normalizeWidgetSafeHref("#pricing", {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    })
  ).toBe("#pricing");
  expect(
    normalizeWidgetSafeHref("https://example.com/pricing", {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    })
  ).toBe("https://example.com/pricing");
});

test("normalizeWidgetSafeHref rejects unsafe or unsupported protocols", () => {
  const options = {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  };

  expect(normalizeWidgetSafeHref("javascript:alert(1)", options)).toBeUndefined();
  expect(normalizeWidgetSafeHref("data:text/html,<p>x</p>", options)).toBeUndefined();
  expect(normalizeWidgetSafeHref("vbscript:msgbox(1)", options)).toBeUndefined();
  expect(normalizeWidgetSafeHref("//evil.example", options)).toBeUndefined();
  expect(normalizeWidgetSafeHref("mailto:test@example.com", options)).toBeUndefined();
});
