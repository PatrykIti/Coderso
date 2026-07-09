import { expect, test } from "vitest";

import {
  createPageListItem,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PAGE_BG_MAX_LAYERS,
  composeAuthoringGradientCss,
  escapeAuthoringCssString,
  isSafeAuthoringCssBackgroundLayers,
  normalizeAuthoringSafeHref,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
  sanitizeAuthoringRichTextHtml,
} from "../../../core/services/pages/pageAuthoringSanitizers";

test("authoring URL sanitizers keep current safe hrefs and reject scriptable protocols", () => {
  expect(sanitizeAuthoringLinkHref("/pricing")).toBe("/pricing");
  expect(sanitizeAuthoringLinkHref("#features")).toBe("#features");
  expect(sanitizeAuthoringLinkHref("https://example.com/pricing")).toBe(
    "https://example.com/pricing"
  );
  expect(sanitizeAuthoringLinkHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
  expect(sanitizeAuthoringLinkHref("tel:+15550100")).toBe("tel:+15550100");
  expect(sanitizeAuthoringMediaUrl("/uploads/hero.jpg")).toBe("/uploads/hero.jpg");
  expect(sanitizeAuthoringMediaUrl("https://cdn.example.com/hero.jpg")).toBe(
    "https://cdn.example.com/hero.jpg"
  );
  expect(sanitizeAuthoringMediaUrl("mailto:hello@example.com")).toBeNull();
  expect(sanitizeAuthoringMediaUrl("tel:+15550100")).toBeNull();

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

test("Page authoring safe href helper is neutral and option scoped", () => {
  expect(normalizeAuthoringSafeHref("/pricing", { allowRelative: true })).toBe("/pricing");
  expect(normalizeAuthoringSafeHref("#hero", { allowHash: true })).toBe("#hero");
  expect(normalizeAuthoringSafeHref("https://example.com", { allowHttp: true })).toBe(
    "https://example.com"
  );
  expect(normalizeAuthoringSafeHref("/pricing")).toBeUndefined();
  expect(normalizeAuthoringSafeHref("#hero")).toBeUndefined();
  expect(normalizeAuthoringSafeHref("https://example.com")).toBeUndefined();
  expect(normalizeAuthoringSafeHref("//evil.example", { allowHttp: true })).toBeUndefined();
  expect(normalizeAuthoringSafeHref("javascript:alert(1)", { allowHttp: true })).toBeUndefined();
});

test("authoring CSS sanitizers keep safe color and gradient values fail closed", () => {
  expect(sanitizeAuthoringCssColor("#0d9488")).toBe("#0d9488");
  expect(sanitizeAuthoringCssColor("var(--color-primary)")).toBe("var(--color-primary)");
  expect(sanitizeAuthoringCssColor("var(--color-danger)")).toBeNull();
  expect(sanitizeAuthoringCssColor("rgba(13, 148, 136, 0.35)")).toBe("rgba(13, 148, 136, 0.35)");
  expect(sanitizeAuthoringCssBackground("linear-gradient(90deg, #000, #fff)")).toBe(
    "linear-gradient(90deg, #000, #fff)"
  );

  expect(sanitizeAuthoringCssColor("red;}body{display:none")).toBeNull();
  expect(sanitizeAuthoringCssBackground("url(javascript:alert(1))")).toBeNull();
  expect(sanitizeAuthoringCssBackground("linear-gradient(90deg, #000, </style>)")).toBeNull();
});

test("TASK-531: multi-layer background sanitizer accepts safe glow-over-gradient layers", () => {
  // Reference `.cta-card`: radial glow OVER a base linear gradient — the whole reason
  // 531 relaxes the write boundary. Value returned trimmed-unchanged.
  const ctaCard =
    "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";
  expect(sanitizeAuthoringCssBackground(ctaCard)).toBe(ctaCard);
  expect(isSafeAuthoringCssBackgroundLayers(ctaCard)).toBe(true);

  // A color layer + a gradient layer (allowlist accepts either per layer).
  const colorPlusGradient =
    "linear-gradient(180deg,#eaf3ff,#dfe9ff), radial-gradient(circle,#8ee8ff,transparent 70%)";
  expect(sanitizeAuthoringCssBackground(colorPlusGradient)).toBe(colorPlusGradient);

  // Single-layer values STILL accepted byte-identically through the unchanged fast path
  // (they never enter the multi-layer branch — no top-level comma).
  expect(sanitizeAuthoringCssBackground("linear-gradient(90deg,#000,#fff)")).toBe(
    "linear-gradient(90deg,#000,#fff)"
  );
  expect(sanitizeAuthoringCssBackground("#0d9488")).toBe("#0d9488");
  expect(sanitizeAuthoringCssBackground("var(--color-primary)")).toBe("var(--color-primary)");
  expect(sanitizeAuthoringCssBackground("rgba(0,0,0,.5)")).toBe("rgba(0,0,0,.5)");
  // A single gradient is NOT a "multi-layer" value (needs >= 2 top-level layers).
  expect(isSafeAuthoringCssBackgroundLayers("linear-gradient(90deg,#000,#fff)")).toBe(false);
});

test("TASK-531: multi-layer background sanitizer rejects hostile constructs (XSS/mXSS corpus)", () => {
  const rejected = [
    // The original attack: a trailing url() beacon layer after a valid gradient head.
    "linear-gradient(#fff,#000), url(//evil/beacon)",
    // A bare url() alone (single layer, but url() rejected by the fast path too).
    "url(//evil/x)",
    // Other fetch-capable CSS image functions as trailing layers.
    'linear-gradient(#fff,#000), image-set("//evil/x" 1x)',
    "element(#foo), linear-gradient(#fff,#000)",
    "cross-fade(url(//evil/a), url(//evil/b)), linear-gradient(#fff,#000)",
    "image(//evil/x), linear-gradient(#fff,#000)",
    // Scriptable / navigable protocols as a layer.
    "javascript:alert(1), linear-gradient(#fff,#000)",
    "linear-gradient(#fff,#000), data:text/html,<script>",
    "vbscript:msgbox(1), linear-gradient(#fff,#000)",
    // At-rule / legacy IE injection vectors (whole-value tripwire).
    "@import url(evil); linear-gradient(#fff,#000)",
    "linear-gradient(#fff,#000), expression(alert(1))",
    "linear-gradient(#fff,#000), behavior:url(#default#foo)",
    "-moz-binding:url(//evil/x), linear-gradient(#fff,#000)",
    // A layer that is neither a safe color nor a safe gradient (fail-closed, whole value).
    "12 34, linear-gradient(#fff,#000)",
  ];
  for (const value of rejected) {
    expect(sanitizeAuthoringCssBackground(value)).toBeNull();
    expect(isSafeAuthoringCssBackgroundLayers(value)).toBe(false);
  }

  // Layer-count cap: 7 safe top-level layers is over PAGE_BG_MAX_LAYERS (6) ⇒ reject.
  const overCap = Array.from({ length: PAGE_BG_MAX_LAYERS + 1 }, () => "#000").join(", ");
  expect(sanitizeAuthoringCssBackground(overCap)).toBeNull();
  expect(isSafeAuthoringCssBackgroundLayers(overCap)).toBe(false);
  // Exactly at the cap is accepted (boundary).
  const atCap = Array.from({ length: PAGE_BG_MAX_LAYERS }, () => "#000").join(", ");
  expect(isSafeAuthoringCssBackgroundLayers(atCap)).toBe(true);
});

test("TASK-531: multi-layer split is paren-aware and the accept corpus is idempotent", () => {
  // A comma INSIDE a gradient's own paren group is NOT a top-level split point — the
  // value is treated as ONE safe layer (single-layer fast path), not shredded.
  const singleWithInnerCommas = "radial-gradient(circle, #8ee8ff, transparent 70%)";
  expect(sanitizeAuthoringCssBackground(singleWithInnerCommas)).toBe(singleWithInnerCommas);
  expect(isSafeAuthoringCssBackgroundLayers(singleWithInnerCommas)).toBe(false); // one layer

  // Idempotence over the accept corpus.
  for (const value of [
    "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)",
    "linear-gradient(180deg,#eaf3ff,#dfe9ff), radial-gradient(circle,#8ee8ff,transparent 70%)",
    "linear-gradient(90deg,#000,#fff)",
  ]) {
    const first = sanitizeAuthoringCssBackground(value);
    expect(first).not.toBeNull();
    expect(sanitizeAuthoringCssBackground(first as string)).toBe(first);
  }
});

test("gradient composer orders stops, clamps values, and rejects unsafe colors", () => {
  expect(
    composeAuthoringGradientCss({
      kind: "linear",
      angle: 999,
      stops: [
        { color: "var(--color-accent)", position: 100 },
        { color: "#0f172a", position: -10 },
        { color: "url(javascript:alert(1))", position: 50 },
      ],
    })
  ).toBe("linear-gradient(360deg, #0f172a 0%, var(--color-accent) 100%)");

  expect(
    composeAuthoringGradientCss({
      kind: "radial",
      angle: 45,
      stops: [
        { color: "#fff", position: 25 },
        { color: "var(--color-surface)", position: 75 },
      ],
    })
  ).toBe("radial-gradient(#fff 25%, var(--color-surface) 75%)");

  expect(
    composeAuthoringGradientCss({
      kind: "linear",
      angle: 45,
      stops: [{ color: "url(javascript:alert(1))", position: 0 }],
    })
  ).toBeNull();
});

test("authoring CSS string escaping prevents style element breakout", () => {
  const escaped = escapeAuthoringCssString('"></style><script>alert(1)</script>');
  expect(escaped).toContain('\\"');
  expect(escaped).toContain("\\3c /style\\3e ");
  expect(escaped).not.toContain("</style>");
  expect(escaped).not.toContain("<script>");
});

test("authoring rich text sanitizer keeps safe inline markup and rejects active content", () => {
  const sanitized = sanitizeAuthoringRichTextHtml(
    '<p>Hello <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a><script>alert(1)</script><a href="javascript:alert(1)">bad</a></p>'
  );

  expect(sanitized).toContain("<strong>rich</strong>");
  expect(sanitized).toContain('<a href="/safe" rel="nofollow noreferrer">safe</a>');
  expect(sanitized).toContain("bad");
  expect(sanitized).not.toContain("onclick");
  expect(sanitized).not.toContain("<script");
  expect(sanitized).not.toContain("alert(1)");
  expect(sanitized).not.toContain("javascript:");
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
