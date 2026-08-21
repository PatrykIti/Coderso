# TASK-539-02-L03: Regenerate Kit Artifact and Color Expectations

# FileName: TASK-539-02-L03-Regenerate-Kit-Artifact-And-Color-Expectations.md

**Parent Subtask:** TASK-539-02
**Priority:** High
**Category:** Pages / Kit Fixture Re-baseline
**Estimated Effort:** Small
**Dependencies:** TASK-539-02-L01
**Status:** ✅ Done
**Completed:** 2026-08-20
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Purpose and root cause

TASK-539-02-L01 delegated all accepted non-token authoring colors to the TASK-541
single semantic parser, so `sanitizeAuthoringCssColor` now emits TASK-541 canonical
bytes: comma-spaced `rgba(r, g, b, a)` with normalized decimals, e.g.
`rgba(142, 232, 255, 0.12)` instead of the legacy compact `rgba(142,232,255,.12)`.
That is the intended product contract. The downstream generated artifact and the
three kit suites still pin the OLD compact bytes, and no TASK-539 leaf owns them:

- `_docs/_DEMO/projekty-domow.site.json` is the checked-in generator output
  (`scripts/demo-projekty-domow.tsx`); the byte-stability test asserts it equals a
  fresh `serializeFormaDomPackage()` run, which now emits canonical bytes, so the
  artifact is stale.
- `tests/vitest/kits/projekty-domow-package.test.ts` (byte-stable + zero generator
  diff) fails on the stale artifact.
- `tests/vitest/kits/projekty-domow-pages.test.ts:214` pins
  `glow: { color: "rgba(173,255,216,.28)" }`.
- `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx:111/126` pins
  `0px 0px 48px 2px rgba(142,232,255,.28)` and `rgba(173,255,216,.28)`.

This leaf is the mechanical, contract-mandated re-baseline of the same rendered
value: the visible colors do not change, only their canonical byte spelling.
Verified in a scratch worktree: regenerating the artifact produces a diff of 210
lines, 100% rgba byte-spelling changes (no other field, key, or value changes).

## Sole ownership

Write only:

- `_docs/_DEMO/projekty-domow.site.json` (regenerate via the existing script)
- `tests/vitest/kits/projekty-domow-package.test.ts` (re-baseline expectations only)
- `tests/vitest/kits/projekty-domow-pages.test.ts` (re-baseline expectations only)
- `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx` (re-baseline
  expectations only)

Do NOT edit the generator source (`scripts/projekty-domow/**`, `scripts/
demo-projekty-domow.tsx`), the sanitizer (`pageAuthoringSanitizers.ts`), the
TASK-541 parser (`core/services/theme/cssColorContract.ts`), any other production
source, or any other test file. The generator source keeps its compact literals;
canonicalization is the sanitizer's job at emit time.

## Implementation pseudocode

```ts
// 1. Regenerate the checked-in demo artifact with the existing generator.
bun scripts/demo-projekty-domow.tsx
// writes _docs/_DEMO/projekty-domow.site.json from serializeFormaDomPackage()

// 2. Re-baseline the three kit suites' color expectations to the canonical
//    bytes the generator now emits (verify each against the regenerated
//    artifact/HTML instead of hand-editing guesses):
//    - package suite: assert readFileSync(artifact) === serializeFormaDomPackage()
//      (the byte-stable + zero-diff assertions are already generator-driven;
//      once the artifact is regenerated they pass unchanged).
//    - pages suite line ~214: glow.color "rgba(173,255,216,.28)" ->
//      "rgba(173, 255, 216, 0.28)".
//    - runtime-rendering suite lines ~111/126: the composed box-shadow and
//      glow HTML fragments must use the canonical bytes actually rendered;
//      update the expected substrings to match (do not weaken the assertion).
```

Behavior assertions, test names, control flow, fixtures (other than the canonical
color bytes), and mock values stay byte-identical. This is a spelling-only
re-baseline, never a behavior change.

## Validation

```bash
bun run test:vitest -- \
  tests/vitest/kits/projekty-domow-package.test.ts \
  tests/vitest/kits/projekty-domow-pages.test.ts \
  tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx
bun --cwd core lint
bun --cwd core lint:types
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Additionally verify the regenerated artifact diff is spelling-only: run the
regeneration against the pre-change artifact in a scratch worktree and confirm no
non-color field changed. All three kit suites must pass. The family line gate uses
the verified pre-TASK-539 baseline; every touched file must be `<=1000`. Rerun a
named failing test alone before classification.
