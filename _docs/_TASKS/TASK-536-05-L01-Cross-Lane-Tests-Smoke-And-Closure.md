# TASK-536-05-L01: Cross-Lane Tests, Smoke, and Closure

# FileName: TASK-536-05-L01-Cross-Lane-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-05
**Priority:** Critical
**Category:** Tests / Security / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-536-01 through TASK-536-04
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope and ownership

Tests-and-docs-only closure leaf. It may edit the relevant files under tests/, task-
prefixed screenshots named `_docs/_workflows/_smoke/task-536-*`, _docs/MEDIA_SPEC.md, _docs/SECURITY_SPEC.md,
_docs/CMS_API.md, relevant Forms/media user/developer docs, this family’s task statuses,
_docs/_TASKS/README.md, changelog 1248, and _docs/_CHANGELOG/README.md. It must not edit
core production source. Read task/changelog indexes fresh immediately before closure.
Source leaves create/update their changed-behavior and compatibility assertions before
their own gates, including creation of
`tests/vitest/services/media-file-trust.test.ts` in TASK-536-01-L01. This leaf owns only
additive cross-leaf/security cases, final read-only reruns of source-owner assertions,
and closure evidence; it must not re-baseline a source leaf to make closure green.

## Implementation Pseudocode

~~~ts
describe additive cross-layer canonical-media service corpus:
  assert CANONICAL_MEDIA_PROFILES has exactly the nine canonical entries and no aliases;
  for each real binary signature, strict UTF-8 text, standalone SVG, and unknown fixture:
    vary declared MIME and filename;
    expect exact canonical MIME, extension, disposition, persisted row, adapter request;
  assert text/plain remains configurable but attachment-only;
  assert the pure detector classifies byte-safe SVG/unknown without consulting policy;
  assert L03 alone requires effective SVG permission and exact octet-stream allowlisting;
  assert L03 alone maps malformed/forbidden markup/polyglot/mismatch and policy rejection
    to media_mime_not_allowed before storage/DB.

describe delivery:
  seed uniquely owned media rows and objects;
  request GET/HEAD in public/internal modes;
  assert status, auth, Content-Type, Content-Disposition, nosniff, and replayed body;
  assert local/S3/Azure public delivery returns the final 200/HEAD response and never
    a provider redirect or client-visible provider URL;
  assert suffix spoof, absent row, traversal, and legacy mismatch fail safe.

describe form runtime:
  execute static runtime against DOM and mocked fetch;
  select File objects with real signature bytes;
  assert upload request(s) finish before submission;
  assert single string versus ordered string[], required, retry, generation invalidation,
  captcha token per write, hidden-field/progress exclusions, and visible alerts;
  assert exact matching role-attribute identities bind one native input, hidden value,
  and status, while empty/mismatched/duplicate marker triples enter an explicit
  form-invalid state, disable submit/navigation, and never serialize any companion;
  assert an earlier-step malformed triple blocks Next, then a repaired/recomputed single
  registry is threaded unchanged through input/change conditional and progress work,
  Next/Back validation/persistence, submit validation, upload preparation, and final
  serialization; bindingByHidden supplies both trusted identity and multiple shape.

describe public security:
  resetRateLimitBuckets before each case;
  maxRequests=1 allows first request and rejects second;
  exercise anonymous/session/API-key and captcha on/off;
  assert byte canonicalization always executes and CSRF/nonce rules remain.

describe strict schemas:
  inject one unknown key at every fixed nested path;
  expect 400/no persistence;
  round-trip every supported key and dynamic declared submission field.
~~~

DB suites create unique fixtures and delete only their rows/objects. Never truncate a
shared table. Re-run a named failing file once in isolation.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/fileField.test.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/formSettings.test.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/services/mediaSchemas.test.ts \
  tests/vitest/services/media-file-trust.test.ts
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/mediaService.test.ts \
  tests/unit/media/localAdapter.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/backups/backupService.test.ts \
  tests/unit/server/publicFormsApi.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/unit/forms/fileSubmission.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/routes/media.test.ts \
  tests/integration/server/mediaDeliveryAccess.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/media core/server/publicFormsApi.ts core/server/routes/formsRoutes.ts \
  core/widgets/core/formRuntimeScript.ts
bun run gates:coderso
bun run scan:security:strict
~~~

## Runtime smoke

Restart the Bun server and verify admin/front health. Use a TASK-536 named Playwright
session and save screenshots only under `_docs/_workflows/_smoke/` with the filename
prefix `task-536-`. Record scenario IDs, theme/viewport, visible assertions,
console-error results, and screenshot paths in the TASK-536 closeout evidence. TASK-545
is a later workflow migration; its future manifest/path is not a prerequisite for this
earlier task.
Run at least these distinct real flows:

1. required single image: empty submit blocked, upload progress visible, then submit;
2. ordered multiple files: every upload completes and submission preserves order;
3. failed upload: submit remains blocked, alert visible, retry succeeds without reload;
4. with an authenticated cookie, a public form remains nonce-bound and rejects a byte
   mismatch; an internal-only form renders the existing noninteractive boundary and
   emits no upload/submission request (server integration tests separately prove CSRF);
5. publish/front delivery: passive image renders; PDF, SVG, text, and unknown-policy
   fixtures download; headers are canonical/nosniff and no control is intercepted.

Cover narrow/wide viewports and light/dark admin surfaces. Assert computed/DOM visible
effects, not only emitted strings. Record zero console errors.

## Documentation and closure

Document the canonical type/disposition matrix, including byte-validated text/plain,
attachment-only SVG/active content, explicitly allowed octet-stream, forbidden markup,
write-time remote-provider metadata as defense-in-depth (the final proxy response neither
trusts nor requires provider metadata), and legacy mismatch attachment policy. Also document the
upload-before-submit UX, strict schema boundary, and one-rate-owner rule without
reproducing a weaponized payload. Explicitly retain or split the existing abandoned-
upload orphan cleanup residual from TASK-516-07.

After clean post-audits and gates, create changelog 1248, mark every physical descendant
Done, then close the parent and synchronize board/index statistics. Do not close while
any descendant is open or any required scan/smoke is missing.
