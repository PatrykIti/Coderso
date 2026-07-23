# TASK-538-03-L01: Redacted Security Docs, Scan, and Closure

# FileName: TASK-538-03-L01-Redacted-Security-Docs-Scan-And-Closure.md

**Parent Task:** TASK-538
**Parent Subtask:** TASK-538-03
**Priority:** Critical
**Category:** Security Documentation / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-538-02-L02
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-11
**Changelog:** 1250

---

## Scope and ownership

Docs-and-closure-only leaf. It may edit `_docs/SECURITY_SPEC.md`,
`_docs/PAGE_MODEL.md`, and the existing Page-block maintenance description in
`_docs/WIDGETS.md` (this does not create or expand a non-dashboard widget surface),
this family’s task statuses,
_docs/_TASKS/README.md, changelog 1250, and _docs/_CHANGELOG/README.md. It must not edit
core source, tests, workflow/scanner configuration, or any completed historical task.
Read task/changelog indexes fresh before closure.

## Documentation contract

State defensively that class/style are excluded, author SVG is converted to a closed
safe node tree, write and render both sanitize, unsafe input becomes a neutral
placeholder, and browser isolation is verified. Do not repeat the private reproduction,
utility token, attack string, or an actionable click-overlay recipe in the public task
family, source-of-truth docs, changelog, or smoke evidence. Historical internal audit
evidence and existing security regression tests are not rewritten or weakened.

## Implementation Pseudocode

~~~text
read final source, targeted test output, browser scenario record/screenshots, and scanner output fresh;
if any author-data DSIH, class/style survival, missing scenario, or scanner suppression:
  stop closure and return the evidence to the owning implementation/test leaf;
update SECURITY_SPEC, PAGE_MODEL, and only the existing Page-block maintenance
  description in _docs/WIDGETS.md with defensive invariants; add no widget/editor surface;
run exact targeted and strict scans without allowlists or ignores;
run five fresh post-audit lenses and resolve every HIGH/MEDIUM/LOW drift;
if a LOW is genuinely non-blocking, create an explicit follow-up task with rationale and
  run one fresh pass before closure; otherwise no unresolved finding may remain;
create changelog 1250 and update indexes only after all descendants/evidence pass;
mark leaves, children, then parent Done in dependency order;
if an unrelated strict-scan finding remains:
  record its owning task and keep program-level strict gate open; do not suppress it.
~~~

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/pages/svg-sanitizer.test.ts \
  tests/vitest/pages/svg-safe-tree.test.ts \
  tests/vitest/pages/page-renderer-v2.test.tsx \
  tests/vitest/pages/page-document-v2.test.ts \
  tests/vitest/pages/page-editor-xss-guards.test.tsx
set -a && source .env && set +a
bun test tests/integration/runtime/pages-runtime.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/pages/svgSanitizerPolicy.ts \
  core/services/pages/svgSanitizer.ts \
  core/services/pages/svgSafeTree.ts \
  core/services/pages/pageRendererV2.tsx
bun run scan:security:strict
bun run gates:coderso
git diff --check
~~~

Re-run any named failing test alone. Record strict-scan output honestly; TASK-538 may not
add an exception for either its source or an unrelated file.

## Closure

Verify the five browser scenario records and `task-538-*` screenshots are present under
`_docs/_workflows/_smoke/`, run fresh post-audits, create changelog 1250, mark every
descendant Done, then close the parent and synchronize task/changelog indexes. TASK-545
will migrate future smoke evidence separately; it is not a prerequisite. TASK-539 must
be told to build on the new renderer seam.

## Completion evidence

The defensive Page/security documentation is synchronized without reproducing a
detailed exploit, and it keeps configurable widgets explicitly Admin Dashboard-only;
`customSvg` remains a Page block. Targeted Semgrep reported zero findings, release
gates passed 5/5, both workflow scripts pass `node --check`, and five fresh post-audit
lenses are clean after one Low stale renderer-leaf grounded source anchor was corrected
and freshly re-audited.
The strict scan ran without a TASK-538 finding or tooling failure; its sole remaining
finding is the unchanged TASK-545-owned workflow-script issue, with no suppression.
