import { expect, test } from "vitest";

import {
  createPageListItem,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PAGE_BG_MAX_LAYERS,
  PAGE_CSS_VALUE_MAX_LENGTH,
  composeAuthoringGradientCss,
  escapeAuthoringCssString,
  isSafeAuthoringCssBackgroundLayers,
  isSafeAuthoringCssColor,
  isSafeAuthoringCssLength,
  normalizeAuthoringSafeHref,
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringCssFontSize,
  sanitizeAuthoringGridTemplate,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
  sanitizeAuthoringRichTextHtml,
} from "../../../core/services/pages/pageAuthoringSanitizers";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";

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
  // A noncanonical color spelling deliberately becomes TASK-541 canonical bytes.
  expect(sanitizeAuthoringCssBackground("rgba(0,0,0,.5)")).toBe("rgba(0, 0, 0, 0.5)");
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
  // Exactly at the cap is accepted (boundary) for a VALID stack. A stack of plain
  // colors is no longer valid because a color may only be the single FINAL layer;
  // use a gradient stack instead (TASK-539-02-L01 split grammar).
  const atCap = Array.from(
    { length: PAGE_BG_MAX_LAYERS },
    () => "linear-gradient(90deg,#000,#fff)"
  ).join(", ");
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

// ── TASK-532 fluid font-size length grammar (Bundle B) ──
test("TASK-532 isSafeAuthoringCssLength accepts the numeric-unit-clamp grammar only", () => {
  const accepted = [
    "1.45rem",
    ".78rem",
    "12px",
    "100%",
    "5vw",
    "2.5em",
    "10ch",
    "clamp(2.6rem,5vw,4.4rem)",
    "min(4rem,8vw)",
    "max(1rem,2vh)",
    "clamp(.9rem,1.2vw,1.1rem)",
  ];
  for (const value of accepted) {
    expect(isSafeAuthoringCssLength(value)).toBe(true);
  }

  const rejected = [
    "url(x)",
    "url(javascript:1)",
    "expression(alert(1))",
    "1px;color:red",
    "12px}",
    "{font-size:0}",
    "/*x*/1rem",
    "calc(1rem + 2px)",
    "clamp(1rem,2rem)", // 2 args
    "clamp(1rem,2rem,3rem,4rem)", // 4 args
    "1rem 2rem",
    "red",
    "var(--x)",
    "1", // no unit
    "1deg",
    "1s",
    `${"9".repeat(65)}px`, // 67 chars > 64 cap
    "",
    "-",
    "clamp(url(x),1rem,2rem)",
    "\\",
    "<script>",
  ];
  for (const value of rejected) {
    expect(isSafeAuthoringCssLength(value)).toBe(false);
  }
});

test("TASK-532 sanitizeAuthoringCssFontSize returns the trimmed string on accept, null otherwise", () => {
  expect(sanitizeAuthoringCssFontSize("clamp(2.6rem,5vw,4.4rem)")).toBe("clamp(2.6rem,5vw,4.4rem)");
  expect(sanitizeAuthoringCssFontSize("  1.45rem  ")).toBe("1.45rem");
  expect(sanitizeAuthoringCssFontSize("expression(alert(1))")).toBeNull();
  expect(sanitizeAuthoringCssFontSize("1px;color:red")).toBeNull();
  expect(sanitizeAuthoringCssFontSize("")).toBeNull();
  // Non-string input fails closed.
  expect(sanitizeAuthoringCssFontSize(12 as unknown)).toBeNull();
  expect(sanitizeAuthoringCssFontSize(null)).toBeNull();
  expect(sanitizeAuthoringCssFontSize({ toString: () => "1rem" } as unknown)).toBeNull();
});

// ── TASK-533-01-L04 — restricted grid-template-columns sanitizer ─────────────
// The ONLY author STRING reaching a CSS VALUE position (section columnTemplate).
// Strict ALLOWLIST: accept a tiny grid-track grammar, REJECT everything else → null.
test("sanitizeAuthoringGridTemplate accepts the restricted grammar (round-trips normalized whitespace)", () => {
  for (const ok of [
    "1fr 1fr",
    "1.15fr .85fr", // flagship leading-dot ratio (.project-grid) — MUST survive
    "1fr 1.2fr", // intro-strip ratio (.intro-strip-grid)
    "minmax(0,1fr) minmax(420px,.9fr)", // flagship .hero-grid — bare `0` bound + leading-dot
    "minmax(0,1fr) 1fr",
    "auto 1fr",
    "repeat(3,1fr)",
    "1fr 2fr 1fr",
  ]) {
    expect(sanitizeAuthoringGridTemplate(ok)).toBe(ok.replace(/\s+/g, " "));
  }
  // Collapses internal whitespace runs to a single space.
  expect(sanitizeAuthoringGridTemplate("  1.15fr    .85fr  ")).toBe("1.15fr .85fr");
  // AUDIT REMEDIATION (2026-07-09): the CANONICAL spaced minmax()/repeat() form — exactly
  // how the reference `.hero-grid` and any devtools copy-paste writes it (a space after the
  // internal comma) — MUST be accepted and normalised to the no-inner-space canonical form,
  // NOT rejected. The old `raw.split(/\s+/)` shredded `minmax(0, 1fr)` into `minmax(0,`/
  // `1fr)` (neither a valid track) ⇒ silent whole-value omission.
  expect(sanitizeAuthoringGridTemplate("minmax(0, 1fr) minmax(420px, .9fr)")).toBe(
    "minmax(0,1fr) minmax(420px,.9fr)"
  );
  expect(sanitizeAuthoringGridTemplate("repeat(3, 1fr)")).toBe("repeat(3,1fr)");
  // Mixed spaced-function + bare tracks with irregular top-level whitespace also normalise.
  expect(sanitizeAuthoringGridTemplate("minmax(0, 1fr)   1fr")).toBe("minmax(0,1fr) 1fr");
  expect(sanitizeAuthoringGridTemplate("1.15fr minmax(200px, 1fr)")).toBe(
    "1.15fr minmax(200px,1fr)"
  );
});

test("sanitizeAuthoringGridTemplate rejects injection / out-of-grammar → null", () => {
  for (const bad of [
    "1fr;}body{display:none}",
    "url(evil)",
    "expression(alert(1))",
    "repeat(999,1fr)", // count > GRID_MAX_REPEAT
    "<b>",
    "calc(100% - 10px)",
    "1fr @import",
    "1fr /* x */ 1fr",
    "minmax(a,b)", // inner tokens fail GRID_LEN (closed grammar)
    "repeat(9,zz)", // inner token fails GRID_LEN
    "minmax(1fr)", // wrong arg count
    "1fr `x`",
    "1fr\\2f 1fr",
    "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", // 13 tracks > GRID_MAX_TRACKS
    "5", // bare unitless standalone track is not valid
    "",
    "   ",
    "a".repeat(300), // over-length
  ]) {
    expect(sanitizeAuthoringGridTemplate(bad), `expected reject: ${bad}`).toBeNull();
  }
  // Non-string inputs.
  expect(sanitizeAuthoringGridTemplate(42 as unknown)).toBeNull();
  expect(sanitizeAuthoringGridTemplate(null as unknown)).toBeNull();
  expect(sanitizeAuthoringGridTemplate(undefined as unknown)).toBeNull();
  expect(sanitizeAuthoringGridTemplate({} as unknown)).toBeNull();
});

// ── TASK-539-02-L01 — TASK-541 single color delegation ───────────────────────
test("TASK-539-02: color adapters delegate raw input to TASK-541 (seven tokens only)", () => {
  // Canonical colors pass through; noncanonical spellings become canonical bytes.
  expect(sanitizeAuthoringCssColor("#0D9488")).toBe("#0d9488");
  expect(sanitizeAuthoringCssColor("#0d9488")).toBe("#0d9488");
  expect(sanitizeAuthoringCssColor("rgba(13,148,136,0.35)")).toBe("rgba(13, 148, 136, 0.35)");
  expect(sanitizeAuthoringCssColor("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
  expect(sanitizeAuthoringCssColor("transparent")).toBe("transparent");
  // Exact seven-token acceptance.
  for (const token of [
    "var(--color-primary)",
    "var(--color-secondary)",
    "var(--color-accent)",
    "var(--color-bg)",
    "var(--color-surface)",
    "var(--color-text)",
    "var(--color-border)",
  ]) {
    expect(sanitizeAuthoringCssColor(token), token).toBe(token);
    expect(isSafeAuthoringCssColor(token), token).toBe(true);
  }
  // Every otherwise-valid TASK-541 token outside the seven rejects.
  for (const token of [
    "var(--color-danger)",
    "var(--color-extra)",
    "var(--color-accent-strong)",
    "var(--color-primary-soft)",
  ]) {
    expect(sanitizeAuthoringCssColor(token), token).toBeNull();
    expect(isSafeAuthoringCssColor(token), token).toBe(false);
  }
  // Named colors are outside the TASK-541 authoring grammar entirely.
  expect(sanitizeAuthoringCssColor("red")).toBeNull();
  expect(sanitizeAuthoringCssColor("white")).toBeNull();
  expect(isSafeAuthoringCssColor("red")).toBe(false);
  // Non-string input fails closed.
  expect(sanitizeAuthoringCssColor(12 as unknown)).toBeNull();
  expect(sanitizeAuthoringCssColor(null)).toBeNull();
});

test("TASK-539-02: raw color adapters honor TASK-541 cap before any preprocessing", () => {
  const terminal = "#abc";
  const exactCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;
  const capPlusOne = ` ${exactCap}`;
  expect(exactCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
  expect(capPlusOne).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);
  expect(sanitizeAuthoringCssColor(exactCap)).toBe(terminal);
  expect(sanitizeAuthoringCssColor(capPlusOne)).toBeNull();
});

// ── TASK-539-02-L01 — structured split background parser ─────────────────────
test("TASK-539-02: structured background parser returns exact image/color bytes", () => {
  const oneGradient = "linear-gradient(90deg,#000,#fff)";
  expect(parseAuthoringCssBackgroundPaint(oneGradient)).toEqual({
    image: oneGradient,
    color: null,
  });
  expect(parseAuthoringCssBackgroundPaint("#0d9488")).toEqual({ image: null, color: "#0d9488" });
  expect(parseAuthoringCssBackgroundPaint("var(--color-primary)")).toEqual({
    image: null,
    color: "var(--color-primary)",
  });
  // Split: image keeps the exact gradient bytes incl. internal spacing; the final
  // color is TASK-541 canonical.
  const split = "linear-gradient(90deg, #000, #fff), var(--color-primary)";
  expect(parseAuthoringCssBackgroundPaint(split)).toEqual({
    image: "linear-gradient(90deg, #000, #fff)",
    color: "var(--color-primary)",
  });
  expect(sanitizeAuthoringCssBackground(split)).toBe(
    "linear-gradient(90deg, #000, #fff), var(--color-primary)"
  );
  // image is byte-identical regardless of the final color spelling.
  const head = "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%)";
  expect(parseAuthoringCssBackgroundPaint(`${head}, #FFF`)).toEqual({ image: head, color: "#fff" });
  expect(parseAuthoringCssBackgroundPaint(`${head}, #FFFFFF`)).toEqual({
    image: head,
    color: "#ffffff",
  });
  expect(parseAuthoringCssBackgroundPaint(`${head}, rgba(255,255,255,1)`)).toEqual({
    image: head,
    color: "rgba(255, 255, 255, 1)",
  });
  // Two gradients: image spans the exact separators (whole outer-trimmed input).
  const two = `${head}, linear-gradient(145deg,#0f1720,#1b2733)`;
  expect(parseAuthoringCssBackgroundPaint(two)).toEqual({ image: two, color: null });
  expect(sanitizeAuthoringCssBackground(two)).toBe(two);
  // Six-gradient stack at the cap parses and sanitizes byte-identically.
  const six = Array.from({ length: PAGE_BG_MAX_LAYERS }, () => oneGradient).join(", ");
  expect(parseAuthoringCssBackgroundPaint(six)).toEqual({ image: six, color: null });
  expect(sanitizeAuthoringCssBackground(six)).toBe(six);
  expect(isSafeAuthoringCssBackgroundLayers(six)).toBe(true);
  // Outer ASCII spaces are excluded from image; inner gradient spacing is preserved.
  expect(parseAuthoringCssBackgroundPaint(` ${oneGradient} `)).toEqual({
    image: oneGradient,
    color: null,
  });
});

test("TASK-539-02: legacy cardinality — single forms parse but the layer predicate needs 2..max", () => {
  const oneColor = "#0d9488";
  const oneGradient = "linear-gradient(90deg,#000,#fff)";
  expect(parseAuthoringCssBackgroundPaint(oneColor)).not.toBeNull();
  expect(sanitizeAuthoringCssBackground(oneColor)).toBe("#0d9488");
  expect(isSafeAuthoringCssBackgroundLayers(oneColor)).toBe(false);
  expect(parseAuthoringCssBackgroundPaint(oneGradient)).not.toBeNull();
  expect(sanitizeAuthoringCssBackground(oneGradient)).toBe(oneGradient);
  expect(isSafeAuthoringCssBackgroundLayers(oneGradient)).toBe(false);
  // Valid two-layer stack is true; one above the cap is false.
  const two = `${oneGradient}, radial-gradient(circle,#000,#fff)`;
  expect(isSafeAuthoringCssBackgroundLayers(two)).toBe(true);
  const atCap = Array.from({ length: PAGE_BG_MAX_LAYERS }, () => oneGradient).join(", ");
  expect(isSafeAuthoringCssBackgroundLayers(atCap)).toBe(true);
  const overCap = `${atCap}, ${oneGradient}`;
  expect(isSafeAuthoringCssBackgroundLayers(overCap)).toBe(false);
  expect(sanitizeAuthoringCssBackground(overCap)).toBeNull();
});

test("TASK-539-02: background rejects early colors, two colors, images, tripwires, imbalance, empty/over-cap layers", () => {
  const oneGradient = "linear-gradient(90deg,#000,#fff)";
  const rejected = [
    // Color before / between gradients and multiple colors.
    "#000, linear-gradient(90deg,#000,#fff)",
    "linear-gradient(90deg,#000,#fff), #fff, radial-gradient(circle,#000,#fff)",
    "#000, #fff",
    "var(--color-primary), linear-gradient(90deg,#000,#fff)",
    // Non-gradient image/fetch functions (whole-value tripwire first).
    "url(//evil/x)",
    'image-set("//evil/x" 1x), linear-gradient(90deg,#000,#fff)',
    "element(#foo), linear-gradient(90deg,#000,#fff)",
    "cross-fade(url(//evil/a), url(//evil/b)), linear-gradient(90deg,#000,#fff)",
    "image(//evil/x), linear-gradient(90deg,#000,#fff)",
    // Scriptable protocols / at-rules / functions (tripwire).
    "javascript:alert(1), linear-gradient(90deg,#000,#fff)",
    "linear-gradient(90deg,#000,#fff), data:text/html,<script>",
    "vbscript:msgbox(1), linear-gradient(90deg,#000,#fff)",
    "@import url(evil); linear-gradient(90deg,#000,#fff)",
    "linear-gradient(90deg,#000,#fff), expression(alert(1))",
    "linear-gradient(90deg,#000,#fff), behavior:url(#default#foo)",
    "-moz-binding:url(//evil/x), linear-gradient(90deg,#000,#fff)",
    // A layer that is neither a safe gradient nor a safe color.
    "12 34, linear-gradient(90deg,#000,#fff)",
    // Imbalance (unclosed / unmatched close paren).
    "linear-gradient(90deg,#000,#fff",
    "radial-gradient(circle,#000,#fff)), linear-gradient(90deg,#000,#fff)",
    // Empty layers.
    "linear-gradient(90deg,#000,#fff), , radial-gradient(circle,#000,#fff)",
    "linear-gradient(90deg,#000,#fff),,",
    // Whole-value overflow (untouched length > PAGE_CSS_VALUE_MAX_LENGTH).
    `${" ".repeat(PAGE_CSS_VALUE_MAX_LENGTH + 1)}${oneGradient}`,
  ];
  for (const value of rejected) {
    expect(sanitizeAuthoringCssBackground(value), `sanitize: ${JSON.stringify(value)}`).toBeNull();
    expect(parseAuthoringCssBackgroundPaint(value), `parse: ${JSON.stringify(value)}`).toBeNull();
  }
  // A non-Page token as the final color rejects (the token filter applies to the split).
  expect(sanitizeAuthoringCssBackground(`${oneGradient}, var(--color-danger)`)).toBeNull();
  // Layer overflow: 7 safe layers reject.
  const overCap = Array.from({ length: PAGE_BG_MAX_LAYERS + 1 }, () => "#000").join(", ");
  expect(sanitizeAuthoringCssBackground(overCap)).toBeNull();
});

test("TASK-539-02: raw background guard rejects every C0/C1 control and non-ASCII whitespace before normalization", () => {
  const oneGradient = "linear-gradient(90deg,#000,#fff)";
  // Outer edge, top-level separator, gradient interior, and final color slice.
  const placements = [
    (raw: string) => `${raw}${oneGradient}`,
    (raw: string) => `${oneGradient}${raw}`,
    (raw: string) => `${oneGradient},${raw}#fff`,
    (raw: string) => `linear-gradient(90deg,${raw}#000,#fff)`,
    (raw: string) => `${oneGradient}, ${raw}#fff`,
  ];
  const forbidden = [
    "\u0000",
    "\u0009",
    "\u000a",
    "\u000b",
    "\u000c",
    "\u000d",
    "\u001f", // C0
    "\u007f", // DEL
    "\u0080",
    "\u0085",
    "\u009f", // C1
    "\u00a0",
    "\u1680",
    "\u2000",
    "\u200a",
    "\u2028",
    "\u2029",
    "\u202f",
    "\u205f",
    "\u3000",
    "\ufeff", // BOM (explicit; not covered by Unicode White_Space)
  ];
  for (const cp of forbidden) {
    for (const place of placements) {
      expect(
        sanitizeAuthoringCssBackground(place(cp)),
        `sanitize ${JSON.stringify(cp)}`
      ).toBeNull();
      expect(parseAuthoringCssBackgroundPaint(place(cp)), `parse ${JSON.stringify(cp)}`).toBeNull();
    }
  }
  // ASCII space alone remains legal everywhere and canonicalizes deterministically.
  expect(sanitizeAuthoringCssBackground(` ${oneGradient} `)).toBe(oneGradient);
  expect(sanitizeAuthoringCssBackground(`${oneGradient}, #fff`)).toBe(`${oneGradient}, #fff`);
});

test("TASK-539-02: final color layer honors TASK-541 raw cap through the untouched slice", () => {
  const head = "linear-gradient(90deg,#000,#fff)";
  const atCap = `${head},${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - "#abc".length)}#abc`;
  expect(atCap.length).toBeLessThanOrEqual(PAGE_CSS_VALUE_MAX_LENGTH);
  expect(parseAuthoringCssBackgroundPaint(atCap)).toEqual({ image: head, color: "#abc" });
  const capPlusOne = `${head},${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - "#abc".length + 1)}#abc`;
  expect(parseAuthoringCssBackgroundPaint(capPlusOne)).toBeNull();
  expect(sanitizeAuthoringCssBackground(capPlusOne)).toBeNull();
});

// ── TASK-539-02-L01 — zero-only unitful grid grammar ─────────────────────────
test("TASK-539-02: grid accepts zero-only unitless and unitful lengths at every nested position", () => {
  const accepted: ReadonlyArray<readonly [input: string, canonical: string]> = [
    ["0", "0"],
    ["0 1fr", "0 1fr"],
    ["0.0", "0.0"],
    ["0.00", "0.00"],
    [".0", ".0"],
    ["0px", "0px"],
    ["0.0px", "0.0px"],
    [".85fr", ".85fr"],
    ["50%", "50%"],
    ["1rem", "1rem"],
    ["1em", "1em"],
    ["auto", "auto"],
    ["auto 1fr", "auto 1fr"],
    ["minmax(0,1fr)", "minmax(0,1fr)"],
    ["minmax(0.0,1fr)", "minmax(0.0,1fr)"],
    ["minmax(.0,1fr)", "minmax(.0,1fr)"],
    ["minmax(auto,1fr)", "minmax(auto,1fr)"],
    ["repeat(1,1fr)", "repeat(1,1fr)"],
    ["repeat(12,1fr)", "repeat(12,1fr)"],
    ["repeat(3,0)", "repeat(3,0)"],
    ["repeat(3,0.0)", "repeat(3,0.0)"],
    ["minmax(0, 1fr) repeat(3, 1fr)", "minmax(0,1fr) repeat(3,1fr)"],
    ["  0  1fr ", "0 1fr"],
    ["1fr 1.2fr", "1fr 1.2fr"],
    ["1.15fr .85fr", "1.15fr .85fr"],
  ];
  for (const [input, canonical] of accepted) {
    expect(sanitizeAuthoringGridTemplate(input), JSON.stringify(input)).toBe(canonical);
    // Deterministic second pass (idempotence).
    expect(sanitizeAuthoringGridTemplate(canonical)).toBe(canonical);
  }
});

test("TASK-539-02: grid rejects nonzero unitless, negatives, bare/unsupported units, nesting, multiple repeat tracks", () => {
  const rejected = [
    "5",
    "1.5",
    "0.5",
    "minmax(5,1fr)",
    "minmax(1fr,5)",
    "repeat(3,2)",
    "repeat(3,0.5)",
    "-1fr",
    "-5",
    "-0",
    "px",
    "fr",
    "%",
    "rem",
    "1vw",
    "1vh",
    "1ch",
    "1s",
    "1deg",
    "1FR",
    "MINMAX(0,1fr)",
    "AUTO",
    "repeat(3,minmax(0,1fr))",
    "minmax(minmax(0,1fr),1fr)",
    "repeat(3,1fr 2fr)",
    "repeat(3,1fr,2fr)",
    "repeat(0,1fr)",
    "repeat(13,1fr)",
    "repeat(999,1fr)",
    "5 1fr",
    "1fr 5",
    "minmax(0, 1fr) 5",
    "0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr",
  ];
  for (const value of rejected) {
    expect(sanitizeAuthoringGridTemplate(value), JSON.stringify(value)).toBeNull();
  }
});

test("TASK-539-02: grid raw guard rejects controls and non-ASCII whitespace before trim/tokenization", () => {
  const placements = [
    (raw: string) => `${raw}1fr 1fr`, // leading edge (trim would erase these)
    (raw: string) => `1fr 1fr${raw}`, // trailing edge
    (raw: string) => `1fr${raw}1fr`, // between tracks
    (raw: string) => `minmax(0,${raw}1fr)`, // function interior
    (raw: string) => `minmax(0${raw},1fr)`, // comma-adjacent inside function
  ];
  const forbidden = [
    "\u0000",
    "\u0009",
    "\u000a",
    "\u000b",
    "\u000c",
    "\u000d",
    "\u001f", // C0
    "\u007f", // DEL
    "\u0080",
    "\u0085",
    "\u009f", // C1
    "\u00a0",
    "\u1680",
    "\u2000",
    "\u200a",
    "\u2028",
    "\u2029",
    "\u202f",
    "\u205f",
    "\u3000",
    "\ufeff", // BOM
  ];
  for (const cp of forbidden) {
    for (const place of placements) {
      expect(sanitizeAuthoringGridTemplate(place(cp)), JSON.stringify(cp)).toBeNull();
    }
  }
  // ASCII space alone is legal and canonicalizes deterministically (control cases).
  expect(sanitizeAuthoringGridTemplate(" 1fr 1fr ")).toBe("1fr 1fr");
  expect(sanitizeAuthoringGridTemplate("minmax(0, 1fr)")).toBe("minmax(0,1fr)");
});
