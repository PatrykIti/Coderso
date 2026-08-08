# 1260 - TASK-547 Full-Site Package and FormaDom Installer

Date: 2026-07-23
Version: Unreleased
Status: Final — corrective implementation and reclosure completed 2026-08-08.
Tasks: TASK-547, TASK-547-01, TASK-547-01-L01, TASK-547-01-L02,
TASK-547-02, TASK-547-02-L01, TASK-547-02-L02, TASK-547-02-L03,
TASK-547-03, TASK-547-03-L01, TASK-547-03-L02, TASK-547-03-L03,
TASK-547-04, TASK-547-04-L01, TASK-547-04-L02, TASK-547-04-L03,
TASK-547-05, TASK-547-05-L01, TASK-547-06, TASK-547-06-L01, TASK-547-07

## Key Changes

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

## Validation and smoke

- Dependency-shaped implementation gates, core/root type checks and the final
  repository type check passed. The focused TASK-547 shared-runner suite passed
  26/26, including static fast/certification descriptor identity; the concurrent
  CSRF retry regression suite passed 6/6.
- Final certification session `wf547final` passed all 18 ordered product-visible
  scenarios (eight public FormaDom, five Form Design and five Page Editor flows)
  in 220.687 seconds. It produced 18 verified PNGs, reported `serverUp:true`, zero
  console errors and zero scenario failures.
- Cleanup passed with one official rollback, prior settings restored, terminal
  resource-absence proof, five scoped submissions and three action runs deleted,
  and three mutated resource slots restored. The persistent worker handled 23
  requests with one start and zero reconnects (88 bounded statements / 80 rows).
- The final Page Editor flow uses SPA transitions between Page editors, avoiding
  repeated auth bootstrap/rate-limit churn while retaining scenario checkpoints,
  visible-effect assertions and one final exact rollback.

No public endpoint, catalog entry, migration, media import, RBAC/CSRF/rate-limit
change, or alternative configurable widget surface was added.
