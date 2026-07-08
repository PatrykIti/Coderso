# TASK-522-01-L02: Dependency-Free SVG Allowlist Sanitizer

# FileName: TASK-522-01-L02-SVG-Sanitizer.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Security / Site Render
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates NEW `core/services/pages/svgSanitizer.ts`: a dependency-free
allowlist sanitizer used at BOTH write (522-01-L01 normalize) and render (522-02-L01)
for the `customSvg` block's `svg` prop. Prefer an ALLOWLIST of SVG tags/attributes
over a denylist; layer fail-closed tripwires on top (defence in depth). NO npm
dependency (no DOMPurify, no jsdom — SSR has no DOM).

## Grounded anchors

- No SVG sanitizer exists in the page path today (grep confirms). Precedent for the
  "validation IS the security boundary" discipline: 520-01-L02 custom-box-shadow
  validator, `readSafeColor` (`pageDocumentV2.ts:1516`), `resolveAnimatedIconName`
  (521-04, `hasOwnProperty`/`Set` allowlist — never bare bracket lookup on a
  prototype-carrying map).
- Reference SVG the sanitizer MUST pass intact: the hero `house-line`
  (`_docs/projekty-domow-wow-site/index.html:52-66`) — `<svg viewBox>` with `<defs>`,
  `<linearGradient>`/`<stop>`, and `<path class stroke="url(#lineGlow)" …>` (a LOCAL
  `#` gradient ref — must survive; a remote `href` must not).

## Implementation pseudocode

```ts
// core/services/pages/svgSanitizer.ts  — no imports, pure string logic.

const ALLOWED_TAGS = new Set([
  "svg","g","defs","path","rect","circle","ellipse","line","polyline","polygon",
  "text","tspan","linearGradient","radialGradient","stop","clipPath","mask",
  "pattern","use","symbol","title","desc","marker","filter","feGaussianBlur",
  "feOffset","feMerge","feMergeNode","feColorMatrix","feBlend","feFlood","feComposite",
]);
const ALLOWED_ATTRS = new Set([
  // geometry / structural
  "d","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry","points","width","height",
  "pathLength",   // length-independent draw-in (522-01-L04): renderer may inject pathLength="1"
  "viewBox","preserveAspectRatio","transform","gradientUnits","gradientTransform",
  "patternUnits","clipPathUnits","maskUnits","offset","spreadMethod","markerWidth",
  "markerHeight","refX","refY","orient","result","in","in2","stdDeviation","dx","dy",
  "values","mode","operator","type",
  // presentation
  "fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","stroke-dasharray",
  "stroke-dashoffset","stroke-miterlimit","opacity","fill-opacity","stroke-opacity",
  "fill-rule","clip-rule","stop-color","stop-opacity","color","class","id","role",
  "aria-hidden","xmlns","xmlns:xlink","text-anchor","font-size","font-family",
  "font-weight","letter-spacing","clip-path","mask","filter","style",
]);
const TRIPWIRES: RegExp[] = [
  /<\s*script/i, /<\s*foreignObject/i, /<!\s*ENTITY/i, /<!\s*DOCTYPE/i,
  /\son[a-z]+\s*=/i,                       // on* event attributes
  /javascript:/i, /vbscript:/i, /data:\s*text\/html/i,
  /expression\s*\(/i, /behavior\s*:/i, /-moz-binding/i,
];

export function sanitizeSvg(raw: string, maxBytes = 24576): string {
  if (typeof raw !== "string") return "";
  const src = raw.trim();
  if (!src) return "";
  // ISOMORPHIC byte count — sanitizeSvg runs at render inside renderPageBlockContent
  // (522-02-L01), which the CLIENT PageAuthoringCanvas also drives (Hard Invariant 8),
  // and Vite does NOT polyfill `Buffer` in the browser bundle. Use TextEncoder (Node
  // AND browser) — NEVER Buffer.byteLength (ReferenceError in the builder canvas):
  if (new TextEncoder().encode(src).length > maxBytes) return "";    // size cap
  if (!/^<svg[\s>]/i.test(src) || !/<\/svg>\s*$/i.test(src)) return ""; // must be a lone <svg>…</svg>
  for (const rx of TRIPWIRES) if (rx.test(src)) return "";           // fail-closed tripwires
  // href/xlink:href MUST be a local #fragment (block remote <use>/refs):
  const hrefRe = /(?:xlink:href|href)\s*=\s*(['"])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(src))) { if (!m[2].trim().startsWith("#")) return ""; }
  // url(...) in any attribute/style MUST reference a local #fragment:
  const urlRe = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  while ((m = urlRe.exec(src))) { if (!m[2].trim().startsWith("#")) return ""; }

  // Allowlist walk: scan every tag; drop disallowed tags AND disallowed attrs.
  const out = src.replace(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (full, slash, tag, attrs) => {
      if (!ALLOWED_TAGS.has(tag)) return "";                          // drop tag (open+close handled by pass)
      if (slash) return `</${tag}>`;
      const kept = String(attrs).replace(
        /([a-zA-Z_:][-\w:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g,
        (attrFull, name) => (ALLOWED_ATTRS.has(name) ? attrFull : ""));
      return `<${tag}${kept}>`;
    });
  // Post-pass: strip any now-empty style="" residue is harmless; re-run tripwires as
  // a paranoid final check (defence in depth) — return "" if anything slipped.
  for (const rx of TRIPWIRES) if (rx.test(out)) return "";
  return out.trim();
}
```

**Design notes.** Allowlist-first (unknown tag/attr dropped), fail-closed tripwires
layered on top; the whole SVG is REJECTED (→ `""`, neutral fallback) rather than
partially stripped when a tripwire fires — safer than trusting a half-parse. The
regex tag-walk is intentionally conservative: it drops disallowed tags entirely and
disallowed attrs per-tag; a malformed/ambiguous input that does not cleanly match the
lone-`<svg>` shape returns `""`. `style` attribute is allowlisted but the `expression(`
/ `behavior:` / `url(non-#)` tripwires + the `url()` local-only check neutralize its
injection vectors. **The dropped-tag replacement leaves the closing tag as a bare
`</tag>` only when the OPENING tag was allowed** — for a dropped opening tag the
matching close also fails `ALLOWED_TAGS`… (it is allowed, so both drop consistently);
tags NOT in the allowlist drop both their open and close occurrences. Verify with the
XSS-vector suite (L06 / 522-02-L03) that no residual executable token survives.

## Regression-test shape (delegated to 522-01-L06 + 522-02-L03, asserted here)

- The reference `house-line` SVG passes UNCHANGED in structure (keeps `<path>`,
  `stroke="url(#lineGlow)"`, `<linearGradient>`); a plain `<svg><circle/></svg>`
  passes.
- Each straightforward vector returns `""`: `<svg onload=alert(1)>`,
  `<svg><script>…</script></svg>`,
  `<svg><foreignObject><body onload=…></foreignObject></svg>`,
  `<svg><image href="http://evil/x.svg"/></svg>`,
  `<svg><use href="http://evil#x"/></svg>`,
  `<svg style="background:url(javascript:alert(1))">`,
  `<svg><rect style="behavior:url(#x)"/></svg>`, `<!DOCTYPE svg [<!ENTITY …>]`,
  a 30 KiB SVG (> cap), a non-`<svg>` string (`<div>…`).
- **mXSS / parser-differential corpus (a regex sanitizer's true risk — required):**
  comment-hidden tags (`<svg><!--><script>alert(1)</script></svg>`),
  CDATA-wrapped payloads (`<svg><![CDATA[<script>…]]></svg>`),
  unbalanced-quote desync (`<svg><path fill="a onload=alert(1) />`),
  slash-separated handlers (`<svg/onload=alert(1)>`, `<rect/onclick=alert(1)/>`),
  duplicate/nested `<svg>` (`<svg><svg onload=…>`), `xmlns`-switch attempts,
  entity-encoded `javascript:`/`#` (`&#106;avascript:`, `href="&#35;x"`). Each MUST
  yield `""`, AND (asserted in 522-02-L03) the `renderToString` output must contain no
  `on`-handler / `<script` / `javascript:` token. Document that the allowlist
  attr-walk is the TRUE security boundary; the tripwires are advisory defence-in-depth.
- **Byte count is ISOMORPHIC** (`TextEncoder`, no `Buffer`) — see the client-render
  test in 522-02-L03 (a `customSvg` block renders through `renderPageBlockContent`
  with no Node `Buffer` global, no `ReferenceError`).
- Idempotent: `sanitizeSvg(sanitizeSvg(x)) === sanitizeSvg(x)`.
- **Lane:** Vitest `tests/vitest/pages/svg-sanitizer.test.ts`.

## Hard Invariants

1. Allowlist tags + attrs; unknown dropped; tripwires fail-closed → `""`. The
   allowlist attr-walk is the security boundary; tripwires are advisory.
2. `href`/`xlink:href`/`url()` local `#` only; no remote/JS/data-html refs.
3. Byte cap via `TextEncoder` (ISOMORPHIC — never `Buffer`, undefined in the browser
   bundle); must be a lone `<svg>…</svg>`; no dependency; runs SSR AND in the browser
   builder canvas (pure string, no DOM).
4. Used at BOTH write (L01) and render (522-02-L01) — defence in depth.
5. mXSS/parser-differential corpus asserted neutralized (comments, CDATA,
   unbalanced-quote desync, slash-handlers, nested/duplicate `<svg>`, entity-encoded).
</content>
