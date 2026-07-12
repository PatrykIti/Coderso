# TASK-536: Forms File Upload and Media Trust Boundary

# FileName: TASK-536_Forms_File_Upload_and_Media_Trust_Boundary.md

**Priority:** Critical
**Category:** Forms / Media / Public Runtime / Security
**Estimated Effort:** Large
**Dependencies:** TASK-516, TASK-512
**Status:** ✅ Done
**Completed:** 2026-07-11
**Changelog:** 1248

---

## Overview

The post-merge audit confirmed that the public Forms `file` field does not upload
the selected file, while the media boundary trusts client-controlled MIME/name
information at points that influence the stored key and delivery headers. It also
confirmed that content inspection is incorrectly coupled to captcha state, the
public adapter and route handler can charge one request twice, and nested field/
form settings are not strict at every level.

This family closes the full upload-to-submission chain without adding an endpoint,
schema migration, dependency, or weaker fallback. The existing URLs remain
`POST /forms/:id/uploads`, `POST /forms/:id/submissions`, and `/media/*`.
The private audit contains exploit reproduction material; this tracked contract
intentionally records only the defensive invariants and test categories.

The repository's historical `core/widgets` namespace does not change the product model:
the touched Form renderers are existing public page blocks/sections, not dashboard
widgets and not a new general widget-authoring surface. This task may repair their
rendered DOM/runtime compatibility only. It must not add a non-dashboard widget type,
editor/wizard/visual control, registry/module-pack entry, preset, or authoring workflow.
Closure also reconciles active contributor/product documentation that contradicted
this owner-confirmed boundary. Historical implementation records remain readable but
must be explicitly labeled compatibility-only; this documentation cleanup does not
authorize unrelated source changes.

## Fixed decisions and invariants

- Bytes, not the multipart filename or declared `Content-Type`, determine the
  canonical content identity used for persistence and storage-key extension.
- The same byte-signature policy applies to create and replace. Its explicit
  MIME→extension→inline/attachment matrix covers supported images, PDF/SVG/text,
  active formats, unknown bytes, and deterministic legacy mismatches.
- The original filename remains display metadata only. It never determines a
  public response type or executable storage suffix.
- Content inspection/canonicalization runs for every upload. Captcha controls
  bot protection only; it never enables or disables media validation.
- Inline delivery is allowlisted to passive, byte-verified types. Active,
  ambiguous, legacy-unsafe, or unknown types use safe attachment semantics.
- Every core and remote delivery path emits/retains the canonical MIME policy,
  `X-Content-Type-Options: nosniff`, and the correct `Content-Disposition`.
- The runtime uploads before submission, writes only returned owned media IDs to
  the named hidden input, honors `required` and `multiple`, and cannot send the
  final submission while uploads are pending. An ordinary upload failure releases
  action locks for retry while the final request remains unsent until retry succeeds.
- Exactly one layer owns the `public_write` charge per public request.
- A new public upload/submission may cross authorization only when the server-owned form
  is observed as both `published` and `submissionAccess=public`. Draft/archived runtime projection mints no
  nonce, including preview projection. The executor's narrow current-state read is the
  authorization linearization point immediately before dispatch: a state change observed
  there rejects a stale nonce, while a later change does not retroactively cancel an
  already authorized in-flight request.
- Nested request objects are reject-unknown. No normalizer silently launders
  unknown field/settings keys through a looser route schema.
- Both public Forms-write mounts convert every unmapped executor failure to the same
  fixed `internal_error`/500 response. Development mode may not expose an upstream,
  database, parser, authorization, storage, or handler message/stack to the client.

## Security Contract

- **Visibility:** upload and submission are public only when the form's current status is
  `published` and its existing `submissionAccess` is `public`; the existing static Form
  block renderer renders unpublished/internal-only forms as the existing noninteractive
  boundary and never attempts an internal write.
  Internal mode remains available to authenticated API/admin callers. Media delivery
  follows `storage.delivery.accessMode` (`public` or internal).
- **Auth/RBAC:** public mode does not require `media:write`; it uses the form
  access evaluator. Internal form writes require an authenticated session with
  `forms:write` or an API key carrying the existing `forms.submit` scope. Internal
  media delivery requires session `media:read` or API key `media.read`.
- **CSRF:** an admin-only route reached with a session keeps shared CSRF. Calls to
  the public URL, including a browser carrying an authenticated cookie, satisfy
  the form-bound nonce contract instead of bypassing both public and admin
  request-integrity checks. The public static runtime does not fetch an admin CSRF
  token, accept an API key, or claim an internal-session success flow.
- **Nonce/signature:** every public-mode upload and submission requires the
  existing form-bound, TTL-limited HMAC nonce. Missing/tampered/expired values
  fail closed; internal session/API-key mode keeps its existing contract.
- **Captcha:** optional reCAPTCHA is backend-owned and applies only according to
  the existing `public_write` policy. It never gates byte inspection.
- **Rate limit:** one `public_write` bucket charge, keyed by form id plus the
  shared request identity, for each public upload/submission request. Internal
  mode retains the admin/session/API-key policy.
- **Validation:** multipart and JSON envelopes plus every nested settings object
  use strict schemas; the service re-resolves field ownership, size, MIME, and
  media usage before accepting a submission reference.
- **Errors:** known domain failures retain their stable codes/statuses. Every unknown
  executor failure is redacted at the shared Forms-write response boundary before either
  the root or stripped-admin wrapper serializes it, independent of `NODE_ENV`.
- **Delivery:** canonical types and attachment policy are server-owned. No
  filename-derived MIME, content sniffing by the browser, open redirect, or
  direct remote-object response may bypass the same header contract.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-536-01 | Canonical media byte identity and storage keys | TASK-536-01-L01..L03 | ✅ Done |
| TASK-536-02 | Safe public media delivery | TASK-536-02-L01 | ✅ Done |
| TASK-536-03 | Form file upload runtime | TASK-536-03-L01, L02 | ✅ Done |
| TASK-536-04 | Strict Forms schemas and single rate limit | TASK-536-04-L01, L02 | ✅ Done |
| TASK-536-05 | Tests, security smoke, and closure | TASK-536-05-L01 | ✅ Done |

## Finding coverage matrix

| Audit finding | Owner | Required proof |
|---|---|---|
| H-01 file input never uploads; required/multiple are inert | 536-03/L01 + L02 | browser/runtime test: select → upload → owned id(s) → submit; pending/error blocks submit |
| H-02 stored media identity/delivery trust mismatch | 536-01/L01..L03 + 536-02/L01 | byte/MIME/key/URL corpus and final Bun delivery-header regression, with the private payload redacted |
| POST-M-01 admin reclassifies attachment-only SVG as inline image | 536-01/L03 | media utils/card/picker/details Vitest: canonical passive + persisted type agreement, no SVG img/focal UI, no `image/*` admission |
| POST-M-02 admin usage projection omits Form submissions | 536-01/L03 | media details Vitest renders a `submission` usage row with a defined icon; docs pin pre-submit unreferenced state |
| POST-M-03 opaque PDF structures bypass lexical active-content inspection | 536-01/L01 | pure corpus accepts benign compressed page content but rejects compressed XFA, encryption, and object streams |
| POST-M-04 Post media blocks bypass shared projected kind with raw MIME prefixes | 536-01/L03 | Post canvas Vitest excludes SVG/unsupported/mismatched records from image/gallery and never renders persisted document-kind IDs through img |
| H-03 inspection coupled to captcha/auth state | 536-01/L03 + 536-04/L01 | session, API-key, captcha-on/off matrix proves inspection always runs |
| M-03 double `public_write` charge | 536-04/L01 | public adapter-through-handler integration asserts one limiter call |
| L-03 loose nested form/field settings | 536-04/L02 | nested unknown-key rejection plus supported round-trip corpus |
| POST-M-05 stale nonce remains writable after unpublish/access drift | 536-04/L02 + L01 | unpublished runtime returns no nonce; public draft/archived and published→unpublished/access-mode race rejections charge once and perform no dispatch/storage/DB write |
| POST-M-06 unknown executor failures leak development message/stack | 536-04/L01 | root and stripped-admin real-mount tests force an unmapped preparation failure and assert identical fixed `internal_error`/500 payloads with no raw marker, details, or stack |
| POST-M-07 retired Widget compatibility is documented as maintenance-only but policy still advertises `create` and lacks the canonical coverage state | 536-05/L01 | shared coverage-state schema + policy/guidance/matrix parity tests prove `legacy-maintenance`, no advertised create/insert operation, and retained exact-row update/block-patch/delete only |

## Ownership, order, and compatibility

Land strictly `536-01 → 536-02 → 536-03 → 536-04 → 536-05`. Source ownership
is declared in the leaves; no two leaves write the same source file. TASK-536
belongs after TASK-538 and before TASK-541 in the audited dependency map. It closed
early on 2026-07-11; that sequencing drift does not reopen the completed family, and
TASK-538 now restores the declared path before TASK-541 starts. TASK-544 later touches
the media route family, so it must read the post-536 `mediaRoutes.ts` state and
must not run in parallel.

The POST-M-05 correction lands the L02-owned narrow form-state projection/runtime nonce
fix before the reopened L01 executor consumes that projection. This is a bounded
post-audit dependency inside 536-04 and does not change the declared program map.
POST-M-06 then reopens only L01's existing shared response-boundary seam; it adds no new
route, domain error, permission, or public payload field.
POST-M-07 is a bounded full-gate repair inside the closure leaf. It changes only the
assistant policy coverage vocabulary and the retired Widget compatibility policy metadata;
it does not change the hidden route, action executor, target resolver, permissions, stored
rows, or retained maintenance actions.

Existing URLs and database columns remain unchanged. Existing media rows are
served through a fail-safe legacy policy; new uploads receive canonical identity.
No production fallback may weaken byte checks to preserve a test fixture.
Abandoned-upload cleanup remains the explicit TASK-516-07 residual and is not
silently claimed by this family.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- Targeted Vitest: Forms runtime/compatibility-renderer/schema suites and new pure media-identity
  corpus.
- Targeted Bun: media service/adapters, public Forms adapter/route, media delivery,
  Forms route registration, file submission, and the new security regression.
- The exact Forms/media Semgrep and security-gate suites must pass. Also run
  `bun run scan:security:strict`. The current external program blockers are the Page
  `customSvg` source finding owned by TASK-538 and the prompt-only
  `task-522-author.mjs` finding owned by TASK-545-02-L01. Do not suppress or allowlist
  either; the final TASK-536–545 program gate must prove both absent.
- At least five real Playwright flows: required single file, multiple files,
  upload failure+retry, cookie-bearing public upload plus the noninteractive internal
  boundary, an unpublished public boundary with no nonce/write, and publish/front delivery.
  Assert visible progress/error/button state, delivered headers/download behavior,
  light/dark admin surfaces, and zero console errors.

## Documentation Updates Required

Update `_docs/MEDIA_SPEC.md`, `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`, the
Forms/media developer and user docs, the cache docs only if the client cache
contract changes, then create changelog 1248 and close every descendant.

## Completion evidence

Implemented and verified on 2026-07-11. The family now owns byte-authoritative media
identity and storage metadata, provider-neutral `/media/*` delivery, upload-before-submit
behavior for the existing Form block/section runtime, strict fixed-object Forms schemas,
one Forms write-rate owner, late canonical status/access revalidation, and fixed
redaction of unknown executor failures at both real mounts. The final gate also aligned
the hidden Widget compatibility policy with the canonical `legacy-maintenance` state,
removed provider-facing create/insert advertising, and retained only exact-row
update/delete/block-patch maintenance. It adds no endpoint, DB
migration, block/section type, editor, registry, preset, or non-dashboard widget surface.
`core/widgets/core/formRuntimeScript.ts` remains only the historical compatibility
namespace for the existing public Form block/section runtime.

### Validation

- `bun --cwd core lint:types`, `bun --cwd core lint`, and root
  `tsc -p tsconfig.json --noEmit`: pass.
- Targeted Vitest: 19 files, 748/748 tests pass. Targeted Bun/DB: 15 files,
  210/210 tests and 1591 assertions pass. The no-DB live media-delivery lane passes
  30/30 tests and 381 assertions.
- Targeted runtime ESLint and task-scoped Semgrep pass with zero TASK-536 findings;
  `bun run gates:coderso` passes all five release gates.
- Final combined validation: Bun 1633 pass, 1 opt-in OpenAI live test skipped, 0 fail;
  Vitest 832/832 files and 6552/6552 tests pass. `bun run precommit:check` passes
  core/store lint plus core/root/SDK typechecks.
- The first broad Vitest run exposed POST-M-07 plus two under-load local timeout flakes.
  The policy contract was corrected before implementation; the two unchanged-assertion
  tests passed in isolation and then in the full 6552-test lane after their local limits
  were raised to 30 seconds. No global timeout or behavior assertion was weakened.
- Five fresh post-implementation lenses (media, Forms/security, runtime/product,
  schema/model, and task/test/workflow integrity) report zero High/Medium/Low drift.
- Fresh post-POST-M-07 policy/product and test-integrity audits also report zero
  High/Medium/Low findings; the final closure reconcile's sole evidence finding was
  resolved by recording these combined gates.
- The full strict scan remains non-zero only for two unchanged out-of-scope findings:
  the Page `customSvg` sink owned by TASK-538 and the workflow prompt finding owned by
  TASK-545-02-L01. TASK-536 adds no suppression, baseline, allowlist, or scanner change.

### Runtime smoke

The final real-browser run started the server with the literal
`coderso-dev-core-host` helper, checked
`http://coderso-a.localhost:5173/admin/` and
`http://coderso-a.localhost:3000/`, and issued every browser operation as a complete
`playwright-cli -s=wf536smoke ...` command. Credentials came only from `.env` and are
not present in evidence. Result: 7/7 scenarios pass, 8 screenshots, zero raw or
classified console errors, and no failure.

| Scenario | Viewport/theme | Visible result | Screenshot |
|---|---|---|---|
| `admin-media-wide-light` | 1366x900, light | SVG is a document without `<img>`; canonical passive PNG visibly loads | `_docs/_workflows/_smoke/task-536-admin-media-wide-light.png` |
| `required-single-status-lifecycle` | 1280x900, light | neutral/progress/error/recovery geometry and final owned media ID | `_docs/_workflows/_smoke/task-536-required-single-light-wide.png` |
| `ordered-multiple-png-bmp` | 1280x900, light | PNG→BMP order is preserved through the submitted media-ID array | `_docs/_workflows/_smoke/task-536-ordered-multiple-light-wide.png` |
| `failed-upload-retry-without-reload` | 1280x900, light | visible alert blocks submission; the same selection retries successfully | `_docs/_workflows/_smoke/task-536-retry-visible-error.png`, `_docs/_workflows/_smoke/task-536-retry-success-without-reload.png` |
| `cookie-nonce-byte-and-internal-boundary` | 1280x900, light | cookie cannot bypass nonce/bytes; internal, draft, and archived forms stay noninteractive | `_docs/_workflows/_smoke/task-536-cookie-nonce-byte-internal-boundary.png` |
| `published-front-delivery` | 1280x900, light | passive image is visible; PDF/SVG/text/bin use real canonical downloads and GET/HEAD headers | `_docs/_workflows/_smoke/task-536-published-front-delivery.png` |
| `admin-form-builder-narrow-dark` | 390x844, dark | Fields UI has no widget surface and no horizontal overflow | `_docs/_workflows/_smoke/task-536-admin-form-builder-narrow-dark.png` |

Scoped cleanup removed 6 pages, 3 submissions, 5 forms, and 10 media records, restored
the affected storage setting, revoked the smoke session, and reported zero cleanup
errors or media cleanup failures. The eight PNGs are intentionally task-scoped; because
the repository globally ignores `*.png`, the owner must force-add these existing files
when committing the closure. TASK-545 alone owns the future durable-manifest `.gitignore`
exception.

The abandoned pre-submit upload cleanup residual remains explicitly owned by
TASK-516-07. There is no other open TASK-536 implementation residual.
