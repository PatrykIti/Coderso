# TASK-463: CodeQL Pages Security Remediation
# FileName: TASK-463_CodeQL_Pages_Security_Remediation.md

**Priority:** High
**Category:** Security + CodeQL + Pages + Editor
**Estimated Effort:** Small
**Dependencies:** TASK-422, TASK-462
**Status:** ✅ Done
**Started:** 2026-06-14
**Completed:** 2026-06-14

---

## Overview

Remediate the three high-severity CodeQL alerts reported for the Pages editor
and Page v2 contracts:

- `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html`: DOM text
  reinterpreted as HTML in the prototype layer list.
- `core/services/pages/pageDocumentV2.ts`: insecure `Math.random()` fallback in
  Page document section/block ID generation.
- `core/services/pages/pageInlineEditContract.ts`: incomplete multi-character
  sanitization for HTML comments in inline-edit plain-text commits.

Also remediate the blocking `bun run scan:security:strict` findings reported
for the same branch:

- Semgrep `react-dangerouslysetinnerhtml` on Page v2 embed rendering.
- `bun audit`/Trivy high advisory `GHSA-gv7w-rqvm-qjhr` for transitive
  `esbuild`.

## Sub-Tasks

- Replace prototype layer rendering with DOM node construction and `textContent`
  for section names.
- Replace Page document ID fallback randomness with Web Crypto only
  (`randomUUID` or `getRandomValues`) and fail closed when secure randomness is
  unavailable.
- Replace the adjacent duplicate-page slug suffix randomness with the same
  secure fragment helper.
- Replace regex-only HTML comment stripping in the inline-edit sanitizer with a
  fixpoint-safe scanner that removes complete and unterminated comments before
  tag stripping.
- Render sanitized Page embed HTML as React nodes from the existing tokenizer
  instead of using `dangerouslySetInnerHTML`.
- Pin transitive `esbuild` resolution to the fixed `0.28.1` line through the
  existing package override mechanism and refresh `bun.lock`.
- Add focused regression tests for secure ID fallback behavior and inline-edit
  comment sanitization, plus sanitized embed rendering.
- Update security/task/changelog documentation.

## Implementation Pseudocode

```ts
function createPageDocumentId(prefix) {
  const crypto = globalThis.crypto;
  if (crypto.randomUUID) return `${prefix}_${compactUuid(crypto.randomUUID())}`;
  if (crypto.getRandomValues) return `${prefix}_${hex(cryptoBytes).slice(0, 12)}`;
  throw new PageDocumentError("page_document_invalid", "...", "id");
}

function stripHtmlComments(raw) {
  scan from left to right:
    append text before "<!--"
    if "-->" is missing, drop the rest
    otherwise continue after the closing marker
}

function syncLayers() {
  layer.append(static icon);
  layer.append(document.createTextNode(section.dataset.name ?? ""));
  layer.append(eye);
}

function renderSanitizedEmbedHtml(html) {
  tokenize sanitized html;
  decode text tokens into React text nodes;
  map allowed tags and sanitized anchor attributes to React elements;
}
```

Data flow:

- Page IDs remain deterministic in shape (`sec_`/`blk_` + 12 lowercase hex
  characters) but are generated only from cryptographically secure browser or
  runtime primitives.
- Duplicate page slugs keep the existing `-copy-<suffix>` shape, but the
  suffix is now a secure hex fragment.
- Inline edit commits continue to store plain text only; comments and markup are
  removed before the value re-enters the Page document.
- Page embed blocks continue to sanitize custom inline markup through
  `sanitizePageEmbedHtml`, but the render path now emits React nodes instead of
  a raw HTML sink.
- The prototype HTML keeps the same visual layer row output while avoiding
  dynamic HTML interpolation.

Error handling:

- If a runtime lacks Web Crypto, `createPageDocumentId` throws a
  `PageDocumentError` instead of silently producing weak IDs.
- Unterminated HTML comments are treated as attacker-controlled hidden tail
  content and are dropped through end-of-string.
- Unsafe or unsupported embed tokens remain absent because the tokenizer-based
  React renderer only consumes the already sanitized allowlist output.

## Security Contract

No API routes are added or changed.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged; Page document writes still normalize
  through `pageDocumentV2`.
- Anti-abuse: inline-edit commits remain text-only and fail closed for comment
  injection; Page IDs no longer use insecure randomness fallback; embed markup
  no longer uses a raw HTML sink.
- Secret handling: unchanged; no secrets are added to browser state or docs.

## Testing Requirements

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-document-v2.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run scan:security:strict`
- Local CodeQL CLI when available; otherwise GitHub CodeQL remains the final
  confirmation for the exact code-scanning alerts.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1170-2026-06-14-task-463-codeql-pages-security-remediation.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-06-14)

- Replaced the prototype layer `innerHTML` interpolation with DOM node
  construction and `textContent`.
- Replaced Page v2 ID fallback randomness with Web Crypto-only generation:
  `randomUUID` first, `getRandomValues` fallback, fail-closed without secure
  randomness.
- Added a pure secure-random fragment helper and reused it for duplicate page
  slug suffixes.
- Replaced regex-only inline edit markup cleanup with scanner/token handling
  that drops complete and unterminated HTML comments, dangerous element content,
  element-shaped tags, and remaining raw angle brackets so malformed or
  reassembled `<script` openers cannot survive as text destined for later DOM
  rendering.
- Removed `dangerouslySetInnerHTML` from Page embed rendering; sanitized embed
  HTML now renders through tokenizer-derived React nodes.
- Added root `overrides.esbuild = ^0.28.1` and refreshed `bun.lock`, clearing
  `GHSA-gv7w-rqvm-qjhr` from Bun audit and Trivy lockfile scans.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-renderer-v2.test.tsx` (`111 pass`, `0 fail`)
  - `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/pages/pageService.test.ts` (`5 pass`, `0 fail`)
  - focused Semgrep on reported files (`0 findings`)
  - `bun audit --audit-level high`
  - Trivy lockfile CVE scan (`0 vulnerabilities`)
  - `bun run scan:security:strict` (`all scanners completed cleanly`)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run check:admin-boundary`
  - `bun --cwd core build:admin`
- Local CodeQL CLI was not available on `PATH`; GitHub CodeQL remains the final
  confirmation for the exact code-scanning alerts.
