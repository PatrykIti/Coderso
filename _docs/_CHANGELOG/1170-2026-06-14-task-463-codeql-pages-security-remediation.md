# 1170 - TASK-463 CodeQL Pages Security Remediation

**Date:** 2026-06-14
**Version:** Unreleased
**Tasks:** TASK-463
**Type:** Security/Pages/Dependencies/QA/Docs

## Key Changes

### Security

- Closed the Pages CodeQL alerts for DOM text reinterpreted as HTML, insecure
  Page document ID randomness, and incomplete HTML comment sanitization.
- Removed `dangerouslySetInnerHTML` from Page embed rendering; sanitized embed
  markup now renders as tokenizer-derived React nodes.
- Forced transitive `esbuild` resolution to the fixed `0.28.1` line and
  refreshed `bun.lock`, clearing the high dependency advisory from Bun audit and
  Trivy.

### Pages

- Page v2 block and section IDs now use Web Crypto only and fail closed when
  secure randomness is unavailable.
- Duplicate page slug suffixes now use the same secure random fragment helper.
- Inline edit commits drop complete and unterminated HTML comments before tag
  stripping, keeping the stored Page document text-only.
- The `_docs/UI` Pages editor prototype now builds dynamic layer rows with DOM
  nodes and `textContent` instead of interpolating section names into HTML.

### Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-renderer-v2.test.tsx`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/pages/pageService.test.ts`
- focused Semgrep on reported files (`0 findings`)
- `bun audit --audit-level high`
- Trivy lockfile CVE scan (`0 vulnerabilities`)
- `bun run scan:security:strict`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`
- `bun --cwd core build:admin`

Local CodeQL CLI was not available on `PATH`; GitHub CodeQL remains the final
confirmation for the exact code-scanning alerts.
