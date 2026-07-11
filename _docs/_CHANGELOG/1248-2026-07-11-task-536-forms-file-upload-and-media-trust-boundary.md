# 1248 - TASK-536 Forms File Upload and Media Trust Boundary

Date: 2026-07-11
Version: Unreleased
Tasks: TASK-536, TASK-536-01, TASK-536-01-L01, TASK-536-01-L02,
TASK-536-01-L03, TASK-536-02, TASK-536-02-L01, TASK-536-03,
TASK-536-03-L01, TASK-536-03-L02, TASK-536-04, TASK-536-04-L01,
TASK-536-04-L02, TASK-536-05, TASK-536-05-L01

## Key Changes

### Media trust boundary

- Upload and replacement now derive the canonical MIME, extension, delivery policy,
  storage key, and remote-object metadata from validated bytes rather than the client
  filename or multipart declaration. Local, S3, and Azure use the same media-specific
  storage contract; generic backup storage remains unchanged.
- `/media/*` resolves an exact persisted row/key and serves local or remote bytes through
  one server-owned policy. Successful responses use persisted/canonical MIME,
  `X-Content-Type-Options: nosniff`, and safe inline/attachment disposition; legacy
  mismatches fail safe as downloads. GET stays bounded and provider-neutral, while HEAD
  guarantees the persisted length.
- Admin media projections distinguish passive images from attachment-only SVG/PDF/text
  and unknown media. Form-submission usage is visible, and active Post image/gallery
  consumers no longer classify records from a raw MIME prefix.

### Existing Form block/section runtime

- Native file controls upload before final submission, preserve ordered single/multiple
  media IDs, expose accessible progress/error state, block submission while pending, and
  release the action lock after an ordinary failure so the same selection can retry.
- The historical `core/widgets/core/formRuntimeScript.ts` path remains a compatibility
  namespace for existing public Form blocks/sections. No configurable non-dashboard
  widget, editor, registry, preset, module pack, section type, or block type was added;
  configurable widgets remain exclusive to Admin Dashboard.

### Retired Widget compatibility boundary

- The assistant policy now uses the canonical `legacy-maintenance` coverage state for
  the hidden `/admin/advanced/widgets` compatibility route. Provider guidance no longer
  advertises Widget-template create/insert; it retains only reviewed exact-row
  update/delete/block-patch maintenance with the existing permissions and identity
  checks. No route, executor, registry, DB/service, or Dashboard widget behavior changed.

### Forms validation and write security

- Fixed Form/field/settings payloads now use strict reject-unknown schemas and explicit
  normalization. Dynamic submission data remains bounded and is revalidated against the
  resolved field ownership and media contract.
- Both real Forms-write mounts share one prepared executor and exactly one applicable
  rate-limit charge. Public writes retain nonce/captcha policy and byte inspection;
  internal session/API-key writes retain CSRF, RBAC, and scope behavior.
- A narrow canonical `{status, submissionAccess}` projection is checked before body work
  and again before dispatch, so unpublish/access drift fails closed without storage or DB
  mutation. Draft/archived runtime data mints no nonce or interactive form.
- Unknown executor failures are converted to a fixed `internal_error` response at the
  shared boundary, with no raw message, stack, details, or cause in either mount.

## Compatibility and residuals

Existing URLs and DB columns are unchanged; no endpoint, dependency, migration, or
schema-version bump was introduced. Valid legacy documents keep deterministic read
adapters, while new writes reject unknown fixed keys. Abandoned pre-submit upload
cleanup remains the explicit TASK-516-07 residual.

## Validation and smoke

- Core type lint, core lint, root TypeScript, targeted runtime ESLint, 19 Vitest files
  (748/748), 15 Bun/DB files (210/210; 1591 assertions), and the no-DB live media lane
  (30/30; 381 assertions) pass.
- Task-scoped Semgrep is clean, all five Coderso release gates pass, and five independent
  final audit lenses report zero High/Medium/Low TASK-536 drift.
- Final combined tests: Bun 1633 pass, 1 opt-in OpenAI live test skipped, 0 fail; Vitest
  832/832 files and 6552/6552 tests pass. `bun run precommit:check` passes. Two unrelated
  full-load UI timeout flakes passed in isolation and retained every assertion; only their
  local timeout limits were raised to 30 seconds before the green full Vitest rerun.
- Fresh POST-M-07 policy/product and test-integrity audits report zero
  High/Medium/Low findings. The final closure reconcile evidence finding was resolved.
- Real browser smoke used `coderso-dev-core-host` and complete
  `playwright-cli -s=wf536smoke ...` commands against the canonical admin/front hosts,
  with credentials read only from `.env`: 7/7 flows, 8 screenshots, light/dark plus
  wide/narrow coverage, zero console errors, and successful scoped cleanup.
- The full strict scan remains non-zero only for the unchanged Page `customSvg` finding
  owned by TASK-538 and workflow prompt finding owned by TASK-545-02-L01. No scanner
  suppression, baseline, allowlist, or configuration change was made for TASK-536.
