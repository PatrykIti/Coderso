# TASK-238: GitHub CodeQL Security Findings Remediation
# FileName: TASK-238_GitHub_CodeQL_Security_Findings_Remediation.md

**Priority:** High
**Category:** Security + CodeQL + CI
**Estimated Effort:** Large
**Dependencies:** TASK-217, TASK-231, TASK-234, TASK-235
**Status:** Done (2026-04-29)

---

## Overview

Remediate every open GitHub CodeQL code-scanning alert created after enabling
GitHub security scanning for `PatrykIti/Coderso`.

Inventory was captured on 2026-04-29 from the current `fix/security-issues`
branch with:

```bash
gh api -H 'Accept: application/vnd.github+json' \
  '/repos/PatrykIti/Coderso/code-scanning/alerts?state=open&per_page=100'
gh api -H 'Accept: application/vnd.github+json' \
  '/repos/PatrykIti/Coderso/secret-scanning/alerts?state=open&per_page=100'
gh api -H 'Accept: application/vnd.github+json' \
  '/repos/PatrykIti/Coderso/dependabot/alerts?state=open&per_page=100'
```

Initial GitHub state:

- CodeQL open alerts: 21.
- Secret scanning open alerts: 0.
- Dependabot alerts API: disabled for this repository and returns HTTP 403
  with a request for `admin:repo_hook` scope. This task does not claim
  Dependabot closure until Dependabot alerts are enabled and queried.

Closure GitHub state captured on 2026-04-29:

- CodeQL open alerts: 0.
- Secret scanning open alerts: 0.
- Dependabot alerts API: still disabled for this repository and returns HTTP
  403 with a request for `admin:repo_hook` scope. Dependabot alert closure is
  not claimed by this remediation.

Non-goals:

- Do not dismiss CodeQL alerts as false positive unless a leaf proves that the
  remaining alert is not exploitable and records owner, reason, expiry, and
  task id.
- Do not weaken scanner workflows, CodeQL upload, Semgrep, Trivy, or Gitleaks.
- Do not replace runtime/editor sanitization with browser-only behavior that
  breaks Bun/server rendering.

## CodeQL Alert Inventory

| Alert | Severity | Rule | File | Line | Owner Leaf | Required Fix |
|---|---|---|---|---|---|---|
| [22](https://github.com/PatrykIti/Coderso/security/code-scanning/22) | Medium | `actions/missing-workflow-permissions` | `.github/workflows/testing-lanes.yml` | 58 | TASK-238-01 | Add explicit least-privilege workflow/job permissions. |
| [21](https://github.com/PatrykIti/Coderso/security/code-scanning/21) | Medium | `actions/missing-workflow-permissions` | `.github/workflows/testing-lanes.yml` | 18 | TASK-238-01 | Add explicit least-privilege workflow/job permissions. |
| [20](https://github.com/PatrykIti/Coderso/security/code-scanning/20) | Medium | `actions/missing-workflow-permissions` | `.github/workflows/coderso-release-gates.yml` | 17 | TASK-238-01 | Add explicit least-privilege workflow/job permissions. |
| [19](https://github.com/PatrykIti/Coderso/security/code-scanning/19) | Medium | `js/prototype-pollution-utility` | `core/services/content/queryBuilderService.ts` | 359 | TASK-238-02 | Harden field path writes against reserved object path segments. |
| [18](https://github.com/PatrykIti/Coderso/security/code-scanning/18) | High | `js/incomplete-url-substring-sanitization` | `core/services/posts/runtime/postBlockRuntimeMapper.ts` | 107 | TASK-238-03 | Replace substring host checks with exact host/subdomain validation. |
| [17](https://github.com/PatrykIti/Coderso/security/code-scanning/17) | High | `js/incomplete-url-substring-sanitization` | `core/admin/ui/posts/editor/PostEditorCanvas.tsx` | 156 | TASK-238-03 | Reuse the same exact video URL parser in the editor preview. |
| [16](https://github.com/PatrykIti/Coderso/security/code-scanning/16) | High | `js/bad-tag-filter` | `tests/vitest/widgets/renderer.test.tsx` | 376 | TASK-238-04 | Remove the broad HTML comment/tag filtering regex from the test helper. |
| [15](https://github.com/PatrykIti/Coderso/security/code-scanning/15) | High | `js/double-escaping` | `core/services/posts/runtime/postRichTextReactRenderer.tsx` | 37 | TASK-238-04 | Centralize entity decoding so it is single-pass and shared. |
| [14](https://github.com/PatrykIti/Coderso/security/code-scanning/14) | High | `js/double-escaping` | `core/services/posts/editor/postRichTextSerializer.ts` | 13 | TASK-238-04 | Centralize entity decoding so it is single-pass and shared. |
| [13](https://github.com/PatrykIti/Coderso/security/code-scanning/13) | High | `js/double-escaping` | `core/admin/ui/posts/editor/blocks/blockTransforms.ts` | 27 | TASK-238-04 | Reuse shared rich-text entity/plain-text helpers. |
| [12](https://github.com/PatrykIti/Coderso/security/code-scanning/12) | High | `js/incomplete-multi-character-sanitization` | `tests/vitest/widgets/renderer.test.tsx` | 376 | TASK-238-04 | Replace broad comment stripping with a narrow deterministic assertion/helper. |
| [11](https://github.com/PatrykIti/Coderso/security/code-scanning/11) | High | `js/incomplete-multi-character-sanitization` | `core/widgets/core/richTextSection.tsx` | 312 | TASK-238-04 | Replace chained sanitizer regex passes with safe tokenizer/helper flow. |
| [10](https://github.com/PatrykIti/Coderso/security/code-scanning/10) | High | `js/incomplete-multi-character-sanitization` | `core/widgets/core/richTextSection.tsx` | 312 | TASK-238-04 | Same sanitizer owner as alert 11. |
| [9](https://github.com/PatrykIti/Coderso/security/code-scanning/9) | High | `js/incomplete-multi-character-sanitization` | `core/widgets/core/richTextSection.tsx` | 312 | TASK-238-04 | Same sanitizer owner as alert 11. |
| [8](https://github.com/PatrykIti/Coderso/security/code-scanning/8) | High | `js/incomplete-multi-character-sanitization` | `core/widgets/core/richTextSection.tsx` | 258 | TASK-238-04 | Replace raw tag-stripping helper with shared plain-text extraction. |
| [7](https://github.com/PatrykIti/Coderso/security/code-scanning/7) | High | `js/incomplete-multi-character-sanitization` | `core/services/posts/editor/postRichTextSanitizer.ts` | 203 | TASK-238-04 | Replace event-handler stripping regex with attribute allowlist parsing only. |
| [6](https://github.com/PatrykIti/Coderso/security/code-scanning/6) | High | `js/incomplete-multi-character-sanitization` | `core/services/posts/editor/postRichTextSanitizer.ts` | 200 | TASK-238-04 | Replace comment/null cleaning with safe single-purpose helper flow. |
| [5](https://github.com/PatrykIti/Coderso/security/code-scanning/5) | High | `js/incomplete-multi-character-sanitization` | `core/services/posts/editor/postRichTextSanitizer.ts` | 162 | TASK-238-04 | Replace forbidden-element stripping regex with tokenizer/parser removal. |
| [4](https://github.com/PatrykIti/Coderso/security/code-scanning/4) | High | `js/incomplete-multi-character-sanitization` | `core/services/posts/editor/postRichTextSanitizer.ts` | 162 | TASK-238-04 | Same sanitizer owner as alert 5. |
| [3](https://github.com/PatrykIti/Coderso/security/code-scanning/3) | High | `js/incomplete-multi-character-sanitization` | `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` | 526 | TASK-238-04 | Replace clear-formatting tag regexes with DOM/tree-based inline unwrap. |
| [2](https://github.com/PatrykIti/Coderso/security/code-scanning/2) | High | `js/incomplete-multi-character-sanitization` | `core/admin/ui/posts/editor/blocks/blockTransforms.ts` | 51 | TASK-238-04 | Replace broad tag stripping with shared plain-text extraction. |

## Sub-Tasks

- [x] TASK-238-01: Workflow Least-Privilege Permissions
- [x] TASK-238-02: Listing Query Path Hardening
- [x] TASK-238-03: Video Embed Host Validation
- [x] TASK-238-04: Rich Text Sanitizer and Entity Hardening
- [x] TASK-238-05: CodeQL Verification, Docs, and Closure

## Implementation Order

1. Apply TASK-238-01 first because workflow permissions are isolated and
   should make the GitHub code-scanning workflow posture explicit.
2. Apply TASK-238-02 next because it is a small domain hardening change with a
   focused Bun unit test.
3. Apply TASK-238-03 after that, extracting the duplicated YouTube URL parsing
   into one pure helper before changing runtime/editor callers.
4. Apply TASK-238-04 last among code changes because rich-text sanitization is
   shared across editor, runtime rendering, widgets, and tests.
5. Finish with TASK-238-05 after a PR check run exists, so the closure notes can
   reference fresh GitHub CodeQL evidence.

## Security Contract

- Visibility: engineering/security remediation across CI, admin editor, runtime
  rendering, widget rendering, and listing query execution.
- Auth model: no auth model changes are expected.
- RBAC: no RBAC model changes are expected.
- CSRF: not applicable; no route write contract should change.
- Rate-limit bucket: not applicable unless implementation discovers a route
  change is required, which must then get its own explicit route security
  contract.
- Reject-unknown validation: listing query validation must continue rejecting
  unknown/unsafe field paths before execution; rich-text sanitizer must continue
  attribute allowlisting.
- Anti-abuse:
  - do not rely on substring URL checks for trusted hosts,
  - do not use chained escaping/decoding that can transform attacker-controlled
    text more than once,
  - do not use broad regex tag filters as the only sanitizer boundary,
  - do not weaken GitHub workflow permissions beyond the minimum required by
    checkout, setup, test, and artifact upload steps.
- Secret handling: no secrets may be added to workflow logs, browser storage,
  rendered HTML, or task documentation.

## Testing Requirements

Run targeted validation for each leaf before closure:

```bash
bun test tests/unit/security
bun test tests/unit/content/queryBuilderService.test.ts
bun run test:vitest -- tests/vitest/posts/post-block-runtime-renderer.test.tsx
bun run test:vitest -- tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx
bun run test:vitest -- tests/vitest/posts/post-richtext-serializer.test.ts tests/vitest/posts/post-richtext-react-renderer.test.tsx
bun run test:vitest -- tests/vitest/posts/post-block-transforms.test.ts tests/vitest/ui-dom/post-richtext-clear-formatting.test.tsx
bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/renderer.test.tsx
bun --cwd core lint
bun --cwd core lint:types
bun run scan:semgrep:strict
bun run scan:trivy:strict
bun run scan:gitleaks:strict
git diff --check
```

If local scanner CLIs are unavailable, run all available tests locally and let
the PR `security-gate` workflow provide final Semgrep/Trivy/Gitleaks evidence.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-238*.md`
- `_docs/SECURITY_SPEC.md` only if scanner policy, workflow permission policy,
  sanitizer policy, or any exception/allowlist changes.
- `_docs/_CHANGELOG/README.md` and a new changelog entry when TASK-238 closes.

## Acceptance Criteria

1. All 21 CodeQL alerts listed in this task are fixed by code/workflow changes
   or have a documented, narrow false-positive disposition.
2. GitHub CodeQL no longer reports open alerts for the affected branch after PR
   checks complete.
3. Secret scanning remains at 0 open alerts.
4. Dependabot alert availability is checked again; if still disabled, closure
   notes explicitly say that Dependabot was not part of this remediation.
5. Runtime/editor rich-text behavior remains backward compatible for currently
   supported markup, allowed attributes, images, links, and plain-text output.
6. Workflow permissions remain least-privilege and do not add write scopes to
   testing or release-gate workflows.
7. Targeted Bun/Vitest suites, lint, typecheck, and available security scanners
   pass or are recorded with a clear CI-only validation gap.

## Progress Notes

- 2026-04-29: Created task family from live GitHub CodeQL inventory on
  `fix/security-issues`.
- 2026-04-29: Implemented local remediation for workflow permissions, listing
  query path guards, YouTube host validation, and rich-text sanitizer/entity
  handling. Local targeted Bun/Vitest, lint, typecheck, Bun audit, Semgrep,
  Trivy, and Gitleaks validation passed.
- 2026-04-29: Renumbered the CodeQL remediation family from `TASK-237` to
  `TASK-238` so the already-closed GHCR Docker image lowercase task can keep
  `TASK-237`.
- 2026-04-29: Re-queried GitHub security state: open CodeQL alerts `0`, open
  secret-scanning alerts `0`, Dependabot alerts still disabled with HTTP 403.
  Closed the task family with changelog entry `770`.
