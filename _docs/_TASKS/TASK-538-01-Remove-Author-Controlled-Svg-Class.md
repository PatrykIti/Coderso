# TASK-538-01: Remove Author-Controlled SVG Class

# FileName: TASK-538-01-Remove-Author-Controlled-Svg-Class.md

**Parent Task:** TASK-538
**Priority:** Critical
**Category:** SVG Sanitization / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-522, TASK-535
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

---

## Scope

Remove class from the SVG allowlist at the write/render sanitizer boundary and add a
dependency-free conversion from sanitized SVG text into a closed plain-data tree. The
tree becomes the only author-SVG input accepted by the Page renderer; raw author markup
is never a render primitive.

## Grounded anchors

- core/services/pages/svgSanitizer.ts:67-149 includes class at :127 while excluding
  style.
- svgSanitizer.ts:254-293 rebuilds allowlisted attributes and currently retains class.
- core/services/pages/pageRendererV2.tsx:2685-2725 sanitizes a string then sends it to
  dangerouslySetInnerHTML at :2724.
- tests/vitest/pages/svg-sanitizer.test.ts:17-36 includes a class-bearing reference and
  :146-180 tests style removal but not class removal.

## Leaves

| Leaf | Scope | Source ownership |
|---|---|---|
| TASK-538-01-L01 | Own immutable SVG policy and strip class at every sanitize pass | new svgSanitizerPolicy.ts plus svgSanitizer.ts; staged sanitizer-test expectations |
| TASK-538-01-L02 | Parse only sanitized output into a safe closed SVG tree | new svgSafeTree.ts plus new safe-tree suite; policy imported read-only |

## Security invariants

- class and style never survive sanitization on root or descendants.
- One immutable policy module owns canonical tags, source attributes, React-name-neutral
  local-reference/namespace rules, and the class/style exclusion. It exports readonly
  arrays/records or predicate functions, never a shared mutable Set.
- The tree parser accepts only sanitizeSvg output, the closed tag/attribute sets, local
  fragment references, bounded text, and one balanced svg root.
- No DOMParser, browser DOM, eval, innerHTML, dynamic component import, or new dependency.
- Safe geometry, paint, transforms, namespaces, accessibility attributes, and existing
  byte cap remain.
- Empty/rejected input yields null and the existing neutral placeholder.

## Compatibility and land order

Land L01 before L02, then TASK-538-02. Class-bearing documents lose only class; safe
presentation attributes remain. Valid no-class sanitize output stays deterministic and
idempotent. Stored documents need no migration because both write and render sanitize.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/pages/svg-sanitizer.test.ts \
  tests/vitest/pages/page-document-v2.test.ts
~~~
