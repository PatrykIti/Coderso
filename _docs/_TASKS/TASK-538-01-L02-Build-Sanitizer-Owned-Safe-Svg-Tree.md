# TASK-538-01-L02: Build a Sanitizer-Owned Safe SVG Tree

# FileName: TASK-538-01-L02-Build-Sanitizer-Owned-Safe-Svg-Tree.md

**Parent Task:** TASK-538
**Parent Subtask:** TASK-538-01
**Priority:** Critical
**Category:** SVG Parsing / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-538-01-L01
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

---

## Scope

Create a dependency-free plain-data parser that accepts only the canonical output of
sanitizeSvg and returns one balanced SafeSvgElement tree. It provides a closed,
React-renderable representation so author text never needs raw markup insertion.

## Source ownership

This leaf is the only writer of new
core/services/pages/svgSafeTree.ts and creates/owns the changed-behavior suite
`tests/vitest/pages/svg-safe-tree.test.ts` before its gate. It imports sanitizeSvg and
the immutable source policy from svgSanitizerPolicy.ts read-only. It must not edit
either owner, pageRendererV2.tsx, other tests, docs, scanner config, tasks, or changelog.

## Data contract

~~~ts
export type SafeSvgText = { kind: "text"; value: string };
export type SafeSvgElement = {
  kind: "element";
  tag: SafeSvgTag;
  props: Readonly<Partial<Record<SafeReactSvgProp, string>>>;
  children: readonly SafeSvgNode[];
};
export type SafeSvgNode = SafeSvgElement | SafeSvgText;

export const SVG_SAFE_TREE_MAX_NODES = 2048;
export const SVG_SAFE_TREE_MAX_DEPTH = 64;
export const SVG_SAFE_TREE_MAX_TEXT_CHARS = 8192;

export function buildSafeSvgTree(raw: string): SafeSvgElement | null;
~~~

SafeSvgTag is the same closed set owned by sanitizer policy. SafeReactSvgProp is an
explicit mapping from allowed source names to React SVG names, for example viewBox,
strokeWidth, fillRule, clipPath, xlinkHref, xmlnsXlink, aria-hidden, and data-free
accessibility props. Props are deliberately sparse: a node contains only attributes that
survived policy and occurred on that element; it is never padded with every union member.
No arbitrary prop spread from parsed names is allowed.

## Implementation Pseudocode

~~~ts
function buildSafeSvgTree(raw) {
  clean = sanitizeSvg(raw);
  if !clean: return null;

  tokens = bounded tokenizer over clean;
  stack = [];
  root = null;
  nodeCount = 0;
  textCharCount = 0;

  for token:
    if opening/self-closing tag:
      increment nodeCount; reject above SVG_SAFE_TREE_MAX_NODES;
      reject when stack depth would exceed SVG_SAFE_TREE_MAX_DEPTH;
      require isSafeSvgTag(tag) from immutable policy;
      parse only quoted/normalized attributes emitted by sanitizeSvg;
      require isSafeSvgSourceAttr(name), decode the closed XML entity grammar, then map
        through closed SOURCE_TO_REACT_PROP;
      recheck decoded href/url local fragment, namespace, controls, and reject
        class/style/on*/unknown;
      node = immutable SafeSvgElement;
      append to current parent or assign sole svg root;
      push unless self-closing;
    if closing tag:
      require exact top-of-stack match, then pop;
    if text:
      decode only XML predefined entities plus valid bounded numeric Unicode references;
      reject malformed entities, invalid scalar values, NUL, and disallowed controls;
      increment textCharCount and reject above SVG_SAFE_TREE_MAX_TEXT_CHARS;
      append decoded plain text node; React will escape it exactly once;

  require one svg root, empty stack, full input consumed, no residual markup;
  return deep-frozen/read-only tree or null;
}
~~~

Import the readonly arrays/records and predicate functions owned by L01. Do not recreate
tag, source-attribute, namespace, or local-reference lists. This leaf owns only the
source-attribute to React-prop mapping and tree tokenizer. It derives parsing from
already-sanitized canonical output and still rejects every unexpected token.
Entity decoding is a closed XML operation, never HTML parsing: only `amp`, `lt`, `gt`,
`quot`, `apos`, and valid numeric scalar references are accepted. Attribute security
checks run after decoding so encoded text cannot change a local reference into a remote
one. The limits above are part of the exported immutable policy and keep both tree
construction and TASK-538-02's recursive React render below a fixed safe depth.

## Error and compatibility contract

Any parser mismatch returns null; it never tries browser-style recovery. No thrown parse
detail reaches a client. Text is a node value, never markup. Local references and
namespaces retain existing behavior. A neutral empty tree maps to the existing
placeholder. No stored document migration or dependency is introduced.

## Regression-test shape

This leaf creates and passes `tests/vitest/pages/svg-safe-tree.test.ts` before its source
gate. Add safe-tree tests for nested defs/gradients/use/text,
self-closing shapes, a minimal `<path d="...">` whose sparse props contain no unrelated
keys, canonical React prop mapping, malformed stack/residue rejection,
class/style/event/unknown prop impossibility, local refs, idempotent deterministic tree,
and exact one-pass entity/text escaping. Test each node/depth/text limit at the boundary
and one over, malformed/numeric entities, and an encoded non-local reference. Prove the
returned tag cannot be caller-selected outside the closed set.

TASK-538-02-L02 may add cross-renderer cases later but cannot re-baseline this parser
contract.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/pages/svg-sanitizer.test.ts \
  tests/vitest/pages/svg-safe-tree.test.ts \
  tests/vitest/pages/page-renderer-v2.test.tsx
~~~

Create the dedicated safe-tree suite before invoking this gate. The renderer suite is a
read-only compatibility input here. Re-run a named failing file alone before declaring
a failure.

## Acceptance criteria

- Only a fully consumed, balanced, single-svg sanitized document becomes a tree.
- Node count, depth, and decoded text are bounded before recursive rendering.
- The tag/attribute/local-reference decision comes from the one immutable L01 policy.
- No tree property can contain class, style, an event handler, or remote reference.
- No author-controlled HTML/SVG string is required by the renderer.
