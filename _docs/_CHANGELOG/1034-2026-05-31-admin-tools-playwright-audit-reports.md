# 1034 - Admin Tools Playwright audit reports

Date: 2026-05-31
Version: Unreleased
Tasks: TASK-347

## Key Changes

### QA Documentation

- Added a Playwright audit report set for every admin Tools page: Search, SEO
  Manager, Analytics, Backups, Import / Export, and Redirects.
- Documented which UI flows worked, which controls were UI-only or incomplete,
  why each issue happens in source, and the recommended fix path.
- Captured environment constraints from the audit, including the localhost host
  fallback and unavailable Claude CLI authentication.
- Expanded the report set with deeper 2026-06-01 evidence using real fixtures:
  Search page lookup, SEO save/public-page check, Analytics top-content data,
  manual backup creation, Import / Export roundtrip, and public redirect check.
- Added a Claude CLI UX addendum after Claude authentication was restored and
  rerun outside the Codex sandbox against a logged-in Playwright session.
- Recorded the setup finding that the seed-admin path can create unusable
  credentials when `AUTH_PASSWORD_PEPPER` is configured because it bypasses the
  pepper-aware password helper used by login.

## Validation

- Real browser interaction was performed against the local admin UI with
  Playwright.
- Related admin UI, API client, and server route source files were reviewed.
- A follow-up explorer audit found no missing sidebar Tools report coverage or
  required report sections.
- A deeper Playwright pass created/cleaned test fixtures and captured the
  remaining end-to-end failures for SEO runtime output, backup artifacts, and
  public redirects.
- Claude CLI clicked through all Tools routes in a logged-in browser session and
  returned UX findings for Search, SEO Manager, Analytics, Backups, Import /
  Export, and Redirects.
- Passed `git diff --check` after the deep-pass report updates.
- Passed `bun --cwd core lint` and `bun --cwd core lint:types` after the
  deep-pass report updates.
- Passed `git diff --check` and `bun run precommit` after the Claude UX
  addendum.
