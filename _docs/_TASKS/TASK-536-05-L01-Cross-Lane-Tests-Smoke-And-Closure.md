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
the historical-boundary notices in `_docs/WIDGETS*.md`, `_docs/WIDGET_PACK_MATRIX.md`, and
`_docs/_WIDGETS/*.md`, the contributor boundary in `AGENTS.md`,
the current product-boundary wording in `README.md`, `docs/README.md`,
`_docs/README.md`, `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`, `_docs/ADMIN_CACHE*.md`,
`_docs/CONTENT_EDITOR_UX.md`, `_docs/PAGE_MODEL.md`, `_docs/PREVIEW_SPEC.md`,
the relevant `docs/develop/*` handbook pages, and the `docs/guide/*`
redirects/vocabulary corrections that
keep active guidance on editor-owned sections/blocks and Dashboard-only widgets,
_docs/_TASKS/README.md, changelog 1248, and _docs/_CHANGELOG/README.md. It must not edit
core production source. Read task/changelog indexes fresh immediately before closure.
Source leaves create/update their changed-behavior and compatibility assertions before
their own gates, including creation of
`tests/vitest/services/media-file-trust.test.ts` in TASK-536-01-L01. This leaf owns only
additive cross-leaf/security cases, final read-only reruns of source-owner assertions,
and closure evidence; it must not re-baseline a source leaf to make closure green.

Post-audit source drift is remediated by reopening only the explicit source-owner seams
recorded in TASK-536-01-L01, TASK-536-01-L03, TASK-536-02-L01, TASK-536-04-L01, and
TASK-536-04-L02. This closure leaf
retains ownership of the additive local/S3/Azure handler-level GET/HEAD composition test
and documentation corrections; it does not absorb those production writers.

Paths and test names under `core/widgets` / `tests/vitest/widgets` are historical
implementation names only. Closeout language must describe the existing public Form
block/section runtime and must not add or advertise a non-dashboard widget type,
editor, registry entry, preset, or authoring workflow.

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
  assert HEAD has exact persisted Content-Length; for streamed GET, accept an absent
    runtime-owned length or require that a synthesized value equals persisted size;
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
  force one unmapped executor dependency error with a private marker through the root
  and stripped-admin mounts in non-production mode;
  assert fixed internal_error/500, no details/stack/marker, one fail-safe rate charge,
  and preserved stripped-admin request headers/access-log status.

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
  tests/vitest/forms/formRuntimeResolver.test.ts \
  tests/vitest/forms/submissionAccess.test.ts \
  tests/vitest/forms/submissionNonce.test.ts \
  tests/vitest/server/requestBody.test.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/widgets/contact.test.tsx \
  tests/vitest/widgets/newsletter.test.tsx \
  tests/vitest/services/mediaSchemas.test.ts \
  tests/vitest/services/media-file-trust.test.ts \
  tests/vitest/services/mediaUrlProjection.test.ts \
  tests/vitest/admin/mediaUtils.test.ts \
  tests/vitest/ui/media-picker.test.tsx \
  tests/vitest/ui/media-card.test.tsx \
  tests/vitest/ui/media-details.test.tsx \
  tests/vitest/ui/post-editor-canvas-wave.test.tsx
set -a && source .env && set +a && bun test --parallel=1 --timeout=15000 \
  tests/unit/media/mediaService.test.ts \
  tests/unit/media/mediaMeta.test.ts \
  tests/unit/media/localAdapter.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/backups/backupRemoteStorage.test.ts \
  tests/unit/backups/backupService.test.ts \
  tests/unit/server/publicFormsApi.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/unit/dashboard/dashboardService.test.ts \
  tests/unit/forms/fileSubmission.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/routes/media.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/security/codersoSecurityGate.test.ts
env -u DATABASE_URL bun --no-env-file test --timeout=15000 \
  tests/integration/server/mediaDeliveryAccess.test.ts
./node_modules/.bin/eslint --max-warnings=0 \
  core/widgets/core/formEmbed.tsx core/widgets/core/formRuntimeScript.ts \
  core/widgets/core/contact.tsx core/widgets/core/newsletter.tsx
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/media \
  core/services/dashboard/dashboardService.ts \
  core/services/forms/submissionAccess.ts core/services/forms/formSettings.ts \
  core/services/forms/submissionNonce.ts \
  core/services/forms/fieldSettings.ts core/services/forms/validation.ts \
  core/services/forms/formAttachment.ts core/services/forms/formsService.ts \
  core/server/mediaDelivery.ts core/server/httpServer.ts core/server/requestBody.ts \
  core/server/publicFormsApi.ts core/server/routes/formsRoutes.ts \
  core/server/validation/formSchemas.ts \
  core/admin/services/mediaClient.ts core/admin/ui/media/types.ts \
  core/admin/ui/media/utils.ts core/admin/ui/media/MediaPicker.tsx \
  core/admin/ui/media/MediaDetailsDrawer.tsx \
  core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  core/widgets/core/formEmbed.tsx core/widgets/core/formRuntimeScript.ts \
  core/widgets/core/contact.tsx core/widgets/core/newsletter.tsx
bun run gates:coderso
bun run scan:security:strict
git diff --check
~~~

The task-scoped Semgrep command must pass. Execute the full strict scan as shown. The
current external findings are the Page `customSvg` source sink owned by TASK-538 and the
prompt-only `task-522-author.mjs` interpolation owned by TASK-545-02-L01; record both only
when they remain outside TASK-536's changed trust boundary and the Forms/media scan is
clean. Do not add a suppression, baseline, or allowlist. TASK-538 and TASK-545 rerun their
owned scans, and the final TASK-536–545 gate must make the full strict scan green.

## Runtime smoke

Restart the Bun server and verify admin/front health. Use a TASK-536 named Playwright
session and save screenshots only under `_docs/_workflows/_smoke/` with the filename
prefix `task-536-`. Record scenario IDs, theme/viewport, visible assertions,
console-error results, and screenshot paths in the TASK-536 closeout evidence. TASK-545
is a later workflow migration; its future manifest/path is not a prerequisite for this
earlier task.
Run at least these distinct real flows:

1. required single image: empty submit blocked; the empty status remains a present
   `role=status` accessibility node but is computed absolute/sr-only and adds no field
   gap; upload progress restores normal-flow visible geometry; error switches to the
   visible alert state; clearing/reset returns the same node to neutral sr-only geometry;
   assert this for both helper-bearing and helper-free file fields, including unchanged
   wrapper height/gap while neutral; then a successful upload submits;
2. ordered multiple files: every upload completes and submission preserves order;
3. failed upload: no final submission is sent, the alert is visible, pending action locks
   are released, and retry succeeds without reload;
4. with an authenticated cookie, a public form remains nonce-bound and rejects a byte
   mismatch; an internal-only form renders the existing noninteractive boundary and
   emits no upload/submission request (server integration tests separately prove CSRF);
   a draft/archived public form also renders the unpublished noninteractive boundary,
   contains no nonce or interactive form, and emits no upload/submission request;
5. publish/front delivery: passive image renders; PDF, SVG, text, and unknown-policy
   fixtures download; headers are canonical/nosniff, each GET body has the persisted
   byte length, HEAD exposes exact persisted `Content-Length`, any Bun-synthesized GET
   length is exact, and no control is intercepted.

Cover narrow/wide viewports and light/dark admin surfaces. Assert computed/DOM visible
effects, not only emitted strings. Record zero console errors.

## Documentation and closure

Document the canonical type/disposition matrix, including byte-validated text/plain,
attachment-only SVG/active content, explicitly allowed octet-stream, forbidden markup,
the conservative PDF subset (benign compressed page content allowed; active forms,
encryption, and object streams rejected),
write-time remote-provider metadata as defense-in-depth (the final proxy response neither
trusts nor requires provider metadata), and legacy mismatch attachment policy. Also document the
admin projection boundary: only a canonical passive MIME plus a compatible persisted
server image type becomes an image; SVG stays document/attachment and is excluded from
`image/*` selection unless an exact SVG file MIME is authored. Document persisted Form
submission usage and that the pre-submit upload remains unreferenced until the final
submission stores its media id. Also document the
upload-before-submit UX, strict schema boundary, and one-rate-owner rule without
reproducing a weaponized payload. Explicitly retain or split the existing abandoned-
upload orphan cleanup residual from TASK-516-07.
Reconcile active contributor, developer, and assistant-corpus wording with the
owner-approved product boundary: configurable widgets exist only on Admin Dashboard;
Pages, Page Templates, Forms, Menus, Posts, Custom Screens, and other domain editors
use their own sections/blocks. Historical `core/widgets`, `WidgetBlock`, module-pack,
Widget Library, Widget Template, and Wizard/Visual/Advanced names may remain only as
explicit read/runtime compatibility or historical records. This documentation change
must not create, register, preset, or otherwise expand a non-dashboard widget surface.
Correct the stale `_docs/CMS_API.md` field example that currently places `inputStep` on a
`text` field: the documented example must use `inputStep` only on its real
number/range/time branches and stay byte-compatible with the strict L02 schema corpus.
Correct the stale reject-unknown wording in `_docs/CMS_API.md` and
`_docs/SECURITY_SPEC.md`: fixed unknown keys on write are rejected with
`validation_error`, while only legacy/read normalization remains non-destructive and
fail-soft for already persisted documents. Do not describe write-time unknown keys as
silently dropped.
Correct the post-audit runtime wording in `_docs/CMS_API.md`: pending uploads disable
submit/navigation, while an ordinary upload error renders an accessible alert and
releases the action lock so retry is possible; the final submission remains unsent until
every required upload succeeds. Correct `_docs/CMS_API.md`,
`docs/guide/coderso/forms-list-and-builder.md`, and
`docs/guide/screens/security-settings.md` to match the preserved public-session policy:
an authenticated cookie never bypasses the form nonce, `public_write` charge, or byte
inspection, but the current access evaluator sets `requireCaptcha=false` for that
authenticated public principal. Do not imply that this exception changes internal
session/CSRF or API-key behavior.

After clean post-audits and gates, create changelog 1248, mark every physical descendant
Done, then close the parent and synchronize board/index statistics. Do not close while
any descendant is open or any required scan/smoke is missing.

After the final metadata edit or drift fix, rerun
`node --check _docs/_workflows/task-536-implement.mjs` and `git diff --check`.
The pre-closure validation result does not cover later task/changelog/index edits.
