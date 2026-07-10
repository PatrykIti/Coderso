# TASK-536-04-L01: Nested Reject-Unknown and Public-Write Ownership

# FileName: TASK-536-04-L01-Nested-Reject-Unknown-And-Public-Write-Ownership.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-04
**Priority:** Critical
**Category:** Public Forms API / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-03-L02
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Own access/anti-abuse orchestration for public Forms writes and remove the duplicate
upload limiter call. Replace the overloaded requireCaptcha result with explicit access
and public-anti-abuse meaning; media byte validation is no longer represented here.
This leaf does not implement nested JSON schemas despite the historical filename; that
single-writer work is isolated in L02.

## Source ownership

This leaf is the only TASK-536 writer of:

- core/services/forms/submissionAccess.ts;
- core/server/routes/formsRoutes.ts;
- core/server/publicFormsApi.ts.

It may import the existing shared CSRF helper and owns changed-behavior/compatibility
updates in the three Bun suites named by its gate before validation. It must not edit
csrf.ts, mediaService.ts, formSchemas.ts, other tests, docs, task indexes, or changelog
files.

## Implementation Pseudocode

~~~ts
type SubmissionAccessEvaluation = {
  allow: boolean;
  requireFormNonce: boolean;
  requireCaptcha: boolean;
  requireSessionCsrf: boolean;
  rateBucket: "public_write" | "admin_write";
  reason?: "auth_required" | "forbidden";
};

evaluateSubmissionAccess(input) {
  public anonymous -> allow + form nonce + configured captcha + public_write;
  public session -> allow + form nonce + public_write; do not bypass nonce because a
    cookie exists; preserve the existing captcha policy explicitly;
  internal session -> allow + shared CSRF + forms:write + internal/admin bucket;
  internal API key with forms.submit -> allow + internal/admin bucket, no cookie CSRF;
  otherwise stable auth_required/forbidden;
}

prepareFormWriteAccess(routeContext) {
  load form once and normalize submissionAccess;
  authenticate applicable session/API key and evaluate access;
  enforce RBAC for internal session;
  return immutable form + access descriptor for the handler;
}

handlePublicFormsApi(req, ctx) {
  match only existing POST upload/submission paths;
  parse bounded body and attach session;
  prepared = await prepareFormWriteAccess(routeContext);
  if prepared.access.requireSessionCsrf:
    enforceCsrf(req, routeContext, ctx.security.csrf);
  charge prepared.access.rateBucket exactly once using form id + request identity;
  dispatch to upload/submission handler with prepared access so it cannot drift/reload;
}

handleFormAttachmentUploadRoute(ctx) {
  validate transport and consume prepared form/access/field;
  if requireFormNonce:
    assert nonce;
  if requireCaptcha:
    enforce bot protection;
  // no checkRateLimit and no sniffContent flag
  uploadMedia(file, canonical constraints);
}

handleFormSubmissionRoute(ctx) {
  consume the same prepared result;
  independently enforce requireFormNonce and requireCaptcha;
  keep stable error mapping;
}
~~~

The prepared descriptor is request-local, immutable, and bound to the exact form ID.
Do not accept a caller-supplied access mode or browser access flag. Direct handler tests
construct preparation through the same helper rather than inventing a bypass. No
downstream helper can charge a bucket a second time.

## Security Contract

- **Visibility:** current POST /forms/:id/uploads and /submissions only; public mode is
  nonce-protected, internal mode remains authenticated/scoped.
- **Auth/RBAC:** internal session requires forms:write; internal API key requires
  forms.submit; public mode never grants media:write.
- **CSRF:** internal session writes enforce shared CSRF. Public-mode requests, including
  cookie-bearing ones, enforce the form nonce instead of switching integrity modes.
- **Rate/anti-abuse:** exactly one selected bucket charge in the adapter; every
  public-mode write requires nonce and the configured captcha policy, with no byte-check
  coupling.
- **Validation:** strict transport/nested schemas and service field/media ownership
  remain authoritative; prepared access is server-created and form-ID-bound.

## Errors and compatibility

Stable 401/403/429, form_nonce_invalid/expired, bot-protection, and mapped form/media
errors remain. One valid request with a maxRequests=1 public_write bucket succeeds; the
next equivalent request gets 429. Removing the duplicate must not permit a handler to be
called directly without the route registration/public adapter contract in production.

## Regression-test shape

This leaf updates the three named public Forms/route suites before its source gate.
Required matrix:

- upload and submission each invoke public_write once through the real public adapter;
- maxRequests=1 permits the first upload and rejects the second;
- direct route-handler unit tests inject/acknowledge outer limiter ownership;
- anonymous public requires nonce and configured captcha;
- public-mode authenticated-cookie requests still require the form nonce;
- internal-mode session enforces CSRF and forms:write;
- valid/invalid API-key scopes preserve internal behavior;
- every access mode still reaches unconditional byte canonicalization;
- stable error response codes remain mapped.

TASK-536-05-L01 may add cross-contract security cases later but cannot re-baseline this
access/rate-ownership matrix.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/server/publicFormsApi.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/integration/routes/forms.test.ts
bun run gates:coderso
~~~

Re-run a named failure alone before declaring it real.

## Acceptance criteria

- Exactly one production public_write call is reachable per public Forms request.
- Access/captcha state cannot influence media byte validation.
- Public-mode cookies do not bypass nonce; internal-mode sessions do not bypass CSRF.
- No endpoint, permission, scope, or nonce format is added.
