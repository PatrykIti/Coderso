/**
 * TASK-522-01-L02 — dependency-free SVG allowlist sanitizer.
 *
 * Used at BOTH write (TASK-522-01-L01 `normalizeBlockProp` for the `customSvg`
 * block's `svg` prop) AND render (TASK-522-02-L01, defence in depth before
 * `dangerouslySetInnerHTML`). Prefers an ALLOWLIST of SVG tags/attributes over a
 * denylist, bracketed by two fail-closed passes (comment/CDATA pre-pass +
 * post-walk residual check) that cover exactly the constructs the tag-walk regex
 * cannot match. NO npm dependency (no DOMPurify, no jsdom — SSR has no DOM); the
 * byte cap uses `TextEncoder` so the function is ISOMORPHIC (runs SSR AND in the
 * browser builder canvas, where `Buffer` is undefined).
 *
 * HARD INVARIANTS (see TASK-522-01-L02):
 *  1. Allowlist tags + attrs; unknown dropped; tripwires fail-closed → "". A
 *     fail-closed PRE-PASS (reject on `<!--`/`<![CDATA[`) and a fail-closed
 *     POST-WALK residual check bracket the walk so no un-walked markup reaches
 *     the DOM.
 *  2. href/xlink:href/url() local `#` only (enforced authoritatively INSIDE the
 *     walk, quoted AND unquoted); `xmlns`/`xmlns:xlink` VALUES constrained to the
 *     SVG/xlink namespaces; `style` attribute NOT allowlisted (no raw CSS reaches
 *     the DOM).
 *  3. Byte cap via `TextEncoder` (isomorphic); must be a lone `<svg>…</svg>`.
 *  4. Used at BOTH write and render (defence in depth).
 *  5. mXSS/parser-differential corpus neutralized (comments, CDATA,
 *     unbalanced-quote desync, slash-handlers, nested/duplicate `<svg>`,
 *     entity-encoded).
 */

/** Default byte cap (24 KiB); mirrors `PAGE_CUSTOM_SVG_MAX_BYTES`. */
export const SVG_SANITIZER_DEFAULT_MAX_BYTES = 24576;

const ALLOWED_TAGS = new Set<string>([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "use",
  "symbol",
  "title",
  "desc",
  "marker",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feMerge",
  "feMergeNode",
  "feColorMatrix",
  "feBlend",
  "feFlood",
  "feComposite",
]);

const ALLOWED_ATTRS = new Set<string>([
  // geometry / structural
  "d",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "points",
  "width",
  "height",
  "pathLength", // length-independent draw-in (522-01-L04): renderer may inject pathLength="1"
  "viewBox",
  "preserveAspectRatio",
  "transform",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "clipPathUnits",
  "maskUnits",
  "offset",
  "spreadMethod",
  "markerWidth",
  "markerHeight",
  "refX",
  "refY",
  "orient",
  "result",
  "in",
  "in2",
  "stdDeviation",
  "dx",
  "dy",
  "values",
  "mode",
  "operator",
  "type",
  // presentation
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "clip-rule",
  "stop-color",
  "stop-opacity",
  "color",
  "class",
  "id",
  "role",
  "aria-hidden",
  // href / xlink:href are allowlisted but LOCALITY-restricted (`#fragment` only)
  // by the in-walk check below; a remote/protocol value fails the whole SVG closed.
  "href",
  "xlink:href",
  "xmlns",
  "xmlns:xlink",
  "text-anchor",
  "font-size",
  "font-family",
  "font-weight",
  "letter-spacing",
  "clip-path",
  "mask",
  "filter",
  // NOTE: `style` is DELIBERATELY NOT allowlisted — a raw `style` attr is author
  // CSS reaching the DOM (a `position:fixed;inset:0;z-index:…` layout-escape /
  // clickjacking vector). All visual styling the reference needs is expressible
  // via the presentation attrs above.
]);

const TRIPWIRES: RegExp[] = [
  /<\s*script/i,
  /<\s*foreignObject/i,
  /<!\s*ENTITY/i,
  /<!\s*DOCTYPE/i,
  // on* event attributes — a leading whitespace OR `/` so slash-separated
  // handlers (`<rect/onclick=…>`, a parser-differential mXSS) also fail closed.
  /[\s/]on[a-z]+\s*=/i,
  /javascript:/i,
  /vbscript:/i,
  /data:\s*text\/html/i,
  /expression\s*\(/i,
  /behavior\s*:/i,
  /-moz-binding/i,
];

// Case-insensitive canonical lookup: a pasted `<SVG>`/`<RECT>`/`<LINEARGRADIENT>`
// (HTML-parsed inline SVG is case-insensitive in the browser) maps to its
// canonical allowlisted spelling. Without this the case-INSENSITIVE root gate
// (`/^<svg[\s>]/i`) admits an uppercase `<SVG>` whose tags the case-SENSITIVE
// walk then DROPS, leaking the (allowlisted) CHILDREN as an UNWRAPPED fragment.
// Re-emitting the canonical form keeps camelCase tags (linearGradient,
// feGaussianBlur, clipPath) intact and preserves the allowlist invariant.
const ALLOWED_TAG_CANONICAL = new Map<string, string>(
  Array.from(ALLOWED_TAGS, (tag) => [tag.toLowerCase(), tag])
);

const ALLOWED_NS = new Set<string>(["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink"]);

// Matcher for re-emitted allowlisted tags (used by the post-walk residual check).
// Longest-first alternation + a `(?=[\s/>])` lookahead so `feMerge` never
// shadows `feMergeNode`. The attr body is a QUOTE-BALANCED class
// (`[^<>"']|"[^"]*"|'[^']*'`) — NOT a loose `[^<>]*` — so an UNBALANCED-quote tag
// that the quote-aware walk could NEVER have matched (e.g. a desynced
// `<rect style="x" ">`) is left in the residue and correctly trips the
// fail-closed residual-`<` / odd-quote guard below, instead of being silently
// stripped (which would leak a raw `style`/clickjacking attr into the DOM).
const TAG_REEMIT_RE = new RegExp(
  `<\\/?(?:${Array.from(ALLOWED_TAGS)
    .sort((a, b) => b.length - a.length)
    .join("|")})(?=[\\s/>])(?:[^<>"']|"[^"]*"|'[^']*')*>`,
  "g"
);

const isLocalHash = (value: string): boolean => value.trim().startsWith("#");

/**
 * Sanitize a pasted SVG string to an allowlisted inline `<svg>…</svg>` or `""`
 * (the neutral fallback). Fail-closed: any tripwire, non-local ref, namespace
 * confusion, comment/CDATA, residual un-walked markup, or over-cap size rejects
 * the WHOLE SVG rather than partially stripping it.
 */
export function sanitizeSvg(
  raw: string,
  maxBytes: number = SVG_SANITIZER_DEFAULT_MAX_BYTES
): string {
  if (typeof raw !== "string") return "";
  const src = raw.trim();
  if (!src) return "";
  // ISOMORPHIC byte count — never `Buffer.byteLength` (undefined in the browser
  // builder canvas bundle). `TextEncoder` exists in Node AND the browser.
  if (new TextEncoder().encode(src).length > maxBytes) return "";
  // Must be a LONE SVG: either `<svg …>…</svg>` OR a valid self-closing `<svg …/>`
  // (a self-closing root has no `</svg>`; the opening tag ends in `/>`). Both
  // forms start `<svg` followed by whitespace, `>` or `/`.
  if (!/^<svg[\s/>]/i.test(src)) return "";
  const selfClosingRoot = /^<svg\b(?:[^>"']|"[^"]*"|'[^']*')*\/>\s*$/i.test(src);
  if (!selfClosingRoot) {
    if (!/<\/svg>\s*$/i.test(src)) return "";
    // FAIL-CLOSED: when this is NOT a full self-closing root, the FIRST `<svg…>`
    // must itself be an OPEN tag (not self-closed). Otherwise a self-closed root
    // `<svg/>` followed by junk + a trailing `<svg>…</svg>` would pass both the
    // start gate and the `</svg>`-end gate while leaving the junk BETWEEN them as
    // un-walked verbatim TEXT reaching the DOM — defeating the "lone <svg>…</svg>"
    // and "no un-walked fragment reaches the DOM" hard invariants.
    const rootOpen = /^<svg\b(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>/i.exec(src);
    if (!rootOpen || rootOpen[1] === "/") return "";
  }
  // FAIL-CLOSED PRE-PASS: HTML comments / CDATA are NOT matched by the tag-walk
  // regex, so left in place they survive verbatim. Reject on their presence.
  if (/<!--|<!\[CDATA\[/i.test(src)) return "";
  for (const rx of TRIPWIRES) if (rx.test(src)) return ""; // fail-closed tripwires
  // FAST pre-pass (defence in depth, QUOTED values only): a quoted non-local
  // href/xlink:href/url() rejects immediately. NOT authoritative — an UNQUOTED
  // value has no delimiter here; the local-# enforcement below (in the walk) is
  // the boundary.
  const hrefRe = /(?:xlink:href|href)\s*=\s*(['"])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(src))) {
    if (!isLocalHash(m[2]!)) return "";
  }
  const urlRe = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  while ((m = urlRe.exec(src))) {
    if (!isLocalHash(m[2]!)) return "";
  }
  // xmlns/xmlns:xlink VALUES must be the SVG / xlink namespaces (namespace-
  // confusion mXSS guard). A standalone pasted SVG legitimately carries
  // xmlns="http://www.w3.org/2000/svg"; an inline house-line has no xmlns.
  const nsRe = /xmlns(?::xlink)?\s*=\s*(['"])(.*?)\1/gi;
  while ((m = nsRe.exec(src))) {
    if (!ALLOWED_NS.has(m[2]!.trim())) return "";
  }

  // Allowlist walk: drop disallowed tags AND disallowed attrs, and enforce
  // href/xlink:href/url() LOCALITY here (quoted OR unquoted) — the authoritative
  // check. A non-local ref sets `rejected` ⇒ the WHOLE SVG fails closed to "".
  let rejected = false;
  const out = src.replace(
    /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g,
    (_full, slash: string, tag: string, attrs: string, selfClose: string) => {
      // Case-INSENSITIVE allowlist lookup, re-emit CANONICAL spelling (see
      // ALLOWED_TAG_CANONICAL): keeps `<SVG>`/`<RECT>` from leaking as an
      // unwrapped fragment while preserving camelCase (linearGradient, …).
      const canonical = ALLOWED_TAG_CANONICAL.get(tag.toLowerCase());
      if (!canonical) return ""; // drop tag
      if (slash) return `</${canonical}>`;
      // Rebuild the attr list from ONLY the allowlisted `name=value` pairs. A
      // valueless/boolean attr (`<rect fill-rule>`, `<rect autofocus>`) is NOT a
      // `name=value` pair, so it is left OUT — otherwise it would survive verbatim
      // and break the "only allowlisted attrs remain" invariant.
      let kept = "";
      const attrRe = /([a-zA-Z_:][-\w:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g;
      let a: RegExpExecArray | null;
      while ((a = attrRe.exec(String(attrs)))) {
        const name = a[1]!;
        const rawVal = a[2]!;
        if (!ALLOWED_ATTRS.has(name)) continue; // drop unknown attr (incl. style)
        const val = rawVal.replace(/^["']|["']$/g, "").trim(); // unquote (quoted OR bare)
        if ((name === "href" || name === "xlink:href") && !isLocalHash(val)) {
          rejected = true;
          continue;
        }
        val.replace(
          /url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi,
          (_u: string, _q: string, target: string) => {
            if (!isLocalHash(String(target))) rejected = true;
            return _u;
          }
        );
        kept += ` ${a[0]}`;
      }
      return `<${canonical}${kept}${selfClose ? "/" : ""}>`;
    }
  );
  if (rejected) return ""; // non-local ref found in the walk
  // FAIL-CLOSED POST-WALK residual check: strip every re-emitted allowlisted tag;
  // any residual raw `<` (dropped-tag TEXT, quote-desync) or unbalanced quote
  // means un-walked markup would reach the DOM — fail closed.
  const residue = out.replace(TAG_REEMIT_RE, "");
  if (residue.includes("<") || (residue.match(/["']/g)?.length ?? 0) % 2 !== 0) return "";
  // Paranoid final re-pass (defence in depth) — return "" if anything slipped.
  for (const rx of TRIPWIRES) if (rx.test(out)) return "";
  return out.trim();
}
