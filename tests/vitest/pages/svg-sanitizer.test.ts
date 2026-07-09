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

  // TASK-535 residual-matcher regression: an UNBALANCED-quote tag desyncs the
  // quote-aware walk (it is never matched, so its raw `style` passes verbatim).
  // The post-walk residual matcher must be QUOTE-BALANCED so it does NOT strip
  // that never-walked tag from the residue — else the odd-quote / residual-`<`
  // fail-closed guard is defeated and a `position:fixed;inset:0;z-index:…`
  // clickjacking overlay leaks to the DOM. Multi-tag (dropped-tag-preamble) AND
  // single-tag variants must both fail closed.
  test("dropped-tag preamble + unbalanced-quote style desync → '' (multi-tag)", () => {
    expect(
      sanitizeSvg(
        '<svg><path <x><rect style="position:fixed;inset:0;z-index:2147483647;background:red" "/></svg>'
      )
    ).toBe("");
    expect(
      sanitizeSvg('<svg><g <y><rect style="opacity:0;position:fixed;inset:0" "/></svg>')
    ).toBe("");
  });
  test("unbalanced-quote style desync → '' (single-tag latent variant)", () => {
    expect(sanitizeSvg('<svg><rect style="x" "/></svg>')).toBe("");
  });
});

describe("sanitizeSvg — valueless/boolean attrs are stripped (TASK-535 allowlist invariant)", () => {
  test("a valueless allowlisted-name attr is dropped (only name=value pairs remain)", () => {
    const out = sanitizeSvg('<svg><rect fill-rule width="4" height="3"/></svg>');
    expect(out).not.toBe("");
    expect(out).toContain('width="4"');
    expect(out).toContain('height="3"');
    // `fill-rule` with NO value is not a name=value pair → must not survive.
    expect(out).not.toContain("fill-rule");
  });

  test("a valueless UNKNOWN attr is dropped", () => {
    const out = sanitizeSvg('<svg><rect autofocus width="4"/></svg>');
    expect(out).toBe('<svg><rect width="4"/></svg>');
  });

  test("a valueless would-be event attr (`ONLOAD`, no `=`) does not survive", () => {
    // With a trailing `=` this hits the on* tripwire; valueless it is simply not a
    // name=value pair and is dropped by the rebuilt attr list.
    const out = sanitizeSvg('<svg><rect ONLOAD width="4"/></svg>');
    expect(out).not.toContain("ONLOAD");
    expect(out).not.toContain("onload");
  });

  test("mixed valueless + valued attrs keep only the allowlisted valued ones", () => {
    const out = sanitizeSvg('<svg><rect fill-rule width="2" autofocus height="3" hidden/></svg>');
    expect(out).toBe('<svg><rect width="2" height="3"/></svg>');
  });
});

describe("sanitizeSvg — tag case normalized to canonical (TASK-535 no fragment leak)", () => {
  test("an UPPERCASE root <SVG> re-emits a wrapped <svg> (NOT an unwrapped fragment)", () => {
    const out = sanitizeSvg('<SVG><rect width="4"/></SVG>');
    expect(out).toBe('<svg><rect width="4"/></svg>');
    // regression guard: the old sanitizer leaked `<rect .../>` with no <svg> wrap.
    expect(out.startsWith("<svg")).toBe(true);
  });

  test("a mixed-case <Svg>/<Rect> normalizes to canonical lowercase", () => {
    expect(sanitizeSvg('<Svg><Rect width="2"/></Svg>')).toBe('<svg><rect width="2"/></svg>');
  });

  test("an UPPERCASE camelCase tag maps to its canonical spelling", () => {
    const out = sanitizeSvg(
      '<svg><FILTER><FEGAUSSIANBLUR stdDeviation="2"/></FILTER></svg>'
    );
    expect(out).toContain("<filter>");
    expect(out).toContain("<feGaussianBlur");
  });

  test("uppercase root does NOT weaken tripwires: <SVG ONLOAD=…> and <SVG><script> fail closed", () => {
    expect(sanitizeSvg("<SVG ONLOAD=alert(1)></SVG>")).toBe("");
    expect(sanitizeSvg("<SVG><script>alert(1)</script></SVG>")).toBe("");
  });
});

describe("sanitizeSvg — valid self-closing root <svg/> is accepted (TASK-535)", () => {
  test("a bare self-closing <svg/> passes", () => {
    expect(sanitizeSvg("<svg/>")).toBe("<svg/>");
  });

  test("a self-closing <svg …/> with allowlisted attrs passes; unknown attrs stripped", () => {
    expect(sanitizeSvg('<svg viewBox="0 0 10 10"/>')).toBe('<svg viewBox="0 0 10 10"/>');
    expect(sanitizeSvg('<svg autofocus width="4"/>')).toBe('<svg width="4"/>');
  });

  test("a self-closing root with a non-local href still fails closed", () => {
    expect(sanitizeSvg('<svg href="http://evil"/>')).toBe("");
  });

  test("a self-closing root followed by trailing markup fails closed (must be a LONE svg)", () => {
    expect(sanitizeSvg("<svg/><script>alert(1)</script>")).toBe("");
    expect(sanitizeSvg('<svg width="1"/><rect/>')).toBe("");
  });

  test("a self-closed root + junk + trailing <svg>…</svg> fails closed (fail-open regression guard)", () => {
    // A self-closed FIRST `<svg/>` whose trailing markup happens to end in
    // `</svg>` must NOT satisfy the `</svg>`-terminated form: the junk between
    // the self-closed root and the trailing svg would otherwise reach the DOM
    // as un-walked verbatim TEXT (defeats the "lone <svg>…</svg>" invariant).
    expect(sanitizeSvg("<svg/><rect/><svg></svg>")).toBe("");
    expect(sanitizeSvg('<svg/> style="position:fixed" <svg></svg>')).toBe("");
    expect(sanitizeSvg('<svg/><rect fill="red"/><svg></svg>')).toBe("");
    expect(sanitizeSvg('<svg/>> STYLE="x"viewBox=">"<svg/></svg>')).toBe("");
  });
});

describe("sanitizeSvg — text-container children handled consistently/fail-closed (TASK-535)", () => {
  test("an unknown child tag inside <text> is dropped; its text stays (consistent walk)", () => {
    expect(sanitizeSvg("<svg><text>hi<b>bold</b></text></svg>")).toBe(
      "<svg><text>hibold</text></svg>"
    );
  });

  test("an unknown child inside <desc> is dropped consistently", () => {
    expect(sanitizeSvg("<svg><desc>a<em>b</em>c</desc></svg>")).toBe("<svg><desc>abc</desc></svg>");
  });

  test("a <script> inside a text container still fails the WHOLE svg closed", () => {
    expect(sanitizeSvg("<svg><title>a<script>x</script></title></svg>")).toBe("");
    expect(sanitizeSvg("<svg><text><script>alert(1)</script></text></svg>")).toBe("");
  });

  test("an on* handler on a child inside a text container fails closed", () => {
    expect(sanitizeSvg('<svg><text><tspan onclick="x">y</tspan></text></svg>')).toBe("");
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
