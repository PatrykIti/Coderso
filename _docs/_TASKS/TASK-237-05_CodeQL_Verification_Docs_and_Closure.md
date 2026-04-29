# TASK-237-05: CodeQL Verification, Docs, and Closure
# FileName: TASK-237-05_CodeQL_Verification_Docs_and_Closure.md

**Priority:** High
**Category:** Security + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-237-01, TASK-237-02, TASK-237-03, TASK-237-04
**Status:** In Progress (2026-04-29)

---

## Overview

Close the TASK-237 security remediation family after the implementation leaves
land and a fresh GitHub PR check run has produced code-scanning evidence.

This leaf owns final local validation, GitHub alert verification, docs updates,
task-board status, and changelog entries.

## Verification Inventory

| Area | Command or Evidence | Expected Result |
|------|---------------------|-----------------|
| Local workflow/config tests | `bun test tests/unit/security` | Permission and scanner workflow tests pass. |
| Listing query hardening | `bun test tests/unit/content/queryBuilderService.test.ts` | Unsafe field paths cannot pollute prototypes. |
| Video host validation | Focused Vitest post runtime/editor suites | Trusted YouTube URLs work; lookalike hosts fail closed. |
| Rich-text hardening | Focused Vitest serializer/runtime/widget/editor suites | Sanitized behavior remains compatible and unsafe payloads are blocked. |
| Lint/types | `bun --cwd core lint`, `bun --cwd core lint:types` | No lint/type regressions. |
| Local scanners | `bun run scan:semgrep:strict`, `bun run scan:trivy:strict`, `bun run scan:gitleaks:strict` | No strict scanner findings, or CI-only gap is documented. |
| GitHub CodeQL | `gh api .../code-scanning/alerts?state=open` | No remaining open alerts for the TASK-237 files/rules after PR checks. |
| Secret scanning | `gh api .../secret-scanning/alerts?state=open` | Still 0 open alerts. |
| Dependabot | `gh api .../dependabot/alerts?state=open` | Either enabled and clean/inventoried, or still disabled and documented. |

## Sub-Tasks

- [ ] Run the full targeted validation matrix from the umbrella task.
- [ ] Push/PR the branch and wait for CodeQL/security workflows to complete.
- [ ] Query GitHub code-scanning alerts with `gh api` and record the remaining
  alert count in the changelog.
- [ ] Re-query secret-scanning alerts.
- [ ] Re-query Dependabot alerts and record whether Dependabot is enabled.
- [ ] Move TASK-237 and child leaves to `Done` only after alert closure is
  proven or false-positive dispositions are documented.
- [ ] Add a changelog entry and update `_docs/_CHANGELOG/README.md`.
- [ ] Update `_docs/SECURITY_SPEC.md` if scanner behavior, sanitizer policy, or
  workflow permission policy changed.

## Implementation Pseudocode

Local validation runner shape:

```bash
set -euo pipefail

bun test tests/unit/security
bun test tests/unit/content/queryBuilderService.test.ts
bun run test:vitest -- tests/vitest/posts/post-block-runtime-renderer.test.tsx
bun run test:vitest -- tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx
bun run test:vitest -- tests/vitest/posts/post-richtext-serializer.test.ts tests/vitest/posts/post-richtext-react-renderer.test.tsx
bun run test:vitest -- tests/vitest/posts/post-block-transforms.test.ts tests/vitest/ui-dom/post-richtext-clear-formatting.test.tsx
bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/renderer.test.tsx
bun --cwd core lint
bun --cwd core lint:types
git diff --check
```

Scanner fallback shape:

```bash
if command -v semgrep >/dev/null; then
  bun run scan:semgrep:strict
else
  echo "semgrep unavailable locally; security-gate CI owns final evidence"
fi

if command -v trivy >/dev/null; then
  bun run scan:trivy:strict
else
  echo "trivy unavailable locally; security-gate CI owns final evidence"
fi

if command -v gitleaks >/dev/null; then
  bun run scan:gitleaks:strict
else
  echo "gitleaks unavailable locally; security-gate CI owns final evidence"
fi
```

GitHub evidence capture shape:

```bash
open_codeql_alerts="$(
  gh api -H 'Accept: application/vnd.github+json' \
    '/repos/PatrykIti/Coderso/code-scanning/alerts?state=open&per_page=100' \
    --jq '.[] | select(.most_recent_instance.location.path | test("testing-lanes|coderso-release-gates|queryBuilderService|postBlockRuntimeMapper|PostEditorCanvas|postRichText|richTextSection|renderer.test")) | [.number, (.rule.security_severity_level // .rule.severity), .rule.id, .most_recent_instance.location.path, .most_recent_instance.location.start_line] | @tsv'
)"

if [ -n "$open_codeql_alerts" ]; then
  printf '%s\n' "$open_codeql_alerts"
  exit 1
fi

secret_count="$(
  gh api -H 'Accept: application/vnd.github+json' \
    '/repos/PatrykIti/Coderso/secret-scanning/alerts?state=open&per_page=100' \
    --jq 'length'
)"

if [ "$secret_count" != "0" ]; then
  echo "Secret scanning has $secret_count open alert(s); do not paste secret values."
  exit 1
fi
```

Dependabot evidence shape:

```bash
if dependabot_count="$(
  gh api -H 'Accept: application/vnd.github+json' \
    '/repos/PatrykIti/Coderso/dependabot/alerts?state=open&per_page=100' \
    --jq 'length'
)"; then
  echo "Dependabot open alerts: $dependabot_count"
else
  echo "Dependabot alerts are disabled or inaccessible; record this in changelog."
fi
```

Closure edit shape:

```md
## Changelog evidence

- Local validation: paste command list and pass/fail status.
- GitHub CodeQL: record remaining TASK-237 alert count after PR checks.
- Secret scanning: record open alert count only, never secret values.
- Dependabot: record enabled/disabled state and count if available.
```

## Security Contract

- Visibility: security QA and repository governance.
- Auth model: GitHub CLI uses the developer's authenticated account; workflow
  auth scopes are not changed by this leaf.
- RBAC: GitHub security evidence should be read-only except for PR status.
- CSRF: not applicable.
- Rate-limit bucket: GitHub API only.
- Reject-unknown validation: not applicable.
- Anti-abuse: do not close/dismiss alerts manually unless a false-positive
  record includes owner, reason, expiry, and task id.
- Secret handling: do not paste secret values from secret-scanning output into
  docs, changelog, task files, or PR text.

## Testing Requirements

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

GitHub verification commands after PR checks:

```bash
gh api -H 'Accept: application/vnd.github+json' \
  '/repos/PatrykIti/Coderso/code-scanning/alerts?state=open&per_page=100' \
  --jq '.[] | [.number, (.rule.security_severity_level // .rule.severity), .rule.id, .most_recent_instance.location.path, .most_recent_instance.location.start_line] | @tsv'

gh api -H 'Accept: application/vnd.github+json' \
  '/repos/PatrykIti/Coderso/secret-scanning/alerts?state=open&per_page=100' \
  --jq 'length'

gh api -H 'Accept: application/vnd.github+json' \
  '/repos/PatrykIti/Coderso/dependabot/alerts?state=open&per_page=100' \
  --jq 'length'
```

## Documentation Updates Required

- `_docs/_TASKS/TASK-237*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/*task-237-github-codeql-security-findings-remediation.md`
- `_docs/SECURITY_SPEC.md` only if implementation changes scanner or sanitizer
  policy.

## Acceptance Criteria

1. TASK-237 and all child leaves are moved to `Done` with dates.
2. Changelog records local validation and GitHub CodeQL alert status.
3. GitHub CodeQL alert inventory is clean for TASK-237 or each remaining alert
   has a documented false-positive disposition.
4. Secret scanning remains clean.
5. Dependabot state is checked and explicitly recorded.
6. Task board statistics are synchronized.

## Progress Notes

- 2026-04-29: Local targeted Bun/Vitest, lint, typecheck, Bun audit, Semgrep,
  Trivy, and Gitleaks validation passed. GitHub CodeQL verification remains
  pending until PR checks run on the branch.
