import { expect, test } from "vitest";

import {
  createPageListItem,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  escapeAuthoringCssString,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "../../../core/services/pages/pageAuthoringSanitizers";

test("authoring URL sanitizers keep current safe hrefs and reject scriptable protocols", () => {
  expect(sanitizeAuthoringLinkHref("/pricing")).toBe("/pricing");
  expect(sanitizeAuthoringLinkHref("#features")).toBe("#features");
  expect(sanitizeAuthoringLinkHref("https://example.com/pricing")).toBe(
    "https://example.com/pricing"
  );
  expect(sanitizeAuthoringMediaUrl("/uploads/hero.jpg")).toBe("/uploads/hero.jpg");
  expect(sanitizeAuthoringMediaUrl("https://cdn.example.com/hero.jpg")).toBe(
    "https://cdn.example.com/hero.jpg"
  );

  for (const unsafe of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example/asset.png",
  ]) {
    expect(sanitizeAuthoringLinkHref(unsafe)).toBeNull();
    expect(sanitizeAuthoringMediaUrl(unsafe)).toBeNull();
  }

  expect(sanitizeAuthoringMediaUrl("#inline-fragment")).toBeNull();
});

test("authoring CSS sanitizers keep safe color and gradient values fail closed", () => {
  expect(sanitizeAuthoringCssColor("#0d9488")).toBe("#0d9488");
  expect(sanitizeAuthoringCssColor("rgba(13, 148, 136, 0.35)")).toBe("rgba(13, 148, 136, 0.35)");
  expect(sanitizeAuthoringCssBackground("linear-gradient(90deg, #000, #fff)")).toBe(
    "linear-gradient(90deg, #000, #fff)"
  );

  expect(sanitizeAuthoringCssColor("red;}body{display:none")).toBeNull();
  expect(sanitizeAuthoringCssBackground("url(javascript:alert(1))")).toBeNull();
  expect(sanitizeAuthoringCssBackground("linear-gradient(90deg, #000, </style>)")).toBeNull();
});

test("authoring CSS string escaping prevents style element breakout", () => {
  const escaped = escapeAuthoringCssString('"></style><script>alert(1)</script>');
  expect(escaped).toContain('\\"');
  expect(escaped).toContain("\\3c /style\\3e ");
  expect(escaped).not.toContain("</style>");
  expect(escaped).not.toContain("<script>");
});

test("Page v2 normalizers sanitize URL and style fields before persistence", () => {
  expect(createPageListItem("Unsafe", "javascript:alert(1)")).toBe("Unsafe");

  const button = createPageBlockV2("button", {
    props: { label: "Open", href: "javascript:alert(1)", target: "self" },
  });
  expect(button.props.href).toBeNull();

  const image = createPageBlockV2("image", {
    props: { src: "data:text/html,<svg onload=alert(1)>", alt: "Unsafe" },
  });
  expect(image.props.src).toBeNull();

  const section = createPageSectionV2("hero", {
    style: {
      background: "url(javascript:alert(1))",
      backgroundType: "image",
      backgroundImage: "javascript:alert(1)",
      accent: "red;}body{display:none",
      radius: 0,
      shadow: "none",
    },
  });
  expect(section.style.background).toBe("#ffffff");
  expect(section.style.backgroundImage).toBeNull();
  expect(section.style.accent).toBe("#0d9488");
});
