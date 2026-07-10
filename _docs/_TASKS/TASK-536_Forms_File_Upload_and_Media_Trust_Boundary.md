# TASK-536: Forms File Upload and Media Trust Boundary

# FileName: TASK-536_Forms_File_Upload_and_Media_Trust_Boundary.md

**Priority:** Critical
**Category:** Forms / Media / Public Runtime / Security
**Estimated Effort:** Large
**Dependencies:** TASK-516, TASK-512
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

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
  the named hidden input, honors `required` and `multiple`, and cannot submit
  while uploads are pending or failed.
- Exactly one layer owns the `public_write` charge per public request.
- Nested request objects are reject-unknown. No normalizer silently launders
  unknown field/settings keys through a looser route schema.

## Security Contract

- **Visibility:** upload and submission are public only when the form's existing
  `submissionAccess` is `public`; the existing static Form block renderer renders an internal-only
  form as the existing noninteractive boundary and never attempts an internal write.
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
- **Delivery:** canonical types and attachment policy are server-owned. No
  filename-derived MIME, content sniffing by the browser, open redirect, or
  direct remote-object response may bypass the same header contract.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-536-01 | Canonical media byte identity and storage keys | TASK-536-01-L01..L03 | ⏳ To Do |
| TASK-536-02 | Safe public media delivery | TASK-536-02-L01 | ⏳ To Do |
| TASK-536-03 | Form file upload runtime | TASK-536-03-L01, L02 | ⏳ To Do |
| TASK-536-04 | Strict Forms schemas and single rate limit | TASK-536-04-L01, L02 | ⏳ To Do |
| TASK-536-05 | Tests, security smoke, and closure | TASK-536-05-L01 | ⏳ To Do |

## Finding coverage matrix

| Audit finding | Owner | Required proof |
|---|---|---|
| H-01 file input never uploads; required/multiple are inert | 536-03/L01 + L02 | browser/runtime test: select → upload → owned id(s) → submit; pending/error blocks submit |
| H-02 stored media identity/delivery trust mismatch | 536-01/L01..L03 + 536-02/L01 | byte/MIME/key/URL corpus and final Bun delivery-header regression, with the private payload redacted |
| H-03 inspection coupled to captcha/auth state | 536-01/L03 + 536-04/L01 | session, API-key, captcha-on/off matrix proves inspection always runs |
| M-03 double `public_write` charge | 536-04/L01 | public adapter-through-handler integration asserts one limiter call |
| L-03 loose nested form/field settings | 536-04/L02 | nested unknown-key rejection plus supported round-trip corpus |

## Ownership, order, and compatibility

Land strictly `536-01 → 536-02 → 536-03 → 536-04 → 536-05`. Source ownership
is declared in the leaves; no two leaves write the same source file. TASK-536
lands first in the remediation program and before TASK-537. TASK-544 later touches
the media route family, so it must read the post-536 `mediaRoutes.ts` state and
must not run in parallel.

Existing URLs and database columns remain unchanged. Existing media rows are
served through a fail-safe legacy policy; new uploads receive canonical identity.
No production fallback may weaken byte checks to preserve a test fixture.
Abandoned-upload cleanup remains the explicit TASK-516-07 residual and is not
silently claimed by this family.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- Targeted Vitest: Forms runtime/widget/schema suites and new pure media-identity
  corpus.
- Targeted Bun: media service/adapters, public Forms adapter/route, media delivery,
  Forms route registration, file submission, and the new security regression.
- The exact Forms/media Semgrep and security-gate suites must pass. Also run
  `bun run scan:security:strict`; until TASK-538 lands, only the already-recorded
  Page `customSvg` finding owned by TASK-538 may be reported as an external program
  blocker. Do not suppress or allowlist it, and rerun the full strict scan after
  TASK-538 removes the source finding.
- At least five real Playwright flows: required single file, multiple files,
  upload failure+retry, cookie-bearing public upload plus the noninteractive internal
  boundary, and publish/front delivery.
  Assert visible progress/error/button state, delivered headers/download behavior,
  light/dark admin surfaces, and zero console errors.

## Documentation Updates Required

Update `_docs/MEDIA_SPEC.md`, `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`, the
Forms/media developer and user docs, the cache docs only if the client cache
contract changes, then create changelog 1248 and close every descendant.
