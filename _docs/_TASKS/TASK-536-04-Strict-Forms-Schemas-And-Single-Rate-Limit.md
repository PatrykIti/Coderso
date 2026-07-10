# TASK-536-04: Strict Forms Schemas and Single Rate Limit

# FileName: TASK-536-04-Strict-Forms-Schemas-And-Single-Rate-Limit.md

**Parent Task:** TASK-536
**Priority:** Critical
**Category:** Forms API / Validation / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-03
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Separate access/anti-abuse decisions from media trust and make one prepared Forms-write
executor the security owner for both public and stripped admin mounts. Independently
replace loose nested Form objects with strict, reusable schemas while preserving the
bounded dynamic submission data map and its field-name service validation.

## Grounded anchors

- core/server/publicFormsApi.ts:69-109 charges public_write for both public endpoints.
- core/server/routes/formsRoutes.ts:323-343 charges anonymous upload a second time.
- core/services/forms/submissionAccess.ts:27-54 couples the current requireCaptcha bit to
  behavior that also controlled byte sniffing.
- core/server/validation/formSchemas.ts:3-55 is top-level strict but leaves settings and
  nested field objects open.
- core/services/forms/validation.ts:147-295, formSettings.ts:188-307, and
  fieldSettings.ts:130-189 normalize fixed objects by silently dropping unknown keys.

## Leaves

| Leaf | Scope | Source ownership |
|---|---|---|
| TASK-536-04-L01 | Shared public/admin executor, bounded parsing, media-handler wiring, access/CSRF/nonce/captcha, and one selected rate charge | httpServer.ts, requestBody.ts, submissionAccess.ts, formsRoutes.ts, publicFormsApi.ts |
| TASK-536-04-L02 | Strict schemas for fixed nested Form/field settings | formSchemas.ts and domain schema owners |

## Security Contract

- **Visibility:** existing public upload/submission URLs only for public forms; internal
  forms require current session/API-key access.
- **Auth/RBAC:** internal session requires forms:write; internal API key requires
  forms.submit. Public mode never grants media:write.
- **CSRF:** an internal-mode session write executes the shared CSRF check. A public-mode
  write carrying a session cookie still uses the form nonce contract rather than
  silently switching to or bypassing request-integrity checks. API keys are not
  cookie-session CSRF subjects.
- **Nonce/captcha:** every public-mode write requires the existing form-bound TTL HMAC
  nonce, including requests carrying an authenticated cookie. Optional reCAPTCHA remains
  backend-owned according to the existing policy and is independent of byte validation.
- **Rate limit:** the shared prepared executor owns exactly one selected charge on both
  mounts: `public_write` for public-mode requests and `admin_write` for internal
  session/API-key requests. No generic server branch or downstream handler charges a
  matched Forms write again.
- **Transport bounds:** the executor resolves access and charges before bounded parsing.
  Submission JSON/form bodies are capped at 1 MiB. Multipart uploads are capped at the
  smaller of the configured storage limit and 100 MiB, plus exactly 64 KiB envelope
  overhead. Declared, absent, and deceptive `Content-Length` cases enforce the same cap.
- **Validation:** transport envelopes and every fixed nested object reject unknown keys.
  Submission data remains a dynamic map but service validation accepts only declared
  field names and normalized field values.

## Land order and compatibility

Land L01 before L02. Existing URLs, status/error codes, API-key scopes, session
permissions, and stored document shapes remain. Strict writes reject formerly ignored
unknown keys; deterministic read normalizers preserve valid legacy documents. No
production schema becomes permissive to keep stale test fixtures green.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/formSettings.test.ts \
  tests/vitest/forms/submissionAccess.test.ts \
  tests/vitest/server/requestBody.test.ts
set -a && source .env && set +a && bun test --parallel=1 --timeout=15000 \
  tests/unit/server/publicFormsApi.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/security/codersoSecurityGate.test.ts
bun run gates:coderso
~~~
