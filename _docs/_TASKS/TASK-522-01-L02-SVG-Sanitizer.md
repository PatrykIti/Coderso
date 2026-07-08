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
  validator, `readSafeColor` (`pageDocumentV2.ts:1643`), `resolveAnimatedIconName`
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
  "font-weight","letter-spacing","clip-path","mask","filter",
  // NOTE: `style` is DELIBERATELY NOT allowlisted. The sanitized string is injected via
  // dangerouslySetInnerHTML into an in-flow <span> (522-02-L01); a raw `style` attr is
  // author CSS reaching the DOM and could carry `position:fixed;inset:0;z-index:…` that
  // ESCAPES the span to overlay page chrome (clickjacking/phishing) — violating the
  // parent Security Contract §2 ("Raw stored input never reaches CSS"). All visual
  // styling the reference needs is expressible via the presentation attrs above
  // (fill/stroke/opacity/transform/…); the reference house-line SVG uses NO inline style.
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
  // FAIL-CLOSED PRE-PASS: HTML comments <!--…--> and CDATA <![CDATA[…]]> are NOT matched
  // by the tag-walk regex below, so left in place they survive VERBATIM into `out` guarded
  // only by the (advisory) tripwire re-pass. Reject the whole SVG on their presence — they
  // are exactly the parser-differential constructs the walk cannot see, and the reference
  // house-line contains neither (loss-free). This makes the walk the boundary for all
  // regex-matchable markup and closes the un-walked comment/CDATA paths fail-closed:
  if (/<!--|<!\[CDATA\[/i.test(src)) return "";
  for (const rx of TRIPWIRES) if (rx.test(src)) return "";           // fail-closed tripwires
  // FAST pre-pass (defence in depth, QUOTED values): href/xlink:href/url() that carry a
  // quoted non-local value reject immediately. This is NOT the authoritative check — an
  // UNQUOTED value (e.g. `<use href=http://evil#x/>`) has no quote delimiter so it does
  // NOT match here; the AUTHORITATIVE local-# enforcement lives INSIDE the allowlist
  // attr-walk below (which sees quoted AND unquoted values). Do not rely on this pre-pass
  // alone (finding-9: the quote-requiring pre-pass let unquoted remote <use href>/data:
  // through to the DOM):
  const hrefRe = /(?:xlink:href|href)\s*=\s*(['"])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(src))) { if (!m[2].trim().startsWith("#")) return ""; }
  const urlRe = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  while ((m = urlRe.exec(src))) { if (!m[2].trim().startsWith("#")) return ""; }
  // xmlns/xmlns:xlink VALUES must be the SVG / xlink namespaces — reject any other
  // (namespace-confusion mXSS, e.g. xmlns="http://www.w3.org/1999/xhtml"). This is an
  // EXPLICIT guard, not incidental tag-filtering. A standalone pasted SVG legitimately
  // carries xmlns="http://www.w3.org/2000/svg"; the inline house-line has no xmlns.
  const ALLOWED_NS = new Set([
    "http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink",
  ]);
  const nsRe = /xmlns(?::xlink)?\s*=\s*(['"])(.*?)\1/gi;
  while ((m = nsRe.exec(src))) { if (!ALLOWED_NS.has(m[2].trim())) return ""; }

  // Allowlist walk: scan every tag; drop disallowed tags AND disallowed attrs, AND
  // enforce href/xlink:href/url() LOCALITY here (quoted OR unquoted) — the authoritative
  // check. A remote/non-local ref sets `rejected` ⇒ the WHOLE SVG fails closed to "" (same
  // fail-closed posture as the pre-pass; consistent with Hard Invariant 2 "local # only").
  let rejected = false;
  const out = src.replace(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (full, slash, tag, attrs) => {
      if (!ALLOWED_TAGS.has(tag)) return "";                          // drop tag (open+close handled by pass)
      if (slash) return `</${tag}>`;
      const kept = String(attrs).replace(
        /([a-zA-Z_:][-\w:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g,
        (attrFull, name, rawVal) => {
          if (!ALLOWED_ATTRS.has(name)) return "";                    // drop unknown attr
          const val = String(rawVal).replace(/^["']|["']$/g, "").trim(); // unquote (quoted OR bare)
          // href/xlink:href: LOCAL #fragment ONLY — blocks unquoted remote <use href=…>,
          // `data:image/svg+xml`, `//host`, `http(s):`, etc. (all fail startsWith("#")):
          if ((name === "href" || name === "xlink:href") && !val.startsWith("#")) { rejected = true; return ""; }
          // any url(...) inside the value (e.g. fill="url(#g)" ok; url(http…) not):
          val.replace(/url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi, (_u, _q, target) => {
            if (!String(target).trim().startsWith("#")) rejected = true; return _u; });
          return attrFull;
        });
      return `<${tag}${kept}>`;
    });
  if (rejected) return "";                                            // non-local ref found in walk
  // FAIL-CLOSED POST-WALK residual check: after the walk, `out` should contain ONLY
  // re-emitted allowlisted tags (each `<tag…>`/`</tag>` the callback produced) plus text.
  // Any residual raw `<` that is NOT such a re-emitted tag — dropped-tag TEXT content, a
  // quote-desync fragment the tag-regex could not fully consume, or an unbalanced quote —
  // means un-walked markup would reach the DOM. Fail closed so nothing un-walked survives:
  //   strip every valid re-emitted allowlisted tag, then if a bare `<` or an odd number of
  //   unescaped quotes remains, return "". (Implement as: remove /<\/?(allowlisted)(\s[^<>]*)?>/g
  //   from a copy of `out`; if the residue still matches /</ or has an unbalanced ["'] count,
  //   return "".)
  const residue = out.replace(TAG_REEMIT_RE, "");   // TAG_REEMIT_RE = allowlisted-tag matcher
  if (residue.includes("<") || (residue.match(/["']/g)?.length ?? 0) % 2 !== 0) return "";
  // Post-pass: any dropped attrs (style, unknown) are already gone from `out`; re-run
  // tripwires as a paranoid final check (defence in depth) — return "" if anything slipped.
  for (const rx of TRIPWIRES) if (rx.test(out)) return "";
  return out.trim();
}
```

**Design notes.** Allowlist-first (unknown tag/attr dropped), bracketed by two
fail-closed passes that cover exactly the constructs the tag-walk regex CANNOT match:
(a) a PRE-PASS that rejects the whole SVG on any `<!--…-->` comment or `<![CDATA[…]]>`
section (these would otherwise pass through verbatim, guarded only by advisory
tripwires), and (b) a POST-WALK residual check that returns `""` if any raw `<` that is
not a re-emitted allowlisted tag — dropped-tag TEXT, quote-desync fragments — or an
unbalanced quote survives. With (a)+(b) in place, the allowlist attr-walk is the
boundary for all regex-matchable markup and NO un-walked markup ever reaches
`dangerouslySetInnerHTML`; the tripwires are then genuinely advisory defence-in-depth
rather than the sole boundary for any path. The whole SVG is REJECTED (→ `""`, neutral
fallback) rather than partially stripped when a tripwire fires — safer than trusting a
half-parse. The
regex tag-walk is intentionally conservative: it drops disallowed tags entirely and
disallowed attrs per-tag; a malformed/ambiguous input that does not cleanly match the
lone-`<svg>` shape returns `""`. The `style` attribute is NOT allowlisted (dropped by
the attr-walk) — this closes the raw-CSS-into-DOM class (e.g. `position:fixed;inset:0`
layout-escape/clickjacking) at the source rather than trying to filter declarations;
all visual styling is expressed via the allowlisted presentation attrs. `xmlns`/
`xmlns:xlink` VALUES are constrained to the SVG/xlink namespaces (explicit
namespace-confusion guard, above). **The dropped-tag replacement leaves the closing tag as a bare
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
  duplicate/nested `<svg>` (`<svg><svg onload=…>`),
  namespace-confusion (`<svg xmlns="http://www.w3.org/1999/xhtml"><rect/></svg>` — a
  non-SVG `xmlns` VALUE ⇒ REJECTED to `""` by the explicit namespace guard, NOT merely
  incidental tag-filtering; a legitimate `xmlns="http://www.w3.org/2000/svg"` and a
  no-`xmlns` inline SVG both still PASS),
  entity-encoded `javascript:`/`#` (`&#106;avascript:`, `href="&#35;x"`). Each attack MUST
  yield `""` (comment/CDATA via the fail-closed pre-pass; unbalanced-quote/dropped-tag-text
  via the post-walk residual check; the rest via tripwires/walk), AND (asserted in
  522-02-L03) the `renderToString` output must contain no `on`-handler / `<script` /
  `javascript:` token. With the fail-closed pre-pass (comments/CDATA) + post-walk
  residual-`<`/unbalanced-quote check in place, the allowlist attr-walk IS the boundary for
  every regex-matchable construct and the pre/post passes fail-close the constructs the
  regex cannot match; the tripwires then remain advisory defence-in-depth, not the sole
  boundary for any path.
- **UNQUOTED / remote-ref parser-differential (finding-9 gap — required):** the
  quote-requiring pre-pass alone let these through; for ALLOWLISTED href-bearing tags the
  in-walk locality check MUST reject each to `""`: `<svg><use href=http://evil#x/></svg>`,
  `<svg><use href=//evil/x#y/></svg>`, `<svg><use xlink:href=http://evil#x/></svg>`; and
  a QUOTED control that must still pass: `<svg><use href="#glyph"/></svg>` (local — kept).
- **NON-ALLOWLISTED tag with a remote/`data:` href (`<image>`, `<a>`) — asserts a
  STRIPPED `<svg>`, NOT `""`:** `<svg><image href=data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=/></svg>`
  is neutralized by the **tag-allowlist DROPPING the non-allowlisted `<image>` tag**
  (`image ∉ ALLOWED_TAGS`), which fires BEFORE the in-walk local-`#` href check — so the
  function returns a stripped `<svg></svg>` carrying NO `data:`/`http`/`//` ref, NOT `""`
  (`data:image/svg+xml` is not a tripwire, and the local-# walk never runs for a dropped
  tag). Assert (via the 522-02-L03 `renderToString` style) the output contains no
  `data:`/`http`/`//`/`<image` token — do NOT assert `=== ""`, and do NOT add `image`/`a`
  to the allowlist to force a `""` (that widens the href attack surface). The QUOTED
  `<svg><image href="http://evil/x.svg"/></svg>` above returns `""` only because the
  QUOTED pre-pass short-circuits on its quoted non-local `href`, not because of the walk.
- **`style` attribute is NOT allowlisted (layout-escape / clickjacking class):**
  `<svg style="position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#000"><rect/></svg>`
  sanitizes with the `style` attr STRIPPED — the returned SVG (and its
  `renderToString` in 522-02-L03) contains NO `style=` token (so a `position:fixed`
  declaration can never escape the in-flow `<span>`). A `style` carrying a tripwire
  token (`style="background:url(javascript:…)"`, `style="behavior:url(#x)"`) still
  short-circuits to `""` via the tripwires; a benign `style` is simply dropped.
- **Byte count is ISOMORPHIC** (`TextEncoder`, no `Buffer`) — see the client-render
  test in 522-02-L03 (a `customSvg` block renders through `renderPageBlockContent`
  with no Node `Buffer` global, no `ReferenceError`).
- Idempotent: `sanitizeSvg(sanitizeSvg(x)) === sanitizeSvg(x)`.
- **Lane:** Vitest `tests/vitest/pages/svg-sanitizer.test.ts`.

## Hard Invariants

1. Allowlist tags + attrs; unknown dropped; tripwires fail-closed → `""`. A
   fail-closed PRE-PASS (reject on `<!--`/`<![CDATA[`) and a fail-closed POST-WALK
   residual check (return `""` on any residual raw `<` not a re-emitted allowlisted tag,
   or an unbalanced quote) bracket the walk so no un-walked markup (comments, CDATA,
   dropped-tag text, quote-desync) reaches the DOM. With those in place the allowlist
   attr-walk is the security boundary for all regex-matchable markup; the tripwires are
   advisory defence-in-depth.
2. `href`/`xlink:href`/`url()` local `#` only; no remote/JS/`data:`/protocol-relative
   refs. Enforced authoritatively INSIDE the allowlist attr-walk (quoted AND UNQUOTED
   values — the quote-requiring pre-pass is defence-in-depth only, not the boundary); a
   non-local ref fails the whole SVG closed to `""`. `xmlns`/`xmlns:xlink` VALUES
   constrained to the SVG/xlink namespaces (non-SVG namespace ⇒ rejected `""`). `style`
   attribute is NOT allowlisted (no raw CSS reaches the DOM — closes the `position:fixed`
   layout-escape/clickjacking class at the source).
3. Byte cap via `TextEncoder` (ISOMORPHIC — never `Buffer`, undefined in the browser
   bundle); must be a lone `<svg>…</svg>`; no dependency; runs SSR AND in the browser
   builder canvas (pure string, no DOM).
4. Used at BOTH write (L01) and render (522-02-L01) — defence in depth.
5. mXSS/parser-differential corpus asserted neutralized (comments, CDATA,
   unbalanced-quote desync, slash-handlers, nested/duplicate `<svg>`, entity-encoded).
</content>
