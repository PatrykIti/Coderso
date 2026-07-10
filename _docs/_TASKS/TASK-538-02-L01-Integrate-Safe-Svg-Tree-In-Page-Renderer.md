# TASK-538-02-L01: Integrate Safe SVG Tree in Page Renderer

# FileName: TASK-538-02-L01-Integrate-Safe-Svg-Tree-In-Page-Renderer.md

**Parent Task:** TASK-538
**Parent Subtask:** TASK-538-02
**Priority:** Critical
**Category:** Page Renderer / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-538-01-L01, TASK-538-01-L02
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

---

## Scope

Render customSvg from SafeSvgElement nodes through React createElement/JSX and remove the
author-controlled dangerouslySetInnerHTML call. Apply draw-in pathLength as a tree-prop
transform rather than string replacement.

## Source ownership

This leaf is the sole TASK-538 writer of
core/services/pages/pageRendererV2.tsx. It may add no second renderer source owner. It
reads svgSanitizer.ts/svgSafeTree.ts only and must not edit them, tests, docs, scanner
configuration, task indexes, or changelog files, except that it owns the
changed-behavior/compatibility updates required before its gate in
`tests/vitest/pages/page-renderer-v2.test.tsx`.

## Grounded anchors

The customSvg branch is pageRendererV2.tsx:2685-2725. It currently re-sanitizes, injects
pathLength by regex string replacement, and passes clean to dangerouslySetInnerHTML.
Other DSIH sites shown by search are static framework-owned CSS/runtime constants and are
not authorization to retain this author-data sink.

## Implementation Pseudocode

~~~tsx
const SAFE_CUSTOM_SVG_MIN_ASPECT_RATIO = 1 / 8;
const SAFE_CUSTOM_SVG_MAX_ASPECT_RATIO = 8;
const SAFE_CUSTOM_SVG_MAX_BLOCK_SIZE_PX = 1024;

const SAFE_CUSTOM_SVG_BOUNDARY_STYLE: Readonly<CSSProperties> = {
  display: "block",
  inlineSize: "100%",
  maxInlineSize: "100%",
  maxBlockSize: `${SAFE_CUSTOM_SVG_MAX_BLOCK_SIZE_PX}px`,
  overflow: "hidden",
  contain: "layout paint",
  pointerEvents: "none",
};

function resolveTrustedSvgViewportStyle(rootProps): Readonly<CSSProperties> {
  parsed = parse exactly four finite viewBox numbers;
  rawRatio = parsed has positive width/height ? width / height : 1;
  aspectRatio = clamp(
    rawRatio,
    SAFE_CUSTOM_SVG_MIN_ASPECT_RATIO,
    SAFE_CUSTOM_SVG_MAX_ASPECT_RATIO
  );
  return {
    display: "block",
    inlineSize: "100%",
    maxInlineSize: "100%",
    blockSize: "auto",
    maxBlockSize: `${SAFE_CUSTOM_SVG_MAX_BLOCK_SIZE_PX}px`,
    aspectRatio: String(aspectRatio),
    overflow: "hidden",
    pointerEvents: "none",
  };
}

function renderSafeSvgNode(node, key, drawIn, isRoot = false): ReactNode {
  // buildSafeSvgTree has already enforced SVG_SAFE_TREE_MAX_DEPTH/node/text caps.
  if node.kind === "text":
    return node.value; // XML entities were decoded once; React escapes once

  props = { key, ...node.props from closed mapping };
  if isRoot:
    delete props.x/y/width/height/transform; // author root cannot own layout
    props.width = "100%";
    props.style = resolveTrustedSvgViewportStyle(props); // trusted derived/clamped CSS
  if drawIn and node.tag in ["path", "line", "polyline"] and no pathLength:
    props.pathLength = "1";

  children = node.children.map((child, index) =>
    renderSafeSvgNode(child, stable path key, drawIn, false)
  );
  return createElement(node.tag, props, ...children);
}

case "customSvg": {
  tree = buildSafeSvgTree(string prop or "");
  if !tree: return neutral placeholder;
  draw = resolveDrawInAttrs(props.drawIn, props.drawSpeed);
  return (
    <span
      role/aria label exactly as today
      data-custom-svg-boundary="true"
      {...draw.dataAttrs}
      style={{ ...SAFE_CUSTOM_SVG_BOUNDARY_STYLE, ...draw.cssVars }}
    >
      {renderSafeSvgNode(tree, "svg-root", Boolean(props.drawIn), true)}
    </span>
  );
}
~~~

Do not spread arbitrary parser objects. The safe-tree module must already expose closed
React prop names; the renderer may additionally check className/style/dangerouslySet...
are absent before rendering. Keys are structural indices or safe internal paths, not
author IDs.

## Error and compatibility contract

Null tree uses the existing muted placeholder. Rendering never catches unsafe input and
falls back to raw text. Existing label/aria-hidden behavior remains. Safe presentation
and draw-in remain visually equivalent; draw-in must not mutate the shared tree.
No author string is handed to innerHTML, outerHTML, insertAdjacentHTML, or DSIH.
The renderer must not add an unbounded recursive fallback: a tree over any exported cap
is already `null`. The trusted constants above are mandatory, not optional: the wrapper
establishes a 100%-width layout/paint containment box, clips overflow, and is
pointer-transparent; the root drops author `x`/`y`/`width`/`height`/`transform`, receives
trusted width/style, clamps only its CSS viewport ratio to `1/8..8`, caps root and
wrapper block size at exactly `1024px`, and retains the author viewBox,
preserveAspectRatio, paint, accessibility, and descendant geometry. Invalid/non-positive
viewBox dimensions use trusted ratio `1`; they never remove the block-size cap. Neither
level may copy author `class`, `style`, an event handler, or a pointer override.
Oversized descendant/filter geometry may render only inside the clipped paint boundary
and cannot become a hit target.

## Regression-test shape

This leaf updates `tests/vitest/pages/page-renderer-v2.test.tsx` before its source gate.
Assert semantic SVG output, safe React attribute mapping,
draw-in pathLength only where needed, placeholder on null, class/style absence, text
and XML-entity one-pass escaping, cap overflow, label behavior, and no author-data DSIH
in the customSvg branch. Render harmless viewport-relative/oversized root geometry and
assert the author root layout attributes are absent/replaced, the exact trusted wrapper
and root containment styles are present, extreme tall/wide/invalid viewBox inputs clamp
to the exact ratio/block-size bounds, and descendant geometry/viewBox remains represented.
Keep trusted static CSS/runtime DSIH assertions separate. TASK-538-02-L02 owns additive
cross-seam/browser proof and may not re-baseline these renderer assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/pages/svg-sanitizer.test.ts \
  tests/vitest/pages/page-renderer-v2.test.tsx \
  tests/vitest/pages/page-document-v2.test.ts
~~~

The safe-tree suite already exists from TASK-538-01-L02 and is a read-only input here.
Re-run a named failing file alone before declaring a failure.

## Acceptance criteria

- No author-controlled customSvg content reaches dangerouslySetInnerHTML.
- Author root layout attributes or extreme viewBox ratios cannot expand the wrapper
  beyond the trusted ratio/`1024px` cap or create a hit target.
- Safe tree nodes render with preserved geometry/presentation/draw-in.
- Invalid content produces only the neutral placeholder.
