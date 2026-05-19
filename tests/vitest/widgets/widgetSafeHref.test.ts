import { expect, test } from "vitest";

import {
  normalizeWidgetSafeHref,
  resolveWidgetLinkAttrs,
} from "../../../core/widgets/core/widgetSafeHref";

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

test("resolveWidgetLinkAttrs can open only external links in a new tab", () => {
  expect(
    resolveWidgetLinkAttrs("https://example.com/pricing", {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
      openExternalInNewTab: true,
    })
  ).toEqual({
    href: "https://example.com/pricing",
    target: "_blank",
    rel: "noopener noreferrer",
  });

  expect(
    resolveWidgetLinkAttrs("/pricing", {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
      openExternalInNewTab: true,
    })
  ).toEqual({
    href: "/pricing",
  });
});

test("resolveWidgetLinkAttrs can force safe same-origin and external links into a new tab", () => {
  expect(
    resolveWidgetLinkAttrs("/pricing", {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
      openInNewTab: true,
    })
  ).toEqual({
    href: "/pricing",
    target: "_blank",
    rel: "noopener noreferrer",
  });
});
