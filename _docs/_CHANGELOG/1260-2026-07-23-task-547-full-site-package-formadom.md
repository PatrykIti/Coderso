# 1260 - TASK-547 Full-Site Package and FormaDom Installer

Date: 2026-07-23
Version: Unreleased
Status: Draft — reserved for TASK-547; reopened validation is in progress and this
file is not completion or release evidence.
Tasks: TASK-547, TASK-547-01, TASK-547-01-L01, TASK-547-01-L02,
TASK-547-02, TASK-547-02-L01, TASK-547-02-L02, TASK-547-02-L03,
TASK-547-03, TASK-547-03-L01, TASK-547-03-L02, TASK-547-03-L03,
TASK-547-04, TASK-547-04-L01, TASK-547-04-L02, TASK-547-04-L03,
TASK-547-05, TASK-547-05-L01, TASK-547-06, TASK-547-06-L01, TASK-547-07

## Key Changes (draft implementation summary)

### Package and lifecycle contract

- Added strict, versioned full-site package normalization with ten native
  resource collections, closed `{ ref, key }` paths, bounded diagnostics and
  limits, duplicate/missing-reference rejection, and deterministic DAG order.
- Split the legacy installer by responsibility and introduced one exported
  ledger port shared by legacy and full-site execution. Managed ownership now
  requires a successful, non-rolled-back run with the same native snapshot ID;
  natural-key equality alone is an unmanaged conflict.
- Added native preflight/adapters, draft-first publication, shell-settings-last
  saga execution, reverse compensation, exact-run rollback, supersession/drift
  rejection, and restoration of the preceding active owner after later rollback.
- Added the strict explicit-actor CLI for `--dry-run`, `--apply`, and
  `--rollback`, bounded JSON errors, scoped setting-takeover acknowledgement,
  and deterministic database-pool shutdown.

### FormaDom complete-site example

- Added the canonical `formadom-studio` generator and JSON artifact: seven Polish
  Page v2 documents, six house-project entries, listing query/template, detail
  page, content route, contact Form action, primary Menu, footer Page Template,
  design tokens, and site-shell settings.
- Public Page and detail rendering now propagate the configured string locale.
  The generated package intentionally excludes favicon/media imports because
  no asset/media package resource kind exists.
- Added dependency-shaped Bun/DB and Vitest suites for schema/ref graph, planner,
  adapters, atomicity, lifecycle, rollback, generator zero-diff, content,
  listing/detail/forms, Page/Menu/shell, locale, and CLI behavior.

## Validation and smoke (pending)

- Fresh targeted and full validation, the five sequential audit rounds, final
  reconcile, independent post-audit lenses, strict security scan, production
  site build, exact eight-scenario Playwright smoke, rollback equality and scoped
  cleanup remain pending on the corrected final working tree.
- All earlier final counts, pass claims, screenshot hashes and cleanup claims
  were invalidated when TASK-547 was reopened on 2026-07-23 and are intentionally
  omitted from this draft. They must be replaced only by newly observed evidence
  before this entry is indexed or any TASK-547 file is closed.

No public endpoint, catalog entry, migration, media import, RBAC/CSRF/rate-limit
change, or alternative configurable widget surface was added.
