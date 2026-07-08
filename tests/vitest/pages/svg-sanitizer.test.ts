import { afterEach, describe, expect, test } from "vitest";

import {
  SVG_SANITIZER_DEFAULT_MAX_BYTES,
  sanitizeSvg,
} from "../../../core/services/pages/svgSanitizer";

// TASK-522-01-L06 — dependency-free SVG allowlist sanitizer. Asserts the
// reference-style house-line passes intact, every straightforward XSS vector +
// the mXSS / parser-differential corpus fails CLOSED (→ ""), the local-# ref
// enforcement covers quoted AND unquoted values, `style` is stripped, the byte
// cap is isomorphic (no Buffer), and the function is idempotent.

// A representative reference-style line-drawing SVG (matches the wow-site
// house-line shape: viewBox + <defs> + <linearGradient>/<stop> + a <path> whose
// stroke references a LOCAL #gradient — the local ref must survive).
const HOUSE_LINE = [
  '<svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">',
  "<defs>",
  '<linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="1">',
  '<stop offset="0" stop-color="#8ee8ff"/>',
  '<stop offset="1" stop-color="#c7b7ff"/>',
  "</linearGradient>",
  "</defs>",
  '<path class="house-line" d="M40 260 L200 60 L360 260" stroke="url(#lineGlow)" stroke-width="3" stroke-linecap="round"/>',
  "</svg>",
].join("");

describe("sanitizeSvg — reference + benign shapes pass", () => {
  test("the reference house-line passes intact (structure preserved)", () => {
    const out = sanitizeSvg(HOUSE_LINE);
    expect(out).not.toBe("");
    expect(out).toContain("<path");
    expect(out).toContain('stroke="url(#lineGlow)"');
    expect(out).toContain("<linearGradient");
    expect(out).toContain("<stop");
  });

  test("a plain <svg><circle/></svg> passes", () => {
    const out = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#000"/></svg>'
    );
    expect(out).toContain("<circle");
  });

  test("a local <use href='#glyph'/> passes (quoted local ref kept)", () => {
    const out = sanitizeSvg('<svg><use href="#glyph"/></svg>');
    expect(out).toContain("<use");
    expect(out).toContain('href="#glyph"');
  });

  test('an injected pathLength="1" is preserved (length-independent draw-in)', () => {
    const out = sanitizeSvg('<svg><path d="M0 0 L1 1" pathLength="1" stroke="#000"/></svg>');
    expect(out).toContain('pathLength="1"');
  });

  test("idempotent: sanitizeSvg(sanitizeSvg(x)) === sanitizeSvg(x)", () => {
    const once = sanitizeSvg(HOUSE_LINE);
    expect(sanitizeSvg(once)).toBe(once);
  });
});

describe("sanitizeSvg — straightforward XSS vectors fail closed", () => {
  const vectors: Array<[string, string]> = [
    ["onload handler", "<svg onload=alert(1)></svg>"],
    ["inline <script>", "<svg><script>alert(1)</script></svg>"],
    ["foreignObject", "<svg><foreignObject><body onload=alert(1)></body></foreignObject></svg>"],
    ["remote <image href>", '<svg><image href="http://evil/x.svg"/></svg>'],
    ["remote <use href>", '<svg><use href="http://evil#x"/></svg>'],
    ["javascript: url() in style", '<svg style="background:url(javascript:alert(1))"></svg>'],
    ["behavior in style", '<svg><rect style="behavior:url(#x)"/></svg>'],
    ["DOCTYPE/ENTITY XXE", '<!DOCTYPE svg [<!ENTITY x "y">]><svg></svg>'],
    ["non-svg root", "<div>not an svg</div>"],
  ];
  for (const [name, vector] of vectors) {
    test(`${name} → ""`, () => {
      expect(sanitizeSvg(vector)).toBe("");
    });
  }

  test("over-cap SVG → '' (byte cap enforced)", () => {
    const big = `<svg>${"<rect/>".repeat(6000)}</svg>`; // > 24 KiB
    expect(big.length).toBeGreaterThan(SVG_SANITIZER_DEFAULT_MAX_BYTES);
    expect(sanitizeSvg(big)).toBe("");
  });
});

describe("sanitizeSvg — mXSS / parser-differential corpus fails closed", () => {
  const vectors: Array<[string, string]> = [
    ["comment-hidden tag", "<svg><!--><script>alert(1)</script></svg>"],
    ["CDATA payload", "<svg><![CDATA[<script>alert(1)]]></svg>"],
    ["unbalanced-quote desync", '<svg><path fill="a onload=alert(1) /></svg>'],
    ["slash-separated handler (svg)", "<svg/onload=alert(1)></svg>"],
    ["slash-separated handler (rect)", "<svg><rect/onclick=alert(1)/></svg>"],
    ["duplicate/nested <svg> handler", "<svg><svg onload=alert(1)></svg></svg>"],
    ["namespace confusion (xhtml)", '<svg xmlns="http://www.w3.org/1999/xhtml"><rect/></svg>'],
    ["entity-encoded javascript:", '<svg><a href="&#106;avascript:alert(1)">x</a></svg>'],
  ];
  for (const [name, vector] of vectors) {
    test(`${name} → ""`, () => {
      expect(sanitizeSvg(vector)).toBe("");
    });
  }

  test("legitimate xmlns='...svg' and a no-xmlns inline SVG both PASS", () => {
    expect(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')).not.toBe("");
    expect(sanitizeSvg("<svg><rect/></svg>")).not.toBe("");
  });
});

describe("sanitizeSvg — comment/CDATA fail-closed pre-pass", () => {
  test("HTML comment present → ''", () => {
    expect(sanitizeSvg('<svg><!-- x --><path d="M0 0"/></svg>')).toBe("");
  });
  test("CDATA present → ''", () => {
    expect(sanitizeSvg("<svg><![CDATA[<path/>]]></svg>")).toBe("");
  });
});

describe("sanitizeSvg — UNQUOTED remote-ref on an allowlisted href tag", () => {
  const vectors = [
    "<svg><use href=http://evil#x/></svg>",
    "<svg><use href=//evil/x#y/></svg>",
    "<svg><use xlink:href=http://evil#x/></svg>",
  ];
  for (const vector of vectors) {
    test(`${vector} → "" (in-walk local-# rejects)`, () => {
      expect(sanitizeSvg(vector)).toBe("");
    });
  }
});

describe("sanitizeSvg — non-allowlisted tag with data:/remote href is STRIPPED, not ''", () => {
  test("<image href=data:...> → stripped <svg> carrying no data:/http/// /<image token", () => {
    const out = sanitizeSvg("<svg><image href=data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=/></svg>");
    // The tag-allowlist DROPS <image> before the local-# check; data: is not a
    // tripwire, so the result is a stripped <svg>, NOT "".
    expect(out).not.toBe("");
    expect(out).not.toContain("data:");
    expect(out).not.toContain("http");
    expect(out).not.toContain("//");
    expect(out).not.toContain("<image");
  });
});

describe("sanitizeSvg — style attribute is NOT allowlisted (layout-escape class)", () => {
  test("benign style is stripped (no style= token in output)", () => {
    const out = sanitizeSvg(
      '<svg style="position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#000"><rect/></svg>'
    );
    expect(out).not.toBe("");
    expect(out).not.toContain("style=");
    expect(out).not.toContain("position:fixed");
  });
  test("style carrying a tripwire token → '' (short-circuit)", () => {
    expect(sanitizeSvg('<svg style="background:url(javascript:alert(1))"><rect/></svg>')).toBe("");
    expect(sanitizeSvg('<svg><rect style="behavior:url(#x)"/></svg>')).toBe("");
  });
});

describe("sanitizeSvg — isomorphic byte count (no Buffer)", () => {
  const originalBuffer = (globalThis as { Buffer?: unknown }).Buffer;
  afterEach(() => {
    (globalThis as { Buffer?: unknown }).Buffer = originalBuffer;
  });
  test("runs with the Buffer global deleted (simulate browser bundle)", () => {
    delete (globalThis as { Buffer?: unknown }).Buffer;
    expect(() => sanitizeSvg(HOUSE_LINE)).not.toThrow();
    expect(sanitizeSvg("<svg><rect/></svg>")).not.toBe("");
  });
});
