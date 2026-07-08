# TASK-522-02-L01: Renderer `case "customSvg"` (Sanitized + Draw-In)

# FileName: TASK-522-02-L01-Custom-SVG-Renderer-Case.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-02
**Priority:** High
**Category:** Site Render / Security / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the NEW block-content `case "customSvg"` to
`renderPageBlockContent` (`pageRendererV2.tsx:1747`) — DISJOINT from 521-04's
`case "icon"` (`:1919`). Renders the sanitized SVG via `dangerouslySetInnerHTML` with
a defence-in-depth RE-sanitize, plus the optional draw-in wrapper attrs from
522-01-L04.

## Grounded anchors

- Switch in `renderPageBlockContent` (`:1747`); existing cases end with
  `case "icon"` (`:1919`, from 521-04) then `default: return null` (`:1921`).
- Import (append-only top-of-file sub-region, `:1-33`): `sanitizeSvg` (522-01-L02),
  `resolveDrawInAttrs` (522-01-L04). Block props typed via `pageBlockPropKeys.customSvg`.
- Precedent for `dangerouslySetInnerHTML` static `__html`: `renderEmbedBlock`
  (sandboxed embed) — but customSvg is INLINE (no iframe), so a sanitized SVG span.

## Implementation pseudocode

```tsx
case "customSvg": {
  const props = block.props as { svg?: string; drawIn?: boolean; drawSpeed?: number; label?: string };
  // Defence in depth: re-sanitize at render (do NOT trust the stored value blindly).
  // sanitizeSvg is ISOMORPHIC (TextEncoder byte count, no Node `Buffer`) because this
  // case ALSO runs in the browser builder canvas (renderPageBlockContent is invoked
  // directly there, Hard Invariant 8) — a Buffer.byteLength would ReferenceError.
  let clean = sanitizeSvg(typeof props.svg === "string" ? props.svg : "");
  if (!clean) {
    // neutral fallback (no injected markup) — a muted placeholder box.
    return <span className="inline-block text-slate-400" aria-hidden="true">▢</span>;
  }
  const { dataAttrs, cssVars } = resolveDrawInAttrs(props.drawIn, props.drawSpeed);
  if (props.drawIn) {
    // Length-INDEPENDENT draw-in: stamp pathLength="1" on every stroke shape so the
    // 522-01-L04 CSS (stroke-dasharray:1;stroke-dashoffset:1) completes for ANY pasted
    // SVG (a fixed dash only fit the reference paths). pathLength is allowlisted in
    // 522-01-L02, so this survives a re-sanitize round-trip. Simple, safe string inject
    // on the already-sanitized markup (only adds a numeric attr to shape tags):
    clean = clean.replace(/<(path|line|polyline)\b(?![^>]*\bpathLength=)/gi, '<$1 pathLength="1"');
  }
  return (
    <span
      role="img"
      aria-label={props.label || undefined}
      aria-hidden={props.label ? undefined : "true"}
      {...dataAttrs}
      style={cssVars as CSSProperties}
      // clean is allowlist-sanitized at write AND here; only SVG shape survives.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
```

**Security.** The value is sanitized at write (522-01-L01) AND re-sanitized here
(defence in depth) — a stored value that somehow bypassed write validation (older
row, direct DB edit) is still neutralized at render. A sanitize failure renders the
neutral placeholder (never partial markup). `label` is plain text (React-escaped) for
a11y. The draw-in animation is CSS-only (522-01-L04, gated by reduced-motion).

## Regression-test shape (delegated to 522-02-L03, asserted here)

- A `customSvg` block with the reference `house-line` renders an inline `<svg>`
  (SSR `renderToString`); `drawIn:true` adds `data-draw-in` + `--draw-speed` AND
  injects `pathLength="1"` on the `<path>` (assert a short-path SVG gets it too); an
  XSS vector svg renders the fallback with NO `<script>`/`onload`/`javascript:` token;
  empty svg → fallback.
- **Client-render (browser bundle) test:** render this case with the Node `Buffer`
  global deleted (jsdom, mirroring the builder canvas) — no `ReferenceError`, sanitized
  `<svg>` still emitted (proves `sanitizeSvg` is isomorphic).
- **Lane:** Vitest `tests/vitest/pages/page-renderer-v2.test.tsx`.

## Hard Invariants

1. Re-sanitize at render (isomorphic `sanitizeSvg`, no `Buffer`); fallback on failure
   (no partial markup).
2. Present-only (unauthored/empty → fallback, not a broken node).
3. Draw-in is CSS-only + reduced-motion gated (522-01-L04); `pathLength="1"` injected
   for length-independent draw.
4. Disjoint from `case "icon"`; only appends a new case.
</content>
