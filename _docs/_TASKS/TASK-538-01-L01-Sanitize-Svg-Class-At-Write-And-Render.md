# TASK-538-01-L01: Sanitize SVG Class at Write and Render

# FileName: TASK-538-01-L01-Sanitize-Svg-Class-At-Write-And-Render.md

**Parent Task:** TASK-538
**Parent Subtask:** TASK-538-01
**Priority:** Critical
**Category:** SVG Sanitizer / Security
**Estimated Effort:** Small
**Dependencies:** TASK-522, TASK-535
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-11
**Implementation Gate:** ✅ Passed (59/59 targeted tests, lint, typecheck, and read-only
final audit)
**Changelog:** 1250

---

## Scope

Extract the closed SVG source policy to an immutable module, remove class from its
attribute allowlist, and make the sanitizer consume that sole policy. Correct sanitizer
comments so the contract no longer claims style alone closes layout escape. Preserve
closed-name-allowlisted presentation/geometry attributes under the existing byte and
local-reference limits plus all fail-closed parser-differential guards.

## Source ownership

This leaf is the sole TASK-538 writer of:

- new core/services/pages/svgSanitizerPolicy.ts;
- core/services/pages/svgSanitizer.ts.

It owns the sanitizer compatibility/changed-behavior updates required before its gate
in `tests/vitest/pages/svg-sanitizer.test.ts`. It must not edit pageRendererV2.tsx,
svgSafeTree.ts, other tests, docs, task indexes, scanner configuration, or changelog
files.

## Implementation Pseudocode

~~~ts
// svgSanitizerPolicy.ts — immutable exports only.
export const SAFE_SVG_TAGS = Object.freeze([...canonical tags] as const);
export const SAFE_SVG_SOURCE_ATTRS = Object.freeze([
  geometry/structural attributes,
  closed-name-allowlisted presentation attributes,
  id, role, aria-hidden,
  href/xlink:href, xmlns/xmlns:xlink,
  // deliberately no class and no style
] as const);
export const SAFE_SVG_NAMESPACES = Object.freeze({...});
export function isSafeSvgTag(value): value is SafeSvgTag;
export function canonicalizeSafeSvgTag(value): SafeSvgTag | null;
export function isSafeSvgSourceAttr(value): value is SafeSvgSourceAttr;
export function isSafeLocalSvgReference(value): boolean;

sanitizeSvg(raw, cap) {
  import the readonly policy/predicates;
  retain existing byte/root/tripwire/local-ref/namespace guards;
  walk every root/descendant tag;
  canonicalize case-insensitive tag input through canonicalizeSafeSvgTag before
    re-emitting the exact policy-owned spelling;
  rebuild attributes only when isSafeSvgSourceAttr(name);
  therefore class and style are dropped regardless of case/location;
  preserve residual fail-closed pass and idempotence;
}
~~~

Do not add a class-value regex or utility-class allowlist. Do not weaken tripwires,
allow event attributes, or make unknown attributes pass through. The sanitizer remains
isomorphic and dependency-free. The policy module exposes no mutable Set/Map/array and
contains no React-specific prop mapping; L02 owns that conversion. Presentation
attributes are bounded only by the existing byte/local-reference limits here;
renderer-owned root geometry receives the separate ratio/block-size clamps in
538-02-L01.

## Data flow and errors

normalizeBlockProp and the renderer continue to call sanitizeSvg. Valid markup returns a
canonical string with class removed. Fatal malformed/unsafe markup returns the existing
empty string, not a partially trusted error object. Class alone is stripped rather than
rejecting the complete drawing so existing drawings retain safe presentation content.

## Regression-test shape

This leaf updates `tests/vitest/pages/svg-sanitizer.test.ts` before its source gate.
Required cases:

- class on root, nested group, and shape is absent after one and two passes;
- mixed-case/duplicate class attributes cannot survive;
- uppercase/mixed-case tags still canonicalize without leaking an unwrapped fragment;
- class tokens matching current public utilities receive no special treatment;
- safe fill/stroke/transform/viewBox/local references remain;
- no-class input remains idempotent;
- existing mXSS/XSS, byte-cap, namespace, and residual corpus stays green.

TASK-538-02-L02 may add cross-renderer isolation cases later but cannot weaken or
re-baseline these sanitizer assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/pages/svg-sanitizer.test.ts
~~~

Re-run the named file alone before declaring a failure.

## Acceptance criteria

- The literal class attribute is not allowlisted or re-emitted anywhere.
- The sanitizer consumes the immutable source policy; L02 is contractually required to
  consume those same exports without a mirror.
- Existing safe presentation behavior is retained.
- No scanner suppression, utility allowlist, dependency, or exploit fixture is added.

## Completion evidence

The immutable policy and sanitizer landed with the closed tag/attribute contract and
root/descendant `class`/`style` removal. Its named gate, final family gate, targeted
Semgrep, and post-audit policy lens passed without a scanner exception or allowlist.
