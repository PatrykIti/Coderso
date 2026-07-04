# 1218 - TASK-509 Security Strict Pass & Settings Test Isolation

**Date:** 2026-07-04
**Version:** Unreleased
**Tasks:** TASK-509
**Type:** Security/Dependencies/CI/GitHub Actions/Testing/QA/Docs/Task Board

## Overview

TASK-509 makes `bun run scan:security:strict` GREEN on `feature/visual` and makes
the flaky `settingsService` nullable-id test deterministic. No API routes, RBAC,
DB migrations, schema versions, or product behavior change — the work is a
dependency/scanner-posture pass plus a self-scoped test fixture. The
dependency/scanner-posture changes are governed by the **Security & Dependency
Record** below (owner + reason + exact bumps/overrides + SHA pins + expiry).

## Key Changes

### PART A — Settings test isolation (self-scoped fixture)

- `tests/unit/settings/settingsService.test.ts` → `"site shell reference keys
  accept nullable id strings"` now resets both `site.navigationMenuId` and
  `site.footerTemplateId` to `null` via the SAME production setter
  (`setSetting(key, null)`) at the START of the case, before the initial null
  assertions. The case owns its precondition, so it is deterministic regardless
  of prior pollution (e.g. the exploratory Playwright smoke assigning a site nav
  menu into the shared test DB). No production code changed; the trimmed-value
  round-trip, the `listSettings` reflections, and the null / whitespace-only →
  `null` collapse assertions stay byte-for-byte; sibling cases, `cleanupKeys`,
  and `afterAll` untouched.

### PART B — Dependency remediation (bun audit + trivy HIGH)

- **nodemailer (direct core dep):** `core/package.json` `nodemailer`
  `^7.0.11` → `^9.0.1`; `@types/nodemailer` resolved to `^8.0.1`. Standard API
  usage (no `raw` message option), so the 9.0 API is compatible; the email
  services short-circuit to `mockTransport` under test so behavior is unchanged.
- **Transitive pins (root `package.json` `overrides`):** `ws` `^8.21.0` (via
  `happy-dom`), `undici` `^7.28.0` (via `semantic-release` /
  `@semantic-release/github`), `vite` `^8.0.16` (dev/build), `sigstore` `^4.1.1`
  (minimal fixed `>4.1.0` accepted by `@semantic-release/npm` → `pacote`). The
  existing five overrides (`esbuild ^0.28.1`, `fast-uri ^3.1.2`,
  `fast-xml-builder ^1.1.7`, `fast-xml-parser ^5.5.6`, `flatted ^3.4.2`) are
  retained unchanged. `bun.lock` regenerated via `bun install` (clean resolve).

### PART C — GitHub Actions SHA pinning (semgrep mutable-action-tag)

- Every `uses:` ref in `.github/workflows/coderso-pr-gates.yml` (27) and
  `.github/workflows/release.yml` (9) is pinned to its 40-char commit SHA with a
  trailing `# <tag>` comment so the human-readable version stays visible. This
  clears the 36 `github-actions-mutable-action-tag` blocking findings.
  `github/codeql-action/upload-sarif` keeps its `/upload-sarif` subpath. Only the
  `@<tag>` portion changed — `with:`/`env:`/`run:`/`if:`/job names untouched.

## Security & Dependency Record

- **Ticket:** TASK-509
- **Owner:** patryk0741@gmail.com
- **Reason:** clear `bun run scan:security:strict` (8 `bun audit` HIGH + 6 `trivy`
  HIGH/CRITICAL + 36 `semgrep` `github-actions-mutable-action-tag`) so the strict
  security gate on `feature/visual` is GREEN; no production behavior change,
  backward compatibility preserved.
- **Version bumps (direct):** `core/package.json` `nodemailer` `^7.0.11` →
  `^9.0.1`; `@types/nodemailer` → `^8.0.1`.
- **Overrides added (root `package.json`):** `ws ^8.21.0`, `undici ^7.28.0`,
  `vite ^8.0.16`, `sigstore ^4.1.1` (resolved minimal fixed `>4.1.0`). Existing
  five overrides retained.
- **GitHub Actions SHA pins:** all 27 (`coderso-pr-gates.yml`) + 9
  (`release.yml`) `uses:` refs pinned to their 40-char commit SHAs. Authoritative
  literals: `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4`;
  `github/codeql-action/upload-sarif@54f647b7e1bb85c95cddabcd46b0c578ec92bc1a  # v4`
  (subpath kept).
- **Expiry:** revisit on next dependency-audit wave.

## Testing

- `bun run scan:security:strict` — full strict sweep GREEN (0 `bun audit` HIGH,
  0 `trivy` HIGH/CRITICAL, 0 `semgrep` blocking findings, gitleaks clean).
- `bun test tests/unit/settings/settingsService.test.ts` — green, including the
  fixed nullable-id case both from a clean DB and immediately after the Playwright
  site-nav smoke; sibling cases unchanged.
- Email suites green after the nodemailer `^9` bump
  (`tests/unit/email/emailSettingsService.test.ts`,
  `tests/vitest/email/emailProvider.test.ts`).
- `bun run precommit:check` — core lint + core lint:types + store lint +
  `packages/sdk` tsc + root `tsc -p tsconfig.json --noEmit` all clean.
